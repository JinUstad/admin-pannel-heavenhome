"use client";

import { useState, useEffect } from "react";
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

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
    if (!e.target.files) return;
    let selectedFiles = Array.from(e.target.files);
    
    if (selectedFiles.length > 5) {
      alert("Maximum 5 images allowed per product (Flipkart style). Selecting the first 5 images.");
      selectedFiles = selectedFiles.slice(0, 5);
    }
    
    // Check 2MB size limit
    const oversizedFiles = selectedFiles.filter(file => file.size > 2 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert(`The following file(s) exceed the 2MB size limit:\n${oversizedFiles.map(f => f.name).join(', ')}\n\nPlease choose images smaller than 2MB.`);
      e.target.value = "";
      return;
    }
    
    setImageFiles(selectedFiles);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !categoryId) return;
    setLoading(true);

    let uploadedUrls: string[] = [];

    // Compress & Upload new images if selected
    if (imageFiles.length > 0) {
      try {
        const uploadPromises = imageFiles.map(async (file) => {
          // Target compression: 50 KB - 100 KB (0.08 MB)
          const options = {
            maxSizeMB: 0.08,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
          };
          const compressedFile = await imageCompression(file, options);

          const fileExt = compressedFile.name.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("products")
            .upload(fileName, compressedFile);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("products")
            .getPublicUrl(fileName);

          return publicUrl;
        });

        uploadedUrls = await Promise.all(uploadPromises);
      } catch (err: any) {
        alert("Error compressing/uploading image(s): " + err.message);
        setLoading(false);
        return;
      }
    }

    // Combine existing and newly uploaded images
    const allImages = imageFiles.length > 0 
      ? uploadedUrls 
      : (existingImages.length > 0 ? existingImages : ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"]);

    // Store as JSON string array if multiple, or single string for backward compatibility
    const finalImageUrlStr = allImages.length === 1 ? allImages[0] : JSON.stringify(allImages);

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
    setImageFiles([]);
    setExistingImages([]);
    setEditingId(null);
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setTitle(product.title || "");
    setDescription(product.description || "");
    setPrice(product.price ? product.price.toString() : "");
    setStock(product.stock ? product.stock.toString() : "0");
    setCategoryId(product.category_id || "");
    setImageFiles([]);
    
    // Parse existing images
    if (product.image_url) {
      try {
        if (product.image_url.startsWith("[")) {
          setExistingImages(JSON.parse(product.image_url));
        } else {
          setExistingImages([product.image_url]);
        }
      } catch (e) {
        setExistingImages([product.image_url]);
      }
    } else {
      setExistingImages([]);
    }
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

  // Helper to parse image display
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

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Product Images <span className="text-xs text-indigo-400 font-semibold">(Up to 5 Images like Flipkart, Max 2MB each)</span>
              </label>
              <div className="space-y-3">
                <label className="flex cursor-pointer bg-[#1a1a1a] border border-[#333] hover:border-indigo-500 border-dashed rounded-lg px-4 py-3 text-center transition-colors">
                  <div className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-indigo-400 w-full">
                    <Upload className="h-5 w-5" />
                    <span className="text-sm">
                      {imageFiles.length > 0 
                        ? `${imageFiles.length} of 5 image(s) selected` 
                        : "Click to select up to 5 images (Auto 50-100KB compressed)"}
                    </span>
                  </div>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {/* Selected File Previews (up to 5 slots) */}
                {imageFiles.length > 0 ? (
                  <div className="flex items-center gap-2 pt-1">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const file = imageFiles[idx];
                      return (
                        <div key={idx} className="h-14 w-14 rounded-md overflow-hidden bg-[#262626] border border-[#333] flex items-center justify-center relative">
                          {file ? (
                            <>
                              <img src={URL.createObjectURL(file)} alt={`Slot ${idx + 1}`} className="h-full w-full object-cover" />
                              <span className="absolute bottom-0 right-0 bg-indigo-600 text-white text-[9px] font-bold px-1">{idx + 1}</span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-600 font-medium">#{idx + 1}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : existingImages.length > 0 ? (
                  <div className="flex items-center gap-2 pt-1">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const imgUrl = existingImages[idx];
                      return (
                        <div key={idx} className="h-14 w-14 rounded-md overflow-hidden bg-[#262626] border border-[#333] flex items-center justify-center relative">
                          {imgUrl ? (
                            <>
                              <img src={imgUrl} alt={`Existing ${idx + 1}`} className="h-full w-full object-cover" />
                              <span className="absolute bottom-0 right-0 bg-indigo-600 text-white text-[9px] font-bold px-1">{idx + 1}</span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-600 font-medium">#{idx + 1}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
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
