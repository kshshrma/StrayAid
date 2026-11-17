import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getReportById } from "../../services/report/getReportById";
import { acceptReport } from "../../services/report/acceptReport";
import { subscribeReports } from "../../services/report/subscribeReports";
import { supabase } from "../../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

export default function ReportDetails() {
  const { id } = useParams();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [currentGuardianId, setCurrentGuardianId] = useState<string | null>(null);

  // Admin states
  const [isAdmin, setIsAdmin] = useState(false);
  const [availableGuardians, setAvailableGuardians] = useState<any[]>([]);
  const [selectedGuardian, setSelectedGuardian] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("");
  const [updatingDispatch, setUpdatingDispatch] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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

  useEffect(() => {
    async function loadGuardianAndRole() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Load guardian id for user
          const { data: guardian } = await supabase
            .from("guardians")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (guardian) {
            setCurrentGuardianId(guardian.id);
          }

          // Check admin/ngo role
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          if (profile && (profile.role === "admin" || profile.role === "ngo")) {
            setIsAdmin(true);
            const res = await fetch(`${API_URL}/api/admin/guardians/available`, {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await res.json();
            if (res.ok) {
              setAvailableGuardians(data.guardians || []);
            }
          }
        }
      } catch (err) {
        console.error("Failed to check guardian/role status:", err);
      }
    }

    loadReport();
    loadGuardianAndRole();

    // Subscribe to live status changes
    const channel = subscribeReports(() => {
      loadReport();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [id]);

  async function handleAccept() {
    if (!report) return;

    try {
      setAccepting(true);
      const updated = await acceptReport(report.id);
      setReport(updated);
      if (updated.assigned_guardian_id) {
        setCurrentGuardianId(updated.assigned_guardian_id);
      }
      alert("✅ Rescue accepted successfully! It is now assigned to your account.");
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to accept rescue.");
    } finally {
      setAccepting(false);
    }
  }

  async function handleForceAssign() {
    if (!selectedGuardian || !id) {
      alert("Please select a Guardian first.");
      return;
    }

    try {
      setUpdatingDispatch(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${API_URL}/api/admin/dispatch/override`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reportId: id,
          guardianId: selectedGuardian,
        }),
      });

      if (res.ok) {
        alert("✅ Guardian assigned manually!");
        const data = await getReportById(id);
        setReport(data);
        setSelectedGuardian("");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to force assign Guardian.");
      }
    } catch (err) {
      console.error(err);
      alert("Error overriding dispatch.");
    } finally {
      setUpdatingDispatch(false);
    }
  }

  async function handleStatusOverride() {
    if (!overrideStatus || !id) {
      alert("Please select a status first.");
      return;
    }

    try {
      setUpdatingStatus(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${API_URL}/api/admin/reports/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          status: overrideStatus,
        }),
      });

      if (res.ok) {
        alert(`✅ Status manually overridden to ${overrideStatus}!`);
        const data = await getReportById(id);
        setReport(data);
        setOverrideStatus("");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to manually override status.");
      }
    } catch (err) {
      console.error(err);
      alert("Error overriding status.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-700 animate-pulse">Loading report details...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 font-semibold">
        Report not found.
      </div>
    );
  }

  const severityColor =
    report.severity === "Critical"
      ? "bg-red-50 text-red-700 border-red-200"
      : report.severity === "High"
      ? "bg-orange-50 text-orange-700 border-orange-200"
      : report.severity === "Medium"
      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
      : "bg-green-50 text-green-700 border-green-200";

  const priorityColor =
    report.priority === "Emergency"
      ? "bg-red-50 text-red-700 border-red-200"
      : report.priority === "Urgent"
      ? "bg-orange-50 text-orange-700 border-orange-200"
      : "bg-blue-50 text-blue-700 border-blue-200";

  const statusLower = (report.status || "").toLowerCase();
  const isPending = statusLower === "pending";
  const isAccepted = statusLower === "accepted" || statusLower === "enroute" || statusLower === "rescued";
  const isAcceptedByMe = isAccepted && currentGuardianId && report.assigned_guardian_id === currentGuardianId;
  const isCompleted = statusLower === "completed";

  // Check if ai_advice is JSON metadata from connect chatbot
  let parsedMetadata: any = null;
  if (report.ai_advice) {
    try {
      if (report.ai_advice.trim().startsWith("{")) {
        parsedMetadata = JSON.parse(report.ai_advice);
      }
    } catch (e) {
      parsedMetadata = null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-28 md:p-8">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-md">
          {report.image_url && (
            <img
              src={report.image_url}
              alt="Reported animal"
              className="h-80 w-full object-cover"
            />
          )}

          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                🐾 Emergency Rescue Report
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Report ID: {report.id}
              </p>
            </div>

            {/* AI Diagnostics Banner */}
            <div className="space-y-3 rounded-2xl bg-blue-50/50 border border-blue-100 p-4">
              <h3 className="text-sm font-bold text-blue-800 flex items-center gap-1.5">
                🤖 Gemini Triage Diagnostics
              </h3>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-white p-3 rounded-xl border border-blue-100/50">
                  <p className="text-[10px] text-slate-400 font-bold">ANIMAL</p>
                  <p className="text-sm font-bold text-slate-800 capitalize mt-0.5">{report.animal_type || "Unknown"}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-100/50">
                  <p className="text-[10px] text-slate-400 font-bold">STATUS</p>
                  <p className="text-sm font-bold text-blue-600 capitalize mt-0.5">{report.status}</p>
                </div>
              </div>

              <div className="flex gap-2.5 mt-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${severityColor}`}>
                  {report.severity || "Low"} Severity
                </span>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${priorityColor}`}>
                  {report.priority || "Standard"} Priority
                </span>
              </div>

              {parsedMetadata ? (
                <div className="mt-3 bg-white/80 p-3 rounded-xl text-xs text-slate-700 space-y-1 border border-blue-100/60">
                  <p><strong>Rescue Type:</strong> <span className="capitalize">{parsedMetadata.rescueType?.replace(/_/g, " ") || "Rescue"}</span> {parsedMetadata.subType ? `(${parsedMetadata.subType})` : ""}</p>
                  {parsedMetadata.ngoName && (
                    <p><strong>Assigned NGO:</strong> {parsedMetadata.ngoName}</p>
                  )}
                  {parsedMetadata.notes && (
                    <p className="italic text-slate-500">"{parsedMetadata.notes}"</p>
                  )}
                </div>
              ) : report.ai_advice ? (
                <div className="mt-3 bg-white/70 p-3 rounded-xl text-xs text-slate-600 italic">
                  "{report.ai_advice}"
                </div>
              ) : null}
            </div>

            {/* Incident Coordinates */}
            <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <strong>📍 Latitude:</strong> {report.latitude}
              </div>
              <div>
                <strong>📍 Longitude:</strong> {report.longitude}
              </div>
            </div>

            <p className="text-slate-400 text-xs">
              Reported on {new Date(report.created_at).toLocaleString()}
            </p>

            {/* Rescue Accept Action / Claimed Status Display */}
            {isPending ? (
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full rounded-2xl bg-green-600 py-3.5 font-bold text-white hover:bg-green-700 shadow-md shadow-green-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {accepting ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Accepting Rescue...</span>
                  </>
                ) : (
                  <>
                    <span>✅ Accept Rescue Assignment</span>
                  </>
                )}
              </button>
            ) : isAcceptedByMe ? (
              <div className="w-full rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-1">
                <div className="flex items-center justify-center gap-2 text-emerald-800 font-extrabold text-sm">
                  <span>🛡️ You Have Accepted This Rescue</span>
                </div>
                <p className="text-xs text-emerald-600 font-medium">
                  Status: <span className="capitalize font-bold">{report.status}</span> • Assignment locked to your account
                </p>
              </div>
            ) : isCompleted ? (
              <div className="w-full rounded-2xl bg-slate-100 border border-slate-200 p-3.5 text-center text-slate-600 font-bold text-sm">
                🏁 Rescue Completed
              </div>
            ) : (
              <button
                disabled
                className="w-full rounded-2xl bg-slate-200 py-3.5 font-bold text-slate-400 cursor-not-allowed"
              >
                Rescue Assignment Claimed
              </button>
            )}
          </div>
        </div>

        {/* ADMIN OVERRIDE & DISPATCH ACTIONS PANEL */}
        {isAdmin && (
          <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-md space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                🛠️ Admin & NGO Controls
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Override active routing dispatches and manually transition states.
              </p>
            </div>

            {/* Manual Dispatch Override */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-500 block">
                MANUAL DISPATCH OVERRIDE
              </label>
              
              <div className="flex gap-2">
                <select
                  value={selectedGuardian}
                  onChange={(e) => setSelectedGuardian(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Verified Guardian...</option>
                  {availableGuardians.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.full_name} ({g.total_rescues} rescues)
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleForceAssign}
                  disabled={updatingDispatch || !selectedGuardian}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {updatingDispatch ? "Assigning..." : "Force Assign"}
                </button>
              </div>
            </div>

            {/* Manual Status Override */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-500 block">
                MANUAL STATUS TRANSITION
              </label>

              <div className="flex gap-2">
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Rescue Status...</option>
                  <option value="accepted">Accepted / Assigned</option>
                  <option value="enroute">Enroute to Location</option>
                  <option value="rescued">Secured / Rescued</option>
                  <option value="completed">Completed Rescue</option>
                </select>

                <button
                  onClick={handleStatusOverride}
                  disabled={updatingStatus || !overrideStatus}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50"
                >
                  {updatingStatus ? "Updating..." : "Force Status"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
