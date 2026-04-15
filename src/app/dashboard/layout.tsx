import { LogOut, Compass } from "lucide-react";
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
    <div className="flex flex-col min-h-screen bg-zinc-50 w-full relative text-zinc-900 antialiased">
      {/* Dynamic Background Element */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] flex justify-center items-center z-0 overflow-hidden">
        <div className="w-[1000px] h-[1000px] rounded-full border border-zinc-900" />
        <div className="absolute w-[800px] h-[800px] rounded-full border border-zinc-900" />
        <div className="absolute w-[600px] h-[600px] rounded-full border border-zinc-900" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center shadow-lg transition-transform duration-500">
            <Compass className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-bold font-space-grotesk tracking-tighter uppercase">Vector</span>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Pilot Hub</span>
          </div>
        </Link>
        
        <div className="flex items-center space-x-2">
          <form action={logout}>
            <button className="p-3 hover:bg-zinc-100 rounded-xl transition-all text-zinc-500 hover:text-zinc-900 active:scale-95 shadow-sm border border-transparent hover:border-zinc-200">
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto p-6 pb-32">
        {children}
      </main>

      {/* Navigation */}
      <DashboardNav />

      {/* Onboarding Logic */}
      <OnboardingOverlay profile={profile} />
    </div>
  );
}
