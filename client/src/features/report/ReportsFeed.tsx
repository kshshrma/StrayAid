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

  return (
    <div className="min-h-screen bg-slate-100 p-5 pb-24">
      <h1 className="mb-6 text-center text-4xl font-bold">
        🐾 Rescue Feed
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
              <div className="rounded-2xl bg-white p-4 shadow transition hover:shadow-lg">
                <img
                  src={report.image_url}
                  alt="Animal"
                  className="mb-4 h-64 w-full rounded-xl object-cover"
                />

                <p className="mb-2">
                  📍 <strong>Latitude:</strong>{" "}
                  {report.latitude}
                </p>

                <p className="mb-2">
                  📍 <strong>Longitude:</strong>{" "}
                  {report.longitude}
                </p>

                <p className="mb-2">
                  🚨 <strong>Status:</strong>{" "}
                  <span
                    className={
                      report.status === "Accepted"
                        ? "font-semibold text-green-600"
                        : "font-semibold text-orange-600"
                    }
                  >
                    {report.status}
                  </span>
                </p>

                <p className="text-gray-500">
                  Reported on{" "}
                  {new Date(
                    report.created_at
                  ).toLocaleString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}