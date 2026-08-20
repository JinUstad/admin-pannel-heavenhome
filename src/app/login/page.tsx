"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // If already logged in, immediately redirect to dashboard
  useEffect(() => {
    const hasAuthCookie = document.cookie
      .split("; ")
      .some((row) => row.startsWith("admin_auth=true"));
    if (hasAuthCookie) {
      router.replace("/");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // Attempt real Supabase Auth login
    let authError: any = null;
    try {
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        authError = error;
      }
    } catch (err) {
      // Supabase client fallback
      authError = err;
    }

    // Hardcoded fallback credentials for fail-safe admin access
    const isHardcodedAdmin = 
      email.trim().toLowerCase() === "heavenhome@gmail.com" && 
      password.trim() === "Heaven@321";
    
    if (!authError || isHardcodedAdmin) {
      // Set secure auth cookie with 24 hours expiry
      document.cookie = "admin_auth=true; path=/; max-age=86400; SameSite=Lax";
      localStorage.setItem("admin_email", email.trim());
      
      // Redirect to admin panel
      window.location.href = "/";
    } else {
      setLoading(false);
      setError(authError?.message || "Invalid email or password. Please check your credentials.");
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md bg-[#121212] p-8 rounded-2xl border border-[#262626] shadow-2xl">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-500 p-0.5 mb-4 shadow-lg shadow-emerald-950/40 flex items-center justify-center">
            <div className="w-full h-full bg-[#121212] rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Heaven Jewels Admin</h1>
          <p className="text-gray-400 text-xs mt-1 text-center">
            Enter your admin credentials to access the management dashboard
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-medium text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#181818] border border-[#2e2e2e] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              placeholder="admin@heavenhome.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#181818] border border-[#2e2e2e] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                placeholder="••••••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-black" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Dashboard</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
