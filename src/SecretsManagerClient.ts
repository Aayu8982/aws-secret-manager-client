import {
  SecretsManagerClient as AwsSecretsManagerClient,
  GetSecretValueCommand,
  CreateSecretCommand,
  UpdateSecretCommand,
  DeleteSecretCommand,
  RotateSecretCommand,
  CancelRotateSecretCommand,
  SecretsManagerClientConfig,
  GetSecretValueCommandInput,
  CreateSecretCommandInput,
  UpdateSecretCommandInput,
  DeleteSecretCommandInput,
  RotateSecretCommandInput,
  CancelRotateSecretCommandInput,
} from '@aws-sdk/client-secrets-manager';
import type { Logger } from '@aws-sdk/types';

export interface SecretsManagerOptions extends SecretsManagerClientConfig {
  retryPolicy?: {
    maxRetries?: number;
    retryDelayOptions?: {
      base?: number;
      customBackoff?: (retryCount: number) => number;
    };
  };
  timeout?: number;
  logger?: Logger;
}

export interface SecretValue {
  arn?: string | undefined;
  name?: string | undefined;
  value?: string | undefined;
  versionId?: string | undefined;
  versionStages?: string[] | undefined;
  createdDate?: Date | undefined;
}

export class SecretsManagerError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'SecretsManagerError';
  }
}

export class SecretsManagerClient {
  private awsClient: AwsSecretsManagerClient;
  private options: SecretsManagerOptions;
  private logger: Required<SecretsManagerOptions['logger']>;

  constructor(options: SecretsManagerOptions = {}) {
    this.options = {
      region: process.env.AWS_REGION || 'us-east-1',
      ...options,
    };

    // Initialize logger with default no-op functions
    this.logger = {
      trace: options.logger?.trace || (() => {}),
      debug: options.logger?.debug || (() => {}),
      info: options.logger?.info || (() => {}),
      warn: options.logger?.warn || (() => {}),
      error: options.logger?.error || (() => {}),
    };

    // Create AWS SDK v3 client
    this.awsClient = new AwsSecretsManagerClient({
      ...this.options,
      region: this.options.region ?? 'us-east-1',
      maxAttempts: this.options.retryPolicy?.maxRetries || 3,
    });

    this.logger.info('SecretsManager client initialized', {
      region: this.options.region,
      maxRetries: this.options.retryPolicy?.maxRetries || 3,
    });
  }

  /**
   * Validates that a secret ID is provided and not empty
   */
  private validateSecretId(secretId: string): void {
    if (!secretId || typeof secretId !== 'string' || secretId.trim() === '') {
      throw new SecretsManagerError('SecretId is required and must be a non-empty string');
    }
  }

  /**
   * Handles AWS SDK errors and converts them to SecretsManagerError
   */
  private handleError(error: any, operation: string): never {
    (this.logger?.error ?? (() => {}))(`Error in ${operation}:`, error ?? {});

    if (error.name === 'ResourceNotFoundException') {
      throw new SecretsManagerError(
        `Secret not found: ${error.message}`,
        'RESOURCE_NOT_FOUND',
        404,
        error
      );
    }

    if (error.name === 'AccessDeniedError') {
      throw new SecretsManagerError(`Access denied: ${error.message}`, 'ACCESS_DENIED', 403, error);
    }

    if (error.name === 'InvalidParameterException') {
      throw new SecretsManagerError(
        `Invalid parameter: ${error.message}`,
        'INVALID_PARAMETER',
        400,
        error
      );
    }

    if (error.name === 'InvalidRequestException') {
      throw new SecretsManagerError(
        `Invalid request: ${error.message}`,
        'INVALID_REQUEST',
        400,
        error
      );
    }

    if (error.name === 'ResourceExistsException') {
      throw new SecretsManagerError(
        `Resource already exists: ${error.message}`,
        'RESOURCE_EXISTS',
        409,
        error
      );
    }

    // Generic error handling
    throw new SecretsManagerError(
      `Operation ${operation} failed: ${error.message || 'Unknown error'}`,
      error.name || 'UNKNOWN_ERROR',
      error.$metadata?.httpStatusCode || 500,
      error
    );
  }

  /**
   * Retrieves a secret value from AWS Secrets Manager
   */
  async getSecret(
    secretId: string,
    versionId?: string,
    versionStage?: string
  ): Promise<SecretValue> {
    this.validateSecretId(secretId);

    const params: GetSecretValueCommandInput = {
      SecretId: secretId,
      ...(versionId && { VersionId: versionId }),
      ...(versionStage && { VersionStage: versionStage }),
    };

    this.logger?.debug('Getting secret', { secretId, versionId, versionStage });

    try {
      const command = new GetSecretValueCommand(params);
      const response = await this.awsClient.send(command);

      const secretValue: SecretValue = {
        arn: response.ARN,
        name: response.Name,
        value: response.SecretString,
        versionId: response.VersionId,
        versionStages: response.VersionStages,
        createdDate: response.CreatedDate,
      };

      this.logger?.info('Secret retrieved successfully', { secretId });
      return secretValue;
    } catch (error) {
      this.handleError(error, 'getSecret');
    }
  }

  /**
   * Retrieves and parses a JSON secret value
   */
  async getSecretJson<T = unknown>(
    secretId: string,
    versionId?: string,
    versionStage?: string
  ): Promise<T> {
    const secret = await this.getSecret(secretId, versionId, versionStage);

    if (!secret.value) {
      throw new SecretsManagerError('Secret value is empty', 'EMPTY_SECRET_VALUE');
    }

    try {
      return JSON.parse(secret.value) as T;
    } catch (error) {
      throw new SecretsManagerError(
        'Failed to parse secret value as JSON',
        'INVALID_JSON',
        400,
        error as Error
      );
    }
  }

  /**
   * Creates a new secret in AWS Secrets Manager
   */
  async createSecret(
    params: CreateSecretCommandInput
  ): Promise<{ arn: string; name: string; versionId: string }> {
    if (!params.Name || typeof params.Name !== 'string') {
      throw new SecretsManagerError('Name is required and must be a string');
    }

    this.logger?.debug('Creating secret', { name: params.Name });

    try {
      const command = new CreateSecretCommand(params);
      const response = await this.awsClient.send(command);

      this.logger?.info('Secret created successfully', {
        name: params.Name,
        arn: response.ARN,
      });

      return {
        arn: response.ARN ?? '',
        name: response.Name ?? '',
        versionId: response.VersionId ?? '',
      };
    } catch (error) {
      this.handleError(error, 'createSecret');
    }
  }

  /**
   * Updates an existing secret in AWS Secrets Manager
   */
  async updateSecret(
    params: UpdateSecretCommandInput
  ): Promise<{ arn: string; name: string; versionId: string }> {
    if (!params.SecretId || typeof params.SecretId !== 'string') {
      throw new SecretsManagerError('SecretId is required and must be a string');
    }

    this.logger?.debug('Updating secret', { secretId: params.SecretId });

    try {
      const command = new UpdateSecretCommand(params);
      const response = await this.awsClient.send(command);

      this.logger?.info('Secret updated successfully', {
        secretId: params.SecretId,
        arn: response.ARN,
      });

      return {
        arn: response.ARN ?? '',
        name: response.Name ?? '',
        versionId: response.VersionId ?? '',
      };
    } catch (error) {
      this.handleError(error, 'updateSecret');
    }
  }

  /**
   * Deletes a secret from AWS Secrets Manager
   */
  async deleteSecret(
    secretId: string,
    forceDeleteWithoutRecovery = false,
    recoveryWindowInDays?: number
  ): Promise<{ arn: string; name: string; deletionDate: Date }> {
    this.validateSecretId(secretId);

    const params: DeleteSecretCommandInput = {
      SecretId: secretId,
      ForceDeleteWithoutRecovery: forceDeleteWithoutRecovery,
      ...(recoveryWindowInDays && { RecoveryWindowInDays: recoveryWindowInDays }),
    };

    this.logger?.debug('Deleting secret', { secretId, forceDeleteWithoutRecovery });

    try {
      const command = new DeleteSecretCommand(params);
      const response = await this.awsClient.send(command);

      this.logger?.info('Secret deleted successfully', { secretId });

      return {
        arn: response.ARN ?? '',
        name: response.Name ?? '',
        deletionDate: response.DeletionDate
          ? typeof response.DeletionDate === 'string'
            ? new Date(response.DeletionDate)
            : response.DeletionDate
          : new Date(0),
      };
    } catch (error) {
      this.handleError(error, 'deleteSecret');
    }
  }

  /**
   * Rotates a secret in AWS Secrets Manager
   */
  async rotateSecret(
    params: RotateSecretCommandInput
  ): Promise<{ arn: string; name: string; versionId: string }> {
    if (!params.SecretId || typeof params.SecretId !== 'string') {
      throw new SecretsManagerError('SecretId is required and must be a string');
    }

    this.logger?.debug('Rotating secret', { secretId: params.SecretId });

    try {
      const command = new RotateSecretCommand(params);
      const response = await this.awsClient.send(command);

      this.logger?.info('Secret rotation initiated', { secretId: params.SecretId });

      return {
        arn: response.ARN ?? '',
        name: response.Name ?? '',
        versionId: response.VersionId ?? '',
      };
    } catch (error) {
      this.handleError(error, 'rotateSecret');
    }
  }

  /**
   * Cancels secret rotation in AWS Secrets Manager
   */
  async cancelRotateSecret(
    secretId: string
  ): Promise<{ arn: string; name: string; versionId: string }> {
    this.validateSecretId(secretId);

    const params: CancelRotateSecretCommandInput = {
      SecretId: secretId,
    };

    this.logger?.debug('Canceling secret rotation', { secretId });

    try {
      const command = new CancelRotateSecretCommand(params);
      const response = await this.awsClient.send(command);

      this.logger?.info('Secret rotation canceled', { secretId });

      return {
        arn: response.ARN ?? '',
        name: response.Name ?? '',
        versionId: response.VersionId ?? '',
      };
    } catch (error) {
      this.handleError(error, 'cancelRotateSecret');
    }
  }

  /**
   * Health check method to verify the client can connect to AWS
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    try {
      // Try to list secrets (this requires minimal permissions)
      const command = new GetSecretValueCommand({ SecretId: 'health-check-non-existent-secret' });
      await this.awsClient.send(command);

      return { status: 'healthy', message: 'Client is healthy' };
    } catch (error) {
      // If we get a ResourceNotFoundException, that's actually good - it means we can connect
      if ((error as { name?: string }).name === 'ResourceNotFoundException') {
        return { status: 'healthy', message: 'Client is healthy' };
      }

      // Any other error indicates a problem
      return {
        status: 'unhealthy',
        message: `Health check failed: ${(error as { message?: string }).message}`,
      };
    }
  }

  /**
   * Closes the client connection
   */
  async close(): Promise<void> {
    this.logger?.info('Closing SecretsManager client');
    await this.awsClient.destroy();
  }
}

// Export the class as default
export default SecretsManagerClient;
