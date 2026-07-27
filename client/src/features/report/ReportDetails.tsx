import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getReportById } from "../../services/report/getReportById";
import { acceptReport } from "../../services/report/acceptReport";

interface Report {
  id: string;
  image_url: string;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
}

export default function ReportDetails() {
  const { id } = useParams();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      if (!id) return;

      try {
        const data = await getReportById(id);
        setReport(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [id]);

  async function handleAccept() {
    if (!report) return;

    try {
      const updated = await acceptReport(report.id);
      setReport(updated);
      alert("Rescue accepted successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to accept rescue.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Report not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-5">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-5 shadow-lg">
        <img
          src={report.image_url}
          alt="Animal"
          className="mb-5 h-72 w-full rounded-xl object-cover"
        />

        <h2 className="mb-5 text-2xl font-bold">
          🐾 Animal Rescue Report
        </h2>

        <p className="mb-2">
          <strong>📍 Latitude:</strong> {report.latitude}
        </p>

        <p className="mb-2">
          <strong>📍 Longitude:</strong> {report.longitude}
        </p>

        <p className="mb-4">
          <strong>🚨 Status:</strong>{" "}
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

        <p className="mb-6 text-gray-500">
          Reported on{" "}
          {new Date(report.created_at).toLocaleString()}
        </p>

        {report.status === "Pending" ? (
          <button
            onClick={handleAccept}
            className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
          >
            ✅ Accept Rescue
          </button>
        ) : (
          <button
            disabled
            className="w-full rounded-xl bg-gray-400 py-3 font-semibold text-white"
          >
            Rescue Accepted
          </button>
        )}
      </div>
    </div>
  );
}