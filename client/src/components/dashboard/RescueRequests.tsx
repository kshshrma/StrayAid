import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Card from "../ui/Card";
import Button from "../ui/Button";
import RescueRequestCard from "./RescueRequestCard";

import { getRecentReports } from "../../services/report/getRecentReports";

interface Report {
  id: string;
  animal_type: string;
  severity: string;
  created_at: string;
}

export default function RescueRequests() {
  const [reports, setReports] = useState<Report[]>([]);

  function getSeverityWeight(severity: string) {
    const s = (severity || "").toLowerCase();
    if (s === "critical") return 3;
    if (s === "high") return 2;
    if (s === "medium") return 1;
    return 0; // Low or undefined
  }

  async function loadReports() {
    try {
      const data = await getRecentReports();
      const sorted = (data || []).sort((a: Report, b: Report) => {
        const weightA = getSeverityWeight(a.severity);
        const weightB = getSeverityWeight(b.severity);

        if (weightA !== weightB) {
          return weightB - weightA; // Sort highest severity weight first
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setReports(sorted);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <Card>
      <h2 className="text-xl font-bold">
        🚨 Rescue Requests
      </h2>

      <div className="mt-5 space-y-4">

        {reports.length === 0 ? (
          <p className="text-gray-500">
            No rescue requests.
          </p>
        ) : (
          reports.map((report) => (
            <RescueRequestCard
              key={report.id}
              animal={report.animal_type}
              severity={report.severity}
              time={new Date(
                report.created_at
              ).toLocaleString()}
            />
          ))
        )}

      </div>

      <Link to="/reports">
        <Button className="mt-6 w-full">
          View All Requests
        </Button>
      </Link>
    </Card>
  );
}