const AWS = require('aws-sdk');
const deasync = require('deasync-promise');

class SecretsManager {
	constructor(options) {
		this.secretManagerClient = new AWS.SecretsManager(options);
	}

	async getSecret(SecretId) {
		const response = await new Promise((resolve, reject) => {
			this.secretManagerClient.getSecretValue({ SecretId }, (err, result) => {
				if (err) reject(err);
				if (result) {
					resolve(result);
				}
			});
		});
		return response;
	}

	async createSecret(params) {
		const response = await new Promise((resolve, reject) => {
			this.secretManagerClient.createSecret(params, (err, result) => {
				if (err) reject(err);
				if (result) {
					resolve(result);
				}
			});
		});
		return response;
	}

	async updateSecret(params) {
		const response = await new Promise((resolve, reject) => {
			this.secretManagerClient.updateSecret(params, (err, result) => {
				if (err) reject(err);
				if (result) {
					resolve(result);
				}
			});
		});
		return response;
	}

	async deleteSecret(params) {
		const response = await new Promise((resolve, reject) => {
			this.secretManagerClient.deleteSecret(params, (err, result) => {
				if (err) reject(err);
				if (result) {
					resolve(result);
				}
			});
		});
		return response;
	}

	async rotateSecret(params) {
		const response = await new Promise((resolve, reject) => {
			this.secretManagerClient.cancelRotateSecret(params, (err, result) => {
				if (err) reject(err);
				if (result) {
					resolve(result);
				}
			});
		});
		return response;
	}

	async cancelRotateSecret(params) {
		const response = await new Promise((resolve, reject) => {
			this.secretManagerClient.cancelRotateSecret(params, (err, result) => {
				if (err) reject(err);
				if (result) {
					resolve(result);
				}
			});
		});
		return response;
	}

	getSecretSync(secretId) {
		return deasync(this.getSecret(secretId));
	}

	createSecretSync(params) {
		return deasync(this.createSecret(params));
	}

	updateSecretSync(params) {
		return deasync(this.updateSecret(params));
	}

	deleteSecretSync(params) {
		return deasync(this.deleteSecret(params));
	}

	rotateSecretSync(params) {
		return deasync(this.rotateSecret(params));
	}

	cancelRotateSecretSync(params) {
		return deasync(this.cancelRotateSecret(params));
	}
}

module.exports = SecretsManager;
