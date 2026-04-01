import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateFlightDuration(takeoffStr: string, landingStr: string): number {
  if (!takeoffStr || !landingStr) return 0;
  
  const [tH, tM] = takeoffStr.split(':').map(Number);
  const [lH, lM] = landingStr.split(':').map(Number);
  
  let totalMinutes = (lH * 60 + lM) - (tH * 60 + tM);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // Crosses midnight
  
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  
  let decimal = 0;
  if (mins >= 3 && mins <= 8) decimal = 0.1;
  else if (mins >= 9 && mins <= 14) decimal = 0.2;
  else if (mins >= 15 && mins <= 20) decimal = 0.3;
  else if (mins >= 21 && mins <= 26) decimal = 0.4;
  else if (mins >= 27 && mins <= 33) decimal = 0.5;
  else if (mins >= 34 && mins <= 39) decimal = 0.6;
  else if (mins >= 40 && mins <= 45) decimal = 0.7;
  else if (mins >= 46 && mins <= 51) decimal = 0.8;
  else if (mins >= 52 && mins <= 57) decimal = 0.9;
  else if (mins >= 58 && mins <= 60) decimal = 1.0;
  
  return hours + decimal;
}

export function isLocalFlight(route: string): boolean {
  if (!route) return true;
  const parts = route.split(/[ -]/).filter(p => p.trim() !== "");
  if (parts.length < 2) return true;
  return parts[0].toUpperCase() === parts[1].toUpperCase();
}


