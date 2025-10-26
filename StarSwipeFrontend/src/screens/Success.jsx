import { useNavigate } from "react-router-dom";

const CheckCircleIcon = () => (
  <div className="w-28 h-28 rounded-full bg-green-100 flex items-center justify-center">
    <svg
      className="w-16 h-16 text-green-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  </div>
);

export default function Success({ amount, vendorName }) {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white px-6">
      
      {/* Main Card */}
      <div className="flex flex-col items-center p-6 bg-gray-900 rounded-2xl shadow-lg w-full max-w-sm">
        <CheckCircleIcon />

        <h1 className="text-3xl font-semibold text-white mt-6">
          Payment Successful!
        </h1>

        <p className="text-base text-gray-300 mt-2 text-center">
          Your transaction has been completed successfully.
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

        {/* Done Button */}
        <button
          onClick={() => navigate("/")}
          className="mt-8 w-full bg-green-600 py-4 rounded-full text-lg font-semibold shadow-md hover:bg-green-700 active:bg-green-800 transition duration-150"
        >
          Done
        </button>
      </div>
    </div>
  );
}
