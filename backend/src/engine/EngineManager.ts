// backend/src/engine/EngineManager.ts

import { Pool } from 'pg';
import { SimulationEngine } from './SimulationEngine';
import { EngineLogger } from './logger';
import { SimulationConfig, EngineEventData, EngineEventHandler } from './types';

export class EngineManager {
  private pool: Pool;
  private engines: Map<number, SimulationEngine> = new Map();
  private logger: EngineLogger;
  private globalEventHandlers: EngineEventHandler[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(pool: Pool) {
    this.pool = pool;
    this.logger = new EngineLogger(0, true); // Use 0 for manager-level logging
    
    // Start periodic cleanup
    this.startCleanupInterval();
    
    this.logger.info('EngineManager initialized');
  }

  // Engine Creation and Management
  public async createEngine(simulationId: number, config?: Partial<SimulationConfig>): Promise<SimulationEngine> {
    if (this.engines.has(simulationId)) {
      this.logger.warn('Engine already exists for simulation', { simulationId });
      return this.engines.get(simulationId)!;
    }

    try {
      // Verify simulation exists in database
      const simQuery = 'SELECT id, name FROM simulations WHERE id = $1';
      const simResult = await this.pool.query(simQuery, [simulationId]);
      
      if (simResult.rows.length === 0) {
        throw new Error(`Simulation ${simulationId} not found`);
      }

      const engine = new SimulationEngine(simulationId, this.pool, config);
      
      // Set up event forwarding
      engine.addEventListener((event: EngineEventData) => {
        this.forwardEvent(event);
      });

      this.engines.set(simulationId, engine);
      
      this.logger.info('Engine created for simulation', { 
        simulationId,
        simulationName: simResult.rows[0].name,
        totalEngines: this.engines.size
      });

      return engine;

    } catch (error) {
      this.logger.error('Failed to create engine', { simulationId, error });
      throw error;
    }
  }

  public getEngine(simulationId: number): SimulationEngine | undefined {
    return this.engines.get(simulationId);
  }

  public getAllEngines(): Map<number, SimulationEngine> {
    return new Map(this.engines);
  }

  public getActiveEngines(): SimulationEngine[] {
    return Array.from(this.engines.values()).filter(engine => 
      engine.getState() === 'RUNNING'
    );
  }

  public getEngineCount(): number {
    return this.engines.size;
  }

  // Engine Lifecycle Management
  public async startEngine(simulationId: number): Promise<void> {
    const engine = this.engines.get(simulationId);
    if (!engine) {
      throw new Error(`No engine found for simulation ${simulationId}`);
    }

    await engine.start();
    this.logger.info('Engine started', { simulationId });
  }

  public async pauseEngine(simulationId: number): Promise<void> {
    const engine = this.engines.get(simulationId);
    if (!engine) {
      throw new Error(`No engine found for simulation ${simulationId}`);
    }

    await engine.pause();
    this.logger.info('Engine paused', { simulationId });
  }

  public async resumeEngine(simulationId: number): Promise<void> {
    const engine = this.engines.get(simulationId);
    if (!engine) {
      throw new Error(`No engine found for simulation ${simulationId}`);
    }

    await engine.resume();
    this.logger.info('Engine resumed', { simulationId });
  }

  public async stopEngine(simulationId: number): Promise<void> {
    const engine = this.engines.get(simulationId);
    if (!engine) {
      throw new Error(`No engine found for simulation ${simulationId}`);
    }

    await engine.stop();
    this.logger.info('Engine stopped', { simulationId });
  }

  public async resetEngine(simulationId: number): Promise<void> {
    const engine = this.engines.get(simulationId);
    if (!engine) {
      throw new Error(`No engine found for simulation ${simulationId}`);
    }

    await engine.reset();
    this.logger.info('Engine reset', { simulationId });
  }

  public async destroyEngine(simulationId: number): Promise<void> {
    const engine = this.engines.get(simulationId);
    if (!engine) {
      this.logger.warn('Attempted to destroy non-existent engine', { simulationId });
      return;
    }

    await engine.destroy();
    this.engines.delete(simulationId);
    
    this.logger.info('Engine destroyed and removed', { 
      simulationId,
      remainingEngines: this.engines.size
    });
  }

  // Bulk Operations
  public async stopAllEngines(): Promise<void> {
    const stopPromises = Array.from(this.engines.values()).map(engine => 
      engine.stop().catch(error => {
        this.logger.error('Failed to stop engine during bulk stop', { 
          simulationId: engine.getSimulationId(), 
          error 
        });
      })
    );

    await Promise.all(stopPromises);
    this.logger.info('All engines stopped', { engineCount: this.engines.size });
  }

  public async destroyAllEngines(): Promise<void> {
    const destroyPromises = Array.from(this.engines.entries()).map(async ([simulationId, engine]) => {
      try {
        await engine.destroy();
        this.engines.delete(simulationId);
      } catch (error) {
        this.logger.error('Failed to destroy engine during bulk destroy', { 
          simulationId, 
          error 
        });
      }
    });

    await Promise.all(destroyPromises);
    this.engines.clear();
    this.logger.info('All engines destroyed');
  }

  // Memory Cleanup
  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 5 * 60 * 1000);

    this.logger.debug('Cleanup interval started');
  }

  private async performCleanup(): Promise<void> {
    const beforeCount = this.engines.size;
    const stoppedEngines: number[] = [];

    // Find engines that have been stopped for more than 30 minutes
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

    for (const [simulationId, engine] of this.engines.entries()) {
      const snapshot = engine.getSnapshot();
      
      if (snapshot.state === 'STOPPED' && snapshot.last_update < cutoffTime) {
        try {
          await this.destroyEngine(simulationId);
          stoppedEngines.push(simulationId);
        } catch (error) {
          this.logger.error('Failed to cleanup stopped engine', { simulationId, error });
        }
      }
    }

    if (stoppedEngines.length > 0) {
      this.logger.info('Cleanup completed', {
        cleanedEngines: stoppedEngines,
        beforeCount,
        afterCount: this.engines.size
      });
    }
  }

  public async forceCleanup(): Promise<void> {
    this.logger.info('Force cleanup initiated');
    await this.performCleanup();
  }

  // Event Management
  public addEventListener(handler: EngineEventHandler): void {
    this.globalEventHandlers.push(handler);
  }

  public removeEventListener(handler: EngineEventHandler): void {
    const index = this.globalEventHandlers.indexOf(handler);
    if (index > -1) {
      this.globalEventHandlers.splice(index, 1);
    }
  }

  private forwardEvent(event: EngineEventData): void {
    this.globalEventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        this.logger.error('Error in global event handler', { 
          eventType: event.event_type,
          simulationId: event.simulation_id,
          error 
        });
      }
    });
  }

  // Statistics and Monitoring
  public getManagerStatistics(): {
    totalEngines: number;
    runningEngines: number;
    pausedEngines: number;
    stoppedEngines: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    const engines = Array.from(this.engines.values());
    
    return {
      totalEngines: engines.length,
      runningEngines: engines.filter(e => e.getState() === 'RUNNING').length,
      pausedEngines: engines.filter(e => e.getState() === 'PAUSED').length,
      stoppedEngines: engines.filter(e => e.getState() === 'STOPPED').length,
      memoryUsage: process.memoryUsage()
    };
  }

  public getEngineStatuses(): Array<{
    simulationId: number;
    state: string;
    elapsedTime: number;
    robotCount: number;
    taskCount: number;
    lastUpdate: Date;
  }> {
    return Array.from(this.engines.entries()).map(([simulationId, engine]) => {
      const snapshot = engine.getSnapshot();
      return {
        simulationId,
        state: snapshot.state,
        elapsedTime: snapshot.elapsed_time,
        robotCount: snapshot.robots.size,
        taskCount: snapshot.tasks.size,
        lastUpdate: snapshot.last_update
      };
    });
  }

  // Shutdown
  public async shutdown(): Promise<void> {
    this.logger.info('EngineManager shutdown initiated');

    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Destroy all engines
    await this.destroyAllEngines();

    // Clear event handlers
    this.globalEventHandlers.length = 0;

    this.logger.info('EngineManager shutdown completed');
  }
}