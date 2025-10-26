import React from "react";

export default function WalletSelectModal({ accounts, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl p-6 w-11/12 max-w-sm shadow-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Select Account</h2>
        <p className="text-gray-300 mb-6 text-sm">
          Multiple accounts detected. Please select which one to use.
        </p>

        <div className="flex flex-col gap-3">
          {accounts.map((acc) => (
            <button
              key={acc}
              onClick={() => onSelect(acc)}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl text-center font-medium transition"
            >
              {acc.slice(0, 6)}...{acc.slice(-4)}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
