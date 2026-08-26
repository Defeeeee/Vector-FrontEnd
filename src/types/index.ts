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

/** Los tres estados de `planned_flights.status`, espejo del CHECK de la migración 009. */
export type PlannedStatus = "programado" | "completado" | "descartado";

/**
 * Un vuelo que el piloto planea hacer. **No es un `Flight`.**
 *
 * Vive en su propia tabla y ninguna función de agregación lo ve nunca: sumar una
 * intención a un libro de vuelo es inventar horas en un registro regulatorio. Ver
 * el comentario de `migrations/009_planned_flights.sql`, que explica los tres
 * motivos —incluido que dar de alta un vuelo real **cobra** la hora contra el saldo.
 *
 * Casi todo es opcional salvo la fecha: un plan a diez días puede ser "el sábado
 * vuelo" y nada más. Lo que falte se completa al confirmarlo.
 */
export interface PlannedFlight {
  id: string;
  user_id: string;
  /** "YYYY-MM-DD". Se compara como texto, nunca construyendo un `Date`. */
  date: string;
  aircraft_id?: string | null;
  /** Mismo formato que `Flight.route`: los ICAO separados por espacio. */
  route?: string | null;
  notes?: string | null;
  /**
   * Horas tentativas, **en UTC**, como "HH:MM:SS" (Postgres manda los segundos).
   *
   * Misma convención que `Flight.takeoff`: lo guardado es UTC y el interruptor
   * local/UTC del calendario sólo cambia lo que se ve. Ver `src/lib/horarios.ts`.
   */
  takeoff_time?: string | null;
  landing_time?: string | null;
  status: PlannedStatus;
  /** Con qué vuelo se cerró. Sólo presente cuando `status` es `completado`. */
  flight_id?: string | null;
  /** Hasta cuándo el piloto pidió no ver la pregunta. "YYYY-MM-DD". */
  postponed_until?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Aircraft {
  id: string;
  user_id: string;
  registration: string;
  icao: string;
  type: string; // Marca y Modelo
  type_acft?: string; // MONT-T, MULT-T, etc.
  cost_per_hour?: number;
  /**
   * Performance de crucero, para el planificador. Los tres opcionales y **sin
   * default**: `undefined` es "no lo sé" y la pantalla lo dice, en vez de mostrar un
   * 110 inventado que se vería igual que uno cargado por el piloto.
   */
  cruise_tas_kt?: number;
  fuel_burn_lph?: number;
  /** Utilizable, no total: el no utilizable no vuela. */
  fuel_capacity_l?: number;
  /**
   * `true` = dispositivo de entrenamiento, no aeronave.
   *
   * El simulador se anota en el libro como cualquier vuelo —fecha, horarios, el
   * equipo— y las horas van a la columna de instrucción terrestre. Esta marca es lo
   * que hace que **no** sumen a la experiencia total: las 200 h de 61.620 son horas de
   * vuelo, y una sesión de simulador no lo es.
   */
  is_simulator?: boolean;
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  license_type?: string;
  tracking_mode?: 'packs' | 'balance';
  api_key?: string;
  whatsapp_phone?: string;
  /**
   * Si puede ver las cartas Jeppesen del servidor. Se pone a mano por SQL —no
   * hay todavía flujo de pago— y a propósito no se puede tocar desde el propio
   * formulario de perfil: el PATCH del piloto no declara este campo.
   */
  jeppesen_access?: boolean;
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

/**
 * `repaso_vuelo` es el de RAAC 61.135: 24 meses, con instructor, firmado en el
 * libro. Es una de las cuatro condiciones de 61.060(a)(1) y la única que no se
 * puede derivar de los vuelos, porque la norma pide una firma.
 */
export type DocumentKind =
  | "cma" | "licencia" | "habilitacion" | "seguro" | "aeronavegabilidad"
  | "repaso_vuelo"
  | "otro";

/**
 * Qué pasa cuando un documento vence.
 *
 * El semáforo de RAAC 61.060(a)(1) tiene cuatro condiciones fijas, pero un piloto
 * de escuela vive con exigencias que la norma no enumera —cuota del aeroclub,
 * autorización del instructor, un curso interno—. Esto deja que cualquier
 * documento diga si condiciona el vuelo, sin que Vector conozca cada caso.
 *
 * De menos a más restrictivo: `pasajeros` deja volar solo; `solo` obliga a volar
 * con instructor —la misma semántica que el repaso de 61.135, y ese vuelo es el
 * que lo renueva—; `vuelo` no deja volar.
 */
export type DocumentBlocking = "nada" | "pasajeros" | "solo" | "vuelo";

/**
 * Quién decide la fecha de vencimiento de un documento.
 *
 * Vive acá y no en `src/lib/expiry-rules.ts` para que ese módulo pueda importar
 * `PilotDocument` sin que los dos se importen entre sí.
 */
export type ExpiryRule = "fijo" | "ultimo_vuelo" | "vuelo_ancla";

/** En qué unidad se cuenta `expiry_offset_days`. Los meses son meses calendario. */
export type OffsetUnit = "dias" | "meses";

export interface PilotDocument {
  id: string;
  user_id: string;
  kind: DocumentKind;
  /** Default "nada": un documento no bloquea salvo que el piloto lo pida. */
  blocking: DocumentBlocking;
  name: string;
  /** "YYYY-MM-DD", o `null` si el documento no vence (una licencia de por vida). */
  expiry_date: string | null;
  /**
   * Quién escribe `expiry_date`.
   *
   * `"fijo"` (el default, y lo que son casi todas las filas): el piloto, a mano.
   * `"ultimo_vuelo"`: el backend, sumándole `expiry_offset_days` a la fecha del
   * vuelo más reciente y recalculándola cada vez que los vuelos cambian. Ver
   * `src/lib/expiry-rules.ts` y `migrations/011_documents_expiry_rule.sql`.
   *
   * Opcional porque un backend sin la migración 011 no la manda; ausente se lee
   * como `"fijo"`.
   */
  expiry_rule?: ExpiryRule;
  /** Cuánto después del ancla. La unidad la dice `expiry_offset_unit`. */
  expiry_offset_days?: number | null;
  /** Ausente se lee como `"dias"`, que es el default de la columna. */
  expiry_offset_unit?: OffsetUnit;
  /**
   * Vuelo desde el que se cuenta, con `expiry_rule: "vuelo_ancla"`.
   *
   * Referencia blanda a propósito: no hay foreign key, para que borrar un vuelo
   * nunca falle. Si el vuelo desaparece, el backend **congela** el documento en
   * `"fijo"` con la última fecha calculada. Ver `migrations/013`.
   */
  expiry_anchor_flight_id?: string | null;
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
  /**
   * Variación magnética en **grados oeste positivos**, precalculada con WMM.
   *
   * Oeste positivo y no declinación este porque es la que se **suma** al rumbo
   * verdadero para obtener el magnético, que es lo único que el piloto hace con ella.
   * Ver `aMagnetico` en `lib/navegacion.ts`.
   *
   * Sólo la tienen los aeródromos de MADHEL. `undefined` es "no la sabemos": el
   * planificador lo dice en pantalla en vez de asumir cero, que en Argentina es un
   * valor perfectamente válido —la línea agónica cruza la Patagonia— y por lo tanto
   * indistinguible de un dato faltante.
   */
  variacionW?: number;
  /** Pistas con rumbo verdadero. Vacío si el aeródromo no tiene ninguna publicada. */
  pistas?: { le: string; he: string; rumboT: number; largoFt?: number; superficie?: string; fuente?: "medida" | "estimada" }[];
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
