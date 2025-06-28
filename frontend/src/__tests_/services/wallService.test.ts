// src/__tests__/services/wallService.test.ts
import { 
  createWall, 
  createBatchWalls, 
  getWallsBySimulation, 
  deleteWall,
  clearAllWalls,
  checkCoordinates,
  checkPath 
} from '../../services/wallService';

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

describe('Wall Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createWall', () => {
    test('creates wall with correct payload', async () => {
      const mockWall = {
        id: 1,
        simulation_id: 1,
        x_position: 5,
        y_position: 3,
        type: 'wall',
        created_at: '2023-01-01T00:00:00Z'
      };
      
      mockApiClient.post.mockResolvedValueOnce({
        data: { data: mockWall }
      });
      
      const payload = {
        x_position: 5,
        y_position: 3,
        type: 'wall'
      };
      
      const result = await createWall(1, payload);
      
      expect(mockApiClient.post).toHaveBeenCalledWith('/simulations/1/walls', payload);
      expect(result).toEqual(mockWall);
    });
  });

  describe('createBatchWalls', () => {
    test('creates multiple walls with batch payload', async () => {
      const mockResponse = {
        walls: [
          { id: 1, simulation_id: 1, x_position: 5, y_position: 3, type: 'wall', created_at: '2023-01-01' },
          { id: 2, simulation_id: 1, x_position: 6, y_position: 4, type: 'wall', created_at: '2023-01-01' }
        ],
        count: 2
      };
      
      mockApiClient.post.mockResolvedValueOnce({
        data: { data: mockResponse }
      });
      
      const payload = {
        walls: [
          { x_position: 5, y_position: 3, type: 'wall' },
          { x_position: 6, y_position: 4, type: 'wall' }
        ]
      };
      
      const result = await createBatchWalls(1, payload);
      
      expect(mockApiClient.post).toHaveBeenCalledWith('/simulations/1/walls/batch', payload);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getWallsBySimulation', () => {
    test('fetches walls for simulation without pagination', async () => {
      const mockWalls = [
        { id: 1, simulation_id: 1, x_position: 2, y_position: 3, type: 'wall', created_at: '2023-01-01' },
        { id: 2, simulation_id: 1, x_position: 5, y_position: 7, type: 'wall', created_at: '2023-01-01' }
      ];
      
      mockApiClient.get.mockResolvedValueOnce({
        data: { data: mockWalls }
      });
      
      const result = await getWallsBySimulation(1);
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/simulations/1/walls', { params: {} });
      expect(result).toEqual(mockWalls);
    });

    test('fetches walls for simulation with pagination', async () => {
      const mockWalls = [
        { id: 1, simulation_id: 1, x_position: 2, y_position: 3, type: 'wall', created_at: '2023-01-01' }
      ];
      
      mockApiClient.get.mockResolvedValueOnce({
        data: { data: mockWalls }
      });
      
      const result = await getWallsBySimulation(1, 1, 10);
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/simulations/1/walls', { 
        params: { page: 1, limit: 10 } 
      });
      expect(result).toEqual(mockWalls);
    });
  });

  describe('deleteWall', () => {
    test('deletes wall by ID', async () => {
      mockApiClient.delete.mockResolvedValueOnce({});
      
      await deleteWall(1);
      
      expect(mockApiClient.delete).toHaveBeenCalledWith('/walls/1');
    });
  });

  describe('clearAllWalls', () => {
    test('clears all walls for simulation', async () => {
      const mockResponse = { deletedCount: 5 };
      
      mockApiClient.delete.mockResolvedValueOnce({
        data: { data: mockResponse }
      });
      
      const result = await clearAllWalls(1);
      
      expect(mockApiClient.delete).toHaveBeenCalledWith('/simulations/1/walls');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('checkCoordinates', () => {
    test('checks coordinates availability', async () => {
      const mockResponse = {
        coordinates: { x: 5, y: 3 },
        isValid: true,
        isAvailable: true,
        occupancy: {
          hasWall: false,
          hasRobot: false,
          robotId: null
        }
      };
      
      mockApiClient.get.mockResolvedValueOnce({
        data: { data: mockResponse }
      });
      
      const result = await checkCoordinates(1, 5, 3);
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/simulations/1/walls/check-coordinates', {
        params: { x: 5, y: 3 }
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('checkPath', () => {
    test('checks path between two points', async () => {
      const mockResponse = {
        from: { x: 0, y: 0 },
        to: { x: 5, y: 5 },
        isBlocked: false,
        isPathClear: true,
        distances: {
          manhattan: 10,
          euclidean: 7.07
        }
      };
      
      mockApiClient.get.mockResolvedValueOnce({
        data: { data: mockResponse }
      });
      
      const result = await checkPath(1, 0, 0, 5, 5);
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/simulations/1/walls/check-path', {
        params: { fromX: 0, fromY: 0, toX: 5, toY: 5 }
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    test('handles API errors gracefully', async () => {
      const errorMessage = 'Network error';
      mockApiClient.post.mockRejectedValueOnce(new Error(errorMessage));
      
      await expect(createWall(1, { x_position: 5, y_position: 3 }))
        .rejects.toThrow(errorMessage);
    });

    test('handles batch creation errors', async () => {
      const errorMessage = 'Validation failed';
      mockApiClient.post.mockRejectedValueOnce(new Error(errorMessage));
      
      await expect(createBatchWalls(1, { walls: [] }))
        .rejects.toThrow(errorMessage);
    });
  });

  describe('data transformation', () => {
    test('handles response without data wrapper', async () => {
      const mockWall = {
        id: 1,
        simulation_id: 1,
        x_position: 5,
        y_position: 3,
        type: 'wall',
        created_at: '2023-01-01'
      };
      
      // Response without data wrapper
      mockApiClient.post.mockResolvedValueOnce({
        data: mockWall
      });
      
      const result = await createWall(1, { x_position: 5, y_position: 3 });
      
      expect(result).toEqual(mockWall);
    });
  });
});