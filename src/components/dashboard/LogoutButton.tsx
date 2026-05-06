"use client";

import { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { logout } from "@/actions/auth";

export function LogoutButton({ isMobile = false }: { isMobile?: boolean }) {
  const [isPending, startTransition] = useTransition();

  async function handleLogout() {
    startTransition(async () => {
      await logout();
    });
  }

  if (isMobile) {
    return (
      <button 
        disabled={isPending}
        onClick={handleLogout}
        className="p-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-500 border border-transparent hover:border-zinc-200 dark:hover:border-white/10 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" strokeWidth={2} />}
      </button>
    );
  }

  return (
    <button 
      disabled={isPending}
      onClick={handleLogout}
      className="w-full flex items-center justify-center space-x-2 py-3 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl transition-all text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-500 hover:border-red-200 dark:hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-95 shadow-sm font-bold text-[10px] uppercase tracking-widest disabled:opacity-50"
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" strokeWidth={2} />}
      <span>{isPending ? "Cerrando..." : "Cerrar Sesión"}</span>
    </button>
  );
}
