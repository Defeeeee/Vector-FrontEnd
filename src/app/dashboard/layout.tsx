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
    <div className="flex flex-col min-h-screen bg-black w-full relative text-white antialiased">
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

      {/* Navigation */}
      <DashboardNav />

      {/* Onboarding Logic */}
      <OnboardingOverlay profile={profile} />
    </div>
  );
}
