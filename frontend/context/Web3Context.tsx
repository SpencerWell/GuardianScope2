import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface Web3ContextType {
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  guardianContract: ethers.Contract | null;
  account: string | null;
  connectWallet: () => Promise<void>;
  createTask: (content: string) => Promise<void>;
  submitModeration: (taskId: number, content: string, approved: boolean) => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | null>(null);

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [guardianContract, setGuardianContract] = useState<ethers.Contract | null>(null);
  const [account, setAccount] = useState<string | null>(null);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const account = await signer.getAddress();

        // Load Guardian contract
        const guardianABI = []; // Add your contract ABI here
        const guardianAddress = ""; // Add your contract address here
        const guardianContract = new ethers.Contract(guardianAddress, guardianABI, signer);

        setProvider(provider);
        setSigner(signer);
        setGuardianContract(guardianContract);
        setAccount(account);
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    }
  };

  const createTask = async (content: string) => {
    if (!guardianContract) return;
    try {
      const tx = await guardianContract.createModerationTask(content);
      await tx.wait();
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const submitModeration = async (taskId: number, content: string, approved: boolean) => {
    if (!guardianContract || !signer) return;
    try {
      const messageHash = ethers.solidityPackedKeccak256(
        ["string", "bool"],
        [content, approved]
      );
      const messageBytes = ethers.getBytes(messageHash);
      const signature = await signer.signMessage(messageBytes);

      const tx = await guardianContract.submitModeration(taskId, approved, signature);
      await tx.wait();
    } catch (error) {
      console.error("Error submitting moderation:", error);
    }
  };

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        setAccount(accounts[0] || null);
      });
    }
  }, []);

  return (
    <Web3Context.Provider value={{
      provider,
      signer,
      guardianContract,
      account,
      connectWallet,
      createTask,
      submitModeration
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}