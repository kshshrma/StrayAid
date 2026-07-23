interface LocationCardProps {
  latitude: number | null;
  longitude: number | null;
  setLatitude: React.Dispatch<React.SetStateAction<number | null>>;
  setLongitude: React.Dispatch<React.SetStateAction<number | null>>;
}

export default function LocationCard({
  latitude,
  longitude,
  setLatitude,
  setLongitude,
}: LocationCardProps) {
  function getLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
      },
      (error) => {
        alert(error.message);
      }
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <h2 className="mb-4 text-xl font-semibold">
        Current Location
      </h2>

      <p>Latitude: {latitude ?? "--"}</p>

      <p>Longitude: {longitude ?? "--"}</p>

      <button
        onClick={getLocation}
        className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-white hover:bg-blue-700"
      >
        Get Current Location
      </button>
    </div>
  );
}