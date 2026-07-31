"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Package, Plus, Trash2, Image as ImageIcon, Upload, Edit2, X, Check, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import imageCompression from "browser-image-compression";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pagination State (10 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Form State
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [descriptionRows, setDescriptionRows] = useState<string[]>([""]); // Row-wise description

  // Image state: previews hold { type, src, file? }
  const [imagePreviews, setImagePreviews] = useState<
    { type: "existing" | "new"; src: string; file?: File }[]
  >([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setFetching(true);
    try {
      const [catsRes, prodsRes] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false })
      ]);
      
      if (catsRes.data) setCategories(catsRes.data);
      if (prodsRes.data) setProducts(prodsRes.data);
    } catch (e) {
      console.error("Error fetching admin data:", e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files);

    const validFiles: File[] = [];
    const rejectedNames: string[] = [];

    selectedFiles.forEach(file => {
      if (file.size > 2 * 1024 * 1024) {
        rejectedNames.push(`${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
      } else {
        validFiles.push(file);
      }
    });

    if (rejectedNames.length > 0) {
      alert(`Skipped file(s) exceeding 2MB limit (each image must be < 2MB):\n\n${rejectedNames.join('\n')}`);
    }

    if (validFiles.length === 0) {
      e.target.value = "";
      return;
    }

    const currentCount = imagePreviews.length;
    const remainingSlots = 5 - currentCount;

    if (remainingSlots <= 0) {
      alert("Maximum 5 images allowed per product. Remove an image first.");
      e.target.value = "";
      return;
    }

    const filesToAdd = validFiles.slice(0, remainingSlots);
    const newPreviews = filesToAdd.map(file => ({
      type: "new" as const,
      src: URL.createObjectURL(file),
      file,
    }));

    setImagePreviews(prev => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => {
      const item = prev[index];
      if (item.type === "new" && item.src.startsWith("blob:")) {
        URL.revokeObjectURL(item.src);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Description Rows Handlers
  const handleAddDescRow = () => setDescriptionRows([...descriptionRows, ""]);
  const handleDescRowChange = (index: number, value: string) => {
    const newRows = [...descriptionRows];
    newRows[index] = value;
    setDescriptionRows(newRows);
  };
  const handleRemoveDescRow = (index: number) => {
    setDescriptionRows(descriptionRows.filter((_, i) => i !== index));
  };

  const calculateDiscountBadge = (actualPrice: string, mrpPrice: string, customDisc: string) => {
    if (customDisc.trim()) return customDisc.trim();
    const p = parseFloat(actualPrice);
    const op = parseFloat(mrpPrice);
    if (op && p && op > p) {
      const pct = Math.round(((op - p) / op) * 100);
      return `${pct}% OFF`;
    }
    return "";
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !categoryId) return;
    setLoading(true);

    const finalUrls: string[] = [];

    for (const item of imagePreviews) {
      if (item.type === "existing") {
        finalUrls.push(item.src);
      } else if (item.type === "new" && item.file) {
        try {
          const options = {
            maxSizeMB: 0.08,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
          };
          const compressedFile = await imageCompression(item.file, options);

          const fileExt = compressedFile.name.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("products")
            .upload(fileName, compressedFile);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("products")
            .getPublicUrl(fileName);

          finalUrls.push(publicUrl);
        } catch (err: any) {
          alert("Error uploading image: " + err.message);
          setLoading(false);
          return;
        }
      }
    }

    if (finalUrls.length === 0) {
      finalUrls.push("https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80");
    }

    const finalImageUrlStr = finalUrls.length === 1 ? finalUrls[0] : JSON.stringify(finalUrls);
    const finalDiscount = calculateDiscountBadge(price, oldPrice, discount);
    
    // Join valid description rows with newlines
    const finalDescription = descriptionRows.filter(r => r.trim() !== "").join("\n");

    const productPayload = {
      title,
      description: finalDescription,
      price: parseFloat(price),
      old_price: oldPrice ? parseFloat(oldPrice) : null,
      discount: finalDiscount || null,
      stock: parseInt(stock) || 0,
      category_id: categoryId,
      image_url: finalImageUrlStr
    };

    if (editingId) {
      const { error } = await supabase.from("products").update(productPayload).eq("id", editingId);
      setLoading(false);
      if (!error) {
        resetForm();
        fetchData();
      } else {
        alert("Error updating product: " + error.message);
      }
    } else {
      const { error } = await supabase.from("products").insert([productPayload]);
      setLoading(false);
      if (!error) {
        resetForm();
        fetchData();
      } else {
        alert("Error adding product: " + error.message);
      }
    }
  };

  const resetForm = () => {
    setTitle("");
    setPrice("");
    setOldPrice("");
    setDiscount("");
    setStock("");
    setCategoryId("");
    setDescriptionRows([""]);
    imagePreviews.forEach(item => {
      if (item.type === "new" && item.src.startsWith("blob:")) {
        URL.revokeObjectURL(item.src);
      }
    });
    setImagePreviews([]);
    setEditingId(null);
    setIsModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setTitle(product.title || "");
    setPrice(product.price ? product.price.toString() : "");
    setOldPrice(product.old_price ? product.old_price.toString() : "");
    setDiscount(product.discount || "");
    setStock(product.stock ? product.stock.toString() : "0");
    setCategoryId(product.category_id || "");
    
    // Parse description into rows
    if (product.description) {
      setDescriptionRows(product.description.split("\n"));
    } else {
      setDescriptionRows([""]);
    }

    const existingPreviews: { type: "existing" | "new"; src: string }[] = [];
    if (product.image_url) {
      try {
        if (product.image_url.startsWith("[")) {
          const parsed = JSON.parse(product.image_url);
          parsed.forEach((url: string) => {
            existingPreviews.push({ type: "existing", src: url });
          });
        } else {
          existingPreviews.push({ type: "existing", src: product.image_url });
        }
      } catch (e) {
        existingPreviews.push({ type: "existing", src: product.image_url });
      }
    }
    setImagePreviews(existingPreviews);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) {
      if (editingId === id) resetForm();
      fetchData();
    } else {
      alert("Error deleting product");
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

  // Calculate Pagination Slicing
  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProducts = products.slice(startIndex, endIndex);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8 text-emerald-400" />
            Products
          </h2>
          <p className="text-gray-400 mt-2">Manage products, pricing, discounts, and multi-image inventory.</p>
        </div>
      </div>

      <div className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-medium text-white">Product Catalog</h3>
              <span className="text-xs text-gray-400 bg-[#1a1a1a] px-3 py-1 rounded-full border border-[#333]">
                Total: {products.length} Products
              </span>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-md text-sm"
            >
              <Plus className="h-4 w-4" /> Add New Product
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a1a1a] border-b border-[#262626]">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Price / MRP</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Discount</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {fetching ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading products...</td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No products found.</td>
                  </tr>
                ) : (
                  paginatedProducts.map((product) => {
                    const primaryImg = getPrimaryImage(product.image_url);
                    const discText = product.discount || (product.old_price && product.price < product.old_price ? `${Math.round(((product.old_price - product.price) / product.old_price) * 100)}% OFF` : null);

                    return (
                      <tr key={product.id} className={`hover:bg-[#1a1a1a]/50 transition-colors ${editingId === product.id ? 'bg-emerald-500/10' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-md bg-[#262626] overflow-hidden flex items-center justify-center border border-[#333]">
                              {primaryImg ? (
                                <img src={primaryImg} alt={product.title} className="h-full w-full object-cover" />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-gray-500" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{product.title}</div>
                              <div className="text-xs text-gray-500">Stock: {product.stock}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {product.categories?.name || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex flex-col">
                            <span className="text-green-400 font-bold">₹{parseFloat(product.price).toFixed(2)}</span>
                            {product.old_price && (
                              <span className="text-xs text-gray-500 line-through">₹{parseFloat(product.old_price).toFixed(2)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {discText ? (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-xs font-bold">
                              <Tag className="w-3 h-3" />
                              {discText}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleEdit(product)}
                              className="text-emerald-400 hover:text-emerald-300 transition-colors p-2 rounded-md hover:bg-emerald-400/10"
                              title="Edit Product"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(product.id)}
                              className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-md hover:bg-red-400/10"
                              title="Delete Product"
                            >
                              <Trash2 className="h-4 w-4" />
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

        {/* PAGINATION CONTROLS (10 items per page) */}
        {products.length > 0 && (
          <div className="p-4 border-t border-[#262626] bg-[#1a1a1a]/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <div>
              Showing <span className="font-bold text-white">{startIndex + 1}</span> to{" "}
              <span className="font-bold text-white">{Math.min(endIndex, products.length)}</span> of{" "}
              <span className="font-bold text-white">{products.length}</span> products
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

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#121212] border border-[#262626] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#262626] shrink-0">
              <h3 className="text-xl font-bold text-white">
                {editingId ? "Edit Product" : "Add New Product"}
              </h3>
              <button 
                onClick={resetForm}
                className="text-gray-400 hover:text-white transition-colors bg-[#1a1a1a] p-2 rounded-lg border border-[#333]"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="overflow-y-auto p-6 flex-grow custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. Stainless Steel Bottle"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Selling Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold text-green-400"
                        placeholder="e.g. 2500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Original MRP (₹) <span className="text-[10px] text-gray-500">(Strikethrough)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={oldPrice}
                        onChange={(e) => setOldPrice(e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-gray-400 line-through focus:outline-none focus:border-emerald-500"
                        placeholder="e.g. 5000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Discount Badge <span className="text-[10px] text-emerald-400">(Auto)</span>
                      </label>
                      <input
                        type="text"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-amber-400 font-medium focus:outline-none focus:border-emerald-500 text-sm"
                        placeholder={oldPrice && price ? `${calculateDiscountBadge(price, oldPrice, '')}` : "e.g. 50% OFF"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Stock Initial</label>
                      <input
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                        placeholder="10"
                      />
                    </div>
                  </div>

                  {/* DYNAMIC ROWS / DESCRIPTION */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-400">
                        Description (Row by Row)
                      </label>
                      <button
                        type="button"
                        onClick={handleAddDescRow}
                        className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/30 flex items-center gap-1 transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Add Row
                      </button>
                    </div>
                    
                    <div className="space-y-3 mt-3">
                      {descriptionRows.length === 0 && (
                        <div className="text-center py-4 bg-[#1a1a1a] rounded-lg border border-[#333] border-dashed text-sm text-gray-500">
                          No description added. Click "Add Row" to start adding details.
                        </div>
                      )}
                      {descriptionRows.map((row, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="flex-grow">
                            <input
                              type="text"
                              value={row}
                              onChange={(e) => handleDescRowChange(index, e.target.value)}
                              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 text-sm"
                              placeholder="e.g. 100% Stainless Steel"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDescRow(index)}
                            className="bg-[#1a1a1a] border border-[#333] hover:border-red-500 text-gray-400 hover:text-red-500 p-2 rounded-lg transition-colors shrink-0"
                            title="Delete row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* IMAGE UPLOAD SECTION */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Product Images <span className="text-xs text-emerald-400 font-semibold">(Up to 5, &lt; 2MB)</span>
                    </label>
                    <div className="space-y-3">
                      {imagePreviews.length < 5 && (
                        <label className="flex cursor-pointer bg-[#1a1a1a] border border-[#333] hover:border-emerald-500 border-dashed rounded-lg px-4 py-3 text-center transition-colors">
                          <div className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-emerald-400 w-full">
                            <Upload className="h-5 w-5" />
                            <span className="text-sm">
                              {imagePreviews.length > 0 
                                ? `${imagePreviews.length}/5 images added — Click to add more` 
                                : "Click to select image (Max 2MB each)"}
                            </span>
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            multiple
                          />
                        </label>
                      )}

                      {imagePreviews.length >= 5 && (
                        <div className="text-xs text-green-400 font-medium text-center py-2 bg-green-400/10 rounded-lg border border-green-400/20">
                          ✓ All 5 image slots filled.
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-2 overflow-x-auto pb-2">
                        {Array.from({ length: 5 }).map((_, idx) => {
                          const item = imagePreviews[idx];
                          return (
                            <div key={idx} className="h-16 w-16 rounded-lg bg-[#262626] border border-[#333] flex items-center justify-center relative group overflow-visible shrink-0">
                              {item ? (
                                <>
                                  <img 
                                    src={item.src} 
                                    alt={`Image ${idx + 1}`} 
                                    className="h-full w-full object-cover rounded-lg" 
                                  />
                                  <span className="absolute bottom-0.5 right-0.5 bg-emerald-600/90 text-white text-[9px] font-bold px-1 rounded">
                                    #{idx + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      removeImage(idx);
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-125 z-30 border-2 border-[#121212]"
                                    title="Remove this image"
                                  >
                                    <X className="h-3 w-3 stroke-[3]" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-gray-600 font-medium">#{idx + 1}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-[#262626] shrink-0 bg-[#121212] rounded-b-xl">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 rounded-lg font-medium text-gray-300 hover:text-white bg-[#1a1a1a] hover:bg-[#262626] transition-colors border border-[#333]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProduct}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-8 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md"
              >
                {loading ? (editingId ? "Saving..." : "Adding...") : (
                  editingId ? <><Check className="h-4 w-4" /> Save Changes</> : <><Plus className="h-4 w-4" /> Create Product</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}} />
    </div>
  );
}

