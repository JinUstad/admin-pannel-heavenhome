"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Mail, Phone, Calendar, Loader2, Eye, Clock, X, Trash2 } from "lucide-react";

interface ContactMessage {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  message: string;
  created_at: string;
}

export default function ContactsPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  useEffect(() => {
    fetchMessages();

    // Set up real-time subscription for new messages and deletions
    const channel = supabase
      .channel('public:contact_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contact_messages' },
        (payload) => {
          setMessages((prev) => [payload.new as ContactMessage, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'contact_messages' },
        (payload) => {
          setMessages((prev) => prev.filter(msg => msg.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    
    try {
      // Optimistic update
      setMessages((prev) => prev.filter(msg => msg.id !== id));
      
      const { error } = await supabase
        .from("contact_messages")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message. Please try again.");
      // If error, fetch messages again to restore state
      fetchMessages();
    }
  };

  const filteredMessages = messages.filter(
    (msg) =>
      msg.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
            Contact Messages
          </h1>
          <p className="text-gray-400 mt-1">Manage and view messages from your customers</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <div className="text-sm text-gray-400">
          Total messages: <span className="text-emerald-400 font-medium">{filteredMessages.length}</span>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-[#262626] border-b border-[#333]">
              <tr>
                <th className="px-6 py-4 font-medium">Customer Info</th>
                <th className="px-6 py-4 font-medium">Contact Details</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Date & Time</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
                    <p className="mt-4 text-gray-400">Loading messages...</p>
                  </td>
                </tr>
              ) : filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <Mail className="h-12 w-12 text-[#333] mb-3" />
                      <p>No messages found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMessages.map((msg) => {
                  const date = new Date(msg.created_at);
                  const dateString = date.toLocaleDateString();
                  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <tr key={msg.id} className="hover:bg-[#262626]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{msg.first_name} {msg.last_name}</div>
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          <span>{msg.email}</span>
                        </div>
                        {msg.phone && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{msg.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col text-gray-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{dateString}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="text-xs">{timeString}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedMessage(msg)}
                            className="text-emerald-400 hover:text-emerald-300 transition-colors p-2 rounded-lg hover:bg-emerald-400/10"
                            title="View full message"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(msg.id)}
                            className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-400/10"
                            title="Delete message"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Message Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#333]">
              <h3 className="text-lg font-bold text-white">Contact Details</h3>
              <button 
                onClick={() => setSelectedMessage(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 text-gray-300 max-h-[70vh] overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0a0a0a] p-4 rounded-lg border border-[#333]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Name</p>
                  <p className="font-medium text-white">{selectedMessage.first_name} {selectedMessage.last_name}</p>
                </div>
                <div className="bg-[#0a0a0a] p-4 rounded-lg border border-[#333]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Email</p>
                  <p className="font-medium text-white flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {selectedMessage.email}
                  </p>
                </div>
                {selectedMessage.phone && (
                  <div className="bg-[#0a0a0a] p-4 rounded-lg border border-[#333] sm:col-span-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Phone</p>
                    <p className="font-medium text-white flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {selectedMessage.phone}
                    </p>
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Message</p>
                <div className="bg-[#0a0a0a] p-4 rounded-lg border border-[#333] leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#333] bg-[#0a0a0a] flex justify-end gap-3">
              <button 
                onClick={() => {
                  handleDelete(selectedMessage.id);
                  setSelectedMessage(null);
                }}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
              <button 
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-lg transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
