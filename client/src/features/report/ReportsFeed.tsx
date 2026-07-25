import { useEffect, useState } from "react";
import { getReports } from "../../services/report/getReports";

interface Report {
  id: string;
  image_url: string;
  latitude: number;
  longitude: number;
  status: string;
}

export default function ReportsFeed() {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    async function loadReports() {
      try {
        const data = await getReports();
        setReports(data || []);
      } catch (error) {
        console.error(error);
      }
    }

    loadReports();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-5">
      <h1 className="mb-6 text-3xl font-bold">
        Rescue Feed
      </h1>

      <div className="space-y-5">
        {reports.map((report) => (
          <div
            key={report.id}
            className="rounded-2xl bg-white p-4 shadow"
          >
            <img
              src={report.image_url}
              alt="Animal"
              className="mb-3 h-56 w-full rounded-xl object-cover"
            />

            <p>
              <strong>Latitude:</strong> {report.latitude}
            </p>

            <p>
              <strong>Longitude:</strong> {report.longitude}
            </p>

            <p className="mt-2">
              <strong>Status:</strong> {report.status}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}