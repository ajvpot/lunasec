//
// Code generated by go-jet DO NOT EDIT.
//
// WARNING: Changes to this file may cause incorrect behavior
// and will be lost if the code is regenerated
//

package table

import (
	"github.com/go-jet/jet/v2/postgres"
)

var ReleaseLicense = newReleaseLicenseTable("package", "release_license", "")

type releaseLicenseTable struct {
	postgres.Table

	//Columns
	ID           postgres.ColumnString
	Source       postgres.ColumnString
	ReleaseID    postgres.ColumnString
	ScanTime     postgres.ColumnTimestampz
	LicenseID    postgres.ColumnString
	ScanMetadata postgres.ColumnString

	AllColumns     postgres.ColumnList
	MutableColumns postgres.ColumnList
}

type ReleaseLicenseTable struct {
	releaseLicenseTable

	EXCLUDED releaseLicenseTable
}

// AS creates new ReleaseLicenseTable with assigned alias
func (a ReleaseLicenseTable) AS(alias string) *ReleaseLicenseTable {
	return newReleaseLicenseTable(a.SchemaName(), a.TableName(), alias)
}

// Schema creates new ReleaseLicenseTable with assigned schema name
func (a ReleaseLicenseTable) FromSchema(schemaName string) *ReleaseLicenseTable {
	return newReleaseLicenseTable(schemaName, a.TableName(), a.Alias())
}

// WithPrefix creates new ReleaseLicenseTable with assigned table prefix
func (a ReleaseLicenseTable) WithPrefix(prefix string) *ReleaseLicenseTable {
	return newReleaseLicenseTable(a.SchemaName(), prefix+a.TableName(), a.TableName())
}

// WithSuffix creates new ReleaseLicenseTable with assigned table suffix
func (a ReleaseLicenseTable) WithSuffix(suffix string) *ReleaseLicenseTable {
	return newReleaseLicenseTable(a.SchemaName(), a.TableName()+suffix, a.TableName())
}

func newReleaseLicenseTable(schemaName, tableName, alias string) *ReleaseLicenseTable {
	return &ReleaseLicenseTable{
		releaseLicenseTable: newReleaseLicenseTableImpl(schemaName, tableName, alias),
		EXCLUDED:            newReleaseLicenseTableImpl("", "excluded", ""),
	}
}

func newReleaseLicenseTableImpl(schemaName, tableName, alias string) releaseLicenseTable {
	var (
		IDColumn           = postgres.StringColumn("id")
		SourceColumn       = postgres.StringColumn("source")
		ReleaseIDColumn    = postgres.StringColumn("release_id")
		ScanTimeColumn     = postgres.TimestampzColumn("scan_time")
		LicenseIDColumn    = postgres.StringColumn("license_id")
		ScanMetadataColumn = postgres.StringColumn("scan_metadata")
		allColumns         = postgres.ColumnList{IDColumn, SourceColumn, ReleaseIDColumn, ScanTimeColumn, LicenseIDColumn, ScanMetadataColumn}
		mutableColumns     = postgres.ColumnList{SourceColumn, ReleaseIDColumn, ScanTimeColumn, LicenseIDColumn, ScanMetadataColumn}
	)

	return releaseLicenseTable{
		Table: postgres.NewTable(schemaName, tableName, alias, allColumns...),

		//Columns
		ID:           IDColumn,
		Source:       SourceColumn,
		ReleaseID:    ReleaseIDColumn,
		ScanTime:     ScanTimeColumn,
		LicenseID:    LicenseIDColumn,
		ScanMetadata: ScanMetadataColumn,

		AllColumns:     allColumns,
		MutableColumns: mutableColumns,
	}
}
