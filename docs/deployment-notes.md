# Deployment notes

Compile `contracts/EventTicketVerification.sol` in Remix using Solidity 0.8.20. Deploy through MetaMask connected to Ganache. Copy the resulting contract address and deployment block into `frontend/src/config/deployment.json`. Export the exact ABI from the same compilation into `artifacts/EventTicketVerification.abi.json`.

Never commit private keys. Never invent deployment details. Re-deployment requires updating the configuration and ABI.
