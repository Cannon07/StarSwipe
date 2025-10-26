import React, { useState, useContext } from "react";
import WalletSelectModal from "../components/WalletSelectModel";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { WalletContext } from "../context/WalletContext";

export default function LandingPage() {
  const { selectedWallet, setSelectedWallet } = useContext(WalletContext);
  const [walletAccounts, setWalletAccounts] = useState([]);
  const navigate = useNavigate();

  const handleSelectAccount = (acc) => {
    setSelectedWallet(acc);
    setWalletAccounts([]);
  };

  const handleRegisterCard = () => {
    if (!selectedWallet) {
      alert("Please connect your wallet first!");
      return;
    }
    // Navigate directly to register card page
    navigate("/register-card");
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-black to-gray-900 text-white p-6">
      
      <Header />

      {walletAccounts.length > 1 && (
        <WalletSelectModal
          accounts={walletAccounts}
          onSelect={handleSelectAccount}
          onClose={() => setWalletAccounts([])}
        />
      )}

      <div className="flex flex-col items-center text-center mt-20">
        {/* Hero Section */}
        <h2 className="text-4xl font-extrabold text-blue-300 drop-shadow-md">
          Spend Crypto. With Ease.
        </h2>
        <p className="text-gray-300 mt-4 max-w-sm">
          BitSpend lets you use your crypto seamlessly for real-world payments.
          Secure. Fast. Global.
        </p>
      </div>

      <div className="flex justify-center mb-8 pb-8">
        <button
          className="bg-blue-600 px-6 py-3 mt-8 rounded-xl text-lg font-bold hover:bg-blue-700 shadow-lg transition"
          onClick={handleRegisterCard}
        >
          Register Card
        </button>
      </div>
    </div>
  );
}
