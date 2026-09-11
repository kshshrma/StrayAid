import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getProfile } from "../services/profile/getProfile";
import CitizenConnectView from "../features/connect/CitizenConnectView";
import NgoOperationsView from "../features/connect/NgoOperationsView";
import { ShieldCheck, UserCheck, Radio } from "lucide-react";

export default function Connect() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("citizen");
  const [ngoId, setNgoId] = useState<string>("ngo-greater-noida-rescuers");
  const [viewMode, setViewMode] = useState<"citizen" | "ngo">("citizen");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuthAndRole() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUserId(session.user.id);
          try {
            const profile = await getProfile(session.user.id);
            if (profile) {
              const role = profile.role?.toLowerCase() || "citizen";
              setUserRole(role);
              if (profile.ngo_id) {
                setNgoId(profile.ngo_id);
              }
              // If user is an NGO or admin, default to NGO operations center
              if (role === "ngo" || role === "admin") {
                setViewMode("ngo");
              } else {
                setViewMode("citizen");
              }
            }
          } catch (profileErr) {
            console.warn("Could not load user profile:", profileErr);
          }
        }
      } catch (err) {
        console.error("Auth init error in Connect page:", err);
      } finally {
        setLoading(false);
      }
    }

    initAuthAndRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setCurrentUserId(session.user.id);
        try {
          const profile = await getProfile(session.user.id);
          if (profile) {
            const role = profile.role?.toLowerCase() || "citizen";
            setUserRole(role);
            if (profile.ngo_id) setNgoId(profile.ngo_id);
            if (role === "ngo" || role === "admin") {
              setViewMode("ngo");
            }
          }
        } catch {}
      } else {
        setCurrentUserId(null);
        setUserRole("citizen");
        setViewMode("citizen");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500">Loading StrayAid Connect Hub...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Role Switcher & Live Mode Bar */}
      <div className="bg-slate-900 text-slate-200 border-b border-slate-800 px-4 py-2 sticky top-0 z-40 shadow-xs backdrop-blur-md bg-slate-900/95">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <Radio size={13} className="text-emerald-400" /> StrayAid Connect Network
            </span>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="hidden sm:inline text-slate-400 text-[11px]">
              Case-Centric Rescue & Field Dispatch
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold hidden md:inline">
              Active Mode:
            </span>

            <div className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/80">
              <button
                onClick={() => setViewMode("citizen")}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "citizen"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Citizen / Reporter view"
              >
                <UserCheck size={12} /> Citizen Hub
              </button>

              <button
                onClick={() => setViewMode("ngo")}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "ngo"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="NGO Dispatch & Operations Center"
              >
                <ShieldCheck size={12} /> NGO Operations
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Role-Based Content View */}
      {viewMode === "ngo" ? (
        <NgoOperationsView currentUserId={currentUserId} ngoId={ngoId} />
      ) : (
        <CitizenConnectView currentUserId={currentUserId} userRole={userRole} />
      )}
    </div>
  );
}
