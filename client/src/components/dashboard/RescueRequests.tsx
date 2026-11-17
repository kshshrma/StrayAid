import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Card from "../ui/Card";
import Button from "../ui/Button";
import RescueRequestCard from "./RescueRequestCard";

import { getRecentReports } from "../../services/report/getRecentReports";
import { subscribeReports } from "../../services/report/subscribeReports";
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
      
      // Filter reports: only pending rescue requests (accepted ones go to Lives Saved)
      const filtered = (data || []).filter((report: any) => {
        const s = (report.status || "").toLowerCase();
        return s === "pending";
      });

      // Sort reports: priority wise, then newest first
      const sorted = filtered.sort((a: any, b: any) => {
        const weightA = getSeverityWeight(a.severity);
        const weightB = getSeverityWeight(b);

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

  // Reload reports when guardianId is set or loaded, and listen for live updates
  useEffect(() => {
    loadReports();

    const channel = subscribeReports(() => {
      loadReports();
    });

    return () => {
      channel.unsubscribe();
    };
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
            <Link key={report.id} to={`/reports/${report.id}`} className="block">
              <RescueRequestCard
                animal={report.animal_type}
                severity={report.severity}
                time={new Date(report.created_at).toLocaleString()}
              />
            </Link>
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