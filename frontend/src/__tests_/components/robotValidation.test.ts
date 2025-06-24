// src/__tests__/utils/robotValidation.test.ts
import { validateRobotName, validateBatteryLevel, validateBaseStationPlacement } from '../../utils/validation';
import { RobotVersion } from '../../types/robot';

describe('Robot Validation Utils', () => {
  describe('validateRobotName', () => {
    test('validates correct robot name', () => {
      const result = validateRobotName('My Robot 1');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects empty name', () => {
      const result = validateRobotName('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Robot name is required');
    });

    test('rejects name with invalid characters', () => {
      const result = validateRobotName('Robot@#$');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Robot name can only contain letters, numbers, spaces, hyphens, and underscores');
    });
  });

  describe('validateBatteryLevel', () => {
    test('validates correct battery level for V1', () => {
      const result = validateBatteryLevel(75, RobotVersion.V1);
      expect(result.isValid).toBe(true);
    });

    test('rejects battery level exceeding capacity', () => {
      const result = validateBatteryLevel(150, RobotVersion.V1);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Battery level cannot exceed 100% for V1 robots');
    });

    test('rejects negative battery level', () => {
      const result = validateBatteryLevel(-10, RobotVersion.V1);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Battery level cannot be negative');
    });
  });

  describe('validateBaseStationPlacement', () => {
    test('validates correct coordinates', () => {
      const result = validateBaseStationPlacement(5, 5, 10, 10);
      expect(result.isValid).toBe(true);
    });

    test('rejects coordinates outside grid', () => {
      const result = validateBaseStationPlacement(15, 5, 10, 10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('X coordinate must be between 0 and 9');
    });
  });
});

export default {};