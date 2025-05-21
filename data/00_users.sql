CREATE TABLE "users" (
  "user_id" uuid PRIMARY KEY DEFAULT (gen_random_uuid ()),
  "auth_id" uuid UNIQUE,
  "username" varchar(255) UNIQUE NOT NULL,
  "email" varchar(255) UNIQUE NOT NULL,
  "editor" bool NOT NULL DEFAULT false,
  "admin" bool NOT NULL DEFAULT false,
  "active" bool NOT NULL DEFAULT false
);

CREATE TABLE "auth"."users" (
  "id" uuid PRIMARY KEY,
  "email" text UNIQUE NOT NULL,
  "raw_app_meta_data" jsonb
);

CREATE UNIQUE INDEX "user_auth_id_idex" ON "users" ("auth_id");

ALTER TABLE "auth"."users"
ADD FOREIGN KEY ("id") REFERENCES "users" ("auth_id");
