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
import { Badge, Button, Card, Col, Container, Row } from 'react-bootstrap';
import { Helmet } from 'react-helmet-async';
import { BsGithub } from 'react-icons/bs';
import { NavLink } from 'react-router-dom';

import api from '../../api';

export const AuthenticatedHome: React.FunctionComponent = (_props) => {
  const { data } = api.useGetSidebarInfoQuery();
  //todo: Change this to only github projects, do an aggregation query in hasura for this
  const hasAnyProjects: boolean = !!data && data.projects.length > 0;

  return (
    <>
      <Helmet title="home" />
      <Container>
        <Row className="text-center mb-4">
          <h1>Welcome to LunaTrace</h1>
        </Row>
        <Row>
          <Card className="">
            <Card.Body className="m-md-4">
              <Card.Title>
                {' '}
                <Badge className="me-1" pill>
                  1
                </Badge>{' '}
                Connect <span className="darker">to Github.</span>
              </Card.Title>
              <Card.Subtitle className="darker homepage-subtitle active">
                Connect LunaTrace to at least one repo you would like to scan. You can always add more later.
              </Card.Subtitle>
              <Card.Title>
                {' '}
                <Badge className="me-1" bg={hasAnyProjects ? 'primary' : 'secondary'} pill>
                  2
                </Badge>{' '}
                Configure <span className="darker">your project.</span>
              </Card.Title>
              <Card.Subtitle className={`darker homepage-subtitle ${hasAnyProjects ? 'active' : ''}`}>
                Click your imported project in the sidebar.
              </Card.Subtitle>
              <Card.Title>
                {' '}
                <Badge className="me-1" bg={hasAnyProjects ? 'primary' : 'secondary'} pill>
                  3
                </Badge>{' '}
                Scanning is Active!
              </Card.Title>

              {/*<Card.Body className="text-center">*/}
              {/*  <Card.Title>*/}
              {/*    <FaGithubSquare size="60px" className="mb-3" />*/}
              <Row className="justify-content-center">
                <Col md="6" className="d-grid gap-2">
                  <Button
                    variant={hasAnyProjects ? 'light' : 'primary'}
                    size="lg"
                    href="https://github.com/apps/dev-lunatrace-by-lunasec/installations/new"
                  >
                    <BsGithub className="mb-1 me-1" /> {hasAnyProjects ? 'Add more projects' : 'Connect to GitHub'}
                  </Button>
                  <Card.Subtitle className="darker">
                    Prefer not to? You can still do manual scans in <NavLink to="/">your personal project</NavLink>.
                  </Card.Subtitle>
                </Col>
              </Row>
            </Card.Body>
            {/*<NavLink href="https://github.com/apps/dev-lunatrace-by-lunasec/installations/new">*/}
            {/*  <h3 className=" text-reset">Connect to Github</h3>*/}
            {/*</NavLink>*/}
            {/*  </Card.Title>*/}

            {/*  <Card.Text className="fs-4">*/}
            {/*    Install LunaTrace into at least one repository you would like to scan.*/}
            {/*  </Card.Text>*/}
            {/*</Card.Body>*/}
          </Card>
        </Row>
        {/*<p className="text-center fs-3">*/}
        {/*  - <span className="fw-bolder">or</span> -*/}
        {/*</p>*/}
        {/*<Row>*/}
        {/*  <Card className="">*/}
        {/*    <Card.Body className="text-center">*/}
        {/*      <Card.Title>*/}
        {/*        <AiFillFileAdd size="60px" className="mb-3" />*/}
        {/*        <h3>Drag-and-Drop</h3>*/}
        {/*      </Card.Title>*/}
        {/*      <ManifestDrop forHomepage={true} project_id={'1234'} />*/}
        {/*    </Card.Body>*/}
        {/*  </Card>*/}
        {/*</Row>*/}
      </Container>
    </>
  );
};
