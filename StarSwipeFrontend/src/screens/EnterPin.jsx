import { useNavigate } from "react-router-dom";
import { useState } from "react";

const API_BASE = "https://stellarpaybackend.onrender.com/api/v1";

export default function EnterPin() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    // Only digits, max length 4
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    setPin(value);
  };

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      alert("Please enter a 4-digit PIN");
      return;
    }

    setLoading(true);

    try {
      // Process payment transaction
      const response = await fetch(`${API_BASE}/transactions/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: "NFC_CARD_1761453929370",
          share2:
            "789c015200adff08025323bb0f51b7fe499b233fdeb6bb56ed150baeb78a605726b784cca0317aef3610d1f7d835718a3189a66ad75151b7891a9ed6aa78102f12841643f4aea1af0e290ff8707d3901cc77345cb3ada503a415a825a3",
          pin: "1234",
          amount: "10",
          merchantAddress:
            "GAOLRGTD737V5I4SVVA3PWXS7HA4ZKDIC7PDL6LUWQGKTLYNDOGPJSOH",
          merchantName: "Demo Store",
          merchantId: "M12345",
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Payment successful
        navigate("/success", {
          state: {
            amount: "50",
            merchant: "Demo Store",
            txHash: result.transaction?.txHash,
            cardId: "NFC_CARD_1761441607",
          },
        });
      } else {
        // Payment failed
        navigate("/failed", {
          state: {
            error: result.error || "Payment failed",
            reason: result.message,
          },
        });
      }
    } catch (error) {
      console.error("Payment error:", error);
      navigate("/failed", {
        state: {
          error: "Network error",
          reason: error.message,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white px-6">
      <h1 className="text-xl font-medium mb-6 opacity-80">Enter PIN</h1>

      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        value={pin}
        onChange={handleChange}
        maxLength={4}
        placeholder="••••"
        disabled={loading}
        className="
          text-5xl font-bold text-white bg-gray-800 w-full max-w-sm py-4 text-center rounded-xl
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      />

      <button
        onClick={handleSubmit}
        disabled={loading || pin.length !== 4}
        className="mt-8 w-full max-w-sm bg-blue-600 py-4 rounded-full text-lg font-semibold shadow-lg hover:bg-blue-700 active:bg-blue-800 transition duration-150 disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        {loading ? "Processing..." : "Submit"}
      </button>

      {/* Demo Info */}
      <div className="mt-8 p-4 bg-gray-800/50 rounded-xl max-w-sm w-full">
        <p className="text-xs text-gray-400 text-center">
          <strong className="text-white">Demo Payment</strong>
          <br />
          Amount: 50 XLM
          <br />
          Merchant: Demo Store
        </p>
      </div>
    </div>
  );
}
