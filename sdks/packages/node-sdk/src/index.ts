import fs from 'fs';
import { URL as URI } from 'url';

import { makeRequest } from '@lunasec/common';

import { GenericApiClient, makeGenericApiClient } from './api-client';
import { BuildActionFunctionConfig } from './types';
import {__CONTAINER_SECRET__, __DEPLOYMENT_SECRET__} from "./constants";
import * as http from "http";


const refinerySecretHeader: string = 'REFINERY_DEPLOYMENT_SECRET';
const deploymentIDEnvVar: string = 'REFINERY_DEPLOYMENT_ID';
const containerSecretHeader: string = 'X-Container-Secret';
const deploymentEndpoint: string = '/api/v1/deployments/secure_resolver';

class SecureResolverCallError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
        this.name = SecureResolverCallError.name; // stack traces display correctly now
    }
}

export enum DeploymentStage {
  DEV = 'DEV',
  PROD = 'PROD'
}


interface SecureResolverSdkConfig {
  stage: DeploymentStage;
  appDir?: string;
  language?: string;
  configPath?: string;
}

const defaultConfig: SecureResolverSdkConfig = {
  stage: DeploymentStage.DEV,
  appDir: '/app',
  language: 'Node.js 10 Temporal',
  configPath: 'lunasec.json',
};

export interface FunctionInvocationResult {
  success: boolean;
  error?: string;
  completeError?: unknown;
  result?: unknown;
}

async function fetch(requestOptions: http.RequestOptions, body?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = http.request({...requestOptions, timeout: 2000}, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode > 299)) {
        return reject(new Error(`HTTP status code ${res.statusCode}`))
      }

      const body: Array<Uint8Array> = [];
      res.on('data', (chunk) => body.push(chunk));
      res.on('end', () => {
        const resString = Buffer.concat(body).toString()
        resolve(resString)
      });
    })

    request.on('error', (err) => {
      reject(err)
    })
    request.on('timeout', () => {
      request.destroy()
      reject(new Error('timed out'))
    })
    if (body !== undefined) {
      request.write(body);
      request.end();
    }
  })
}

export class SecureResolver {
  readonly config!: SecureResolverSdkConfig;

  readonly functionConfig!: {
    projectID: string;
    functions: BuildActionFunctionConfig[];
  };

  readonly refineryHeaders!: Record<string, string>;
  readonly containerHeaders!: Record<string, string>;

  readonly apiClient!: GenericApiClient;

  readonly deploy: (containerUri: string) => void;
  readonly call: (functionName: string, args: any) => Promise<FunctionInvocationResult>;

  constructor(config: SecureResolverSdkConfig) {
    // Deep clone the config to prevent nested mutation.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.config = JSON.parse(JSON.stringify(Object.assign({}, defaultConfig, config)));

    if (!this.config.configPath) {
      throw new Error("Unable to load Secure Resolver SDK: no configuration path specified")
    }

    // TODO (cthompson) cleanly handle potential errors thrown here
    this.functionConfig = JSON.parse(fs.readFileSync(this.config.configPath, 'utf8'));

    this.refineryHeaders = {
      [refinerySecretHeader]: __DEPLOYMENT_SECRET__,
    };

    this.containerHeaders = {
      [containerSecretHeader]: __CONTAINER_SECRET__,
    };

    this.apiClient = makeGenericApiClient(deploymentEndpoint, {
      method: 'POST',
      headers: this.refineryHeaders,
    });

    if (this.config.stage === DeploymentStage.DEV) {
      this.deploy = this.deployDev
      this.call = this.callDev
    } else {
      this.deploy = this.deployProd
      this.call = this.callProd
    }
  }

  secureImport(moduleName: string): any {
    const importedModule = require(moduleName);
    const exports = Object.keys(importedModule);
    return exports.reduce((wrappedExports, _export) => {
      const newExport = (typeof _export === 'function') ? this.wrap(_export) : _export;
      return {
        ...wrappedExports,
        newExport,
      }
    }, {});
  }

  wrap <T extends Array<any>, U>(fn: (...args: T) => U) {
    return async (...args: T): Promise<U | undefined> => {
      // TODO (cthompson) we catch all errors here as a convenience to the caller so they don't have to change their code that much
      // is this a good idea?
      try {
        const res = await this.call(fn.name, args);
        console.debug(res);
        if (!res.success) {
          const e = new SecureResolverCallError(res.error);
          console.error(e);
          return undefined;
        }
        return <U> res.result;
      } catch(e) {
        console.error(e);
        return undefined;
      }
    }
  }

  async deployDev(containerUri: string) {
    console.log(containerUri);
  }

  async deployProd(containerUri: string) {
    const functions = this.functionConfig['functions'];

    if (!this.config.language) {
      throw new Error("Unable to deploy Secure Resolver: no language provided")
    }

    if (!this.config.appDir) {
      throw new Error("Unable to deploy Secure Resolver: no container application directory specified")
    }

    const response = await this.apiClient<'build'>({
      action: 'build',
      payload: {
        stage: 'prod',
        container_uri: containerUri,
        language: this.config.language,
        app_dir: this.config.appDir,
        functions: functions,
      },
    });

    if (!response) {
      return {
        error: true,
        message: response,
      };
    }

    return response;
  }

  async callDev(functionName: string, args: any): Promise<FunctionInvocationResult> {
    const data = JSON.stringify({
      function_name: functionName,
      block_input: args,
    });
    try {
      const res = await fetch({
        host: "localhost",
        port: 9001,
        path: "/2015-03-31/functions/function/invocations",
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        },
      }, data);
      return {
        success: true,
        result: res
      }
    } catch(e) {
      console.error(e);
      return {
        success: false,
        error: e
      }
    }
  }

  async callProd(functionName: string, args: any): Promise<FunctionInvocationResult> {
    const deploymentId = process.env[deploymentIDEnvVar];
    if (deploymentId === undefined) {
      throw new SecureResolverCallError(`the environment variable ${deploymentIDEnvVar} is not set`);
    }

    const urlResponse = await this.getFunctionUrl(deploymentId);

    if (!urlResponse.success) {
      return {
        success: false,
        error: urlResponse.error.message,
        completeError: urlResponse,
      };
    }

    const body = JSON.stringify({
      function_name: functionName,
      block_input: args,
    });

    const resolverUrl = new URI(urlResponse.data.url);

    const response = await makeRequest<{ error?: string; result?: unknown }>(
      resolverUrl.host,
      resolverUrl.pathname,
      {
        ...resolverUrl,
        method: 'POST',
        headers: this.containerHeaders,
      },
      body
    );

    if (!response || response.error) {
      return {
        success: false,
        ...response,
      };
    }

    return {
      success: true,
      ...response,
    };
  }

  async getFunctionUrl(deploymentId: string) {
    return await this.apiClient<'url'>({
      action: 'url',
      payload: {
        deployment_id: deploymentId,
      },
    });
  }

  async removeDeployment() {
    return await this.apiClient<'remove'>({
      action: 'remove',
      payload: {
        stage: 'prod',
      },
    });
  }

  async listFunctions(deploymentId: string) {
    return await this.apiClient<'listFunctions'>({
      action: 'listFunctions',
      payload: {
        stage: 'prod',
        deployment_id: deploymentId,
      },
    });
  }

  async listDeployments() {
    return await this.apiClient<'listDeployments'>({
      action: 'listDeployments',
      payload: {
        stage: 'prod',
      },
    });
  }
}
