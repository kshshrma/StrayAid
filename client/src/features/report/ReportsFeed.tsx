import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getReports } from "../../services/report/getReports";

interface Report {
  id: string;
  image_url: string;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
}

export default function ReportsFeed() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const data = await getReports();
        setReports(data || []);
      } catch (error) {
        console.error("Failed to load reports:", error);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-xl font-semibold">
        Loading reports...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-5">
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-3xl font-bold text-center">
          🐾 Rescue Feed
        </h1>

        {reports.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow">
            <p className="text-slate-500">
              No rescue reports available.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {reports.map((report) => (
              <Link
                key={report.id}
                to={`/reports/${report.id}`}
                className="block"
              >
                <div className="rounded-2xl bg-white p-4 shadow transition hover:shadow-lg hover:scale-[1.02] pb-24">
                  <img
                    src={report.image_url}
                    alt="Animal"
                    className="mb-4 h-56 w-full rounded-xl object-cover"
                  />

                  <div className="space-y-2">
                    <p>
                      <strong>📍 Latitude:</strong>{" "}
                      {report.latitude}
                    </p>

                    <p>
                      <strong>📍 Longitude:</strong>{" "}
                      {report.longitude}
                    </p>

                    <p>
                      <strong>🚨 Status:</strong>{" "}
                      <span className="font-semibold text-orange-600">
                        {report.status}
                      </span>
                    </p>

                    <p className="text-sm text-gray-500">
                      Reported on{" "}
                      {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}