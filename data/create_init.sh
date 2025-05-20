#!/bin/bash

# Get the directory of the root of repo and get ENV file
ROOT_DIR="$(dirname "$(dirname "$(realpath "$0")")")"

output_file="$ROOT_DIR/data/init_db.sql"

# Start the file including script to clear database
echo "\i '$ROOT_DIR/data/clear_database.sql'" > "$output_file"

# Loop through all .sql files and append \i commands to the output file
for sql_file in "$ROOT_DIR/data/"[0-9][0-9]*.sql; do
  # Skip the output file itself
  if [[ "$sql_file" != "$output_file" ]]; then
    echo "\i '$sql_file'" >> "$output_file"
  fi
done

echo "Created $output_file to import all SQL files."
