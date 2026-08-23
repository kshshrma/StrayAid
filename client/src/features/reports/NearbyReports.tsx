import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { getNearbyReports } from "../../services/report/getNearbyReports";

interface Report {
  id: string;
  image_url: string;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
  animal_type: string;
  severity: string;
  priority: string;
  ai_advice: string;
  assigned_guardian_id: string | null;
  distance_km: number;
}

export default function NearbyReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadNearby(lat: number | null, lon: number | null) {
    try {
      setLoading(true);
      setError(null);
      const data = await getNearbyReports(lat, lon, 10);
      setReports(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load nearby reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Acquire browser coordinates on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          loadNearby(position.coords.latitude, position.coords.longitude);
        },
        (err) => {
          console.warn("Dashboard location capture failed:", err.message);
          // If location is denied or fails, trigger loading without params.
          // The backend will check if user has a Guardian profile with coords.
          loadNearby(null, null);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      loadNearby(null, null);
    }
  }, []);

  function severityColor(severity: string) {
    const s = (severity || "").toLowerCase();
    switch (s) {
      case "critical":
        return "bg-red-100 text-red-700 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-green-100 text-green-700 border-green-200";
    }
  }

  function priorityColor(priority: string) {
    const p = (priority || "").toLowerCase();
    switch (p) {
      case "emergency":
        return "bg-red-600 text-white";
      case "urgent":
        return "bg-orange-500 text-white";
      default:
        return "bg-blue-600 text-white";
    }
  }

  return (
    <Card className="border border-blue-100/50 bg-white/80 backdrop-blur-md shadow-lg rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span className="text-blue-500">📍</span> Nearby Reports
        </h2>
        <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
          Within 10 km
        </span>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-gray-500 gap-2">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
          <p className="text-sm font-medium">Loading nearby reports...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-100 text-center flex flex-col items-center gap-3">
          <p className="text-amber-800 text-sm font-medium">
            ⚠️ {error.includes("authenticated") || error.includes("session") ? "Please sign in to view nearby reports." : error}
          </p>
          {(error.includes("authenticated") || error.includes("session")) ? (
            <Link to="/login">
              <Button className="py-1.5 px-4 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold">
                Sign In
              </Button>
            </Link>
          ) : (
            <p className="text-xs text-amber-600">
              Make sure browser location permissions are enabled, or update your Guardian profile coordinates.
            </p>
          )}
        </div>
      ) : reports.length === 0 ? (
        <div className="py-10 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
            📍
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">No nearby reports</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              No active animal rescue reports were found within 10 km.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex flex-col md:flex-row gap-4 p-4 rounded-2xl border border-slate-100 hover:border-slate-200/80 bg-white hover:bg-slate-50/50 transition-all shadow-sm"
            >
              {report.image_url && (
                <img
                  src={report.image_url}
                  alt="Animal"
                  className="w-full md:w-32 h-32 object-cover rounded-xl shadow-inner"
                />
              )}

              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <h4 className="font-bold text-slate-900 text-lg">
                      🐾 {report.animal_type || "Unknown Animal"}
                    </h4>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                      🚀 {report.distance_km} km away
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`border px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${severityColor(report.severity)}`}>
                      Severity: {report.severity}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${priorityColor(report.priority)}`}>
                      Priority: {report.priority}
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
                      {report.status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400">
                    Reported: {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 flex flex-wrap gap-3 items-center justify-between">
                  <div className="text-xs text-gray-500 font-medium">
                    📍 Lat: {report.latitude.toFixed(4)}, Lng: {report.longitude.toFixed(4)}
                  </div>

                  <div className="flex gap-2">
                    <Link to={`/reports/${report.id}`}>
                      <Button className="py-1 px-3.5 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg">
                        View Report
                      </Button>
                    </Link>
                    <Link to={`/map?lat=${report.latitude}&lng=${report.longitude}`}>
                      <Button className="py-1 px-3.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg">
                        View on Map
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
