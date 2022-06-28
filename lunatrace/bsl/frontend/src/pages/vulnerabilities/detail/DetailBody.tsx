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
import { Card, Col, Container, Modal, OverlayTrigger, Row, Spinner, Table, Tooltip } from 'react-bootstrap';
import { ExternalLink } from 'react-feather';
import { NavLink, useNavigate } from 'react-router-dom';

import { ConditionallyRender } from '../../../components/utils/ConditionallyRender';
import { getCvssVectorFromSeverities } from '../../../utils/cvss';
import { prettyDate } from '../../../utils/pretty-date';
import { toTitleCase } from '../../../utils/string-utils';
import { VulnInfoDetails } from '../types';

import { AffectedPackagesList } from './AffectedPackagesList';

interface VulnerabilityDetailBodyProps {
  vuln: VulnInfoDetails;
  isEmbedded?: boolean;
  sideBySideView?: boolean;
}

export const VulnerabilityDetailBody: React.FunctionComponent<VulnerabilityDetailBodyProps> = ({
  isEmbedded = false,
  sideBySideView = false,
  vuln,
}) => {
  const navigate = useNavigate();

  const severity = getCvssVectorFromSeverities(vuln.severities);

  return (
    <>
      <Container className="vulnerability-detail-page">
        <Row>
          <Col xs="12">
            {isEmbedded ? (
              <NavLink to={`/vulnerabilities/${vuln.id}`}>
                <h1 className="link-primary">{vuln.source_id}</h1>
              </NavLink>
            ) : (
              <h1>{vuln.source_id}</h1>
            )}

            <h5>
              <a className="text-lg" href={''}>
                <ExternalLink size="1em" className="mb-1 me-1" />
                {vuln.source}
              </a>
            </h5>
          </Col>
          <hr />
          <Col md={sideBySideView ? '12' : { span: 4, order: 'last' }} xs="12">
            <Card style={{ height: '90%' }}>
              <Modal.Header>
                <Modal.Title>
                  <span className="darker "> Severity: </span>
                  <div style={{ display: 'inline-block' }} className="vulnerability-severity-badge">
                    {severity ? (
                      <h4 className={`${severity.cvss3OverallSeverityText}`} style={{ display: 'inline' }}>
                        {toTitleCase(severity.cvss3OverallSeverityText)}
                      </h4>
                    ) : (
                      <h4 style={{ display: 'inline' }}>unknown</h4>
                    )}
                  </div>
                </Modal.Title>
              </Modal.Header>

              <Modal.Body className="cvss-scores">
                {severity ? (
                  <>
                    <div>
                      <h2 className="d-inline-block"> {severity.overallScore} </h2>{' '}
                      <h6 className="d-inline-block darker">/ 10 overall CVSS</h6>
                    </div>

                    <div>
                      <h5 className="d-inline-block">{severity.impactSubscore.toFixed(1)}</h5>
                      <span className="darker"> impact score</span>
                    </div>
                    <div>
                      <h5 className="d-inline-block">{severity.exploitabilitySubscore.toFixed(1)}</h5>
                      <span className="darker"> exploitability score</span>
                    </div>
                  </>
                ) : (
                  <span>No CVSS score</span>
                )}
                <hr />
                <h4 className="">
                  Your Projects Vulnerable: <span className="lighter">{vuln.findings.length}</span>{' '}
                </h4>

                {vuln.findings.map((f) => {
                  const projectName = f.default_branch_build?.project?.name;
                  const projectId = f.default_branch_build?.project_id;
                  const buildId = f.default_branch_build?.id;
                  const buildDate = f.default_branch_build?.created_at;

                  if (!projectName || !projectId || !buildId || !buildDate) {
                    console.error('missing data to show project vulnerable', projectName, projectId, buildId);
                    return null;
                  }

                  const buildLink = `/project/${projectId}/build/${buildId}`;
                  return (
                    <div key={f.id as string}>
                      <h3>
                        {' '}
                        <NavLink key={f.id as string} to={buildLink}>
                          {projectName}
                        </NavLink>
                        <span className="darker" style={{ fontSize: '.9rem' }}>
                          {' '}
                          - as of: {prettyDate(new Date(buildDate), false)}
                        </span>
                      </h3>
                    </div>
                  );
                })}
              </Modal.Body>
            </Card>
          </Col>
          <Col md={sideBySideView ? '12' : '8'} xs="12">
            <Card>
              <Modal.Header>
                <Modal.Title className="darker">Description</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <p className="lighter">{vuln.summary}</p>
                <hr />
                <p>Relevant links:</p>
                {vuln.references.map((r) => (
                  <p key={r.id}>
                    {r.type}: <a href={r.url}> {r.url}</a>
                  </p>
                ))}
              </Modal.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col xs="12">
            <Card>
              <Card.Body>
                <Card.Title>Affected Packages</Card.Title>{' '}
                <Table>
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>Version</th>
                      <th>Fix State</th>
                      <th>Fix Versions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vuln.affected.map((affected) => {
                      const fixedEvents = affected.affected_range_events.filter((event) => event.type === 'fixed');
                      const fixVersions = fixedEvents.map((event) => event.version);
                      const isFixed = fixedEvents.length > 0;
                      return (
                        <tr key={affected.id}>
                          <td className="lighter">
                            {affected.package?.name?.substring(0, 40)}
                            {affected.package?.name && affected.package.name.length > 41 ? '...' : ''}
                            {/*  TODO: Make these show full name in a tooltip when truncated*/}
                          </td>
                          <td>{affected.version_constraint}</td>
                          <td>{isFixed ? 'fixed' : 'not fixed'}</td>
                          <td>{fixVersions.join(', ')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        {vuln.equivalents.length < 1 ? null : <AffectedPackagesList relatedVulns={vuln.equivalents} />}
      </Container>
    </>
  );
};
