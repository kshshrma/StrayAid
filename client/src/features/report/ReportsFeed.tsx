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
      <h1 className="mb-6 text-center text-4xl font-bold">
        🐾 Live Rescue Feed
      </h1>

      {reports.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow">
          No rescue reports available.
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => (
            <Link
              key={report.id}
              to={`/reports/${report.id}`}
              className="block"
            >
              <div className="overflow-hidden rounded-2xl bg-white shadow-lg transition hover:shadow-xl">

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
                    <p className="font-semibold">
                      🤖 AI Advice
                    </p>

                    <p className="mt-2 text-gray-700">
                      {report.ai_advice}
                    </p>
                  </div>

                  <div className="mt-4 text-sm text-gray-500">
                    📍 {report.latitude.toFixed(5)},{" "}
                    {report.longitude.toFixed(5)}
                  </div>

                  <div className="mt-2 text-sm text-gray-500">
                    🕒{" "}
                    {new Date(
                      report.created_at
                    ).toLocaleString()}
                  </div>

                  <div className="mt-5 flex items-center justify-between">

                    <span
                      className={
                        report.status === "Accepted"
                          ? "font-semibold text-green-600"
                          : "font-semibold text-orange-600"
                      }
                    >
                      {report.status}
                    </span>

                    <button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                      View Details →
                    </button>

                  </div>
                </div>

              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}