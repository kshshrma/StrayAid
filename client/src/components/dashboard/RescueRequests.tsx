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

  async function loadReports(currentGuardianId: string | null) {
    try {
      const data = await getRecentReports();
      const rawReports: Report[] = data || [];

      // Sort reports:
      // 1. Pushes assignments accepted by the logged-in Guardian to the bottom
      // 2. Sorts critical reports to the top
      // 3. Defaults to sorting by newest first
      const sorted = [...rawReports].sort((a, b) => {
        const aMyAccepted = currentGuardianId && a.assigned_guardian_id === currentGuardianId;
        const bMyAccepted = currentGuardianId && b.assigned_guardian_id === currentGuardianId;

        if (aMyAccepted && !bMyAccepted) return 1;
        if (!aMyAccepted && bMyAccepted) return -1;
        if (aMyAccepted && bMyAccepted) return 0;

        const aCritical = a.severity === "Critical";
        const bCritical = b.severity === "Critical";

        if (aCritical && !bCritical) return -1;
        if (!aCritical && bCritical) return 1;

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setReports(sorted);
    } catch (err) {
      console.error("Failed to load dashboard rescue requests:", err);
    }
  }

  useEffect(() => {
    async function init() {
      try {
        let activeGuardianId: string | null = null;
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: guardian } = await supabase
            .from("guardians")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (guardian) {
            activeGuardianId = guardian.id;
            setGuardianId(guardian.id);
          }
        }
        loadReports(activeGuardianId);
      } catch (err) {
        console.error("Failed to load user session in RescueRequests:", err);
        loadReports(null);
      }
    }

    init();

    // Subscribe to reports updates in real-time
    const channel = supabase
      .channel("public:reports:dashboard:list")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        // Retrieve session and reload
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            supabase
              .from("guardians")
              .select("id")
              .eq("user_id", session.user.id)
              .maybeSingle()
              .then(({ data: guardian }) => {
                loadReports(guardian?.id ?? null);
              });
          } else {
            loadReports(null);
          }
        });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <Card>
      <h2 className="text-xl font-bold text-slate-800">
        🚨 Rescue Requests
      </h2>

      <div className="mt-5 space-y-4">

        {reports.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No rescue requests.
          </p>
        ) : (
          reports.map((report) => {
            const isGreyed = !!(guardianId && report.assigned_guardian_id === guardianId);

            return (
              <Link to={`/reports/${report.id}`} key={report.id} className="block">
                <RescueRequestCard
                  animal={report.animal_type}
                  severity={report.severity}
                  time={new Date(report.created_at).toLocaleString()}
                  greyed={isGreyed}
                />
              </Link>
            );
          })
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