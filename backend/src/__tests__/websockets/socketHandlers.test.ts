// backend/src/__tests__/websocket/socketHandlers.test.ts

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import Client from 'socket.io-client';
import { Pool } from 'pg';
import { SocketHandlers } from '../../websocket/socketHandlers';
import { SocketMiddleware } from '../../websocket/socketMiddleware';
import { testPool, cleanupTestDatabase, closeTestDatabase, dropAllTables } from '../../db/test-setup';
import { MigrationRunner } from '../../db/migrate';
import { TestDataHelper } from '../helpers/testData';

describe('SocketHandlers', () => {
  let httpServer: any;
  let io: SocketIOServer;
  let socketHandlers: SocketHandlers;
  let socketMiddleware: SocketMiddleware;
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

    // Create HTTP server and Socket.IO
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "http://localhost:*",
        methods: ["GET", "POST"]
      }
    });

    // Initialize handlers and middleware
    socketHandlers = new SocketHandlers(testPool);
    socketMiddleware = new SocketMiddleware();

    // Apply middleware (optional for testing)
    // io.use(socketMiddleware.validationMiddleware);
    // io.use(socketMiddleware.rateLimitMiddleware);

    // Set up connection handler
    io.on('connection', socketHandlers.handleConnection);

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
    test('should handle client connection', (done) => {
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

      clientSocket.on('connected', (data: any) => {
        expect(data.socketId).toBeDefined();
        expect(data.timestamp).toBeDefined();
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
        const stats = socketHandlers.getConnectionStats();
        expect(stats.totalConnections).toBe(1);
        expect(stats.simulationRooms).toBeInstanceOf(Map);
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
      clientSocket.emit('simulation:join', {
        simulationId: testSimulation.id,
        userId: testUser.id
      });

      clientSocket.on('simulation:update', (data: any) => {
        expect(data.simulationId).toBe(testSimulation.id);
        expect(data.status).toBeDefined();
        expect(data.robots).toBeDefined();
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    test('should handle joining non-existent simulation', (done) => {
      clientSocket.emit('simulation:join', {
        simulationId: 99999,
        userId: testUser.id
      });

      clientSocket.on('error', (error: any) => {
        expect(error.message).toContain('Simulation 99999 not found');
        expect(error.code).toBe('SIMULATION_NOT_FOUND');
        done();
      });
    });

    test('should allow leaving simulation room', (done) => {
      // First join
      clientSocket.emit('simulation:join', {
        simulationId: testSimulation.id,
        userId: testUser.id
      });

      setTimeout(() => {
        clientSocket.emit('simulation:leave', {
          simulationId: testSimulation.id
        });
        
        // Check that client is no longer in simulation
        setTimeout(() => {
          const isInSim = socketHandlers.isClientInSimulation(
            clientSocket.id, 
            testSimulation.id
          );
          expect(isInSim).toBe(false);
          done();
        }, 100);
      }, 100);
    });

    test('should update room statistics when joining', (done) => {
      clientSocket.emit('simulation:join', {
        simulationId: testSimulation.id,
        userId: testUser.id
      });

      setTimeout(() => {
        const stats = socketHandlers.getConnectionStats();
        expect(stats.simulationRooms.get(testSimulation.id)).toBe(1);
        done();
      }, 100);
    });

    test('should handle switching between simulation rooms', (done) => {
      const otherSimulation = testHelper.createTestSimulation(testUser.id).then(sim => {
        // Join first simulation
        clientSocket.emit('simulation:join', {
          simulationId: testSimulation.id,
          userId: testUser.id
        });

        setTimeout(() => {
          // Join second simulation (should leave first)
          clientSocket.emit('simulation:join', {
            simulationId: sim.id,
            userId: testUser.id
          });

          setTimeout(() => {
            const stats = socketHandlers.getConnectionStats();
            expect(stats.simulationRooms.get(testSimulation.id)).toBeUndefined();
            expect(stats.simulationRooms.get(sim.id)).toBe(1);
            done();
          }, 100);
        }, 100);
      });
    });
  });

  describe('Simulation Control Events', () => {
    beforeEach((done) => {
      clientSocket = Client(serverAddress);
      clientSocket.on('connect', () => {
        clientSocket.emit('simulation:join', {
          simulationId: testSimulation.id,
          userId: testUser.id
        });
        setTimeout(done, 50);
      });
    });

    test('should handle simulation start', (done) => {
      let updateCount = 0;
      
      clientSocket.on('simulation:update', (data: any) => {
        updateCount++;
        if (updateCount === 2 && data.status === 'running') { // Skip initial join update
          expect(data.simulationId).toBe(testSimulation.id);
          expect(data.status).toBe('running');
          done();
        }
      });

      clientSocket.emit('simulation:start', {
        simulationId: testSimulation.id
      });
    });

    test('should handle simulation pause', (done) => {
      let updateCount = 0;
      
      clientSocket.on('simulation:update', (data: any) => {
        updateCount++;
        if (updateCount === 2 && data.status === 'paused') {
          expect(data.simulationId).toBe(testSimulation.id);
          expect(data.status).toBe('paused');
          done();
        }
      });

      clientSocket.emit('simulation:pause', {
        simulationId: testSimulation.id
      });
    });

    test('should handle simulation reset', (done) => {
      // Create some robots first
      testHelper.createTestRobot(testSimulation.id, {
        x_position: 5,
        y_position: 5,
        battery_level: 50
      }).then(() => {
        let updateCount = 0;
        
        clientSocket.on('simulation:update', (data: any) => {
          updateCount++;
          if (updateCount === 2 && data.status === 'created') {
            expect(data.simulationId).toBe(testSimulation.id);
            expect(data.status).toBe('created');
            done();
          }
        });

        clientSocket.emit('simulation:reset', {
          simulationId: testSimulation.id
        });
      });
    });

    test('should prevent unauthorized simulation control', (done) => {
      // Create another client not in the simulation
      const unauthorizedClient = Client(serverAddress);
      
      unauthorizedClient.on('connect', () => {
        unauthorizedClient.emit('simulation:start', {
          simulationId: testSimulation.id
        });

        unauthorizedClient.on('error', (error: any) => {
          expect(error.message).toContain('Not authorized');
          expect(error.code).toBe('UNAUTHORIZED_SIMULATION');
          unauthorizedClient.disconnect();
          done();
        });
      });
    });
  });

  describe('Robot Update Events', () => {
    let testRobot: any;

    beforeEach(async () => {
      testRobot = await testHelper.createTestRobot(testSimulation.id);
      
      return new Promise<void>((resolve) => {
        clientSocket = Client(serverAddress);
        clientSocket.on('connect', () => {
          clientSocket.emit('simulation:join', {
            simulationId: testSimulation.id,
            userId: testUser.id
          });
          setTimeout(resolve, 50);
        });
      });
    });

    test('should handle robot position updates', (done) => {
      const robotUpdateData = {
        robotId: testRobot.id,
        simulationId: testSimulation.id,
        x_position: 5,
        y_position: 7,
        battery_level: 80,
        status: 'moving',
        direction: 'east'
      };

      clientSocket.on('robot:position', (data: any) => {
        expect(data.robotId).toBe(testRobot.id);
        expect(data.x_position).toBe(5);
        expect(data.y_position).toBe(7);
        expect(data.direction).toBe('east');
        expect(data.timestamp).toBeDefined();
        done();
      });

      clientSocket.emit('robot:update', robotUpdateData);
    });

    test('should handle robot status updates', (done) => {
      const robotUpdateData = {
        robotId: testRobot.id,
        simulationId: testSimulation.id,
        x_position: 5,
        y_position: 7,
        battery_level: 60,
        status: 'working'
      };

      clientSocket.on('robot:status', (data: any) => {
        expect(data.robotId).toBe(testRobot.id);
        expect(data.status).toBe('working');
        expect(data.battery_level).toBe(60);
        expect(data.timestamp).toBeDefined();
        done();
      });

      clientSocket.emit('robot:update', robotUpdateData);
    });

    test('should prevent unauthorized robot updates', (done) => {
      const unauthorizedClient = Client(serverAddress);
      
      unauthorizedClient.on('connect', () => {
        unauthorizedClient.emit('robot:update', {
          robotId: testRobot.id,
          simulationId: testSimulation.id,
          x_position: 5,
          y_position: 7,
          battery_level: 80,
          status: 'moving'
        });

        unauthorizedClient.on('error', (error: any) => {
          expect(error.message).toContain('Not authorized');
          expect(error.code).toBe('UNAUTHORIZED_SIMULATION');
          unauthorizedClient.disconnect();
          done();
        });
      });
    });
  });

  describe('Task Update Events', () => {
    let testTask: any;
    let testRobot: any;

    beforeEach(async () => {
      testRobot = await testHelper.createTestRobot(testSimulation.id);
      testTask = await testHelper.createTestTask(testSimulation.id);
      
      return new Promise<void>((resolve) => {
        clientSocket = Client(serverAddress);
        clientSocket.on('connect', () => {
          clientSocket.emit('simulation:join', {