/* eslint-disable @typescript-eslint/ban-ts-comment */
import { SecretsManagerClient, SecretsManagerError } from '../SecretsManagerClient';
import {
  GetSecretValueCommand,
  CreateSecretCommand,
  UpdateSecretCommand,
  DeleteSecretCommand,
  RotateSecretCommand,
  CancelRotateSecretCommand,
} from '@aws-sdk/client-secrets-manager';
import * as SecretsManagerModule from '@aws-sdk/client-secrets-manager';

jest.mock('@aws-sdk/client-secrets-manager', () => {
  const actual = jest.requireActual('@aws-sdk/client-secrets-manager');
  return {
    ...actual,
    SecretsManagerClient: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
      destroy: jest.fn(),
    })),
    GetSecretValueCommand: jest.fn(),
    CreateSecretCommand: jest.fn(),
    UpdateSecretCommand: jest.fn(),
    DeleteSecretCommand: jest.fn(),
    RotateSecretCommand: jest.fn(),
    CancelRotateSecretCommand: jest.fn(),
  };
});

const mockSend = jest.fn();
const mockDestroy = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (SecretsManagerModule.SecretsManagerClient as jest.Mock).mockImplementation(() => ({
    send: mockSend,
    destroy: mockDestroy,
  }));
});

describe('SecretsManagerClient', () => {
  const secretId = 'test-secret';
  const secretValue = 'supersecret';
  const arn = 'arn:aws:secretsmanager:region:123456789012:secret:test-secret';
  const versionId = 'version-123';
  const name = 'test-secret';

  it('should initialize with default region', () => {
    const client = new SecretsManagerClient();
    expect(client).toBeInstanceOf(SecretsManagerClient);
  });

  it('should initialize with custom options and logger', () => {
    const logger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const client = new SecretsManagerClient({
      region: 'eu-west-1',
      retryPolicy: { maxRetries: 5 },
      logger,
    });
    expect(client).toBeInstanceOf(SecretsManagerClient);
    expect(logger.info).toHaveBeenCalledWith('SecretsManager client initialized', {
      region: 'eu-west-1',
      maxRetries: 5,
    });
  });

  it('should throw error if secretId is invalid in getSecret', async () => {
    const client = new SecretsManagerClient();
    await expect(client.getSecret('', undefined, undefined)).rejects.toThrow(SecretsManagerError);
    await expect(client.getSecret('   ', undefined, undefined)).rejects.toThrow(
      SecretsManagerError
    );
    // @ts-expect-error
    await expect(client.getSecret(undefined, undefined, undefined)).rejects.toThrow(
      SecretsManagerError
    );
  });

  it('should get secret successfully', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: arn,
      Name: name,
      SecretString: secretValue,
      VersionId: versionId,
      VersionStages: ['AWSCURRENT'],
      CreatedDate: new Date(),
    });
    const client = new SecretsManagerClient();
    const result = await client.getSecret(secretId);
    expect(result.value).toBe(secretValue);
    expect(mockSend).toHaveBeenCalledWith(expect.any(GetSecretValueCommand));
  });

  it('should get secret with versionId and versionStage', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: arn,
      Name: name,
      SecretString: secretValue,
      VersionId: versionId,
      VersionStages: ['AWSCURRENT'],
      CreatedDate: new Date(),
    });
    const client = new SecretsManagerClient();
    const result = await client.getSecret(secretId, 'vid', 'stage');
    expect(result.value).toBe(secretValue);
    expect(mockSend).toHaveBeenCalledWith(expect.any(GetSecretValueCommand));
  });

  it('should handle getSecret error: ResourceNotFoundException', async () => {
    mockSend.mockRejectedValueOnce({ name: 'ResourceNotFoundException', message: 'Not found' });
    const client = new SecretsManagerClient();
    await expect(client.getSecret(secretId)).rejects.toThrow('Secret not found');
  });

  it('should handle getSecret error: AccessDeniedError', async () => {
    mockSend.mockRejectedValueOnce({ name: 'AccessDeniedError', message: 'Denied' });
    const client = new SecretsManagerClient();
    await expect(client.getSecret(secretId)).rejects.toThrow('Access denied');
  });

  it('should handle getSecret error: InvalidParameterException', async () => {
    mockSend.mockRejectedValueOnce({ name: 'InvalidParameterException', message: 'Bad param' });
    const client = new SecretsManagerClient();
    await expect(client.getSecret(secretId)).rejects.toThrow('Invalid parameter');
  });

  it('should handle getSecret error: InvalidRequestException', async () => {
    mockSend.mockRejectedValueOnce({ name: 'InvalidRequestException', message: 'Bad request' });
    const client = new SecretsManagerClient();
    await expect(client.getSecret(secretId)).rejects.toThrow('Invalid request');
  });

  it('should handle getSecret error: ResourceExistsException', async () => {
    mockSend.mockRejectedValueOnce({ name: 'ResourceExistsException', message: 'Exists' });
    const client = new SecretsManagerClient();
    await expect(client.getSecret(secretId)).rejects.toThrow('Resource already exists');
  });

  it('should handle getSecret error: unknown error', async () => {
    mockSend.mockRejectedValueOnce({
      name: 'SomeOtherError',
      message: 'Oops',
      $metadata: { httpStatusCode: 500 },
    });
    const client = new SecretsManagerClient();
    await expect(client.getSecret(secretId)).rejects.toThrow('Operation getSecret failed: Oops');
  });

  it('should get and parse secret JSON', async () => {
    const json = { foo: 'bar' };
    mockSend.mockResolvedValueOnce({
      ARN: arn,
      Name: name,
      SecretString: JSON.stringify(json),
      VersionId: versionId,
      VersionStages: ['AWSCURRENT'],
      CreatedDate: new Date(),
    });
    const client = new SecretsManagerClient();
    const result = await client.getSecretJson<typeof json>(secretId);
    expect(result).toEqual(json);
  });

  it('should throw if secret value is empty in getSecretJson', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: arn,
      Name: name,
      SecretString: undefined,
      VersionId: versionId,
      VersionStages: ['AWSCURRENT'],
      CreatedDate: new Date(),
    });
    const client = new SecretsManagerClient();
    await expect(client.getSecretJson(secretId)).rejects.toThrow('Secret value is empty');
  });

  it('should throw if secret value is not JSON', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: arn,
      Name: name,
      SecretString: 'not-json',
      VersionId: versionId,
      VersionStages: ['AWSCURRENT'],
      CreatedDate: new Date(),
    });
    const client = new SecretsManagerClient();
    await expect(client.getSecretJson(secretId)).rejects.toThrow(
      'Failed to parse secret value as JSON'
    );
  });

  it('should create secret', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: arn,
      Name: name,
      VersionId: versionId,
    });
    const client = new SecretsManagerClient();
    const result = await client.createSecret({ Name: name, SecretString: secretValue });
    expect(result.arn).toBe(arn);
    expect(mockSend).toHaveBeenCalledWith(expect.any(CreateSecretCommand));
  });

  it('should create secret with missing ARN/Name/VersionId', async () => {
    mockSend.mockResolvedValueOnce({});
    const client = new SecretsManagerClient();
    const result = await client.createSecret({ Name: name, SecretString: secretValue });
    expect(result.arn).toBe('');
    expect(result.name).toBe('');
    expect(result.versionId).toBe('');
  });

  it('should throw if createSecret called without Name', async () => {
    const client = new SecretsManagerClient();
    // @ts-expect-error
    await expect(client.createSecret({ SecretString: secretValue })).rejects.toThrow(
      'Name is required'
    );
  });

  it('should update secret', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: arn,
      Name: name,
      VersionId: versionId,
    });
    const client = new SecretsManagerClient();
    const result = await client.updateSecret({ SecretId: secretId, SecretString: secretValue });
    expect(result.arn).toBe(arn);
    expect(mockSend).toHaveBeenCalledWith(expect.any(UpdateSecretCommand));
  });

  it('should update secret with missing ARN/Name/VersionId', async () => {
    mockSend.mockResolvedValueOnce({});
    const client = new SecretsManagerClient();
    const result = await client.updateSecret({ SecretId: secretId, SecretString: secretValue });
    expect(result.arn).toBe('');
    expect(result.name).toBe('');
    expect(result.versionId).toBe('');
  });

  it('should throw if updateSecret called without SecretId', async () => {
    const client = new SecretsManagerClient();
    // @ts-expect-error
    await expect(client.updateSecret({ SecretString: secretValue })).rejects.toThrow(
      'SecretId is required'
    );
  });

  it('should delete secret', async () => {
    const deletionDate = new Date();
    mockSend.mockResolvedValueOnce({
      ARN: arn,
      Name: name,
      DeletionDate: deletionDate,
    });
    const client = new SecretsManagerClient();
    const result = await client.deleteSecret(secretId, true, 7);
    expect(result.arn).toBe(arn);
    expect(result.deletionDate).toEqual(deletionDate);
    expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteSecretCommand));
  });

  it('should delete secret with string DeletionDate', async () => {
    const deletionDate = new Date().toISOString();
    mockSend.mockResolvedValueOnce({
      ARN: arn,
      Name: name,
      DeletionDate: deletionDate,
    });
    const client = new SecretsManagerClient();
    const result = await client.deleteSecret(secretId, true, 7);
    expect(result.deletionDate).toEqual(new Date(deletionDate));
  });

  it('should delete secret with missing DeletionDate', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: arn,
      Name: name,
    });
    const client = new SecretsManagerClient();
    const result = await client.deleteSecret(secretId, true, 7);
    expect(result.deletionDate).toEqual(new Date(0));
  });

  it('should throw if deleteSecret called with invalid secretId', async () => {
    const client = new SecretsManagerClient();
    // @ts-expect-error
    await expect(client.deleteSecret(undefined)).rejects.toThrow('SecretId is required');
  });

  it('should rotate secret', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: arn,
      Name: name,
      VersionId: versionId,
    });
    const client = new SecretsManagerClient();
    const result = await client.rotateSecret({ SecretId: secretId });
    expect(result.arn).toBe(arn);
    expect(mockSend).toHaveBeenCalledWith(expect.any(RotateSecretCommand));
  });

  it('should rotate secret with missing ARN/Name/VersionId', async () => {
    mockSend.mockResolvedValueOnce({});
    const client = new SecretsManagerClient();
    const result = await client.rotateSecret({ SecretId: secretId });
    expect(result.arn).toBe('');
    expect(result.name).toBe('');
    expect(result.versionId).toBe('');
  });

  it('should throw if rotateSecret called without SecretId', async () => {
    const client = new SecretsManagerClient();
    // @ts-expect-error
    await expect(client.rotateSecret({})).rejects.toThrow('SecretId is required');
  });

  it('should cancel rotate secret', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: arn,
      Name: name,
      VersionId: versionId,
    });
    const client = new SecretsManagerClient();
    const result = await client.cancelRotateSecret(secretId);
    expect(result.arn).toBe(arn);
    expect(mockSend).toHaveBeenCalledWith(expect.any(CancelRotateSecretCommand));
  });

  it('should cancel rotate secret with missing ARN/Name/VersionId', async () => {
    mockSend.mockResolvedValueOnce({});
    const client = new SecretsManagerClient();
    const result = await client.cancelRotateSecret(secretId);
    expect(result.arn).toBe('');
    expect(result.name).toBe('');
    expect(result.versionId).toBe('');
  });

  it('should throw if cancelRotateSecret called with invalid secretId', async () => {
    const client = new SecretsManagerClient();
    // @ts-expect-error
    await expect(client.cancelRotateSecret(undefined)).rejects.toThrow('SecretId is required');
  });

  it('should perform health check (healthy)', async () => {
    mockSend.mockRejectedValueOnce({ name: 'ResourceNotFoundException' });
    const client = new SecretsManagerClient();
    const result = await client.healthCheck();
    expect(result.status).toBe('healthy');
  });

  it('should perform health check (unhealthy)', async () => {
    mockSend.mockRejectedValueOnce({ name: 'AccessDeniedException', message: 'Denied' });
    const client = new SecretsManagerClient();
    const result = await client.healthCheck();
    expect(result.status).toBe('unhealthy');
    expect(result.message).toMatch(/Denied/);
  });

  it('should close the client', async () => {
    const client = new SecretsManagerClient();
    await client.close();
    expect(mockDestroy).toHaveBeenCalled();
  });
});

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
