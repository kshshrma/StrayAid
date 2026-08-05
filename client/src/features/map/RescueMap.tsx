import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import {
  criticalMarker,
  highMarker,
  mediumMarker,
  lowMarker,
} from "./icons/markerIcons";
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
function markerBySeverity(severity: string) {
  switch (severity) {
    case "Critical":
      return criticalMarker;

    case "High":
      return highMarker;

    case "Medium":
      return mediumMarker;

    default:
      return lowMarker;
  }
}
function ChangeMapView({
  center,
}: {
  center: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, 16);
  }, [center, map]);

  return null;
}

export default function RescueMap() {
  const [reports, setReports] = useState<Report[]>([]);

  async function loadReports() {
    try {
      const data = await getReports();
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

    // Default: New Delhi
    return [28.6139, 77.2090];
  }, [reports]);

  function statusBadge(status: string) {
    if (status === "Accepted") {
      return "bg-green-600";
    }

    return "bg-orange-500";
  }

  function severityBadge(severity: string) {
    switch (severity) {
      case "Critical":
        return "bg-red-600";

      case "High":
        return "bg-orange-500";

      case "Medium":
        return "bg-yellow-500";

      default:
        return "bg-green-600";
    }
  }

  function priorityBadge(priority: string) {
    switch (priority) {
      case "Emergency":
        return "bg-red-600";

      case "Urgent":
        return "bg-orange-500";

      default:
        return "bg-blue-600";
    }
  }

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MapContainer
        center={center}
        zoom={16}
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
            >
              <Popup>
                <div className="w-64 space-y-4">

                  <img
                    src={report.image_url}
                    alt="Animal"
                    className="h-40 w-full rounded-xl object-cover"
                  />

                  <h2 className="text-xl font-bold">
                    🐾 {report.animal_type || "Unknown Animal"}
                  </h2>

                  <div className="flex gap-2 flex-wrap">

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${severityBadge(
                        report.severity
                      )}`}
                    >
                      {report.severity}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${priorityBadge(
                        report.priority
                      )}`}
                    >
                      {report.priority}
                    </span>

                  </div>

                  <div className="rounded-lg bg-slate-100 p-3">

                    <h3 className="font-semibold">
                      🤖 AI Advice
                    </h3>

                    <p className="mt-2 text-sm text-gray-700">
                      {report.ai_advice}
                    </p>

                  </div>

                  <div>

                    <strong>Status:</strong>

                    <span
                      className={`ml-2 rounded-full px-2 py-1 text-xs font-semibold text-white ${statusBadge(
                        report.status
                      )}`}
                    >
                      {report.status}
                    </span>

                  </div>

                  <div className="text-sm text-gray-500">
                    Reported
                    <br />
                    {new Date(
                      report.created_at
                    ).toLocaleString()}
                  </div>

                  <Link
                    to={`/reports/${report.id}`}
                    className="block rounded-xl bg-green-600 py-2 text-center font-semibold text-white hover:bg-green-700"
                  >
                    View Full Report
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