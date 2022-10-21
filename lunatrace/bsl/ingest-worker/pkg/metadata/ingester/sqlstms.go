package ingester

import (
	"context"
	"database/sql"
	"github.com/go-jet/jet/v2/postgres"
	"github.com/google/uuid"
	"github.com/lunasec-io/lunasec/lunatrace/gogen/sqlgen/lunatrace/package/model"
	. "github.com/lunasec-io/lunasec/lunatrace/gogen/sqlgen/lunatrace/package/table"
)

func upsertPackage(ctx context.Context, tx *sql.Tx, p model.Package) (id uuid.UUID, err error) {
	packageInsert := Package.INSERT(
		Package.Name,
		Package.PackageManager,
		Package.CustomRegistry,
		Package.Description,
		Package.LastSuccessfulFetch,
	).MODEL(p).
		ON_CONFLICT().
		ON_CONSTRAINT("package_package_manager_custom_registry_name_idx").
		DO_UPDATE(
			postgres.SET(
				Package.Description.SET(Package.EXCLUDED.Description),
				Package.LastSuccessfulFetch.SET(Package.EXCLUDED.LastSuccessfulFetch),
			),
		).
		RETURNING(Package.ID)

	var insertedId string
	err = packageInsert.QueryContext(ctx, tx, &insertedId)
	if err != nil {
		return uuid.UUID{}, err
	}
	return uuid.Parse(insertedId)
}

func upsertRelease(ctx context.Context, tx *sql.Tx, r model.Release) (id uuid.UUID, err error) {
	releaseInsert := Release.INSERT(
		Release.PackageID,
		Release.PublishingMaintainerID,
		Release.ReleaseTime,
		Release.BlobHash,
		Release.UpstreamBlobURL,
		Release.UpstreamData,
		Release.Version,
		Release.FetchedTime,
	).MODEL(r).
		ON_CONFLICT().
		ON_CONSTRAINT("release_package_id_version_idx").
		DO_UPDATE(
			postgres.SET(
				Release.PublishingMaintainerID.SET(Release.EXCLUDED.PublishingMaintainerID),
				Release.ReleaseTime.SET(Release.EXCLUDED.ReleaseTime),
				Release.BlobHash.SET(Release.EXCLUDED.BlobHash),
				Release.UpstreamBlobURL.SET(Release.EXCLUDED.UpstreamBlobURL),
				Release.UpstreamData.SET(Release.EXCLUDED.UpstreamData),
				Release.Version.SET(Release.EXCLUDED.Version),
				Release.FetchedTime.SET(Release.EXCLUDED.FetchedTime),
			),
		).
		RETURNING(Release.ID)

	var insertedId string
	err = releaseInsert.QueryContext(ctx, tx, &insertedId)
	if err != nil {
		return uuid.UUID{}, err
	}
	return uuid.Parse(insertedId)
}

func upsertReleaseDependencyPackage(ctx context.Context, tx *sql.Tx, p model.Package) (id uuid.UUID, err error) {
	insertPackage := Package.INSERT(
		Package.Name,
		Package.PackageManager,
		Package.CustomRegistry,
	).MODEL(p).
		ON_CONFLICT().
		ON_CONSTRAINT("package_package_manager_custom_registry_name_idx").
		DO_UPDATE(
			postgres.SET(
				Package.Name.SET(Package.EXCLUDED.Name),
			),
		).
		RETURNING(Package.ID)

	var insertedId string
	err = insertPackage.QueryContext(ctx, tx, &insertedId)
	if err != nil {
		return uuid.UUID{}, err
	}
	return uuid.Parse(insertedId)
}

func upsertReleaseDependency(ctx context.Context, tx *sql.Tx, r model.ReleaseDependency) (id uuid.UUID, err error) {
	insertReleaseDependency := ReleaseDependency.INSERT(
		ReleaseDependency.ReleaseID,
		ReleaseDependency.DependencyPackageID,
		ReleaseDependency.PackageName,
		ReleaseDependency.PackageVersionQuery,
	).MODEL(r).
		ON_CONFLICT().
		ON_CONSTRAINT("release_dependency_release_id_package_name_package_version__idx").
		DO_UPDATE(
			postgres.SET(
				ReleaseDependency.ReleaseID.SET(ReleaseDependency.EXCLUDED.ReleaseID),
			),
		).
		RETURNING(ReleaseDependency.ID)

	var insertedId string
	err = insertReleaseDependency.QueryContext(ctx, tx, &insertedId)
	if err != nil {
		return uuid.UUID{}, err
	}
	return uuid.Parse(insertedId)
}

func upsertPackageMaintainer(ctx context.Context, tx *sql.Tx, p model.PackageMaintainer) error {
	insertPackageMaintainer := PackageMaintainer.INSERT(
		PackageMaintainer.PackageID,
		PackageMaintainer.MaintainerID,
	).MODEL(p).
		ON_CONFLICT().
		ON_CONSTRAINT("package_maintainer_package_id_maintainer_id_idx").
		DO_NOTHING()
	_, err := insertPackageMaintainer.ExecContext(ctx, tx)
	return err
}

func upsertMaintainer(ctx context.Context, tx *sql.Tx, m model.Maintainer) (id uuid.UUID, err error) {
	insertMaintainer := Maintainer.INSERT(
		Maintainer.Email,
		Maintainer.Name,
		Maintainer.PackageManager,
	).MODEL(m).
		ON_CONFLICT().
		ON_CONSTRAINT("maintainer_package_manager_email_idx").
		DO_UPDATE(
			postgres.SET(
				Maintainer.Name.SET(Maintainer.EXCLUDED.Name),
			),
		).
		RETURNING(Maintainer.ID)

	var insertedId string
	err = insertMaintainer.QueryContext(ctx, tx, &insertedId)
	if err != nil {
		return uuid.UUID{}, err
	}
	return uuid.Parse(insertedId)
}
