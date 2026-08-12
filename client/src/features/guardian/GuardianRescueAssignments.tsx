import { useEffect, useState } from "react";

import {
  getMyAssignments,
} from "../../services/rescue/getAssignment";

import {
  updateAssignment,
} from "../../services/rescue/updateAssignment";

import {
  getReportById,
} from "../../services/report/getReportById";

import type { Report } from "../../types/report";

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

  const [reports, setReports] = useState<
    Record<string, Report>
  >({});

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

      // Load report details for every assignment
      const reportResults = await Promise.all(
        data.map(async (assignment: RescueAssignment) => {
          try {
            const report = await getReportById(
              assignment.report_id
            );

            return {
              id: assignment.report_id,
              report,
            };
          } catch (error) {
            console.error(
              `Failed to load report ${assignment.report_id}:`,
              error
            );

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
          {assignments.map((assignment) => {
            const report =
              reports[assignment.report_id];

            return (
              <div
                key={assignment.id}
                className="overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                {/* Report image */}
                {report?.image_url && (
                  <img
                    src={report.image_url}
                    alt={
                      report.animal_type ||
                      "Reported animal"
                    }
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
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        assignment.status ===
                        "pending"
                          ? "bg-amber-100 text-amber-700"
                          : assignment.status ===
                            "accepted"
                          ? "bg-green-100 text-green-700"
                          : assignment.status ===
                            "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-600"
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
                        {report?.animal_type ||
                          "Not available"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">
                        Severity
                      </p>

                      <p className="mt-1 font-semibold capitalize text-slate-800">
                        {report?.severity ||
                          "Not available"}
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
                        {assignment.distance_km !==
                        null
                          ? `${assignment.distance_km} km`
                          : "Not available"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">
                        Dispatch Score
                      </p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {assignment.dispatch_score !==
                        null
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

                  {/* Report ID */}
                  <p className="mt-4 text-xs text-slate-400">
                    Report ID: {assignment.report_id}
                  </p>

                  {/* Accept / Reject */}
                  {assignment.status ===
                    "pending" && (
                    <div className="mt-5 flex gap-3">
                      <button
                        type="button"
                        disabled={
                          updatingId ===
                          assignment.id
                        }
                        onClick={() =>
                          handleStatusUpdate(
                            assignment.id,
                            "rejected"
                          )
                        }
                        className="flex-1 rounded-xl border border-red-200 px-4 py-3 font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingId ===
                        assignment.id
                          ? "Updating..."
                          : "Reject"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          updatingId ===
                          assignment.id
                        }
                        onClick={() =>
                          handleStatusUpdate(
                            assignment.id,
                            "accepted"
                          )
                        }
                        className="flex-1 rounded-xl bg-green-600 px-4 py-3 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingId ===
                        assignment.id
                          ? "Updating..."
                          : "Accept"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}