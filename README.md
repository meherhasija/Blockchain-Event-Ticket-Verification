# Blockchain-Based Event Ticket Verification

A local blockchain event ticketing application using Solidity, Ganache, MetaMask, Remix, Vite and ethers.js v6.

## Features
- Organizer-only event creation
- ETH ticket purchases and on-chain ownership
- Ticket QR generation and camera scanning
- Contract-based ticket verification and one-time check-in
- Authorized cancellation
- Resale marketplace with a 10% maximum markup
- Dashboard statistics and contract event history

## Run the frontend
```bash
cd frontend
npm install
npm run dev
```

## Deploy the contract
1. Start Ganache and note its RPC URL and chain ID.
2. Open `contracts/EventTicketVerification.sol` in https://remix.ethereum.org.
3. Compile with Solidity 0.8.20 or compatible 0.8.x.
4. In Deploy & Run, select Injected Provider - MetaMask and connect MetaMask to Ganache.
5. Deploy from the organizer account. Record the deployed address and deployment block.
6. Export the compiled ABI to `artifacts/EventTicketVerification.abi.json`.
7. Update `frontend/src/config/deployment.json` with the actual chain ID, contract address, and deployment block.
8. Restart Vite and connect MetaMask.

The repository intentionally contains no fabricated deployment address or generated transaction data. Dashboard and history remain empty until a real contract deployment has been configured and transactions have been made.

## Demo flow
Connect organizer wallet, create an event, connect a buyer wallet, purchase a ticket, view its QR, verify it, mark it used, then verify again to confirm that reuse is rejected. Test cancellation and resale separately.

## Notes
- Ganache must remain running during the local demonstration.
- If Ganache is reset or the contract is redeployed, update the address and deployment block.
- Only use local test accounts. Never put private keys in this project.
- Ticket check-in is organizer-only in this contract.
