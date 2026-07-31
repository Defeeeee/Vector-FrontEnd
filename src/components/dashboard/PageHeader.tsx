import { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children?: ReactNode;
}

export default function PageHeader({ eyebrow, title, action, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8">
      <div className="space-y-2 md:space-y-3">
        <div className="h-1 w-8 md:w-12 rounded-full bg-aviation-blue dark:bg-aviation-cyan" />
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-space-grotesk font-bold tracking-tight text-zinc-900 dark:text-white leading-none">{title}</h2>
        <p className="text-aviation-blue-dark dark:text-aviation-cyan font-semibold text-sm">{eyebrow}</p>
        {children}
      </div>
      {action && <div className="flex items-center gap-3 self-start md:self-auto">{action}</div>}
    </div>
  );
}
