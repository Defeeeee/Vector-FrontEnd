"use client";

import { LayoutDashboard, History, Wallet, CloudRain, Ruler, ShieldCheck, MoreHorizontal, PieChart, Building2, CalendarDays } from "lucide-react";
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
  // Appended rather than slotted next to "Bitácora", where it belongs
  // thematically: the first five entries are the ones visible on the phone bar,
  // and reordering them would push Herramientas into the "Más" sheet. Muscle
  // memory beats taxonomy — see the nav redesign entry in AGENTS.md.
  { href: "/dashboard/summary", icon: PieChart, label: "Resumen" },
  { href: "/dashboard/airports", icon: Building2, label: "Aeropuertos" },
  // Al final por la misma razón que los dos de arriba, aunque temáticamente iría
  // pegado a "Bitácora": entrar entre los primeros cinco empujaría a otro a la
  // hoja "Más" y movería un ícono que la gente ya tiene en la memoria muscular.
  { href: "/dashboard/calendario", icon: CalendarDays, label: "Calendario" },
];

const AUDIT_HREF = "/dashboard/audit";

/**
 * How many destinations get their own slot in the mobile pill. The rest fall
 * into the "Más" sheet.
 *
 * The pill shares the bottom edge with the segregated action pill, so it only
 * ever gets ~220 px on a phone — slots don't get cheaper as destinations are
 * added. Five visible plus an overflow keeps the original destinations where
 * they were while leaving room to keep growing.
 */
const MOBILE_SLOTS = 5;

export default function DashboardNav({
  variant,
  auditCount = 0,
}: {
  variant: "rail" | "mobile";
  /** Unsuppressed findings. Drives the badge; 0 hides it. */
  auditCount?: number;
}) {
  const pathname = usePathname();

  if (variant === "rail") {
    return (
      <nav className="flex flex-col items-center gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          const flagged = item.href === AUDIT_HREF && auditCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="group relative flex items-center justify-center w-12 h-12"
            >
              {active && (
                <motion.div
                  layoutId="rail-nav-active"
                  className="absolute inset-0 rounded-2xl bg-white/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}

              <span className="relative z-10">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    active ? "text-aviation-cyan" : "text-zinc-500 group-hover:text-white"
                  }`}
                  strokeWidth={2}
                />
                {flagged && <Dot ring="ring-zinc-950" />}
              </span>

              {/* The rail is icon-only, so the tooltip carries the label. */}
              <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-lg bg-zinc-900 text-white text-xs font-semibold px-3 py-1.5 opacity-0 scale-95 origin-left group-hover:opacity-100 group-hover:scale-100 transition-all z-50 shadow-xl border border-white/10">
                {item.label}
                {flagged && <span className="ml-1.5 text-red-400">{auditCount}</span>}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return <MobileNav pathname={pathname} auditCount={auditCount} />;
}

/**
 * Floating pill for the primary destinations.
 *
 * Icon-only, deliberately. The previous version stacked a 10 px label under
 * every icon, but the bar only gets ~220 px next to the action pill, so at six
 * slots the labels had to be cut down to "Log" / "Saldo" / "Calc" / "Más" —
 * cryptic *and* cluttered, the worst of both. Cutting destinations doesn't
 * rescue them either: "Bitácora" doesn't fit in a 44 px slot. Dropping the
 * labels is what actually buys the icons room to breathe; the full names live
 * in the overflow sheet and in the rail's tooltips.
 */
function MobileNav({ pathname, auditCount }: { pathname: string; auditCount: number }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const visible = navItems.slice(0, MOBILE_SLOTS);
  const overflow = navItems.slice(MOBILE_SLOTS);
  const overflowActive = overflow.some((i) => i.href === pathname);
  const overflowFlagged = overflow.some((i) => i.href === AUDIT_HREF) && auditCount > 0;

  useEffect(() => {
    if (!sheetOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setSheetOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [sheetOpen]);

  // Next keeps this mounted across route changes, so the sheet has to be told
  // to close once navigation actually happened.
  useEffect(() => setSheetOpen(false), [pathname]);

  return (
    <div ref={wrapperRef} className="relative">
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-3 w-56 origin-bottom-right rounded-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-cal dark:shadow-2xl overflow-hidden p-2"
          >
            {overflow.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              const flagged = item.href === AUDIT_HREF && auditCount > 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSheetOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-2xl transition-colors ${
                    active
                      ? "bg-aviation-blue/10 text-aviation-blue-dark dark:text-aviation-cyan"
                      : "text-zinc-600 dark:text-zinc-300 active:bg-zinc-100 dark:active:bg-white/5"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
                  <span className="text-sm font-semibold">{item.label}</span>
                  {flagged && (
                    <span className="ml-auto text-[11px] font-bold data text-red-500">{auditCount}</span>
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
            label={item.label}
            icon={<item.icon className="w-[22px] h-[22px]" strokeWidth={2} />}
            active={pathname === item.href}
            flagged={item.href === AUDIT_HREF && auditCount > 0}
          />
        ))}

        <MobileNavItem
          label="Más"
          icon={<MoreHorizontal className="w-[22px] h-[22px]" strokeWidth={2} />}
          active={overflowActive || sheetOpen}
          flagged={overflowFlagged}
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
  flagged = false,
  onClick,
}: {
  href?: string;
  icon: React.ReactNode;
  /** Not rendered — the bar is icon-only. Exposed to assistive tech instead. */
  label: string;
  active?: boolean;
  flagged?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      {active && (
        <motion.div
          layoutId="mobile-nav-active"
          className="absolute inset-y-1.5 inset-x-1 rounded-2xl bg-aviation-blue/10"
          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
        />
      )}
      <span
        className={`relative z-10 transition-colors ${
          active ? "text-aviation-blue-dark dark:text-aviation-cyan" : "text-zinc-400 dark:text-zinc-500"
        }`}
      >
        {icon}
        {flagged && <Dot ring="ring-white dark:ring-zinc-900" />}
      </span>
    </>
  );

  const className = "relative flex-1 h-full flex items-center justify-center";

  if (href) {
    return (
      <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} aria-expanded={active} className={className}>
      {inner}
    </button>
  );
}

/**
 * Attention marker for the audit destination.
 *
 * A dot rather than a count bubble: the number was big enough to break the
 * pill's silhouette and had nowhere to sit that wasn't overlapping the rounded
 * edge. The exact figure still shows where there's room for it — the tooltip on
 * the rail, the row in the overflow sheet, and the audit page itself.
 *
 * Anchored to the icon, not to the slot: the slot is a flex column whose width
 * depends on how many destinations are visible, so positioning against it left
 * the dot drifting away from the glyph as that count changed.
 */
function Dot({ ring }: { ring: string }) {
  return (
    <span
      className={`absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ${ring} z-20`}
    />
  );
}
