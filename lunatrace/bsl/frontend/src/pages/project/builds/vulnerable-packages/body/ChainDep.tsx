import classNames from 'classnames';
import React from 'react';
import { Badge, NavLink, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { ChevronRight, ChevronsRight, X } from 'react-feather';

import { ChainDepType } from '../types';

interface DepProps {
  index: number;
  dep: ChainDepType;
  isExpanded: boolean;
  chainLength: number;
  visibleChainLength: number;
  setIsExpanded: (expanded: boolean) => void;
  depIsReachable: boolean;
}

// Determines if the package is the start, the middle, or the target package and then colors them appropriately
const getBadgeColor = (depIndex: number, chainLength: number) => {
  if (depIndex === chainLength - 1) {
    return 'success';
  }
  if (depIndex === 0) {
    return 'primary';
  }
  return 'light';
};

export const ChainDep: React.FunctionComponent<DepProps> = ({
  index,
  dep,
  isExpanded,
  chainLength,
  visibleChainLength,
  setIsExpanded,
  depIsReachable,
}) => {
  const dependencyEdgeClassNames = ['mb-n1', !depIsReachable && 'text-warning'];

  const dependencyEdgeIcon = dep.reachable ? (
    <ChevronRight
      size="1em"
      className={classNames(dependencyEdgeClassNames)}
      style={{ marginLeft: 'auto', marginRight: 'auto', display: 'block' }}
    />
  ) : (
    <OverlayTrigger
      placement={'top'}
      overlay={<Tooltip>No instances found of {dep.release.package.name} being imported and called.</Tooltip>}
    >
      <X
        size="1em"
        className="mb-n1 text-warning"
        style={{ marginLeft: 'auto', marginRight: 'auto', display: 'block' }}
      />
    </OverlayTrigger>
  );
  return (
    <React.Fragment key={dep.id}>
      <div className="me-1 ms-1 d-inline-flex justify-content-center" style={{ flexDirection: 'column' }}>
        {index !== 0 &&
          (chainLength > visibleChainLength ? (
            <NavLink className="p-0" onClick={() => setIsExpanded(true)} style={{ display: 'inline' }}>
              <ChevronsRight size="1em" className="" />
            </NavLink>
          ) : (
            dependencyEdgeIcon
          ))}
        {isExpanded && <div style={{ fontSize: '.7rem' }}>{dep.range}</div>}
      </div>
      <Badge text="dark" bg={getBadgeColor(index, visibleChainLength)}>
        <div>{dep.release.package.name}</div>
        {isExpanded && (
          <div className="mt-1" style={{ fontSize: '.7rem' }}>
            {dep.release.version}
          </div>
        )}
      </Badge>
    </React.Fragment>
  );
};
