// Re-export everything from the main client
export { SecretsManagerClient, SecretsManagerError } from './SecretsManagerClient';
export type { SecretsManagerOptions, SecretValue } from './SecretsManagerClient';

// Re-export AWS SDK types for convenience
export type {
  CreateSecretCommandInput,
  UpdateSecretCommandInput,
  DeleteSecretCommandInput,
  RotateSecretCommandInput,
  CancelRotateSecretCommandInput,
  GetSecretValueCommandInput,
} from '@aws-sdk/client-secrets-manager';

// Set as default export
export { SecretsManagerClient as default } from './SecretsManagerClient';
