//
// Code generated by go-jet DO NOT EDIT.
//
// WARNING: Changes to this file may cause incorrect behavior
// and will be lost if the code is regenerated
//

package model

import (
	"github.com/google/uuid"
	"time"
)

type PackageDownloadCount struct {
	Name      string
	PackageID *uuid.UUID
	Day       time.Time
	Downloads int32
}
