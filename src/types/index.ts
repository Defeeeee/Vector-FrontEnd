export interface Flight {
  id: string;
  user_id: string;
  logbook_id?: string;
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
  purpose: string;
  /** Free-text note, as the paper ANAC logbook's observations column. */
  remarks?: string;
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
  whatsapp_phone?: string;
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



export type AuditRuleType = "overlap" | "unregistered_aircraft" | "duplicate" | "inconsistent_total";
export type AuditSeverity = "critical" | "warning";

export interface AuditFinding {
  id: string;
  user_id: string;
  flight_id?: string | null;
  rule_type: AuditRuleType;
  severity: AuditSeverity;
  message: string;
  suppressed: boolean;
  suppressed_reason?: string | null;
  created_at: string;
  recalculated_at: string;
}

export interface AuditSummary {
  critical: number;
  warning: number;
  suppressed: number;
  /** Unsuppressed findings — what the nav badge counts. */
  open_total: number;
  by_rule: Partial<Record<AuditRuleType, number>>;
  last_recalculated_at?: string | null;
}

export type DocumentKind = "cma" | "licencia" | "habilitacion" | "seguro" | "aeronavegabilidad" | "otro";

export interface PilotDocument {
  id: string;
  user_id: string;
  kind: DocumentKind;
  name: string;
  /** "YYYY-MM-DD" */
  expiry_date: string;
  issued_date?: string | null;
  notes?: string | null;
  alert_days: number[];
  last_alert_threshold?: number | null;
  last_alert_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** An aerodrome resolved by /api/airports/search. Mirrors `Airport` in
 *  src/lib/airports.ts, declared here so client components can type the
 *  response without importing the server-only (fs-backed) module. */
export interface AirportRef {
  icao: string;
  name: string;
  city: string;
  country: string;
  size: "L" | "M" | "S" | "H";
  iata: string;
  elevation?: number;
  lat?: number;
  lon?: number;
  /** Short display label, e.g. SADM -> "Morón". */
  label: string;
  /** ANAC's three-letter designator (GEZ, MOR). Argentine aerodromes only. */
  local?: string;
  /** What MADHEL publishes about it. Absent for non-Argentine aerodromes. */
  madhel?: {
    province: string;
    kind: "AD" | "HEL";
    condition: string;
    controlled: boolean | null;
    status: string;
    elevationM?: number;
  };
}

/**
 * A logbook. A pilot can keep more than one — e.g. one per employer, or one for
 * the paper book they migrated from.
 *
 * The `opening_*` columns are hours carried in without entering the flights one
 * by one. They are NOT a single total on purpose: a lone number would leave the
 * ANAC matrix showing the hours with 0 as PIC and the PCA tracker reporting that
 * no requirement is met. Every aggregation has to add these in.
 */
export interface Logbook {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  is_default: boolean;
  created_at: string;
  flight_count?: number;

  opening_landings: number;
  opening_pic_day_loc: number;
  opening_pic_day_tra: number;
  opening_pic_night_loc: number;
  opening_pic_night_tra: number;
  opening_sic_day_loc: number;
  opening_sic_day_tra: number;
  opening_sic_night_loc: number;
  opening_sic_night_tra: number;
  opening_imc_pil: number;
  opening_imc_cop: number;
  opening_capota: number;
}
