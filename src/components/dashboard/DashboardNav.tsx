"use client";

import { LayoutDashboard, History, Settings, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function DashboardNav({ isDesktop }: { isDesktop?: boolean }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" strokeWidth={2} />, label: "Dashboard" },
    { href: "/dashboard/history", icon: <History className="w-5 h-5" strokeWidth={2} />, label: "Bitácora" },
    { href: "/dashboard/settings", icon: <Settings className="w-5 h-5" strokeWidth={2} />, label: "Hangar & Perfil" },
  ];

  if (isDesktop) {
      return (
          <nav className="flex flex-col space-y-2">
              <Link href="/dashboard/log-flight" className="mb-6 mx-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-[10px] uppercase tracking-[0.2em] px-4 py-3 rounded-lg shadow-sm transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 flex items-center justify-center space-x-2">
                 <Plus className="w-4 h-4" />
                 <span>Nuevo Vuelo</span>
              </Link>

              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 px-4">Menu Principal</div>
              {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                      <Link key={item.href} href={item.href} className="relative px-4 py-3 rounded-xl transition-all group overflow-hidden flex items-center space-x-3">
                          {active && (
                              <motion.div 
                                  layoutId="sidebar-glow"
                                  className="absolute inset-0 bg-zinc-100 border border-zinc-200 dark:bg-white/5 dark:border-white/10"
                                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                              />
                          )}
                          <div className={`relative z-10 flex items-center space-x-3 ${active ? "text-zinc-900 dark:text-white" : "text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white"}`}>
                              {item.icon}
                              <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
                          </div>
                      </Link>
                  )
              })}
          </nav>
      )
  }

  return (
    <nav className="bg-white/90 backdrop-blur-xl px-2 py-2 rounded-[2rem] flex items-center space-x-1 shadow-cal border border-zinc-200 pointer-events-auto">
        <MobileNavItem href="/dashboard" icon={<LayoutDashboard className="w-5 h-5" strokeWidth={2} />} label="Stats" active={pathname === "/dashboard"} />
        <MobileNavItem href="/dashboard/history" icon={<History className="w-5 h-5" strokeWidth={2} />} label="Log" active={pathname === "/dashboard/history"} />
        <Link href="/dashboard/log-flight" className="relative p-4 mx-1 -mt-8 bg-zinc-900 text-white rounded-full shadow-cal-highlight flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
            <Plus className="w-6 h-6" strokeWidth={2.5} />
        </Link>
        <MobileNavItem href="/dashboard/settings" icon={<Settings className="w-5 h-5" strokeWidth={2} />} label="Hangar" active={pathname === "/dashboard/settings"} />
    </nav>
  );
}

function MobileNavItem({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link href={href} className="relative px-5 py-3 rounded-[1.5rem] transition-all group overflow-hidden">
      {active && (
        <motion.div 
          layoutId="mobile-nav-glow"
          className="absolute inset-0 bg-zinc-100"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <div className={`relative z-10 flex flex-col items-center space-y-1 ${active ? "text-zinc-900" : "text-zinc-400 group-hover:text-zinc-900"}`}>
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
      </div>
    </Link>
  );
}
