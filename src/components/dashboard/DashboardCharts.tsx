"use client";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface ChartData {
  name: string;
  hours: number;
}

interface PieData {
  name: string;
  value: number;
  color: string;
}

interface DashboardChartsProps {
  monthlyData: ChartData[];
  aircraftData: PieData[];
}

export default function DashboardCharts({ monthlyData, aircraftData }: DashboardChartsProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === "dark";
  const textColor = isDark ? "#a1a1aa" : "#71717a"; // zinc-400 : zinc-500
  const barColor = isDark ? "#ffffff" : "#18181b"; // white : zinc-900
  const tooltipBg = isDark ? "#0a0a0a" : "#ffffff";
  const tooltipBorder = isDark ? "#27272a" : "#e4e4e7";
  const tooltipTextColor = isDark ? "#ffffff" : "#18181b";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full mt-12">
      {/* Bar Chart: Flight Hours by Month */}
      <div className="p-8 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-[2.5rem] flex flex-col space-y-8 h-[450px] shadow-cal hover:shadow-lg dark:hover:bg-white/[0.04] transition-all group">
        <div className="flex flex-col space-y-1">
          <h3 className="text-2xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tighter">Horas por Mes</h3>
          <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">Tendencia Temporal</p>
        </div>
        <div className="flex-1 w-full -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: textColor, fontSize: 10, fontWeight: 700 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: textColor, fontSize: 10, fontWeight: 700 }}
              />
              <Tooltip 
                cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(24,24,27,0.03)' }}
                contentStyle={{ 
                  backgroundColor: tooltipBg, 
                  border: `1px solid ${tooltipBorder}`, 
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                }}
                itemStyle={{ color: tooltipTextColor, fontWeight: 800, fontSize: '12px' }}
                labelStyle={{ color: textColor, marginBottom: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}
              />
              <Bar 
                dataKey="hours" 
                fill={barColor} 
                radius={[4, 4, 0, 0]} 
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart: Hours by Aircraft */}
      <div className="p-8 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-[2.5rem] flex flex-col space-y-8 h-[450px] shadow-cal hover:shadow-lg dark:hover:bg-white/[0.04] transition-all group">
        <div className="flex flex-col space-y-1">
          <h3 className="text-2xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tighter">Horas por Aeronave</h3>
          <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">Distribución de Flota</p>
        </div>
        <div className="flex-1 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={aircraftData}
                cx="50%"
                cy="45%"
                innerRadius={80}
                outerRadius={110}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {aircraftData.map((entry, index) => {
                  const colors = isDark ? ["#ffffff", "#a1a1aa", "#52525b", "#27272a"] : ["#18181b", "#71717a", "#e4e4e7", "#f9fafb"];
                  return <Cell key={`cell-${index}`} fill={colors[index % 4]} />;
                })}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: tooltipBg, 
                  border: `1px solid ${tooltipBorder}`, 
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                }}
                itemStyle={{ color: tooltipTextColor, fontWeight: 800, fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Minimal Legend */}
          <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-4">
            {aircraftData.slice(0, 4).map((item, i) => {
              const colors = isDark ? ["#ffffff", "#a1a1aa", "#52525b", "#27272a"] : ["#18181b", "#71717a", "#e4e4e7", "#f9fafb"];
              return (
                <div key={i} className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full border border-zinc-200 dark:border-zinc-700" style={{ backgroundColor: colors[i % 4] }} />
                  <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{item.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
