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
import React from 'react';
import { Button } from 'react-bootstrap';
import { Helmet } from 'react-helmet-async';

export const Home: React.FunctionComponent = (_props) => {
  return (
    <>
      <Helmet title="home" />
      <a href="https://github.com/apps/dev-lunatrace-by-lunasec/installations/new">
        <Button>Install Github App</Button>
      </a>
    </>
  );
};
