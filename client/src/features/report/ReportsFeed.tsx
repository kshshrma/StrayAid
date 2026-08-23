import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

export default function ReportsFeed() {
  const [reports, setReports] = useState<Report[]>([]);

  function getPriorityWeight(report: Report) {
    const status = (report.status || "").toLowerCase();
    const severity = (report.severity || "").toLowerCase();
    const priority = (report.priority || "").toLowerCase();

    // 1. Accepted/Claimed ones go to the very bottom
    const isClaimed =
      status === "accepted" ||
      status === "enroute" ||
      status === "rescued" ||
      status === "completed";

    if (isClaimed) {
      return -100; // negative weight to push to the bottom
    }

    // 2. Urgent priority/severity
    const isUrgent =
      severity === "critical" ||
      severity === "high" ||
      priority === "emergency" ||
      priority === "urgent";

    if (isUrgent) {
      return 2;
    }

    // 3. Medium severity
    if (severity === "medium") {
      return 1;
    }

    return 0; // Low or default
  }

  async function loadReports() {
    try {
      const data = await getReports();
      const sorted = (data || []).sort((a: Report, b: Report) => {
        const weightA = getPriorityWeight(a);
        const weightB = getPriorityWeight(b);

        if (weightA !== weightB) {
          return weightB - weightA; // Higher weight first
        }
        // Secondary sorting by created_at descending (most recent first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setReports(sorted);
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

  function severityColor(severity: string) {
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

  function priorityColor(priority: string) {
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
    <div className="min-h-screen bg-slate-100 p-5 pb-24">
      <h1 className="mb-6 text-center text-4xl font-extrabold text-slate-900 tracking-tight">
        🐾 Live Rescue Feed
      </h1>

      {reports.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow">
          No rescue reports available.
        </div>
      ) : (
        <div className="space-y-6 max-w-lg mx-auto">
          {reports.map((report) => {
            const statusLower = (report.status || "").toLowerCase();
            const isClaimed =
              statusLower === "accepted" ||
              statusLower === "enroute" ||
              statusLower === "rescued" ||
              statusLower === "completed";

            return (
              <Link
                key={report.id}
                to={`/reports/${report.id}`}
                className="block"
              >
                <div
                  className={`overflow-hidden rounded-2xl bg-white shadow-lg transition hover:shadow-xl relative ${
                    isClaimed ? "opacity-60 bg-slate-100" : ""
                  }`}
                >
                  {/* Gray translucent overlay cover for claimed requests */}
                  {isClaimed && (
                    <div className="absolute inset-0 bg-slate-900/10 pointer-events-none z-10 flex items-center justify-center backdrop-blur-[0.5px]">
                      <span className="rounded-xl bg-slate-800/90 px-4.5 py-2 text-xs font-bold text-white uppercase tracking-wider shadow-md border border-slate-600 flex items-center gap-1.5">
                        🔒 Claimed Rescue ({report.status})
                      </span>
                    </div>
                  )}

                  <img
                    src={report.image_url}
                    alt="Animal"
                    className="h-64 w-full object-cover"
                  />

                  <div className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-2xl font-bold">
                        🐾 {report.animal_type || "Analyzing..."}
                      </h2>

                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold text-white ${severityColor(
                          report.severity
                        )}`}
                      >
                        {report.severity}
                      </span>
                    </div>

                    <span
                      className={`inline-block rounded-full px-3 py-1 text-sm font-semibold text-white ${priorityColor(
                        report.priority
                      )}`}
                    >
                      {report.priority}
                    </span>

                    <div className="mt-4 rounded-xl bg-slate-100 p-4">
                      <p className="font-semibold text-sm text-slate-800">
                        🤖 AI Advice
                      </p>

                      <p className="mt-2 text-sm text-gray-700">
                        {report.ai_advice}
                      </p>
                    </div>

                    <div className="mt-4 text-xs text-gray-400">
                      📍 {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                    </div>

                    <div className="mt-2 text-xs text-gray-400">
                      🕒 {new Date(report.created_at).toLocaleString()}
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <span
                        className={`font-semibold capitalize text-sm ${
                          statusLower === "accepted" ||
                          statusLower === "enroute" ||
                          statusLower === "rescued" ||
                          statusLower === "completed"
                            ? "text-green-600"
                            : "text-orange-600"
                        }`}
                      >
                        {report.status}
                      </span>

                      <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}