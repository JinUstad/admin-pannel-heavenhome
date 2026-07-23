"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Package, Plus, Trash2, Image as ImageIcon, Upload, Edit2, X, Check } from "lucide-react";
import imageCompression from "browser-image-compression";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Image state: previews hold { type, src, file? }
  // type = 'existing' (already uploaded URL) or 'new' (local File)
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

  // When user picks file(s), ACCUMULATE them into imagePreviews (don't replace)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files);

    // Validate each file individually (< 2MB)
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
      // Reset file input so same file can be picked again
      e.target.value = "";
      return;
    }

    // How many slots left?
    const currentCount = imagePreviews.length;
    const remainingSlots = 5 - currentCount;

    if (remainingSlots <= 0) {
      alert("Maximum 5 images allowed per product. Remove an image first.");
      e.target.value = "";
      return;
    }

    const filesToAdd = validFiles.slice(0, remainingSlots);
    if (validFiles.length > remainingSlots) {
      alert(`Only ${remainingSlots} slot(s) available. Added first ${filesToAdd.length} image(s).`);
    }

    // Create preview entries
    const newPreviews = filesToAdd.map(file => ({
      type: "new" as const,
      src: URL.createObjectURL(file),
      file,
    }));

    setImagePreviews(prev => [...prev, ...newPreviews]);

    // Reset file input value so the same file can be selected again if needed
    e.target.value = "";
  };

  // Remove an image (existing or new) by index
  const removeImage = (index: number) => {
    setImagePreviews(prev => {
      const item = prev[index];
      // Revoke object URL if it was a local file preview
      if (item.type === "new" && item.src.startsWith("blob:")) {
        URL.revokeObjectURL(item.src);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !categoryId) return;
    setLoading(true);

    const finalUrls: string[] = [];

    for (const item of imagePreviews) {
      if (item.type === "existing") {
        // Already-uploaded URL, keep as is
        finalUrls.push(item.src);
      } else if (item.type === "new" && item.file) {
        // Compress & upload new file
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

    // If no images at all, use placeholder
    if (finalUrls.length === 0) {
      finalUrls.push("https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80");
    }

    // Store as JSON array string if multiple, or single string for backward compatibility
    const finalImageUrlStr = finalUrls.length === 1 ? finalUrls[0] : JSON.stringify(finalUrls);

    const productPayload = {
      title,
      description,
      price: parseFloat(price),
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
    setDescription("");
    setPrice("");
    setStock("");
    setCategoryId("");
    // Revoke all blob URLs
    imagePreviews.forEach(item => {
      if (item.type === "new" && item.src.startsWith("blob:")) {
        URL.revokeObjectURL(item.src);
      }
    });
    setImagePreviews([]);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setTitle(product.title || "");
    setDescription(product.description || "");
    setPrice(product.price ? product.price.toString() : "");
    setStock(product.stock ? product.stock.toString() : "0");
    setCategoryId(product.category_id || "");

    // Parse existing images into previews
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

  // Helper to parse primary image display in table
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

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8 text-indigo-400" />
            Products
          </h2>
          <p className="text-gray-400 mt-2">Manage products, pricing, and multi-image inventory.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">
              {editingId ? "Edit Product" : "Add New Product"}
            </h3>
            {editingId && (
              <button 
                onClick={resetForm}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 bg-[#1a1a1a] px-2 py-1 rounded border border-[#333]"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
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
                <label className="block text-sm font-medium text-gray-400 mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Stock Initial</label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* IMAGE UPLOAD SECTION */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Product Images <span className="text-xs text-indigo-400 font-semibold">(Up to 5 Images, Each &lt; 2MB)</span>
              </label>
              <div className="space-y-3">
                {/* Upload Button — only show if less than 5 images */}
                {imagePreviews.length < 5 && (
                  <label className="flex cursor-pointer bg-[#1a1a1a] border border-[#333] hover:border-indigo-500 border-dashed rounded-lg px-4 py-3 text-center transition-colors">
                    <div className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-indigo-400 w-full">
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
                    />
                  </label>
                )}

                {imagePreviews.length >= 5 && (
                  <div className="text-xs text-green-400 font-medium text-center py-2 bg-green-400/10 rounded-lg border border-green-400/20">
                    ✓ All 5 image slots filled. Remove an image to add a different one.
                  </div>
                )}

                {/* 5-Slot Preview Grid */}
                <div className="flex items-center gap-3 pt-2">
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const item = imagePreviews[idx];

                    return (
                      <div key={idx} className="h-16 w-16 rounded-lg bg-[#262626] border border-[#333] flex items-center justify-center relative group overflow-visible">
                        {item ? (
                          <>
                            <img 
                              src={item.src} 
                              alt={`Image ${idx + 1}`} 
                              className="h-full w-full object-cover rounded-lg" 
                            />
                            {/* Slot number badge */}
                            <span className="absolute bottom-0.5 right-0.5 bg-indigo-600/90 text-white text-[9px] font-bold px-1 rounded">
                              #{idx + 1}
                            </span>
                            {/* Red X remove button — always visible */}
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

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? (editingId ? "Saving..." : "Adding...") : (
                editingId ? <><Check className="h-4 w-4" /> Save Product Changes</> : <><Plus className="h-4 w-4" /> Add Product</>
              )}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 bg-[#121212] border border-[#262626] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[#262626]">
            <h3 className="text-lg font-medium text-white">Product Catalog</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a1a1a] border-b border-[#262626]">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {fetching ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Loading products...</td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No products found.</td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const primaryImg = getPrimaryImage(product.image_url);
                    return (
                      <tr key={product.id} className={`hover:bg-[#1a1a1a]/50 transition-colors ${editingId === product.id ? 'bg-indigo-500/10' : ''}`}>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          ${parseFloat(product.price).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleEdit(product)}
                              className="text-indigo-400 hover:text-indigo-300 transition-colors p-2 rounded-md hover:bg-indigo-400/10"
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
      </div>
    </div>
  );
}
