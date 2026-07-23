"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Package, Plus, Trash2, Image as ImageIcon, Upload } from "lucide-react";
import imageCompression from "browser-image-compression";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const fetchData = async () => {
    setFetching(true);
    const [catsRes, prodsRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false })
    ]);
    
    if (catsRes.data) setCategories(catsRes.data);
    if (prodsRes.data) setProducts(prodsRes.data);
    setFetching(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !categoryId) return;
    setLoading(true);
    
    let finalImageUrl = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"; // fallback

    if (imageFile) {
      try {
        // Compress image
        const options = {
          maxSizeMB: 1, // Compress to ~1MB max
          maxWidthOrHeight: 1920, // Maintain reasonable dimensions
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(imageFile, options);

        // Upload to Supabase Storage
        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("products")
          .upload(fileName, compressedFile);

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("products")
          .getPublicUrl(fileName);
          
        finalImageUrl = publicUrl;
      } catch (err: any) {
        alert("Error uploading image: " + err.message);
        setLoading(false);
        return;
      }
    }

    const newProduct = {
      title,
      description,
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      category_id: categoryId,
      image_url: finalImageUrl
    };

    const { error } = await supabase.from("products").insert([newProduct]);
    setLoading(false);
    
    if (!error) {
      setTitle(""); setDescription(""); setPrice(""); setStock(""); setImageFile(null);
      // Reset file input by finding it (React refs are better but this works for simple forms)
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      fetchData();
    } else {
      alert("Error adding product: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) {
      fetchData();
    } else {
      alert("Error deleting product");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8 text-indigo-400" />
            Products
          </h2>
          <p className="text-gray-400 mt-2">Manage products, pricing, and stock.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 h-fit">
          <h3 className="text-lg font-medium text-white mb-4">Add New Product</h3>
          <form onSubmit={handleAddProduct} className="space-y-4">
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
              <label className="block text-sm font-medium text-gray-400 mb-1">Product Image</label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer bg-[#1a1a1a] border border-[#333] hover:border-indigo-500 border-dashed rounded-lg px-4 py-3 text-center transition-colors">
                  <div className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-indigo-400">
                    <Upload className="h-5 w-5" />
                    <span className="text-sm">{imageFile ? imageFile.name : "Click to upload image"}</span>
                  </div>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImageFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </label>
                {imageFile && (
                  <div className="h-16 w-16 shrink-0 rounded-md overflow-hidden bg-[#262626] border border-[#333]">
                    <img src={URL.createObjectURL(imageFile)} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
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
              {loading ? "Adding..." : <><Plus className="h-4 w-4" /> Add Product</>}
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
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-[#1a1a1a]/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-[#262626] overflow-hidden flex items-center justify-center border border-[#333]">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
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
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-md hover:bg-red-400/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
