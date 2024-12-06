import sdk from "@farcaster/frame-sdk";
import { SwitchChainError, fromHex, getAddress, numberToHex } from "viem";
import { ChainNotConfiguredError, Connector, createConnector } from "wagmi";
import type { provider as EthereumProvider } from '@farcaster/frame-sdk/dist/provider';

frameConnector.type = "frameConnector" as const;

let accountsChanged: ((accounts: readonly `0x${string}`[]) => void) | undefined;
let chainChanged: Connector['onChainChanged'] | undefined;
let disconnect: Connector['onDisconnect'] | undefined;

export function frameConnector() {
  let connected = false;

  return createConnector<typeof EthereumProvider>((config) => ({
    id: "farcaster",
    name: "Farcaster Wallet",
    type: frameConnector.type,

    async setup() {
      if (!config.chains?.length) {
        console.warn("No chains configured");
        return;
      }
      
      try {
        await this.connect({ chainId: config.chains[0].id });
      } catch (error) {
        console.warn("Setup failed:", error);
      }
    },

    async connect({ chainId } = {}) {
      try {
        const provider = await this.getProvider();
        if (!provider) {
          throw new Error("Provider not initialized");
        }

        const accounts = await provider.request({
          method: "eth_requestAccounts",
        }) as readonly `0x${string}`[];

        if (!accountsChanged) {
          accountsChanged = (accounts: readonly `0x${string}`[]) => {
            this.onAccountsChanged([...accounts]);
          };
          provider.on('accountsChanged', accountsChanged);
        }

        if (!chainChanged) {
          chainChanged = this.onChainChanged.bind(this);
          provider.on('chainChanged', chainChanged);
        }

        if (!disconnect) {
          disconnect = this.onDisconnect.bind(this);
          provider.on('disconnect', disconnect);
        }

        let currentChainId = await this.getChainId();
        if (chainId && currentChainId !== chainId) {
          const chain = await this.switchChain!({ chainId });
          currentChainId = chain.id;
        }

        connected = true;

        return {
          accounts: accounts.map((x) => getAddress(x)),
          chainId: currentChainId,
        };
      } catch (error) {
        console.warn("Connection failed:", error);
        throw error;
      }
    },

    async disconnect() {
      try {
        const provider = await this.getProvider();
        if (!provider) return;

        if (accountsChanged) {
          provider.removeListener('accountsChanged', accountsChanged);
          accountsChanged = undefined;
        }

        if (chainChanged) {
          provider.removeListener('chainChanged', chainChanged);
          chainChanged = undefined;
        }

        if (disconnect) {
          provider.removeListener('disconnect', disconnect);
          disconnect = undefined;
        }

        connected = false;
      } catch (error) {
        console.warn("Disconnect failed:", error);
      }
    },

    async getAccounts() {
      try {
        if (!connected) throw new Error("Not connected");
        const provider = await this.getProvider();
        if (!provider) throw new Error("Provider not initialized");

        const accounts = await provider.request({
          method: "eth_requestAccounts",
        }) as readonly `0x${string}`[];
        
        return accounts.map((x) => getAddress(x));
      } catch (error) {
        console.warn("Get accounts failed:", error);
        throw error;
      }
    },

    async getChainId() {
      try {
        const provider = await this.getProvider();
        if (!provider) throw new Error("Provider not initialized");

        const hexChainId = await provider.request({ method: "eth_chainId" }) as `0x${string}`;
        return fromHex(hexChainId, "number");
      } catch (error) {
        console.warn("Get chain ID failed:", error);
        throw error;
      }
    },

    async isAuthorized() {
      try {
        if (!connected) {
          return false;
        }

        const accounts = await this.getAccounts();
        return !!accounts.length;
      } catch (error) {
        console.warn("Authorization check failed:", error);
        return false;
      }
    },

    async switchChain({ chainId }) {
      try {
        const provider = await this.getProvider();
        if (!provider) throw new Error("Provider not initialized");

        const chain = config.chains.find((x) => x.id === chainId);
        if (!chain) throw new SwitchChainError(new ChainNotConfiguredError());

        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: numberToHex(chainId) }],
        });

        config.emitter.emit("change", { chainId });

        return chain;
      } catch (error) {
        console.warn("Switch chain failed:", error);
        throw error;
      }
    },

    onAccountsChanged(accounts: string[]) {
      if (accounts.length === 0) {
        this.onDisconnect();
      } else {
        config.emitter.emit("change", {
          accounts: accounts.map((x) => getAddress(x)),
        });
      }
    },

    onChainChanged(chain: string) {
      const chainId = Number(chain);
      config.emitter.emit("change", { chainId });
    },

    async onDisconnect() {
      config.emitter.emit("disconnect");
      connected = false;
    },

    async getProvider() {
      if (!sdk.wallet?.ethProvider) {
        throw new Error("Provider not initialized");
      }
      return sdk.wallet.ethProvider;
    },
  }));
}
