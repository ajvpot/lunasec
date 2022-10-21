package npm

import (
	"database/sql"
	"errors"
	"github.com/go-jet/jet/v2/postgres"
	"github.com/lunasec-io/lunasec/lunatrace/bsl/ingest-worker/pkg/metadata"
	"github.com/lunasec-io/lunasec/lunatrace/bsl/ingest-worker/pkg/metadata/fetcher/npm"
	"github.com/lunasec-io/lunasec/lunatrace/gogen/sqlgen/lunatrace/npm/model"
	"github.com/lunasec-io/lunasec/lunatrace/gogen/sqlgen/lunatrace/npm/table"
	"github.com/rs/zerolog/log"
	"go.uber.org/fx"
)

const (
	maxPackageStreamSize = 1000
)

type npmRegistryDeps struct {
	fx.In

	Fetcher metadata.Fetcher
	DB      *sql.DB
}

type npmRegistry struct {
	deps npmRegistryDeps
}

func (s *npmRegistry) PackageStream() (<-chan string, error) {
	packageStream := make(chan string, maxPackageStreamSize)

	allPackageIds := table.Revision.SELECT(
		table.Revision.ID,
	).GROUP_BY(table.Revision.ID).
		ORDER_BY(table.Revision.ID.ASC())

	allPackageIdsSql, _ := allPackageIds.Sql()

	rows, err := s.deps.DB.Query(allPackageIdsSql)
	if err != nil {
		return nil, err
	}

	go func() {
		defer close(packageStream)

		for rows.Next() {
			var packageName string
			err = rows.Scan(&packageName)
			if err != nil {
				log.Error().
					Err(err).
					Msg("failed to read row from all packages query")
				return
			}
			packageStream <- packageName
		}
	}()

	return packageStream, nil
}

func (s *npmRegistry) GetPackageMetadata(packageName string) (*metadata.PackageMetadata, error) {
	queryPackageMetadata := table.Revision.SELECT(
		table.Revision.Doc,
		table.Revision.Deleted,
	).WHERE(
		table.Revision.ID.EQ(postgres.String(packageName)),
	).ORDER_BY(table.Revision.Seq.DESC())

	var revision model.Revision

	// TODO (cthompson) if there is no row returned, try to resolve the package via the NPM fetcher
	err := queryPackageMetadata.Query(s.deps.DB, &revision)
	if err != nil {
		log.Error().
			Err(err).
			Str("package name", packageName).
			Msg("failed to query rows for package metadata")
		return nil, err
	}

	if revision.Deleted {
		err = errors.New("failed to get latest package metadata")
		log.Error().
			Str("package name", packageName).
			Msg("latest package information is marked as deleted")
		return nil, err
	}

	return npm.ParseRawPackageMetadata([]byte(revision.Doc))
}

func NewNPMRegistry(d npmRegistryDeps) metadata.NpmRegistry {
	return &npmRegistry{deps: d}
}
