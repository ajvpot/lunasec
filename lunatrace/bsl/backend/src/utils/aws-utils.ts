/*
 * Copyright by LunaSec (owned by Refinery Labs, Inc)
 *
 * Licensed under the Business Source License v1.1
 * (the "License"); you may not use this file except in compliance with the
 * License. You may obtain a copy of the License at
 *
 * https://github.com/lunasec-io/lunasec/blob/master/licenses/BSL-LunaTrace.txt
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import { Readable } from 'stream';

import { GetObjectCommand, GetObjectCommandOutput, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Hash } from '@aws-sdk/hash-node';
import { Upload } from '@aws-sdk/lib-storage';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { S3RequestPresigner, S3RequestPresignerOptions } from '@aws-sdk/s3-request-presigner';
import { HeaderBag } from '@aws-sdk/types';
import { parseUrl } from '@aws-sdk/url-parser';
import { formatUrl } from '@aws-sdk/util-format-url';
import { v4 as uuid } from 'uuid';
export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}

export interface PreSignedUrlGeneratorConfig {
  /** The bucket name where ciphertext(encrypted secure data) will be store.  We recommend encrypting this bucket in your s3 settings */
  /** The region of the above bucket */
  awsRegion: string;
  /** Provide Aws credentials. Expects an AWS Credentials object */
  awsCredentials: S3RequestPresignerOptions['credentials'];
  /** Override the production AWS URL with a localstack url on port 4566, useful for development */
  useLocalStack?: boolean;
  redirectToLocalhost?: boolean;
}

if (process.env.NODE_ENV === 'production' && !process.env.AWS_DEFAULT_REGION) {
  throw new Error('Must set AWS_DEFAULT_REGION in production');
}

const awsRegion = process.env.AWS_DEFAULT_REGION || 'us-west-2';

export class AwsUtils {
  constructor(readonly config: PreSignedUrlGeneratorConfig) {}

  public generateAWSBaseUrl(bucket: string) {
    if (this.config.useLocalStack) {
      if (this.config.redirectToLocalhost) {
        return `http://localhost:4566/${bucket}`;
      }
      return `http://localstack:4566/${bucket}`;
    }

    return `https://${bucket}.s3.${this.config.awsRegion}.amazonaws.com`;
  }

  // deprecated
  public async bundleStreamChunks(stream: GetObjectCommandOutput['Body']): Promise<Buffer> {
    if (!(stream instanceof Readable)) {
      throw new Error('S3 load stream is of wrong type');
    }
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  public async getFileFromS3(key: string, bucket: string, region?: string): Promise<[Readable, number]> {
    const s3Client = new S3Client({ region: region || this.config.awsRegion, credentials: this.config.awsCredentials });
    const { Body, ContentLength, $metadata } = await s3Client.send(new GetObjectCommand({ Key: key, Bucket: bucket })); // gosh what a bad API
    const code = $metadata.httpStatusCode;
    if (!code || code > 299) {
      throw new Error(`got non-200 code when fetching file from s3: ${code}`);
    }
    // const fileString = await this.streamToString(Body);
    if (!(Body instanceof Readable)) {
      throw new Error('S3 load stream is of wrong type');
    }
    if (!ContentLength) {
      throw new Error('Missing content length for downloaded s3 sbom');
    }
    return [Body, ContentLength];
  }

  public async uploadGzipFileToS3(key: string, bucket: string, body: ReadableStream | Readable, region?: string) {
    const bundledUploadData = await this.bundleStreamChunks(body); // streaming uploads appear to be straight up broken, in all their forms.  tire fire

    const s3Client = new S3Client({ region: region || this.config.awsRegion, credentials: this.config.awsCredentials });
    const command = new PutObjectCommand({
      Key: key,
      Bucket: bucket,
      Body: bundledUploadData,
      ContentEncoding: 'gzip',
    });
    const response = await s3Client.send(command);
    const code = response.$metadata.httpStatusCode;
    if (!code || code > 299) {
      throw new Error(`got non-200 code when uploading file to s3: ${code}`);
    }
    // const parallelUpload = new Upload({
    //   client: s3Client,
    //   queueSize: 4, // optional concurrency configuration
    //   leavePartsOnError: false, // optional manually handle dropped parts
    //   params: { Key: key, Bucket: bucket, Body: body, ContentEncoding: 'gzip' },
    // });
    // parallelUpload.on('httpUploadProgress', (progress) => {
    //   console.log('FILE UPLOAD PROGRESS IS,', progress);
    // });
    // await parallelUpload.done();
    return `${this.generateAWSBaseUrl(bucket)}/${key}`;
  }

  async generatePresignedS3Url(
    bucket: string,
    id: string,
    method: 'PUT' | 'GET'
  ): Promise<{ url: string; headers: HeaderBag }> {
    const credentials = this.config.awsCredentials;

    const signer = new S3RequestPresigner({
      region: this.config.awsRegion,
      credentials: credentials,
      sha256: Hash.bind(null, 'sha256'), // In Node.js
    });
    const baseUrl = this.generateAWSBaseUrl(bucket);

    const url = parseUrl(`${baseUrl}/${id}`);

    const signedUrl = await signer.presign(
      new HttpRequest({
        ...url,
        method: method,
      })
    );

    return {
      url: formatUrl(signedUrl),
      headers: { ...signedUrl.headers, 'Content-Encoding': 'gzip' },
    };
  }

  public generateSbomS3Key(orgId: string, buildId: string): string {
    const today = new Date();

    return `${encodeURIComponent(
      orgId
    )}/${today.getFullYear()}/${today.getMonth()}/${today.getDay()}/${today.getHours()}/${encodeURIComponent(buildId)}`;
  }
}

// Just preconfigure things so we dont have to do this everywhere
export const aws = new AwsUtils({
  awsCredentials: defaultProvider(),
  awsRegion,
});
