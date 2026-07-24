"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Archive,
  AlertTriangle,
  PackageCheck,
  Plus,
  Minus,
  Search,
  RefreshCw,
  Edit3,
  X,
  CheckCircle2,
  Boxes,
  TrendingUp,
  AlertOctagon,
  Warehouse,
  ArrowRight,
  PlusCircle,
  Building2,
  Store,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Pagination State (10 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Storeroom Entry Modal State
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [entryStoreroomQty, setEntryStoreroomQty] = useState("");
  const [entryShopQty, setEntryShopQty] = useState("");

  // Transfer Modal State
  const [transferProduct, setTransferProduct] = useState<any | null>(null);
  const [transferQty, setTransferQty] = useState("");

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchInventory = async () => {
    setFetching(true);
    try {
      const [catsRes, prodsRes] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false })
      ]);

      if (catsRes.data) setCategories(catsRes.data);
      if (prodsRes.data) {
        // Fallback for storeroom_stock if column is missing or null
        const sanitized = prodsRes.data.map(p => ({
          ...p,
          storeroom_stock: p.storeroom_stock ?? 0,
          stock: p.stock ?? 0,
          sold: p.sold ?? 0
        }));
        setProducts(sanitized);
      }
    } catch (e) {
      console.error("Error loading inventory:", e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Quick Inline Adjustments
  const handleQuickAdjust = async (product: any, field: "storeroom_stock" | "stock", delta: number) => {
    const currentVal = product[field] || 0;
    const newVal = Math.max(0, currentVal + delta);
    setUpdatingId(product.id);

    const updatePayload: any = { [field]: newVal };
    const { error } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", product.id);

    setUpdatingId(null);

    if (error) {
      alert(`Failed to update ${field}: ` + error.message);
    } else {
      setProducts(prev =>
        prev.map(p => (p.id === product.id ? { ...p, [field]: newVal } : p))
      );
      showNotification(`Updated ${field === "storeroom_stock" ? "Storeroom" : "Shop"} stock for "${product.title}" to ${newVal}`);
    }
  };

  // Storeroom Entry Form Handler (Add new shipment to Storeroom / Shop)
  const handleInsertStoreroomStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert("Please select a product.");
      return;
    }

    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const addedStoreroom = parseInt(entryStoreroomQty) || 0;
    const addedShop = parseInt(entryShopQty) || 0;

    if (addedStoreroom === 0 && addedShop === 0) {
      alert("Please enter a valid stock quantity for Storeroom or Shop.");
      return;
    }

    const newStoreroomStock = (prod.storeroom_stock || 0) + addedStoreroom;
    const newShopStock = (prod.stock || 0) + addedShop;

    setUpdatingId(prod.id);

    const { error } = await supabase
      .from("products")
      .update({
        storeroom_stock: newStoreroomStock,
        stock: newShopStock
      })
      .eq("id", prod.id);

    setUpdatingId(null);

    if (error) {
      alert("Error inserting stock: " + error.message);
    } else {
      setProducts(prev =>
        prev.map(p => (p.id === prod.id ? { ...p, storeroom_stock: newStoreroomStock, stock: newShopStock } : p))
      );
      showNotification(`Successfully added stock for "${prod.title}"! (Storeroom: +${addedStoreroom}, Shop: +${addedShop})`);
      setIsEntryModalOpen(false);
      setSelectedProductId("");
      setEntryStoreroomQty("");
      setEntryShopQty("");
    }
  };

  // Transfer Stock from Storeroom -> Shop
  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProduct) return;

    const qty = parseInt(transferQty);
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity to transfer.");
      return;
    }

    if (qty > (transferProduct.storeroom_stock || 0)) {
      alert(`Cannot transfer ${qty} units. Storeroom only has ${transferProduct.storeroom_stock || 0} units.`);
      return;
    }

    const newStoreroom = (transferProduct.storeroom_stock || 0) - qty;
    const newShop = (transferProduct.stock || 0) + qty;

    setUpdatingId(transferProduct.id);

    const { error } = await supabase
      .from("products")
      .update({
        storeroom_stock: newStoreroom,
        stock: newShop
      })
      .eq("id", transferProduct.id);

    setUpdatingId(null);

    if (error) {
      alert("Error transferring stock: " + error.message);
    } else {
      setProducts(prev =>
        prev.map(p => (p.id === transferProduct.id ? { ...p, storeroom_stock: newStoreroom, stock: newShop } : p))
      );
      showNotification(`Transferred ${qty} units of "${transferProduct.title}" from Storeroom to Shop Floor.`);
      setTransferProduct(null);
      setTransferQty("");
    }
  };

  const getPrimaryImage = (imageUrlStr?: string) => {
    if (!imageUrlStr) return null;
    try {
      if (imageUrlStr.startsWith("[")) {
        const parsed = JSON.parse(imageUrlStr);
        return parsed[0] || null;
      }
    } catch (e) {}
    return imageUrlStr;
  };

  // Metrics summary
  const totalProducts = products.length;
  const totalStoreroomUnits = products.reduce((acc, p) => acc + (p.storeroom_stock || 0), 0);
  const totalShopUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalAllUnits = totalStoreroomUnits + totalShopUnits;
  const totalSoldUnits = products.reduce((acc, p) => acc + (p.sold || 0), 0);
  const lowShopStockCount = products.filter(p => p.stock > 0 && p.stock < 10).length;
  const outOfStockCount = products.filter(p => (p.stock || 0) === 0 && (p.storeroom_stock || 0) === 0).length;

  // Filtered products list
  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categories?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "ALL" || p.category_id === selectedCategory;

    let matchesStatus = true;
    if (statusFilter === "IN_STOCK") matchesStatus = (p.stock || 0) >= 10;
    if (statusFilter === "LOW_STOCK") matchesStatus = (p.stock || 0) > 0 && (p.stock || 0) < 10;
    if (statusFilter === "OUT_OF_STOCK") matchesStatus = (p.stock || 0) === 0;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate Pagination Slicing (10 items per page)
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedInventory = filteredProducts.slice(startIndex, endIndex);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400/30 animate-bounce">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Warehouse className="h-8 w-8 text-emerald-400" />
            Storeroom & Inventory Management
          </h2>
          <p className="text-gray-400 mt-1 text-sm">
            Insert new storeroom stock, transfer units to active shop inventory, and monitor total stock.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEntryModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg font-semibold text-sm"
          >
            <PlusCircle className="h-4 w-4" />
            Insert Storeroom Stock
          </button>
          <button
            onClick={fetchInventory}
            disabled={fetching}
            className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#262626] text-gray-300 hover:text-white px-3.5 py-2.5 rounded-xl border border-[#333] transition-colors text-sm font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#121212] border border-[#262626] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium uppercase tracking-wider">
            Total Catalog
            <Boxes className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{totalProducts}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Unique products</div>
          </div>
        </div>

        <div className="bg-[#121212] border border-[#262626] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium uppercase tracking-wider">
            Storeroom Stock
            <Building2 className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-purple-400">{totalStoreroomUnits}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Units in godown</div>
          </div>
        </div>

        <div className="bg-[#121212] border border-[#262626] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium uppercase tracking-wider">
            Shop Display Stock
            <Store className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400">{totalShopUnits}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Ready for sale</div>
          </div>
        </div>

        <div className="bg-[#121212] border border-[#262626] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium uppercase tracking-wider">
            Low Shop Alerts
            <AlertTriangle className="h-4 w-4 text-orange-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-orange-400">{lowShopStockCount}</div>
            <div className="text-[11px] text-orange-400/70 mt-0.5">&lt; 10 units on shop</div>
          </div>
        </div>

        <div className="bg-[#121212] border border-[#262626] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium uppercase tracking-wider">
            Total Sold
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-blue-400">{totalSoldUnits}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Units fulfilled</div>
          </div>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-[#121212] border border-[#262626] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search title or category..."
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="flex items-center bg-[#1a1a1a] p-1 rounded-lg border border-[#333]">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === "ALL" ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              All ({products.length})
            </button>
            <button
              onClick={() => setStatusFilter("IN_STOCK")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === "IN_STOCK" ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              In Shop
            </button>
            <button
              onClick={() => setStatusFilter("LOW_STOCK")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === "LOW_STOCK" ? "bg-orange-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Low Shop ({lowShopStockCount})
            </button>
            <button
              onClick={() => setStatusFilter("OUT_OF_STOCK")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === "OUT_OF_STOCK" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Out of Shop
            </button>
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory & Storeroom Table */}
      <div className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a1a1a] border-b border-[#262626]">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> Storeroom Stock
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  <Store className="h-3.5 w-3.5 inline mr-1" /> Shop Stock (Active)
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Stock</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sold</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {fetching ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-400 mb-2" />
                    Loading storeroom inventory...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No matching products found.
                  </td>
                </tr>
              ) : (
                paginatedInventory.map(product => {
                  const storeroomQty = product.storeroom_stock || 0;
                  const shopQty = product.stock || 0;
                  const totalQty = storeroomQty + shopQty;
                  const primaryImg = getPrimaryImage(product.image_url);

                  const isLowShop = shopQty > 0 && shopQty < 10;
                  const isOutShop = shopQty === 0;

                  return (
                    <tr key={product.id} className="hover:bg-[#1a1a1a]/60 transition-colors">
                      {/* Product details */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-lg bg-[#262626] overflow-hidden flex items-center justify-center border border-[#333] shrink-0">
                            {primaryImg ? (
                              <img src={primaryImg} alt={product.title} className="h-full w-full object-cover" />
                            ) : (
                              <Boxes className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{product.title}</div>
                            <div className="text-xs text-gray-500 font-mono">
                              ID: {product.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        <span className="bg-[#1a1a1a] px-2.5 py-1 rounded border border-[#333] text-xs font-medium text-gray-300">
                          {product.categories?.name || "Uncategorized"}
                        </span>
                      </td>

                      {/* Storeroom Stock Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-purple-400">
                            {storeroomQty} <span className="text-xs font-normal text-gray-500">units</span>
                          </span>
                          <div className="flex items-center bg-[#1a1a1a] border border-[#333] rounded p-0.5 ml-2">
                            <button
                              onClick={() => handleQuickAdjust(product, "storeroom_stock", -5)}
                              disabled={storeroomQty <= 0 || updatingId === product.id}
                              className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                              title="Minus 5 from Storeroom"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleQuickAdjust(product, "storeroom_stock", 10)}
                              disabled={updatingId === product.id}
                              className="p-1 text-purple-400 hover:text-purple-300"
                              title="Add 10 to Storeroom"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Shop Stock Column (Active) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-extrabold ${isOutShop ? "text-red-500" : isLowShop ? "text-orange-400" : "text-emerald-400"}`}>
                            {shopQty} <span className="text-xs font-normal text-gray-500">units</span>
                          </span>
                          <div className="flex items-center bg-[#1a1a1a] border border-[#333] rounded p-0.5 ml-2">
                            <button
                              onClick={() => handleQuickAdjust(product, "stock", -1)}
                              disabled={shopQty <= 0 || updatingId === product.id}
                              className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                              title="Minus 1 from Shop"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleQuickAdjust(product, "stock", 1)}
                              disabled={updatingId === product.id}
                              className="p-1 text-emerald-400 hover:text-emerald-300"
                              title="Add 1 to Shop"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Total Stock Combined */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">
                        {totalQty} units
                      </td>

                      {/* Sold */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-300">
                        {product.sold || 0}
                      </td>

                      {/* Action Buttons */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          {/* Transfer Storeroom -> Shop */}
                          <button
                            onClick={() => {
                              setTransferProduct(product);
                              setTransferQty("");
                            }}
                            disabled={storeroomQty <= 0}
                            className="bg-[#1a1a1a] hover:bg-purple-500/10 text-purple-400 border border-[#333] hover:border-purple-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-30"
                            title="Transfer stock from Storeroom to Shop Floor"
                          >
                            <ArrowRight className="h-3.5 w-3.5 text-purple-400" />
                            Move to Shop
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

        {/* PAGINATION CONTROLS (10 items per page) */}
        {filteredProducts.length > 0 && (
          <div className="p-4 border-t border-[#262626] bg-[#1a1a1a]/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <div>
              Showing <span className="font-bold text-white">{startIndex + 1}</span> to{" "}
              <span className="font-bold text-white">{Math.min(endIndex, filteredProducts.length)}</span> of{" "}
              <span className="font-bold text-white">{filteredProducts.length}</span> items
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

      {/* INSERT STOREROOM STOCK MODAL */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#262626] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsEntryModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-[#1a1a1a] border border-[#333]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                <Warehouse className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Insert New Storeroom Stock</h3>
                <p className="text-xs text-gray-400">Add new incoming stock shipment received into your warehouse.</p>
              </div>
            </div>

            <form onSubmit={handleInsertStoreroomStock} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Select Product</label>
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">-- Choose Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} (Current Storeroom: {p.storeroom_stock || 0}, Shop: {p.stock || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-purple-400 mb-1">
                    + Storeroom Qty (Godown)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={entryStoreroomQty}
                    onChange={e => setEntryStoreroomQty(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-2 text-white font-bold focus:outline-none focus:border-purple-500 text-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-emerald-400 mb-1">
                    + Shop Floor Qty (Direct)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={entryShopQty}
                    onChange={e => setEntryShopQty(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-2 text-white font-bold focus:outline-none focus:border-emerald-500 text-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="w-1/2 bg-[#1a1a1a] hover:bg-[#262626] text-gray-300 text-sm font-semibold py-2.5 rounded-xl border border-[#333]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingId !== null}
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Save Stock Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL (Storeroom -> Shop) */}
      {transferProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#262626] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setTransferProduct(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-[#1a1a1a] border border-[#333]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                <ArrowRight className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Transfer Stock to Shop Floor</h3>
                <p className="text-xs text-gray-400">{transferProduct.title}</p>
              </div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-4 mb-4 flex items-center justify-between text-xs">
              <div>
                <div className="text-gray-400">Storeroom Available</div>
                <div className="text-lg font-bold text-purple-400">{transferProduct.storeroom_stock || 0} units</div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-600" />
              <div className="text-right">
                <div className="text-gray-400">Current Shop Stock</div>
                <div className="text-lg font-bold text-emerald-400">{transferProduct.stock || 0} units</div>
              </div>
            </div>

            <form onSubmit={handleTransferStock} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Quantity to Transfer from Storeroom to Shop
                </label>
                <input
                  type="number"
                  min="1"
                  max={transferProduct.storeroom_stock || 0}
                  value={transferQty}
                  onChange={e => setTransferQty(e.target.value)}
                  placeholder={`Max ${transferProduct.storeroom_stock || 0}`}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-2.5 text-white text-lg font-bold focus:outline-none focus:border-purple-500"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferProduct(null)}
                  className="w-1/2 bg-[#1a1a1a] hover:bg-[#262626] text-gray-300 text-sm font-semibold py-2.5 rounded-xl border border-[#333]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
