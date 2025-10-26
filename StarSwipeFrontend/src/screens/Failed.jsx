import React from 'react';
import { useNavigate } from 'react-router-dom';

// SVG icon with circular background
const XCircleIcon = () => (
  <div className="w-28 h-28 rounded-full bg-red-100 flex items-center justify-center">
    <svg
      className="w-16 h-16 text-red-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  </div>
);

export default function Failed({ amount, vendorName }) {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white px-6">
      
      {/* Main Card */}
      <div className="flex flex-col items-center p-6 bg-gray-900 rounded-2xl shadow-lg w-full max-w-sm">
        <XCircleIcon />

        <h1 className="text-3xl font-semibold text-white mt-6">
          Payment Failed
        </h1>

        <p className="text-base text-gray-300 mt-2 text-center">
          Your transaction could not be completed. Please try again.
        </p>

        {/* Optional Transaction Details */}
        {amount && vendorName && (
          <div className="mt-6 p-4 bg-gray-800 rounded-xl w-full border border-gray-700">
            <div className="flex justify-between text-gray-300">
              <span>Amount</span>
              <span className="font-semibold text-white">₹{amount}</span>
            </div>
            <div className="flex justify-between text-gray-300 mt-2">
              <span>To</span>
              <span className="font-semibold text-white truncate">{vendorName}</span>
            </div>
          </div>
        )}

        {/* Try Again Button */}
        <button
          onClick={() => navigate("/")}
          className="mt-8 w-full bg-red-600 py-4 rounded-full text-lg font-semibold shadow-md hover:bg-red-700 active:bg-red-800 transition duration-150"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
