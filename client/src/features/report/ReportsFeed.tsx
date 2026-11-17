import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getReports } from "../../services/report/getReports";
import { subscribeReports } from "../../services/report/subscribeReports";
import { supabase } from "../../lib/supabase";

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
  assigned_guardian_id?: string | null;
}

export default function ReportsFeed() {
  const [reports, setReports] = useState<Report[]>([]);
  const [guardianId, setGuardianId] = useState<string | null>(null);

  useEffect(() => {
    async function loadGuardian() {
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
    loadGuardian();
  }, []);

  function getPriorityWeight(report: Report) {
    const priority = (report.priority || "").toLowerCase();
    const severity = (report.severity || "").toLowerCase();

    if (severity === "critical" || priority === "emergency") return 1;
    if (severity === "high" || priority === "urgent") return 2;
    if (severity === "medium") return 3;
    return 4;
  }

  async function loadReports() {
    try {
      const data = await getReports();

      // Only pending (unclaimed) reports: accepted rescues are removed and visible only in Lives Saved
      const visible = (data || []).filter((report: any) => {
        const s = (report.status || "").toLowerCase();
        return s === "pending";
      });

      const sorted = visible.sort((a: Report, b: Report) => {
        const weightA = getPriorityWeight(a);
        const weightB = getPriorityWeight(b);

        if (weightA !== weightB) {
          return weightA - weightB;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setReports(sorted);
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
  }, [guardianId]);

  function severityColor(severity: string) {
    const s = (severity || "").toLowerCase();
    switch (s) {
      case "critical":
        return "bg-red-600";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-green-600";
    }
  }

  function priorityColor(priority: string) {
    const p = (priority || "").toLowerCase();
    switch (p) {
      case "emergency":
        return "bg-red-600";
      case "urgent":
        return "bg-orange-500";
      default:
        return "bg-blue-600";
    }
  }

  function formatAdvice(aiAdvice: string) {
    if (!aiAdvice) return "No advice provided";
    try {
      if (aiAdvice.trim().startsWith("{")) {
        const parsed = JSON.parse(aiAdvice);
        return `Rescue: ${parsed.rescueType?.replace(/_/g, " ") || "Emergency"} • NGO: ${parsed.ngoName || "Dispatched"}`;
      }
    } catch (e) {
      // Ignore
    }
    return aiAdvice;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-5 pb-24">
      <h1 className="mb-6 text-center text-4xl font-extrabold text-slate-900 tracking-tight">
        🐾 Live Rescue Feed
      </h1>

      {reports.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow">
          No rescue reports available.
        </div>
      ) : (
        <div className="space-y-6 max-w-lg mx-auto">
          {reports.map((report) => {
            const statusLower = (report.status || "").toLowerCase();
            return (
              <Link
                key={report.id}
                to={`/reports/${report.id}`}
                className="block"
              >
                <div className="overflow-hidden rounded-2xl bg-white shadow-lg transition hover:shadow-xl relative border border-slate-100">
                  {report.image_url && (
                    <img
                      src={report.image_url}
                      alt="Animal"
                      className="h-64 w-full object-cover"
                    />
                  )}

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
                        Severity: {report.severity}
                      </span>
                    </div>

                    <span
                      className={`inline-block rounded-full px-3 py-1 text-sm font-semibold text-white ${priorityColor(
                        report.priority
                      )}`}
                    >
                      Priority: {report.priority}
                    </span>

                    <div className="mt-4 rounded-xl bg-slate-100 p-4">
                      <p className="font-semibold text-sm text-slate-800">
                        🤖 AI Advice
                      </p>

                      <p className="mt-2 text-sm text-gray-700">
                        {formatAdvice(report.ai_advice)}
                      </p>
                    </div>

                    <div className="mt-4 text-xs text-gray-400">
                      📍 {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                    </div>

                    <div className="mt-2 text-xs text-gray-400">
                      🕒 {new Date(report.created_at).toLocaleString()}
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <span
                        className={`font-semibold capitalize text-sm ${
                          statusLower === "accepted" ||
                          statusLower === "enroute" ||
                          statusLower === "rescued" ||
                          statusLower === "completed"
                            ? "text-green-600"
                            : "text-orange-600"
                        }`}
                      >
                        {report.status}
                      </span>

                      <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
