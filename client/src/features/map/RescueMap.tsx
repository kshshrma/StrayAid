import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";
import { Link } from "react-router-dom";
import L from "leaflet";

import { getReports } from "../../services/report/getReports";
import { subscribeReports } from "../../services/report/subscribeReports";

// Fix Leaflet marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Report {
  id: string;
  image_url: string;
  latitude: number;
  longitude: number;
  status: string;
}

export default function RescueMap() {
  const [reports, setReports] = useState<Report[]>([]);

 async function loadReports() {
  try {
    const data = await getReports();

    console.table(
      data?.map((r) => ({
        id: r.id,
        created_at: r.created_at,
        latitude: r.latitude,
        longitude: r.longitude,
        status: r.status,
      }))
    );

    setReports(data || []);
  } catch (error) {
    console.error(error);
  }
}

  useEffect(() => {
    loadReports();

    const channel = subscribeReports(() => {
      loadReports();
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MapContainer
        center={[28.6139, 77.2090]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {reports.map((report, index) => {
            console.log(
           `Report ${index + 1}:`,
            report.id,
            report.latitude,
            report.longitude
         );
          // Temporary offset so markers at the same location don't overlap
          const lat = report.latitude + index * 0.00005;
          const lng = report.longitude + index * 0.00005;

          return (
            <Marker
              key={report.id}
              position={[lat, lng]}
            >
             <Popup>
  <div className="space-y-2">
    <p><strong>ID:</strong> {report.id}</p>

    <p><strong>Created:</strong></p>
    <p>{new Date(report.created_at).toLocaleString()}</p>

    <p><strong>Latitude:</strong> {report.latitude}</p>
    <p><strong>Longitude:</strong> {report.longitude}</p>

    <p>
      <strong>Status:</strong>{" "}
      {report.status}
    </p>

    <Link to={`/reports/${report.id}`}>
      View Report
    </Link>
  </div>
</Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}