export interface Flight {
  id: string;
  user_id: string;
  aircraft_id: string;
  date: string;
  route: string;
  landings: number;
  duration: number;
  takeoff: string;
  landing: string;
}

export interface Aircraft {
  id: string;
  user_id: string;
  registration: string;
  icao: string;
  type: string;
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  cma_expiry?: string;
  license_type?: string;
}
