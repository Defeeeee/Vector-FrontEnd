import { Compass, Plus } from "lucide-react";
import Link from "next/link";
import DashboardNav from "@/components/dashboard/DashboardNav";
import OnboardingOverlay from "@/components/dashboard/OnboardingOverlay";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RailThemeToggle } from "@/components/dashboard/RailThemeToggle";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { apiFetch } from "@/lib/api";
import { AuditSummary, Profile } from "@/types";
import ChatWidget from "@/components/dashboard/ChatWidget";
import SinConexionBanner from "@/components/dashboard/SinConexionBanner";

import { redirect } from "next/navigation";

/**
 * El perfil, y si se pudo preguntar por él.
 *
 * Devuelve las dos cosas y no sólo el perfil porque **`null` es ambiguo**: puede ser
 * un piloto sin perfil o un servidor que no contestó. Es la misma distinción que
 * `unavailable` hace en `dashboard/page.tsx`, y acá importa igual: sin ella el
 * dashboard se dibuja en cero y el piloto no tiene forma de saber si perdió sus
 * datos o si perdió la señal.
 *
 * Ya no puede tirar: `apiFetch` devuelve un 503 sintético ante fallo de red en vez
 * de propagar la excepción. Antes, un corte de red acá reventaba el layout y con él
 * **las trece páginas del dashboard**.
 */
async function getProfile(): Promise<{ profile: Profile | null; disponible: boolean }> {
  const res = await apiFetch("/profiles");
  if (res.status === 401) {
    console.log("DashboardLayout: 401 Unauthorized. Logging out...");
    redirect("/api/auth/logout?redirect=/?expired=true");
  }
  if (!res.ok) return { profile: null, disponible: false };
  try {
    const profiles: Profile[] = await res.json();
    return { profile: profiles[0] || null, disponible: true };
  } catch {
    // 200 con cuerpo ilegible: se pudo llegar, no se pudo entender. Cuenta como
    // no disponible, que es lo único honesto.
    return { profile: null, disponible: false };
  }
}

/**
 * Open-findings count for the nav badge.
 *
 * Lives in the layout so the badge is present on every dashboard page, not just
 * the audit one. Failures are swallowed to zero on purpose: a badge is not
 * worth taking the whole dashboard shell down for.
 */
async function getAuditCount(): Promise<number> {
  try {
    const res = await apiFetch("/audit/summary");
    if (!res.ok) return 0;
    const summary: AuditSummary = await res.json();
    return summary.open_total ?? 0;
  } catch {
    return 0;
  }
}

export default async function DashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  /** Intercepting-route slot — see dashboard/@modal. Empty on most routes. */
  modal: React.ReactNode;
}) {
  const [{ profile, disponible }, auditCount] = await Promise.all([getProfile(), getAuditCount()]);
  const initials = `${profile?.first_name?.charAt(0) || ""}${profile?.last_name?.charAt(0) || ""}`;
  const today = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black w-full relative text-zinc-900 dark:text-white antialiased transition-colors duration-300">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Icon Rail — always dark, independent of app theme */}
      <aside className="hidden lg:flex flex-col items-center w-20 bg-zinc-950 border-r border-white/5 h-screen sticky top-0 z-30 py-6 shrink-0">
        <Link href="/dashboard" className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-8 shrink-0">
          <Compass className="w-5 h-5 text-zinc-950" strokeWidth={2} />
        </Link>

        <div className="flex-1 flex flex-col justify-center">
          <DashboardNav variant="rail" auditCount={auditCount} />
        </div>

        <div className="flex flex-col items-center gap-1 mt-auto">
          <Link
            href="/dashboard/log-flight"
            title="Nuevo vuelo"
            className="group relative flex items-center justify-center w-12 h-12 rounded-2xl bg-aviation-blue text-white hover:bg-aviation-blue-dark transition-colors mb-2"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-lg bg-zinc-900 text-white text-xs font-semibold px-3 py-1.5 opacity-0 scale-95 origin-left group-hover:opacity-100 group-hover:scale-100 transition-all z-50 shadow-xl border border-white/10">
              Nuevo vuelo
            </span>
          </Link>
          <RailThemeToggle />
          <LogoutButton variant="rail" />
          {/* El avatar es la puerta al Hangar. Salió del nav —donde competía por
              un slot con destinos que se usan a diario— y quedó donde la gente
              ya busca su configuración. */}
          <Link
            href="/dashboard/settings"
            title="Hangar"
            className="group relative w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[10px] font-bold text-zinc-300 mt-2 transition-colors"
          >
            {initials}
            <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-lg bg-zinc-900 text-white text-xs font-semibold px-3 py-1.5 opacity-0 scale-95 origin-left group-hover:opacity-100 group-hover:scale-100 transition-all z-50 shadow-xl border border-white/10">
              Hangar
            </span>
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 w-full z-40 bg-white dark:bg-black backdrop-blur-md border-b border-zinc-200 dark:border-white/10 px-6 py-4 flex items-center justify-between transition-colors duration-300">
        <Link href="/dashboard" className="flex items-center space-x-3 group">
          <div className="w-8 h-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg flex items-center justify-center shadow-md">
            <Compass className="w-4 h-4" strokeWidth={2} />
          </div>
          <span className="text-lg font-bold font-display tracking-tight dark:text-white">Vector</span>
        </Link>
        <div className="flex items-center space-x-3">
            <ThemeToggle />
            {/* En el teléfono no hay rail, así que el avatar vive acá. Sin esto,
                sacar Hangar del nav lo dejaba sin ninguna entrada en móvil: caía
                en el sheet de "Más" y de ahí desaparecía. */}
            <Link
              href="/dashboard/settings"
              aria-label="Hangar"
              className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-[11px] font-bold text-zinc-600 dark:text-zinc-300"
            >
              {initials}
            </Link>
            <LogoutButton isMobile={true} />
        </div>
      </header>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 lg:h-screen">
        {/* Desktop Top Bar */}
        <header className="hidden lg:flex items-center justify-between h-16 px-8 border-b border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-xl z-20 shrink-0">
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 tracking-wide">{todayCapitalized}</p>
          <Link
            href="/dashboard/settings"
            title="Hangar"
            className="flex items-center gap-2.5 rounded-full pr-2 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300">
              {initials}
            </div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">{profile?.first_name}</span>
          </Link>
        </header>

        {/* Main Content Area */}
        <main className="relative z-10 flex-1 w-full p-4 md:p-8 lg:p-12 pt-24 lg:pt-12 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-12 overflow-y-auto custom-scrollbar transition-colors">
          <div className="w-full max-w-6xl mx-auto">
            {/* Arriba de todo: si la consulta base falló, el piloto tiene que
                enterarse antes de leer un solo número de la pantalla. */}
            {!disponible && <SinConexionBanner />}
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation — fills the space left of the segregated action pill, no fixed/cramped width */}
      <div
        className="lg:hidden fixed left-4 right-[9.5rem] z-50 pointer-events-auto"
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <DashboardNav variant="mobile" auditCount={auditCount} />
      </div>

      {/* Intercepted routes that render over the current page (Nuevo Vuelo). */}
      {modal}

      {/* Onboarding Logic */}
      <OnboardingOverlay profile={profile} />

      {/* AI Chat Widget */}
      <ChatWidget />
    </div>
  );
}
