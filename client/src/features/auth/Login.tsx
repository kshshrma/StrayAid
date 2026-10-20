import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Heart, Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, RefreshCw } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes("failed to fetch")) {
          setError(
            "Unable to connect to Supabase backend (ERR_NAME_NOT_RESOLVED / Network Error). Your Supabase project may be paused due to inactivity, or the SUPABASE_URL in .env needs to be verified/updated."
          );
        } else {
          setError(signInError.message);
        }
        return;
      }

      navigate("/");
    } catch (err: any) {
      console.error("Login caught error:", err);
      const msg = err?.message || "Failed to sign in";
      if (msg.toLowerCase().includes("failed to fetch")) {
        setError(
          "Unable to reach the Supabase backend. Please check if your Supabase project is active or unpaused in your Supabase dashboard."
        );
      } else {
        setError(msg);
      }
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
            Welcome Back
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Sign in to manage reports, rescues, and community alerts
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          
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
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-11 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-medium text-rose-700 flex items-start gap-2.5">
              <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <p className="font-semibold text-rose-800">Connection / Authentication Issue</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Signing In...
              </>
            ) : (
              <>
                <LogIn size={16} /> Sign In
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs font-medium text-slate-500">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-bold text-emerald-600 hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}