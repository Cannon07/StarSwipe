// src/context/WalletContext.js
import React, { createContext, useState } from "react";
import {
  isConnected,
  requestAccess,
  getNetworkDetails,
} from "@stellar/freighter-api";
import SignClient from "@walletconnect/sign-client";
import QRCodeModal from "@walletconnect/qrcode-modal";

export const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [selectedWallet, setSelectedWallet] = useState("");
  const [signClient, setSignClient] = useState(null);

  // Freighter connection for desktop
  const connectFreighter = async (requiredNetwork = "TESTNET") => {
    try {
      const connectionCheck = await isConnected();
      if (!connectionCheck.isConnected) {
        throw new Error("Freighter is not installed");
      }

      const networkDetails = await getNetworkDetails();

      console.log("Current Freighter network:", networkDetails);
      console.log("Network name:", networkDetails.network);
      console.log("Required network:", requiredNetwork);

      if (networkDetails.network !== requiredNetwork) {
        const networkDisplayName =
          requiredNetwork === "TESTNET" ? "Test Net" : "Main Net";
        throw new Error(
          `Wrong Network! Please switch to ${requiredNetwork} in Freighter wallet settings.\n\n` +
            `Current network: ${networkDetails.network}\n` +
            `Required network: ${requiredNetwork}\n\n` +
            `To switch:\n` +
            `1. Click the Freighter extension icon\n` +
            `2. Go to Settings (gear icon)\n` +
            `3. Select "${networkDisplayName}"\n` +
            `4. Try connecting again`
        );
      }

      const accessObj = await requestAccess();

      if (accessObj.error) {
        throw new Error(accessObj.error);
      }

      const publicKey = accessObj.address;
      setSelectedWallet(publicKey);
      return publicKey;
    } catch (err) {
      console.warn("Freighter connection failed:", err.message);
      alert(err.message);
      return null;
    }
  };

  // WalletConnect connection for mobile
  const connectWalletConnect = async (network = "testnet") => {
    try {
      console.log("Initializing WalletConnect for network:", network);

      const client = await SignClient.init({
        projectId: "4e21a7d8941d67cd0794c08465ba010b",
        metadata: {
          name: "BitSpend",
          description: "BitSpend DApp",
          url: window.location.origin,
          icons: ["https://avatars.githubusercontent.com/u/37784886"],
        },
      });

      setSignClient(client);

      // Determine the correct chain ID for Stellar
      // For testnet: stellar:testnet
      // For mainnet: stellar:pubnet
      const stellarChainId =
        network === "testnet" ? "stellar:testnet" : "stellar:pubnet";

      console.log("Connecting to chain:", stellarChainId);

      const { uri, approval } = await client.connect({
        requiredNamespaces: {
          stellar: {
            methods: [
              "stellar_signXDR",
              "stellar_signAndSubmitXDR"
            ],
            chains: [stellarChainId],
            events: ["chainChanged", "accountsChanged"],
          },
        },
      });

      if (uri) {
        console.log("Opening WalletConnect QR modal");
        QRCodeModal.open(uri, () => console.log("QR closed"));
      }

      const session = await approval();
      QRCodeModal.close();

      console.log("WalletConnect session established:", session);

      // Extract the address from the session
      const accounts = session.namespaces.stellar?.accounts || [];

      if (accounts.length === 0) {
        throw new Error("No accounts found in WalletConnect session");
      }

      // Parse the account address from the CAIP-10 format
      // Format: "stellar:testnet:G..."
      const address = accounts[0].split(":")[2];

      // Verify the network from the session
      const sessionChain = accounts[0].split(":")[1];
      const expectedChain = network === "testnet" ? "testnet" : "pubnet";

      console.log("Session chain:", sessionChain);
      console.log("Expected chain:", expectedChain);

      if (sessionChain !== expectedChain) {
        // Disconnect the session
        await client.disconnect({
          topic: session.topic,
          reason: {
            code: 1,
            message: "Wrong network",
          },
        });

        throw new Error(
          `Wrong Network! Please switch your wallet to ${network.toUpperCase()}.\n\n` +
            `Connected network: ${sessionChain}\n` +
            `Required network: ${expectedChain}\n\n` +
            `To switch in your mobile wallet:\n` +
            `1. Open your wallet app\n` +
            `2. Go to Settings\n` +
            `3. Switch to "${
              network === "testnet" ? "Test Net" : "Main Net"
            }"\n` +
            `4. Try connecting again`
        );
      }

      setSelectedWallet(address);
      return address;
    } catch (err) {
      console.error("WalletConnect error:", err);
      alert(err.message || "WalletConnect connection failed!");
      return null;
    }
  };

  // Main connectWallet function
  const connectWallet = async (network) => {
    const networkToUse = network || "testnet";

    console.log("connectWallet called with network:", networkToUse);

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    console.log("Is mobile device:", isMobile);

    if (isMobile) {
      // For mobile, use WalletConnect
      return await connectWalletConnect(networkToUse);
    } else {
      // For desktop, use Freighter extension
      const requiredNetwork =
        networkToUse === "mainnet" || networkToUse === "public"
          ? "PUBLIC"
          : "TESTNET";

      return await connectFreighter(requiredNetwork);
    }
  };

  // Disconnect function
  const disconnectWallet = async () => {
    if (signClient) {
      const sessions = signClient.session.getAll();
      for (const session of sessions) {
        await signClient.disconnect({
          topic: session.topic,
          reason: {
            code: 1,
            message: "User disconnected",
          },
        });
      }
    }
    setSelectedWallet("");
    setSignClient(null);
  };

  return (
    <WalletContext.Provider
      value={{
        selectedWallet,
        signClient,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
