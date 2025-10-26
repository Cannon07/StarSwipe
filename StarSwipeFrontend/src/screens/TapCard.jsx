import React, { useContext, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { WalletContext } from "../context/WalletContext";
import Header from "../components/Header"; // ✅ import header

export default function TapCard() {
  const navigate = useNavigate();
  const { selectedWallet } = useContext(WalletContext);
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState("");
  const ndefRef = useRef(null);

  useEffect(() => {
    return () => {
      try {
        if (ndefRef.current) {
          ndefRef.current.onreading = null;
          ndefRef.current = null;
        }
      } catch {}
    };
  }, []);

  const handleStartScan = async () => {
    if (!selectedWallet) {
      alert("Please connect your wallet first!");
      return;
    }

    if (!("NDEFReader" in window)) {
      setMessage(
        "Web NFC not supported. Use Chrome/Edge on Android — not MetaMask browser."
      );
      return;
    }

    try {
      setReading(true);
      setMessage("Hold NFC card near phone...");

      const ndef = new window.NDEFReader();
      ndefRef.current = ndef;

      await ndef.scan();

      ndef.onreading = (event) => {
        try {
          const { message: ndefMessage } = event;
          let parsed = null;

          for (const record of ndefMessage.records) {
            const text = new TextDecoder().decode(record.data);
            try {
              const json = JSON.parse(text);
              if (json.id && json.addr) {
                parsed = json;
                break;
              }
            } catch {}
          }

          if (!parsed) {
            setMessage("Tag scanned but no supported data found");
            setReading(false);
            return;
          }

          navigate("/amount", {
            state: {
              card_id: parsed.id,
              card_address: parsed.addr,
            },
          });

          setReading(false);
        } catch {
          setMessage("Error reading tag");
          setReading(false);
        }
      };

      ndef.onreadingerror = () => {
        setMessage("Failed to read tag. Try again");
        setReading(false);
      };
    } catch (err) {
      setMessage(err?.message || "NFC scan failed");
      setReading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* ✅ Your Header stays consistent across all pages */}
      <Header />

      <div className="flex flex-col items-center justify-center px-6 pt-20">
        <h1 className="text-2xl font-semibold mb-3">Tap Your NFC Card</h1>

        <p className="text-gray-400 text-center max-w-xs mb-8">
          Hold the card near your phone to fetch card details.
        </p>

        <button
          onClick={handleStartScan}
          disabled={reading}
          className="bg-blue-600 px-6 py-3 rounded-xl text-lg font-bold hover:bg-blue-700 shadow-lg transition"
        >
          {reading ? "Scanning..." : "Start Scan"}
        </button>

        {message && (
          <p className="mt-6 text-sm text-gray-300 text-center max-w-sm">
            {message}
          </p>
        )}

        <p className="mt-10 text-xs text-gray-500 text-center max-w-xs">
          Works only on Android Chrome/Edge.
          MetaMask browser does not allow NFC access.
        </p>
      </div>
    </div>
  );
}
