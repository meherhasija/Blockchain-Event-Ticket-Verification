import { getReadOnlyContract, getProvider, getDeploymentConfig, isContractConfigured } from './contract.js';

let dashboardRoot = null;

const EVENT_PATTERNS = {
  purchased: /ticket.*(purchas|mint)|purchase.*ticket/i,
  used: /ticket.*(used|check.?in)|check.?in.*ticket|mark.*used/i,
  cancelled: /ticket.*cancel/i,
  created: /event.*creat|creat.*event/i
};

function eventLabel(log) {
  return log.fragment?.name || log.eventName || 'Contract event';
}

function readArg(log, names, fallbackIndex = null) {
  const args = log.args;
  if (!args) return null;
  for (const name of names) {
    try {
      const index = log.fragment?.inputs?.findIndex(input => input.name?.toLowerCase() === name.toLowerCase());
      if (index >= 0 && args[index] !== undefined) return args[index];
    } catch {}
    try { if (args[name] !== undefined) return args[name]; } catch {}
  }
  return fallbackIndex !== null ? args[fallbackIndex] ?? null : null;
}

function asText(value) {
  if (value === null || value === undefined) return '';
  return typeof value === 'bigint' ? value.toString() : String(value);
}

async function collectContractEvents() {
  const contract = getReadOnlyContract();
  const provider = getProvider();
  const deploymentBlock = getDeploymentConfig()?.contract?.deploymentBlock;
  if (!contract || !provider) throw new Error('Connect to the configured blockchain to load statistics.');
  if (!Number.isInteger(Number(deploymentBlock)) || Number(deploymentBlock) < 0) {
    throw new Error('The deployment block number is missing from the deployment configuration.');
  }

  const latest = await provider.getBlockNumber();
  const fragments = contract.interface.fragments.filter(fragment => fragment.type === 'event');
  if (!fragments.length) throw new Error('The contract ABI does not contain event definitions.');

  const results = await Promise.all(fragments.map(async fragment => {
    const filter = contract.filters[fragment.name]();
    return contract.queryFilter(filter, Number(deploymentBlock), latest);
  }));
  return results.flat().sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);
}

function classify(name) {
  if (EVENT_PATTERNS.purchased.test(name)) return 'purchased';
  if (EVENT_PATTERNS.used.test(name)) return 'used';
  if (EVENT_PATTERNS.cancelled.test(name)) return 'cancelled';
  if (EVENT_PATTERNS.created.test(name)) return 'created';
  return 'other';
}

export function initDashboard(containerElement) {
  if (!containerElement) return;
  dashboardRoot = containerElement;
  containerElement.innerHTML = `
    <div class="dashboard">
      <div class="stats-grid" aria-live="polite">
        <article class="stat-card"><div class="stat-label">Total Tickets Issued</div><div class="stat-value" data-stat="total">—</div></article>
        <article class="stat-card"><div class="stat-label">Valid Tickets</div><div class="stat-value" data-stat="valid">—</div></article>
        <article class="stat-card"><div class="stat-label">Used Tickets</div><div class="stat-value" data-stat="used">—</div></article>
        <article class="stat-card"><div class="stat-label">Cancelled Tickets</div><div class="stat-value" data-stat="cancelled">—</div></article>
      </div>
      <section class="event-stats-section">
        <div class="subsection-heading"><h3>Event-wise Statistics</h3><span class="muted" id="dashboard-updated"></span></div>
        <div id="event-stats" class="event-stats-list"><p class="state-message">Statistics will appear when the contract is connected.</p></div>
      </section>
      <p class="module-status" id="dashboard-status" role="status"></p>
    </div>`;
}

function setStat(key, value) {
  const node = dashboardRoot?.querySelector(`[data-stat="${key}"]`);
  if (node) node.textContent = String(value);
}

export async function refreshDashboardStats() {
  if (!dashboardRoot) return;
  const status = dashboardRoot.querySelector('#dashboard-status');
  const eventList = dashboardRoot.querySelector('#event-stats');
  dashboardRoot.querySelectorAll('.stat-value').forEach(node => node.textContent = '…');
  if (status) status.textContent = 'Loading blockchain data…';

  try {
    if (!isContractConfigured()) throw new Error('Contract deployment details and ABI have not been added yet.');
    const logs = await collectContractEvents();
    let total = 0, used = 0, cancelled = 0;
    const byEvent = new Map();

    for (const log of logs) {
      const kind = classify(eventLabel(log));
      const eventId = asText(readArg(log, ['eventId', 'eventID', 'event_id'], kind === 'created' ? 0 : null));
      if (kind === 'purchased') {
        total++;
        if (eventId) {
          const row = byEvent.get(eventId) || { total: 0, used: 0, cancelled: 0 };
          row.total++;
          byEvent.set(eventId, row);
        }
      } else if (kind === 'used') {
        used++;
        if (eventId && byEvent.has(eventId)) byEvent.get(eventId).used++;
      } else if (kind === 'cancelled') {
        cancelled++;
        if (eventId && byEvent.has(eventId)) byEvent.get(eventId).cancelled++;
      }
    }

    const valid = Math.max(0, total - used - cancelled);
    setStat('total', total);
    setStat('valid', valid);
    setStat('used', used);
    setStat('cancelled', cancelled);

    if (eventList) {
      if (!byEvent.size) {
        eventList.innerHTML = '<p class="state-message">No ticket purchase events have been recorded.</p>';
      } else {
        eventList.innerHTML = [...byEvent.entries()].map(([eventId, row]) => {
          const remaining = Math.max(0, row.total - row.used - row.cancelled);
          return `<article class="event-stat-row">
            <div class="event-stat-title">Event #${escapeHtml(eventId)}</div>
            <div class="event-stat-metrics"><span>Total <strong>${row.total}</strong></span><span>Valid <strong>${remaining}</strong></span><span>Used <strong>${row.used}</strong></span><span>Cancelled <strong>${row.cancelled}</strong></span></div>
          </article>`;
        }).join('');
      }
    }
    if (status) status.textContent = 'Statistics loaded from contract event logs.';
    const updated = dashboardRoot.querySelector('#dashboard-updated');
    if (updated) updated.textContent = `Block ${await getProvider().getBlockNumber()}`;
  } catch (error) {
    dashboardRoot.querySelectorAll('.stat-value').forEach(node => node.textContent = '—');
    if (eventList) eventList.innerHTML = `<p class="state-message state-error">${escapeHtml(error.message || 'Unable to load statistics.')}</p>`;
    if (status) status.textContent = '';
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
