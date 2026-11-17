# Dashboard and History Implementation Notes

## Files

- `frontend/src/modules/dashboard.js`: reads contract event logs and derives ticket totals.
- `frontend/src/modules/history.js`: reads event logs, fetches mined block timestamps, supports search, pagination, and copying transaction hashes.
- `frontend/src/modules/contract.js`: shared ethers provider and contract instances.
- `frontend/src/modules/wallet.js`: MetaMask connection and account/network change listeners.
- `frontend/src/main.js`: initializes the views and wires wallet and refresh controls.
- `frontend/src/style.css`: responsive application and dashboard/history styles.

## Contract compatibility

The ABI and deployment configuration supplied in this archive are intentionally empty because the uploaded project contained an empty ABI and no deployment address, chain ID, or deployment block. Live reads will remain unavailable until the actual compiled ABI and Ganache deployment details are entered.

The dashboard recognizes event names by common naming patterns. Check the deployed contract's actual event definitions. If event names or argument names differ, adjust the event classification and argument lookup in `dashboard.js` and `history.js`.

For reliable valid/used/cancelled totals, the contract must emit a corresponding event for every ticket lifecycle change, or expose authoritative getters that can be queried. Event logs alone cannot reveal a status change that the contract never emits.

## Verification checklist

- [ ] ABI JSON is a valid ABI array from Remix.
- [ ] Contract address matches the current Ganache deployment.
- [ ] Chain ID matches Ganache and MetaMask.
- [ ] Deployment block is correct.
- [ ] Ticket purchase event is recognized.
- [ ] Ticket check-in/use event is recognized.
- [ ] Ticket cancellation event is recognized, if supported.
- [ ] Dashboard counts match contract state after purchase and check-in.
- [ ] History timestamps match block timestamps.
- [ ] Search, pagination, and transaction-hash copy work.
