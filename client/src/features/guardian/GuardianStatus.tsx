import { useNavigate } from "react-router-dom";

interface GuardianStatusProps {
  guardian: {
    is_verified: boolean;
    available: boolean;
    total_rescues: number;
    bio: string | null;
    experience: string | null;
  } | null;
}

export default function GuardianStatus({
  guardian,
}: GuardianStatusProps) {
  const navigate = useNavigate();

  // User is not a Guardian yet
  if (!guardian) {
    return (
      <div className="mb-5 rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-2xl">
            🛟
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">
              Guardian Network
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Help injured and vulnerable animals
              in your area.
            </p>

            <button
              onClick={() => navigate("/guardian")}
              className="mt-4 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              Become a Guardian
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-3xl bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
          🛟
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Guardian
          </h2>

          <p className="text-sm text-gray-500">
            Your Guardian profile
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="mt-5 grid grid-cols-2 gap-3">

        {/* Verification */}
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs text-gray-500">
            Verification
          </p>

          <p
            className={`mt-1 text-sm font-bold ${
              guardian.is_verified
                ? "text-green-600"
                : "text-yellow-600"
            }`}
          >
            {guardian.is_verified
              ? "✓ Verified"
              : "⏳ Pending"}
          </p>
        </div>

        {/* Availability */}
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs text-gray-500">
            Availability
          </p>

          <p
            className={`mt-1 text-sm font-bold ${
              guardian.available
                ? "text-green-600"
                : "text-gray-500"
            }`}
          >
            {guardian.available
              ? "● Available"
              : "○ Unavailable"}
          </p>
        </div>

        {/* Rescues */}
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs text-gray-500">
            Rescues Completed
          </p>

          <p className="mt-1 text-lg font-bold text-gray-900">
            {guardian.total_rescues}
          </p>
        </div>

        {/* Experience */}
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs text-gray-500">
            Experience
          </p>

          <p className="mt-1 truncate text-sm font-semibold text-gray-900">
            {guardian.experience || "Not added"}
          </p>
        </div>
      </div>

      {/* Verification message */}
      {!guardian.is_verified && (
        <div className="mt-4 rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-800">
          <p className="font-semibold">
            Guardian verification pending
          </p>

          <p className="mt-1">
            Your Guardian profile has been submitted.
            Verification will be completed before you
            receive rescue assignments.
          </p>
        </div>
      )}

      {/* Future management */}
      <button
        disabled
        className="mt-4 w-full cursor-not-allowed rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-400"
      >
        Guardian Settings — Coming Next
      </button>
    </div>
  );
}