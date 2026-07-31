"use client";

import { LayoutDashboard, History, Settings, Wallet, CloudRain, Ruler, ShieldCheck, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/history", icon: History, label: "Bitácora" },
  { href: "/dashboard/balance", icon: Wallet, label: "Balance" },
  { href: "/dashboard/route-weather", icon: CloudRain, label: "Ruta METAR" },
  { href: "/dashboard/tools", icon: Ruler, label: "Herramientas" },
  { href: "/dashboard/audit", icon: ShieldCheck, label: "Auditoría" },
  { href: "/dashboard/settings", icon: Settings, label: "Hangar" },
];

/**
 * How many destinations get their own slot in the mobile pill. The rest fall
 * into the "Más" sheet.
 *
 * The pill is a fixed-width strip sharing the bottom of the screen with the
 * action pill, so slots don't get cheaper as destinations are added — going
 * from five to seven would put every tab under ~35 px on a phone and squash the
 * labels. Five visible plus an overflow keeps the original destinations exactly
 * where they were while leaving room to keep growing.
 */
const MOBILE_SLOTS = 5;

const shortLabels: Record<string, string> = {
  "Dashboard": "Inicio",
  "Bitácora": "Log",
  "Balance": "Saldo",
  "Ruta METAR": "Ruta",
  "Herramientas": "Calc",
  "Auditoría": "Audit",
  "Hangar": "Hangar",
};

export default function DashboardNav({
  variant,
  auditCount = 0,
}: {
  variant: "rail" | "mobile";
  /** Unsuppressed critical findings — drives the badge. 0 hides it. */
  auditCount?: number;
}) {
  const pathname = usePathname();

  if (variant === "rail") {
    return (
      <nav className="flex flex-col items-center gap-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          const badge = item.href === "/dashboard/audit" ? auditCount : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-colors ${
                active ? "bg-white/10 text-aviation-cyan" : "text-zinc-500 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={2} />
              {badge > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
              <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-lg bg-zinc-900 text-white text-xs font-semibold px-3 py-1.5 opacity-0 scale-95 origin-left group-hover:opacity-100 group-hover:scale-100 transition-all z-50 shadow-xl border border-white/10">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return <MobileNav pathname={pathname} auditCount={auditCount} />;
}

// Floating pill for the primary destinations — fills whatever width its wrapper
// gives it (see dashboard/layout.tsx) rather than shrink-wrapping to a cramped
// intrinsic size. Every tab is a fixed-width column (so the bar's total width
// never changes and can never crowd into the segregated action pill), with a
// roomier active chip than the original tiny-label version. The primary action
// and AI copilot live in their own segregated pill at the right edge.
function MobileNav({ pathname, auditCount }: { pathname: string; auditCount: number }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const visible = navItems.slice(0, MOBILE_SLOTS);
  const overflow = navItems.slice(MOBILE_SLOTS);
  const overflowActive = overflow.some((i) => i.href === pathname);
  const overflowBadge = overflow.some((i) => i.href === "/dashboard/audit") ? auditCount : 0;

  // Close on tap-outside. Navigating also closes it via the pathname effect
  // below, since Next keeps this component mounted across route changes.
  useEffect(() => {
    if (!sheetOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setSheetOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [sheetOpen]);

  useEffect(() => setSheetOpen(false), [pathname]);

  return (
    <div ref={wrapperRef} className="relative">
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 w-52 origin-bottom-right rounded-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-cal dark:shadow-2xl overflow-hidden p-1.5"
          >
            {overflow.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              const badge = item.href === "/dashboard/audit" ? auditCount : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSheetOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors ${
                    active
                      ? "bg-aviation-blue/10 text-aviation-blue-dark dark:text-aviation-cyan"
                      : "text-zinc-600 dark:text-zinc-300 active:bg-zinc-100 dark:active:bg-white/5"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
                  <span className="text-sm font-bold">{item.label}</span>
                  {badge > 0 && (
                    <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="w-full h-14 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl px-1.5 rounded-full flex items-center shadow-cal dark:shadow-none border border-zinc-200 dark:border-white/10 pointer-events-auto">
        {visible.map((item) => (
          <MobileNavItem
            key={item.href}
            href={item.href}
            icon={<item.icon className="w-[22px] h-[22px]" strokeWidth={2} />}
            label={shortLabels[item.label] || item.label}
            active={pathname === item.href}
          />
        ))}

        <MobileNavItem
          label="Más"
          icon={<MoreHorizontal className="w-[22px] h-[22px]" strokeWidth={2} />}
          active={overflowActive || sheetOpen}
          badge={overflowBadge}
          onClick={() => setSheetOpen((o) => !o)}
        />
      </nav>
    </div>
  );
}

function MobileNavItem({
  href,
  icon,
  label,
  active = false,
  badge = 0,
  onClick,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  const inner = (
    <>
      {active && (
        <motion.div
          layoutId="mobile-nav-active"
          className="absolute inset-1.5 rounded-2xl bg-aviation-blue/10"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <div
        className={`relative z-10 flex flex-col items-center gap-1 transition-colors ${
          active ? "text-aviation-blue-dark dark:text-aviation-cyan" : "text-zinc-400 dark:text-zinc-500"
        }`}
      >
        {icon}
        <span className="text-[10px] font-bold leading-none">{label}</span>
      </div>
      {badge > 0 && (
        <span className="absolute top-1 right-1/2 translate-x-[14px] min-w-[15px] h-[15px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none z-20">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </>
  );

  const className = "relative flex-1 h-full flex items-center justify-center";

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} className={className}>
      {inner}
    </button>
  );
}
