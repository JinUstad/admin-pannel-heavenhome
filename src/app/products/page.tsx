"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Package, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Upload, 
  Edit2, 
  X, 
  Check, 
  Tag, 
  ChevronLeft, 
  ChevronRight,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Eye,
  FileText,
  Sparkles
} from "lucide-react";
import imageCompression from "browser-image-compression";
import { convertToWebP } from "@/lib/imageWebp";

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
  const [description, setDescription] = useState("");
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");

  // Image state: previews hold { type, src, file? }
  const [imagePreviews, setImagePreviews] = useState<
    { type: "existing" | "new"; src: string; file?: File }[]
  >([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Rich Text Editor Helpers
  const insertTextAtCursor = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previousText = textarea.value;
    const selectedText = previousText.substring(start, end);

    const replacement = `${prefix}${selectedText || "text"}${suffix}`;
    const newContent = previousText.substring(0, start) + replacement + previousText.substring(end);

    setDescription(newContent);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 4));
    }, 10);
  };

  // Convert rich text markdown to basic HTML for preview
  const renderFormattedPreview = (text: string) => {
    if (!text || !text.trim()) {
      return "<p class='text-gray-500 italic'>No description entered yet. Write product details, key features, material, specifications...</p>";
    }

    const lines = text.split("\n");
    const htmlLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "<div class='h-2'></div>";

      // Inline formatter
      const formatInline = (str: string) => {
        return str
          .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold text-white"><em class="italic text-gray-200">$1</em></strong>')
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
          .replace(/__(.*?)__/g, '<strong class="font-bold text-white">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic text-gray-300">$1</em>')
          .replace(/_(.*?)_/g, '<em class="italic text-gray-300">$1</em>')
          .replace(/`([^`]+)`/g, '<code class="bg-[#262626] text-emerald-300 text-xs px-1.5 py-0.5 rounded font-mono border border-[#333]">$1</code>')
          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-emerald-400 font-semibold underline hover:text-emerald-300">$1</a>');
      };

      if (trimmed.startsWith("### ")) {
        return `<h3 class="text-base font-bold text-white mt-4 mb-1">${formatInline(trimmed.slice(4))}</h3>`;
      }
      if (trimmed.startsWith("## ")) {
        return `<h2 class="text-lg font-bold text-emerald-400 mt-5 mb-2">${formatInline(trimmed.slice(3))}</h2>`;
      }
      if (trimmed.startsWith("# ")) {
        return `<h1 class="text-xl font-bold text-white mt-5 mb-2">${formatInline(trimmed.slice(2))}</h1>`;
      }
      if (trimmed.startsWith("> ")) {
        return `<blockquote class="border-l-4 border-emerald-500 pl-3 py-1.5 my-2.5 italic text-gray-300 bg-[#161616] rounded-r text-sm">${formatInline(trimmed.slice(2))}</blockquote>`;
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return `<li class="ml-4 list-disc text-gray-300 my-1 text-sm">${formatInline(trimmed.slice(2))}</li>`;
      }
      if (/^\d+\.\s/.test(trimmed)) {
        return `<li class="ml-4 list-decimal text-gray-300 my-1 text-sm">${formatInline(trimmed.replace(/^\d+\.\s/, ''))}</li>`;
      }

      return `<p class="my-1.5 text-gray-300 text-sm leading-relaxed">${formatInline(trimmed)}</p>`;
    });

    return htmlLines.join("");
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
    if (!title || !price || !categoryId) {
      alert("Please fill in Title, Price, and Category.");
      return;
    }
    setLoading(true);

    const finalUrls: string[] = [];

    for (const item of imagePreviews) {
      if (item.type === "existing") {
        finalUrls.push(item.src);
      } else if (item.type === "new" && item.file) {
        try {
          // Convert and compress strictly to WebP
          const webpFile = await convertToWebP(item.file, {
            maxSizeMB: 0.08,
            maxWidthOrHeight: 1200,
            quality: 0.85
          });

          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;

          const { error: uploadError } = await supabase.storage
            .from("products")
            .upload(fileName, webpFile, {
              contentType: "image/webp",
              upsert: true
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("products")
            .getPublicUrl(fileName);

          finalUrls.push(publicUrl);
        } catch (err: any) {
          alert("Error uploading WebP image: " + err.message);
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

    const productPayload = {
      title: title.trim(),
      description: description.trim(),
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
    setDescription("");
    setEditorTab("write");
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
    setDescription(product.description || "");
    setEditorTab("write");

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
      alert("Error deleting product: " + error.message);
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

  // Word & Character count helpers
  const wordCount = description.trim() ? description.trim().split(/\s+/).length : 0;
  const charCount = description.length;
  const estReadMin = Math.max(1, Math.ceil(wordCount / 180));

  // Calculate Pagination Slicing
  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProducts = products.slice(startIndex, endIndex);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Package className="h-7 w-7 text-emerald-400" />
            Products Inventory
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage your store's catalog, pricing, discounts, stock levels, and rich descriptions
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30 hover:scale-[1.02] shrink-0"
        >
          <Plus className="h-5 w-5" /> Add Product
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-[#121212] border border-[#262626] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262626] bg-[#1a1a1a]/70 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Product</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Selling Price</th>
                  <th className="py-4 px-6">Original MRP</th>
                  <th className="py-4 px-6">Discount</th>
                  <th className="py-4 px-6">Stock</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-sm">
                {fetching ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        Loading products catalog...
                      </div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      No products found. Click "Add Product" above to create your first item.
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((p) => {
                    const primaryImg = getPrimaryImage(p.image_url);
                    return (
                      <tr key={p.id} className="hover:bg-[#181818] transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-[#262626] overflow-hidden flex items-center justify-center shrink-0 border border-[#333]">
                              {primaryImg ? (
                                <img src={primaryImg} alt={p.title} className="h-full w-full object-cover" />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-gray-500" />
                              )}
                            </div>
                            <div className="max-w-[220px]">
                              <p className="font-semibold text-white truncate">{p.title}</p>
                              <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                                {p.description ? p.description.replace(/[#*`_>\[\]]/g, '') : "No description"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-300">
                          <span className="bg-[#1f1f1f] text-gray-300 text-xs px-2.5 py-1 rounded-md border border-[#333]">
                            {p.categories?.name || "Uncategorized"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-emerald-400 font-bold">
                          ₹{Number(p.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-gray-500 line-through">
                          {p.old_price ? `₹${Number(p.old_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                        </td>
                        <td className="py-4 px-6">
                          {p.discount ? (
                            <span className="bg-amber-500/10 text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-500/30">
                              {p.discount}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            (p.stock || 0) > 5 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                              : (p.stock || 0) > 0 
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}>
                            {p.stock ?? 0} in stock
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(p)}
                              className="text-gray-400 hover:text-emerald-400 transition-colors p-2 rounded-lg hover:bg-emerald-400/10"
                              title="Edit Product"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/10"
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

        {/* PAGINATION CONTROLS */}
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

      {/* Responsive Add / Edit Product Modal with Rich Text Editor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 lg:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#121212] border border-[#262626] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#262626] shrink-0 bg-[#151515] rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {editingId ? "Edit Product" : "Add New Product"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {editingId ? "Update details, pricing, images, and description" : "Fill out the fields below to create a new product"}
                  </p>
                </div>
              </div>
              <button 
                onClick={resetForm}
                className="text-gray-400 hover:text-white transition-colors bg-[#1e1e1e] hover:bg-[#262626] p-2 rounded-xl border border-[#333]"
                title="Close Modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable & Fully Responsive) */}
            <form onSubmit={handleSaveProduct} id="productForm" className="overflow-y-auto p-4 sm:p-6 lg:p-7 flex-grow custom-scrollbar space-y-6">
              
              {/* Row 1: Basic Information & Categorization */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Product Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                    placeholder="e.g. Minimalist Ceramic Vase or Solid Wood Coffee Table"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-[#181818] border border-[#2d2d2d] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Pricing, MRP, Discount, and Stock */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#161616] p-4 rounded-xl border border-[#262626]">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Selling Price (₹) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#333] rounded-xl px-3.5 py-2 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 text-sm"
                    placeholder="e.g. 2499"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Original MRP (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={oldPrice}
                    onChange={(e) => setOldPrice(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#333] rounded-xl px-3.5 py-2 text-gray-400 line-through focus:outline-none focus:border-emerald-500 text-sm"
                    placeholder="e.g. 4999"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Discount Badge</span>
                    <span className="text-[10px] text-emerald-400 lowercase">auto</span>
                  </label>
                  <input
                    type="text"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#333] rounded-xl px-3.5 py-2 text-amber-400 font-medium focus:outline-none focus:border-emerald-500 text-sm"
                    placeholder={oldPrice && price ? `${calculateDiscountBadge(price, oldPrice, '')}` : "e.g. 50% OFF"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#333] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    placeholder="e.g. 25"
                  />
                </div>
              </div>

              {/* Row 3: Product Images (Up to 5) */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Product Gallery Images <span className="text-gray-500 text-normal">(Max 5 images, &lt; 2MB each)</span></span>
                  <span className="text-xs text-emerald-400 font-semibold">{imagePreviews.length}/5 added</span>
                </label>
                
                <div className="space-y-3 bg-[#161616] p-4 rounded-xl border border-[#262626]">
                  {imagePreviews.length < 5 && (
                    <label className="flex cursor-pointer bg-[#1a1a1a] border border-[#333] hover:border-emerald-500/60 border-dashed rounded-xl px-4 py-3 text-center transition-colors group">
                      <div className="flex items-center justify-center gap-2 text-gray-400 group-hover:text-emerald-400 w-full">
                        <Upload className="h-4 w-4 shrink-0" />
                        <span className="text-xs font-medium">
                          {imagePreviews.length > 0 
                            ? `Add more images (${5 - imagePreviews.length} remaining)` 
                            : "Click or drag images to upload (JPEG, PNG, WebP)"}
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

                  {/* Thumbnail Row */}
                  <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-1">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const item = imagePreviews[idx];
                      return (
                        <div 
                          key={idx} 
                          className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-[#202020] border border-[#333] flex items-center justify-center relative group overflow-visible shrink-0 shadow-inner"
                        >
                          {item ? (
                            <>
                              <img 
                                src={item.src} 
                                alt={`Preview ${idx + 1}`} 
                                className="h-full w-full object-cover rounded-xl" 
                              />
                              <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                                #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeImage(idx);
                                }}
                                className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-30 border-2 border-[#121212]"
                                title="Remove image"
                              >
                                <X className="h-3 w-3 stroke-[3]" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-600 font-medium">Slot #{idx + 1}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 4: Rich Description & Specifications Editor (Replacing row-by-row) */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-emerald-400" />
                    Product Description & Specifications (Rich Editor)
                  </span>
                  <span className="text-[11px] text-gray-400">Supports Headings, Bold, Lists, Quotes & Links</span>
                </label>

                {/* Editor Container */}
                <div className="border border-[#262626] rounded-2xl overflow-hidden bg-[#181818] shadow-inner">
                  
                  {/* Toolbar */}
                  <div className="bg-[#141414] border-b border-[#262626] p-2 flex flex-wrap items-center justify-between gap-2">
                    
                    {/* Formatting Buttons */}
                    <div className="flex items-center flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => insertTextAtCursor("**", "**")}
                        title="Bold (**text**)"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
                      >
                        <Bold className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTextAtCursor("*", "*")}
                        title="Italic (*text*)"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
                      >
                        <Italic className="h-4 w-4" />
                      </button>
                      
                      <div className="w-[1px] h-4 bg-[#333] mx-1" />
                      
                      <button
                        type="button"
                        onClick={() => insertTextAtCursor("\n# ")}
                        title="Heading 1 (# Title)"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
                      >
                        <Heading1 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTextAtCursor("\n## ")}
                        title="Heading 2 (## Section)"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
                      >
                        <Heading2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTextAtCursor("\n### ")}
                        title="Heading 3 (### Sub-section)"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
                      >
                        <Heading3 className="h-4 w-4" />
                      </button>
                      
                      <div className="w-[1px] h-4 bg-[#333] mx-1" />
                      
                      <button
                        type="button"
                        onClick={() => insertTextAtCursor("\n- ")}
                        title="Bulleted List (- item)"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
                      >
                        <List className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTextAtCursor("\n1. ")}
                        title="Numbered List (1. item)"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
                      >
                        <ListOrdered className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTextAtCursor("\n> ")}
                        title="Quote / Highlight Note (> note)"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
                      >
                        <Quote className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTextAtCursor("[", "](https://)")}
                        title="Insert Link"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
                      >
                        <LinkIcon className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Mode Selector (Write vs Live Preview) */}
                    <div className="flex items-center bg-[#1e1e1e] p-0.5 rounded-lg border border-[#262626]">
                      <button
                        type="button"
                        onClick={() => setEditorTab("write")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                          editorTab === "write"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        Write
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorTab("preview")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
                          editorTab === "preview"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </button>
                    </div>

                  </div>

                  {/* Editor Content Area */}
                  {editorTab === "write" ? (
                    <textarea
                      ref={textareaRef}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Write your product description here... You can use headings (## Dimensions), bold (**100% Solid Oak**), bullet points (- Care: Wipe with dry cloth), quotes (> Luxury finish), etc."
                      className="w-full h-56 sm:h-64 p-4 bg-[#181818] text-gray-200 text-sm font-sans placeholder-gray-600 focus:outline-none resize-y leading-relaxed"
                    />
                  ) : (
                    <div 
                      className="w-full min-h-[14rem] sm:min-h-[16rem] p-4 sm:p-5 bg-[#141414] text-sm overflow-y-auto leading-relaxed border-t border-[#222]"
                      dangerouslySetInnerHTML={{ __html: renderFormattedPreview(description) }}
                    />
                  )}

                  {/* Status Bar */}
                  <div className="bg-[#121212] border-t border-[#262626] px-4 py-2 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span>Words: <strong className="text-gray-300 font-mono">{wordCount}</strong></span>
                      <span>Characters: <strong className="text-gray-300 font-mono">{charCount}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Est. Read: ~{estReadMin} min</span>
                    </div>
                  </div>

                </div>
              </div>

            </form>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#262626] shrink-0 bg-[#151515] rounded-b-2xl">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-gray-300 hover:text-white bg-[#202020] hover:bg-[#282828] transition-colors border border-[#333]"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="productForm"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-6 sm:px-8 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/40 disabled:opacity-50"
              >
                {loading ? (
                  editingId ? "Saving..." : "Creating..."
                ) : (
                  editingId ? <><Check className="h-4 w-4" /> Save Changes</> : <><Plus className="h-4 w-4" /> Create Product</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
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
