import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { getReports } from "../../services/report/getReports";
import { subscribeReports } from "../../services/report/subscribeReports";

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
}

export default function AllReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function getPriorityWeight(report: Report) {
    const status = (report.status || "").toLowerCase();
    const priority = (report.priority || "").toLowerCase();

    // 1. Accepted/Claimed ones go to the very bottom
    const isClaimed =
      status === "accepted" ||
      status === "enroute" ||
      status === "rescued" ||
      status === "completed";

    if (isClaimed) {
      return 100; // Large weight to push to the bottom
    }

    // 2. Sorting unclaimed ones: first normal, then urgent, then emergency
    if (priority === "normal") {
      return 1;
    }
    if (priority === "urgent") {
      return 2;
    }
    if (priority === "emergency") {
      return 3;
    }

    return 4; // Default fallback
  }

  async function loadReports() {
    try {
      setLoading(true);
      setError(null);
      const data = await getReports();
      const sorted = (data || []).sort((a: Report, b: Report) => {
        const weightA = getPriorityWeight(a);
        const weightB = getPriorityWeight(b);

        if (weightA !== weightB) {
          return weightA - weightB; // Sort ascending (1 -> 2 -> 3 -> 100)
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setReports(sorted);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
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

  function severityColor(severity: string) {
    const s = (severity || "").toLowerCase();
    switch (s) {
      case "critical":
        return "bg-red-600";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-green-600";
    }
  }

  function priorityColor(priority: string) {
    const p = (priority || "").toLowerCase();
    switch (p) {
      case "emergency":
        return "bg-red-600";
      case "urgent":
        return "bg-orange-500";
      default:
        return "bg-blue-600";
    }
  }

  return (
    <Card className="p-6 bg-white shadow-lg rounded-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          🐾 All Reports
        </h2>
        <span className="bg-slate-50 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
          Feed Feed
        </span>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-gray-500 gap-2">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
          <p className="text-sm font-medium">Loading reports...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm text-center font-medium">
          ⚠️ {error}
        </div>
      ) : reports.length === 0 ? (
        <div className="py-10 text-center text-gray-500">
          No rescue reports currently submitted.
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => {
            const statusLower = (report.status || "").toLowerCase();
            const isClaimed =
              statusLower === "accepted" ||
              statusLower === "enroute" ||
              statusLower === "rescued" ||
              statusLower === "completed";

            return (
              <div
                key={report.id}
                className={`overflow-hidden rounded-2xl border border-slate-100 bg-white relative transition hover:shadow-md ${
                  isClaimed ? "opacity-50 bg-slate-100/80" : ""
                }`}
              >
                {/* Gray translucent overlay cover for claimed requests */}
                {isClaimed && (
                  <div className="absolute inset-0 bg-slate-800/20 backdrop-blur-[1px] pointer-events-none z-10 flex items-center justify-center">
                    <span className="rounded-2xl bg-slate-900/90 px-6 py-3 text-sm font-black text-white uppercase tracking-widest shadow-xl border border-slate-700">
                      🔒 ACCEPTED RESCUE
                    </span>
                  </div>
                )}

                {report.image_url && (
                  <img
                    src={report.image_url}
                    alt="Animal"
                    className="h-56 w-full object-cover"
                  />
                )}

                <div className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">
                      🐾 {report.animal_type || "Analyzing..."}
                    </h3>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold text-white ${severityColor(
                        report.severity
                      )}`}
                    >
                      Severity: {report.severity}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold text-white ${priorityColor(
                        report.priority
                      )}`}
                    >
                      Priority: {report.priority}
                    </span>

                    <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-1 rounded-full capitalize">
                      {report.status}
                    </span>
                  </div>

                  <div className="mt-3 rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <p className="font-semibold text-xs text-slate-700">🤖 AI Advice</p>
                    <p className="mt-1.5 text-sm text-gray-600 line-clamp-2">{report.ai_advice}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 items-center justify-between text-xs text-gray-400">
                    <span>🕒 {new Date(report.created_at).toLocaleString()}</span>
                    <span>📍 {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <Link to={`/reports/${report.id}`}>
                      <Button className="py-1.5 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                        View Details →
                      </Button>
                    </Link>

                    <Link to={`/map?lat=${report.latitude}&lng=${report.longitude}`}>
                      <Button className="py-1.5 px-4 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg">
                        View on Map
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
