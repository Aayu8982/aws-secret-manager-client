# AWS Secrets Manager Client

[![npm version](https://badge.fury.io/js/aws-secret-manager-client.svg)](https://badge.fury.io/js/aws-secret-manager-client)
[![Build Status](https://github.com/yourusername/aws-secret-manager-client/workflows/CI/badge.svg)](https://github.com/yourusername/aws-secret-manager-client/actions)
[![Coverage Status](https://coveralls.io/repos/github/yourusername/aws-secret-manager-client/badge.svg?branch=main)](https://coveralls.io/github/yourusername/aws-secret-manager-client?branch=main)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, TypeScript-first AWS Secrets Manager client built on AWS SDK v3. This package provides a simplified, promise-based interface for managing secrets with comprehensive error handling, logging, and type safety.

## ✨ Features

- **Modern AWS SDK v3**: Built on the latest AWS SDK with improved performance and modularity
- **TypeScript First**: Full TypeScript support with comprehensive type definitions
- **Async/Await**: Promise-based API with async/await support (no more callback hell!)
- **Comprehensive Error Handling**: Detailed error handling with custom error types
- **Logging Support**: Built-in logging with configurable log levels
- **Health Checks**: Built-in health check functionality
- **Type-Safe JSON Parsing**: Automatically parse JSON secrets with type safety
- **Retry Logic**: Configurable retry policies with exponential backoff
- **Zero Dependencies**: Only peer dependency on AWS SDK v3

## 📦 Installation

```bash
npm install aws-secret-manager-client @aws-sdk/client-secrets-manager
```

## 🚀 Quick Start

```typescript
import { SecretsManagerClient } from 'aws-secret-manager-client';

// Initialize the client
const client = new SecretsManagerClient({
  region: 'us-east-1',
  retryPolicy: {
    maxRetries: 3,
  },
});

// Get a secret
const secret = await client.getSecret('my-app/database/credentials');
console.log(secret.value);

// Get and parse JSON secret with type safety
interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

const dbConfig = await client.getSecretJson<DatabaseConfig>('my-app/database/config');
console.log(`Connecting to ${dbConfig.host}:${dbConfig.port}`);
```

## 📚 API Reference

### Constructor Options

```typescript
interface SecretsManagerOptions {
  region?: string;
  retryPolicy?: {
    maxRetries?: number;
    retryDelayOptions?: {
      base?: number;
      customBackoff?: (retryCount: number) => number;
    };
  };
  timeout?: number;
  logger?: {
    debug?: (message: string, ...args: any[]) => void;
    info?: (message: string, ...args: any[]) => void;
    warn?: (message: string, ...args: any[]) => void;
    error?: (message: string, ...args: any[]) => void;
  };
}
```

### Methods

#### `getSecret(secretId: string, versionId?: string, versionStage?: string): Promise<SecretValue>`

Retrieves a secret from AWS Secrets Manager.

```typescript
const secret = await client.getSecret('my-secret');
console.log(secret.value);

// Get specific version
const secretVersion = await client.getSecret('my-secret', 'version-id');

// Get specific stage
const secretStage = await client.getSecret('my-secret', undefined, 'AWSPENDING');
```

#### `getSecretJson<T>(secretId: string, versionId?: string, versionStage?: string): Promise<T>`

Retrieves and parses a JSON secret with type safety.

```typescript
interface ApiKeys {
  stripe: string;
  sendgrid: string;
}

const apiKeys = await client.getSecretJson<ApiKeys>('my-app/api-keys');
console.log(apiKeys.stripe);
```

#### `createSecret(params: CreateSecretCommandInput): Promise<{arn: string; name: string; versionId: string}>`

Creates a new secret in AWS Secrets Manager.

```typescript
const result = await client.createSecret({
  Name: 'my-app/new-secret',
  Description: 'My new secret',
  SecretString: JSON.stringify({ key: 'value' }),
});
console.log(`Created secret: ${result.name}`);
```

#### `updateSecret(params: UpdateSecretCommandInput): Promise<{arn: string; name: string; versionId: string}>`

Updates an existing secret.

```typescript
const result = await client.updateSecret({
  SecretId: 'my-app/existing-secret',
  SecretString: JSON.stringify({ key: 'new-value' }),
});
console.log(`Updated secret: ${result.name}`);
```

#### `deleteSecret(secretId: string, forceDeleteWithoutRecovery?: boolean, recoveryWindowInDays?: number): Promise<{arn: string; name: string; deletionDate: Date}>`

Deletes a secret from AWS Secrets Manager.

```typescript
// Delete with 30-day recovery window (default)
const result = await client.deleteSecret('my-app/old-secret');

// Force delete without recovery
const result = await client.deleteSecret('my-app/old-secret', true);

// Delete with custom recovery window
const result = await client.deleteSecret('my-app/old-secret', false, 7);
```

#### `rotateSecret(params: RotateSecretCommandInput): Promise<{arn: string; name: string; versionId: string}>`

Initiates rotation of a secret.

```typescript
const result = await client.rotateSecret({
  SecretId: 'my-app/database-password',
  RotationLambdaARN: 'arn:aws:lambda:us-east-1:123456789012:function:rotate-secret',
});
```

#### `cancelRotateSecret(secretId: string): Promise<{arn: string; name: string; versionId: string}>`

Cancels an in-progress secret rotation.

```typescript
const result = await client.cancelRotateSecret('my-app/database-password');
```

#### `healthCheck(): Promise<{status: 'healthy' | 'unhealthy'; message: string}>`

Performs a health check to verify the client can connect to AWS.

```typescript
const health = await client.healthCheck();
console.log(`Health status: ${health.status}`);
```

#### `close(): Promise<void>`

Closes the client connection.

```typescript
await client.close();
```

## 🔧 Configuration

### Environment Variables

The client supports configuration through environment variables:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_SESSION_TOKEN=your-session-token  # For temporary credentials
```

### IAM Permissions

Your IAM user or role needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:CreateSecret",
        "secretsmanager:UpdateSecret",
        "secretsmanager:DeleteSecret",
        "secretsmanager:RotateSecret",
        "secretsmanager:CancelRotateSecret"
      ],
      "Resource": "*"
    }
  ]
}
```

## 🛠️ Advanced Usage

### Custom Logger

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.Console()
  ]
});

const client = new SecretsManagerClient({
  region: 'us-east-1',
  logger: {
    debug: logger.debug.bind(logger),
    info: logger.info.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger),
  },
});
```

### Error Handling

```typescript
import { SecretsManagerError } from 'aws-secret-manager-client';

try {
  const secret = await client.getSecret('non-existent-secret');
} catch (error) {
  if (error instanceof SecretsManagerError) {
    console.log(`Error code: ${error.code}`);
    console.log(`Status code: ${error.statusCode}`);
    console.log(`Message: ${error.message}`);
    
    switch (error.code) {
      case 'RESOURCE_NOT_FOUND':
        console.log('Secret not found');
        break;
      case 'ACCESS_DENIED':
        console.log('Access denied');
        break;
      default:
        console.log('Unknown error');
    }
  } else {
    console.log('Unexpected error:', error);
  }
}
```

### Express.js Integration

```typescript
import express from 'express';
import { SecretsManagerClient, SecretsManagerError } from 'aws-secret-manager-client';

const app = express();
const client = new SecretsManagerClient({ region: 'us-east-1' });

app.get('/config', async (req, res) => {
  try {
    const config = await client.getSecretJson('my-app/config');
    res.json({ success: true, data: config });
  } catch (error) {
    if (error instanceof SecretsManagerError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await client.close();
  process.exit(0);
});
```

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [npm package](https://www.npmjs.com/package/aws-secret-manager-client)

## 🆕 Changelog

### v2.0.0
- **BREAKING**: Migrated from AWS SDK v2 to v3
- **BREAKING**: Removed synchronous methods (all methods are now async)
- **BREAKING**: Removed `deasync` dependency
- Added TypeScript support
- Added comprehensive error handling
- Added logging support
- Added health check functionality
- Added retry logic configuration
- Improved API design with better naming conventions
- Added comprehensive tests with >80% coverage

### v1.x.x
- Legacy version with AWS SDK v2
- Synchronous and asynchronous methods
- Basic functionality

## 🤝 Support

If you have any questions or need help, please:

1. Check the [documentation](https://github.com/yourusername/aws-secret-manager-client#readme)
2. Search [existing issues](https://github.com/yourusername/aws-secret-manager-client/issues)
3. Create a [new issue](https://github.com/yourusername/aws-secret-manager-client/issues/new)

---

Made with ❤️ by [Your Name](https://github.com/yourusername)