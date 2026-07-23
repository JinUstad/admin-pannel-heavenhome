"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Tags, Trash2 } from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchCategories = async () => {
    setFetching(true);
    const { data, error } = await supabase.from("categories").select("*").order("created_at", { ascending: false });
    if (!error && data) {
      setCategories(data);
    }
    setFetching(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    const { error } = await supabase.from("categories").insert([{ name }]);
    setLoading(false);
    if (!error) {
      setName("");
      fetchCategories();
    } else {
      alert("Error adding category: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This might delete associated products.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (!error) {
      fetchCategories();
    } else {
      alert("Error deleting category");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Tags className="h-8 w-8 text-indigo-400" />
            Categories
          </h2>
          <p className="text-gray-400 mt-2">Manage product categories for your store.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 h-fit">
          <h3 className="text-lg font-medium text-white mb-4">Add New Category</h3>
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">
                Category Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder="e.g. Living Room Furniture"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? "Adding..." : <><Plus className="h-4 w-4" /> Add Category</>}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 bg-[#121212] border border-[#262626] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[#262626]">
            <h3 className="text-lg font-medium text-white">Existing Categories</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a1a1a] border-b border-[#262626]">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {fetching ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400">Loading categories...</td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400">No categories found. Add one to get started.</td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className="hover:bg-[#1a1a1a]/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {category.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(category.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => handleDelete(category.id)}
                          className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-md hover:bg-red-400/10"
                          title="Delete Category"
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
