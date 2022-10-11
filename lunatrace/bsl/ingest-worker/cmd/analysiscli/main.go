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
package main

import (
	"github.com/lunasec-io/lunasec/lunatrace/bsl/ingest-worker/pkg/staticanalysis/rules"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/urfave/cli/v2"
	"os"
)

func main() {
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	app := &cli.App{
		Name: "lunatrace-analysis",
		Commands: []*cli.Command{
			{
				Name:  "code-calls-dependency",
				Usage: "Determine if a dependency is imported and called.",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:     "dependency",
						Usage:    "The dependency to verify if it is imported and called.",
						Required: true,
					},
				},
				Action: func(c *cli.Context) error {
					codeDir := c.Args().First()
					dependency := c.String("dependency")

					called, err := rules.DependencyIsImportedAndCalledInCode(dependency, codeDir)
					if !called {
						log.Info().Msg("dependency was not imported and called")
					}
					return err
				},
			},
		},
	}

	err := app.Run(os.Args)
	if err != nil {
		log.Error().Err(err).Msg("failed to run cli")
	}
}
