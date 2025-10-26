import React, { useContext } from "react";
import { WalletContext } from "../context/WalletContext";
import { useNavigate } from "react-router-dom";

export default function Header() {
  console.log("hello,hi,yo.")
  const { selectedWallet, connectWallet, disconnectWallet } = useContext(WalletContext);
  const navigate = useNavigate();

  const handleWalletAction = async () => {
    if (selectedWallet) {
      await disconnectWallet();
    } else {
      await connectWallet("testnet");
    }
  };

  return (
    <div className="flex justify-between items-center w-full py-2 px-2">
      <h1 
        className="text-3xl font-bold text-blue-400 cursor-pointer"
        onClick={() => navigate("/")}
      >
        StarSwipe
      </h1>
      <button
        onClick={handleWalletAction}
        className="bg-blue-500 px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition"
      >
        {selectedWallet
          ? `${selectedWallet.slice(0, 6)}...${selectedWallet.slice(-4)}`
          : "Connect Wallet"}
      </button>
    </div>
  );
}
