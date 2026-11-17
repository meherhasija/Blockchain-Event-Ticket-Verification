import { BrowserProvider } from 'ethers';
import { getDeploymentConfig } from './contract.js';

let currentAccount = null;
let currentChainId = null;
let browserProvider = null;

export function isMetaMaskAvailable() {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

export async function connectWallet() {
  if (!isMetaMaskAvailable()) throw new Error('MetaMask was not detected. Install or enable the wallet extension.');
  browserProvider = new BrowserProvider(window.ethereum);
  const accounts = await browserProvider.send('eth_requestAccounts', []);
  if (!accounts.length) throw new Error('No wallet account was selected.');

  currentAccount = accounts[0];
  const network = await browserProvider.getNetwork();
  currentChainId = Number(network.chainId);

  const expected = getDeploymentConfig()?.network?.chainId;
  if (expected !== null && expected !== undefined && Number(expected) !== currentChainId) {
    throw new Error(`Wrong network. Switch MetaMask to chain ID ${expected}.`);
  }

  return { account: currentAccount, chainId: currentChainId, provider: browserProvider };
}

export function getConnectedAccount() { return currentAccount; }
export function getConnectedChainId() { return currentChainId; }
export function getBrowserProvider() { return browserProvider; }

export function setupWalletListeners(callbacks = {}) {
  if (!isMetaMaskAvailable()) return;
  window.ethereum.removeListener?.('accountsChanged', handleAccounts);
  window.ethereum.removeListener?.('chainChanged', handleChain);
  window.ethereum.on('accountsChanged', handleAccounts);
  window.ethereum.on('chainChanged', handleChain);

  function handleAccounts(accounts) {
    currentAccount = accounts?.[0] ?? null;
    callbacks.onAccountsChanged?.(currentAccount);
  }
  function handleChain(chainHex) {
    currentChainId = Number.parseInt(chainHex, 16);
    callbacks.onChainChanged?.(currentChainId);
  }
}
