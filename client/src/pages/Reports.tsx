import { useEffect, useState } from "react";
import { getReports } from "../services/report/getReports";
import ReportCard from "../components/ReportCard";

export default function Reports() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    const data = await getReports();
    setReports(data);
  }

  return (
    <div className="p-5 space-y-4">

      <h1 className="text-3xl font-bold">
        Live Rescue Feed
      </h1>

      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
        />
      ))}

    </div>
  );
}