import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  Polyline,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Link } from "react-router-dom";
import L from "leaflet";

import { getReports } from "../../services/report/getReports";
import { subscribeReports } from "../../services/report/subscribeReports";
import { supabase } from "../../lib/supabase";

import {
  criticalMarker,
  highMarker,
  mediumMarker,
  lowMarker,
  guardianMarker,
  meMarker,
} from "./icons/markerIcons";

// Default Leaflet Icons
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
    map.flyTo(center, 14);
  }, [center, map]);

  return null;
}

export default function RescueMap() {
  const [reports, setReports] = useState<Report[]>([]);
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [onlineGuardians, setOnlineGuardians] = useState<any[]>([]);
  const [activeRoute, setActiveRoute] = useState<[number, number][] | null>(null);

  async function loadReports() {
    try {
      const data = await getReports();
      setReports(data || []);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadOnlineGuardians() {
    try {
      const { data, error } = await supabase
        .from("guardians")
        .select("id, latitude, longitude, available, user_id")
        .eq("available", true)
        .eq("is_verified", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (error) throw error;
      setOnlineGuardians(data || []);
    } catch (error) {
      console.error("Failed to load online guardians:", error);
    }
  }

  async function loadActiveRoute(guardianId: string, currentCoords: [number, number]) {
    try {
      const { data: assignments, error } = await supabase
        .from("rescue_assignments")
        .select("report_id")
        .eq("guardian_id", guardianId)
        .in("status", ["accepted", "enroute", "rescued"]);

      if (error) throw error;

      if (assignments && assignments.length > 0) {
        const activeReportId = assignments[0].report_id;
        const { data: report, error: reportErr } = await supabase
          .from("reports")
          .select("latitude, longitude")
          .eq("id", activeReportId)
          .single();

        if (reportErr) throw reportErr;

        if (report) {
          setActiveRoute([
            currentCoords,
            [report.latitude, report.longitude],
          ]);
        } else {
          setActiveRoute(null);
        }
      } else {
        setActiveRoute(null);
      }
    } catch (error) {
      console.error("Failed to load active route:", error);
      setActiveRoute(null);
    }
  }

  useEffect(() => {
    loadReports();
    loadOnlineGuardians();

    const reportChannel = subscribeReports(() => {
      loadReports();
    });

    const assignmentsChannel = supabase
      .channel("public:rescue_assignments")
      .on("postgres_changes", { event: "*", schema: "public", table: "rescue_assignments" }, () => {
        loadOnlineGuardians();
        if (myLocation) {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              supabase
                .from("guardians")
                .select("id")
                .eq("user_id", session.user.id)
                .maybeSingle()
                .then(({ data: guardian }) => {
                  if (guardian) {
                    loadActiveRoute(guardian.id, myLocation);
                  }
                });
            }
          });
        }
      })
      .subscribe();

    const guardiansChannel = supabase
      .channel("public:guardians")
      .on("postgres_changes", { event: "*", schema: "public", table: "guardians" }, () => {
        loadOnlineGuardians();
      })
      .subscribe();

    return () => {
      reportChannel.unsubscribe();
      assignmentsChannel.unsubscribe();
      guardiansChannel.unsubscribe();
    };
  }, [myLocation]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          setMyLocation(coords);

          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: guardian } = await supabase
              .from("guardians")
              .select("id")
              .eq("user_id", session.user.id)
              .maybeSingle();

            if (guardian) {
              loadActiveRoute(guardian.id, coords);
            }
          }
        },
        (error) => {
          console.error("Error getting user location:", error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const center = useMemo<[number, number]>(() => {
    if (myLocation) {
      return myLocation;
    }
    if (reports.length > 0) {
      return [
        reports[0].latitude,
        reports[0].longitude,
      ];
    }

    return [28.6139, 77.209];
  }, [myLocation, reports]);

  const markers = useMemo(() => {
    return reports.map((report) => {
      let icon = lowMarker;
      if (report.severity === "Critical") icon = criticalMarker;
      else if (report.severity === "High") icon = highMarker;
      else if (report.severity === "Medium") icon = mediumMarker;

      return { report, icon };
    });
  }, [reports]);

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

  function statusBadge(status: string) {
    return status === "Accepted" || status === "accepted" || status === "enroute" || status === "rescued" || status === "completed"
      ? "bg-green-600"
      : "bg-orange-500";
  }

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MapContainer
        center={center}
        zoom={14}
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        <ChangeMapView center={center} />

        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Current user marker */}
        {myLocation && (
          <Marker position={myLocation} icon={meMarker}>
            <Popup>
              <div className="text-center font-semibold">📍 You are here</div>
            </Popup>
          </Marker>
        )}

        {/* Online Guardians */}
        {onlineGuardians.map((g) => {
          // Prevent overlapping current user location pin
          const isSelf =
            myLocation &&
            Math.abs(g.latitude - myLocation[0]) < 0.0001 &&
            Math.abs(g.longitude - myLocation[1]) < 0.0001;
          if (isSelf) return null;

          return (
            <Marker key={g.id} position={[g.latitude, g.longitude]} icon={guardianMarker}>
              <Popup>
                <div className="space-y-1 p-1">
                  <h3 className="font-bold text-blue-600">🛡️ Active Guardian</h3>
                  <p className="text-xs text-slate-500">Available & Verified</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Active Route Polyline overlay */}
        {activeRoute && (
          <Polyline
            positions={activeRoute}
            pathOptions={{ color: "#2563eb", weight: 5, dashArray: "8, 12", lineCap: "round" }}
          />
        )}

        <MarkerClusterGroup>
          {markers.map(({ report, icon }) => (
            <Marker
              key={report.id}
              position={[
                report.latitude,
                report.longitude,
              ]}
              icon={icon}
            >
              <Popup>
                <div className="w-64 space-y-4">
                  {report.image_url && (
                    <img
                      src={report.image_url}
                      alt={report.animal_type || "Reported animal"}
                      className="h-40 w-full rounded-xl object-cover"
                    />
                  )}

                  <div>
                    <h2 className="text-xl font-bold">
                      🐾 {report.animal_type || "Unknown Animal"}
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-2">
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

                  {report.ai_advice && (
                    <div className="rounded-lg bg-slate-100 p-3">
                      <h3 className="font-semibold text-sm">🤖 AI Advice</h3>
                      <p className="mt-1 text-xs text-gray-700">
                        {report.ai_advice}
                      </p>
                    </div>
                  )}

                  <div>
                    <strong>Status:</strong>
                    <span
                      className={`ml-2 rounded-full px-3 py-1 text-xs font-semibold text-white ${statusBadge(
                        report.status
                      )}`}
                    >
                      {report.status}
                    </span>
                  </div>

                  <div className="text-xs text-gray-400">
                    Reported: {new Date(report.created_at).toLocaleString()}
                  </div>

                  <Link
                    to={`/reports/${report.id}`}
                    className="block rounded-xl bg-green-600 py-2.5 text-center font-semibold text-white transition hover:bg-green-700"
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