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
import { SeverityNamesOsv, severityOrderOsv } from '@lunatrace/lunatrace-common';
import semver from 'semver';

import {
  BuiltNode,
  BuiltRelease,
  BuiltVulnMeta,
  DependencyChain,
  IgnoredVulnerability,
  RawManifest,
  RawNode,
  RawVulnMeta,
  VulnerableRelease,
} from './types';

export class DependencyTree {
  public nodesByNodeId: Map<string, BuiltNode> = new Map();
  // Used to trace the structure of the tree from the bottom up
  public parentNodeIdsByNodeId: Map<string, Set<string>> = new Map();

  public edgeSlugsByNodeId: Map<string, Set<string>> = new Map();
  // Used so we can quickly fetch all nodes that are the same release (ex React@1.0.0)
  public nodeIdsByReleaseId: Map<string, Set<string>> = new Map();
  // Holds which nodes have been determined to be vulnerable, for later processing
  public vulnerableDepNodesIds: Set<string> = new Set();

  public edgeIdsByEdgeSlug: Map<string, string> = new Map();
  // This is the full computed dataset that we server directly to the frontend. This is the "output" format of the tree.
  // Note that other public methods, like getVulnerabilities() rearrange this same data into different shapes for easier parsing outside of the tree
  public vulnerableReleases: VulnerableRelease[];

  // This constructor builds the tree
  constructor(
    sourceManifests: Array<RawManifest>,
    public minimumSeverity: SeverityNamesOsv | null,
    public ignoredVulnerabilities: IgnoredVulnerability[]
  ) {
    // This is a hack to clone this object and unfreeze it, surprisingly tricky in JS
    const clonedManifests = JSON.parse(JSON.stringify(sourceManifests)) as Array<RawManifest>;

    clonedManifests.forEach((manifest) => {
      const flatEdges = manifest.child_edges_recursive;
      if (!flatEdges) {
        return;
      }
      flatEdges.forEach((edge) => {
        if (!edge.parent_id) {
          throw new Error('Missing edge parent ID, this should never happen, check SQL');
        }
        const edgeSlug = edge.parent_id + edge.child_id;
        // We modify some vulnerability data on the release and since that changes the whole type chain, we rebuild the release here
        const builtRelease: BuiltRelease = {
          ...edge.child.release,
          package: {
            ...edge.child.release.package,
            affected_by_vulnerability: this.buildVulns(edge.child, manifest.path || 'Unknown'),
          },
        };
        // flatten the parent id into the child so we can forget about edges as much as possible, and filter the vulns
        const depNode: BuiltNode = {
          ...edge.child,
          type: 'node',
          parent_id: edge.parent_id,
          release: builtRelease,
        };

        this.edgeIdsByEdgeSlug.set(edgeSlug, edge.id);
        // Create a map from a given release to the list of depNodes
        this.upsertValueIntoMapOfSets(this.nodeIdsByReleaseId, depNode.release_id, depNode.id);

        // a map for each node, we know all the edges that it was a child of
        this.upsertValueIntoMapOfSets(this.edgeSlugsByNodeId, depNode.id, edgeSlug);

        // Create a lookup of child IDs that map to a set of nodes that include them (parents).
        const parentIdsToNode = this.parentNodeIdsByNodeId.get(depNode.id) || new Set();

        if (depNode.parent_id && depNode.parent_id !== '00000000-0000-0000-0000-000000000000') {
          parentIdsToNode.add(depNode.parent_id);
          this.parentNodeIdsByNodeId.set(depNode.id, parentIdsToNode);
        }

        // Create a separate lookup to directly map an ID to a node
        this.nodesByNodeId.set(depNode.id, depNode);
      });
    });

    this.vulnerableReleases = this.getVulnerableReleases();
    this.vulnerableReleases.sort((r1, r2) => this.sortBySeverityName(r1.severity, r2.severity));
  }

  public getEdgeIdFromNodePair(firstNodeId: string, secondNodeId: string): string | undefined {
    return this.edgeIdsByEdgeSlug.get(firstNodeId + secondNodeId);
  }

  private buildVulns(depNode: RawNode, path: string): BuiltVulnMeta[] {
    const builtVulns: BuiltVulnMeta[] = [];
    depNode.release.package.affected_by_vulnerability.forEach((vulnMeta) => {
      const vulnerableRange = this.convertRangesToSemverRange(vulnMeta.ranges);
      const isVulnerable = semver.satisfies(depNode.release.version, vulnerableRange);

      if (!isVulnerable) {
        return;
      }

      // filter by ignored
      const vulnId = vulnMeta.vulnerability.id;
      const ignored_vulnerability = this.ignoredVulnerabilities.find((ignored) => {
        return ignored.vulnerability_id === vulnId && ignored.locations.includes(path);
      });

      // Add to the lookup of vulnerable deps for later
      this.vulnerableDepNodesIds.add(depNode.id);

      // Mark the vulns that can be trivially updated
      const triviallyUpdatableTo = this.precomputeVulnTriviallyUpdatableTo(depNode.range, vulnMeta);

      const beneathMinimumSeverity = this.vulnBelowSeverityLimit(vulnMeta.vulnerability.severity_name);
      const builtVuln: BuiltVulnMeta = {
        ...vulnMeta,
        trivially_updatable_to: triviallyUpdatableTo,
        chains: [],
        path,
        beneath_minimum_severity: beneathMinimumSeverity,
        fix_versions: this.computeFixVersions(vulnMeta),
        ignored: !!ignored_vulnerability,
        ignored_vulnerability: ignored_vulnerability,
      };
      builtVulns.push(builtVuln);
    });
    return builtVulns;
  }

  private vulnBelowSeverityLimit(vulnSeverity: string | undefined | null): boolean {
    if (!this.minimumSeverity) {
      return false;
    }

    if (!vulnSeverity) {
      return true;
    }
    const severityRank = severityOrderOsv.indexOf(vulnSeverity);
    const minimumSeverityRank = severityOrderOsv.indexOf(this.minimumSeverity);
    return severityRank < minimumSeverityRank;
  }

  private upsertValueIntoMapOfSets(map: Map<string, Set<string>>, key: string, value: string) {
    const existingSet = map.get(key);
    if (existingSet) {
      // just add the depNodes to the existing release ID
      existingSet.add(value);
    } else {
      map.set(key, new Set([value]));
    }
  }

  // Calls getVulnerableReleases and changes the data shape to just be a list of vulns and their chains
  public getVulnerabilities(): Array<BuiltVulnMeta> {
    const vulnsWithMetadata: Array<BuiltVulnMeta> = [];

    this.vulnerableReleases.forEach((release) => {
      release.affected_by.forEach((newVuln) => {
        const existingVuln = vulnsWithMetadata.find((v) => v.vulnerability.id === newVuln.vulnerability.id);
        if (!existingVuln) {
          // its a new vuln, just add it to the list
          vulnsWithMetadata.push(newVuln);
          return;
        }
        // just merge the vulnData into the main vuln
        existingVuln.chains = [...(existingVuln.chains || []), ...(newVuln.chains || [])];
        // todo: we arent dealing with the trivially updatable to field here yet but it should probably be made to be an array for these amalgamated vulns
        // existingVuln.trivially_updatable = existingVuln.trivially_updatable && newVuln.trivially_updatable;
      });
    });
    return vulnsWithMetadata;
  }

  // this is the main function that we call to return useful information to the client about their vulnerabilities
  // Also this method is too long but also really hard to break up because of all the computed state from various steps
  private getVulnerableReleases(): VulnerableRelease[] {
    const vulnerableReleasesById: Record<string, VulnerableRelease> = {};

    this.vulnerableDepNodesIds.forEach((vulnerableDepId) => {
      const vulnerableDep = this.nodesByNodeId.get(vulnerableDepId);

      if (!vulnerableDep) {
        throw new Error('Could not find vulnerable dep node');
      }

      const chains = this.getDependencyChainsOfDepNode(vulnerableDep);

      const release = vulnerableDep.release;

      const devOnly = chains.every((chain) => {
        const rootLabels = chain[0].labels;
        if (rootLabels && 'scope' in rootLabels && rootLabels.scope === 'dev') {
          return true;
        }
        return false;
      });

      const existingRelease = vulnerableReleasesById[release.id];

      // there might be multiple vulnerabilities for one release so loop through them
      // subsequent vulns on the same node will just merge together
      vulnerableDep.release.package.affected_by_vulnerability.forEach((affectedByVuln) => {
        //add the chains to the vulnerability
        affectedByVuln.chains = chains;

        const rawSeverity = affectedByVuln.vulnerability.severity_name;
        // Clean the severity just in case of bad data or nulls, just in case
        const severity = rawSeverity && severityOrderOsv.includes(rawSeverity) ? rawSeverity : 'Unknown';

        const guidesFromVuln = affectedByVuln.vulnerability.guide_vulnerabilities.map((gv) => gv.guide);
        // We aren't tracking this release yet, make a new object
        if (!existingRelease) {
          const newVulnerableRelease: VulnerableRelease = {
            paths: [affectedByVuln.path],
            release,
            severity,
            cvss: affectedByVuln.vulnerability.cvss_score || null,
            dev_only: devOnly,
            chains,
            trivially_updatable: this.checkIfReleaseTriviallyUpdatable(vulnerableDep),
            affected_by: [affectedByVuln],
            beneath_minimum_severity: affectedByVuln.beneath_minimum_severity,
            guides: guidesFromVuln,
            fix_versions: affectedByVuln.fix_versions,
          };
          vulnerableReleasesById[release.id] = newVulnerableRelease;
          return;
        }
        // We are already tracking this release, just merge the new information

        // devOnly will be false if ANY nodes aren't devOnly
        existingRelease.dev_only = devOnly && existingRelease.dev_only;
        // take the highest cvss
        if (
          affectedByVuln.vulnerability.cvss_score &&
          (existingRelease.cvss || 0) < affectedByVuln.vulnerability.cvss_score
        ) {
          existingRelease.cvss = affectedByVuln.vulnerability.cvss_score;
        }
        // take the highest severity
        if (severityOrderOsv.indexOf(severity) > severityOrderOsv.indexOf(existingRelease.severity)) {
          existingRelease.severity = severity;
        }
        // add vuln to the release if its not being tracked yet
        if (!existingRelease.affected_by.some((v) => v.vulnerability.id === affectedByVuln.vulnerability.id)) {
          existingRelease.affected_by.push(affectedByVuln);
          existingRelease.affected_by.sort((v1, v2) => {
            return this.sortBySeverityName(v1.vulnerability.severity_name, v2.vulnerability.severity_name);
          });
        }

        if (!existingRelease.paths.includes(affectedByVuln.path)) {
          existingRelease.paths.push(affectedByVuln.path);
        }

        // Update severity check, if the new severity is too high for the threshold, it will bump the release to not beneath minimum severity.
        existingRelease.beneath_minimum_severity =
          existingRelease.beneath_minimum_severity && affectedByVuln.beneath_minimum_severity;

        // Add guides, excluding dupes
        guidesFromVuln.forEach((newGuide) => {
          const guideAlreadyAdded = existingRelease.guides.some((existingGuide) => {
            return existingGuide.id === newGuide.id;
          });
          if (!guideAlreadyAdded) {
            existingRelease.guides.push(newGuide);
          }
        });

        // merge fix versions that are common between vulns
        existingRelease.fix_versions = Array.from(
          new Set([...existingRelease.fix_versions, ...affectedByVuln.fix_versions])
        );
      });
    });
    return Object.values(vulnerableReleasesById);
  }

  private sortBySeverityName(nameOne: string | null | undefined, nameTwo: string | null | undefined) {
    return severityOrderOsv.indexOf(nameTwo || 'Unknown') - severityOrderOsv.indexOf(nameOne || 'Unknown');
  }

  private chainsAreIdentical(firstChain: DependencyChain, secondChain: DependencyChain): boolean {
    if (firstChain.length !== secondChain.length) {
      return false;
    }
    return !firstChain.some((dep, i) => dep.id !== secondChain[i].id);
  }

  private computeFixVersions(vuln: RawVulnMeta): string[] {
    const fixedVersions: string[] = [];
    vuln.ranges.forEach((range) => {
      if (range.fixed) {
        fixedVersions.push(range.fixed);
      }
    });

    return fixedVersions;
  }

  private precomputeVulnTriviallyUpdatableTo(requestedRange: string, vuln: RawVulnMeta): string | null {
    const fixedVersions = this.computeFixVersions(vuln);
    const updatableToFixVersions = fixedVersions.filter((fixVersion) => {
      return semver.satisfies(fixVersion, requestedRange);
    });
    if (updatableToFixVersions.length === 0) {
      return null;
    }
    // Get the highest version we can take of the fixes that are possible
    const sortedUpdatableToFixVersions = semver.rsort(updatableToFixVersions);
    return sortedUpdatableToFixVersions[0];
  }

  public convertRangesToSemverRange(ranges: RawVulnMeta['ranges']): semver.Range {
    const vulnerableRanges: string[] = [];
    ranges.forEach((range) => {
      if (range.introduced && range.fixed) {
        vulnerableRanges.push(`>=${range.introduced} <${range.fixed}`);
      } else if (range.introduced) {
        vulnerableRanges.push(`>=${range.introduced}`);
      }
    });
    const vulnerableRangesString = vulnerableRanges.join(' || '); // Just put them all in one big range and let semver figure it out
    const semverRange = new semver.Range(vulnerableRangesString);
    return semverRange;
  }

  private checkIfReleaseTriviallyUpdatable(depNode: BuiltNode): 'yes' | 'partially' | 'no' {
    const releaseId = depNode.release_id;

    const nodeIds = this.nodeIdsByReleaseId.get(releaseId);
    if (!nodeIds) {
      throw new Error(`Failed to find release for id ${releaseId} while checking triviallyUpdatable`);
    }

    const matchingDeps = [...nodeIds].map((edgeSlug) => {
      const node = this.nodesByNodeId.get(edgeSlug);
      if (!node) {
        throw new Error('Missing dep node for dep id while checking triviallyUpdatable');
      }
      return node;
    });

    let totalVulnCount = 0;

    const fullyUpdatableDeps = matchingDeps.filter((dep) => {
      return dep.release.package.affected_by_vulnerability.every((affectedByVuln) => {
        totalVulnCount++; // also keep track of the vuln count while we are in this loop
        return affectedByVuln.trivially_updatable_to !== null;
      });
    });
    const atLeastPartiallyUpdatableDeps = matchingDeps.filter((dep) => {
      return dep.release.package.affected_by_vulnerability.some(
        (affectedByVuln) => affectedByVuln.trivially_updatable_to !== null
      );
    });

    const fullUpdateCount = fullyUpdatableDeps.length;
    const partialUpdateCount = atLeastPartiallyUpdatableDeps.length;
    const allDepsCount = matchingDeps.length;

    if (totalVulnCount === 0 || (fullUpdateCount === 0 && partialUpdateCount === 0)) {
      return 'no';
    }
    if (fullUpdateCount < partialUpdateCount) {
      return 'partially';
    }
    if (fullUpdateCount === allDepsCount) {
      return 'yes';
    }
    return 'no';
  }

  // Show us how a dependency is being included by other dependencies by creating a "chain".
  private getDependencyChainsOfDepNode(depNode: BuiltNode): DependencyChain[] {
    const flattenedChains: DependencyChain[] = [];

    // Flatten the chains
    const recursivelyGenerateChainsWithStack = (dep: BuiltNode, stack: DependencyChain) => {
      // Fastest way to clone into a new array, with root at front and leaf at end
      const stackLength = stack.length;
      const newStack = new Array<BuiltNode>(stackLength + 1);
      newStack[0] = dep;
      for (let i = 0; i < stackLength; i++) {
        newStack[i + 1] = stack[i];
      }

      if (!dep.parent_id || dep.parent_id === '00000000-0000-0000-0000-000000000000') {
        flattenedChains.push(newStack);
        return;
      }

      const parentNodeIds = this.parentNodeIdsByNodeId.get(dep.id);
      if (!parentNodeIds) {
        throw new Error(`Failed to find parent edges for node id ${dep.id} in the tree`);
      }

      parentNodeIds.forEach((parentNodeId) => {
        const parentNode = this.nodesByNodeId.get(parentNodeId);
        if (!parentNode) {
          throw new Error(`Failed to find parent node for node id ${parentNodeId} in the tree`);
        }
        recursivelyGenerateChainsWithStack(parentNode, newStack);
      });
    };

    // start the recursive search
    recursivelyGenerateChainsWithStack(depNode, []);
    return flattenedChains;
  }

  //  this is unfortunately necessary because, since we may accidentally end up walking the same chains multiple times in our processing,
  //  the easiest approach is to simply throw away duplicates
  // TODO: DEPRECATED
  // private ddNewChainsExcludingDuplicates(
  //   existingRelease: VulnerableRelease,
  //   newChains: DependencyChain[]
  // ): DependencyChain[] {
  //   const chains = existingRelease.chains || [];
  //   newChains.forEach((newChain) => {
  //     const chainSlug = `${existingRelease.release.id}:${newChain.map((node) => node.id).toString()}`;
  //     const chainIsDuplicate = this.chainDedupeSlugs.has(chainSlug);
  //     if (!chainIsDuplicate) {
  //       this.chainDedupeSlugs.add(chainSlug);
  //       chains.push(newChain);
  //     }
  //   });
  //   return chains;
  // }
}
