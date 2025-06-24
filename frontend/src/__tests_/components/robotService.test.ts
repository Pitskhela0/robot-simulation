// src/__tests__/services/robotService.test.ts 
import { createRobot, getRobotsBySimulation, deleteRobot } from '../../services/robotService';
import { RobotVersion } from '../../types/robot';

// Mock axios
jest.mock('../../services/apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn()
  }
}));

import apiClient from '../../services/apiClient';
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Robot Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRobot', () => {
    test('creates robot with correct payload', async () => {
      const mockRobot = {
        id: 1,
        name: 'Test Robot',
        version: RobotVersion.V1,
        x_position: 0,
        y_position: 0
      };
      
      mockApiClient.post.mockResolvedValueOnce({
        data: { data: mockRobot }
      });
      
      const payload = {
        name: 'Test Robot',
        version: RobotVersion.V1,
        x_position: 0,
        y_position: 0
      };
      
      const result = await createRobot(1, payload);
      
      expect(mockApiClient.post).toHaveBeenCalledWith('/simulations/1/robots', payload);
      expect(result).toEqual(mockRobot);
    });
  });

  describe('getRobotsBySimulation', () => {
    test('fetches robots for simulation', async () => {
      const mockRobots = [
        { id: 1, name: 'Robot 1' },
        { id: 2, name: 'Robot 2' }
      ];
      
      mockApiClient.get.mockResolvedValueOnce({
        data: { data: mockRobots }
      });
      
      const result = await getRobotsBySimulation(1);
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/simulations/1/robots', {
        params: { page: 1, limit: 10 }
      });
      expect(result).toEqual(mockRobots);
    });
  });

  describe('deleteRobot', () => {
    test('deletes robot by ID', async () => {
      mockApiClient.delete.mockResolvedValueOnce({});
      
      await deleteRobot(1);
      
      expect(mockApiClient.delete).toHaveBeenCalledWith('/robots/1');
    });
  });
});