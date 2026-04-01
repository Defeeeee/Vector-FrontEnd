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
}

export interface Aircraft {
  id: string;
  user_id: string;
  registration: string;
  icao: string;
  type: string; // Marca y Modelo
  type_acft?: string; // MONT-T, MULT-T, etc.
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  cma_expiry?: string;
  license_type?: string;
}
