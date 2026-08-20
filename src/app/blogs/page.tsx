"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  Calendar, 
  Clock, 
  User, 
  Image as ImageIcon, 
  Upload, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Eye, 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Quote, 
  Link as LinkIcon, 
  Sparkles,
  AlertCircle,
  FileText
} from "lucide-react";
import imageCompression from "browser-image-compression";
import { convertToWebP } from "@/lib/imageWebp";

interface Blog {
  id: string;
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  image_url?: string;
  author: string;
  category: string;
  published_at: string;
  created_at?: string;
}

const DEFAULT_CATEGORIES = [
  "Kitchen Essentials",
  "Jewellery"
];

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Form State
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("Heaven Jewels Team");
  const [category, setCategory] = useState("Kitchen Essentials");
  const [customCategory, setCustomCategory] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  
  // Image state & compression info
  const [imagePreview, setImagePreview] = useState<{
    type: "existing" | "new";
    src: string;
    file?: File;
    sizeKB?: number;
    compressedSizeKB?: number;
  } | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-select current date and time formatted for datetime-local
  const getNowDateTimeString = () => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
    return localISOTime;
  };

  const fetchBlogs = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .order("published_at", { ascending: false });

      if (error) {
        console.error("Error fetching blogs:", error);
      } else if (data) {
        setBlogs(data);
      }
    } catch (err) {
      console.error("Fetch blogs error:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const openCreateModal = () => {
    setEditingBlog(null);
    setTitle("");
    setAuthor("Heaven Jewels Team");
    setCategory("Kitchen Essentials");
    setCustomCategory("");
    setPublishedAt(getNowDateTimeString()); // Auto selected current date & time
    setExcerpt("");
    setContent("");
    setImagePreview(null);
    setEditorTab("write");
    setIsModalOpen(true);
  };

  const openEditModal = (blog: Blog) => {
    setEditingBlog(blog);
    setTitle(blog.title || "");
    setAuthor(blog.author || "Heaven Jewels Team");
    
    if (DEFAULT_CATEGORIES.includes(blog.category)) {
      setCategory(blog.category);
      setCustomCategory("");
    } else {
      setCategory("Other");
      setCustomCategory(blog.category || "");
    }

    // Format ISO string to datetime-local format
    if (blog.published_at) {
      try {
        const d = new Date(blog.published_at);
        const offsetMs = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
        setPublishedAt(localISOTime);
      } catch {
        setPublishedAt(getNowDateTimeString());
      }
    } else {
      setPublishedAt(getNowDateTimeString());
    }

    setExcerpt(blog.excerpt || "");
    setContent(blog.content || "");

    if (blog.image_url) {
      setImagePreview({
        type: "existing",
        src: blog.image_url
      });
    } else {
      setImagePreview(null);
    }

    setEditorTab("write");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBlog(null);
    setImagePreview(null);
  };

  // Image Upload and 50KB WebP Conversion Handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const originalSizeKB = file.size / 1024;
    setCompressing(true);

    try {
      // Convert to WebP under 50KB (maxSizeMB: 0.048)
      const webpFile = await convertToWebP(file, {
        maxSizeMB: 0.048,
        maxWidthOrHeight: 1200,
        quality: 0.82
      });
      const compressedSizeKB = webpFile.size / 1024;

      const previewUrl = URL.createObjectURL(webpFile);

      setImagePreview({
        type: "new",
        src: previewUrl,
        file: webpFile,
        sizeKB: originalSizeKB,
        compressedSizeKB: compressedSizeKB
      });
    } catch (err: any) {
      console.error("WebP conversion error:", err);
      alert("Error processing image to WebP: " + err.message);
    } finally {
      setCompressing(false);
      e.target.value = "";
    }
  };

  const removeImage = () => {
    if (imagePreview && imagePreview.type === "new" && imagePreview.src.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview.src);
    }
    setImagePreview(null);
  };

  // Rich Text Editor Toolbar Helpers
  const insertTextAtCursor = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previousText = textarea.value;
    const selectedText = previousText.substring(start, end);

    const replacement = `${prefix}${selectedText || "text"}${suffix}`;
    const newContent = previousText.substring(0, start) + replacement + previousText.substring(end);

    setContent(newContent);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 4));
    }, 10);
  };

  // Convert rich text markdown to basic HTML for preview
  const renderFormattedPreview = (text: string) => {
    if (!text || !text.trim()) {
      return "<p class='text-gray-500 italic'>No content yet. Write something in the editor...</p>";
    }

    const lines = text.split("\n");
    const htmlLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "<div class='h-3'></div>";

      // Inline formatter
      const formatInline = (str: string) => {
        let processed = str;
        const boldCount = (processed.match(/\*\*/g) || []).length;
        if (boldCount % 2 !== 0) processed = processed + "**";

        return processed
          .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold text-white"><em class="italic text-gray-200">$1</em></strong>')
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
          .replace(/__(.*?)__/g, '<strong class="font-bold text-white">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic text-gray-300">$1</em>')
          .replace(/_(.*?)_/g, '<em class="italic text-gray-300">$1</em>')
          .replace(/`([^`]+)`/g, '<code class="bg-[#262626] text-emerald-300 text-xs px-1.5 py-0.5 rounded font-mono border border-[#333]">$1</code>')
          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-emerald-400 font-semibold underline hover:text-emerald-300">$1</a>');
      };

      // Standalone bold heading line: e.g. **One Dispenser, Two Convenient Functions
      const boldHeadingMatch = trimmed.match(/^\*\*([^*]+)\*\*?$/);
      if (boldHeadingMatch) {
        return `<h3 class="text-lg font-serif font-bold text-white mt-5 mb-2">${formatInline(boldHeadingMatch[1].trim())}</h3>`;
      }

      if (trimmed.startsWith("### ")) {
        return `<h3 class="text-lg font-bold text-white mt-4 mb-2">${formatInline(trimmed.slice(4))}</h3>`;
      }
      if (trimmed.startsWith("## ")) {
        return `<h2 class="text-xl font-bold text-emerald-400 mt-5 mb-2">${formatInline(trimmed.slice(3))}</h2>`;
      }
      if (trimmed.startsWith("# ")) {
        return `<h1 class="text-2xl font-serif font-bold text-white mt-6 mb-3">${formatInline(trimmed.slice(2))}</h1>`;
      }
      if (trimmed.startsWith("> ")) {
        return `<blockquote class="border-l-4 border-emerald-500 pl-4 py-1.5 my-3 italic text-gray-300 bg-[#161616] rounded-r font-serif">${formatInline(trimmed.slice(2))}</blockquote>`;
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return `<li class="ml-4 list-disc text-gray-300 my-1">${formatInline(trimmed.slice(2))}</li>`;
      }
      if (/^\d+\.\s/.test(trimmed)) {
        return `<li class="ml-4 list-decimal text-gray-300 my-1">${formatInline(trimmed.replace(/^\d+\.\s/, ''))}</li>`;
      }

      return `<p class="my-2.5 text-gray-300 text-base leading-relaxed">${formatInline(trimmed)}</p>`;
    });

    return htmlLines.join("");
  };

  // Save Blog (Insert or Update)
  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("Please provide both a Title and Content for the blog.");
      return;
    }

    setLoading(true);

    try {
      let finalImageUrl = imagePreview?.src || "";

      // If new image was converted to WebP, upload to Supabase storage or convert to WebP Data URL
      if (imagePreview && imagePreview.type === "new" && imagePreview.file) {
        const file = imagePreview.file;
        const fileName = `blog_${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;

        // Attempt upload to Supabase storage 'products' or 'blogs' bucket
        let uploadSuccess = false;
        try {
          const { error: uploadError } = await supabase.storage
            .from("products")
            .upload(fileName, file, { contentType: "image/webp", upsert: true });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from("products")
              .getPublicUrl(fileName);
            finalImageUrl = publicUrl;
            uploadSuccess = true;
          }
        } catch (storageErr) {
          console.warn("Storage upload fallback:", storageErr);
        }

        // Fallback: convert ~40KB WebP image to Data URL if storage bucket is not configured
        if (!uploadSuccess) {
          finalImageUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }
      }

      if (!finalImageUrl) {
        finalImageUrl = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80";
      }

      const finalCategory = category === "Other" && customCategory.trim() 
        ? customCategory.trim() 
        : category;

      const generatedExcerpt = excerpt.trim() 
        ? excerpt.trim() 
        : content.replace(/[#*`_>\[\]]/g, '').slice(0, 150) + '...';

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;

      const blogPayload = {
        title: title.trim(),
        slug: editingBlog?.slug || slug,
        author: author.trim() || "Heaven Jewels Team",
        category: finalCategory || "Kitchen Essentials",
        excerpt: generatedExcerpt,
        content: content.trim(),
        image_url: finalImageUrl,
        published_at: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString()
      };

      if (editingBlog) {
        const { error } = await supabase
          .from("blogs")
          .update(blogPayload)
          .eq("id", editingBlog.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("blogs")
          .insert([blogPayload]);

        if (error) throw error;
      }

      await fetchBlogs();
      closeModal();
    } catch (err: any) {
      console.error("Save blog error:", err);
      alert("Failed to save blog: " + (err.message || err.details || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlog = async (id: string, blogTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete the blog "${blogTitle}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("blogs")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setBlogs(blogs.filter(b => b.id !== id));
    } catch (err: any) {
      alert("Error deleting blog: " + err.message);
    }
  };

  // Filtered & Paginated Blogs
  const filteredBlogs = blogs.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.author && b.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.category && b.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategoryFilter === "All" || b.category === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredBlogs.length / ITEMS_PER_PAGE) || 1;
  const paginatedBlogs = filteredBlogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121212] border border-[#262626] p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <BookOpen className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Blogs & Articles</h1>
              <p className="text-sm text-gray-400">
                Create, edit, and publish engaging interior design & lifestyle journals.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-5 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 shrink-0"
        >
          <Plus className="h-5 w-5" />
          Add New Blog
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by title, author, category..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => { setSelectedCategoryFilter("All"); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategoryFilter === "All"
                ? "bg-emerald-500 text-black"
                : "bg-[#141414] text-gray-400 hover:text-white border border-[#262626]"
            }`}
          >
            All ({blogs.length})
          </button>
          {DEFAULT_CATEGORIES.map(cat => {
            const count = blogs.filter(b => b.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => { setSelectedCategoryFilter(cat); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategoryFilter === cat
                    ? "bg-emerald-500 text-black"
                    : "bg-[#141414] text-gray-400 hover:text-white border border-[#262626]"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Blogs List Table */}
      <div className="bg-[#121212] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
        {fetching ? (
          <div className="p-12 text-center text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mb-3"></div>
            <p>Loading blogs...</p>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <h3 className="text-lg font-medium text-gray-300 mb-1">No blogs found</h3>
            <p className="text-sm">Click "Add New Blog" to publish your first journal article.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262626] bg-[#161616] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Article</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Author</th>
                  <th className="py-4 px-6">Published Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e1e] text-sm">
                {paginatedBlogs.map((blog) => (
                  <tr key={blog.id} className="hover:bg-[#181818] transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-12 rounded-lg bg-[#1e1e1e] overflow-hidden shrink-0 border border-[#262626] relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={blog.image_url || "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80"} 
                            alt={blog.title} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="min-w-0 max-w-md">
                          <p className="font-semibold text-white truncate hover:text-emerald-400 transition-colors">
                            {blog.title}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {blog.excerpt || blog.content.slice(0, 80)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {blog.category || "General"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-gray-500" />
                        <span>{blog.author || "Heaven Jewels Team"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-500" />
                        <span>{new Date(blog.published_at || blog.created_at || "").toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(blog.published_at || blog.created_at || "").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(blog)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] hover:bg-emerald-500/20 text-gray-300 hover:text-emerald-400 border border-[#333] hover:border-emerald-500/40 rounded-lg text-xs font-semibold transition-colors"
                          title="Edit Blog"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteBlog(blog.id, blog.title)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-lg text-xs font-semibold transition-colors"
                          title="Delete Blog"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredBlogs.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between p-4 border-t border-[#262626] bg-[#141414]">
            <p className="text-xs text-gray-400">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredBlogs.length)} of {filteredBlogs.length} articles
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-[#262626] text-gray-400 hover:text-white hover:bg-[#1f1f1f] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-gray-300 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-[#262626] text-gray-400 hover:text-white hover:bg-[#1f1f1f] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT BLOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeModal} />
          
          <div className="relative bg-[#121212] border border-[#262626] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl z-10 animate-fade-in overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#262626] bg-[#161616]">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-400" />
                  {editingBlog ? "Edit Blog Article" : "Create New Blog Article"}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Fill in the details below. Images are automatically compressed under 50KB.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-[#262626] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveBlog} className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5">
              
              {/* Blog Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Blog Title <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10 Minimalist Decor Ideas to Transform Your Living Room"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#181818] border border-[#262626] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Grid: Author, Category, Date & Time Auto Selected */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Author */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-emerald-400" />
                    Author Name
                  </label>
                  <input
                    type="text"
                    placeholder="Heaven Jewels Team"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#262626] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#262626] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    {DEFAULT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Other">+ Other Custom Category</option>
                  </select>
                </div>

                {/* Date and Time Auto-Selected */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                      Date & Time (Auto)
                    </label>
                    <button
                      type="button"
                      onClick={() => setPublishedAt(getNowDateTimeString())}
                      className="text-[11px] text-emerald-400 hover:underline font-semibold"
                    >
                      Now
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    required
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#262626] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Custom Category Input if 'Other' is chosen */}
              {category === "Other" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Enter Custom Category Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sustainable Architecture"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#181818] border border-[#262626] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}

              {/* Cover Image Upload (Compressed to under 50KB) */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-emerald-400" />
                    Cover Image (Auto Compressed &lt; 50KB)
                  </span>
                  {imagePreview?.compressedSizeKB && (
                    <span className="text-emerald-400 font-mono text-[11px] font-bold">
                      ✓ Compressed to {imagePreview.compressedSizeKB.toFixed(1)} KB (Target &lt; 50KB)
                    </span>
                  )}
                </label>

                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#262626] bg-[#181818] p-3 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-32 h-24 rounded-lg overflow-hidden shrink-0 bg-black/40 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview.src} alt="Cover preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 text-xs text-gray-400 space-y-1">
                      <p className="font-semibold text-white">Cover Image Ready</p>
                      {imagePreview.sizeKB && (
                        <p>Original Size: <span className="font-mono text-gray-300">{imagePreview.sizeKB.toFixed(1)} KB</span></p>
                      )}
                      {imagePreview.compressedSizeKB && (
                        <p>Saved Size: <span className="font-mono text-emerald-400 font-bold">{imagePreview.compressedSizeKB.toFixed(1)} KB</span> (Reduced by {Math.round((1 - (imagePreview.compressedSizeKB / (imagePreview.sizeKB || 1))) * 100)}%)</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#262626] hover:border-emerald-500/50 rounded-xl p-6 text-center cursor-pointer bg-[#161616] hover:bg-[#181818] transition-all group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                      <Upload className="h-5 w-5 text-emerald-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-200">
                      {compressing ? "Compressing under 50KB..." : "Click or drag & drop blog cover image"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, WebP supported • Automatic 50KB Supabase optimization
                    </p>
                  </div>
                )}
              </div>

              {/* Short Excerpt */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Short Excerpt / Teaser</span>
                  <span className="text-gray-500 text-[11px] font-normal">Optional (Used for blog cards)</span>
                </label>
                <input
                  type="text"
                  placeholder="Brief 1-2 sentence overview of the article..."
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="w-full px-4 py-2 bg-[#181818] border border-[#262626] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Rich Text Editor Module */}
              <div className="border border-[#262626] rounded-xl overflow-hidden bg-[#181818]">
                {/* Editor Top Bar & Toolbar */}
                <div className="bg-[#141414] border-b border-[#262626] p-2 flex flex-wrap items-center justify-between gap-2">
                  
                  {/* Formatting Buttons */}
                  <div className="flex items-center flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("**", "**")}
                      title="Bold (**text**)"
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-md transition-colors"
                    >
                      <Bold className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("*", "*")}
                      title="Italic (*text*)"
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-md transition-colors"
                    >
                      <Italic className="h-4 w-4" />
                    </button>
                    <div className="w-[1px] h-4 bg-[#333] mx-1" />
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("\n# ")}
                      title="Heading 1"
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-md transition-colors"
                    >
                      <Heading1 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("\n## ")}
                      title="Heading 2"
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-md transition-colors"
                    >
                      <Heading2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("\n### ")}
                      title="Heading 3"
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-md transition-colors"
                    >
                      <Heading3 className="h-4 w-4" />
                    </button>
                    <div className="w-[1px] h-4 bg-[#333] mx-1" />
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("\n- ")}
                      title="Bulleted list"
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-md transition-colors"
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("\n1. ")}
                      title="Numbered list"
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-md transition-colors"
                    >
                      <ListOrdered className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("\n> ")}
                      title="Blockquote"
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-md transition-colors"
                    >
                      <Quote className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("[", "](https://)")}
                      title="Insert Link"
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-[#262626] rounded-md transition-colors"
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
                        editorTab === "write" ? "bg-emerald-500 text-black" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab("preview")}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                        editorTab === "preview" ? "bg-emerald-500 text-black" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <Eye className="h-3 w-3" />
                      Preview
                    </button>
                  </div>
                </div>

                {/* Editor Area */}
                {editorTab === "write" ? (
                  <textarea
                    ref={textareaRef}
                    required
                    rows={10}
                    placeholder="Write your article here... You can use headings (#), bold (**text**), bullet points (- ), quotes (> ), etc."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full p-4 bg-[#181818] text-sm text-white focus:outline-none resize-y leading-relaxed font-sans placeholder-gray-600"
                  />
                ) : (
                  <div className="p-4 bg-[#141414] min-h-[250px] max-h-[400px] overflow-y-auto custom-scrollbar">
                    <div 
                      className="prose prose-invert max-w-none text-sm"
                      dangerouslySetInnerHTML={{ __html: renderFormattedPreview(content) }}
                    />
                  </div>
                )}

                {/* Editor Footer Stats */}
                <div className="p-2 px-4 bg-[#141414] border-t border-[#262626] flex items-center justify-between text-[11px] text-gray-500">
                  <div className="flex items-center gap-3">
                    <span>Words: <strong className="text-gray-300 font-mono">{content.trim() ? content.trim().split(/\s+/).length : 0}</strong></span>
                    <span>Characters: <strong className="text-gray-300 font-mono">{content.length}</strong></span>
                  </div>
                  <span>Est. Read: <strong className="text-emerald-400 font-mono">{Math.max(1, Math.ceil((content.trim().split(/\s+/).length || 1) / 200))} min</strong></span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="px-5 py-2.5 border border-[#262626] rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || compressing}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-black border-t-transparent animate-spin rounded-full" />
                      Saving Article...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {editingBlog ? "Update Blog" : "Publish Blog"}
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
