
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import deployment from './config/deployment.json';
import abi from './abi.json';

const $ = (s) => document.querySelector(s);

const esc = (v = '') =>
  String(v).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

let provider, signer, contract, account, scanner;
let events = [];
let myTickets = [];

const cfg = deployment;

const configured = () =>
  Boolean(
    cfg.contract?.address &&
    cfg.network?.chainId &&
    cfg.contract?.deploymentBlock !== null
  );

const statusText = (id, msg, error = false) => {
  const n = $(id);
  if (n) {
    n.textContent = msg;
    n.className = error ? 'notice error' : 'notice';
  }
};

const tx = async (promise, label) => {
  statusText('#global-status', `${label}: waiting for wallet approval…`);

  const t = await promise;

  statusText(
    '#global-status',
    `${label}: transaction submitted. Waiting for confirmation…`
  );

  await t.wait();

  statusText('#global-status', `${label}: confirmed.`);
  return t;
};

// Convert Solidity EventInfo tuple into a normal JavaScript object.
function normalizeEvent(e) {
  return {
    id: BigInt(e.id ?? e[0]),
    name: e.name ?? e[1],
    description: e.description ?? e[2],
    venue: e.venue ?? e[3],
    date: BigInt(e.date ?? e[4]),
    price: BigInt(e.price ?? e[5]),
    quantity: BigInt(e.quantity ?? e[6]),
    sold: BigInt(e.sold ?? e[7]),
    active: e.active ?? e[8]
  };
}

// Convert Solidity Ticket tuple into a normal JavaScript object.
function normalizeTicket(t) {
  return {
    id: BigInt(t.id ?? t[0]),
    eventId: BigInt(t.eventId ?? t[1]),
    owner: t.owner ?? t[2],
    status: Number(t.status ?? t[3]),
    originalPrice: BigInt(t.originalPrice ?? t[4])
  };
}

function renderEvents() {
  $('#events-list').innerHTML = events.length
    ? events.map(e => `
      <article class="event-row">
        <div>
          <h3>${esc(e.name)}</h3>
          <p>${esc(e.venue)} · ${new Date(Number(e.date) * 1000).toLocaleString()}</p>
          <small>${esc(e.description)}</small>
        </div>
        <div class="event-buy">
          <strong>${formatEther(e.price)} ETH</strong>
          <span>${Number(e.quantity - e.sold)} available</span>
          <button
            class="button primary"
            data-buy="${e.id}"
            ${!e.active || e.sold >= e.quantity ? 'disabled' : ''}
          >Buy ticket</button>
        </div>
      </article>
    `).join('')
    : '<p class="empty">No events have been published yet.</p>';
}

function renderTickets() {
  $('#tickets-list').innerHTML = myTickets.length
    ? myTickets.map(t => `
      <article class="ticket-row">
        <div>
          <h3>Ticket #${t.id}</h3>
          <p>Event #${t.eventId} · ${esc(['VALID', 'USED', 'CANCELLED'][t.status] ?? 'UNKNOWN')}</p>
          <small>Owner: ${esc(t.owner)}</small>
        </div>
        <div class="ticket-actions">
          <button class="button secondary" data-qr="${t.id}">Show QR</button>
        </div>
      </article>
    `).join('')
    : '<p class="empty">Tickets purchased by this wallet will appear here.</p>';
}

async function loadEvents() {
  const result = await contract.getEvents();
  events = Array.from(result, normalizeEvent);
  renderEvents();
}

async function loadTickets() {
  myTickets = account
    ? Array.from(await contract.getMyTickets(account), normalizeTicket)
    : [];

  renderTickets();
}

async function loadStats() {
  const result = await contract.getEvents();
  const all = Array.from(result, normalizeEvent);

  let total = 0;
  let used = 0;
  let cancelled = 0;

  for (const e of all) {
    const ids = await contract.getEventTicketIds(e.id);
    total += ids.length;

    for (const id of ids) {
      const ticket = normalizeTicket(await contract.getTicket(id));

      if (ticket.status === 1) used++;
      if (ticket.status === 2) cancelled++;
    }
  }

  $('#stat-total').textContent = total;
  $('#stat-valid').textContent = total - used - cancelled;
  $('#stat-used').textContent = used;
  $('#stat-cancelled').textContent = cancelled;
}

async function loadHistory() {
  const from = Number(cfg.contract.deploymentBlock);
  const to = await provider.getBlockNumber();

  const names = [
    'EventCreated',
    'TicketPurchased',
    'TicketUsed',
    'TicketCancelled'
  ];

  let logs = [];

  for (const name of names) {
    try {
      logs.push(
        ...await contract.queryFilter(contract.filters[name](), from, to)
      );
    } catch (e) {
      console.warn(`Could not load ${name} events:`, e);
    }
  }

  logs.sort((a, b) => b.blockNumber - a.blockNumber);

  const rows = await Promise.all(
    logs.map(async l => {
      const block = await provider.getBlock(l.blockNumber);

      return `
        <tr>
          <td>${esc(l.fragment.name)}</td>
          <td>${esc(
            l.args.map(x =>
              typeof x === 'bigint' ? x.toString() : String(x)
            ).join(' · ')
          )}</td>
          <td>${esc(l.transactionHash.slice(0, 12))}…</td>
          <td>${l.blockNumber}</td>
          <td>${block
            ? new Date(Number(block.timestamp) * 1000).toLocaleString()
            : '-'}</td>
        </tr>
      `;
    })
  );

  $('#history-rows').innerHTML = rows.length
    ? rows.join('')
    : '<tr><td colspan="5" class="empty">No blockchain events recorded yet.</td></tr>';
}

async function refreshAll() {
  if (!contract) return;

  try {
    await Promise.all([
      loadEvents(),
      loadTickets(),
      loadStats(),
      loadHistory()
    ]);

    statusText('#global-status', 'Blockchain data refreshed.');
  } catch (e) {
    console.error('Blockchain refresh failed:', e);
    statusText(
      '#global-status',
      e.shortMessage || e.message,
      true
    );
  }
}

async function connect() {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed. Install the browser extension first.');
  }

  provider = new BrowserProvider(window.ethereum);

  await provider.send('eth_requestAccounts', []);

  signer = await provider.getSigner();
  account = await signer.getAddress();

  const net = await provider.getNetwork();

  if (
    cfg.network.chainId &&
    Number(net.chainId) !== Number(cfg.network.chainId)
  ) {
    throw new Error(
      `Wrong network. Expected chain ID ${cfg.network.chainId}.`
    );
  }

  if (!configured()) {
    throw new Error('Contract is not deployed/configured yet. Check deployment.json.');
  }

  if (!abi.length) {
    throw new Error('ABI is empty. Export the compiled contract ABI from Remix.');
  }

  contract = new Contract(cfg.contract.address, abi, signer);

  $('#wallet-label').textContent =
    `${account.slice(0, 6)}…${account.slice(-4)}`;

  $('#connect').textContent = 'Connected';
  $('#connect').disabled = true;

  await refreshAll();
}

function init() {
  $('#connect').addEventListener('click', () =>
    connect().catch(e => {
      console.error(e);
      statusText('#global-status', e.shortMessage || e.message, true);
    })
  );

  $('#refresh').addEventListener('click', refreshAll);

  $('#create-event').addEventListener('submit', async e => {
    e.preventDefault();

    try {
      if (!contract) {
        throw Error('Connect wallet and configure contract first.');
      }

      const f = new FormData(e.currentTarget);

      await tx(
        contract.createEvent(
          f.get('name'),
          f.get('description'),
          f.get('venue'),
          Math.floor(new Date(f.get('date')).getTime() / 1000),
          parseEther(f.get('price')),
          BigInt(f.get('quantity'))
        ),
        'Create event'
      );

      e.currentTarget.reset();
      await refreshAll();
    } catch (x) {
      console.error(x);
      statusText('#global-status', x.shortMessage || x.message, true);
    }
  });

  $('#events-list').addEventListener('click', async e => {
    const b = e.target.closest('[data-buy]');
    if (!b) return;

    try {
      const event = events.find(x => x.id.toString() === b.dataset.buy);

      if (!event) throw Error('Event not found.');

      await tx(
        contract.buyTicket(event.id, { value: event.price }),
        'Purchase ticket'
      );

      await refreshAll();
    } catch (x) {
      console.error(x);
      statusText('#global-status', x.shortMessage || x.message, true);
    }
  });

  $('#tickets-list').addEventListener('click', async e => {
    const q = e.target.closest('[data-qr]');
    if (!q) return;

    try {
      const id = q.dataset.qr;
      const canvas = $('#qr-canvas');

      canvas.src = await QRCode.toDataURL(
        JSON.stringify({
          ticketId: id,
          contract: cfg.contract.address,
          chainId: cfg.network.chainId
        }),
        { width: 240, margin: 2 }
      );

      $('#qr-dialog').showModal();
    } catch (x) {
      console.error(x);
      statusText('#global-status', x.shortMessage || x.message, true);
    }
  });

  $('#verify-form').addEventListener('submit', async e => {
    e.preventDefault();

    try {
      const id = $('#ticket-id').value.trim();
      const [valid, rawTicket] = await contract.verifyTicket(id);
      const t = normalizeTicket(rawTicket);

      const state = ['VALID', 'USED', 'CANCELLED'][t.status] ?? 'UNKNOWN';

      $('#verification-result').textContent = valid
        ? `VALID ticket #${id}, owner ${t.owner}`
        : `Ticket #${id}: ${t.id === 0n ? 'INVALID' : state}`;

      $('#checkin').hidden = !valid;
    } catch (x) {
      console.error(x);
      $('#verification-result').textContent =
        x.shortMessage || x.message;

      $('#checkin').hidden = true;
    }
  });

  $('#checkin').addEventListener('click', async () => {
    try {
      await tx(
        contract.useTicket($('#ticket-id').value),
        'Check in ticket'
      );

      $('#verification-result').textContent =
        'Ticket marked USED. It cannot be used again.';

      $('#checkin').hidden = true;

      await refreshAll();
    } catch (x) {
      console.error(x);
      statusText('#global-status', x.shortMessage || x.message, true);
    }
  });

  $('#start-scan').addEventListener('click', async () => {
    try {
      scanner = new Html5Qrcode('reader');

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        async text => {
          try {
            const data = JSON.parse(text);
            $('#ticket-id').value = data.ticketId;
            await scanner.stop();
            $('#verify-form').requestSubmit();
          } catch {
            $('#ticket-id').value = text;
            $('#verify-form').requestSubmit();
          }
        }
      );
    } catch (x) {
      console.error(x);
      statusText(
        '#global-status',
        `Camera unavailable: ${x.message}`,
        true
      );
    }
  });

  $('#close-qr').addEventListener('click', () =>
    $('#qr-dialog').close()
  );

  window.ethereum?.on?.('accountsChanged', () => location.reload());
  window.ethereum?.on?.('chainChanged', () => location.reload());

  if (!configured()) {
    statusText(
      '#global-status',
      'Setup required: deploy the contract to Ganache, export its ABI and fill deployment.json.'
    );
  }
}

document.addEventListener('DOMContentLoaded', init);
