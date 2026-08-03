#!/usr/bin/env bash
# ============================================
# Tax Apps - Full Backup / Restore
# ============================================
# Main script for:
#   ./backup.sh backup
#   ./backup.sh restore [dir]
#   ./backup.sh verify <backup>
#   ./backup.sh drill [backup]
#   ./backup.sh itcm
#
# manage.sh delegates backup / restore here.
# ============================================

set -euo pipefail

bootstrap_path() {
  case ":$PATH:" in
    *":/usr/bin:"*) ;;
    *) PATH="/usr/local/bin:/usr/bin:/bin:$PATH" ;;
  esac

  local docker_bin="/c/Program Files/Docker/Docker/resources/bin"
  if [[ -d "$docker_bin" ]]; then
    case ":$PATH:" in
      *":$docker_bin:"*) ;;
      *) PATH="$PATH:$docker_bin" ;;
    esac
  fi
}

bootstrap_path

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCK_DIR="${TMPDIR:-/tmp}/tax-apps-docker-ops.lock"
LOCK_HELD=0
RESTORE_WORK_DIR=""
BACKUP_BASE="${BACKUP_BASE:-$SCRIPT_DIR/../backups}"
LATEST_BACKUP_BASE="${LATEST_BACKUP_BASE:-$(cd "$PROJECT_ROOT/.." && pwd)/tax_apps_backup_latest}"
LATEST_BACKUP_RETENTION_DAYS="${LATEST_BACKUP_RETENTION_DAYS:-1}"
FULL_BACKUP_RETENTION_DAYS="${FULL_BACKUP_RETENTION_DAYS:-${RETENTION_DAYS:-7}}"
BACKUP_KEY_FILE="${BACKUP_KEY_FILE:-$HOME/.tax-apps/backup.key}"
BACKUP_ENCRYPTION_ITERATIONS="${BACKUP_ENCRYPTION_ITERATIONS:-200000}"
DRILL_PG_IMAGE="${DRILL_PG_IMAGE:-postgres:16-alpine}"
DRILL_PG_CONTAINER="tax-apps-restore-drill"
DRILL_PG_STARTED=0

# label:container:pg_user:db_name:volume:dump_file:restart_hint
PG_TARGETS=(
  "ITCM PostgreSQL:itcm-postgres:postgres:inheritance_tax_db:inheritance-case-management_postgres_data:itcm-postgres:inheritance-case-management"
  "Bank Analyzer PostgreSQL:bank-analyzer-postgres:bankuser:bank_analyzer:bank-analyzer-postgres:bank-analyzer-postgres:bank-analyzer-django"
  "Private Banking PostgreSQL:private-banking-postgres:postgres:private_banking:private-banking_private_banking_postgres:private-banking-postgres:private-banking"
  "Stock Valuation Form PostgreSQL:svf-postgres:postgres:stock_valuation:stock-valuation-form-postgres:svf-postgres:stock-valuation-form"
)

# label:container:db_path:volume:file_name
SQLITE_TARGETS=(
  "Medical Stock SQLite:medical-stock-valuation:/app/data/doctor.db:medical-stock-valuation-data:medical-stock-valuation-data"
  "Insurance App SQLite:insurance-app:/app/data/insurance.sqlite:insurance-app-data:insurance-app-data"
  "Inheritance Tax Docs SQLite:inheritance-tax-docs:/app/data/resources.sqlite:inheritance-tax-docs-data:inheritance-tax-docs-data"
)

# label:source_path:backup_dir_name
BIND_TARGETS=(
  "bank-analyzer upload:apps/bank-analyzer-django/data:bank-analyzer-upload"
  # 見積書・請求書の Excel テンプレート。.gitignore 対象なので Git には無く、
  # バックアップから外すとディスク上の1コピーしか残らない。
  "ITCM Excel templates:apps/inheritance-case-management/templates:itcm-templates"
)

# label:source_path:backup_file_name
SETTINGS_TARGETS=(
  "ITCM .env:apps/inheritance-case-management/.env:itcm-.env"
  "Bank Analyzer .env:apps/bank-analyzer-django/.env:bank-analyzer-.env"
  # prod は POSTGRES_PASSWORD が必須(`:?`)なので、これが無いと本番が起動できない。
  "Private Banking .env:apps/private-banking/.env:private-banking-.env"
  "Stock Valuation Form .env:apps/stock-valuation-form/.env:stock-valuation-form-.env"
)

warn() { printf '\033[1;33m[WARN]\033[0m  %s\n' "$*"; }
err() { printf '\033[1;31m[ERROR]\033[0m %s\n' "$*" >&2; }
ok() { printf '\033[1;32m[OK]\033[0m    %s\n' "$*"; }

check_dependencies() {
  if ! command -v docker >/dev/null 2>&1; then
    err "docker command not found"
    exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    err "docker compose command not available"
    exit 1
  fi
}

release_operation_lock() {
  if [[ "$DRILL_PG_STARTED" -eq 1 ]]; then
    docker rm -f "$DRILL_PG_CONTAINER" >/dev/null 2>&1 || true
    DRILL_PG_STARTED=0
  fi
  if [[ -n "$RESTORE_WORK_DIR" && -d "$RESTORE_WORK_DIR" ]]; then
    rm -rf "$RESTORE_WORK_DIR"
    RESTORE_WORK_DIR=""
  fi
  if [[ "$LOCK_HELD" -eq 1 ]]; then
    rm -rf "$LOCK_DIR"
    LOCK_HELD=0
  fi
}

ensure_backup_encryption_key() {
  if ! command -v openssl >/dev/null 2>&1; then
    err "openssl is required for encrypted backups."
    return 1
  fi

  if [[ ! -s "$BACKUP_KEY_FILE" ]]; then
    local old_umask
    old_umask=$(umask)
    umask 077
    mkdir -p "$(dirname "$BACKUP_KEY_FILE")"
    openssl rand -base64 48 > "$BACKUP_KEY_FILE"
    chmod 600 "$BACKUP_KEY_FILE" 2>/dev/null || true
    umask "$old_umask"
    ok "Created backup key outside repository: $(to_win_path "$BACKUP_KEY_FILE")"
    warn "Store a secure offline copy of this key. Encrypted backups cannot be restored without it."
  fi

  if command -v powershell.exe >/dev/null 2>&1; then
    # PowerShell variables in this literal must not be expanded by Bash.
    # shellcheck disable=SC2016
    # ACL が既に期待どおりなら Set-Acl を呼ばない。
    # 継承を無効化(protected)したファイルへ再度 Set-Acl すると SACL の書き込みを
    # 伴い、非昇格プロセスでは SeSecurityPrivilege 不足で必ず失敗するため。
    TAX_APPS_BACKUP_KEY_PATH="$(to_win_path "$BACKUP_KEY_FILE")" powershell.exe -NoProfile -Command '
      $path = $env:TAX_APPS_BACKUP_KEY_PATH
      $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
      $wanted = @($identity.User.Value, "S-1-5-18", "S-1-5-32-544")

      $current = Get-Acl -LiteralPath $path
      $currentSids = @($current.Access | ForEach-Object {
        $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
      })
      $extra = @($currentSids | Where-Object { $wanted -notcontains $_ })
      $missing = @($wanted | Where-Object { $currentSids -notcontains $_ })
      if ($current.AreAccessRulesProtected -and $extra.Count -eq 0 -and $missing.Count -eq 0) {
        exit 0
      }

      $acl = [Security.AccessControl.FileSecurity]::new()
      $acl.SetOwner($identity.User)
      $acl.SetAccessRuleProtection($true, $false)
      foreach ($sidValue in $wanted) {
        $sid = [Security.Principal.SecurityIdentifier]::new($sidValue)
        $rule = [Security.AccessControl.FileSystemAccessRule]::new(
          $sid,
          [Security.AccessControl.FileSystemRights]::FullControl,
          [Security.AccessControl.AccessControlType]::Allow
        )
        [void]$acl.AddAccessRule($rule)
      }
      Set-Acl -LiteralPath $path -AclObject $acl
    ' >/dev/null 2>&1 || {
      # 鍵の権限強化に失敗してもバックアップ自体は継続する(警告のみ)。
      warn "Could not restrict Windows ACL on backup key: $BACKUP_KEY_FILE"
      warn "Check the file permissions manually. Backup continues."
    }
  fi
}

encrypt_backup_directory() {
  local source_dir="$1"
  local parent_dir base_name output_file temp_file
  parent_dir="$(dirname "$source_dir")"
  base_name="$(basename "$source_dir")"
  output_file="${source_dir}.tar.gz.enc"
  temp_file="${output_file}.tmp"

  ensure_backup_encryption_key || return 1
  local key_path
  key_path="$(to_win_path "$BACKUP_KEY_FILE")"
  rm -f "$temp_file"
  if ! tar czf - -C "$parent_dir" "$base_name" |
    openssl enc -aes-256-cbc -salt -pbkdf2 -iter "$BACKUP_ENCRYPTION_ITERATIONS" \
      -md sha256 -pass "file:$key_path" -out "$temp_file"; then
    rm -f "$temp_file"
    err "Backup encryption failed. Plain backup was retained."
    return 1
  fi

  if ! openssl enc -d -aes-256-cbc -pbkdf2 -iter "$BACKUP_ENCRYPTION_ITERATIONS" \
    -md sha256 -pass "file:$key_path" -in "$temp_file" |
    tar tzf - >/dev/null; then
    rm -f "$temp_file"
    err "Encrypted backup verification failed. Plain backup was retained."
    return 1
  fi

  mv "$temp_file" "$output_file"
  rm -rf "$source_dir"
  ENCRYPTED_BACKUP_PATH="$output_file"
  ok "Encrypted backup: $(basename "$output_file")"
}

extract_encrypted_backup() {
  local archive="$1"
  ensure_backup_encryption_key || return 1
  RESTORE_WORK_DIR="$(mktemp -d "$BACKUP_BASE/.restore-work.XXXXXX")"
  local key_path
  key_path="$(to_win_path "$BACKUP_KEY_FILE")"

  if ! openssl enc -d -aes-256-cbc -pbkdf2 -iter "$BACKUP_ENCRYPTION_ITERATIONS" \
    -md sha256 -pass "file:$key_path" -in "$archive" |
    tar xzf - -C "$RESTORE_WORK_DIR"; then
    err "Could not decrypt backup. Check BACKUP_KEY_FILE."
    rm -rf "$RESTORE_WORK_DIR"
    RESTORE_WORK_DIR=""
    return 1
  fi

  local archive_name
  archive_name="$(basename "$archive" .tar.gz.enc)"
  if [[ ! -d "$RESTORE_WORK_DIR/$archive_name" ]]; then
    err "Encrypted backup did not contain the expected directory."
    return 1
  fi
  EXTRACTED_BACKUP_PATH="$RESTORE_WORK_DIR/$archive_name"
}

acquire_operation_lock() {
  local action="${1:-backup}"
  local owner_pid=""

  if [[ -f "$LOCK_DIR/owner" ]]; then
    owner_pid="$(sed -n 's/^pid=//p' "$LOCK_DIR/owner" | head -1)"
  fi

  if [[ -n "$owner_pid" ]] && ! kill -0 "$owner_pid" 2>/dev/null; then
    warn "Removing stale operation lock: $LOCK_DIR"
    rm -rf "$LOCK_DIR"
  fi

  if mkdir "$LOCK_DIR" 2>/dev/null; then
    LOCK_HELD=1
    {
      echo "pid=$$"
      echo "action=$action"
      echo "started_at=$(date -Is 2>/dev/null || date)"
      echo "script=$0"
    } > "$LOCK_DIR/owner"
    trap release_operation_lock EXIT INT TERM
    return 0
  fi

  err "Another Tax Apps Docker operation is already running."
  if [[ -f "$LOCK_DIR/owner" ]]; then
    sed 's/^/  /' "$LOCK_DIR/owner" >&2 || true
  else
    err "Lock directory: $LOCK_DIR"
  fi
  return 1
}

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

path_size() {
  local path="$1"
  if [[ -f "$path" ]]; then
    wc -c < "$path" | tr -d ' '
  else
    dir_size "$path"
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

strip_cr() {
  printf '%s' "${1//$'\r'/}"
}

is_full_backup_name() {
  local name="${1%.tar.gz.enc}"
  [[ "$name" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{6}$ || "$name" =~ ^pre-restore_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{6}$ ]]
}

print_summary_banner() {
  local title="$1" fail_count="$2"
  if [[ $fail_count -gt 0 ]]; then
    print_banner "$title (with errors)"
  else
    print_banner "$title"
  fi
}

write_backup_manifest() {
  local manifest="$backup_dir/manifest.sha256"

  if ! command -v sha256sum >/dev/null 2>&1; then
    warn "sha256sum not found; backup integrity manifest was skipped."
    return 0
  fi

  (
    cd "$backup_dir"
    find . -type f ! -name 'manifest.sha256' -print0 |
      sort -z |
      while IFS= read -r -d '' file; do
        sha256sum "$file"
      done
  ) > "$manifest"
  ok "manifest.sha256"
}

verify_backup_manifest() {
  local dir="$1"
  local manifest="$dir/manifest.sha256"

  if [[ ! -f "$manifest" ]]; then
    warn "No manifest.sha256 found; legacy backup integrity check skipped."
    return 0
  fi

  if (
    cd "$dir"
    sha256sum -c manifest.sha256 >/dev/null
  ); then
    ok "Backup integrity check passed"
    return 0
  fi

  err "Backup integrity check failed. Restore aborted."
  return 1
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
  for target in "$@"; do
    local label container db_path vol fname
    IFS=: read -r label container db_path vol fname <<< "$target"
    if docker volume inspect "$vol" >/dev/null 2>&1; then
      if is_container_running "$container"; then
        local stage_dir="$backup_dir/.sqlite-stage-${fname}"
        local raw_archive="$backup_dir/.sqlite-raw-${fname}.tar.gz"
        local temp_db="/tmp/tax-apps-backup-${fname}-$$.sqlite"
        rm -rf "$stage_dir" "$raw_archive"
        mkdir -p "$stage_dir"

        if ! MSYS_NO_PATHCONV=1 docker exec "$container" node -e '
          const Database = require("better-sqlite3");
          const [source, destination] = process.argv.slice(1);
          const db = new Database(source, { readonly: true, fileMustExist: true });
          db.backup(destination).then(() => {
            db.close();
            const copy = new Database(destination, { readonly: true, fileMustExist: true });
            const result = copy.pragma("integrity_check", { simple: true });
            copy.close();
            if (result !== "ok") throw new Error(`integrity_check: ${result}`);
          }).catch((error) => { console.error(error); process.exitCode = 1; });
        ' "$db_path" "$temp_db" >/dev/null 2>&1; then
          err "$label online backup failed"
          MSYS_NO_PATHCONV=1 docker exec "$container" rm -f "$temp_db" "$temp_db-wal" "$temp_db-shm" >/dev/null 2>&1 || true
          rm -rf "$stage_dir" "$raw_archive"
          (( backup_fail++ )) || true
          continue
        fi

        if ! MSYS_NO_PATHCONV=1 docker run --rm -v "$vol:/data:ro" -v "$backup_dir_win:/backup" \
          alpine:3.22 tar czf "/backup/$(basename "$raw_archive")" -C /data . >/dev/null 2>&1; then
          err "$label volume data copy failed"
          MSYS_NO_PATHCONV=1 docker exec "$container" rm -f "$temp_db" "$temp_db-wal" "$temp_db-shm" >/dev/null 2>&1 || true
          rm -rf "$stage_dir" "$raw_archive"
          (( backup_fail++ )) || true
          continue
        fi

        tar xzf "$raw_archive" -C "$stage_dir"
        local db_name
        db_name="$(basename "$db_path")"
        rm -f "$stage_dir/$db_name" "$stage_dir/$db_name-wal" "$stage_dir/$db_name-shm"
        if ! docker cp "$container:$temp_db" "$stage_dir/$db_name" >/dev/null 2>&1; then
          err "$label database copy failed"
          MSYS_NO_PATHCONV=1 docker exec "$container" rm -f "$temp_db" "$temp_db-wal" "$temp_db-shm" >/dev/null 2>&1 || true
          rm -rf "$stage_dir" "$raw_archive"
          (( backup_fail++ )) || true
          continue
        fi
        MSYS_NO_PATHCONV=1 docker exec "$container" rm -f "$temp_db" "$temp_db-wal" "$temp_db-shm" >/dev/null 2>&1 || true
        tar czf "$backup_dir/${fname}.tar.gz" -C "$stage_dir" .
        rm -rf "$stage_dir" "$raw_archive"
        (( sqlite_ok++ )) || true
      elif MSYS_NO_PATHCONV=1 docker run --rm -v "$vol:/data:ro" -v "$backup_dir_win:/backup" \
        alpine:3.22 tar czf "/backup/${fname}.tar.gz" -C /data . >/dev/null 2>&1; then
        (( sqlite_ok++ )) || true
      else
        err "$label backup failed"
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
    local fname vol container
    IFS=: read -r fname vol container <<< "$pair"
    if [[ -f "$backup_dir/$fname" ]]; then
      local was_running=0
      if is_container_running "$container"; then
        echo "  Stopping $container for consistent volume restore..."
        docker stop "$container" >/dev/null
        was_running=1
      fi
      docker volume inspect "$vol" >/dev/null 2>&1 || docker volume create "$vol" >/dev/null 2>&1
      if MSYS_NO_PATHCONV=1 docker run --rm -v "$vol:/data" -v "$backup_dir_win:/backup:ro" alpine:3.22 \
        sh -c "rm -rf -- /data/* /data/.[!.]* /data/..?* && tar xzf /backup/$fname -C /data" >/dev/null 2>&1; then
        (( sqlite_ok++ )) || true
      else
        (( restore_fail++ )) || true
      fi
      if [[ $was_running -eq 1 ]]; then
        docker start "$container" >/dev/null || {
          err "Failed to restart $container after restore"
          (( restore_fail++ )) || true
        }
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
  local temp_dir
  temp_dir="/tmp/bank-analyzer-json-$(basename "$backup_dir")"

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
  local backup_label="${1:-}"
  if [[ -n "$backup_label" ]]; then
    print_banner "Tax Apps - Backup ($backup_label)"
  else
    print_banner "Tax Apps - Backup"
  fi

  local timestamp
  timestamp=$(date +"%Y-%m-%d_%H%M%S")
  local backup_name="$timestamp"
  if [[ -n "$backup_label" ]]; then
    backup_name="${backup_label}_${timestamp}"
  fi
  backup_dir="$BACKUP_BASE/$backup_name"
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

  if [[ $backup_ok -gt 0 ]]; then
    write_backup_manifest
    if ! encrypt_backup_directory "$backup_dir"; then
      (( backup_fail++ )) || true
      print_summary_banner "Backup Failed" "$backup_fail"
      echo "  Plain backup retained for recovery: $backup_dir/"
      return 1
    fi
    backup_dir="$ENCRYPTED_BACKUP_PATH"
  fi

  print_summary_banner "Backup Complete" "$backup_fail"
  echo "  Destination: $backup_dir"
  echo "  Size: $(format_size "$(path_size "$backup_dir")")"
  echo "  OK: $backup_ok  Skipped: $backup_skip  Failed: $backup_fail"
  echo ""
  if [[ $backup_ok -eq 0 ]]; then
    warn "No data was backed up. Removing empty directory."
    rm -rf "$backup_dir"
    return 1
  elif [[ $backup_fail -gt 0 ]]; then
    warn "Incomplete encrypted backup was not promoted to the latest-backup directory."
    echo "  Resolve the errors and run the backup again."
  else
    copy_latest_backup_set "$LATEST_BACKUP_BASE/all-apps" "$backup_dir"
    if [[ "$backup_label" == "pre-restore" ]]; then
      echo "  Retention cleanup skipped during pre-restore safety backup."
    else
      echo "  Retention: ${FULL_BACKUP_RETENTION_DAYS} days in $(to_win_path "$BACKUP_BASE")"
      remove_old_dirs "$BACKUP_BASE" "????-??-??_??????" "$FULL_BACKUP_RETENTION_DAYS"
      remove_old_dirs "$BACKUP_BASE" "pre-restore_????-??-??_??????" "$FULL_BACKUP_RETENTION_DAYS"
      remove_old_files "$BACKUP_BASE" "????-??-??_??????.tar.gz.enc" "$FULL_BACKUP_RETENTION_DAYS"
      remove_old_files "$BACKUP_BASE" "pre-restore_????-??-??_??????.tar.gz.enc" "$FULL_BACKUP_RETENTION_DAYS"
    fi
    echo "  To restore: ./manage.sh restore $(basename "$backup_dir")"
  fi
  echo ""

  [[ $backup_fail -eq 0 ]]
}

cmd_restore() {
  print_banner "Tax Apps - Restore"

  if [[ ! -d "$BACKUP_BASE" ]]; then
    err "backups/ not found. Run: ./manage.sh backup"
    return 1
  fi

  backup_dir=""

  if [[ -n "${1:-}" ]]; then
    if ! is_full_backup_name "$1"; then
      err "$1 is not a full backup set."
      echo "  Use a directory like 2026-02-22_153000 or pre-restore_2026-02-22_153000."
      echo ""
    elif [[ -d "$BACKUP_BASE/$1" || -f "$BACKUP_BASE/$1" ]]; then
      backup_dir="$BACKUP_BASE/$1"
    elif [[ -f "$BACKUP_BASE/$1.tar.gz.enc" ]]; then
      backup_dir="$BACKUP_BASE/$1.tar.gz.enc"
    else
      err "$BACKUP_BASE/$1 not found."
      echo ""
    fi
  fi

  if [[ -z "$backup_dir" ]]; then
    local -a backups=()
    while IFS= read -r d; do
      backups+=("$(basename "$d")")
    done < <(find "$BACKUP_BASE" -mindepth 1 -maxdepth 1 \
      \( -type d \( -name '????-??-??_??????' -o -name 'pre-restore_????-??-??_??????' \) \
      -o -type f \( -name '????-??-??_??????.tar.gz.enc' -o -name 'pre-restore_????-??-??_??????.tar.gz.enc' \) \) \
      -print 2>/dev/null | sort -r)

    if [[ ${#backups[@]} -eq 0 ]]; then
      err "No backups found. Run: ./manage.sh backup"
      return 1
    fi

    echo "Available backups:"
    echo ""
    for i in "${!backups[@]}"; do
      local bk="${backups[$i]}"
      local size
      size=$(format_size "$(path_size "$BACKUP_BASE/$bk")")
      echo "  [$((i+1))] $bk  ($size)"
    done
    echo ""
    echo "  [0] Cancel"
    echo ""

    read -rp "Select number: " choice
    choice=$(strip_cr "$choice")
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

  echo "Restore from: $backup_dir"
  echo ""

  if [[ -f "$backup_dir" && "$backup_dir" == *.tar.gz.enc ]]; then
    echo "Decrypting backup to a temporary restore directory..."
    extract_encrypted_backup "$backup_dir" || return 1
    backup_dir="$EXTRACTED_BACKUP_PATH"
    ok "Encrypted backup opened"
  fi

  verify_backup_manifest "$backup_dir" || return 1
  echo ""
  echo "Contents:"
  ls -1 "$backup_dir" 2>/dev/null
  echo ""
  warn "This will overwrite current data!"
  echo ""
  read -rp "Proceed? (Y/N): " confirm
  confirm=$(strip_cr "$confirm")
  if [[ "${confirm,,}" != "y" ]]; then
    echo "Cancelled."
    return 0
  fi
  echo ""

  local restore_source="$backup_dir"
  echo "[Safety] Creating pre-restore backup of current data..."
  if cmd_backup "pre-restore"; then
    local pre_restore_backup="$backup_dir"
    backup_dir="$restore_source"
    ok "Pre-restore backup completed: $pre_restore_backup"
  elif [[ ${backup_fail:-0} -eq 0 && ${backup_ok:-0} -eq 0 ]]; then
    backup_dir="$restore_source"
    warn "No current data was found for pre-restore backup. Continuing restore."
  else
    backup_dir="$restore_source"
    err "Pre-restore backup failed. Restore aborted."
    echo "  Current data was not overwritten."
    return 1
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
    local _label _container _db_path vol fname
    IFS=: read -r _label _container _db_path vol fname <<< "$target"
    sqlite_restore_pairs+=("$fname.tar.gz:$vol:$_container")
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
    echo "    ./manage.sh restart private-banking"
    echo ""
  fi
}

cmd_verify() {
  local requested="${1:-}"
  if [[ -z "$requested" ]]; then
    err "Specify an encrypted backup file."
    echo "  Usage: $0 verify YYYY-MM-DD_HHMMSS.tar.gz.enc"
    return 1
  fi

  local archive="$requested"
  [[ -f "$archive" ]] || archive="$BACKUP_BASE/$requested"
  if [[ ! -f "$archive" || "$archive" != *.tar.gz.enc ]]; then
    err "Encrypted backup not found: $requested"
    return 1
  fi

  print_banner "Tax Apps - Backup Verification"
  extract_encrypted_backup "$archive" || return 1
  verify_backup_manifest "$EXTRACTED_BACKUP_PATH" || return 1
  ok "Encrypted backup is restorable: $(basename "$archive")"
}

# ------------------------------------------------------------
# Restore drill
# ------------------------------------------------------------
# verify はアーカイブが展開でき、ハッシュが一致することまでしか見ない。
# ダンプが「本当にリストアできるSQLか」は別問題なので、使い捨ての
# PostgreSQL コンテナへ実際に流し込んで確かめる。
#
# 稼働中のDBには一切触れない:
#   - ドリル用コンテナは tax-apps-network に繋がず、ポートも公開しない
#   - SQLite は復元したコピーを /tmp で readonly で開くだけ

start_drill_postgres() {
  docker rm -f "$DRILL_PG_CONTAINER" >/dev/null 2>&1 || true

  if ! MSYS_NO_PATHCONV=1 docker run -d \
    --name "$DRILL_PG_CONTAINER" \
    -e POSTGRES_PASSWORD=restore-drill \
    "$DRILL_PG_IMAGE" >/dev/null 2>&1; then
    err "Could not start the drill container ($DRILL_PG_IMAGE)."
    return 1
  fi
  DRILL_PG_STARTED=1

  local i
  for i in $(seq 1 60); do
    if docker exec "$DRILL_PG_CONTAINER" pg_isready -U postgres -q >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  err "Drill container did not become ready within 60s."
  return 1
}

stop_drill_postgres() {
  if [[ "$DRILL_PG_STARTED" -eq 1 ]]; then
    docker rm -f "$DRILL_PG_CONTAINER" >/dev/null 2>&1 || true
    DRILL_PG_STARTED=0
  fi
}

drill_postgres() {
  local dir="$1"
  echo "[Drill 1/2] PostgreSQL dumps ..."

  local -a entries=()
  local target
  for target in "${PG_TARGETS[@]}"; do
    local label pg_user db_name dump_file _container _volume _hint
    IFS=: read -r label _container pg_user db_name _volume dump_file _hint <<< "$target"
    if [[ -f "$dir/$dump_file.sql" ]]; then
      entries+=("$label:$pg_user:$db_name:$dump_file")
    else
      warn "$label: no .sql dump in this backup (volume fallback is not drilled)"
      (( drill_skip++ )) || true
    fi
  done

  if [[ ${#entries[@]} -eq 0 ]]; then
    warn "No PostgreSQL dumps to drill."
    return 0
  fi

  start_drill_postgres || return 1

  local entry
  for entry in "${entries[@]}"; do
    local label pg_user db_name dump_file
    IFS=: read -r label pg_user db_name dump_file <<< "$entry"

    # ダンプ内の OWNER TO / GRANT を通すためロールを先に作る(既存なら無視)。
    if [[ "$pg_user" != "postgres" ]]; then
      docker exec "$DRILL_PG_CONTAINER" psql -U postgres -d postgres -q \
        -c "CREATE ROLE \"$pg_user\" LOGIN SUPERUSER;" >/dev/null 2>&1 || true
    fi
    docker exec "$DRILL_PG_CONTAINER" psql -U postgres -d postgres -q \
      -c "DROP DATABASE IF EXISTS \"$db_name\";" >/dev/null 2>&1 || true
    if ! docker exec "$DRILL_PG_CONTAINER" psql -U postgres -d postgres -q \
      -c "CREATE DATABASE \"$db_name\";" >/dev/null 2>&1; then
      err "$label: could not create the drill database."
      (( drill_fail++ )) || true
      continue
    fi

    # ON_ERROR_STOP=1 が無いと psql は途中のエラーを無視して 0 を返す。
    local psql_log="$RESTORE_WORK_DIR/drill-$dump_file.log"
    if ! docker exec -i "$DRILL_PG_CONTAINER" \
      psql -U postgres -d "$db_name" -q -v ON_ERROR_STOP=1 \
      < "$dir/$dump_file.sql" > "$psql_log" 2>&1; then
      err "$label: restore failed"
      sed 's/^/    /' "$psql_log" | tail -5
      (( drill_fail++ )) || true
      continue
    fi

    local table_count
    table_count=$(docker exec "$DRILL_PG_CONTAINER" psql -U postgres -d "$db_name" -tAc \
      "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname = 'public';" 2>/dev/null | tr -d '\r\n ')
    if [[ "${table_count:-0}" -gt 0 ]]; then
      local row_total
      row_total=$(docker exec "$DRILL_PG_CONTAINER" psql -U postgres -d "$db_name" -tAc \
        "SELECT coalesce(sum(n_live_tup), 0) FROM pg_stat_user_tables;" 2>/dev/null | tr -d '\r\n ')
      ok "$label restored ($table_count tables, ${row_total:-?} rows)"
      (( drill_ok++ )) || true
    else
      err "$label: restore reported success but no tables exist."
      (( drill_fail++ )) || true
    fi
  done

  stop_drill_postgres
}

drill_sqlite() {
  local dir="$1"
  echo "[Drill 2/2] SQLite databases ..."

  local target
  for target in "${SQLITE_TARGETS[@]}"; do
    local label container db_path fname _volume
    IFS=: read -r label container db_path _volume fname <<< "$target"
    local archive="$dir/$fname.tar.gz"

    if [[ ! -f "$archive" ]]; then
      warn "$label: not in this backup"
      (( drill_skip++ )) || true
      continue
    fi
    # better-sqlite3 はアプリイメージにしか無いので、稼働中のコンテナを借りる。
    if ! is_container_running "$container"; then
      warn "$label: skipped ($container is not running)"
      (( drill_skip++ )) || true
      continue
    fi

    local stage="$RESTORE_WORK_DIR/drill-$fname"
    rm -rf "$stage"
    mkdir -p "$stage"
    if ! tar xzf "$archive" -C "$stage" 2>/dev/null; then
      err "$label: could not extract $fname.tar.gz"
      (( drill_fail++ )) || true
      continue
    fi

    local db_name
    db_name="$(basename "$db_path")"
    if [[ ! -f "$stage/$db_name" ]]; then
      err "$label: $db_name is missing from the archive"
      (( drill_fail++ )) || true
      continue
    fi

    # 本番データには触れない。/tmp のコピーを readonly で開くだけ。
    # コンテナ側のパスを MSYS に変換させないため MSYS_NO_PATHCONV=1 が要るが、
    # そうするとホスト側の POSIX パスも素通しになるので docker.exe が読める形へ直す。
    local probe="/tmp/tax-apps-drill-${fname}-$$.sqlite"
    local stage_db_win
    stage_db_win="$(to_win_path "$stage/$db_name")"
    if ! MSYS_NO_PATHCONV=1 docker cp "$stage_db_win" "$container:$probe" >/dev/null 2>&1; then
      err "$label: could not copy the restored database into $container"
      (( drill_fail++ )) || true
      continue
    fi

    local probe_out=""
    if probe_out=$(MSYS_NO_PATHCONV=1 docker exec "$container" node -e '
      const Database = require("better-sqlite3");
      const db = new Database(process.argv[1], { readonly: true, fileMustExist: true });
      const integrity = db.pragma("integrity_check", { simple: true });
      const tables = db.prepare(
        "SELECT count(*) AS n FROM sqlite_master WHERE type = \x27table\x27 AND name NOT LIKE \x27sqlite_%\x27"
      ).get().n;
      db.close();
      if (integrity !== "ok") throw new Error(`integrity_check: ${integrity}`);
      if (tables === 0) throw new Error("restored database has no tables");
      process.stdout.write(String(tables));
    ' "$probe" 2>/dev/null); then
      ok "$label restored ($(echo "$probe_out" | tr -d '\r\n ') tables, integrity ok)"
      (( drill_ok++ )) || true
    else
      err "$label: restored database failed verification"
      (( drill_fail++ )) || true
    fi
    # docker cp で入れたファイルは root 所有になる。非rootで動くコンテナ
    # (medical-stock-valuation 等) では -u root が無いと消せず、毎回の訓練で
    # DBのフルコピーが /tmp に溜まっていく。readonly で開いても WAL/SHM は
    # 作られるので一緒に消す。
    if ! MSYS_NO_PATHCONV=1 docker exec -u root "$container" \
      rm -f "$probe" "$probe-wal" "$probe-shm" >/dev/null 2>&1; then
      warn "$label: could not remove the drill copy from $container:$probe"
    fi
    rm -rf "$stage"
  done
}

cmd_drill() {
  print_banner "Tax Apps - Restore Drill"

  local requested="${1:-}"
  local archive=""
  if [[ -n "$requested" ]]; then
    archive="$requested"
    [[ -f "$archive" ]] || archive="$BACKUP_BASE/$requested"
    [[ -f "$archive" ]] || archive="$BACKUP_BASE/$requested.tar.gz.enc"
  else
    archive=$(find "$BACKUP_BASE" -maxdepth 1 -type f -name '????-??-??_??????.tar.gz.enc' \
      -print 2>/dev/null | sort | tail -1)
    if [[ -z "$archive" ]]; then
      err "No encrypted backup found. Run: ./manage.sh backup"
      return 1
    fi
  fi

  if [[ ! -f "$archive" || "$archive" != *.tar.gz.enc ]]; then
    err "Encrypted backup not found: $requested"
    return 1
  fi

  echo "Target: $(basename "$archive")"
  echo ""

  extract_encrypted_backup "$archive" || return 1
  verify_backup_manifest "$EXTRACTED_BACKUP_PATH" || return 1
  echo ""

  drill_ok=0
  drill_fail=0
  drill_skip=0

  drill_postgres "$EXTRACTED_BACKUP_PATH" || { (( drill_fail++ )) || true; }
  stop_drill_postgres
  echo ""
  drill_sqlite "$EXTRACTED_BACKUP_PATH"
  echo ""

  print_summary_banner "Restore Drill Complete" "$drill_fail"
  echo "  Backup: $(basename "$archive")"
  echo "  OK: $drill_ok  Skipped: $drill_skip  Failed: $drill_fail"
  echo ""
  if [[ $drill_fail -gt 0 ]]; then
    err "This backup is NOT safely restorable. Investigate before relying on it."
    echo ""
    return 1
  fi
  ok "All drilled databases restored cleanly."
  echo ""
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

COMMAND="${1:-help}"
case "$COMMAND" in
  backup|restore|verify|drill|itcm)
    check_dependencies
    acquire_operation_lock "$COMMAND"
    ;;
esac

case "$COMMAND" in
  backup)  cmd_backup ;;
  restore) cmd_restore "${2:-}" ;;
  verify)  cmd_verify "${2:-}" ;;
  drill)   cmd_drill "${2:-}" ;;
  # Keep the historical command name used by backup-db.bat, but create the
  # same encrypted, restorable full backup as the main backup command.
  itcm)    cmd_backup ;;
  *)
    echo "Usage: $0 {backup|restore [backup]|verify <backup>|drill [backup]|itcm}"
    exit 1
    ;;
esac
