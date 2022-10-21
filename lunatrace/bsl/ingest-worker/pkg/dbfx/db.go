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
package dbfx

import (
	"database/sql"
	"go.uber.org/fx"
)

type DBResult struct {
	fx.Out

	DB *sql.DB
}

func NewDB(config Config) (DBResult, error) {
	db, err := sql.Open("postgres", config.DSN)
	if err != nil {
		return DBResult{}, err
	}

	err = db.Ping()
	if err != nil {
		return DBResult{}, err
	}

	return DBResult{
		DB: db,
	}, nil
}
