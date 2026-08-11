import { useEffect, useState } from "react";
import {
  getMyAssignments,
} from "../../services/rescue/getAssignment";
import {
  updateAssignment,
} from "../../services/rescue/updateAssignment";

type AssignmentStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled"
  | "completed";

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
  const [assignments, setAssignments] = useState<
    RescueAssignment[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(
    null
  );

  const [updatingId, setUpdatingId] = useState<
    string | null
  >(null);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getMyAssignments();

      setAssignments(data);
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

  useEffect(() => {
    loadAssignments();
  }, []);

  const handleStatusUpdate = async (
    assignmentId: string,
    status: "accepted" | "rejected"
  ) => {
    try {
      setUpdatingId(assignmentId);
      setError(null);

      const updatedAssignment =
        await updateAssignment(
          assignmentId,
          { status }
        );

      setAssignments((current) =>
        current.map((assignment) =>
          assignment.id === assignmentId
            ? updatedAssignment
            : assignment
        )
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update assignment"
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
    <section className="space-y-4">
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
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Rescue Request
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Report ID: {assignment.report_id}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    assignment.status === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : assignment.status === "accepted"
                      ? "bg-green-100 text-green-700"
                      : assignment.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {assignment.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
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

              {assignment.status === "pending" && (
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    disabled={
                      updatingId === assignment.id
                    }
                    onClick={() =>
                      handleStatusUpdate(
                        assignment.id,
                        "rejected"
                      )
                    }
                    className="flex-1 rounded-xl border border-red-200 px-4 py-3 font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updatingId === assignment.id
                      ? "Updating..."
                      : "Reject"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      updatingId === assignment.id
                    }
                    onClick={() =>
                      handleStatusUpdate(
                        assignment.id,
                        "accepted"
                      )
                    }
                    className="flex-1 rounded-xl bg-green-600 px-4 py-3 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updatingId === assignment.id
                      ? "Updating..."
                      : "Accept"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}