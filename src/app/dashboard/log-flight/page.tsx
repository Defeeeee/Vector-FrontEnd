import { apiFetch } from "@/lib/api";
import { Aircraft } from "@/types";
import Link from "next/link";
import FlightLogForm from "@/components/dashboard/FlightLogForm";

async function getAircraft() {
  const res = await apiFetch("/aircraft");
  const data: Aircraft[] = res.ok ? await res.json() : [];
  return data;
}

export default async function LogFlightPage() {
  const aircraft = await getAircraft();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-white">Registrar Vuelo</h2>
        <Link href="/dashboard" className="text-sm font-medium text-blue-500 hover:text-white transition-colors">
          Cancelar
        </Link>
      </div>

      <FlightLogForm aircraft={aircraft} />
    </div>
  );
}
