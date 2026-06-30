import { apiFetch } from "@/lib/api";
import { Aircraft, Profile, FlightPack, Transaction } from "@/types";
import BalanceClient from "@/components/dashboard/BalanceClient";
import { redirect } from "next/navigation";

async function getBalanceData() {
  const response = await apiFetch("/dashboard");

  if (response.status === 401) {
    console.log("BalancePage: 401 Unauthorized. Redirecting to logout...");
    redirect("/api/auth/logout?redirect=/?expired=true");
  }

  if (!response.ok) {
    return { 
      profile: null, 
      aircraft: [], 
      packs: [], 
      transactions: [], 
      balance: 0 
    };
  }

  const data = await response.json();
  return {
    profile: (data.profile || null) as Profile | null,
    aircraft: (data.aircraft || []) as Aircraft[],
    packs: (data.packs || []) as FlightPack[],
    transactions: (data.transactions || []) as Transaction[],
    balance: (data.balance || 0) as number,
  };
}

export default async function BalancePage() {
  const { profile, aircraft, packs, transactions, balance } = await getBalanceData();

  return (
    <BalanceClient
      profile={profile}
      aircraft={aircraft}
      packs={packs}
      initialTransactions={transactions}
      initialBalance={balance}
    />
  );
}
