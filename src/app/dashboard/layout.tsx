import { LogOut, Compass, Menu } from "lucide-react";
import Link from "next/link";
import { logout } from "@/actions/auth";
import DashboardNav from "@/components/dashboard/DashboardNav";
import OnboardingOverlay from "@/components/dashboard/OnboardingOverlay";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiFetch } from "@/lib/api";
import { Profile } from "@/types";

import { redirect } from "next/navigation";

async function getProfile() {
  const res = await apiFetch("/profiles");
  if (res.status === 401) {
    console.log("DashboardLayout: 401 Unauthorized. Logging out...");
    redirect("/api/auth/logout?redirect=/?expired=true");
  }
  if (!res.ok) return null;
  const profiles: Profile[] = await res.json();
  return profiles[0] || null;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black w-full relative text-zinc-900 dark:text-white antialiased overflow-hidden transition-colors duration-300">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex flex-col w-[280px] bg-white dark:bg-[#0a0a0a] border-r border-zinc-200 dark:border-white/10 relative z-20 h-screen sticky top-0 shrink-0 transition-colors duration-300">
        <div className="p-8 border-b border-zinc-100 dark:border-white/10 flex items-center space-x-3">
          <div className="w-10 h-10 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center shadow-lg transition-transform duration-500 hover:scale-105">
            <Compass className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-bold font-space-grotesk tracking-tighter uppercase dark:text-white">Vector</span>
            <span className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] mt-1">Pilot Hub</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-8 px-4">
            <DashboardNav isDesktop={true} />
        </div>

        <div className="p-6 border-t border-zinc-100 dark:border-white/10 space-y-4">
            <ThemeToggle />
            
            <div className="bg-zinc-50 dark:bg-white/[0.02] rounded-2xl p-4 border border-zinc-200 dark:border-white/10 flex items-center space-x-3 transition-colors">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-white/10 flex items-center justify-center text-zinc-500 dark:text-zinc-400 font-bold text-sm uppercase">
                    {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">{profile?.first_name} {profile?.last_name}</span>
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest truncate">{profile?.license_type || "Piloto"}</span>
                </div>
            </div>
            <form action={logout}>
                <button className="w-full flex items-center justify-center space-x-2 py-3 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl transition-all text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-500 hover:border-red-200 dark:hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-95 shadow-sm font-bold text-[10px] uppercase tracking-widest">
                    <LogOut className="w-4 h-4" strokeWidth={2} />
                    <span>Cerrar Sesión</span>
                </button>
            </form>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 w-full z-40 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-white/10 px-6 py-4 flex items-center justify-between transition-colors duration-300">
        <Link href="/dashboard" className="flex items-center space-x-3 group">
          <div className="w-8 h-8 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center shadow-md">
            <Compass className="w-4 h-4" strokeWidth={2} />
          </div>
          <span className="text-lg font-bold font-space-grotesk tracking-tighter uppercase dark:text-white">Vector</span>
        </Link>
        <div className="flex items-center space-x-2">
            <form action={logout}>
                <button className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-500">
                <LogOut className="w-4 h-4" strokeWidth={2} />
                </button>
            </form>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
         <div className="flex flex-col items-center space-y-4 w-full max-w-[400px]">
            <div className="w-48 pointer-events-auto"><ThemeToggle /></div>
            <DashboardNav isDesktop={false} />
         </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full p-4 md:p-8 lg:p-12 pt-24 lg:pt-12 pb-32 lg:pb-12 overflow-y-auto h-screen custom-scrollbar flex justify-center transition-colors">
        <div className="w-full max-w-5xl">
          {children}
        </div>
      </main>

      {/* Onboarding Logic */}
      <OnboardingOverlay profile={profile} />
    </div>
  );
}
