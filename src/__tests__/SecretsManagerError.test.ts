import { SecretsManagerError } from '../SecretsManagerClient';

// src/__tests__/SecretsManagerError.test.ts
describe('SecretsManagerError', () => {
  it('should create error with all properties', () => {
    const originalError = new Error('Original error');
    const error = new SecretsManagerError('Test error', 'TEST_ERROR', 400, originalError);

    expect(error.message).toBe('Test error');
    expect(error.name).toBe('SecretsManagerError');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.originalError).toBe(originalError);
  });

  it('should create error with minimal properties', () => {
    const error = new SecretsManagerError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.name).toBe('SecretsManagerError');
    expect(error.code).toBeUndefined();
    expect(error.statusCode).toBeUndefined();
    expect(error.originalError).toBeUndefined();
  });
});
