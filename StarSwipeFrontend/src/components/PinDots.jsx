export default function PinDots({ length }) {
  return (
    <div className="flex justify-center gap-3 my-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={`h-4 w-4 rounded-full border ${
            i < length ? "bg-blue-600" : "bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}
