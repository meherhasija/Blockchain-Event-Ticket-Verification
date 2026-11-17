import { getReadOnlyContract, getProvider, getDeploymentConfig, isContractConfigured } from './contract.js';

let historyRoot = null;
let currentPage = 0;
const PAGE_SIZE = 8;
let renderedRows = [];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function shorten(value) {
  const text = String(value ?? '');
  return text.length > 18 ? `${text.slice(0, 10)}…${text.slice(-6)}` : text || '—';
}

function argValue(log, names) {
  for (const name of names) {
    try {
      const index = log.fragment?.inputs?.findIndex(input => input.name?.toLowerCase() === name.toLowerCase());
      if (index >= 0 && log.args[index] !== undefined) return log.args[index];
    } catch {}
    try { if (log.args?.[name] !== undefined) return log.args[name]; } catch {}
  }
  return null;
}

function toStringValue(value) {
  if (value === null || value === undefined) return '';
  return typeof value === 'bigint' ? value.toString() : String(value);
}

export function initHistory(containerElement) {
  if (!containerElement) return;
  historyRoot = containerElement;
  containerElement.innerHTML = `
    <div class="history-panel">
      <div class="history-toolbar">
        <label class="history-search-label" for="history-search">Search history</label>
        <input id="history-search" class="history-search" type="search" aria-label="Search event, wallet or transaction hash">
      </div>
      <div id="history-status" class="module-status" role="status"></div>
      <div class="table-wrap">
        <table class="history-table">
          <thead><tr><th>Action</th><th>Details</th><th>Wallet</th><th>Block</th><th>Timestamp</th><th>Transaction</th></tr></thead>
          <tbody id="history-rows"><tr><td colspan="6" class="state-message">Connect to the deployed contract to view event history.</td></tr></tbody>
        </table>
      </div>
      <div class="history-pagination"><button class="btn btn-secondary btn-sm" id="history-prev" type="button">Previous</button><span id="history-page-label">Page 1</span><button class="btn btn-secondary btn-sm" id="history-next" type="button">Next</button></div>
    </div>`;

  containerElement.querySelector('#history-search').addEventListener('input', () => {
    currentPage = 0;
    renderPage();
  });
  containerElement.querySelector('#history-prev').addEventListener('click', () => {
    currentPage = Math.max(0, currentPage - 1);
    renderPage();
  });
  containerElement.querySelector('#history-next').addEventListener('click', () => {
    currentPage++;
    renderPage();
  });
  containerElement.addEventListener('click', async event => {
    const button = event.target.closest('[data-copy-hash]');
    if (!button) return;
    try {
      await navigator.clipboard.writeText(button.dataset.copyHash);
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = 'Copy'; }, 1200);
    } catch {
      button.textContent = 'Copy unavailable';
    }
  });
}

function filteredRows() {
  const query = historyRoot?.querySelector('#history-search')?.value.trim().toLowerCase() || '';
  if (!query) return renderedRows;
  return renderedRows.filter(row => `${row.name} ${row.details} ${row.actor} ${row.hash} ${row.block}`.toLowerCase().includes(query));
}

function renderPage() {
  if (!historyRoot) return;
  const rows = filteredRows();
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, pages - 1);
  const visible = rows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const tbody = historyRoot.querySelector('#history-rows');
  if (!visible.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="state-message">No matching blockchain events found.</td></tr>';
  } else {
    tbody.innerHTML = visible.map(row => `<tr>
      <td><span class="event-name">${esc(row.name)}</span></td>
      <td>${esc(row.details || '—')}</td>
      <td title="${esc(row.actor)}">${esc(shorten(row.actor))}</td>
      <td>${esc(row.block)}</td>
      <td>${esc(row.timestamp)}</td>
      <td><span class="hash-cell" title="${esc(row.hash)}">${esc(shorten(row.hash))}</span><button class="copy-button" type="button" data-copy-hash="${esc(row.hash)}" ${row.hash ? '' : 'disabled'}>Copy</button></td>
    </tr>`).join('');
  }
  historyRoot.querySelector('#history-page-label').textContent = `Page ${currentPage + 1} of ${pages}`;
  historyRoot.querySelector('#history-prev').disabled = currentPage === 0;
  historyRoot.querySelector('#history-next').disabled = currentPage >= pages - 1;
}

export async function refreshEventHistory() {
  if (!historyRoot) return;
  const status = historyRoot.querySelector('#history-status');
  const tbody = historyRoot.querySelector('#history-rows');
  status.textContent = 'Loading blockchain events…';
  tbody.innerHTML = '<tr><td colspan="6" class="state-message">Loading…</td></tr>';

  try {
    if (!isContractConfigured()) throw new Error('Contract deployment details and ABI have not been added yet.');
    const contract = getReadOnlyContract();
    const provider = getProvider();
    const fromBlock = Number(getDeploymentConfig()?.contract?.deploymentBlock);
    if (!contract || !provider) throw new Error('Connect to the configured blockchain first.');
    if (!Number.isInteger(fromBlock) || fromBlock < 0) throw new Error('The deployment block number is missing.');

    const latest = await provider.getBlockNumber();
    const fragments = contract.interface.fragments.filter(fragment => fragment.type === 'event');
    const batches = await Promise.all(fragments.map(async fragment => {
      const filter = contract.filters[fragment.name]();
      return contract.queryFilter(filter, fromBlock, latest);
    }));
    const logs = batches.flat().sort((a, b) => b.blockNumber - a.blockNumber || b.index - a.index);

    const blockCache = new Map();
    renderedRows = await Promise.all(logs.map(async log => {
      if (!blockCache.has(log.blockNumber)) {
        blockCache.set(log.blockNumber, provider.getBlock(log.blockNumber));
      }
      const block = await blockCache.get(log.blockNumber);
      const fragment = log.fragment;
      const eventName = fragment?.name || 'Contract event';
      const ticketId = argValue(log, ['ticketId', 'ticketID', 'ticket_id']);
      const eventId = argValue(log, ['eventId', 'eventID', 'event_id']);
      const actor = argValue(log, ['buyer', 'owner', 'organizer', 'verifier', 'from', 'account', 'user']);
      const details = [
        eventId !== null ? `Event #${toStringValue(eventId)}` : '',
        ticketId !== null ? `Ticket #${toStringValue(ticketId)}` : ''
      ].filter(Boolean).join(' · ');
      return {
        name: eventName,
        details,
        actor: toStringValue(actor),
        block: log.blockNumber,
        timestamp: block?.timestamp ? new Date(Number(block.timestamp) * 1000).toLocaleString() : 'Unavailable',
        hash: log.transactionHash || ''
      };
    }));
    currentPage = 0;
    renderPage();
    status.textContent = `${renderedRows.length} contract event${renderedRows.length === 1 ? '' : 's'} loaded through block ${latest}.`;
  } catch (error) {
    renderedRows = [];
    tbody.innerHTML = `<tr><td colspan="6" class="state-message state-error">${esc(error.message || 'Unable to load transaction history.')}</td></tr>`;
    status.textContent = '';
    renderPage();
  }
}
