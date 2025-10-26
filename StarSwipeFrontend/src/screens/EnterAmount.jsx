import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import Header from "../components/Header";

export default function EnterAmount() {
  const navigate = useNavigate();
  const location = useLocation();
  const [amount, setAmount] = useState("");

  // Get card info from navigation state
  const { card_id, card_address } = location.state || {};

  const handleChange = (e) => {
    // Only allow digits
    const value = e.target.value.replace(/\D/g, "");
    setAmount(value);
  };

  const truncateAddress = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "****";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white px-6">
      <Header />

      <div className="flex flex-col items-center pt-16">
        {/* Card Info */}
        <div className="w-full max-w-sm rounded-2xl bg-gray-800 p-4 mb-8 shadow-lg">
          <p className="text-gray-400 text-sm">Card ID</p>
          <p className="text-lg font-semibold truncate mt-1">
            {card_id || "----"}
          </p>
          <p className="text-gray-400 text-sm mt-2">Card Address</p>
          <p className="text-lg font-semibold truncate mt-1">
            {truncateAddress(card_address)}
          </p>
        </div>

        {/* Heading */}
        <h1 className="text-xl font-medium mb-6 opacity-80">Enter Amount</h1>

        {/* Amount Input */}
        <input
          type="tel" // system numeric keypad
          inputMode="numeric"
          pattern="[0-9]*"
          value={amount}
          onChange={handleChange}
          placeholder="0"
          className="
            text-5xl font-bold text-white bg-gray-800 w-full max-w-sm py-4 text-center rounded-xl
            focus:outline-none focus:ring-2 focus:ring-blue-500
          "
        />

        {/* Continue Button */}
        <button
          onClick={() =>
            amount &&
            navigate("/pin", {
              state: { amount, card_id, card_address },
            })
          }
          className="mt-8 w-full max-w-sm bg-blue-600 py-4 rounded-full text-lg font-semibold shadow-lg hover:bg-blue-700 active:bg-blue-800 transition duration-150"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
