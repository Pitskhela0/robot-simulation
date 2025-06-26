export interface Simulation {
  id: number;
  name: string;
  grid_width: number;
  grid_height: number;
  base_station_x?: number | null;  // Add this
  base_station_y?: number | null;  // Add this
  created_at: string;
  updated_at: string;
}