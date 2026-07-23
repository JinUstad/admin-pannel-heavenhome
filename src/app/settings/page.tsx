"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Lock, Mail, ShieldCheck, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [userEmail, setUserEmail] = useState("Loading...");

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        setUserEmail(data.user.email);
      } else {
        const storedEmail = localStorage.getItem('admin_email');
        setUserEmail(storedEmail || "admin@heavenhome.com");
      }
    };
    fetchUser();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    // Assuming the user is logged in via Supabase Auth
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Password updated successfully!" });
      setNewPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your admin account and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
              Account Details
            </h3>
            <div className="flex flex-col items-center mb-6">
              <div className="h-20 w-20 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-2xl font-bold text-indigo-400 mb-4">
                AD
              </div>
              <h4 className="text-white font-medium">Administrator</h4>
              <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-1 rounded-full mt-2">Admin Role</span>
            </div>
            
            <div className="space-y-4 border-t border-[#262626] pt-4">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Email Address</p>
                <div className="flex items-center text-sm text-gray-300 bg-[#1a1a1a] p-2.5 rounded-lg border border-[#333]">
                  <Mail className="h-4 w-4 mr-2 text-gray-500" />
                  {userEmail}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security / Password Card */}
        <div className="md:col-span-2">
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Lock className="h-5 w-5 text-indigo-400" />
              Security
            </h3>
            <p className="text-sm text-gray-400 mb-6">Update your password to keep your account secure.</p>
            
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              {message.text && (
                <div className={`p-4 rounded-lg flex items-start gap-3 border ${
                  message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'
                }`}>
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{message.text}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-6 rounded-lg transition-colors shadow-lg shadow-indigo-900/20"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
