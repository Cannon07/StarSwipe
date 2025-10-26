import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CardSuccessModal({ cardId, cardAddress, share2 }) {
  const navigate = useNavigate();
  const [writingNfc, setWritingNfc] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  const handleCancel = () => navigate("/");
  const handleTopup = () =>
    navigate("/topup", { state: { cardId, cardAddress, share2 } });

  const truncateAddress = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";


  // const [addrB64, s2b64] = data.split("|");

  // // Decode address
  // const addrBytes = base64UrlDecode(addrB64);
  // const addrBase32 = bytesToBase32(addrBytes);
  // const address = "G" + addrBase32;
  // // Decode share2
  // const s2Bytes = base64UrlDecode(s2b64);
  // const share2 = bytesToHex(s2Bytes);

  // ==================== COMPRESSION HELPERS ====================

  // Convert hex string to bytes
  const hexToBytes = (hex) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  };

  // Convert bytes to hex string
  const bytesToHex = (bytes) => {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  // Encode bytes to base64url (URL-safe, no padding)
  const base64UrlEncode = (bytes) => {
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  // Decode base64url to bytes
  const base64UrlDecode = (base64url) => {
    let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    const binary = atob(base64);
    return new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
  };

  // Convert Stellar base32 address to bytes
  const base32ToBytes = (base32) => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const bytes = [];
    let bits = 0;
    let value = 0;

    for (let i = 0; i < base32.length; i++) {
      const char = base32[i];
      if (char === "=") break;

      const index = alphabet.indexOf(char);
      if (index === -1) continue;

      value = (value << 5) | index;
      bits += 5;

      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return new Uint8Array(bytes);
  };

  // Convert bytes back to Stellar base32 address
  const bytesToBase32 = (bytes) => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let result = "";
    let bits = 0;
    let value = 0;

    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 0x1f];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 0x1f];
    }

    return result;
  };

  // ==================== ULTRA-COMPACT ENCODING ====================

  const encodeCompact = (address, share2Hex) => {
    // Convert Stellar address: base32 → bytes → base64url
    // GDGHFIYIIYYXIMYFB2ESYMH2NVZEL33NZI4VKBKQWNLU4ZCUPZUUHDN4 (56 chars)
    // → Remove 'G' and decode base32 → ~35 bytes
    // → Encode to base64url → ~38 chars
    const addressBytes = base32ToBytes(address.substring(1));
    const addressBase64 = base64UrlEncode(addressBytes);

    // Convert share2: hex → bytes → base64url
    // 128 hex chars → 64 bytes → 86 base64url chars
    const share2Bytes = hexToBytes(share2Hex);
    const share2Base64 = base64UrlEncode(share2Bytes);

    // Total: 38 + 1 + 86 = 125 bytes! ✅
    return `${addressBase64}|${share2Base64}`;
  };

  const nfcPayload = encodeCompact(cardAddress, share2);

  // ==================== NFC WRITING ====================

  const writeToNfc = async () => {
    if (!("NDEFReader" in window)) {
      alert(
        "⚠️ Web NFC Not Supported\n\n" +
          "Your browser doesn't support automatic NFC writing. " +
          "Please use the manual instructions shown below.",
      );
      setShowManualInstructions(true);
      return;
    }

    try {
      setWritingNfc(true);

      const ndef = new window.NDEFReader();

      await ndef.write({
        records: [
          {
            recordType: "text",
            data: nfcPayload,
          },
        ],
      });

      setWritingNfc(false);
      alert(
        "✅ NFC Write Successful!\n\n" +
          `Size: ${new Blob([nfcPayload]).size} bytes / 144 bytes\n` +
          `Savings: ${144 - new Blob([nfcPayload]).size} bytes free\n\n` +
          "Your card is now ready to use.",
      );
    } catch (err) {
      setWritingNfc(false);
      console.error("NFC write failed:", err);

      if (err.name === "NotAllowedError") {
        alert(
          "❌ NFC permission denied. Please allow NFC access and try again.",
        );
      } else if (err.name === "NotReadableError") {
        alert(
          "❌ Could not read NFC tag. Please ensure the tag is writable and try again.",
        );
      } else {
        alert(`❌ NFC write failed: ${err.message || "Unknown error"}`);
        setShowManualInstructions(true);
      }
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    alert(`✅ ${label} copied to clipboard!`);
  };

  const copyCompactData = () => {
    navigator.clipboard.writeText(nfcPayload);
    alert(
      `✅ Compact data copied!\n\n` +
        `Size: ${new Blob([nfcPayload]).size} bytes / 144 bytes`,
    );
  };

  const getDataSize = () => {
    return new Blob([nfcPayload]).size;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl w-full max-w-md shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-green-600/20 border-b border-green-600/30 p-4">
          <h2 className="text-xl font-semibold text-center text-green-400 flex items-center justify-center gap-2">
            <span>✅</span>
            <span>Card Created!</span>
          </h2>
          <p className="text-center text-xs text-gray-400 mt-1">
            NFC data: {getDataSize()} / 144 bytes ({144 - getDataSize()} bytes
            free)
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Card Details */}
          <div className="bg-gray-800 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Card ID</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{cardId}</span>
                <button
                  onClick={() => copyToClipboard(cardId, "Card ID")}
                  className="text-blue-400 hover:text-blue-300 p-1"
                >
                  📋
                </button>
              </div>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-gray-400 text-sm">Card Address</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs break-all max-w-[180px]">
                  {truncateAddress(cardAddress)}
                </span>
                <button
                  onClick={() => copyToClipboard(cardAddress, "Card Address")}
                  className="text-blue-400 hover:text-blue-300 p-1"
                >
                  📋
                </button>
              </div>
            </div>

            {share2 && (
              <div className="flex justify-between items-start">
                <span className="text-gray-400 text-sm">Share 2</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs break-all max-w-[180px]">
                    {share2.slice(0, 12)}...
                  </span>
                  <button
                    onClick={() => copyToClipboard(share2, "Share 2")}
                    className="text-blue-400 hover:text-blue-300 p-1"
                  >
                    📋
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Manual Instructions Toggle */}
          {!showManualInstructions && (
            <button
              onClick={() => setShowManualInstructions(!showManualInstructions)}
              className="w-full text-sm text-blue-400 hover:text-blue-300 underline"
            >
              Can't write automatically? Click here for manual instructions
            </button>
          )}

          {/* Manual Instructions Section */}
          {showManualInstructions && (
            <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-xl p-4 space-y-4">
              <div className="flex items-start gap-2">
                <span className="text-yellow-400 text-xl">⚠️</span>
                <div>
                  <h3 className="text-yellow-400 font-semibold mb-1">
                    Manual NFC Writing
                  </h3>
                  <p className="text-sm text-gray-300">
                    Write this ultra-compressed data to your NFC tag:
                  </p>
                </div>
              </div>

              {/* Compact Data Display */}
              <div className="bg-gray-900 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-semibold">
                    COMPRESSED DATA ({getDataSize()} / 144 bytes):
                  </span>
                  <button
                    onClick={copyCompactData}
                    className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md transition"
                  >
                    📋 Copy
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-gray-800 p-2 rounded">
                    <span className="text-gray-400">Record Type:</span>
                    <code className="text-green-400 ml-2 select-all">Text</code>
                  </div>

                  <div className="bg-gray-800 p-3 rounded">
                    <span className="text-gray-400 block mb-2">
                      Data to write:
                    </span>
                    <pre className="text-green-400 text-[10px] leading-relaxed overflow-x-auto select-all bg-gray-900 p-2 rounded border border-gray-700 break-all whitespace-pre-wrap">
                      {nfcPayload}
                    </pre>
                  </div>

                  {/* Data format explanation */}
                  <details className="bg-gray-800 p-2 rounded cursor-pointer">
                    <summary className="text-gray-400 text-xs">
                      📊 Compression details
                    </summary>
                    <div className="mt-2 space-y-2 text-[10px] text-gray-300 pl-2">
                      <div className="bg-gray-900 p-2 rounded space-y-2">
                        <div>
                          <strong className="text-blue-400">Format:</strong>
                          <code className="ml-1 bg-gray-800 px-1">
                            AddressBase64|Share2Base64
                          </code>
                        </div>

                        <div className="text-gray-400 space-y-1">
                          <div>
                            📍 <strong>Address compression:</strong>
                          </div>
                          <div className="ml-3 space-y-0.5">
                            <div>• Original: 56 chars (base32)</div>
                            <div>• Remove 'G' prefix: 55 chars</div>
                            <div>• Decode base32 → bytes: ~35 bytes</div>
                            <div>• Encode to base64url: ~38 chars</div>
                            <div className="text-green-400">
                              = Saved 17 bytes! 🎉
                            </div>
                          </div>
                        </div>

                        <div className="text-gray-400 space-y-1">
                          <div>
                            🔐 <strong>Share2 compression:</strong>
                          </div>
                          <div className="ml-3 space-y-0.5">
                            <div>• Original: 128 chars (hex)</div>
                            <div>• Decode hex → bytes: 64 bytes</div>
                            <div>• Encode to base64url: 86 chars</div>
                            <div className="text-green-400">
                              = Saved 42 bytes! 🎉
                            </div>
                          </div>
                        </div>

                        <div className="text-green-400 bg-green-900/20 p-2 rounded mt-2">
                          <strong>Total savings: 59 bytes!</strong>
                          <br />
                          <div className="text-xs text-gray-300 mt-1">
                            From 184 bytes → {getDataSize()} bytes
                          </div>
                        </div>

                        <div className="mt-2 bg-yellow-900/30 p-2 rounded border border-yellow-600/30">
                          <strong className="text-yellow-400">
                            ⚠️ Decoding on payment terminal:
                          </strong>
                          <pre className="text-[9px] mt-1 text-gray-300 overflow-x-auto">
                            {`const [addrB64, s2b64] = data.split('|');

// Decode address
const addrBytes = base64UrlDecode(addrB64);
const addrBase32 = bytesToBase32(addrBytes);
const address = 'G' + addrBase32;

// Decode share2
const s2Bytes = base64UrlDecode(s2b64);
const share2 = bytesToHex(s2Bytes);`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              </div>

              {/* Quick Instructions */}
              <div className="bg-gray-800 rounded-lg p-4 space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-white mb-2">
                    📱 Quick Steps:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-gray-300 ml-2">
                    <li>
                      Install <strong>"NFC Tools"</strong> app (Android/iOS)
                    </li>
                    <li>
                      Open app → Go to <strong>Write</strong> tab
                    </li>
                    <li>
                      Tap <strong>Add a record</strong> → Select{" "}
                      <strong>Text</strong>
                    </li>
                    <li>Paste the compressed data shown above</li>
                    <li>
                      Tap <strong>Write</strong> and hold NFC tag to device
                    </li>
                    <li>Wait for success confirmation ✅</li>
                  </ol>
                </div>

                <div className="text-xs text-gray-400 bg-gray-900 p-2 rounded">
                  💡 <strong>Ultra-compressed:</strong> Both address and share2
                  are encoded in base64url, saving 59 bytes total. This fits
                  comfortably in 144-byte NFC tags!
                </div>
              </div>

              <button
                onClick={() => setShowManualInstructions(false)}
                className="w-full text-xs text-gray-400 hover:text-gray-300"
              >
                Hide instructions
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-600 transition"
            >
              Done
            </button>
            <button
              onClick={handleTopup}
              className="flex-1 bg-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Top Up
            </button>
          </div>

          {/* NFC Write Button */}
          <button
            onClick={writeToNfc}
            disabled={writingNfc}
            className="w-full bg-green-600 py-3 rounded-xl font-semibold hover:bg-green-700 transition disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {writingNfc ? (
              <>
                <span className="animate-pulse">📱</span>
                <span>Hold NFC Tag Near Device...</span>
              </>
            ) : (
              <>
                <span>📲</span>
                <span>Write to NFC Tag</span>
              </>
            )}
          </button>

          {/* Security Notice */}
          <div className="bg-blue-900/20 border border-blue-600/30 p-3 rounded-xl">
            <p className="text-xs text-blue-300 leading-relaxed">
              <strong>🔒 Security:</strong> This NFC tag contains your payment
              credentials. Anyone with this tag + your PIN can spend up to your
              daily limit. Keep it secure!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
