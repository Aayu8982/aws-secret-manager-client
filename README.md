
# AWS Secret Manager client for Node.js

A package contains Asynchronous and Synchronous functions to perform oprations on AWS Secret Manager. 


[![NPM](https://nodei.co/npm/aws-secret-manager-client.png?downloads=true)](https://www.npmjs.com/package/aws-secret-manager-client/)
## Features

- Fetch Secret (Async/Sync)
- Create Secret (Async/Sync)
- Update Secret (Async/Sync)
- Delete Secret (Async/Sync)
- Rotate Secret (Async/Sync)
- Cancel Rotate Secret (Async/Sync)


## Installation

```bash
  npm install aws-secret-manager-client --save
```
    
## Usage/Examples

``aws-secret-manager-client`` is wrapper function for perform aws secret manager operations asynchronously/synchronously, secret manager api basically return promises, for behave like a synchronous function/api we have used [deasync-promise](https://www.npmjs.com/package/deasync-promise) which internally transform async function to sync.

```javascript
const app = require("express")();
const SecretsManager = require("aws-secret-manager-client");

const client = new SecretsManager({ region: "us-east-1" });

// asynchronous
app.get("/getsecret", async (req, res) => {
  const response = await client.getSecret("client1/dev/secrets");
  res.send({
    status: 200,
    data: response,
  });
});

// synchronous
app.get("/getsecretsync", (req, res) => {
  const response = client.getSecretSync("client1/dev/secrets");
  res.send({
    status: 200,
    data: response,
  });
});

// synchronous function calling
function getSecretsviafunction(clientId) {
  const data = client.getSecretSync(clientId);
  return JSON.parse(data.SecretString);
}
console.log(getSecretsviafunction("client1/dev/secrets"));

// asyncronous
app.post("/createsecret", async (req, res) => {
  let params = {
    Description: "My test database secret created with the CLI",
    Name: "MyTestDatabaseSecret",
    SecretString: '{"username":"dextor","password":"EXAMPLE-PASSWORD"}',
  };

  const response = await client.createSecret(params);
  res.send({
    status: 200,
    data: response,
  });
});

// synchronous
app.get("/createsecretsync", (req, res) => {
  let params = {
    Description: "My test database secret created with the CLI",
    Name: "MyTestDatabaseSecret 1",
    SecretString: '{"username":"dextor","password":"EXAMPLE-PASSWORD"}',
  };

  const response = client.createSecretSync(params);
  res.send({
    status: 200,
    data: response,
  });
});

// synchronous function calling
function createSecretsviafunction(params) {
  const data = client.createSecretSync(params);
  return data;
}

let params = {
  Description: "My test database secret created with the CLI",
  Name: "MyTestDatabaseSecret 2",
  SecretString: '{"username":"dextor","password":"EXAMPLE-PASSWORD"}',
};

console.log(createSecretsviafunction(params));



// Server
const port = 5001;

app.listen(port,()=>{
  console.log(`🚀 Something is cooking on port ${port} 🚀`)
});

```


## API Reference

#### Retrieve Secret

```http
  client.getSecret(SecretId) || client.getSecretSync(SecretId)
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `SecretId` | `string` | **Required**. Your Secret Name |

More Details :- https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SecretsManager.html#getSecretValue-property

#### Create Secret

```http
  client.createSecret(params) || client.createSecretSync(params)
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `Name`      | `string` | **Required**. The name of the new secret. |
| `ClientRequestToken`      | `string` | **Optional**. [ SecretString or SecretBinary](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SecretsManager.html#createSecret-property). |
| `Description`      | `string` | **Required**. The description of the secret. |
| `KmsKeyId` | `string` |**Optional** The ARN, key ID, or alias of the KMS key to encrypt the secret. If you don't include this field, Secrets Manager uses aws/secretsmanager. |

More Details :- https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SecretsManager.html#createSecret-property
#### Delete Secret

```http
  client.deleteSecret(SecretId) || client.deleteSecretSync(SecretId)
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `SecretId` | `string` | **Required**. Your Secret Name |

More Details :- https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SecretsManager.html#deleteSecret-property

#### Update Secret

```http
  client.updateSecret(SecretId) || client.updateSecretSync(SecretId)
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `SecretId` | `string` | **Required**. Your Secret Name |
| `SecretString` | `string` | **Required**. "{JSON STRING WITH CREDENTIALS}" |

More Details :- https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SecretsManager.html#updateSecret-property

## Author

- [Aayush Sharma](https://www.github.com/Aayu8982)


## Support

For support and queries, email aayu8982@gmail.com

