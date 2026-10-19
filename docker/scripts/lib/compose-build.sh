#!/usr/bin/env bash

compose_from_project_root() {
  (
    cd "$PROJECT_ROOT" && docker compose "$@"
  )
}
