import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Link } from "react-router-dom";
import L from "leaflet";

import { getReports } from "../../services/report/getReports";
import { subscribeReports } from "../../services/report/subscribeReports";

// Leaflet marker icons
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

  animal_type: string;
  severity: string;
  priority: string;
  ai_advice: string;

  created_at: string;
}

function ChangeMapView({
  center,
}: {
  center: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, 18);
  }, [center, map]);

  return null;
}

export default function RescueMap() {
  const [reports, setReports] = useState<Report[]>([]);

  async function loadReports() {
    try {
      const data = await getReports();

      console.table(
        data?.map((r) => ({
          id: r.id,
          status: r.status,
          latitude: r.latitude,
          longitude: r.longitude,
          created_at: r.created_at,
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

  const center = useMemo<[number, number]>(() => {
    if (reports.length > 0) {
      return [reports[0].latitude, reports[0].longitude];
    }

    return [28.6139, 77.209];
  }, [reports]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MapContainer
        center={center}
        zoom={18}
        style={{ height: "100%", width: "100%" }}
      >
        <ChangeMapView center={center} />

        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MarkerClusterGroup>
          {reports.map((report) => (
            <Marker
              key={report.id}
              position={[report.latitude, report.longitude]}
              eventHandlers={{
                click: () => {
                  console.log(
                    "Clicked:",
                    report.id,
                    report.created_at
                  );
                },
              }}
            >
              <Popup>
                <div className="w-60 space-y-3">
                  <img
                    src={report.image_url}
                    alt="Animal"
                    className="h-32 w-full rounded-lg object-cover"
                  />

                  <h2 className="text-lg font-bold">
                    🐾 Animal Rescue
                  </h2>

                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      className={
                        report.status === "Accepted"
                          ? "text-green-600 font-semibold"
                          : "text-orange-600 font-semibold"
                      }
                    >
                      {report.status}
                    </span>
                  </p>

                  <p>
                    <strong>Reported:</strong>
                    <br />
                    {new Date(
                      report.created_at
                    ).toLocaleString()}
                  </p>

                  <p>
                    <strong>Latitude:</strong>{" "}
                    {report.latitude}
                  </p>

                  <p>
                    <strong>Longitude:</strong>{" "}
                    {report.longitude}
                  </p>

                  <Link
                    to={`/reports/${report.id}`}
                    className="text-blue-600 underline"
                  >
                    View Report
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}