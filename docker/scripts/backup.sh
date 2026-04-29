#!/usr/bin/env bash
# ============================================
# Tax Apps - Full Backup / Restore
# ============================================
# Main script for:
#   ./backup.sh backup
#   ./backup.sh restore [dir]
#   ./backup.sh itcm
#
# manage.sh delegates backup / restore here.
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_BASE="${BACKUP_BASE:-$SCRIPT_DIR/../backups}"
LATEST_BACKUP_BASE="${LATEST_BACKUP_BASE:-$(cd "$PROJECT_ROOT/.." && pwd)/tax_apps_backup_latest}"
LATEST_BACKUP_RETENTION_DAYS="${LATEST_BACKUP_RETENTION_DAYS:-1}"
FULL_BACKUP_RETENTION_DAYS="${FULL_BACKUP_RETENTION_DAYS:-${RETENTION_DAYS:-7}}"

PG_TARGETS=(
  "ITCM PostgreSQL:itcm-postgres:postgres:inheritance_tax_db:inheritance-case-management_postgres_data:itcm-postgres:inheritance-case-management"
  "Bank Analyzer PostgreSQL:bank-analyzer-postgres:bankuser:bank_analyzer:bank-analyzer-postgres:bank-analyzer-postgres:bank-analyzer-django"
)

SQLITE_TARGETS=(
  "medical-stock-valuation-data:medical-stock-valuation-data"
)

BIND_TARGETS=(
  "bank-analyzer upload:apps/bank-analyzer-django/data:bank-analyzer-upload"
)

SETTINGS_TARGETS=(
  "ITCM .env:apps/inheritance-case-management/.env:itcm-.env"
  "Bank Analyzer .env:apps/bank-analyzer-django/.env:bank-analyzer-.env"
)

warn() { echo -e "\033[1;33m[WARN]\033[0m  $*"; }
err() { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }
ok() { echo -e "\033[1;32m[OK]\033[0m    $*"; }

print_banner() {
  echo ""
  echo "========================================"
  echo "  $*"
  echo "========================================"
  echo ""
}

format_size() {
  local bytes="$1"
  if [[ $bytes -gt $((1024*1024)) ]]; then
    echo "$(( bytes / 1024 / 1024 )).$(( (bytes / 1024 % 1024) * 10 / 1024 )) MB"
  elif [[ $bytes -gt 1024 ]]; then
    echo "$(( bytes / 1024 )) KB"
  else
    echo "$bytes bytes"
  fi
}

dir_size() {
  local dir="$1"
  if [[ -d "$dir" ]]; then
    du -sb "$dir" 2>/dev/null | awk '{print $1}' || echo "0"
  else
    echo "0"
  fi
}

to_win_path() {
  local path="$1"
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$path"
  else
    printf '%s\n' "$path"
  fi
}

copy_latest_backup_item() {
  local src="$1"
  local dest_dir="$2"
  [[ -e "$src" ]] || return 1
  mkdir -p "$dest_dir"
  if cp -R "$src" "$dest_dir/"; then
    return 0
  fi
  warn "Latest backup copy failed: $src"
  return 1
}

remove_old_latest_items() {
  local dir="$1"
  local retention_days="${2:-$LATEST_BACKUP_RETENTION_DAYS}"
  [[ -d "$dir" ]] || return 0
  case "$dir" in
    "$LATEST_BACKUP_BASE"/*) ;;
    *)
      warn "Skip latest-backup cleanup outside latest backup base: $dir"
      return 0
      ;;
  esac
  find "$dir" -mindepth 1 -maxdepth 1 -mtime +"$((retention_days - 1))" -print -exec rm -rf {} + 2>/dev/null |
    while IFS= read -r item; do
      echo "  Deleting latest copy: $(basename "$item")"
    done
}

copy_latest_backup_set() {
  local dest_dir="$1"
  shift
  local copied=0
  for src in "$@"; do
    if copy_latest_backup_item "$src" "$dest_dir"; then
      (( copied++ )) || true
    fi
  done
  remove_old_latest_items "$dest_dir" "$LATEST_BACKUP_RETENTION_DAYS"
  if [[ $copied -gt 0 ]]; then
    echo "  Latest copy: $(to_win_path "$dest_dir")  ($copied item(s), ${LATEST_BACKUP_RETENTION_DAYS} day retention)"
  fi
}

is_container_running() {
  docker ps --filter "name=$1" --filter "status=running" --format "{{.Names}}" 2>/dev/null | grep -q "$1"
}

print_summary_banner() {
  local title="$1" fail_count="$2"
  if [[ $fail_count -gt 0 ]]; then
    print_banner "$title (with errors)"
  else
    print_banner "$title"
  fi
}

backup_postgres() {
  local label="$1" container="$2" pg_user="$3" db_name="$4" volume="$5" dump_file="$6"
  echo "$label"

  if is_container_running "$container"; then
    if docker exec "$container" pg_dump -U "$pg_user" -d "$db_name" > "$backup_dir/$dump_file.sql" 2>/dev/null; then
      ok "$dump_file.sql"
      (( backup_ok++ )) || true
      return
    fi
    rm -f "$backup_dir/$dump_file.sql"
    warn "pg_dump failed, trying volume backup..."
  else
    if docker volume inspect "$volume" >/dev/null 2>&1; then
      warn "Container stopped - backing up volume directly"
    fi
  fi

  if docker volume inspect "$volume" >/dev/null 2>&1; then
    local backup_dir_win
    backup_dir_win="$(to_win_path "$backup_dir")"
    if MSYS_NO_PATHCONV=1 docker run --rm -v "$volume:/data" -v "$backup_dir_win:/backup" alpine tar czf "/backup/$dump_file-volume.tar.gz" -C /data . >/dev/null 2>&1; then
      ok "$dump_file-volume.tar.gz"
      (( backup_ok++ )) || true
    else
      err "Volume backup failed"
      (( backup_fail++ )) || true
    fi
  else
    warn "$label volume not found"
    (( backup_skip++ )) || true
  fi
}

restore_postgres() {
  local label="$1" container="$2" pg_user="$3" db_name="$4" volume="$5" dump_file="$6" restart_hint="$7"
  echo "$label"

  if [[ -f "$backup_dir/$dump_file.sql" ]]; then
    if ! is_container_running "$container"; then
      err "$container container is not running."
      echo "  Run: ./manage.sh restart $restart_hint"
      (( restore_fail++ )) || true
      return
    fi
    docker exec "$container" psql -U "$pg_user" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$db_name' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
    docker exec "$container" psql -U "$pg_user" -d postgres -c "DROP DATABASE IF EXISTS $db_name;" >/dev/null 2>&1
    docker exec "$container" psql -U "$pg_user" -d postgres -c "CREATE DATABASE $db_name;" >/dev/null 2>&1
    if docker exec -i "$container" psql -U "$pg_user" -d "$db_name" < "$backup_dir/$dump_file.sql" >/dev/null 2>&1; then
      ok "$dump_file.sql"
      (( restore_ok++ )) || true
    else
      err "$label restore failed"
      (( restore_fail++ )) || true
    fi
  elif [[ -f "$backup_dir/$dump_file-volume.tar.gz" ]]; then
    warn "Volume restore - container must be stopped"
    docker volume inspect "$volume" >/dev/null 2>&1 || docker volume create "$volume" >/dev/null 2>&1
    local backup_dir_win
    backup_dir_win="$(to_win_path "$backup_dir")"
    if MSYS_NO_PATHCONV=1 docker run --rm -v "$volume:/data" -v "$backup_dir_win:/backup" alpine sh -c "cd /data && rm -rf * && tar xzf /backup/$dump_file-volume.tar.gz" >/dev/null 2>&1; then
      ok "$dump_file-volume.tar.gz"
      (( restore_ok++ )) || true
    else
      err "Volume restore failed"
      (( restore_fail++ )) || true
    fi
  else
    warn "Not in backup"
    (( restore_skip++ )) || true
  fi
}

backup_sqlite_volumes() {
  local step_label="$1"
  shift
  echo "$step_label SQLite volumes ..."
  local sqlite_ok=0 sqlite_skip=0
  local backup_dir_win
  backup_dir_win="$(to_win_path "$backup_dir")"
  for pair in "$@"; do
    local vol="${pair%%:*}"
    local fname="${pair##*:}"
    if docker volume inspect "$vol" >/dev/null 2>&1; then
      if MSYS_NO_PATHCONV=1 docker run --rm -v "$vol:/data" -v "$backup_dir_win:/backup" alpine tar czf "/backup/${fname}.tar.gz" -C /data . >/dev/null 2>&1; then
        (( sqlite_ok++ )) || true
      else
        err "$vol backup failed"
        (( backup_fail++ )) || true
      fi
    else
      (( sqlite_skip++ )) || true
    fi
  done
  if [[ $sqlite_ok -gt 0 ]]; then
    ok "SQLite $sqlite_ok volumes"
    (( backup_ok += sqlite_ok ))
  fi
  if [[ $sqlite_ok -eq 0 && $sqlite_skip -eq $# ]]; then
    warn "No SQLite volumes found"
    (( backup_skip++ )) || true
  fi
}

restore_sqlite_volumes() {
  local step_label="$1"
  shift
  echo "$step_label SQLite volumes ..."
  local sqlite_ok=0
  local backup_dir_win
  backup_dir_win="$(to_win_path "$backup_dir")"
  for pair in "$@"; do
    local fname="${pair%%:*}"
    local vol="${pair##*:}"
    if [[ -f "$backup_dir/$fname" ]]; then
      docker volume inspect "$vol" >/dev/null 2>&1 || docker volume create "$vol" >/dev/null 2>&1
      if MSYS_NO_PATHCONV=1 docker run --rm -v "$vol:/data" -v "$backup_dir_win:/backup" alpine sh -c "cd /data && rm -rf * && tar xzf /backup/$fname" >/dev/null 2>&1; then
        (( sqlite_ok++ )) || true
      else
        (( restore_fail++ )) || true
      fi
    fi
  done
  if [[ $sqlite_ok -gt 0 ]]; then
    ok "SQLite $sqlite_ok volumes"
    (( restore_ok += sqlite_ok ))
  else
    warn "No SQLite backups found"
    (( restore_skip++ )) || true
  fi
}

backup_bind_data() {
  local step_label="$1" label="$2" src_dir="$3" dest_dir="$4"
  echo "$step_label $label ..."
  if [[ -d "$src_dir" ]]; then
    local file_count
    file_count=$(find "$src_dir" -mindepth 1 ! -name '.gitkeep' 2>/dev/null | head -1 | wc -l)
    if [[ $file_count -eq 0 ]]; then
      warn "$label is empty"
      (( backup_skip++ )) || true
    else
      mkdir -p "$dest_dir"
      if cp -r "$src_dir"/* "$dest_dir/" 2>/dev/null; then
        ok "$(basename "$dest_dir")/"
        (( backup_ok++ )) || true
      else
        err "$label copy failed"
        (( backup_fail++ )) || true
      fi
    fi
  else
    warn "$label not found"
    (( backup_skip++ )) || true
  fi
}

backup_settings_file() {
  local step_label="$1" label="$2" src_file="$3" dest_file="$4"
  echo "$step_label $label ..."
  if [[ -f "$src_file" ]]; then
    cp "$src_file" "$dest_file"
    ok "$(basename "$dest_file")"
    (( backup_ok++ )) || true
  else
    warn "$label not found"
    (( backup_skip++ )) || true
  fi
}

restore_bind_data() {
  local step_label="$1" label="$2" src_dir="$3" dest_dir="$4"
  echo "$step_label $label ..."
  if [[ -d "$src_dir" ]]; then
    mkdir -p "$dest_dir"
    if cp -r "$src_dir"/* "$dest_dir/" 2>/dev/null; then
      ok "$(basename "$src_dir")/"
      (( restore_ok++ )) || true
    else
      err "$label restore failed"
      (( restore_fail++ )) || true
    fi
  else
    warn "Not in backup"
    (( restore_skip++ )) || true
  fi
}

restore_settings_file() {
  local step_label="$1" label="$2" src_file="$3" dest_file="$4"
  echo "$step_label $label ..."
  if [[ -f "$src_file" ]]; then
    cp "$src_file" "$dest_file"
    ok "$(basename "$src_file")"
    (( restore_ok++ )) || true
  else
    warn "Not in backup"
    (( restore_skip++ )) || true
  fi
}

backup_bank_analyzer_json() {
  local step_label="$1"
  local container="bank-analyzer"
  local dest_dir="$backup_dir/bank-analyzer-json"
  local temp_dir="/tmp/bank-analyzer-json-$(basename "$backup_dir")"

  echo "$step_label Bank Analyzer JSON exports ..."
  if ! is_container_running "$container"; then
    warn "$container container is not running"
    (( backup_skip++ )) || true
    return
  fi

  if ! docker exec "$container" sh -c "rm -rf '$temp_dir' && mkdir -p '$temp_dir' && python manage.py export_case_json_backups --output-dir '$temp_dir'" >/dev/null 2>&1; then
    err "Bank Analyzer JSON export failed"
    (( backup_fail++ )) || true
    return
  fi

  mkdir -p "$dest_dir"
  if ! docker cp "$container:$temp_dir/." "$dest_dir/" >/dev/null 2>&1; then
    docker exec "$container" rm -rf "$temp_dir" >/dev/null 2>&1 || true
    err "Bank Analyzer JSON copy failed"
    (( backup_fail++ )) || true
    return
  fi
  docker exec "$container" rm -rf "$temp_dir" >/dev/null 2>&1 || true

  local json_count
  json_count=$(find "$dest_dir" -maxdepth 1 -type f -name '*.json' | wc -l | tr -d ' ')
  if [[ "$json_count" -gt 0 ]]; then
    ok "bank-analyzer-json/ ($json_count files)"
    (( backup_ok++ )) || true
  else
    warn "No Bank Analyzer cases to export"
    (( backup_skip++ )) || true
  fi
}

cmd_backup() {
  print_banner "Tax Apps - Backup"

  local timestamp
  timestamp=$(date +"%Y-%m-%d_%H%M%S")
  backup_dir="$BACKUP_BASE/$timestamp"
  mkdir -p "$backup_dir"

  echo "Destination: $backup_dir/"
  echo ""

  backup_ok=0
  backup_fail=0
  backup_skip=0
  local step=0 total=$(( ${#PG_TARGETS[@]} + 1 + ${#BIND_TARGETS[@]} + ${#SETTINGS_TARGETS[@]} + 1 ))

  for target in "${PG_TARGETS[@]}"; do
    (( step++ )) || true
    IFS=: read -r label container pg_user db_name volume dump_file _restart <<< "$target"
    backup_postgres "[$step/$total] $label ..." "$container" "$pg_user" "$db_name" "$volume" "$dump_file"
  done

  (( step++ )) || true
  backup_sqlite_volumes "[$step/$total]" "${SQLITE_TARGETS[@]}"

  for target in "${BIND_TARGETS[@]}"; do
    (( step++ )) || true
    IFS=: read -r label src_path backup_dirname <<< "$target"
    backup_bind_data "[$step/$total]" "$label" "$PROJECT_ROOT/$src_path" "$backup_dir/$backup_dirname"
  done

  for target in "${SETTINGS_TARGETS[@]}"; do
    (( step++ )) || true
    IFS=: read -r label src_path backup_filename <<< "$target"
    backup_settings_file "[$step/$total]" "$label" "$PROJECT_ROOT/$src_path" "$backup_dir/$backup_filename"
  done

  (( step++ )) || true
  backup_bank_analyzer_json "[$step/$total]"

  print_summary_banner "Backup Complete" "$backup_fail"
  echo "  Destination: $backup_dir/"
  echo "  Size: $(format_size "$(dir_size "$backup_dir")")"
  echo "  OK: $backup_ok  Skipped: $backup_skip  Failed: $backup_fail"
  echo ""
  if [[ $backup_ok -eq 0 ]]; then
    warn "No data was backed up. Removing empty directory."
    rm -rf "$backup_dir"
  else
    copy_latest_backup_set "$LATEST_BACKUP_BASE/all-apps" "$backup_dir"
    echo "  Retention: ${FULL_BACKUP_RETENTION_DAYS} days in $(to_win_path "$BACKUP_BASE")"
    remove_old_dirs "$BACKUP_BASE" "????-??-??_??????" "$FULL_BACKUP_RETENTION_DAYS"
    echo "  To restore: ./manage.sh restore $timestamp"
  fi
  echo ""
}

cmd_restore() {
  print_banner "Tax Apps - Restore"

  if [[ ! -d "$BACKUP_BASE" ]]; then
    err "backups/ not found. Run: ./manage.sh backup"
    return 1
  fi

  backup_dir=""

  if [[ -n "${1:-}" ]]; then
    if [[ -d "$BACKUP_BASE/$1" ]]; then
      backup_dir="$BACKUP_BASE/$1"
    else
      err "$BACKUP_BASE/$1 not found."
      echo ""
    fi
  fi

  if [[ -z "$backup_dir" ]]; then
    local -a backups=()
    while IFS= read -r d; do
      backups+=("$d")
    done < <(ls -1r "$BACKUP_BASE" 2>/dev/null)

    if [[ ${#backups[@]} -eq 0 ]]; then
      err "No backups found. Run: ./manage.sh backup"
      return 1
    fi

    echo "Available backups:"
    echo ""
    for i in "${!backups[@]}"; do
      local bk="${backups[$i]}"
      local size
      size=$(format_size "$(dir_size "$BACKUP_BASE/$bk")")
      echo "  [$((i+1))] $bk  ($size)"
    done
    echo ""
    echo "  [0] Cancel"
    echo ""

    read -rp "Select number: " choice
    if [[ "$choice" == "0" || -z "$choice" ]]; then
      echo "Cancelled."
      return 0
    fi

    local idx=$((choice - 1))
    if [[ $idx -lt 0 || $idx -ge ${#backups[@]} ]]; then
      err "Invalid selection."
      return 1
    fi
    backup_dir="$BACKUP_BASE/${backups[$idx]}"
  fi

  echo "Restore from: $backup_dir/"
  echo ""
  echo "Contents:"
  ls -1 "$backup_dir" 2>/dev/null
  echo ""
  warn "This will overwrite current data!"
  echo ""
  read -rp "Proceed? (Y/N): " confirm
  if [[ "${confirm,,}" != "y" ]]; then
    echo "Cancelled."
    return 0
  fi
  echo ""

  restore_ok=0
  restore_fail=0
  restore_skip=0
  local step=0 total=$(( ${#PG_TARGETS[@]} + 1 + ${#BIND_TARGETS[@]} + ${#SETTINGS_TARGETS[@]} ))

  for target in "${PG_TARGETS[@]}"; do
    (( step++ )) || true
    IFS=: read -r label container pg_user db_name volume dump_file restart_hint <<< "$target"
    restore_postgres "[$step/$total] $label ..." "$container" "$pg_user" "$db_name" "$volume" "$dump_file" "$restart_hint"
  done

  (( step++ )) || true
  local -a sqlite_restore_pairs=()
  for target in "${SQLITE_TARGETS[@]}"; do
    local fname="${target##*:}"
    local vol="${target%%:*}"
    sqlite_restore_pairs+=("$fname.tar.gz:$vol")
  done
  restore_sqlite_volumes "[$step/$total]" "${sqlite_restore_pairs[@]}"

  for target in "${BIND_TARGETS[@]}"; do
    (( step++ )) || true
    IFS=: read -r label src_path backup_dirname <<< "$target"
    restore_bind_data "[$step/$total]" "$label" "$backup_dir/$backup_dirname" "$PROJECT_ROOT/$src_path"
  done

  for target in "${SETTINGS_TARGETS[@]}"; do
    (( step++ )) || true
    IFS=: read -r label src_path backup_filename <<< "$target"
    restore_settings_file "[$step/$total]" "$label" "$backup_dir/$backup_filename" "$PROJECT_ROOT/$src_path"
  done

  print_summary_banner "Restore Complete" "$restore_fail"
  echo "  Source: $backup_dir/"
  echo "  OK: $restore_ok  Skipped: $restore_skip  Failed: $restore_fail"
  echo ""
  if [[ $restore_ok -gt 0 ]]; then
    echo "  [NOTE] Restart apps to apply restored data:"
    echo "    ./manage.sh restart inheritance-case-management"
    echo "    ./manage.sh restart bank-analyzer-django"
    echo ""
  fi
}

log_file_ok() {
  local path="$1"
  local name="$2"
  local size=0
  if [[ -f "$path" ]]; then
    size=$(wc -c < "$path" | tr -d ' ')
  fi
  echo "  OK: ${size} bytes -> $name"
}

remove_old_files() {
  local dir="$1"
  local pattern="$2"
  local retention_days="${3:-7}"
  [[ -d "$dir" ]] || return 0
  find "$dir" -maxdepth 1 -name "$pattern" -type f -mtime +"$((retention_days - 1))" -print -delete 2>/dev/null |
    while IFS= read -r file; do
      echo "  Deleting: $(basename "$file")"
    done
}

remove_old_dirs() {
  local dir="$1"
  local pattern="$2"
  local retention_days="${3:-7}"
  [[ -d "$dir" ]] || return 0
  find "$dir" -maxdepth 1 -name "$pattern" -type d -mtime +"$((retention_days - 1))" -print -exec rm -rf {} + 2>/dev/null |
    while IFS= read -r folder; do
      echo "  Deleting: $(basename "$folder")"
    done
}

copy_xlsx_templates() {
  local src="$1"
  local dest="$2"
  mkdir -p "$dest"
  find "$src" -maxdepth 1 -type f -name '*.xlsx' -exec cp -p {} "$dest/" \;
}

cmd_itcm_backup() {
  local retention_days="${RETENTION_DAYS:-7}"
  local stamp
  stamp="$(date +"%Y%m%d_%H%M%S")"
  local errors=0
  local -a latest_itcm_db_sources=()
  local -a latest_json_sources=()
  local -a latest_bank_analyzer_sources=()
  local -a latest_medical_stock_sources=()
  local -a latest_template_sources=()
  local -a latest_app_sources=()

  echo "============================================================"
  echo " Data Backup - $(date)"
  echo "============================================================"
  echo

  local pg1_container="itcm-postgres"
  local pg1_user="postgres"
  local pg1_db="inheritance_tax_db"
  local pg1_volume="inheritance-case-management_postgres_data"
  local pg1_dir="$BACKUP_BASE/itcm-db"
  local pg1_file="itcm-db_${stamp}.sql"
  local pg1_dump_file="itcm-db_${stamp}.dump"
  local pg1_globals_file="itcm-globals_${stamp}.sql"
  local pg1_volume_file="itcm-postgres-volume_${stamp}.tar.gz"

  echo "[1/6] ITCM PostgreSQL"
  mkdir -p "$pg1_dir"

  if ! is_container_running "$pg1_container"; then
    echo "  [SKIP] Container $pg1_container is not running."
    if ! docker volume inspect "$pg1_volume" >/dev/null 2>&1; then
      echo "  [WARN] Volume $pg1_volume was not found."
      (( errors++ )) || true
    else
      echo "  [INFO] Backing up stopped PostgreSQL volume as fallback."
      local pg1_dir_win
      pg1_dir_win="$(to_win_path "$pg1_dir")"
      if MSYS_NO_PATHCONV=1 docker run --rm -v "$pg1_volume:/data" -v "$pg1_dir_win:/backup" alpine tar czf "/backup/$pg1_volume_file" -C /data .; then
        log_file_ok "$pg1_dir/$pg1_volume_file" "$pg1_volume_file"
        latest_itcm_db_sources+=("$pg1_dir/$pg1_volume_file")
      else
        echo "  [ERROR] PostgreSQL volume backup failed."
        (( errors++ )) || true
      fi
    fi
  else
    if docker exec "$pg1_container" pg_dump -U "$pg1_user" -d "$pg1_db" --clean --if-exists > "$pg1_dir/$pg1_file"; then
      log_file_ok "$pg1_dir/$pg1_file" "$pg1_file"
      latest_itcm_db_sources+=("$pg1_dir/$pg1_file")
    else
      echo "  [ERROR] plain pg_dump failed."
      rm -f "$pg1_dir/$pg1_file"
      (( errors++ )) || true
    fi

    if docker exec "$pg1_container" pg_dump -U "$pg1_user" -d "$pg1_db" --clean --if-exists -Fc > "$pg1_dir/$pg1_dump_file"; then
      log_file_ok "$pg1_dir/$pg1_dump_file" "$pg1_dump_file"
      latest_itcm_db_sources+=("$pg1_dir/$pg1_dump_file")
    else
      echo "  [ERROR] custom pg_dump failed."
      rm -f "$pg1_dir/$pg1_dump_file"
      (( errors++ )) || true
    fi

    if docker exec "$pg1_container" pg_dumpall -U "$pg1_user" --globals-only > "$pg1_dir/$pg1_globals_file"; then
      log_file_ok "$pg1_dir/$pg1_globals_file" "$pg1_globals_file"
      latest_itcm_db_sources+=("$pg1_dir/$pg1_globals_file")
    else
      echo "  [ERROR] globals dump failed."
      rm -f "$pg1_dir/$pg1_globals_file"
      (( errors++ )) || true
    fi
  fi
  remove_old_files "$pg1_dir" "itcm-db_*.sql" "$retention_days"
  remove_old_files "$pg1_dir" "itcm-db_*.dump" "$retention_days"
  remove_old_files "$pg1_dir" "itcm-globals_*.sql" "$retention_days"
  remove_old_files "$pg1_dir" "itcm-postgres-volume_*.tar.gz" "$retention_days"
  echo

  local itcm_web_container="itcm-frontend"
  local json_dir="$BACKUP_BASE/itcm-json"
  local json_file="itcm-json_${stamp}.json"
  local json_url="http://127.0.0.1:3020/itcm/api/backup/"

  echo "[2/6] ITCM JSON Export"
  mkdir -p "$json_dir"

  if ! is_container_running "$itcm_web_container"; then
    echo "  [SKIP] Container $itcm_web_container is not running."
    (( errors++ )) || true
  else
    local json_ok=0
    if command -v curl.exe >/dev/null 2>&1; then
      curl.exe -fsSL "$json_url" -o "$json_dir/$json_file" >/dev/null 2>&1 && json_ok=1
    elif command -v curl >/dev/null 2>&1; then
      curl -fsSL "$json_url" -o "$json_dir/$json_file" >/dev/null 2>&1 && json_ok=1
    fi
    if [[ "$json_ok" == "0" ]] && command -v powershell.exe >/dev/null 2>&1; then
      local json_dir_win
      json_dir_win="$(to_win_path "$json_dir")"
      powershell.exe -NoProfile -Command "Invoke-WebRequest -UseBasicParsing -Uri '$json_url' -OutFile '$json_dir_win\\$json_file'" >/dev/null 2>&1 && json_ok=1
    fi
    if [[ "$json_ok" == "0" || ! -s "$json_dir/$json_file" ]]; then
      echo "  [ERROR] JSON export failed."
      rm -f "$json_dir/$json_file"
      (( errors++ )) || true
    else
      log_file_ok "$json_dir/$json_file" "$json_file"
      latest_json_sources+=("$json_dir/$json_file")
    fi
  fi
  remove_old_files "$json_dir" "itcm-json_*.json" "$retention_days"
  echo

  local pg2_container="bank-analyzer-postgres"
  local pg2_user="bankuser"
  local pg2_db="bank_analyzer"
  local pg2_dir="$BACKUP_BASE/bank-analyzer-db"
  local pg2_file="bank-analyzer-db_${stamp}.sql"

  echo "[3/6] Bank Analyzer PostgreSQL"
  mkdir -p "$pg2_dir"
  if ! is_container_running "$pg2_container"; then
    echo "  [SKIP] Container $pg2_container is not running."
    (( errors++ )) || true
  else
    if docker exec "$pg2_container" pg_dump -U "$pg2_user" -d "$pg2_db" --clean --if-exists > "$pg2_dir/$pg2_file"; then
      log_file_ok "$pg2_dir/$pg2_file" "$pg2_file"
      latest_bank_analyzer_sources+=("$pg2_dir/$pg2_file")
    else
      echo "  [ERROR] pg_dump failed."
      rm -f "$pg2_dir/$pg2_file"
      (( errors++ )) || true
    fi
  fi
  remove_old_files "$pg2_dir" "bank-analyzer-db_*.sql" "$retention_days"
  echo

  local sq1_container="medical-stock-valuation"
  local sq1_src="/app/data/doctor.db"
  local sq1_dir="$BACKUP_BASE/medical-stock-db"
  local sq1_file="medical-stock-db_${stamp}.db"

  echo "[4/6] Medical Stock SQLite"
  mkdir -p "$sq1_dir"
  if ! is_container_running "$sq1_container"; then
    echo "  [SKIP] Container $sq1_container is not running."
    (( errors++ )) || true
  else
    if docker cp "$sq1_container:$sq1_src" "$sq1_dir/$sq1_file"; then
      log_file_ok "$sq1_dir/$sq1_file" "$sq1_file"
      latest_medical_stock_sources+=("$sq1_dir/$sq1_file")
    else
      echo "  [ERROR] docker cp failed."
      rm -f "$sq1_dir/$sq1_file"
      (( errors++ )) || true
    fi
  fi
  remove_old_files "$sq1_dir" "medical-stock-db_*.db" "$retention_days"
  echo

  local tpl_src="$PROJECT_ROOT/apps/inheritance-case-management/templates"
  local tpl_dir="$BACKUP_BASE/itcm-templates"
  local tpl_folder="itcm-templates_${stamp}"
  local tpl_dest="$tpl_dir/$tpl_folder"

  echo "[5/6] ITCM Excel Templates"
  if ! find "$tpl_src" -maxdepth 1 -type f -name '*.xlsx' | grep -q .; then
    echo "  [SKIP] No .xlsx files found in templates folder."
  else
    copy_xlsx_templates "$tpl_src" "$tpl_dest"
    echo "  OK: Copied to $tpl_folder\\"
    latest_template_sources+=("$tpl_dest")
  fi
  remove_old_dirs "$tpl_dir" "itcm-templates_*" "$retention_days"
  echo

  local itcm_src="$PROJECT_ROOT/apps/inheritance-case-management"
  local itcm_dir="$BACKUP_BASE/itcm-app"
  local itcm_folder="itcm-app_${stamp}"
  local itcm_dest="$itcm_dir/$itcm_folder"

  echo "[6/6] ITCM App Restore Files"
  if [[ ! -d "$itcm_src" ]]; then
    echo "  [SKIP] ITCM app folder was not found."
    (( errors++ )) || true
  else
    mkdir -p "$itcm_dest/web/prisma"
    copy_xlsx_templates "$itcm_src/templates" "$itcm_dest/templates"
    cp -p "$itcm_src/web/prisma/schema.prisma" "$itcm_dest/web/prisma/schema.prisma" 2>/dev/null || (( errors++ )) || true
    cp -a "$itcm_src/web/prisma/migrations" "$itcm_dest/web/prisma/migrations" 2>/dev/null || (( errors++ )) || true
    cp -p "$itcm_src/docker-compose.yml" "$itcm_dest/docker-compose.yml" 2>/dev/null || (( errors++ )) || true
    cp -p "$itcm_src/docker-compose.prod.yml" "$itcm_dest/docker-compose.prod.yml" 2>/dev/null || (( errors++ )) || true
    [[ -f "$itcm_src/.env" ]] && cp -p "$itcm_src/.env" "$itcm_dest/.env"
    [[ -f "$itcm_src/.env.example" ]] && cp -p "$itcm_src/.env.example" "$itcm_dest/.env.example"
    {
      echo "backup_time=$(date)"
      echo "source=$itcm_src"
      echo "database_sql=$pg1_file"
      echo "database_custom=$pg1_dump_file"
      echo "json_export=$json_file"
    } > "$itcm_dest/manifest.txt"
    echo "  OK: Copied to $itcm_folder\\"
    latest_app_sources+=("$itcm_dest")
  fi
  remove_old_dirs "$itcm_dir" "itcm-app_*" "$retention_days"
  echo

  echo "[Latest Copy] Saving one-day copy outside repository"
  copy_latest_backup_set "$LATEST_BACKUP_BASE/itcm-daily/itcm-db" "${latest_itcm_db_sources[@]}"
  copy_latest_backup_set "$LATEST_BACKUP_BASE/itcm-daily/itcm-json" "${latest_json_sources[@]}"
  copy_latest_backup_set "$LATEST_BACKUP_BASE/itcm-daily/bank-analyzer-db" "${latest_bank_analyzer_sources[@]}"
  copy_latest_backup_set "$LATEST_BACKUP_BASE/itcm-daily/medical-stock-db" "${latest_medical_stock_sources[@]}"
  copy_latest_backup_set "$LATEST_BACKUP_BASE/itcm-daily/itcm-templates" "${latest_template_sources[@]}"
  copy_latest_backup_set "$LATEST_BACKUP_BASE/itcm-daily/itcm-app" "${latest_app_sources[@]}"
  echo

  if [[ "$errors" -eq 0 ]]; then
    echo "[OK] All backups completed successfully."
  else
    echo "[WARN] $errors backup(s) skipped or failed."
  fi
  echo "============================================================"
  return "$errors"
}

case "${1:-help}" in
  backup)  cmd_backup ;;
  restore) cmd_restore "${2:-}" ;;
  itcm)    cmd_itcm_backup ;;
  *)
    echo "Usage: $0 {backup|restore [dir]|itcm}"
    exit 1
    ;;
esac
