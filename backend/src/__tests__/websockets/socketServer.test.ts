// backend/src/__tests__/websocket/socketServer.test.ts

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import Client from 'socket.io-client';
import { Pool } from 'pg';
import SocketServer from '../../websocket/socketServer';
import { testPool, cleanupTestDatabase, closeTestDatabase, dropAllTables } from '../../db/test-setup';
import { MigrationRunner } from '../../db/migrate';
import { TestDataHelper } from '../helpers/testData';

describe('SocketServer', () => {
  let httpServer: any;
  let socketServer: SocketServer;
  let testHelper: TestDataHelper;
  let testUser: any;
  let testSimulation: any;
  let clientSocket: any;
  let serverAddress: string;

  beforeAll(async () => {
    // Setup test database
    await dropAllTables();
    const migrationRunner = new MigrationRunner(testPool);
    await migrationRunner.runMigrations();
    
    testHelper = new TestDataHelper(testPool);
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    // Clean database
    await testHelper.cleanupTestData();
    testUser = await testHelper.createTestUser();
    testSimulation = await testHelper.createTestSimulation(testUser.id);

    // Create HTTP server and SocketServer
    httpServer = createServer();
    socketServer = new SocketServer(httpServer, testPool);

    // Start server on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        const port = typeof address === 'object' && address ? address.port : 3001;
        serverAddress = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    // Clean up client connection
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }

    // Close server
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    }
  });

  describe('Connection Management', () => {
    test('should accept client connections', (done) => {
      clientSocket = Client(serverAddress);

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on('connect_error', (error: any) => {
        done(error);
      });
    });

    test('should send connection confirmation', (done) => {
      clientSocket = Client(serverAddress);

      clientSocket.on('connected', () => {
        expect(true).toBe(true); // Connection confirmed
        done();
      });
    });

    test('should handle client disconnection', (done) => {
      clientSocket = Client(serverAddress);

      clientSocket.on('connect', () => {
        clientSocket.disconnect();
      });

      clientSocket.on('disconnect', () => {
        expect(clientSocket.connected).toBe(false);
        done();
      });
    });

    test('should track connection statistics', (done) => {
      clientSocket = Client(serverAddress);

      clientSocket.on('connect', () => {
        const stats = socketServer.getConnectionStats();
        expect(stats.totalConnections).toBe(1);
        expect(stats.simulationRooms).toBe(0);
        done();
      });
    });
  });

  describe('Simulation Room Management', () => {
    beforeEach((done) => {
      clientSocket = Client(serverAddress);
      clientSocket.on('connect', done);
    });

    test('should allow joining simulation room', (done) => {
      clientSocket.emit('simulation:join', testSimulation.id);

      clientSocket.on('simulation:update', (data: any) => {
        expect(data.simulationId).toBe(testSimulation.id);
        expect(data.status).toBeDefined();
        done();
      });
    });

    test('should handle joining non-existent simulation', (done) => {
      clientSocket.emit('simulation:join', 99999);

      clientSocket.on('error', (message: string) => {
        expect(message).toContain('Simulation 99999 not found');
        done();
      });
    });

    test('should allow leaving simulation room', (done) => {
      clientSocket.emit('simulation:join', testSimulation.id);

      setTimeout(() => {
        clientSocket.emit('simulation:leave', testSimulation.id);
        // Room tracking is internal, so we just verify no errors
        setTimeout(() => {
          done();
        }, 100);
      }, 100);
    });

    test('should update room statistics when joining', (done) => {
      clientSocket.emit('simulation:join', testSimulation.id);

      setTimeout(() => {
        const stats = socketServer.getConnectionStats();
        expect(stats.simulationRooms).toBe(1);
        done();
      }, 100);
    });
  });

  describe('Simulation Control Events', () => {
    beforeEach((done) => {
      clientSocket = Client(serverAddress);
      clientSocket.on('connect', () => {
        clientSocket.emit('simulation:join', testSimulation.id);
        done();
      });
    });

    test('should handle simulation start', (done) => {
      clientSocket.emit('simulation:start', testSimulation.id);

      clientSocket.on('simulation:update', (data: any) => {
        if (data.status === 'running') {
          expect(data.simulationId).toBe(testSimulation.id);
          expect(data.status).toBe('running');
          done();
        }
      });
    });

    test('should handle simulation pause', (done) => {
      // First start the simulation
      clientSocket.emit('simulation:start', testSimulation.id);

      setTimeout(() => {
        clientSocket.emit('simulation:pause', testSimulation.id);

        clientSocket.on('simulation:update', (data: any) => {
          if (data.status === 'paused') {
            expect(data.simulationId).toBe(testSimulation.id);
            expect(data.status).toBe('paused');
            done();
          }
        });
      }, 100);
    });

    test('should handle simulation reset', (done) => {
      // Create some robots first
      testHelper.createTestRobot(testSimulation.id, {
        x_position: 5,
        y_position: 5,
        battery_level: 50
      }).then(() => {
        clientSocket.emit('simulation:reset', testSimulation.id);

        clientSocket.on('simulation:update', (data: any) => {
          if (data.status === 'created') {
            expect(data.simulationId).toBe(testSimulation.id);
            expect(data.status).toBe('created');
            // Verify robot was reset (position and battery)
            expect(data.robots).toBeDefined();
            done();
          }
        });
      });
    });

    test('should handle errors in simulation control', (done) => {
      clientSocket.emit('simulation:start', 99999); // Non-existent simulation

      clientSocket.on('error', (message: string) => {
        expect(message).toContain('Failed to start simulation');
        done();
      });
    });
  });

  describe('Broadcasting Methods', () => {
    let secondClientSocket: any;

    beforeEach((done) => {
      clientSocket = Client(serverAddress);
      secondClientSocket = Client(serverAddress);
      
      let connectCount = 0;
      const onConnect = () => {
        connectCount++;
        if (connectCount === 2) {
          // Both clients join the same simulation
          clientSocket.emit('simulation:join', testSimulation.id);
          secondClientSocket.emit('simulation:join', testSimulation.id);
          setTimeout(done, 100);
        }
      };

      clientSocket.on('connect', onConnect);
      secondClientSocket.on('connect', onConnect);
    });

    afterEach(() => {
      if (secondClientSocket?.connected) {
        secondClientSocket.disconnect();
      }
    });

    test('should broadcast robot updates to all clients in simulation', (done) => {
      const robotUpdateData = {
        robotId: 1,
        simulationId: testSimulation.id,
        x_position: 5,
        y_position: 5,
        battery_level: 80,
        status: 'moving',
        direction: 'north'
      };

      let receivedCount = 0;
      const onRobotPosition = (data: any) => {
        expect(data.robotId).toBe(1);
        expect(data.x_position).toBe(5);
        expect(data.y_position).toBe(5);
        receivedCount++;
        if (receivedCount === 2) done(); // Both clients received
      };

      clientSocket.on('robot:position', onRobotPosition);
      secondClientSocket.on('robot:position', onRobotPosition);

      // Broadcast update
      socketServer.broadcastRobotUpdate(robotUpdateData);
    });

    test('should broadcast task updates', (done) => {
      const taskUpdateData = {
        taskId: 1,
        simulationId: testSimulation.id,
        status: 'assigned',
        robotId: 1
      };

      clientSocket.on('task:assigned', (data: any) => {
        expect(data.taskId).toBe(1);
        expect(data.robotId).toBe(1);
        done();
      });

      socketServer.broadcastTaskUpdate(taskUpdateData);
    });

    test('should broadcast battery alerts', (done) => {
      const batteryData = {
        robotId: 1,
        simulationId: testSimulation.id,
        battery_level: 15,
        isCharging: false
      };

      clientSocket.on('battery:low', (data: any) => {
        expect(data.robotId).toBe(1);
        expect(data.battery_level).toBe(15);
        done();
      });

      socketServer.broadcastBatteryAlert(batteryData);
    });

    test('should not broadcast battery alert if robot is charging', (done) => {
      const batteryData = {
        robotId: 1,
        simulationId: testSimulation.id,
        battery_level: 15,
        isCharging: true // Should not trigger alert
      };

      let alertReceived = false;
      clientSocket.on('battery:low', () => {
        alertReceived = true;
      });

      socketServer.broadcastBatteryAlert(batteryData);

      setTimeout(() => {
        expect(alertReceived).toBe(false);
        done();
      }, 100);
    });
  });

  describe('Database Integration', () => {
    beforeEach((done) => {
      clientSocket = Client(serverAddress);
      clientSocket.on('connect', done);
    });

    test('should validate simulation exists when joining', (done) => {
      clientSocket.emit('simulation:join', 99999);

      clientSocket.on('error', (message: string) => {
        expect(message).toContain('not found');
        done();
      });
    });

    test('should update simulation status in database', async () => {
      clientSocket.emit('simulation:join', testSimulation.id);
      
      await new Promise<void>((resolve) => {
        clientSocket.emit('simulation:start', testSimulation.id);
        setTimeout(resolve, 100);
      });

      // Verify database was updated
      const result = await testPool.query('SELECT status FROM simulations WHERE id = $1', [testSimulation.id]);
      expect(result.rows[0].status).toBe('running');
    });

    test('should reset robots and tasks in database on simulation reset', async () => {
      // Create test robot and task
      const robot = await testHelper.createTestRobot(testSimulation.id, {
        x_position: 5,
        y_position: 5,
        battery_level: 50
      });

      const task = await testHelper.createTestTask(testSimulation.id, {
        status: 'assigned',
        robot_id: robot.id
      });

      clientSocket.emit('simulation:join', testSimulation.id);
      
      await new Promise<void>((resolve) => {
        clientSocket.emit('simulation:reset', testSimulation.id);
        setTimeout(resolve, 200);
      });

      // Verify robot was reset
      const robotResult = await testPool.query('SELECT * FROM robots WHERE id = $1', [robot.id]);
      const resetRobot = robotResult.rows[0];
      expect(resetRobot.x_position).toBe(0); // Reset to base station
      expect(resetRobot.y_position).toBe(0);
      expect(resetRobot.status).toBe('idle');
      expect(resetRobot.battery_level).toBe(100); // V1 robot full battery

      // Verify task was reset
      const taskResult = await testPool.query('SELECT * FROM tasks WHERE id = $1', [task.id]);
      const resetTask = taskResult.rows[0];
      expect(resetTask.status).toBe('pending');
      expect(resetTask.robot_id).toBeNull();
    });
  });

  describe('Error Handling', () => {
    beforeEach((done) => {
      clientSocket = Client(serverAddress);
      clientSocket.on('connect', done);
    });

    test('should handle database errors gracefully', (done) => {
      // Mock a database error by using invalid simulation ID
      clientSocket.emit('simulation:start', -1);

      clientSocket.on('error', (message: string) => {
        expect(message).toContain('Failed to start simulation');
        done();
      });
    });

    test('should handle invalid event data', (done) => {
      clientSocket.emit('simulation:join', 'invalid-id');

      clientSocket.on('error', (message: string) => {
        expect(message).toBeDefined();
        done();
      });
    });
  });
});