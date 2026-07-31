"use client";

import { LayoutDashboard, History, Settings, Wallet, CloudRain } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/history", icon: History, label: "Bitácora" },
  { href: "/dashboard/balance", icon: Wallet, label: "Balance" },
  { href: "/dashboard/route-weather", icon: CloudRain, label: "Ruta METAR" },
  { href: "/dashboard/settings", icon: Settings, label: "Hangar" },
];

export default function DashboardNav({ variant }: { variant: "rail" | "mobile" }) {
  const pathname = usePathname();

  if (variant === "rail") {
    return (
      <nav className="flex flex-col items-center gap-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-colors ${
                active ? "bg-white/10 text-aviation-cyan" : "text-zinc-500 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={2} />
              <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-lg bg-zinc-900 text-white text-xs font-semibold px-3 py-1.5 opacity-0 scale-95 origin-left group-hover:opacity-100 group-hover:scale-100 transition-all z-50 shadow-xl border border-white/10">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  const shortLabels: Record<string, string> = {
    "Dashboard": "Inicio",
    "Bitácora": "Log",
    "Balance": "Balance",
    "Ruta METAR": "Ruta",
    "Hangar": "Hangar",
  };

  // Floating pill for the 5 destinations — fills whatever width its wrapper gives it
  // (see dashboard/layout.tsx) rather than shrink-wrapping to a cramped intrinsic size.
  // Every tab is a fixed-width column (so the bar's total width never changes and can
  // never crowd into the segregated action pill), with a roomier active chip than the
  // original tiny-label version. The primary action and AI copilot live in their own
  // segregated pill at the right edge.
  return (
    <nav className="w-full h-14 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl px-1.5 rounded-full flex items-center shadow-cal dark:shadow-none border border-zinc-200 dark:border-white/10 pointer-events-auto">
      {navItems.map((item) => (
        <MobileNavItem
          key={item.href}
          href={item.href}
          icon={<item.icon className="w-[22px] h-[22px]" strokeWidth={2} />}
          label={shortLabels[item.label] || item.label}
          active={pathname === item.href}
        />
      ))}
    </nav>
  );
}

function MobileNavItem({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link href={href} className="relative flex-1 h-full flex items-center justify-center">
      {active && (
        <motion.div
          layoutId="mobile-nav-active"
          className="absolute inset-1.5 rounded-2xl bg-aviation-blue/10"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <div className={`relative z-10 flex flex-col items-center gap-1 transition-colors ${active ? "text-aviation-blue-dark dark:text-aviation-cyan" : "text-zinc-400 dark:text-zinc-500"}`}>
        {icon}
        <span className="text-[10px] font-bold leading-none">{label}</span>
      </div>
    </Link>
  );
}
