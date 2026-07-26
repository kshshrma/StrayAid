import { MapContainer, TileLayer } from "react-leaflet";

export default function RescueMap() {
  return (
    <div style={{ height: "100vh", width: "100%", border: "4px solid red" }}>
      <MapContainer
        center={[28.6139, 77.209]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </div>
  );
}