// src / types/ entities.ts
export interface Simulation {
  id: number;
  name: string;
  grid_width: number;
  grid_height: number;
  created_at: string;
  updated_at: string;
}

// add Robot, Task, etc. here as you build them