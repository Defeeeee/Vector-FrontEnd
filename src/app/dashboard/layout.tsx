"use client";

import { Plane, LayoutDashboard, History, Settings, LogOut, Compass } from "lucide-react";
import Link from "next/link";
import { logout } from "@/actions/auth";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen bg-black w-full relative">
      {/* Dynamic Background */}
      <div className="fixed inset-0 vector-gradient pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 glass px-6 py-5 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
            <Compass className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-black tracking-tighter uppercase">Vector</span>
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">Pilot Hub</span>
          </div>
        </Link>
        
        <div className="flex items-center space-x-2">
          <form action={logout}>
            <button className="p-3 hover:bg-white/5 rounded-2xl transition-all text-zinc-500 hover:text-white active:scale-90">
              <LogOut className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto p-6 pb-32">
        {children}
      </main>

      {/* Navigation (Floating Minimal) */}
      <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none">
        <nav className="glass px-2 py-2 rounded-[2rem] flex items-center space-x-1 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/[0.05] pointer-events-auto">
          <NavItem href="/dashboard" icon={<LayoutDashboard className="w-5 h-5" strokeWidth={1.5} />} label="Stats" active={pathname === "/dashboard"} />
          <NavItem href="/dashboard/history" icon={<History className="w-5 h-5" strokeWidth={1.5} />} label="Log" active={pathname === "/dashboard/history"} />
          <NavItem href="/dashboard/settings" icon={<Settings className="w-5 h-5" strokeWidth={1.5} />} label="Hangar" active={pathname === "/dashboard/settings"} />
        </nav>
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link href={href} className="relative px-6 py-3 rounded-[1.5rem] transition-all group overflow-hidden">
      {active && (
        <motion.div 
          layoutId="nav-glow"
          className="absolute inset-0 bg-white"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <div className={`relative z-10 flex items-center space-x-2 ${active ? "text-black" : "text-zinc-500 group-hover:text-white"}`}>
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
    </Link>
  );
}
