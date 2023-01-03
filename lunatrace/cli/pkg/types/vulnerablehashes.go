// Copyright 2021 by LunaSec (owned by Refinery Labs, Inc)
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
package types

import "github.com/blang/semver/v4"

type VulnerableFile struct {
	FileName string `json:"file_name"`
}

type VulnerableHash struct {
	Name                     string `json:"name"`
	Version                  string `json:"version"`
	CVE                      string `json:"cve"`
	VulnerableFileHashLookup map[string]VulnerableFile
}

type VulnerableHashLookup map[string]VulnerableHash

type LibraryFileVersionCheck struct {
	Cve         string
	SemverRange semver.Range
	LibraryFile string
}
