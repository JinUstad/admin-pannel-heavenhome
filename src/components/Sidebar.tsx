"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  Users, 
  Archive,
  LogOut,
  Settings,
  Menu,
  X,
  MessageSquare,
  ListOrdered,
  BookOpen
} from "lucide-react";
import clsx from "clsx";

const navigation = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ListOrdered },
  { name: "Blogs", href: "/blogs", icon: BookOpen },
  { name: "Contacts", href: "/contacts", icon: MessageSquare },
  { name: "Products", href: "/products", icon: Package },
  { name: "Categories", href: "/categories", icon: Tags },
  { name: "Inventory", href: "/inventory", icon: Archive },
  { name: "Users", href: "/users", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    document.cookie = "admin_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    localStorage.removeItem("admin_email");
    try {
      const { supabase } = await import("@/lib/supabase");
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn("Logout error:", err);
    }
    window.location.href = "/login";
  };

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-r border-[#262626] text-[#ededed] transition-all duration-300">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 border-b border-[#262626]">
        {!collapsed && (
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-400 bg-clip-text text-transparent truncate">
            Heaven Home
          </h1>
        )}
        {collapsed && (
          <div className="mx-auto w-8 h-8 bg-gradient-to-r from-emerald-400 to-amber-400 rounded-lg flex items-center justify-center font-bold text-black shrink-0">
            H
          </div>
        )}
        {/* Mobile close button */}
        <button 
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden text-gray-400 hover:text-white p-1 ml-auto"
        >
          <X className="h-6 w-6" />
        </button>
        {/* Desktop collapse toggle */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex text-gray-400 hover:text-white p-1 rounded-md hover:bg-[#1a1a1a] transition-colors ml-auto"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      
      <nav className={clsx("flex-1 space-y-2 py-4 overflow-y-auto custom-scrollbar", collapsed ? "px-2" : "px-3")}>
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              title={collapsed ? item.name : undefined}
              className={clsx(
                isActive
                  ? "bg-[#262626] text-white"
                  : "text-gray-400 hover:bg-[#1a1a1a] hover:text-white",
                "group flex items-center py-2.5 text-sm font-medium rounded-lg transition-colors duration-200",
                collapsed ? "justify-center px-0" : "px-3"
              )}
            >
              <item.icon
                className={clsx(
                  isActive ? "text-emerald-400" : "text-gray-400 group-hover:text-gray-300",
                  "flex-shrink-0 h-5 w-5",
                  !collapsed && "mr-3"
                )}
                aria-hidden="true"
              />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={clsx("border-t border-[#262626]", collapsed ? "p-3" : "p-4")}>
        <div className={clsx("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <div 
            className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0 cursor-pointer" 
            title={collapsed ? "Log out" : undefined} 
            onClick={collapsed ? handleLogout : undefined}
          >
            AD
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">Administrator</p>
              <button 
                onClick={handleLogout}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mt-0.5 transition-colors"
                title="Log out securely"
              >
                <LogOut className="h-3 w-3" />
                Log out
              </button>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="text-[11px] text-gray-500 pt-3 mt-3 border-t border-[#1a1a1a] text-center">
            Design by{" "}
            <a
              href="https://www.devfordevs.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline font-semibold"
            >
              DevforDevs
            </a>
          </div>
        )}
      </div>
    </div>
  );


  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden flex items-center justify-between bg-[#0a0a0a] border-b border-[#262626] px-4 py-3 fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="text-gray-300 hover:text-white p-1 rounded-md bg-[#1a1a1a] border border-[#333]"
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-400 bg-clip-text text-transparent">
            Heaven Home Admin
          </span>
        </div>
      </div>

      {/* Desktop Sidebar (Pinned) */}
      <aside className={clsx(
        "hidden md:flex flex-col shrink-0 h-full transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <SidebarContent collapsed={isCollapsed} />
      </aside>

      {/* Mobile Slide-out Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          {/* Drawer Content */}
          <div className="relative flex-1 max-w-xs w-full">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
