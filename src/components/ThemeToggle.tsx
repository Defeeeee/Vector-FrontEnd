"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-12 w-full" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center justify-between w-full p-3 bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-2xl hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-all group shadow-sm dark:shadow-none"
    >
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shadow-sm dark:shadow-none">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </div>
        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors uppercase tracking-widest">
          {isDark ? "Modo Claro" : "Modo Oscuro"}
        </span>
      </div>
      <div className="w-10 h-5 bg-zinc-200 dark:bg-white/10 rounded-full relative p-1 transition-colors">
          <div className={`w-3 h-3 bg-white dark:bg-zinc-400 rounded-full transition-all duration-300 transform ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </button>
  );
}
