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
  X
} from "lucide-react";
import clsx from "clsx";

const navigation = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
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

  if (pathname === '/login') {
    return null;
  }

  const handleLogout = () => {
    document.cookie = "admin_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/login');
    router.refresh();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-r border-[#262626] text-[#ededed]">
      <div className="flex h-16 items-center justify-between px-6 border-b border-[#262626]">
        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-400 bg-clip-text text-transparent">
          Heaven Home
        </h1>
        {/* Mobile close button */}
        <button 
          onClick={() => setMobileMenuOpen(false)}
          className="text-gray-400 hover:text-white p-1"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={clsx(
                isActive
                  ? "bg-[#262626] text-white"
                  : "text-gray-400 hover:bg-[#1a1a1a] hover:text-white",
                "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200"
              )}
            >
              <item.icon
                className={clsx(
                  isActive ? "text-emerald-400" : "text-gray-400 group-hover:text-gray-300",
                  "flex-shrink-0 -ml-1 mr-3 h-5 w-5"
                )}
                aria-hidden="true"
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#262626] space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0">
            AD
          </div>
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
        </div>
        <div className="text-[11px] text-gray-500 pt-1 border-t border-[#1a1a1a] text-center">
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
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Heaven Home Admin
          </span>
        </div>
      </div>

      {/* Desktop Sidebar (Pinned) */}
      <aside className="hidden md:flex w-64 flex-col shrink-0 h-full">
        <SidebarContent />
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
