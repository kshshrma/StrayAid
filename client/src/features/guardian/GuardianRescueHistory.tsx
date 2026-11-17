import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyRescueHistory,
  type RescueHistoryEntry,
} from "../../services/rescue/getMyRescueHistory";
import {
  Heart,
  Clock,
  MapPin,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Check,
} from "lucide-react";

interface GuardianRescueHistoryProps {
  refreshTrigger?: number;
}

export default function GuardianRescueHistory({
  refreshTrigger = 0,
}: GuardianRescueHistoryProps) {
  const [history, setHistory] = useState<RescueHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadHistory() {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyRescueHistory();
      setHistory(data);
    } catch (err: any) {
      console.error("Failed to load rescue history:", err);
      setError(err?.message || "Failed to load rescue history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [refreshTrigger]);

  function handleCopyCoords(entry: RescueHistoryEntry) {
    if (entry.latitude !== null && entry.latitude !== undefined && entry.longitude !== null && entry.longitude !== undefined) {
      const text = `${entry.latitude.toFixed(6)}, ${entry.longitude.toFixed(6)}`;
      navigator.clipboard.writeText(text);
      setCopiedId(entry.assignmentId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs">
            <Heart size={20} className="fill-emerald-600 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              My Rescue History
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Verified rescues completed and claimed by you
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/70 px-3 py-1 rounded-xl text-emerald-800 shrink-0">
          <span className="text-sm font-black">{history.length}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Lives Saved
          </span>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-12 text-center space-y-2">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent mx-auto" />
          <p className="text-xs font-semibold text-slate-400 animate-pulse">
            Loading your verified rescues...
          </p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs text-center flex items-center justify-center gap-2">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-10 px-4 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <span className="text-3xl block">🐾</span>
          <h4 className="text-sm font-black text-slate-700">
            No completed rescues recorded yet
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            When you accept emergency assignments and successfully confirm them as completed, each rescued animal will appear in your personal rescue history and increase your Lives Saved count.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => {
            const acceptedTime = entry.acceptedAt
              ? new Date(entry.acceptedAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null;

            const completedTime = entry.completedAt
              ? new Date(entry.completedAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Completed";

            return (
              <div
                key={entry.assignmentId}
                className="rounded-2xl border border-slate-100 bg-white hover:border-emerald-200/80 transition-all shadow-xs p-4 flex flex-col sm:flex-row gap-3.5 items-start sm:items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {entry.imageUrl ? (
                    <img
                      src={entry.imageUrl}
                      alt={entry.animalType}
                      className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-slate-100"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-xl shrink-0 font-bold text-slate-500">
                      🐾
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-slate-800 truncate">
                        🐾 {entry.animalType} Rescue
                      </h4>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800">
                        <CheckCircle2 size={10} /> Confirmed Life Saved
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      Report ID: {entry.reportId}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 font-semibold flex-wrap">
                      {acceptedTime && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-slate-400" />
                          Accepted: {acceptedTime}
                        </span>
                      )}
                      {completedTime && (
                        <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                          ✓ Completed: {completedTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {entry.latitude !== null && entry.latitude !== undefined && (
                    <button
                      type="button"
                      onClick={() => handleCopyCoords(entry)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-50 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Copy GPS coordinates"
                    >
                      {copiedId === entry.assignmentId ? (
                        <>
                          <Check size={11} className="text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <MapPin size={11} />
                          <span>GPS</span>
                        </>
                      )}
                    </button>
                  )}

                  <Link
                    to={`/reports/${entry.reportId}`}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition"
                  >
                    <span>View Case</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
