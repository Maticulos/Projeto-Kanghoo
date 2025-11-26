#!/usr/bin/env bash
# Reverte a última batch de migrations
set -euo pipefail

cd "$(dirname "$0")/../../server"

npx knex migrate:rollback --knexfile ./knexfile.js

echo "Rollback de migrations executado." 
