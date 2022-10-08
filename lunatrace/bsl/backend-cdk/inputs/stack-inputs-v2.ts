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
import { StackInputs } from './types';

export const stackInputsV2: StackInputs = {
  cdkDefaultRegion: 'us-west-2',
  cdkDefaultAccount: '916430638549',
  appName: 'lunatrace',
  domainName: 'lunatrace-staging.lunasec.io',
  domainZoneId: 'Z0076877241E0LP40ANR7',
  certificateArn: 'arn:aws:acm:us-west-2:916430638549:certificate/28ff36db-3801-43b3-a253-3bdcf0861496',
  vpcId: 'vpc-0279279af1866b6fb',
  oathkeeperConfigBucketArn: 'arn:aws:s3:::lunatrace-backendstack-oryconfig',
  backendStaticSecretArn: 'arn:aws:secretsmanager:us-west-2:916430638549:secret:lunatrace-BackendStaticSecret-niiXGq',
  databaseSecretArn: 'arn:aws:secretsmanager:us-west-2:916430638549:secret:lunatrace-HasuraDatabaseUrlSecret-zOcgEE',
  gitHubAppId: '245134',
  gitHubAppPrivateKey: 'arn:aws:secretsmanager:us-west-2:916430638549:secret:lunatrace-GitHubAppPrivateKey-fyW3ZR',
  gitHubAppLink: 'https://github.com/apps/staging-lunatrace-by-lunasec/installations/new',
  gitHubAppWebHookSecret:
    'arn:aws:secretsmanager:us-west-2:916430638549:secret:lunatrace-GitHubAppWebHookSecret-DHxcI3',
  kratosCookieSecretArn: 'arn:aws:secretsmanager:us-west-2:916430638549:secret:lunatrace-KratosCookieSecret-0ElF6d',
  kratosCipherSecretArn: 'arn:aws:secretsmanager:us-west-2:916430638549:secret:lunatrace-KratosCipherSecret-zG99xR',
  hasuraAdminSecretArn: 'arn:aws:secretsmanager:us-west-2:916430638549:secret:lunatrace-HasuraAdminSecret-l1hzOI',
  datadogApiKeyArn: 'arn:aws:secretsmanager:us-west-2:916430638549:secret:lunatrace-DatadogAPIKey-YC4IwB',
  githubOauthAppLoginClientIdArn:
    'arn:aws:secretsmanager:us-west-2:916430638549:secret:lunatrace-KratosGitHubOAuthAppLoginClientId-kd5ODD',
  githubOauthAppLoginSecretArn:
    'arn:aws:secretsmanager:us-west-2:916430638549:secret:lunatrace-KratosGitHubOAuthAppLoginSecret-u68tIZ',
  kratosSlackSecretArn: 'arn:aws:secretsmanager:us-west-2:916430638549:secret:lunatrace-KratosSlackSecret-59l0Fh',
  dbSecurityGroup: 'sg-05388fbc5f53890fd',
};
