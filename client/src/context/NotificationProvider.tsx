import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getReportById } from "../services/report/getReportById";
import { updateAssignment } from "../services/rescue/updateAssignment";
import type { Report } from "../types/report";

interface IncomingAssignmentData {
  assignment: {
    id: string;
    report_id: string;
    distance_km: number | null;
    dispatch_score: number | null;
  };
  report: Report;
}

const NotificationContext = createContext<any>(null);

export function useNotification() {
  return useContext(NotificationContext);
}

export default function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [incoming, setIncoming] = useState<IncomingAssignmentData | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function initSubscription() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Fetch guardian profile
        const { data: guardian } = await supabase
          .from("guardians")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (guardian) {

          const channel = supabase
            .channel(`realtime:rescue_assignments:${guardian.id}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "rescue_assignments",
                filter: `guardian_id=eq.${guardian.id}`,
              },
              async (payload) => {
                const newAssignment = payload.new as any;
                if (newAssignment && newAssignment.status === "pending") {
                  try {
                    const report = await getReportById(newAssignment.report_id);
                    setIncoming({
                      assignment: newAssignment,
                      report,
                    });
                  } catch (err) {
                    console.error("Failed to load report for real-time notification:", err);
                  }
                }
              }
            )
            .subscribe();

          return () => {
            channel.unsubscribe();
          };
        }
      } catch (err) {
        console.error("Failed to initialize notification subscription:", err);
      }
    }

    initSubscription();

    // Listen to Auth State changes to refresh subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      initSubscription();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleResponse(status: "accepted" | "rejected") {
    if (!incoming) return;
    try {
      setUpdating(true);
      await updateAssignment(incoming.assignment.id, { status });
      setIncoming(null);
      if (status === "accepted") {
        alert("🚒 Rescue request accepted! Please proceed to the location.");
      } else {
        alert("Rescue request rejected.");
      }
    } catch (error) {
      console.error("Failed responding to assignment via notification:", error);
      alert("Failed to respond to rescue assignment.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <NotificationContext.Provider value={{ incoming, setIncoming }}>
      {children}

      {/* Floating Real-time Rescue Request Notification Banner */}
      {incoming && (
        <div className="fixed inset-x-4 top-5 z-50 mx-auto max-w-md animate-bounce rounded-3xl border border-red-100 bg-white/95 p-5 shadow-2xl backdrop-blur-md transition-all md:inset-x-auto md:right-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-2xl animate-pulse">
              🚨
            </div>

            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-base">
                Emergency Rescue Request Assigned!
              </h3>
              
              <p className="mt-1 text-sm font-semibold text-gray-800">
                🐾 {incoming.report.animal_type || "Unknown Animal"}
              </p>

              <div className="mt-2 flex gap-2 flex-wrap">
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600">
                  {incoming.report.severity || "Critical"} Severity
                </span>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                  📍 {incoming.assignment.distance_km ?? "Unknown"} km away
                </span>
              </div>

              {incoming.report.ai_advice && (
                <p className="mt-2 text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">
                  "{incoming.report.ai_advice}"
                </p>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleResponse("rejected")}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Decline
                </button>
                
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleResponse("accepted")}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 shadow-md shadow-red-200"
                >
                  {updating ? "Accepting..." : "🚒 Accept Rescue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
