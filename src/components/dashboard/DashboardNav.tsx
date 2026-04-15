"use client";

import { LayoutDashboard, History, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none">
      <nav className="bg-white px-2 py-2 rounded-[2rem] flex items-center space-x-1 shadow-cal border border-border-gray pointer-events-auto">
        <NavItem href="/dashboard" icon={<LayoutDashboard className="w-5 h-5" strokeWidth={1.5} />} label="Stats" active={pathname === "/dashboard"} />
        <NavItem href="/dashboard/history" icon={<History className="w-5 h-5" strokeWidth={1.5} />} label="Log" active={pathname === "/dashboard/history"} />
        <NavItem href="/dashboard/settings" icon={<Settings className="w-5 h-5" strokeWidth={1.5} />} label="Hangar" active={pathname === "/dashboard/settings"} />
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link href={href} className="relative px-6 py-3 rounded-[1.5rem] transition-all group overflow-hidden">
      {active && (
        <motion.div 
          layoutId="nav-glow"
          className="absolute inset-0 bg-charcoal"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <div className={`relative z-10 flex items-center space-x-2 ${active ? "text-white" : "text-mid-gray group-hover:text-charcoal"}`}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
    </Link>
  );
}
