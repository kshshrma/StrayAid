import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getMyAssignments,
} from "../../services/rescue/getAssignment";

import {
  updateAssignment,
} from "../../services/rescue/updateAssignment";

import {
  getReportById,
} from "../../services/report/getReportById";

import { calculateDistance } from "../../utils/distance";
import { supabase } from "../../lib/supabase";
import type { Report } from "../../types/report";

type AssignmentStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled"
  | "completed"
  | "enroute"
  | "rescued";

interface RescueAssignment {
  id: string;
  report_id: string;
  guardian_id: string;
  status: AssignmentStatus;
  distance_km: number | null;
  dispatch_score: number | null;
  assigned_at: string;
  responded_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function GuardianRescueAssignments() {
  const [assignments, setAssignments] = useState<RescueAssignment[]>([]);
  const [reports, setReports] = useState<Record<string, Report>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [nearbyAlerts, setNearbyAlerts] = useState<any[]>([]);
  const [guardianCoords, setGuardianCoords] = useState<[number, number] | null>(null);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getMyAssignments();
      setAssignments(data);

      const reportResults = await Promise.all(
        data.map(async (assignment: RescueAssignment) => {
          try {
            const report = await getReportById(assignment.report_id);
            return {
              id: assignment.report_id,
              report,
            };
          } catch (error) {
            console.error(`Failed to load report ${assignment.report_id}:`, error);
            return null;
          }
        })
      );

      const reportMap: Record<string, Report> = {};
      reportResults.forEach((result) => {
        if (result) {
          reportMap[result.id] = result.report;
        }
      });

      setReports(reportMap);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load rescue assignments"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadGuardianCoords = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: guardian } = await supabase
          .from("guardians")
          .select("latitude, longitude")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (guardian?.latitude !== null && guardian?.longitude !== null) {
          setGuardianCoords([guardian.latitude, guardian.longitude]);
        }
      }
    } catch (err) {
      console.error("Failed to load guardian coordinates:", err);
    }
  };

  const loadNearbyAlerts = async (coords: [number, number]) => {
    try {
      const { data, error: queryError } = await supabase
        .from("reports")
        .select("*")
        .eq("status", "Pending")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (queryError) throw queryError;

      const calculated = (data || [])
        .map((report) => {
          const dist = calculateDistance(
            coords[0],
            coords[1],
            report.latitude,
            report.longitude
          );
          return {
            ...report,
            distance_km: Number(dist.toFixed(2)),
          };
        })
        .filter((report) => report.distance_km <= 20)
        .sort((a, b) => a.distance_km - b.distance_km);

      setNearbyAlerts(calculated);
    } catch (err) {
      console.error("Failed to load nearby alerts:", err);
    }
  };

  useEffect(() => {
    loadAssignments();
    loadGuardianCoords();
  }, []);

  useEffect(() => {
    if (guardianCoords) {
      loadNearbyAlerts(guardianCoords);

      const channel = supabase
        .channel("public:reports")
        .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
          loadNearbyAlerts(guardianCoords);
          loadAssignments();
        })
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [guardianCoords]);

  const handleStatusUpdate = async (
    assignmentId: string,
    status: "accepted" | "rejected" | "enroute" | "rescued" | "completed"
  ) => {
    try {
      setUpdatingId(assignmentId);
      setError(null);

      const updatedAssignment = await updateAssignment(assignmentId, {
        status: status as any,
      });

      setAssignments((current) =>
        current.map((assignment) =>
          assignment.id === assignmentId
            ? updatedAssignment
            : assignment
        )
      );

      const report = await getReportById(updatedAssignment.report_id);
      setReports((prev) => ({
        ...prev,
        [updatedAssignment.report_id]: report,
      }));
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to update assignment"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-slate-500">
          Loading rescue assignments...
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Assignments Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Rescue Assignments
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Rescue requests assigned to you.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {assignments.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-slate-500">
              No rescue assignments yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const report = reports[assignment.report_id];

              return (
                <div
                  key={assignment.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm"
                >
                  {/* Report image */}
                  {report?.image_url && (
                    <img
                      src={report.image_url}
                      alt={report.animal_type || "Reported animal"}
                      className="h-44 w-full object-cover"
                    />
                  )}

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          {report?.animal_type
                            ? `🐾 ${report.animal_type}`
                            : "Rescue Request"}
                        </h3>

                        {report?.severity && (
                          <p className="mt-1 text-sm text-slate-500">
                            Severity:{" "}
                            <span className="font-semibold text-slate-700">
                              {report.severity}
                            </span>
                          </p>
                        )}
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                          assignment.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : assignment.status === "accepted"
                            ? "bg-green-100 text-green-700"
                            : assignment.status === "enroute"
                            ? "bg-blue-100 text-blue-700"
                            : assignment.status === "rescued"
                            ? "bg-purple-100 text-purple-700"
                            : assignment.status === "completed"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {assignment.status}
                      </span>
                    </div>

                    {/* Report information */}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Animal
                        </p>
                        <p className="mt-1 font-semibold capitalize text-slate-800">
                          {report?.animal_type || "Not available"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Severity
                        </p>
                        <p className="mt-1 font-semibold capitalize text-slate-800">
                          {report?.severity || "Not available"}
                        </p>
                      </div>
                    </div>

                    {/* Assignment information */}
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Distance
                        </p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {assignment.distance_km !== null
                            ? `${assignment.distance_km} km`
                            : "Not available"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Dispatch Score
                        </p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {assignment.dispatch_score !== null
                            ? assignment.dispatch_score
                            : "Not available"}
                        </p>
                      </div>
                    </div>

                    {/* Report status */}
                    {report?.status && (
                      <div className="mt-3 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Report Status
                        </p>
                        <p className="mt-1 font-semibold capitalize text-slate-800">
                          {report.status}
                        </p>
                      </div>
                    )}

                    <p className="mt-4 text-xs text-slate-400">
                      Report ID: {assignment.report_id}
                    </p>

                    {/* Interactive Transition Actions */}
                    {assignment.status === "pending" && (
                      <div className="mt-5 flex gap-3">
                        <button
                          type="button"
                          disabled={updatingId === assignment.id}
                          onClick={() => handleStatusUpdate(assignment.id, "rejected")}
                          className="flex-1 rounded-xl border border-red-200 px-4 py-3 font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {updatingId === assignment.id ? "Updating..." : "Reject"}
                        </button>

                        <button
                          type="button"
                          disabled={updatingId === assignment.id}
                          onClick={() => handleStatusUpdate(assignment.id, "accepted")}
                          className="flex-1 rounded-xl bg-green-600 px-4 py-3 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          {updatingId === assignment.id ? "Updating..." : "Accept"}
                        </button>
                      </div>
                    )}

                    {assignment.status === "accepted" && (
                      <button
                        type="button"
                        disabled={updatingId === assignment.id}
                        onClick={() => handleStatusUpdate(assignment.id, "enroute")}
                        className="mt-5 w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updatingId === assignment.id ? "Updating..." : "🚒 Start Journey"}
                      </button>
                    )}

                    {assignment.status === "enroute" && (
                      <button
                        type="button"
                        disabled={updatingId === assignment.id}
                        onClick={() => handleStatusUpdate(assignment.id, "rescued")}
                        className="mt-5 w-full rounded-xl bg-amber-500 py-3.5 font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                      >
                        {updatingId === assignment.id ? "Updating..." : "🐾 Secured Animal"}
                      </button>
                    )}

                    {assignment.status === "rescued" && (
                      <button
                        type="button"
                        disabled={updatingId === assignment.id}
                        onClick={() => handleStatusUpdate(assignment.id, "completed")}
                        className="mt-5 w-full rounded-xl bg-green-600 py-3.5 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                      >
                        {updatingId === assignment.id ? "Updating..." : "✅ Complete Rescue"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nearby Alerts Section */}
      {guardianCoords && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Nearby Active Alerts
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Unassigned animal emergencies within 20 km of your location.
            </p>
          </div>

          {nearbyAlerts.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-slate-500">No active alerts nearby.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {nearbyAlerts.map((report) => (
                <div key={report.id} className="overflow-hidden rounded-2xl bg-white shadow-sm flex flex-col justify-between">
                  <div>
                    {report.image_url && (
                      <img
                        src={report.image_url}
                        alt={report.animal_type || "Animal"}
                        className="h-36 w-full object-cover"
                      />
                    )}
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-800">
                          🐾 {report.animal_type || "Unknown Animal"}
                        </h4>
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          📍 {report.distance_km} km away
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Severity: <span className="font-semibold text-slate-700">{report.severity || "Low"}</span>
                      </p>
                      {report.ai_advice && (
                        <p className="text-xs text-slate-500 italic mt-2 border-l-2 border-slate-300 pl-2">
                          "{report.ai_advice}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="p-4 pt-0">
                    <Link
                      to={`/reports/${report.id}`}
                      className="block w-full rounded-xl bg-slate-100 py-2.5 text-center text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                    >
                      View Alert Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}