import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/ui/Card";
import { getReports } from "../../services/report/getReports";
import { subscribeReports } from "../../services/report/subscribeReports";
import { getMyAcceptedRescues } from "../../services/rescue/getMyAcceptedRescues";
import { supabase } from "../../lib/supabase";
import {
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Clock,
  AlertCircle,
  X,
  Compass,
  CheckCircle2,
} from "lucide-react";

interface Report {
  id: string;
  image_url: string;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
  accepted_at?: string | null;
  animal_type: string;
  severity: string;
  priority: string;
  ai_advice: string;
  assigned_guardian_id?: string | null;
}

export default function LivesSaved() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardianId, setGuardianId] = useState<string | null>(null);
  const [stats, setStats] = useState({ livesSaved: 0, active: 0 });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  async function loadAcceptedReports() {
    try {
      setLoading(true);
      setError(null);

      // Check for authenticated Guardian
      let currentGuardianId = guardianId;
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user && !currentGuardianId) {
        const { data: guardian } = await supabase
          .from("guardians")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (guardian) {
          currentGuardianId = guardian.id;
          setGuardianId(guardian.id);
        }
      }

      if (currentGuardianId) {
        // Fetch strictly the authenticated Guardian's own rescues
        const myData = await getMyAcceptedRescues();
        let mappedReports: Report[] = (myData.rescues || [])
          .filter((item) => Boolean(item.report))
          .map((item) => ({
            ...item.report,
            status: item.assignmentStatus || item.report.status,
            accepted_at: item.acceptedAt || item.report.accepted_at,
            completed_at:
              item.completedAt ||
              (item.assignmentStatus === "completed"
                ? item.report.completed_at || new Date().toISOString()
                : null),
            assigned_guardian_id: item.report.assigned_guardian_id || currentGuardianId,
          }));

        // Secondary fallback directly against reports table to ensure immediate visibility
        if (mappedReports.length === 0) {
          const { data: directReports } = await supabase
            .from("reports")
            .select("*")
            .eq("assigned_guardian_id", currentGuardianId)
            .in("status", [
              "accepted",
              "enroute",
              "rescued",
              "completed",
              "Accepted",
              "Enroute",
              "Rescued",
              "Completed",
            ]);

          if (directReports && directReports.length > 0) {
            mappedReports = directReports.map((r: any) => ({
              ...r,
              status: (r.status || "accepted").toLowerCase(),
              assigned_guardian_id: r.assigned_guardian_id || currentGuardianId,
            }));
          }
        }

        // Sort newest first
        mappedReports.sort((a: any, b: any) => {
          const timeA = new Date(a.accepted_at || a.created_at).getTime();
          const timeB = new Date(b.accepted_at || b.created_at).getTime();
          return timeB - timeA;
        });

        setReports(mappedReports);
        setStats({
          livesSaved: Math.max(myData.livesSavedCount, mappedReports.length),
          active:
            myData.activeCount ||
            mappedReports.filter((r) =>
              ["accepted", "enroute", "rescued"].includes((r.status || "").toLowerCase())
            ).length,
        });
      } else {
        // Fallback for general public: show community accepted missions
        const data = await getReports();
        const acceptedList = (data || []).filter((r: any) => {
          const s = (r.status || "").toLowerCase();
          return (
            s === "accepted" ||
            s === "enroute" ||
            s === "rescued" ||
            s === "completed"
          );
        });

        const sorted = acceptedList.sort((a: any, b: any) => {
          const timeA = new Date(a.accepted_at || a.created_at).getTime();
          const timeB = new Date(b.accepted_at || b.created_at).getTime();
          return timeB - timeA;
        });

        setReports(sorted);
        const completed = sorted.filter(
          (r: any) => (r.status || "").toLowerCase() === "completed"
        ).length;
        setStats({
          livesSaved: completed,
          active: sorted.length - completed,
        });
      }
    } catch (err: any) {
      console.error("Failed to load accepted rescues:", err);
      setError(err.message || "Failed to load accepted rescue operations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAcceptedReports();

    const channel = subscribeReports(() => {
      loadAcceptedReports();
    });

    const assignmentsChannel = supabase
      .channel("public:rescue_assignments:lives_saved")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rescue_assignments" },
        () => {
          loadAcceptedReports();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      assignmentsChannel.unsubscribe();
    };
  }, []);

  function handleCopyCoords(report: Report) {
    const text = `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedId(report.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function severityBadge(severity: string) {
    const s = (severity || "").toLowerCase();
    switch (s) {
      case "critical":
        return "bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100";
      case "high":
        return "bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-100";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-100";
      default:
        return "bg-green-50 text-green-700 border-green-200 ring-1 ring-green-100";
    }
  }

  function priorityBadge(priority: string) {
    const p = (priority || "").toLowerCase();
    switch (p) {
      case "emergency":
        return "bg-red-600 text-white shadow-sm shadow-red-200";
      case "urgent":
        return "bg-orange-500 text-white shadow-sm shadow-orange-200";
      default:
        return "bg-blue-600 text-white shadow-sm shadow-blue-200";
    }
  }

  function statusBadge(status: string) {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "accepted":
        return {
          bg: "bg-emerald-600/90 text-white shadow-md shadow-emerald-200",
          dot: "bg-white animate-ping",
          label: "Accepted & Dispatched",
        };
      case "enroute":
        return {
          bg: "bg-blue-600/90 text-white shadow-md shadow-blue-200",
          dot: "bg-white animate-ping",
          label: "Rescuer En Route",
        };
      case "rescued":
        return {
          bg: "bg-purple-600/90 text-white shadow-md shadow-purple-200",
          dot: "bg-white",
          label: "Secured & Rescued",
        };
      case "completed":
        return {
          bg: "bg-teal-600/90 text-white shadow-md shadow-teal-200",
          dot: "bg-white",
          label: "Confirmed Life Saved",
        };
      default:
        return {
          bg: "bg-slate-800/90 text-white shadow-md",
          dot: "bg-white",
          label: status,
        };
    }
  }

  function parseAdviceMetadata(aiAdvice: string) {
    if (!aiAdvice) return null;
    try {
      if (aiAdvice.trim().startsWith("{")) {
        return JSON.parse(aiAdvice);
      }
    } catch {
      // Not JSON
    }
    return null;
  }

  return (
    <div className="space-y-5">
      {/* Lightbox Modal for Image Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition shadow-lg"
              title="Close"
            >
              <X size={18} />
            </button>
            <img
              src={previewImage}
              alt="Full view"
              className="max-h-[80vh] w-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}

      {/* Main Container Card */}
      <Card className="border border-emerald-100/70 bg-white shadow-lg rounded-3xl p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
              Lives Saved
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Accepted rescue cases locked to active responders
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-2xl shadow-sm shrink-0">
              <span className="text-xl font-black text-emerald-700">
                {stats.livesSaved}
              </span>
              <div className="text-left leading-tight">
                <p className="text-[12px] font-bold text-emerald-900">
                  Lives Saved
                </p>
                <p className="text-[9px] text-emerald-600 font-medium">
                  Accepted Rescues
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-9 h-9 rounded-full border-4 border-slate-200 border-t-emerald-600 animate-spin" />
            <p className="text-sm font-bold text-slate-600 animate-pulse">
              Loading accepted rescues...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 font-bold text-xs">
              <AlertCircle size={16} />
              <span>Failed to load rescue operations</span>
            </div>
            <p className="text-[11px] text-red-600">{error}</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="py-14 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-3xl">
              🐾
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No accepted rescues currently
            </h3>
            <p className="text-xs text-slate-500 max-w-xs">
              When a rescuer accepts an emergency case from the dashboard, it will appear here.
            </p>
            <Link
              to="/reports"
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition"
            >
              Browse Open Rescue Requests
            </Link>
          </div>
        ) : (
          /* List of Accepted Rescues */
          <div className="space-y-5">
            {reports.map((report) => {
              const meta = parseAdviceMetadata(report.ai_advice);
              const statusInfo = statusBadge(report.status);
              const isMine = Boolean(guardianId && report.assigned_guardian_id === guardianId);

              return (
                <div
                  key={report.id}
                  className={`rounded-3xl border transition-all duration-200 overflow-hidden bg-white shadow-sm hover:shadow-md ${
                    isMine
                      ? "border-emerald-300 ring-2 ring-emerald-100"
                      : "border-slate-200/90"
                  }`}
                >
                  {/* Photo Section with Badge Overlays */}
                  <div className="relative w-full h-52 sm:h-56 bg-slate-100 overflow-hidden">
                    {report.image_url ? (
                      <img
                        src={report.image_url}
                        alt={report.animal_type || "Rescue animal"}
                        onClick={() => setPreviewImage(report.image_url)}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                        title="Click to enlarge photo"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
                        <span className="text-3xl">🐾</span>
                        <span className="text-xs font-semibold">No Image Provided</span>
                      </div>
                    )}

                    {/* Gradient scrim for badge readability */}
                    <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

                    {/* Overlaid Status Badge */}
                    <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md ${statusInfo.bg}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Animal Name & Diagnostic Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">
                        🐾 {report.animal_type || "Animal Rescue"}
                      </h2>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${severityBadge(
                            report.severity
                          )}`}
                        >
                          {report.severity || "Low"} Severity
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${priorityBadge(
                            report.priority
                          )}`}
                        >
                          {report.priority || "Standard"} Priority
                        </span>
                      </div>
                    </div>

                    {/* Incident Specifications Box */}
                    {meta ? (
                      <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white p-2 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold block">CATEGORY</span>
                            <span className="font-bold text-slate-800 capitalize">
                              {meta.rescueType?.replace(/_/g, " ") || "Rescue"}
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold block">SITUATION</span>
                            <span className="font-bold text-slate-800">
                              {meta.subType || "General Incident"}
                            </span>
                          </div>
                        </div>

                        {meta.ngoName && (
                          <div className="bg-white p-2 rounded-xl border border-slate-100 text-xs">
                            <span className="text-[10px] text-slate-400 font-bold block">DISPATCHED NGO</span>
                            <span className="font-bold text-blue-700">
                              🏥 {meta.ngoName}
                            </span>
                          </div>
                        )}

                        {meta.notes && (
                          <p className="text-xs text-slate-600 italic bg-white p-2 rounded-xl border border-slate-100">
                            "{meta.notes}"
                          </p>
                        )}
                      </div>
                    ) : report.ai_advice ? (
                      <div className="rounded-2xl bg-blue-50/60 p-3 border border-blue-100 text-xs text-slate-700 italic">
                        <span className="font-bold text-blue-800 not-italic block mb-0.5">
                          🤖 Gemini AI Diagnostics:
                        </span>
                        "{report.ai_advice}"
                      </div>
                    ) : null}

                    {/* Incident Coordinates & Timeline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      {/* Coordinates */}
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-red-500 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Coordinates</span>
                            <span className="font-mono font-bold text-slate-800 text-xs">
                              {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCopyCoords(report)}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium transition flex items-center gap-1 shadow-sm shrink-0"
                          title="Copy Coordinates"
                        >
                          {copiedId === report.id ? (
                            <>
                              <Check size={12} className="text-emerald-600" />
                              <span className="text-[10px] font-bold text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span className="text-[10px]">Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Timeline */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                        <Clock size={16} className="text-slate-400 shrink-0" />
                        <div className="leading-tight space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Timeline</span>
                          <span className="text-[11px] text-slate-600 block">
                            Reported: {new Date(report.created_at).toLocaleDateString()}{" "}
                            {new Date(report.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {report.accepted_at && (
                            <span className="text-[11px] text-emerald-700 font-bold block">
                              ✓ Accepted: {new Date(report.accepted_at).toLocaleDateString()}{" "}
                              {new Date(report.accepted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                          {(report.status === "completed" || (report as any).completed_at) && (
                            <span className="text-[11px] text-teal-700 font-bold flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-teal-600 inline shrink-0" />
                              Saved: {(report as any).completed_at ? new Date((report as any).completed_at).toLocaleDateString() + " " + new Date((report as any).completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Mission Successful"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Report ID */}
                    <p className="text-[10px] font-mono text-slate-400">
                      Report ID: {report.id}
                    </p>

                    {/* Interactive Action Buttons */}
                    <div className="pt-1 flex flex-col sm:flex-row gap-2">
                      <Link
                        to={`/reports/${report.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition shadow-md hover:shadow-lg active:scale-[0.99]"
                      >
                        <span>Open Full Rescue Details</span>
                        <ExternalLink size={13} />
                      </Link>

                      <Link
                        to={`/map?lat=${report.latitude}&lng=${report.longitude}`}
                        className="sm:w-auto inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold rounded-2xl text-xs transition active:scale-[0.99]"
                      >
                        <Compass size={14} className="text-emerald-600" />
                        <span>View on Live Map</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
