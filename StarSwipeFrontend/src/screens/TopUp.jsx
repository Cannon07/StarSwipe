import React, { useState, useContext, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WalletContext } from "../context/WalletContext";
import { signTransaction } from "@stellar/freighter-api";
import Header from "../components/Header";

const API_BASE = "https://stellarpaybackend.onrender.com/api/v1";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export default function TopUp() {
  const { selectedWallet } = useContext(WalletContext);
  const location = useLocation();
  const navigate = useNavigate();
  
  const { cardId, cardAddress, share2 } = location.state || {};
  
  const [cardBalance, setCardBalance] = useState("Loading...");
  const [walletBalance, setWalletBalance] = useState("Loading...");
  const [topupAmount, setTopupAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedWallet) {
      alert("Wallet not connected! Redirecting to landing page...");
      navigate("/");
      return;
    }
    
    if (!cardId || !cardAddress) {
      alert("Card information missing! Please register a card first.");
      navigate("/register-card");
      return;
    }
    
    // Load balances
    loadBalances();
  }, [selectedWallet, cardId, cardAddress, navigate]);

  const loadBalances = async () => {
    try {
      // Get wallet balance
      const walletResponse = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${selectedWallet}`
      );
      if (walletResponse.ok) {
        const walletData = await walletResponse.json();
        const xlmBalance = walletData.balances.find(b => b.asset_type === 'native');
        setWalletBalance(parseFloat(xlmBalance.balance).toFixed(3));
      }
      
      // Get card balance
      const cardResponse = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${cardAddress}`
      );
      if (cardResponse.ok) {
        const cardData = await cardResponse.json();
        const xlmBalance = cardData.balances.find(b => b.asset_type === 'native');
        setCardBalance(parseFloat(xlmBalance.balance).toFixed(3));
      }
    } catch (error) {
      console.error("Error loading balances:", error);
      setWalletBalance("Error");
      setCardBalance("Error");
    }
  };

  const handleTopUp = async () => {
    const amount = parseFloat(topupAmount);
    
    if (!amount || amount <= 0) {
      return alert("Enter valid amount");
    }
    
    if (amount > parseFloat(walletBalance)) {
      return alert("Insufficient wallet balance!");
    }
    
    setLoading(true);

    try {
      // Step 1: Prepare top-up transaction
      const prepareResponse = await fetch(`${API_BASE}/cards/prepare-topup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: cardId,
          cardAddress: cardAddress,
          ownerAddress: selectedWallet,
          amount: amount.toString()
        }),
      });

      if (!prepareResponse.ok) {
        const error = await prepareResponse.json();
        throw new Error(error.error || "Failed to prepare top-up");
      }

      const { unsignedTxXDR } = await prepareResponse.json();

      // Step 2: Sign with Freighter
      console.log("Requesting signature for top-up...");
      
      const signedResult = await signTransaction(unsignedTxXDR, {
        networkPassphrase: NETWORK_PASSPHRASE,
        accountToSign: selectedWallet,
      });

      const signedXDR = signedResult.signedTxXdr || signedResult;

      // Step 3: Submit signed transaction
      const submitResponse = await fetch(`${API_BASE}/cards/submit-topup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedTxXDR: signedXDR,
          cardId: cardId,
        }),
      });

      if (!submitResponse.ok) {
        const error = await submitResponse.json();
        throw new Error(error.error || "Failed to submit top-up");
      }

      const result = await submitResponse.json();

      // Reload balances
      await loadBalances();
      
      setTopupAmount("");
      alert(`✅ Top-up successful!\nTx: ${result.txHash}`);

    } catch (error) {
      console.error("Top-up error:", error);
      
      if (error.message.includes("User declined")) {
        alert("❌ Transaction cancelled by user");
      } else {
        alert(`❌ Top-up failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const truncateAddress = (addr) =>
    addr ? `${addr.slice(0, 8)}...${addr.slice(-8)}` : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4 flex flex-col">
  <Header />

  {/* Centered content */}
  <div className="flex-1 flex flex-col justify-center items-center gap-6">
    <h1 className="text-2xl font-bold text-center text-blue-300 drop-shadow-md">
      Top Up Your Card
    </h1>

    {/* Card Info */}
    <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-gray-400 text-sm">Card ID:</span>
        <span className="text-white font-semibold">{cardId}</span>
      </div>

      <div className="flex justify-between items-start">
        <span className="text-gray-400 text-sm">Card Address:</span>
        <span className="text-white font-semibold text-xs sm:text-sm break-all">
          {truncateAddress(cardAddress)}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-gray-400 text-sm">Card Balance:</span>
        <span className="text-white font-semibold">{cardBalance} XLM</span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-gray-400 text-sm">Wallet Balance:</span>
        <span className="text-white font-semibold">{walletBalance} XLM</span>
      </div>
    </div>

    {/* Top-Up Section */}
    <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col gap-4">
      <label className="text-gray-400 text-sm">Top-Up Amount (XLM)</label>
      <input
        type="number"
        value={topupAmount}
        onChange={(e) => setTopupAmount(e.target.value)}
        placeholder="Enter amount to top up"
        className="w-full bg-gray-700 py-3 px-4 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={loading}
      />

      <button
        onClick={handleTopUp}
        disabled={loading || !cardId}
        className="w-full mt-2 bg-blue-600 py-3 rounded-xl text-lg font-bold hover:bg-blue-700 shadow-lg transition disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        {loading ? "Processing..." : "Top Up"}
      </button>
    </div>
  </div>
</div>

  );
}
