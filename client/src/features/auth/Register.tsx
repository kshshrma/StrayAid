import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { createProfile } from "../../services/profile/createProfile";
import { Heart, User, Mail, Lock, Sparkles } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.user) {
        // Try creating profile record
        try {
          await createProfile({
            id: data.user.id,
            full_name: fullName.trim(),
            phone: "",
            city: "",
            role: "citizen",
          });
        } catch (profErr) {
          console.log("Profile insert skipped or handled by trigger:", profErr);
        }

        // Check if session was created automatically
        if (data.session) {
          alert(`Welcome to StrayAid, ${fullName}! Your account has been registered.`);
          navigate("/");
          return;
        }
      }

      alert("Registration successful! Please sign in with your account credentials.");
      navigate("/login");
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err?.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 space-y-6 border border-slate-100">
        
        {/* Header Branding */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
            <Heart size={28} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Join StrayAid
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Register to help stray animals & access local lost & found alerts
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <User size={18} />
              </span>
              <input
                type="text"
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Mail size={18} />
              </span>
              <input
                type="email"
                placeholder="name@example.com"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type="password"
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type="password"
                placeholder="Re-enter your password"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              "Creating Account..."
            ) : (
              <>
                <Sparkles size={16} /> Complete Registration
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs font-medium text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-bold text-emerald-600 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}