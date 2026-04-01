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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 w-full">
      {/* Bar Chart: Flight Hours by Month */}
      <div className="p-10 bg-white/[0.02] border border-white/[0.05] rounded-[3rem] flex flex-col space-y-8 h-[450px]">
        <div className="flex flex-col space-y-1">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Tendencia Temporal</p>
          <h3 className="text-2xl font-black text-white tracking-tighter">Horas por Mes</h3>
        </div>
        <div className="flex-1 w-full -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#3f3f46', fontSize: 10, fontWeight: 800 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#3f3f46', fontSize: 10, fontWeight: 800 }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                contentStyle={{ 
                  backgroundColor: '#000', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '12px',
                  padding: '12px',
                }}
                itemStyle={{ color: '#fff', fontWeight: 900, fontSize: '12px' }}
                labelStyle={{ color: '#71717a', marginBottom: '4px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}
              />
              <Bar 
                dataKey="hours" 
                fill="#ffffff" 
                radius={[4, 4, 0, 0]} 
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart: Hours by Aircraft */}
      <div className="p-10 bg-white/[0.02] border border-white/[0.05] rounded-[3rem] flex flex-col space-y-8 h-[450px]">
        <div className="flex flex-col space-y-1">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Distribución de Flota</p>
          <h3 className="text-2xl font-black text-white tracking-tighter">Horas por Aeronave</h3>
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
                {aircraftData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#000', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Minimal Legend */}
          <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-4">
            {aircraftData.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
