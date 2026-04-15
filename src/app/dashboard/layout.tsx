import { LogOut, Compass, Menu } from "lucide-react";
import Link from "next/link";
import { logout } from "@/actions/auth";
import DashboardNav from "@/components/dashboard/DashboardNav";
import OnboardingOverlay from "@/components/dashboard/OnboardingOverlay";
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
    <div className="flex min-h-screen bg-zinc-50 w-full relative text-zinc-900 antialiased overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, black 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex flex-col w-[280px] bg-white border-r border-zinc-200 relative z-20 h-screen sticky top-0 shrink-0">
        <div className="p-8 border-b border-zinc-100 flex items-center space-x-3">
          <div className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center shadow-lg transition-transform duration-500 hover:scale-105">
            <Compass className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-bold font-space-grotesk tracking-tighter uppercase">Vector</span>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-1">Pilot Hub</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-8 px-4">
            <DashboardNav isDesktop={true} />
        </div>

        <div className="p-6 border-t border-zinc-100">
            <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200 mb-4 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500 font-bold text-sm uppercase">
                    {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                    <span className="text-sm font-bold text-zinc-900 truncate">{profile?.first_name} {profile?.last_name}</span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate">{profile?.license_type || "Piloto"}</span>
                </div>
            </div>
            <form action={logout}>
                <button className="w-full flex items-center justify-center space-x-2 py-3 bg-white border border-zinc-200 rounded-xl transition-all text-zinc-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 active:scale-95 shadow-sm font-bold text-[10px] uppercase tracking-widest">
                    <LogOut className="w-4 h-4" strokeWidth={2} />
                    <span>Cerrar Sesión</span>
                </button>
            </form>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center space-x-3 group">
          <div className="w-8 h-8 bg-zinc-900 text-white rounded-lg flex items-center justify-center shadow-md">
            <Compass className="w-4 h-4" strokeWidth={2} />
          </div>
          <span className="text-lg font-bold font-space-grotesk tracking-tighter uppercase">Vector</span>
        </Link>
        <div className="flex items-center space-x-2">
            <form action={logout}>
                <button className="p-2 hover:bg-red-50 rounded-lg transition-all text-zinc-500 hover:text-red-600">
                <LogOut className="w-4 h-4" strokeWidth={2} />
                </button>
            </form>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
         <DashboardNav isDesktop={false} />
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-6 pt-24 lg:pt-8 pb-32 lg:pb-12 overflow-y-auto h-screen custom-scrollbar">
        {children}
      </main>

      {/* Onboarding Logic */}
      <OnboardingOverlay profile={profile} />
    </div>
  );
}
