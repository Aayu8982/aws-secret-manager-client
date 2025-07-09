import * as index from './index';
import { SecretsManagerClient as Client } from './SecretsManagerClient';

describe('index exports', () => {
  it('should export SecretsManagerClient', () => {
    expect(index.SecretsManagerClient).toBe(Client);
  });

  it('should export SecretsManagerError', () => {
    expect(index.SecretsManagerError).toBeDefined();
  });

  it('should export SecretsManagerOptions and SecretValue types', () => {
    void (null as unknown as index.SecretsManagerOptions);
    void (null as unknown as index.SecretValue);
    expect(true).toBe(true); // Types are compile-time only
  });

  it('should export AWS SDK command input types', () => {
    void (null as unknown as index.CreateSecretCommandInput);
    void (null as unknown as index.UpdateSecretCommandInput);
    void (null as unknown as index.DeleteSecretCommandInput);
    void (null as unknown as index.RotateSecretCommandInput);
    void (null as unknown as index.CancelRotateSecretCommandInput);
    void (null as unknown as index.GetSecretValueCommandInput);
    expect(true).toBe(true); // Types are compile-time only
  });

  it('should export SecretsManagerClient as default', () => {
    expect(index.default).toBe(Client);
  });
});
