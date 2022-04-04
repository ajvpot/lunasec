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
import { S3ObjectMetadata } from './s3';

export interface S3SqsEvent {
  Records?: Record[];
}

export interface Record {
  eventVersion: string;
  eventSource: string;
  awsRegion: string;
  eventTime: Date;
  eventName: string;
  userIdentity: ErIdentity;
  requestParameters: RequestParameters;
  responseElements: ResponseElements;
  s3: S3;
}

export interface RequestParameters {
  sourceIPAddress: string;
}

export interface ResponseElements {
  'x-amz-request-id': string;
  'x-amz-id-2': string;
}

export interface S3 {
  s3SchemaVersion: string;
  configurationId: string;
  bucket: Bucket;
  object: S3Object;
}

export interface Bucket {
  name: string;
  ownerIdentity: ErIdentity;
  arn: string;
}

export interface ErIdentity {
  principalId: string;
}

export interface S3Object {
  key: string;
  size: number;
  eTag: string;
  sequencer: string;
}

export interface QueueSuccessResult {
  success: true;
}

export interface QueueErrorResult {
  success: false;
  error: Error;
}

export type HandlerCallback = (object: S3ObjectMetadata) => Promise<QueueSuccessResult | QueueErrorResult>;
