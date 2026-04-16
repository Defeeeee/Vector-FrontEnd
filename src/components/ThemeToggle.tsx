"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-10 h-10" />;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-3 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 transition-all group flex items-center justify-center shadow-sm"
    >
      <div className="relative w-5 h-5 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
        <Sun className="h-full w-full rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-full w-full rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </div>
    </button>
  );
}
