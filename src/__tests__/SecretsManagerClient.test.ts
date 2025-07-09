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

// Import the mocked module for use in beforeEach
import * as SecretsManagerModule from '@aws-sdk/client-secrets-manager';

beforeEach(() => {
  jest.clearAllMocks();
  (SecretsManagerModule.SecretsManagerClient as jest.Mock).mockImplementation(() => ({
    send: mockSend,
    destroy: mockDestroy,
  }));
});

describe('SecretsManagerClient', () => {
  const secretId = 'test-secret';
  const secretValue = 'my-secret-value';
  const secretArn = 'arn:aws:secretsmanager:region:account-id:secret:test-secret';
  const versionId = 'version-123';
  const versionStages = ['AWSCURRENT'];
  const createdDate = new Date();

  it('should initialize with default region', () => {
    const client = new SecretsManagerClient();
    expect(client).toBeInstanceOf(SecretsManagerClient);
  });

  it('should call GetSecretValueCommand and return secret', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: secretArn,
      Name: secretId,
      SecretString: secretValue,
      VersionId: versionId,
      VersionStages: versionStages,
      CreatedDate: createdDate,
    });
    const client = new SecretsManagerClient();
    const result = await client.getSecret(secretId);
    expect(GetSecretValueCommand).toHaveBeenCalledWith({ SecretId: secretId });
    expect(result).toEqual({
      arn: secretArn,
      name: secretId,
      value: secretValue,
      versionId,
      versionStages,
      createdDate,
    });
  });

  it('should throw error if secretId is empty in getSecret', async () => {
    const client = new SecretsManagerClient();
    await expect(client.getSecret('')).rejects.toThrow(SecretsManagerError);
  });

  it('should parse JSON secret with getSecretJson', async () => {
    const jsonValue = { foo: 'bar' };
    mockSend.mockResolvedValueOnce({
      ARN: secretArn,
      Name: secretId,
      SecretString: JSON.stringify(jsonValue),
      VersionId: versionId,
      VersionStages: versionStages,
      CreatedDate: createdDate,
    });
    const client = new SecretsManagerClient();
    const result = await client.getSecretJson<typeof jsonValue>(secretId);
    expect(result).toEqual(jsonValue);
  });

  it('should throw error if secret value is not valid JSON in getSecretJson', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: secretArn,
      Name: secretId,
      SecretString: 'not-json',
      VersionId: versionId,
      VersionStages: versionStages,
      CreatedDate: createdDate,
    });
    const client = new SecretsManagerClient();
    await expect(client.getSecretJson(secretId)).rejects.toThrow(
      'Failed to parse secret value as JSON'
    );
  });

  it('should throw error if secret value is empty in getSecretJson', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: secretArn,
      Name: secretId,
      SecretString: undefined,
      VersionId: versionId,
      VersionStages: versionStages,
      CreatedDate: createdDate,
    });
    const client = new SecretsManagerClient();
    await expect(client.getSecretJson(secretId)).rejects.toThrow('Secret value is empty');
  });

  it('should create a secret', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: secretArn,
      Name: secretId,
      VersionId: versionId,
    });
    const client = new SecretsManagerClient();
    const params = { Name: secretId, SecretString: secretValue };
    const result = await client.createSecret(params);
    expect(CreateSecretCommand).toHaveBeenCalledWith(params);
    expect(result).toEqual({ arn: secretArn, name: secretId, versionId });
  });

  it('should throw error if Name is missing in createSecret', async () => {
    const client = new SecretsManagerClient();
    // @ts-expect-error
    await expect(client.createSecret({ SecretString: secretValue })).rejects.toThrow(
      'Name is required'
    );
  });

  it('should update a secret', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: secretArn,
      Name: secretId,
      VersionId: versionId,
    });
    const client = new SecretsManagerClient();
    const params = { SecretId: secretId, SecretString: secretValue };
    const result = await client.updateSecret(params);
    expect(UpdateSecretCommand).toHaveBeenCalledWith(params);
    expect(result).toEqual({ arn: secretArn, name: secretId, versionId });
  });

  it('should throw error if SecretId is missing in updateSecret', async () => {
    const client = new SecretsManagerClient();
    // @ts-expect-error
    await expect(client.updateSecret({ SecretString: secretValue })).rejects.toThrow(
      'SecretId is required'
    );
  });

  it('should delete a secret', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: secretArn,
      Name: secretId,
      DeletionDate: createdDate,
    });
    const client = new SecretsManagerClient();
    const result = await client.deleteSecret(secretId, true, 7);
    expect(DeleteSecretCommand).toHaveBeenCalledWith({
      SecretId: secretId,
      ForceDeleteWithoutRecovery: true,
      RecoveryWindowInDays: 7,
    });
    expect(result).toEqual({ arn: secretArn, name: secretId, deletionDate: createdDate });
  });

  it('should rotate a secret', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: secretArn,
      Name: secretId,
      VersionId: versionId,
    });
    const client = new SecretsManagerClient();
    const params = { SecretId: secretId };
    const result = await client.rotateSecret(params);
    expect(RotateSecretCommand).toHaveBeenCalledWith(params);
    expect(result).toEqual({ arn: secretArn, name: secretId, versionId });
  });

  it('should throw error if SecretId is missing in rotateSecret', async () => {
    const client = new SecretsManagerClient();
    // @ts-expect-error
    await expect(client.rotateSecret({})).rejects.toThrow('SecretId is required');
  });

  it('should cancel secret rotation', async () => {
    mockSend.mockResolvedValueOnce({
      ARN: secretArn,
      Name: secretId,
      VersionId: versionId,
    });
    const client = new SecretsManagerClient();
    const result = await client.cancelRotateSecret(secretId);
    expect(CancelRotateSecretCommand).toHaveBeenCalledWith({ SecretId: secretId });
    expect(result).toEqual({ arn: secretArn, name: secretId, versionId });
  });

  it('should throw error if secretId is empty in cancelRotateSecret', async () => {
    const client = new SecretsManagerClient();
    await expect(client.cancelRotateSecret('')).rejects.toThrow('SecretId is required');
  });

  it('should return healthy on healthCheck if ResourceNotFoundException', async () => {
    mockSend.mockRejectedValueOnce({ name: 'ResourceNotFoundException' });
    const client = new SecretsManagerClient();
    const result = await client.healthCheck();
    expect(result.status).toBe('healthy');
  });

  it('should return unhealthy on healthCheck for other errors', async () => {
    mockSend.mockRejectedValueOnce({ name: 'AccessDeniedException', message: 'Denied' });
    const client = new SecretsManagerClient();
    const result = await client.healthCheck();
    expect(result.status).toBe('unhealthy');
    expect(result.message).toContain('Denied');
  });

  it('should close the client', async () => {
    const client = new SecretsManagerClient();
    await client.close();
    expect(mockDestroy).toHaveBeenCalled();
  });

  it('should handle AWS SDK errors and convert them to SecretsManagerError', async () => {
    mockSend.mockRejectedValueOnce({ name: 'ResourceNotFoundException', message: 'Not found' });
    const client = new SecretsManagerClient();
    await expect(client.getSecret(secretId)).rejects.toThrow('Secret not found');
  });
});
