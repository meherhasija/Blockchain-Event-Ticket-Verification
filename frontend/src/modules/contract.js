import deploymentConfig from '../config/deployment.json';
import contractAbi from '../../../artifacts/EventTicketVerification.abi.json';
import { BrowserProvider, JsonRpcProvider, Contract } from 'ethers';

let provider = null;
let signer = null;
let readContract = null;
let signerContract = null;

export function getDeploymentConfig() {
  return deploymentConfig;
}

export function getContractABI() {
  return Array.isArray(contractAbi) ? contractAbi : [];
}

export function isContractConfigured() {
  const address = deploymentConfig?.contract?.address;
  const chainId = deploymentConfig?.network?.chainId;
  return typeof address === 'string' &&
    /^0x[a-fA-F0-9]{40}$/.test(address) &&
    chainId !== null && chainId !== undefined &&
    getContractABI().length > 0;
}

export async function initBlockchainConnection(externalProvider = null) {
  provider = null;
  signer = null;
  readContract = null;
  signerContract = null;

  if (!isContractConfigured()) {
    return { isConfigured: false, connected: false, reason: 'Deployment details or ABI are not configured.' };
  }

  if (externalProvider) {
    provider = externalProvider;
  } else if (window.ethereum) {
    provider = new BrowserProvider(window.ethereum);
  } else if (deploymentConfig.network.rpcUrl) {
    provider = new JsonRpcProvider(deploymentConfig.network.rpcUrl);
  } else {
    return { isConfigured: true, connected: false, reason: 'No blockchain provider is available.' };
  }

  const network = await provider.getNetwork();
  if (BigInt(network.chainId) !== BigInt(deploymentConfig.network.chainId)) {
    provider = null;
    return { isConfigured: true, connected: false, reason: `Wrong network. Expected chain ID ${deploymentConfig.network.chainId}.` };
  }

  readContract = new Contract(deploymentConfig.contract.address, getContractABI(), provider);
  if (provider instanceof BrowserProvider) {
    try {
      signer = await provider.getSigner();
      signerContract = new Contract(deploymentConfig.contract.address, getContractABI(), signer);
    } catch {
      signer = null;
      signerContract = null;
    }
  }

  return { isConfigured: true, connected: true, provider, contract: readContract };
}

export function setSigner(signerInstance) {
  signer = signerInstance;
  signerContract = isContractConfigured() && signer
    ? new Contract(deploymentConfig.contract.address, getContractABI(), signer)
    : null;
}

export function getProvider() { return provider; }
export function getSigner() { return signer; }
export function getReadOnlyContract() { return readContract; }
export function getSignerContract() { return signerContract; }
