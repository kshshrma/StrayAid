import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface PendingGuardian {
  id: string;
  user_id: string;
  bio: string | null;
  experience: string | null;
  full_name: string;
  phone: string;
  city: string;
  avatar_url: string | null;
}

interface ActiveReport {
  id: string;
  image_url: string;
  latitude: number;
  longitude: number;
  animal_type: string;
  severity: string;
  priority: string;
  ai_advice: string;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<"guardians" | "reports">("guardians");
  const [guardians, setGuardians] = useState<PendingGuardian[]>([]);
  const [reports, setReports] = useState<ActiveReport[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuthorization() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate("/login");
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (error || !profile || (profile.role !== "admin" && profile.role !== "ngo")) {
          alert("Access Denied: Admins/NGOs only.");
          navigate("/");
          return;
        }

        setAuthorized(true);
        loadData(session.access_token);
      } catch (err) {
        console.error("Auth check failed:", err);
        navigate("/");
      }
    }

    checkAuthorization();
  }, [navigate]);

  async function loadData(token: string) {
    try {
      setLoading(true);
      // Fetch unverified guardians
      const gRes = await fetch(`${API_URL}/api/admin/guardians/unverified`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const gData = await gRes.json();
      if (gRes.ok) setGuardians(gData.guardians || []);

      // Fetch active reports
      const rRes = await fetch(`${API_URL}/api/admin/reports/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rData = await rRes.json();
      if (rRes.ok) setReports(rData.reports || []);

    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(guardianId: string) {
    try {
      setActionId(guardianId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/api/admin/guardians/${guardianId}/verify`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        alert("✅ Guardian verified successfully!");
        setGuardians((prev) => prev.filter((g) => g.id !== guardianId));
      } else {
        const result = await response.json();
        alert(result.message || "Failed to verify guardian.");
      }
    } catch (err) {
      console.error("Error verifying guardian:", err);
      alert("An error occurred during verification.");
    } finally {
      setActionId(null);
    }
  }

  if (!authorized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 pb-24">
        <div className="text-center space-y-2">
          <p className="text-lg font-bold text-slate-700 animate-pulse">Loading Admin Panel...</p>
          <p className="text-xs text-slate-400">Verifying role clearance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 pb-28">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            💼 NGO & Admin Dashboard
          </h1>
          <p className="mt-1 text-slate-500 text-sm">
            Verify Guardian applications and monitor active emergency alerts.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("guardians")}
            className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
              activeTab === "guardians"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Pending Guardians ({guardians.length})
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
              activeTab === "reports"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Active Reports ({reports.length})
          </button>
        </div>

        {/* Pending Guardians Tab */}
        {activeTab === "guardians" && (
          <div className="space-y-4">
            {guardians.length === 0 ? (
              <div className="rounded-2xl bg-white p-12 text-center border border-slate-100 shadow-sm">
                <p className="text-lg font-bold text-slate-700">All caught up!</p>
                <p className="text-slate-400 text-sm mt-1">No Guardian verification applications pending.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {guardians.map((g) => (
                  <div key={g.id} className="rounded-2xl bg-white p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-xl shrink-0">
                          👤
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{g.full_name}</h3>
                          <p className="text-xs text-slate-400">{g.city} | {g.phone}</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div>
                          <p className="text-xs text-slate-400 font-semibold">BIO</p>
                          <p className="text-xs text-slate-600 mt-0.5">{g.bio || "No bio added."}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-semibold">RESCUE EXPERIENCE</p>
                          <p className="text-xs text-slate-600 mt-0.5">{g.experience || "None specified."}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleVerify(g.id)}
                      disabled={actionId === g.id}
                      className="mt-6 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {actionId === g.id ? "Verifying..." : "Verify Guardian Profile"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Reports Tab */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="rounded-2xl bg-white p-12 text-center border border-slate-100 shadow-sm">
                <p className="text-lg font-bold text-slate-700">No active rescues</p>
                <p className="text-slate-400 text-sm mt-1">There are currently no active rescue emergencies.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {reports.map((r) => (
                  <div key={r.id} className="rounded-2xl bg-white overflow-hidden border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                      {r.image_url && (
                        <img
                          src={r.image_url}
                          alt={r.animal_type}
                          className="h-36 w-full object-cover"
                        />
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-slate-900">🐾 {r.animal_type}</h3>
                          <span className="text-xs font-semibold capitalize text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {r.status}
                          </span>
                        </div>
                        
                        <div className="flex gap-2 mt-2">
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            {r.severity}
                          </span>
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            {r.priority}
                          </span>
                        </div>

                        {r.ai_advice && (
                          <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border-l-2 border-slate-300">
                            <p className="text-[11px] text-slate-500 font-semibold">🤖 AI ADVICE</p>
                            <p className="text-xs text-slate-600 mt-0.5 italic">"{r.ai_advice}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <Link
                        to={`/reports/${r.id}`}
                        className="block w-full rounded-xl bg-slate-100 py-2.5 text-center text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                      >
                        Monitor Rescue Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
