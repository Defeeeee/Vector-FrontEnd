export interface Flight {
  id: string;
  user_id: string;
  aircraft_id?: string;
  date: string;
  route: string;
  landings: number;
  duration: number;
  takeoff: string;
  landing: string;
  
  // New logging columns
  pic_day_loc?: number;
  pic_day_tra?: number;
  pic_night_loc?: number;
  pic_night_tra?: number;
  sic_day_loc?: number;
  sic_day_tra?: number;
  sic_night_loc?: number;
  sic_night_tra?: number;
  
  imc_pil?: number;
  imc_cop?: number;
  capota?: number;
  sim_instructor?: number;
  sim_pil_en_inst?: number;
  
  discount_type?: 'value' | 'percent';
  discount_amount?: number;
}

export interface Aircraft {
  id: string;
  user_id: string;
  registration: string;
  icao: string;
  type: string; // Marca y Modelo
  type_acft?: string; // MONT-T, MULT-T, etc.
  cost_per_hour?: number;
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  cma_expiry?: string;
  license_type?: string;
  tracking_mode?: 'packs' | 'balance';
  api_key?: string;
}

export interface FlightPack {
  id: string;
  user_id: string;
  name: string;
  total_hours: number;
  remaining_hours: number;
  created_at: string;
  start_date: string;
  is_active: boolean;
  aircraft_ids: string[];
}

export interface Transaction {
  id: string;
  user_id: string;
  flight_id?: string;
  amount: number;
  type: 'deposit' | 'charge';
  description?: string;
  created_at: string;
}


