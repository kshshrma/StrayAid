import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Card from "../ui/Card";
import Button from "../ui/Button";
import RescueRequestCard from "./RescueRequestCard";

import { getRecentReports } from "../../services/report/getRecentReports";
import { supabase } from "../../lib/supabase";

interface Report {
  id: string;
  animal_type: string;
  severity: string;
  status: string;
  assigned_guardian_id: string | null;
  created_at: string;
}

export default function RescueRequests() {
  const [reports, setReports] = useState<Report[]>([]);
  const [guardianId, setGuardianId] = useState<string | null>(null);

  function getSeverityWeight(severity: string) {
    const s = (severity || "").toLowerCase();
    if (s === "critical") return 3;
    if (s === "high") return 2;
    if (s === "medium") return 1;
    return 0; // Low or undefined
  }

  // Load Guardian profile on mount
  useEffect(() => {
    async function loadGuardianProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: guardian } = await supabase
            .from("guardians")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (guardian) {
            setGuardianId(guardian.id);
          }
        }
      } catch (err) {
        console.error("Error loading guardian profile:", err);
      }
    }
    loadGuardianProfile();
  }, []);

  async function loadReports() {
    try {
      const data = await getRecentReports();
      
      // Filter reports: pending or assigned to this specific Guardian
      const filtered = (data || []).filter((report: any) => {
        const s = (report.status || "").toLowerCase();
        if (s === "pending") return true;
        if (s === "accepted" || s === "enroute" || s === "rescued") {
          return guardianId && report.assigned_guardian_id === guardianId;
        }
        return false;
      });

      // Sort reports: pending first (priority wise), accepted reports last
      const sorted = filtered.sort((a: any, b: any) => {
        const sA = (a.status || "").toLowerCase();
        const sB = (b.status || "").toLowerCase();

        const isAssignedA = sA === "accepted" || sA === "enroute" || sA === "rescued";
        const isAssignedB = sB === "accepted" || sB === "enroute" || sB === "rescued";

        // Keep assigned/accepted rescues at the very end (display last)
        if (isAssignedA && !isAssignedB) return 1;
        if (!isAssignedA && isAssignedB) return -1;

        // Sort pending reports priority-wise
        const weightA = getSeverityWeight(a.severity);
        const weightB = getSeverityWeight(b.severity);

        if (weightA !== weightB) {
          return weightB - weightA;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setReports(sorted);
    } catch (err) {
      console.error(err);
    }
  }

  // Reload reports when guardianId is set or loaded
  useEffect(() => {
    loadReports();
  }, [guardianId]);

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
              time={`${new Date(report.created_at).toLocaleString()}${
                report.assigned_guardian_id === guardianId && report.status !== "pending"
                  ? " (Your Accepted Rescue)"
                  : ""
              }`}
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