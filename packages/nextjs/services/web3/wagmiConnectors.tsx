import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  baseAccount,
  ledgerWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import * as chains from "viem/chains";
import scaffoldConfig from "~~/scaffold.config";

const { onlyLocalBurnerWallet, targetNetworks } = scaffoldConfig;

/**
 * wagmi connectors for the wagmi context
 */
export const wagmiConnectors = () => {
  // Only create connectors on client-side to avoid SSR issues
  // TODO: update when https://github.com/rainbow-me/rainbowkit/issues/2476 is resolved
  if (typeof window === "undefined") {
    return [];
  }

  const wallets = [metaMaskWallet, walletConnectWallet, ledgerWallet, baseAccount, rainbowWallet];

  if (!targetNetworks.some(network => network.id !== (chains.hardhat as chains.Chain).id) || !onlyLocalBurnerWallet) {
    // Dynamic require to avoid loading burner-connector on the server (it accesses localStorage)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { rainbowkitBurnerWallet } = require("burner-connector");
    wallets.push(rainbowkitBurnerWallet);
  }

  return connectorsForWallets(
    [
      {
        groupName: "Supported Wallets",
        wallets,
      },
    ],

    {
      appName: "scaffold-eth-2",
      projectId: scaffoldConfig.walletConnectProjectId,
    },
  );
};
