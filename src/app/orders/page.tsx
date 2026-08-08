"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ListOrdered, 
  Eye, 
  Clock, 
  User, 
  Mail, 
  Calendar, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Package, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  CalendarDays, 
  Printer, 
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Copy,
  Check
} from "lucide-react";

interface OrderUser {
  full_name?: string;
  email?: string;
  phone_number?: string;
  address?: string;
  pincode?: string;
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  products?: {
    title: string;
    image_url?: string;
  };
}

interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  confirmed_at?: string;
  created_at: string;
  users?: OrderUser;
}

type TabType = "all" | "pending" | "completed";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("all");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterPreset, setDateFilterPreset] = useState<"all" | "today" | "week" | "month">("all");

  // Order Details Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [fetchingItems, setFetchingItems] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchOrders = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          users (
            full_name,
            email,
            phone_number,
            address,
            pincode
          )
        `)
        .order("created_at", { ascending: false });

      if (data) {
        // Normalise status (if status is null, treat as pending)
        const normalized = data.map((o: any) => ({
          ...o,
          status: o.status ? o.status.toLowerCase() : "pending"
        }));
        setOrders(normalized);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Quick Date Preset Handler
  const handleDatePresetChange = (preset: "all" | "today" | "week" | "month") => {
    setDateFilterPreset(preset);
    const now = new Date();

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "today") {
      const todayStr = now.toISOString().split("T")[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      setStartDate(weekAgo.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(monthStart.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    }
    setCurrentPage(1);
  };

  // Open Details Modal & Fetch Items
  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    setFetchingItems(true);

    try {
      const { data } = await supabase
        .from("order_items")
        .select(`
          *,
          products (
            title,
            image_url
          )
        `)
        .eq("order_id", order.id);

      if (data) {
        setOrderItems(data);
      } else {
        setOrderItems([]);
      }
    } catch (err) {
      console.error("Error fetching order items:", err);
      setOrderItems([]);
    } finally {
      setFetchingItems(false);
    }
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setOrderItems([]);
  };

  // Confirm Order Action (Moves from Pending to Completed)
  const handleConfirmOrder = async (orderId: string) => {
    setConfirmingId(orderId);
    try {
      const confirmedAt = new Date().toISOString();
      
      // Try updating with confirmed_at timestamp
      let updateRes = await supabase
        .from("orders")
        .update({ 
          status: "completed",
          confirmed_at: confirmedAt
        })
        .eq("id", orderId);

      // If failed (e.g., confirmed_at column does not exist yet), try updating only status
      if (updateRes.error) {
        console.warn("Retrying with only status column...", updateRes.error);
        updateRes = await supabase
          .from("orders")
          .update({ 
            status: "completed"
          })
          .eq("id", orderId);
      }

      if (!updateRes.error) {
        // Optimistic UI Update
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, status: "completed", confirmed_at: confirmedAt }
              : o
          )
        );

        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev) =>
            prev ? { ...prev, status: "completed", confirmed_at: confirmedAt } : null
          );
        }
      } else {
        const errorMsg = updateRes.error.message || updateRes.error.details || JSON.stringify(updateRes.error);
        alert(`Could not update order status in Supabase: ${errorMsg}\n\nPlease make sure to run the SQL in Supabase SQL Editor to add the 'status' column.`);
        console.error("Order confirmation error:", updateRes.error);
      }
    } catch (err: any) {
      console.error("Failed to confirm order:", err);
      alert(`Error: ${err?.message || "Failed to confirm order"}`);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Orders Logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Tab Status Filter
      const isPending = order.status === "pending" || !order.status;
      const isCompleted = order.status === "completed" || order.status === "confirmed";

      if (activeTab === "pending" && !isPending) return false;
      if (activeTab === "completed" && !isCompleted) return false;

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchId = order.id.toLowerCase().includes(query);
        const matchName = order.users?.full_name?.toLowerCase().includes(query) || false;
        const matchEmail = order.users?.email?.toLowerCase().includes(query) || false;
        const matchPhone = order.users?.phone_number?.toLowerCase().includes(query) || false;
        const matchPincode = order.users?.pincode?.toLowerCase().includes(query) || false;

        if (!matchId && !matchName && !matchEmail && !matchPhone && !matchPincode) {
          return false;
        }
      }

      // 3. Date Calendar Range Filter
      if (startDate || endDate) {
        const orderDateStr = new Date(order.created_at).toISOString().split("T")[0];
        if (startDate && orderDateStr < startDate) return false;
        if (endDate && orderDateStr > endDate) return false;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery, startDate, endDate]);

  // Tab Counts & Stats
  const totalCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === "pending" || !o.status).length;
  const completedCount = orders.filter((o) => o.status === "completed" || o.status === "confirmed").length;

  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [orders]);

  const completedRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status === "completed" || o.status === "confirmed")
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [orders]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto relative space-y-6">
      
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ListOrdered className="h-7 w-7" />
            </div>
            Orders Management
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Track customer payments, review order items, and confirm pending orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#161616] hover:bg-[#202020] text-gray-300 hover:text-white border border-[#262626] rounded-xl text-xs font-semibold transition-all shadow-sm"
            title="Refresh Orders"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${fetching ? "animate-spin text-emerald-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Orders Card */}
        <div 
          onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-[#141814] border-emerald-500/50 shadow-lg shadow-emerald-950/30"
              : "bg-[#121212] border-[#262626] hover:border-[#383838]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Orders</span>
            <Package className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{totalCount}</span>
            <span className="text-xs text-gray-400 font-medium">₹{totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Pending Orders Card */}
        <div 
          onClick={() => { setActiveTab("pending"); setCurrentPage(1); }}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "pending"
              ? "bg-[#1f180e] border-amber-500/50 shadow-lg shadow-amber-950/30"
              : "bg-[#121212] border-[#262626] hover:border-[#383838]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              Pending Confirmation
            </span>
            <AlertCircle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-amber-400">{pendingCount}</span>
            <span className="text-xs text-amber-400/70 font-medium">Action Required</span>
          </div>
        </div>

        {/* Completed Orders Card */}
        <div 
          onClick={() => { setActiveTab("completed"); setCurrentPage(1); }}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "completed"
              ? "bg-[#0e1a14] border-emerald-500/50 shadow-lg shadow-emerald-950/30"
              : "bg-[#121212] border-[#262626] hover:border-[#383838]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Completed Orders</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-emerald-400">{completedCount}</span>
            <span className="text-xs text-emerald-400/70 font-medium">₹{completedRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-[#262626] pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "all"
              ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
              : "bg-[#141414] text-gray-400 hover:text-white border border-[#262626]"
          }`}
        >
          <span>Total Orders</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === "all" ? "bg-black/20 text-black" : "bg-[#262626] text-gray-300"
          }`}>
            {totalCount}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab("pending"); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "pending"
              ? "bg-amber-400 text-black shadow-md shadow-amber-400/20"
              : "bg-[#141414] text-amber-400 hover:text-amber-300 border border-amber-500/30"
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span>Pending Orders</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === "pending" ? "bg-black/20 text-black" : "bg-amber-500/20 text-amber-300"
          }`}>
            {pendingCount}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab("completed"); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "completed"
              ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
              : "bg-[#141414] text-emerald-400 hover:text-emerald-300 border border-emerald-500/30"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Completed Orders</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === "completed" ? "bg-black/20 text-black" : "bg-emerald-500/20 text-emerald-300"
          }`}>
            {completedCount}
          </span>
        </button>
      </div>

      {/* FILTER & DATE CONTROLS BAR */}
      <div className="bg-[#121212] border border-[#262626] p-4 rounded-2xl space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by Order ID, Name, Email, Phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-[#181818] border border-[#2b2b2b] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Calendar & Date Range Pickers */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            
            {/* Quick Date Presets */}
            <div className="flex items-center gap-1 bg-[#181818] border border-[#2b2b2b] p-1 rounded-xl">
              {(["all", "today", "week", "month"] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleDatePresetChange(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    dateFilterPreset === preset
                      ? "bg-emerald-500 text-black shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {preset === "all" ? "All Time" : preset === "today" ? "Today" : preset === "week" ? "Last 7 Days" : "This Month"}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            <div className="flex items-center gap-2 bg-[#181818] border border-[#2b2b2b] px-3 py-1.5 rounded-xl">
              <CalendarDays className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateFilterPreset("all");
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-white focus:outline-none [color-scheme:dark]"
              />
              <span className="text-gray-500 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateFilterPreset("all");
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-white focus:outline-none [color-scheme:dark]"
              />
            </div>

            {/* Clear Filters */}
            {(startDate || endDate || searchQuery) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStartDate("");
                  setEndDate("");
                  setDateFilterPreset("all");
                  setCurrentPage(1);
                }}
                className="p-2 hover:bg-[#202020] text-gray-400 hover:text-white rounded-xl border border-[#2b2b2b] text-xs transition-colors"
                title="Clear Filters"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ORDERS LIST TABLE */}
      <div className="bg-[#121212] border border-[#262626] rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#161616] border-b border-[#262626] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer & Contact</th>
                <th className="px-6 py-4">Order Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Total Amount</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e] text-sm">
              {fetching ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mb-2"></div>
                    <p className="text-xs">Loading orders...</p>
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-base font-semibold text-gray-400">No orders found</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {activeTab === "pending"
                        ? "Great job! All pending orders have been confirmed."
                        : activeTab === "completed"
                        ? "No completed orders matching your filters."
                        : "No orders match the current criteria."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const isPending = order.status === "pending" || !order.status;
                  const isCompleted = order.status === "completed" || order.status === "confirmed";

                  return (
                    <tr key={order.id} className="hover:bg-[#181818] transition-colors">
                      {/* Order ID */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-400 bg-[#1a1a1a] px-2 py-1 rounded border border-[#2b2b2b]">
                            #{order.id.substring(0, 8)}
                          </span>
                          <button
                            onClick={() => handleCopyOrderId(order.id)}
                            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
                            title="Copy full Order ID"
                          >
                            {copiedId === order.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-white font-semibold flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-emerald-400" />
                            {order.users?.full_name || "Guest Customer"}
                          </span>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                            {order.users?.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-gray-500" />
                                {order.users.email}
                              </span>
                            )}
                            {order.users?.phone_number && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-gray-500" />
                                {order.users.phone_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col text-xs">
                          <span className="flex items-center gap-1.5 text-gray-300 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-gray-500" />
                            {new Date(order.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                          <span className="flex items-center gap-1 text-gray-500 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                            Pending Confirmation
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Completed
                          </span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-emerald-400">
                          ₹{Number(order.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          
                          {/* Confirm Order Button for Pending Orders */}
                          {isPending && (
                            <button
                              onClick={() => handleConfirmOrder(order.id)}
                              disabled={confirmingId === order.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg text-xs transition-all shadow-md hover:scale-105 disabled:opacity-50"
                              title="Confirm Order"
                            >
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                              <span>{confirmingId === order.id ? "Confirming..." : "Confirm"}</span>
                            </button>
                          )}

                          {/* View Details Button */}
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#282828] text-gray-300 hover:text-white border border-[#333] rounded-lg text-xs font-semibold transition-colors"
                            title="View Products & Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Details</span>
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

        {/* PAGINATION BAR */}
        {filteredOrders.length > 0 && (
          <div className="p-4 border-t border-[#262626] bg-[#141414] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <div>
              Showing <span className="font-bold text-white">{startIndex + 1}</span> to{" "}
              <span className="font-bold text-white">{Math.min(startIndex + ITEMS_PER_PAGE, filteredOrders.length)}</span> of{" "}
              <span className="font-bold text-white">{filteredOrders.length}</span> orders
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-[#202020] hover:bg-[#2a2a2a] text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors border border-[#2b2b2b]"
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
                          ? "bg-emerald-500 text-black shadow-md font-bold"
                          : "bg-[#202020] text-gray-400 hover:bg-[#2a2a2a] hover:text-white border border-[#2b2b2b]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-[#202020] hover:bg-[#2a2a2a] text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors border border-[#2b2b2b]"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAILED ORDER & PRODUCT INSPECTION MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={closeModal}></div>
          <div className="relative bg-[#121212] border border-[#2b2b2b] rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl animate-fade-in overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#262626] bg-[#161616]">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-emerald-400" />
                    Order Details & Inspection
                  </h3>
                  {selectedOrder.status === "pending" ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      Pending Confirmation
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      Completed
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 font-mono">
                  Order ID: {selectedOrder.id}
                </p>
              </div>

              <button 
                onClick={closeModal}
                className="p-2 bg-[#1f1f1f] hover:bg-[#2b2b2b] text-gray-400 hover:text-white rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              
              {/* Customer & Delivery Information */}
              <div className="bg-[#181818] border border-[#262626] p-5 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Customer Details</p>
                  <p className="text-white font-bold text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-emerald-400" />
                    {selectedOrder.users?.full_name || "Guest Customer"}
                  </p>
                  <p className="text-gray-300 text-xs flex items-center gap-2 mt-1.5">
                    <Mail className="h-3.5 w-3.5 text-gray-500" />
                    {selectedOrder.users?.email || "No email provided"}
                  </p>
                  <p className="text-gray-300 text-xs flex items-center gap-2 mt-1.5">
                    <Phone className="h-3.5 w-3.5 text-gray-500" />
                    {selectedOrder.users?.phone_number || "No phone provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Delivery Address</p>
                  <div className="flex items-start gap-2 text-xs text-gray-300">
                    <MapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <p className="font-medium text-white">{selectedOrder.users?.address || "No delivery address"}</p>
                      {selectedOrder.users?.pincode && (
                        <p className="text-gray-400 mt-1">Pincode: <span className="text-white font-mono">{selectedOrder.users.pincode}</span></p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Ordered List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Ordered Products ({orderItems.length})
                  </h4>
                  <span className="text-xs text-gray-500">Inspect product specifications & quantity</span>
                </div>

                <div className="border border-[#262626] rounded-2xl overflow-hidden bg-[#0e0e0e]">
                  {fetchingItems ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400 mb-2"></div>
                      <p className="text-xs">Fetching product specifications...</p>
                    </div>
                  ) : orderItems.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">No items found for this order.</div>
                  ) : (
                    <ul className="divide-y divide-[#1e1e1e]">
                      {orderItems.map((item, index) => (
                        <li key={index} className="p-4 flex flex-col sm:flex-row gap-4 items-center hover:bg-[#141414] transition-colors">
                          <div className="w-16 h-16 bg-[#1a1a1a] rounded-xl border border-[#2b2b2b] flex-shrink-0 overflow-hidden relative">
                            {item.products?.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.products.image_url} alt={item.products.title} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="h-6 w-6 text-gray-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                            )}
                          </div>
                          
                          <div className="flex-1 text-center sm:text-left space-y-1">
                            <p className="text-white font-semibold text-sm">
                              {item.products?.title || "Custom Home Decor Product"}
                            </p>
                            <p className="text-[11px] text-gray-500 font-mono">Product ID: {item.product_id}</p>
                          </div>

                          <div className="text-center sm:text-right">
                            <p className="text-xs text-gray-400">
                              Qty: <span className="text-white font-bold">{item.quantity}</span> × ₹{Number(item.price).toFixed(2)}
                            </p>
                            <p className="text-emerald-400 font-bold text-sm mt-0.5">
                              ₹{(Number(item.price) * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Order Financial Summary */}
              <div className="bg-[#181818] border border-[#262626] p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-gray-400 space-y-1">
                  <p>Placed on: <span className="text-white font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</span></p>
                  {selectedOrder.confirmed_at && (
                    <p className="text-emerald-400">Confirmed on: <span className="font-medium">{new Date(selectedOrder.confirmed_at).toLocaleString()}</span></p>
                  )}
                </div>

                <div className="w-full sm:w-auto text-right">
                  <div className="flex justify-between sm:justify-end items-center gap-6 text-xs text-gray-400 mb-1">
                    <span>Delivery Shipping:</span>
                    <span className="text-emerald-400 font-semibold">FREE</span>
                  </div>
                  <div className="flex justify-between sm:justify-end items-center gap-6 text-lg font-bold">
                    <span className="text-white">Total Paid:</span>
                    <span className="text-emerald-400 text-xl font-bold">
                      ₹{Number(selectedOrder.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="p-6 border-t border-[#262626] bg-[#161616] flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#202020] hover:bg-[#2b2b2b] text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-[#2e2e2e] w-full sm:w-auto justify-center"
              >
                <Printer className="h-4 w-4" />
                <span>Print Order Slip</span>
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={closeModal}
                  className="px-5 py-2.5 bg-[#202020] hover:bg-[#2b2b2b] text-gray-400 hover:text-white rounded-xl text-xs font-semibold transition-colors w-full sm:w-auto"
                >
                  Close
                </button>

                {selectedOrder.status === "pending" && (
                  <button
                    onClick={() => handleConfirmOrder(selectedOrder.id)}
                    disabled={confirmingId === selectedOrder.id}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-950/40 hover:scale-105 disabled:opacity-50 w-full sm:w-auto"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>{confirmingId === selectedOrder.id ? "Confirming Order..." : "Confirm This Order"}</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
