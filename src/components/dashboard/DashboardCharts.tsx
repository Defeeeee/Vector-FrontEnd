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
  Pie,
  AreaChart,
  Area,
  CartesianGrid,
  ReferenceLine
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

interface CumulativePoint {
  date: string;
  total: number;
  hours: number;
}

interface DashboardChartsProps {
  monthlyData: ChartData[];
  aircraftData: PieData[];
  cumulativeData: CumulativePoint[];
}

export default function DashboardCharts({ monthlyData, aircraftData, cumulativeData }: DashboardChartsProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === "dark";
  const textColor = isDark ? "#a1a1aa" : "#71717a";
  const barColor = isDark ? "#ffffff" : "#18181b";
  const tooltipBg = isDark ? "#0a0a0a" : "#ffffff";
  const tooltipBorder = isDark ? "#27272a" : "#e4e4e7";
  const tooltipTextColor = isDark ? "#ffffff" : "#18181b";
  const areaColor = isDark ? "#ffffff" : "#18181b";
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(24,24,27,0.05)";

  // Milestone reference lines at round hour thresholds
  const maxTotal = cumulativeData.length > 0 ? cumulativeData[cumulativeData.length - 1].total : 0;
  const milestones = [50, 100, 150, 200, 300, 500, 750, 1000].filter(m => m <= maxTotal * 1.1 && m >= maxTotal * 0.1);

  const CustomCumulativeTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, padding: '12px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <p style={{ color: textColor, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 6 }}>{d.date}</p>
        <p style={{ color: tooltipTextColor, fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{d.total.toFixed(1)}<span style={{ fontSize: 11, fontWeight: 700, marginLeft: 4, color: textColor }}>hs acum.</span></p>
        {d.hours > 0 && <p style={{ color: textColor, fontSize: 10, fontWeight: 700, marginTop: 4 }}>+{d.hours.toFixed(1)} este vuelo</p>}
      </div>
    );
  };

  if (!mounted) {
    return (
      <div className="space-y-6 w-full mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-8 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-[2.5rem] h-[450px]" />
          <div className="p-8 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-[2.5rem] h-[450px]" />
        </div>
        <div className="p-8 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-[2.5rem] h-[420px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full mt-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Bar Chart: Flight Hours by Month */}
      <div className="p-8 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-[2.5rem] flex flex-col space-y-8 h-[450px] shadow-cal hover:shadow-lg dark:hover:bg-white/[0.04] transition-all group">
        <div className="flex flex-col space-y-1">
          <h3 className="text-2xl font-bold font-space-grotesk text-zinc-900 dark:text-white tracking-tighter">Horas por Mes</h3>
          <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">Tendencia Temporal</p>
        </div>
        <div className="flex-1 w-full -ml-4 min-h-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
        <div className="flex-1 w-full relative min-h-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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

      {/* Cumulative Hours Area Chart */}
      {cumulativeData.length > 1 && (
        <div className="p-8 bg-zinc-900 dark:bg-[#111111] border border-zinc-800 dark:border-white/10 rounded-[2.5rem] flex flex-col space-y-8 h-[420px] shadow-2xl hover:shadow-lg transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/[0.03] rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none transition-transform group-hover:scale-110" />
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 relative z-10">
            <div className="flex flex-col space-y-1">
              <h3 className="text-2xl font-bold font-space-grotesk text-white tracking-tighter">Horas Acumuladas</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Progresión Total de Experiencia</p>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-space-grotesk font-bold text-white tracking-tighter leading-none">{maxTotal.toFixed(1)}</span>
              <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">hs totales</span>
            </div>
          </div>
          <div className="flex-1 w-full -ml-2 min-h-0 relative z-10">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={areaColor} stopOpacity={isDark ? 0.25 : 0.15} />
                    <stop offset="95%" stopColor={areaColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#52525b", fontSize: 9, fontWeight: 700 }}
                  dy={10}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#52525b", fontSize: 9, fontWeight: 700 }}
                  tickFormatter={(v) => `${v}h`}
                  width={40}
                />
                {milestones.map(m => (
                  <ReferenceLine
                    key={m}
                    y={m}
                    stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(24,24,27,0.1)"}
                    strokeDasharray="4 4"
                    label={{ value: `${m}h`, fill: "#52525b", fontSize: 9, fontWeight: 700, position: 'insideTopRight', dy: -6 }}
                  />
                ))}
                <Tooltip content={<CustomCumulativeTooltip />} cursor={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(24,24,27,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={areaColor}
                  strokeWidth={2}
                  fill="url(#cumulativeGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: areaColor, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
