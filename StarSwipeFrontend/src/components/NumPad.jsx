const keys = ["1","2","3","4","5","6","7","8","9","0","⌫"];

export default function NumPad({ onPress }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => onPress(key)}
          className="
            bg-gray-700 text-white text-xl font-semibold
            rounded-full h-20 w-20
            flex items-center justify-center
            shadow-md
            hover:bg-gray-600
            active:bg-gray-800
            transition-colors duration-150
          "
        >
          {key}
        </button>
      ))}
    </div>
  );
}
