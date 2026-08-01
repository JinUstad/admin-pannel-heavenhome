"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Mail, Clock, ChevronLeft, ChevronRight } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  // Pagination State (10 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchUsers = async () => {
    setFetching(true);
    const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });
    if (data) setUsers(data);
    setFetching(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Calculate Pagination Slicing (10 items per page)
  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedUsers = users.slice(startIndex, endIndex);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-emerald-400" />
            Registered Users
          </h2>
          <p className="text-gray-400 mt-2">View all customers who have logged into your store.</p>
        </div>
        <span className="text-xs text-gray-400 bg-[#121212] px-3 py-1.5 rounded-full border border-[#262626]">
          Total: {users.length} Users
        </span>
      </div>

      <div className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a1a1a] border-b border-[#262626]">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">User ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Full Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Address & Pincode</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {fetching ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">No users found.</td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#1a1a1a]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                      {user.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-white font-medium">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {user.full_name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {user.phone_number || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate" title={user.address ? `${user.address} - ${user.pincode || ''}` : ''}>
                      {user.address ? `${user.address}${user.pincode ? ` (${user.pincode})` : ''}` : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Clock className="h-4 w-4 text-gray-500" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS (10 items per page) */}
        {users.length > 0 && (
          <div className="p-4 border-t border-[#262626] bg-[#1a1a1a]/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <div>
              Showing <span className="font-bold text-white">{startIndex + 1}</span> to{" "}
              <span className="font-bold text-white">{Math.min(endIndex, users.length)}</span> of{" "}
              <span className="font-bold text-white">{users.length}</span> users
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333] text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg font-semibold transition-colors ${
                        currentPage === pageNum
                          ? "bg-emerald-600 text-white shadow-md"
                          : "bg-[#262626] text-gray-400 hover:bg-[#333] hover:text-white"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333] text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

