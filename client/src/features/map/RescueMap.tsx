import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";
import { Link } from "react-router-dom";
import { getReports } from "../../services/report/getReports";

interface Report {
  id: string;
  image_url: string;
  latitude: number;
  longitude: number;
  status: string;
}

export default function RescueMap() {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    async function loadReports() {
      try {
        const data = await getReports();

        console.log("Reports:", data);

        setReports(data || []);
      } catch (error) {
        console.error("Error loading reports:", error);
      }
    }

    loadReports();
  }, []);

  console.log("State:", reports);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 1000,
          background: "white",
          padding: "10px",
          borderRadius: "8px",
          fontWeight: "bold",
        }}
      >
        Reports Loaded: {reports.length}
      </div>

      <MapContainer
        center={[28.6139, 77.209]}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.latitude, report.longitude]}
          >
            <Popup>
              <div>
                <h3>Animal Rescue</h3>

                <p>
                  <strong>Status:</strong> {report.status}
                </p>

                <p>
                  <strong>Latitude:</strong> {report.latitude}
                </p>

                <p>
                  <strong>Longitude:</strong> {report.longitude}
                </p>

                <Link to={`/reports/${report.id}`}>
                  View Report
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}