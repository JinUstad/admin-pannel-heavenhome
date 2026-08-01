"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ListOrdered, Eye, Clock, User, Mail, Calendar, X, ChevronLeft, ChevronRight, Package, Phone, MapPin } from "lucide-react";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  
  // Modal state
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [fetchingItems, setFetchingItems] = useState(false);

  // Pagination State (10 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchOrders = async () => {
    setFetching(true);
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
      
    if (data) setOrders(data);
    setFetching(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleViewDetails = async (order: any) => {
    setSelectedOrder(order);
    setFetchingItems(true);
    
    // Fetch order items with product details
    const { data, error } = await supabase
      .from("order_items")
      .select(`
        *,
        products (
          title,
          image_url
        )
      `)
      .eq("order_id", order.id);
      
    if (data) setOrderItems(data);
    setFetchingItems(false);
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setOrderItems([]);
  };

  // Calculate Pagination Slicing
  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedOrders = orders.slice(startIndex, endIndex);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <ListOrdered className="h-8 w-8 text-emerald-400" />
            Orders Management
          </h2>
          <p className="text-gray-400 mt-2">View and manage all customer orders.</p>
        </div>
        <span className="text-xs text-gray-400 bg-[#121212] px-3 py-1.5 rounded-full border border-[#262626]">
          Total: {orders.length} Orders
        </span>
      </div>

      <div className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#1a1a1a] border-b border-[#262626]">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Total Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {fetching ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No orders found.</td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#1a1a1a]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                      {order.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm text-white font-medium">{order.users?.full_name || "Unknown Customer"}</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3" />
                          {order.users?.email || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 text-sm text-gray-300">
                          <Calendar className="h-3 w-3 text-gray-500" />
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-bold text-emerald-400">
                        ₹{Number(order.total_amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button 
                        onClick={() => handleViewDetails(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 rounded-lg text-xs font-semibold transition-colors border border-indigo-500/20"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {orders.length > 0 && (
          <div className="p-4 border-t border-[#262626] bg-[#1a1a1a]/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <div>
              Showing <span className="font-bold text-white">{startIndex + 1}</span> to{" "}
              <span className="font-bold text-white">{Math.min(endIndex, orders.length)}</span> of{" "}
              <span className="font-bold text-white">{orders.length}</span> orders
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

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-[#121212] border border-[#262626] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#262626]">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-emerald-400" />
                  Order Details
                </h3>
                <p className="text-xs text-gray-400 mt-1 font-mono">ID: {selectedOrder.id}</p>
              </div>
              <button 
                onClick={closeModal}
                className="p-2 bg-[#1a1a1a] hover:bg-[#262626] text-gray-400 hover:text-white rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              
              {/* Customer Info Box */}
              <div className="bg-[#1a1a1a] border border-[#262626] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Customer Information</p>
                  <p className="text-white font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-emerald-400" />
                    {selectedOrder.users?.full_name || "Unknown Customer"}
                  </p>
                  <p className="text-gray-400 text-sm flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-gray-500" />
                    {selectedOrder.users?.email || "N/A"}
                  </p>
                  <p className="text-gray-400 text-sm flex items-center gap-2 mt-1">
                    <Phone className="h-4 w-4 text-gray-500" />
                    {selectedOrder.users?.phone_number || "No phone provided"}
                  </p>
                  <p className="text-gray-400 text-sm flex items-start gap-2 mt-1">
                    <MapPin className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
                    <span>
                      {selectedOrder.users?.address 
                        ? `${selectedOrder.users.address}${selectedOrder.users.pincode ? ` - ${selectedOrder.users.pincode}` : ''}`
                        : "No address provided"}
                    </span>
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Order Time</p>
                  <p className="text-gray-300 text-sm flex items-center sm:justify-end gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(selectedOrder.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-gray-400 text-xs flex items-center sm:justify-end gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {new Date(selectedOrder.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Items Ordered</h4>
                <div className="border border-[#262626] rounded-xl overflow-hidden bg-[#0a0a0a]">
                  {fetchingItems ? (
                    <div className="p-8 text-center text-gray-400 text-sm">Fetching items...</div>
                  ) : orderItems.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No items found for this order.</div>
                  ) : (
                    <ul className="divide-y divide-[#262626]">
                      {orderItems.map((item, index) => (
                        <li key={index} className="p-4 flex flex-col sm:flex-row gap-4 items-center">
                          <div className="w-16 h-16 bg-[#1a1a1a] rounded-lg border border-[#262626] flex-shrink-0 overflow-hidden relative">
                            {item.products?.image_url ? (
                              <img src={item.products.image_url} alt={item.products.title} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="h-6 w-6 text-gray-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                            )}
                          </div>
                          <div className="flex-1 text-center sm:text-left">
                            <p className="text-white font-medium text-sm line-clamp-2">
                              {item.products?.title || "Unknown Product"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Product ID: {item.product_id.substring(0,8)}...</p>
                          </div>
                          <div className="text-center sm:text-right">
                            <p className="text-gray-400 text-xs">Qty: <span className="text-white font-bold">{item.quantity}</span></p>
                            <p className="text-emerald-400 font-bold text-sm mt-1">₹{Number(item.price).toFixed(2)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Order Total Summary */}
              <div className="flex justify-end pt-2">
                <div className="bg-[#1a1a1a] border border-[#262626] px-6 py-4 rounded-xl min-w-[250px]">
                  <div className="flex justify-between items-center text-sm text-gray-400 mb-2">
                    <span>Subtotal</span>
                    <span>₹{Number(selectedOrder.total_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-400 mb-4 pb-4 border-b border-[#262626]">
                    <span>Shipping</span>
                    <span className="text-emerald-400 font-medium">Free</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span className="text-white">Total</span>
                    <span className="text-emerald-400">₹{Number(selectedOrder.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
