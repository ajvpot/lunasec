// Copyright by LunaSec (owned by Refinery Labs, Inc)
//
// Licensed under the Business Source License v1.1
// (the "License"); you may not use this file except in compliance with the
// License. You may obtain a copy of the License at
//
// https://github.com/lunasec-io/lunasec/blob/master/licenses/BSL-LunaTrace.txt
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
package ingest

import (
	"bufio"
	"errors"
	"github.com/ajvpot/clifx"
	"github.com/rs/zerolog/log"
	"github.com/schollz/progressbar/v3"
	"github.com/urfave/cli/v2"
	"go.uber.org/fx"
	"os"

	"github.com/lunasec-io/lunasec/lunatrace/bsl/ingest-worker/pkg/metadata"
)

type Params struct {
	fx.In

	Ingester   metadata.PackageIngester
	Replicator metadata.Replicator
}

func NewCommand(p Params) clifx.CommandResult {
	return clifx.CommandResult{
		Command: &cli.Command{
			Name:  "package",
			Usage: "[packages...]",
			Subcommands: []*cli.Command{
				{
					Name: "ingest",
					Flags: []cli.Flag{
						&cli.StringFlag{
							Name:     "packages",
							Required: false,
							Usage:    "File with list of packages to ingest.",
						},
						&cli.BoolFlag{
							Name:     "registry",
							Required: false,
							Usage:    "Ingest all packages from replicated registry.",
						},
						&cli.BoolFlag{
							Name:     "ignore-errors",
							Required: false,
							Usage:    "If a package ingestion fails, continue without fatally failing.",
						},
					},
					Action: func(ctx *cli.Context) error {
						packageName := ctx.Args().First()
						registry := ctx.Bool("registry")
						ignoreErrors := ctx.Bool("ignore-errors")
						packagesFile := ctx.String("packages")

						// import packages from a file
						if packagesFile != "" {
							fileHandle, err := os.Open(packagesFile)
							if err != nil {
								return err
							}
							defer fileHandle.Close()
							fileScanner := bufio.NewScanner(fileHandle)

							var packages []string
							for fileScanner.Scan() {
								packageName = fileScanner.Text()
								packages = append(packages, packageName)
							}

							bar := progressbar.Default(int64(len(packages)))

							for _, packageName = range packages {
								err = p.Ingester.IngestPackageAndDependencies(ctx.Context, packageName)
								if err != nil {
									log.Error().
										Err(err).
										Str("package name", packageName).
										Msg("failed to import")
									return err
								}
								bar.Add(1)
							}

							log.Info().
								Msg("finished ingesting packages")
							return nil
						}

						if registry {
							return p.Ingester.IngestAllPackagesFromRegistry(ctx.Context, ignoreErrors)
						}

						if packageName == "" {
							err := errors.New("no package name provided")
							return err
						}

						return p.Ingester.IngestPackageAndDependencies(ctx.Context, packageName)
					},
				},
				{
					Name: "replicate",
					Flags: []cli.Flag{
						&cli.IntFlag{
							Name:     "since",
							Required: false,
							Usage:    "Offset of where to start replicating from.",
						},
						&cli.BoolFlag{
							Name:     "init",
							Required: false,
							Usage:    "Initial replication to quickly catchup.",
						},
						&cli.BoolFlag{
							Name:     "resume",
							Required: false,
							Usage:    "Resume replication from last replicated item.",
						},
					},
					Action: func(ctx *cli.Context) error {
						var err error

						since := ctx.Int("since")
						init := ctx.Bool("init")
						resume := ctx.Bool("resume")

						if init {
							err = p.Replicator.InitialReplication(ctx.Context)
							if err != nil {
								return err
							}
						}

						if resume {
							since, err = p.Replicator.GetLastReplicatedOffset()
							if err != nil {
								return err
							}
						}

						return p.Replicator.ReplicateSince(ctx.Context, since)
					},
				},
			},
		},
	}
}
