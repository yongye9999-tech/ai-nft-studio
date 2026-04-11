"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";

interface EthereumProvider {
  request: (args: { method: string }) => Promise<string[]>;
  on: (event: string, cb: (args: string[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

interface Web3ContextType {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const Web3Context = createContext<Web3ContextType>({
  provider: null,
  signer: null,
  account: null,
  chainId: null,
  connect: async () => {},
  disconnect: () => {},
});

export function useWeb3() {
  return useContext(Web3Context);
}

export function Web3ProviderWrapper({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const connect = useCallback(async () => {
    if (typeof window === "undefined") return;
    const eth = window.ethereum;
    if (!eth) {
      alert("请安装 MetaMask 或其他 Web3 钱包");
      return;
    }

    const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
    // ethers v6 BrowserProvider accepts any EIP-1193 provider
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const browserProvider = new BrowserProvider(eth as any);
    const s = await browserProvider.getSigner();
    const network = await browserProvider.getNetwork();

    setProvider(browserProvider);
    setSigner(s);
    setAccount(accounts[0]);
    setChainId(Number(network.chainId));

    // Listen for account and chain changes
    eth.on("accountsChanged", (accs: string[]) => {
      setAccount(accs[0] ?? null);
    });
    eth.on("chainChanged", () => {
      window.location.reload();
    });
  }, []);

  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
  }, []);

  return (
    <Web3Context.Provider value={{ provider, signer, account, chainId, connect, disconnect }}>
      {children}
    </Web3Context.Provider>
  );
}
