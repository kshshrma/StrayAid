import { supabase } from "../../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface RescueHistoryEntry {
  assignmentId: string;
  reportId: string;
  guardianId: string;
  status: string;
  assignedAt: string;
  acceptedAt?: string | null;
  completedAt?: string | null;
  distanceKm?: number | null;
  animalType: string;
  imageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  severity?: string;
  priority?: string;
  notes?: string;
}

export async function getMyRescueHistory(): Promise<RescueHistoryEntry[]> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return [];
  }

  // 1. Try backend API first
  try {
    const response = await fetch(`${API_URL}/api/rescue/my-history`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && Array.isArray(result.history)) {
        return result.history;
      }
    }
  } catch (apiErr) {
    console.warn("[RescueHistory] Backend endpoint unavailable, falling back to direct Supabase query:", apiErr);
  }

  // 2. Resilient fallback via Supabase query strictly for authenticated Guardian
  try {
    const { data: guardian } = await supabase
      .from("guardians")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!guardian) {
      return [];
    }

    const { data: assignments, error: assignErr } = await supabase
      .from("rescue_assignments")
      .select("*")
      .eq("guardian_id", guardian.id)
      .eq("status", "completed")
      .order("updated_at", { ascending: false });

    if (assignErr || !assignments || assignments.length === 0) {
      return [];
    }

    const reportIds = Array.from(new Set(assignments.map((a) => a.report_id).filter(Boolean)));
    const { data: reports } = await supabase
      .from("reports")
      .select("*")
      .in("id", reportIds);

    const reportMap = new Map((reports || []).map((r) => [r.id, r]));

    return assignments.map((assignment) => {
      const report = reportMap.get(assignment.report_id);
      let notes = "";
      try {
        const parsed = JSON.parse(report?.ai_advice || "{}");
        notes = parsed.description || parsed.notes || "";
      } catch {}

      return {
        assignmentId: assignment.id,
        reportId: assignment.report_id,
        guardianId: assignment.guardian_id,
        status: assignment.status,
        assignedAt: assignment.created_at || assignment.assigned_at,
        acceptedAt: report?.accepted_at || assignment.responded_at,
        completedAt: report?.completed_at || assignment.updated_at,
        distanceKm: assignment.distance_km,
        animalType: report?.animal_type || "Animal",
        imageUrl: report?.image_url || null,
        latitude: report?.latitude ?? null,
        longitude: report?.longitude ?? null,
        severity: report?.severity || "Normal",
        priority: report?.priority || "Normal",
        notes,
      };
    });
  } catch (fallbackErr) {
    console.error("[RescueHistory] Fallback query failed:", fallbackErr);
    return [];
  }
}
