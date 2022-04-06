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
import { spawn } from 'child_process';
import { Readable } from 'stream';
import zlib from 'zlib';

import { LunaTraceAssetType } from '../types/cli';

function importAssetArgs(assetType: LunaTraceAssetType, assetName: string, gitBranch: string) {
  const baseCmdArgs = [
    '--debug',
    '--log-to-stderr',
    'snapshot',
    '--skip-upload',
    '--stdout',
    '--git-branch',
    gitBranch,
    assetType,
  ];

  if (assetType === 'file') {
    return [...baseCmdArgs, '--stdin', assetName];
  }
  if (assetType === 'repository') {
    return [...baseCmdArgs, assetName];
  }
  throw new Error(`unknown asset type: ${assetType}`);
}

export function generateSbomFromAsset(
  assetType: LunaTraceAssetType,
  assetName: string,
  gitBranch: string,
  options?: { inputStream?: Readable }
) {
  const cmdArgs = importAssetArgs(assetType, assetName, gitBranch);

  const lunatraceCli = spawn('lunatrace', cmdArgs);
  console.log('lunatrace spawned at pid', lunatraceCli.pid);

  lunatraceCli.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });

  lunatraceCli.on('error', (error) => {
    console.error(`error: ${error.message}`);
    // todo: might get gobbled?
    // throw error;
  });

  // if an input stream was provided, asset will be passed to the CLI via stdin
  if (options && options.inputStream) {
    const inputStream = options.inputStream;
    inputStream.on('data', (chunk) => lunatraceCli.stdin.write(chunk));
    inputStream.on('end', () => {
      lunatraceCli.stdin.end(() => {
        console.log('closing stdin');
      });
      inputStream.destroy();
    });
    inputStream.on('error', (e) => {
      // throw e;
      console.error(e);
    });
  }

  lunatraceCli.stdout.on('data', (chunk) => {
    console.log('lunatrace cli emitted stdout: ', chunk.toString().length);
  });

  lunatraceCli.stdout.on('close', () => {
    console.log('lunatrace outstream ended');
  });
  lunatraceCli.on('close', () => console.log('LunaTrace process closed'));
  // gzip the sbom stream
  return lunatraceCli.stdout.pipe(zlib.createGzip());
}
