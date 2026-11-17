# Blockchain-Based Event Ticket Verification System

A decentralized event ticketing and verification platform built using **Solidity, Ethereum-compatible blockchain technology, Ganache, MetaMask, and JavaScript**.

The system uses smart contracts to manage event creation, ticket purchases, ownership verification, and check-in operations. QR codes provide a convenient way to identify tickets, while blockchain records help ensure transparency and prevent duplicate ticket usage.

## Overview

Traditional event ticketing systems can face problems such as ticket duplication, forgery, unauthorized modifications, and repeated ticket usage.

This project addresses these challenges through blockchain-based ticket management. Each ticket is represented by an on-chain record that can be verified before entry. Once a ticket is used, its status is updated on the blockchain, preventing it from being used again.

## Key Features

- **Event Management:** Organizers can create events with details such as name, venue, date, ticket price, and quantity.
- **Blockchain-Based Ticketing:** Ticket purchases and ownership records are maintained through smart contracts.
- **QR Code Generation:** Unique QR codes are generated for purchased tickets.
- **Ticket Verification:** Verify ticket authenticity and check its current status.
- **Duplicate Usage Prevention:** Used tickets cannot be checked in again.
- **Ticket Cancellation:** Supports authorized ticket cancellation.
- **Transaction History:** Displays blockchain event records and ticket activity.
- **Dashboard:** Provides an overview of ticket statistics and event information.
- **Wallet Integration:** MetaMask connects users to the local blockchain.

## Technology Stack

| Technology | Purpose |
|---|---|
| Solidity | Smart contract development |
| Ethereum-compatible blockchain | Decentralized transaction records |
| Ganache | Local blockchain development and testing |
| Remix IDE | Smart contract compilation and deployment |
| MetaMask | Wallet integration and transaction approval |
| HTML5 | Frontend structure |
| CSS3 | User interface styling |
| JavaScript | Frontend functionality |
| ethers.js v6 | Blockchain interaction |
| qrcode | QR code generation |
| html5-qrcode | QR code scanning |
| Vite | Frontend development server |

## System Workflow

1. The organizer connects their wallet.
2. The organizer creates an event using the application.
3. The smart contract records the event on the blockchain.
4. A customer connects their wallet and purchases a ticket.
5. The purchased ticket is associated with the buyer's wallet.
6. The application generates a QR code for the ticket.
7. The QR code is scanned to retrieve the ticket ID.
8. The smart contract verifies the ticket and its status.
9. After successful verification, the ticket can be marked as USED.
10. Further attempts to use the same ticket are rejected.

## Project Structure

```text
Blockchain-Event-Ticket-Verification/
│
├── contracts/
│   └── EventTicketVerification.sol
│
├── artifacts/
│   └── Compiled contract artifacts
│
├── docs/
│   └── Project documentation
│
├── frontend/
│   ├── src/
│   │   ├── config/
│   │   │   └── deployment.json
│   │   ├── abi.json
│   │   ├── main.js
│   │   └── style.css
│   ├── index.html
│   └── package.json
│
├── README.md
└── package-lock.json
```

## Getting Started

### Prerequisites

Install the following:

- Node.js and npm
- Ganache
- MetaMask browser extension
- Remix IDE
- Visual Studio Code

### 1. Clone the Repository

```bash
git clone https://github.com/meherhasija/Blockchain-Event-Ticket-Verification.git
```

Navigate to the project:

```bash
cd Blockchain-Event-Ticket-Verification
```

### 2. Start Ganache

Run Ganache and start your local blockchain.

Configure the network with:

| Setting | Value |
|---|---|
| RPC URL | http://127.0.0.1:7545 |
| Network ID | 5777 |
| Chain ID | 1337 |

### 3. Deploy the Smart Contract

1. Open Remix IDE.
2. Load `contracts/EventTicketVerification.sol`.
3. Compile the contract using the compatible Solidity compiler.
4. Connect Remix to Ganache using External HTTP Provider.
5. Deploy `EventTicketVerification`.
6. Copy the deployed contract address.

### 4. Configure the Frontend

Update:

`frontend/src/config/deployment.json`

Add your local network and deployed contract details:

```json
{
  "network": {
    "name": "Ganache Local",
    "chainId": 1337,
    "rpcUrl": "http://127.0.0.1:7545"
  },
  "contract": {
    "name": "EventTicketVerification",
    "address": "YOUR_DEPLOYED_CONTRACT_ADDRESS",
    "deployerAddress": "YOUR_ORGANIZER_WALLET_ADDRESS",
    "deploymentBlock": 1,
    "deploymentTxHash": ""
  }
}
```

Ensure the ABI exported from Remix is available at `frontend/src/abi.json`.

### 5. Install Dependencies

```bash
cd frontend
npm install
```

### 6. Run the Application

```bash
npm run dev
```

Open the local URL displayed in your terminal, usually:

`http://localhost:5173`

Connect MetaMask to Ganache Local to interact with the application.

## Testing

The application can be tested using the following scenarios:

- Create an event using the organizer account.
- Purchase a ticket using a customer account.
- Generate and scan the ticket QR code.
- Verify a valid ticket.
- Mark a ticket as USED.
- Attempt to verify or reuse an already-used ticket.
- Test ticket cancellation.
- Review transaction history.

## Future Enhancements

- Integration with public blockchain networks.
- Improved ticket transfer and resale management.
- Enhanced organizer and attendee dashboards.
- Support for larger events and higher transaction volumes.
- Additional security and access-control mechanisms.
- Improved mobile experience.

## Project Information

**Project:** Blockchain-Based Event Ticket Verification System

**Domain:** Blockchain Technology and Decentralized Applications

**Development Environment:** Local Ethereum-compatible blockchain using Ganache.

**Repository:** [GitHub – Blockchain Event Ticket Verification](https://github.com/meherhasija/Blockchain-Event-Ticket-Verification)

---

*Developed as an academic mini project to explore smart contracts, blockchain-based verification, and decentralized application development.*
