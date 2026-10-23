import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getProfile } from "../services/profile/getProfile";
import GuardianConnectView from "../features/connect/GuardianConnectView";
import NgoOperationsView from "../features/connect/NgoOperationsView";
import RoleSelectionView from "../features/connect/RoleSelectionView";
import ChangeRoleModal from "../features/connect/ChangeRoleModal";
import {
  getConnectRole,
  saveConnectRole,
  clearConnectRole,
  type ConnectRole,
} from "../services/connect/connectRoleService";
import { Radio, Settings } from "lucide-react";

export default function Connect() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("citizen");
  const [ngoId, setNgoId] = useState<string>("ngo-greater-noida-rescuers");
  const [role, setRole] = useState<ConnectRole | null>(null);
  const [checkingRole, setCheckingRole] = useState<boolean>(true);
  const [showChangeRoleModal, setShowChangeRoleModal] = useState<boolean>(false);
  const [savingRole, setSavingRole] = useState<boolean>(false);

  useEffect(() => {
    async function initAuthAndRole() {
      try {
        setCheckingRole(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const userId = session.user.id;
          setCurrentUserId(userId);

          // 1. Fetch saved Connect role for this specific authenticated user
          const savedRole = await getConnectRole(userId);
          setRole(savedRole);

          // 2. Load user profile for additional metadata (e.g. registered ngo_id)
          try {
            const profile = await getProfile(userId);
            if (profile) {
              const roleName = profile.role?.toLowerCase() || "citizen";
              setUserRole(roleName);
              if (profile.ngo_id) {
                setNgoId(profile.ngo_id);
              }
            }
          } catch (profileErr) {
            console.warn("Could not load user profile in Connect:", profileErr);
          }
        } else {
          setCurrentUserId(null);
          setRole(null);
        }
      } catch (err) {
        console.error("Auth init error in Connect page:", err);
      } finally {
        setCheckingRole(false);
      }
    }

    initAuthAndRole();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const userId = session.user.id;
        setCurrentUserId(userId);
        try {
          const savedRole = await getConnectRole(userId);
          setRole(savedRole);

          const profile = await getProfile(userId);
          if (profile) {
            const roleName = profile.role?.toLowerCase() || "citizen";
            setUserRole(roleName);
            if (profile.ngo_id) setNgoId(profile.ngo_id);
          }
        } catch (err) {
          console.warn("Error reloading role on auth state change:", err);
        }
      } else {
        setCurrentUserId(null);
        setRole(null);
        setUserRole("citizen");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 1. Handle Role Selection
  async function handleSelectRole(selectedRole: ConnectRole) {
    if (!currentUserId) return;
    try {
      setSavingRole(true);
      await saveConnectRole(currentUserId, selectedRole);
      setRole(selectedRole);
    } catch (err) {
      console.error("Failed to save selected role:", err);
    } finally {
      setSavingRole(false);
    }
  }

  // 2. Handle Role Switching
  async function handleConfirmChangeRole() {
    if (!currentUserId) return;
    try {
      setSavingRole(true);
      await clearConnectRole(currentUserId);
      setRole(null);
      setShowChangeRoleModal(false);
    } catch (err) {
      console.error("Failed to clear connect role:", err);
    } finally {
      setSavingRole(false);
    }
  }

  // 3. Loading State (Do not flash role selection UI while checking saved role)
  if (checkingRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-3 font-sans">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500">Loading Connect...</p>
      </div>
    );
  }

  // 4. Role Selection Screen (Shown when no role has been selected yet)
  if (!role) {
    return (
      <RoleSelectionView
        onSelectRole={handleSelectRole}
        loadingRole={savingRole}
      />
    );
  }

  // 5. Selected Role Interface (Guardian or NGO)
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Role Switcher & Live Mode Header Bar */}
      <div className="bg-slate-900 text-slate-200 border-b border-slate-800 px-4 py-2 sticky top-0 z-40 shadow-xs backdrop-blur-md bg-slate-900/95">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Role indicator */}
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <Radio size={13} className="text-emerald-400" /> StrayAid Connect Network
            </span>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
              {role === "guardian" ? (
                <>🤝 Guardian Connect • Your Rescue Network</>
              ) : (
                <>🏢 NGO Connect • Rescue Coordination Center</>
              )}
            </span>
          </div>

          {/* Right: Change Role Option */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowChangeRoleModal(true)}
              className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Change Connect Role"
            >
              <Settings size={12} className="text-slate-400" />
              <span>⚙ Change Connect Role</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Selected Interface */}
      {role === "guardian" ? (
        <GuardianConnectView currentUserId={currentUserId} userRole={userRole} />
      ) : (
        <NgoOperationsView currentUserId={currentUserId} ngoId={ngoId} />
      )}

      {/* Change Role Confirmation Modal */}
      <ChangeRoleModal
        isOpen={showChangeRoleModal}
        onClose={() => setShowChangeRoleModal(false)}
        onConfirm={handleConfirmChangeRole}
        loading={savingRole}
      />
    </div>
  );
}
