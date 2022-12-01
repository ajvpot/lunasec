CREATE TABLE "analysis"."manifest_dependency_edge_result_callsite" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "path" text NOT NULL, "start_row" integer NOT NULL, "start_column" integer NOT NULL, "end_row" integer NOT NULL, "end_column" integer NOT NULL, "manifest_dependency_edge_result_id" uuid NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("manifest_dependency_edge_result_id") REFERENCES "analysis"."manifest_dependency_edge_result"("id") ON UPDATE cascade ON DELETE cascade);COMMENT ON TABLE "analysis"."manifest_dependency_edge_result_callsite" IS E'Callsite of a child dependency being imported and used inside of a parent manifest dependency.';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
