import { apiFetch } from "@/lib/api";
import { Profile, Flight } from "@/types";
import RouteWeatherClient from "@/components/dashboard/RouteWeatherClient";
import { redirect } from "next/navigation";

async function getRouteWeatherData() {
  const response = await apiFetch("/dashboard");

  if (response.status === 401) {
    console.log("RouteWeatherPage: 401 Unauthorized. Redirecting to logout...");
    redirect("/api/auth/logout?redirect=/?expired=true");
  }

  if (!response.ok) {
    return { 
      profile: null, 
      flights: []
    };
  }

  const data = await response.json();
  return {
    profile: (data.profile || null) as Profile | null,
    flights: (data.flights || []) as Flight[]
  };
}

export default async function RouteWeatherPage() {
  const { profile, flights } = await getRouteWeatherData();

  return (
    <RouteWeatherClient
      profile={profile}
      flights={flights}
    />
  );
}
