"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  Users, 
  Archive,
  LogOut,
  Settings
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

  if (pathname === '/login') {
    return null;
  }

  const handleLogout = () => {
    // Clear the auth cookie
    document.cookie = "admin_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    // Redirect to login page
    router.push('/login');
    router.refresh(); // Force refresh to ensure layouts re-run
  };

  return (
    <div className="flex flex-col w-64 bg-[#0a0a0a] border-r border-[#262626] h-full text-[#ededed]">
      <div className="flex h-16 items-center px-6 border-b border-[#262626]">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Heaven Home
        </h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                isActive
                  ? "bg-[#262626] text-white"
                  : "text-gray-400 hover:bg-[#1a1a1a] hover:text-white",
                "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200"
              )}
            >
              <item.icon
                className={clsx(
                  isActive ? "text-indigo-400" : "text-gray-400 group-hover:text-gray-300",
                  "flex-shrink-0 -ml-1 mr-3 h-5 w-5"
                )}
                aria-hidden="true"
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-[#262626]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-sm font-bold text-indigo-400">
            AD
          </div>
          <div>
            <p className="text-sm font-medium text-white">Administrator</p>
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
      </div>
    </div>
  );
}
