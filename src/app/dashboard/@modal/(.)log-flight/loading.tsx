import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/50 dark:bg-black/75 backdrop-blur-md">
      <Loader2 className="w-8 h-8 text-white animate-spin" />
    </div>
  );
}
