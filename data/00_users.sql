CREATE TABLE "users" (
  "user_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "auth_id" uuid UNIQUE REFERENCES auth.users ON UPDATE CASCADE ON DELETE SET NULL,
  "username" varchar(255) UNIQUE NOT NULL,
  "email" varchar(255) UNIQUE NOT NULL,
  "editor" bool NOT NULL DEFAULT false,
  "admin" bool NOT NULL DEFAULT false,
  "active" bool NOT NULL DEFAULT true
);

-- Auth schema and table just for reference. Actual implementation is provided by Supabase
CREATE SCHEMA IF NOT EXISTS "auth";

CREATE TABLE IF NOT EXISTS "auth"."users" (
  "id" uuid PRIMARY KEY,
  "email" text NOT NULL UNIQUE,
  "raw_app_meta_data" jsonb
);
