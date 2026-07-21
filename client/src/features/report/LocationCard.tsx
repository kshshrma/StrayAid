export default function LocationCard() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow">

      <h2 className="mb-4 text-xl font-semibold">
        Current Location
      </h2>

      <div className="space-y-2">

        <p>Latitude : --</p>

        <p>Longitude : --</p>

      </div>

      <button
        className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-white hover:bg-blue-700"
      >
        Get Current Location
      </button>

    </div>
  );
}