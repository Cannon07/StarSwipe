import React, { useState, useContext, useEffect } from "react";
import { WalletContext } from "../context/WalletContext";
import { signTransaction } from "@stellar/freighter-api";
import Header from "../components/Header";
import CardSuccessModal from "../components/CardSuccessModal";

const API_BASE = "https://stellarpaybackend.onrender.com/api/v1";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export default function RegisterCard() {
  const { selectedWallet, signClient, connectWallet } = useContext(WalletContext);
  const [dailyLimit, setDailyLimit] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  // Detect if mobile
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Check wallet connection status on mobile
  useEffect(() => {
    const checkMobileWallet = async () => {
      if (isMobile && selectedWallet && !signClient) {
        console.warn("Mobile user has address but no WalletConnect session");
        alert("Your wallet connection was lost. Please reconnect.");
        // Optionally trigger reconnection
        // await connectWallet("testnet");
      }
    };
    
    checkMobileWallet();
  }, [isMobile, selectedWallet, signClient, connectWallet]);

  // Sign transaction with appropriate method
  const signTransactionWithWallet = async (unsignedTxXDR) => {
    if (isMobile) {
      // Mobile: Must use WalletConnect
      if (!signClient) {
        throw new Error(
          "No WalletConnect session found. Please connect your wallet first."
        );
      }

      console.log("Signing with WalletConnect (mobile)...");
      
      const sessions = signClient.session.getAll();
      if (sessions.length === 0) {
        throw new Error("No active WalletConnect session. Please reconnect your wallet.");
      }
      
      const session = sessions[0];
      const topic = session.topic;
      
      try {
        // Use stellar_signXDR method (WalletConnect standard for Stellar)
        console.log("Attempting stellar_signXDR...");
        const result = await signClient.request({
          topic: topic,
          chainId: "stellar:testnet",
          request: {
            method: "stellar_signXDR",
            params: {
              xdr: unsignedTxXDR
            }
          }
        });
        
        console.log("WalletConnect sign result:", result);
        
        // Extract signed XDR from response
        // Response format: { signedXDR: "..." }
        const signedXDR = result.signedXDR || result.signedTxXdr || result.signedTxXDR || result;
        
        if (typeof signedXDR !== 'string') {
          console.error("Unexpected result format:", result);
          throw new Error("Invalid signed transaction format received from wallet");
        }
        
        return signedXDR;
        
      } catch (error) {
        console.error("stellar_signXDR failed:", error);
        
        // Check if user rejected
        if (
          error.message?.includes("User rejected") ||
          error.message?.includes("User declined") ||
          error.message?.includes("rejected") ||
          error.message?.includes("cancelled")
        ) {
          throw new Error("Transaction cancelled by user");
        }
        
        throw new Error(
          `Failed to sign transaction: ${error.message}. ` +
          `Please ensure your wallet app supports WalletConnect and is up to date.`
        );
      }
      
    } else {
      // Desktop: Use Freighter browser extension
      console.log("Signing with Freighter (desktop)...");
      
      try {
        const signedResult = await signTransaction(unsignedTxXDR, {
          networkPassphrase: NETWORK_PASSPHRASE,
          accountToSign: selectedWallet,
        });
        
        console.log("Freighter sign result:", signedResult);
        return signedResult.signedTxXdr || signedResult;
        
      } catch (error) {
        console.error("Freighter signing failed:", error);
        
        if (error.message?.includes("User declined")) {
          throw new Error("Transaction cancelled by user");
        }
        
        throw new Error(`Failed to sign transaction: ${error.message}`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (pin !== confirmPin) {
      alert("PIN and Confirm PIN do not match!");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      alert("PIN must be exactly 4 digits!");
      return;
    }

    if (!selectedWallet) {
      alert("Please connect your wallet first!");
      return;
    }

    // Check for WalletConnect session on mobile
    if (isMobile && !signClient) {
      alert(
        "No wallet connection found. Please connect your wallet using WalletConnect."
      );
      // Optionally trigger connection
      try {
        await connectWallet("testnet");
        alert("Wallet connected! Please submit the form again.");
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
      return;
    }

    setLoading(true);

    try {
      // Step 1: Try to get existing user first
      let userIdToUse = userId;

      if (!userIdToUse) {
        try {
          // Try to register (will fail if exists)
          const userResponse = await fetch(`${API_BASE}/users/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              walletAddress: selectedWallet,
              email: "user@example.com",
            }),
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            userIdToUse = userData.user.id;
          } else {
            // User might already exist - try to get by wallet
            const getUserResponse = await fetch(
              `${API_BASE}/users/${selectedWallet}`,
            );
            if (getUserResponse.ok) {
              const userData = await getUserResponse.json();
              userIdToUse = userData.user.id;
            } else {
              throw new Error("Failed to register or find user");
            }
          }

          setUserId(userIdToUse);
        } catch (error) {
          throw new Error("User registration failed: " + error.message);
        }
      }

      // Step 2: Prepare card registration
      const cardId = "NFC_CARD_" + Date.now();

      console.log("Preparing card registration...");
      const prepareResponse = await fetch(
        `${API_BASE}/cards/prepare-registration`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userIdToUse,
            cardId: cardId,
            pin: pin,
            dailyLimit: parseFloat(dailyLimit) || 100,
          }),
        },
      );

      if (!prepareResponse.ok) {
        const error = await prepareResponse.json();
        throw new Error(error.error || "Failed to prepare registration");
      }

      const { unsignedTxXDR, share2, cardPublicKey } =
        await prepareResponse.json();

      console.log("Card registration prepared. Requesting signature...");

      // Step 3: Sign with appropriate wallet (mobile or desktop)
      const signedXDR = await signTransactionWithWallet(unsignedTxXDR);
      console.log("Transaction signed successfully!");

      // Step 4: Submit signed transaction
      console.log("Submitting signed transaction...");
      const submitResponse = await fetch(
        `${API_BASE}/cards/submit-registration`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signedTxXDR: signedXDR,
            cardId: cardId,
          }),
        },
      );

      if (!submitResponse.ok) {
        const error = await submitResponse.json();
        throw new Error(error.error || "Failed to submit registration");
      }

      const result = await submitResponse.json();

      // Step 5: Save Share 2 locally
      localStorage.setItem(`card_${cardId}_share2`, share2);

      // Show success modal
      setCardData({
        cardId: cardId,
        cardAddress: cardPublicKey,
        txHash: result.txHash,
        share2: share2,
      });

      alert("✅ Card registered successfully!");
      
      // Clear form
      setDailyLimit("");
      setPin("");
      setConfirmPin("");
      
    } catch (error) {
      console.error("Registration error:", error);

      if (
        error.message.includes("User declined") ||
        error.message.includes("User rejected") ||
        error.message.includes("cancelled by user")
      ) {
        alert("❌ Transaction cancelled by user");
      } else if (error.message.includes("No WalletConnect session")) {
        alert(
          "❌ Wallet connection lost. Please reconnect your wallet and try again."
        );
      } else {
        alert(`❌ Registration failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (setter) => (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    setter(value);
  };

  const truncateAddress = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6">
  <Header />

  {/* Centered content */}
  <div className="flex-1 flex flex-col justify-center items-center">
    <h1 className="text-2xl font-semibold my-4 sm:my-6 text-center">Register Card</h1>

    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm flex flex-col gap-4"
    >
      {/* Owner Wallet */}
      <div>
        <label className="text-gray-400 text-sm">Owner Wallet Address</label>
        <input
          type="text"
          value={truncateAddress(selectedWallet)}
          readOnly
          className="w-full bg-gray-800 py-3 px-4 rounded-xl text-white cursor-not-allowed"
        />
      </div>

      {/* Daily Limit */}
      <div>
        <label className="text-gray-400 text-sm">Daily Limit (XLM)</label>
        <input
          type="number"
          value={dailyLimit}
          onChange={(e) => setDailyLimit(e.target.value)}
          placeholder="Enter daily limit (e.g., 100)"
          className="w-full bg-gray-800 py-3 px-4 rounded-xl text-white"
          required
        />
      </div>

      {/* PIN */}
      <div>
        <label className="text-gray-400 text-sm">PIN (4 digits)</label>
        <input
          type="password"
          value={pin}
          onChange={handlePinChange(setPin)}
          placeholder="••••"
          inputMode="numeric"
          maxLength={4}
          className="w-full bg-gray-800 py-3 px-4 rounded-xl text-white"
          required
        />
      </div>

      {/* Confirm PIN */}
      <div>
        <label className="text-gray-400 text-sm">Confirm PIN</label>
        <input
          type="password"
          value={confirmPin}
          onChange={handlePinChange(setConfirmPin)}
          placeholder="••••"
          inputMode="numeric"
          maxLength={4}
          className="w-full bg-gray-800 py-3 px-4 rounded-xl text-white"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading || !selectedWallet}
        className="mt-4 w-full bg-blue-600 py-3 rounded-xl text-lg font-bold hover:bg-blue-700 shadow-lg transition disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        {loading ? "Registering..." : "Register"}
      </button>
    </form>
  </div>

  {/* Card Success Popup */}
  {cardData && (
    <CardSuccessModal
      cardId={cardData.cardId}
      cardAddress={cardData.cardAddress}
      txHash={cardData.txHash}
      share2={cardData.share2}
    />
  )}
</div>

  );
}
