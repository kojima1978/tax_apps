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

# ログ出力・操作ロック・直近結果の記録は manage.sh と共有する。
# 別実装にしておくと静かにズレる（実際、ロックの待ち方がズレていたせいで
# 週次のリストア訓練が2週続けて丸ごと飛んでいた）ので実体は1箇所に置く。
if [[ ! -f "$SCRIPT_DIR/lib/ops-common.sh" ]]; then
  echo "[ERROR] lib/ops-common.sh が見つかりません: $SCRIPT_DIR/lib/ops-common.sh" >&2
  exit 1
fi
# shellcheck source=lib/ops-common.sh
source "$SCRIPT_DIR/lib/ops-common.sh"

RESTORE_WORK_DIR=""
STALE_WORK_SWEPT=0
# リストアで止めたコンテナ（終わったら・途中で死んでも起動し直す）
RESTORE_STOPPED=()
BACKUP_BASE="${BACKUP_BASE:-$SCRIPT_DIR/../backups}"
LATEST_BACKUP_BASE="${LATEST_BACKUP_BASE:-$(cd "$PROJECT_ROOT/.." && pwd)/tax_apps_backup_latest}"
LATEST_BACKUP_RETENTION_DAYS="${LATEST_BACKUP_RETENTION_DAYS:-1}"
FULL_BACKUP_RETENTION_DAYS="${FULL_BACKUP_RETENTION_DAYS:-${RETENTION_DAYS:-7}}"

# 世代保持（GFS）。日次7本だけでは「7日以内に気づけた障害」しか戻せない。
# 静かに壊れるもの（取り込みミス、誤削除、DBの論理破損）は気づくまでに数週間
# かかることがあり、そのときには7本すべてが壊れた後の状態になっている。
#   - 日次: 直近 N 日ぶんは全部残す
#   - 週次: 各週（月曜起点）の最も新しい1本を N 週ぶん残す
#   - 月次: 各月の最も新しい1本を N ヶ月ぶん残す
# 週次・月次の「代表」は日次と同じ実体を指すので、増える容量は
# 「日次から落ちた代表のぶんだけ」になる。
WEEKLY_BACKUP_RETENTION_WEEKS="${WEEKLY_BACKUP_RETENTION_WEEKS:-4}"
MONTHLY_BACKUP_RETENTION_MONTHS="${MONTHLY_BACKUP_RETENTION_MONTHS:-6}"
BACKUP_KEY_FILE="${BACKUP_KEY_FILE:-$HOME/.tax-apps/backup.key}"
BACKUP_ENCRYPTION_ITERATIONS="${BACKUP_ENCRYPTION_ITERATIONS:-200000}"
# 鍵そのものではなく「どの鍵で暗号化したか」の目印。バックアップ側（リポジトリ内）
# に置いて、鍵ファイルが別物にすり替わったことを復号前に気づけるようにする。
BACKUP_KEY_FINGERPRINT_FILE="${BACKUP_KEY_FINGERPRINT_FILE:-$BACKUP_BASE/.backup-key-fingerprint}"
DRILL_PG_IMAGE="${DRILL_PG_IMAGE:-postgres:16-alpine}"
DRILL_PG_CONTAINER="tax-apps-restore-drill"
DRILL_PG_STARTED=0

# label:container:pg_user:db_name:volume:dump_file:app（apps/ の下のディレクトリ名。restore <app> の単位）
PG_TARGETS=(
  "ITCM PostgreSQL:itcm-postgres:postgres:inheritance_tax_db:inheritance-case-management_postgres_data:itcm-postgres:inheritance-case-management"
  "Bank Analyzer PostgreSQL:bank-analyzer-postgres:bankuser:bank_analyzer:bank-analyzer-postgres:bank-analyzer-postgres:bank-analyzer"
  "Private Banking PostgreSQL:private-banking-postgres:postgres:private_banking:private-banking_private_banking_postgres:private-banking-postgres:private-banking"
  "Stock Valuation Form PostgreSQL:svf-postgres:postgres:stock_valuation:stock-valuation-form-postgres:svf-postgres:stock-valuation-form"
)

# label:container:db_path:volume:file_name:app
SQLITE_TARGETS=(
  "Insurance App SQLite:insurance-app:/app/data/insurance.sqlite:insurance-app-data:insurance-app-data:insurance-app"
  "Inheritance Tax Docs SQLite:inheritance-tax-docs:/app/data/resources.sqlite:inheritance-tax-docs-data:inheritance-tax-docs-data:inheritance-tax-docs"
)

# label:source_path:backup_dir_name
BIND_TARGETS=(
  # bank-analyzer の data/（Django 版が CSV を置いていた場所）は React 版では使わない。
  # 取込んだ中身はそのまま DB に入るので、PG_TARGETS と JSON の書き出しで足りる。
  #
  # 見積書・請求書の Excel テンプレート。.gitignore 対象なので Git には無く、
  # バックアップから外すとディスク上の1コピーしか残らない。
  "ITCM Excel templates:apps/inheritance-case-management/templates:itcm-templates"
)

# label:source_path:backup_file_name
SETTINGS_TARGETS=(
  "ITCM .env:apps/inheritance-case-management/.env:itcm-.env"
  "Bank Analyzer .env:apps/bank-analyzer/.env:bank-analyzer-.env"
  # prod は POSTGRES_PASSWORD が必須(`:?`)なので、これが無いと本番が起動できない。
  "Private Banking .env:apps/private-banking/.env:private-banking-.env"
  "Stock Valuation Form .env:apps/stock-valuation-form/.env:stock-valuation-form-.env"
)

# warn / err / ok・to_win_path・task_exists・操作ロックは lib/ops-common.sh にある。

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

# ロック解放の直前に呼ばれるフック（lib/ops-common.sh の release_operation_lock から）。
# 訓練用コンテナと復号した平文の後始末は、ロックを手放すより先に終わらせる必要がある。
on_release_operation_lock() {
  # リストアの途中で止まった回。止めたアプリのコンテナを止めたままにしない
  # （データが半端かもしれないが、止まったままでは誰も気づかない）
  if [[ ${#RESTORE_STOPPED[@]} -gt 0 ]]; then
    local c
    for c in "${RESTORE_STOPPED[@]}"; do
      docker start "$c" >/dev/null 2>&1 || true
    done
    RESTORE_STOPPED=()
  fi
  if [[ "$DRILL_PG_STARTED" -eq 1 ]]; then
    docker rm -f "$DRILL_PG_CONTAINER" >/dev/null 2>&1 || true
    DRILL_PG_STARTED=0
  fi
  if [[ -n "$RESTORE_WORK_DIR" && -d "$RESTORE_WORK_DIR" ]]; then
    rm -rf "$RESTORE_WORK_DIR"
    RESTORE_WORK_DIR=""
  fi
}

# 鍵の指紋。鍵そのものは出さない（sha256 の先頭16桁だけ）。
backup_key_fingerprint() {
  [[ -s "$BACKUP_KEY_FILE" ]] || return 1
  local sum
  sum=$(sha256sum < "$BACKUP_KEY_FILE" 2>/dev/null | awk '{print $1}') || return 1
  [[ -n "$sum" ]] || return 1
  printf '%s\n' "${sum:0:16}"
}

# 既に暗号化アーカイブが1つでもあるか。
has_encrypted_backups() {
  [[ -d "$BACKUP_BASE" ]] || return 1
  compgen -G "$BACKUP_BASE/*.tar.gz.enc" >/dev/null 2>&1
}

ensure_backup_encryption_key() {
  if ! command -v openssl >/dev/null 2>&1; then
    err "openssl is required for encrypted backups."
    return 1
  fi

  if [[ ! -s "$BACKUP_KEY_FILE" ]]; then
    # 鍵が無いときに黙って作り直してはいけない。
    #
    # 以前はここで無条件に新しい鍵を生成していた。PC を入れ替えたり
    # ユーザープロファイルが飛んだりして鍵だけ失われると、翌日のバックアップが
    # 何事もなく成功し、しかし過去のアーカイブは全て復号できない塊に変わる。
    # しかもそれに気づけるのは、いざ復元が必要になった当日だけだった。
    if has_encrypted_backups; then
      err "Backup key is missing, but encrypted backups already exist."
      err "  Key file: $(to_win_path "$BACKUP_KEY_FILE")"
      err "  Backups : $(to_win_path "$BACKUP_BASE")"
      err "既存のアーカイブはこの鍵でしか復号できません。オフライン保管した控えを"
      err "この場所へ戻してください。新しい鍵を作ると過去の分は永久に読めなくなります。"
      err "本当に作り直してよい場合のみ、既存の *.tar.gz.enc を退避してから再実行してください。"
      return 1
    fi

    local old_umask
    old_umask=$(umask)
    umask 077
    mkdir -p "$(dirname "$BACKUP_KEY_FILE")"
    openssl rand -base64 48 > "$BACKUP_KEY_FILE"
    chmod 600 "$BACKUP_KEY_FILE" 2>/dev/null || true
    umask "$old_umask"
    ok "Created backup key outside repository: $(to_win_path "$BACKUP_KEY_FILE")"
    warn "Store a secure offline copy of this key. Encrypted backups cannot be restored without it."
    warn "控えの置き場所（推奨）: USB メモリなど、この PC とは別の媒体。"
    warn "リポジトリ内・同じディスク上のバックアップ先には置かないこと（同時に失われます）。"
  fi

  # どの鍵で暗号化したかをバックアップ側に残し、次回以降すり替わりを検出する。
  local fp recorded
  fp=$(backup_key_fingerprint || echo "")
  if [[ -n "$fp" ]]; then
    mkdir -p "$BACKUP_BASE" 2>/dev/null || true
    if [[ -s "$BACKUP_KEY_FINGERPRINT_FILE" ]]; then
      recorded=$(tr -d '\r\n' < "$BACKUP_KEY_FINGERPRINT_FILE")
      if [[ -n "$recorded" && "$recorded" != "$fp" ]]; then
        warn "Backup key changed (recorded $recorded, now $fp)."
        warn "これより前のアーカイブは古い鍵でしか復号できません。両方とも保管してください。"
        printf '%s\n' "$fp" > "$BACKUP_KEY_FINGERPRINT_FILE" 2>/dev/null || true
      fi
    else
      printf '%s\n' "$fp" > "$BACKUP_KEY_FINGERPRINT_FILE" 2>/dev/null || true
    fi
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

# 中断された前回の作業ディレクトリを掃く。中身は復号した平文（DBのダンプ・
# 顧客名の入った JSON・.env）なので、残っている間はバックアップを暗号化して
# いる意味がその1件で消える。
#
# 後始末自体は on_release_operation_lock が trap ... EXIT INT TERM 経由で
# 消す作りになっているが、**taskkill /T /F で終わった回は trap が1つも
# 走らない**（CLAUDE.md の「殺された回は finally を飛ばす」と同じ形）。
# そして次の回が残骸を見に行く経路が無かったため、2026-10-04 の中断で
# できた 17MB の平文が 9日間 docker/backups/ に残っていた。
# ウォッチドッグのロックと同じ原則 ──「次の回が前の回の死体を見つける」──
# をこちらにも置く。消した件数は last-run の detail に出す（黙って消すと
# 「毎回殺されている」ことが誰にも見えなくなる）。
sweep_stale_restore_work() {
  local dir count=0 newest=""
  STALE_WORK_SWEPT=0
  for dir in "$BACKUP_BASE"/.restore-work.*; do
    [[ -d "$dir" ]] || continue
    if [[ -n "$RESTORE_WORK_DIR" && "$dir" == "$RESTORE_WORK_DIR" ]]; then
      continue
    fi
    newest="$(date -r "$dir" '+%Y-%m-%d %H:%M' 2>/dev/null || true)"
    if ! rm -rf "$dir"; then
      warn "Could not remove stale work dir: $(basename "$dir")"
      continue
    fi
    (( count++ )) || true
  done
  STALE_WORK_SWEPT=$count
  if [[ $count -gt 0 ]]; then
    warn "Removed $count stale restore work dir(s) holding decrypted plaintext (newest: ${newest:-unknown})."
    warn "  前回の実行は trap を通らずに終わっています（taskkill など）。"
  fi
}

extract_encrypted_backup() {
  local archive="$1"
  # 鍵の確認より先に掃く。鍵が無くて早期に return する回でも、前回の平文は
  # 消しておきたい（残骸の掃除は復号の成否と関係が無い）。
  sweep_stale_restore_work
  ensure_backup_encryption_key || return 1
  RESTORE_WORK_DIR="$(mktemp -d "$BACKUP_BASE/.restore-work.XXXXXX")"
  local key_path
  key_path="$(to_win_path "$BACKUP_KEY_FILE")"

  if ! openssl enc -d -aes-256-cbc -pbkdf2 -iter "$BACKUP_ENCRYPTION_ITERATIONS" \
    -md sha256 -pass "file:$key_path" -in "$archive" |
    tar xzf - -C "$RESTORE_WORK_DIR"; then
    err "Could not decrypt backup. Check BACKUP_KEY_FILE."
    err "  Key file   : $(to_win_path "$BACKUP_KEY_FILE")"
    err "  Key finger : $(backup_key_fingerprint || echo 'unreadable')"
    if [[ -s "$BACKUP_KEY_FINGERPRINT_FILE" ]]; then
      err "  Recorded   : $(tr -d '\r\n' < "$BACKUP_KEY_FINGERPRINT_FILE")"
      err "この2つが食い違っていれば、鍵がこのアーカイブのものではありません。"
    fi
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

# 照合順序を libc に依存しない C で DB を作る（restore と drill の共通）。
# 素の CREATE DATABASE は template1 の照合順序を引き継ぎ、既存のクラスタでは
# それが en_US.utf8 ── リストアや訓練のたびに、C へ移したはずの DB が
# 「イメージの libc（musl / glibc）次第で並びが変わる」状態へ黙って戻っていた。
# LC_CTYPE は文字種の判定にしか効かないので、そのクラスタの template0 に揃える。
pg_create_c_database() {
  local container="$1" pg_user="$2" db_name="$3" ctype
  ctype=$(docker exec "$container" psql -U "$pg_user" -d postgres -At \
    -c "SELECT datctype FROM pg_database WHERE datname = 'template0';" 2>/dev/null | tr -d '\r\n')
  docker exec "$container" psql -U "$pg_user" -d postgres -q -v ON_ERROR_STOP=1 \
    -c "CREATE DATABASE \"$db_name\" TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE '${ctype:-en_US.utf8}';"
}

restore_postgres() {
  local label="$1" container="$2" pg_user="$3" db_name="$4" volume="$5" dump_file="$6" app="$7"
  echo "$label"

  if [[ -f "$backup_dir/$dump_file.sql" ]]; then
    if ! is_container_running "$container"; then
      err "$container が止まっています"
      echo "  先に: ./manage.sh start $app"
      (( restore_fail++ )) || true
      return
    fi
    docker exec "$container" psql -U "$pg_user" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$db_name' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
    docker exec "$container" psql -U "$pg_user" -d postgres -c "DROP DATABASE IF EXISTS $db_name;" >/dev/null 2>&1
    if ! pg_create_c_database "$container" "$pg_user" "$db_name" >/dev/null 2>&1; then
      err "$label: could not create the database $db_name"
      (( restore_fail++ )) || true
      return
    fi
    # ON_ERROR_STOP=1 が無いと psql は途中のエラーを無視して 0 を返す。
    # 本物のデータを入れ直すこちら側にこそ必要で、訓練(cmd_drill)には
    # 最初から付いていたのにここだけ抜けていた。出力も捨てない ──
    # 半分だけ復元された DB に [OK] と表示するのが最悪のふるまいなので。
    # 暗号化バックアップの場合 $backup_dir は終了時に消える作業ディレクトリなので、
    # ログは docker/logs 側へ出す。
    local psql_log
    mkdir -p "$OPS_LOG_DIR" 2>/dev/null || true
    psql_log="$OPS_LOG_DIR/restore-${dump_file}.log"
    if docker exec -i "$container" psql -U "$pg_user" -d "$db_name" -q -v ON_ERROR_STOP=1 \
      < "$backup_dir/$dump_file.sql" > "$psql_log" 2>&1; then
      rm -f "$psql_log"
      if verify_pg_counts_against_dump "$label" "$backup_dir/$dump_file.sql" "$container" "$pg_user" "$db_name"; then
        ok "$dump_file.sql（件数一致: $VERIFIED_COUNTS_SUMMARY）"
        (( restore_ok++ )) || true
      else
        (( restore_fail++ )) || true
      fi
    else
      err "$label restore failed - データベースは不完全な状態です"
      sed -n '1,20p' "$psql_log" | sed 's/^/    /' >&2 || true
      err "  Full log: $(to_win_path "$psql_log")"
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
    local label container db_path vol fname _app
    IFS=: read -r label container db_path vol fname _app <<< "$target"
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

  # 書き出しはアプリの中の CLI（server/scripts/exportJsonBackups.ts）。npm run では
  # 引数を渡せないので出力先は環境変数で渡す。dev と本番で入口が違う（tsx かビルド済みか）
  # 切り分けは package.json の backup:json が持っている。
  if ! docker exec "$container" sh -c "rm -rf '$temp_dir' && mkdir -p '$temp_dir' && OUTPUT_DIR='$temp_dir' npm run --silent backup:json" >/dev/null 2>&1; then
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

# ------------------------------------
# ウォッチドッグのスケジュールタスクが生きているかを確認し、無ければ登録し直す
#
# なぜバックアップから呼ぶのか: ウォッチドッグのタスクは過去に2度、誰にも
# 気づかれずに消えている（直近は2026-05-10から約3ヶ月）。消えたことを検知
# できるのは定期的に動いている何かだけで、そして消えるのは常にウォッチドッグ
# の側だった。日次バックアップは動き続けているので、ここを見張り役にする。
#
# 登録には昇格が要らなくなった（register-docker-watchdog-task.ps1 参照）ので、
# 検知したその場で直せる。結果は必ずウォッチドッグのログにも残す — 無人実行
# では標準出力は誰も読まないため。
# ------------------------------------

log_to_watchdog() {
  local level="$1" message="$2"
  mkdir -p "$OPS_LOG_DIR" 2>/dev/null || return 0
  ops_rotate_log "$OPS_LOG_DIR/docker-watchdog.log"
  printf '%s [%s] %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$level" "$message" \
    >> "$OPS_LOG_DIR/docker-watchdog.log" 2>/dev/null || true
}

# task_exists() は lib/ops-common.sh にある（MSYS の引数変換対策込み）。

_ensure_task() {
  local task_name="$1" script_name="$2" bat_name="$3"

  if task_exists "$task_name"; then
    return 0
  fi

  warn "Scheduled task is missing: $task_name"
  log_to_watchdog "WARN" "Task '$task_name' was missing; re-registering it from backup.sh."

  local register_script="$SCRIPT_DIR/$script_name"
  if [[ ! -f "$register_script" ]]; then
    log_to_watchdog "ERROR" "$script_name not found; cannot re-register '$task_name'."
    return 1
  fi

  if powershell.exe -NoProfile -ExecutionPolicy Bypass \
       -File "$(to_win_path "$register_script")" >/dev/null 2>&1 &&
     task_exists "$task_name"; then
    ok "Scheduled task re-registered: $task_name"
    log_to_watchdog "INFO" "Task '$task_name' re-registered successfully."
  else
    err "Failed to re-register the scheduled task: $task_name"
    log_to_watchdog "ERROR" "Failed to re-register '$task_name'. Run $bat_name manually."
    return 1
  fi
}

ensure_watchdog_task() {
  command -v schtasks.exe >/dev/null 2>&1 || return 0
  command -v powershell.exe >/dev/null 2>&1 || return 0

  # 対象は lib/ops-common.sh の OPS_SCHEDULED_TASKS。以前はバックアップタスク
  # 自身とドリルが抜けていて、見張り役の backup.sh を起こすタスクが消えると
  # 自己修復ごと止まる循環依存になっていた。いまはウォッチドッグが
  # backup.sh due を呼ぶ経路があるので、そちらからも消失を検知して直せる。
  #
  # 再登録に失敗したことを1件記録する。ここが無かったために、タスクが
  # 消えたまま直せていない状態が数ヶ月誰にも届かなかった ── 失敗は
  # watchdog.log に1行出るだけで、last-run を見る status / preflight と
  # デスクトップの警告にはどちらにも現れなかった。
  local entry name base
  local failed=()
  for entry in "${OPS_SCHEDULED_TASKS[@]}"; do
    IFS='|' read -r name base _ _ <<< "$entry"
    if ! _ensure_task "$name" "$base.ps1" "$base.bat"; then
      failed+=("$name")
    fi
  done

  if [[ ${#failed[@]} -gt 0 ]]; then
    ops_write_last_result "scheduled-tasks" "register-failed" \
      "$(IFS=','; echo "${failed[*]}")"
  else
    ops_write_last_result "scheduled-tasks" "ok" \
      "${#OPS_SCHEDULED_TASKS[@]} 件を確認"
  fi

  # 呼び出し元（cmd_backup / cmd_due）は errexit の下で裸で呼ぶので、
  # ここで非0を返すとタスクが1つ消えているだけでバックアップ本体が
  # 中断する。知らせる口は上の記録で足りている。
  return 0
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
      ops_write_last_result "backup" "encrypt-failed" "${backup_label:-daily} plain=$(basename "$backup_dir")"
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
    ops_write_last_result "backup" "no-data" "${backup_label:-daily} ok=0"
    return 1
  elif [[ $backup_fail -gt 0 ]]; then
    warn "Incomplete encrypted backup was not promoted to the latest-backup directory."
    echo "  Resolve the errors and run the backup again."
  else
    copy_latest_backup_set "$LATEST_BACKUP_BASE/all-apps" "$backup_dir"

    # 同じPCの中にしか無いうちは、ドライブが1台壊れれば全部消える。
    # コピー先が未設定なら何もしない（設定は ~/.tax-apps/backup-external-dest）。
    copy_backup_to_external "$backup_dir" || true

    if [[ "$backup_label" == "pre-restore" ]]; then
      echo "  Retention cleanup skipped during pre-restore safety backup."
    else
      echo "  Retention: 日次${FULL_BACKUP_RETENTION_DAYS}日 + 週次${WEEKLY_BACKUP_RETENTION_WEEKS}週 + 月次${MONTHLY_BACKUP_RETENTION_MONTHS}ヶ月 in $(to_win_path "$BACKUP_BASE")"
      prune_full_backups "$BACKUP_BASE"
      # pre-restore はリストア直前の保険でしかないので世代に積まず、日数だけで消す。
      remove_old_dirs "$BACKUP_BASE" "pre-restore_????-??-??_??????" "$FULL_BACKUP_RETENTION_DAYS"
      remove_old_files "$BACKUP_BASE" "pre-restore_????-??-??_??????.tar.gz.enc" "$FULL_BACKUP_RETENTION_DAYS"
    fi
    echo "  To restore: ./manage.sh restore $(basename "$backup_dir")"
  fi
  echo ""

  # 成否を1件だけ記録する。無人実行の標準出力は誰も読まないので、
  # manage.sh の status / preflight から見えるのはこの記録だけ。
  if [[ $backup_fail -eq 0 ]]; then
    ops_write_last_result "backup" "ok" \
      "${backup_label:-daily} ok=$backup_ok skipped=$backup_skip"
  else
    ops_write_last_result "backup" "failed" \
      "${backup_label:-daily} ok=$backup_ok skipped=$backup_skip failed=$backup_fail"
  fi

  # バックアップの成否とは独立に、毎回ウォッチドッグの生存を確認する
  ensure_watchdog_task
  echo ""

  [[ $backup_fail -eq 0 ]]
}

# ------------------------------------------------------------
# 件数（restore と drill の共通）
# ------------------------------------------------------------
# 戻した DB が「本当にバックアップと同じ中身か」は件数で確かめる。
# restore と drill が同じ関数を通るので、週次の訓練がこの照合そのものの
# 練習にもなる（訓練だけ別の数え方をしていると、照合の誤りは本番で初めて出る）。

# ダンプ（pg_dump の COPY 形式）から public の表ごとの行数を数える。
# COPY の本文は1行1レコード（値の中の改行は \n にエスケープされる）。
# 出力: <表名>:<行数> を名前順に1行ずつ
pg_dump_table_counts() {
  awk '/^COPY public\./ { t = $2; sub(/^public\./, "", t); gsub(/"/, "", t); n = 0; on = 1; next }
       on && /^\\.$/ { print t ":" n; on = 0; next }
       on { n++ }' "$1" | LC_ALL=C sort
}

# 稼働中の DB の表ごとの実件数（統計値の n_live_tup は古いことがあるので使わない）。
# 出力の形は pg_dump_table_counts と同じ。
pg_live_table_counts() {
  local container="$1" pg_user="$2" db_name="$3" out
  out=$(docker exec "$container" psql -U "$pg_user" -d "$db_name" -At -v ON_ERROR_STOP=1 -c "
    select c.relname || ':' ||
           (xpath('/row/n/text()',
                  query_to_xml(format('select count(*) as n from %I.%I', n.nspname, c.relname),
                               false, true, '')))[1]::text
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'") || return 1
  printf '%s\n' "$out" | tr -d '\r' | sed '/^$/d' | LC_ALL=C sort
}

# <表名>:<行数> の並びを「N テーブル / M 行」にする
counts_summary() {
  awk -F: 'NF >= 2 { t++; r += $2 } END { printf "%d テーブル / %d 行", t, r }'
}

# 戻した PostgreSQL の件数をダンプと突き合わせる。1件でも違えば失敗。
verify_pg_counts_against_dump() {
  local label="$1" dump="$2" container="$3" pg_user="$4" db_name="$5" expected actual
  expected=$(pg_dump_table_counts "$dump")
  if ! actual=$(pg_live_table_counts "$container" "$pg_user" "$db_name"); then
    err "$label: 復元後の件数を数えられませんでした"
    return 1
  fi
  if [[ "$expected" != "$actual" ]]; then
    err "$label: 件数がバックアップと一致しません"
    diff <(printf '%s\n' "$expected") <(printf '%s\n' "$actual") | grep '^[<>]' | head -10 |
      sed 's/^</    バックアップ:/; s/^>/    復元後:      /' >&2 || true
    return 1
  fi
  VERIFIED_COUNTS_SUMMARY=$(counts_summary <<< "$actual")
}

# SQLite を開いて integrity_check と件数を見る。better-sqlite3 はアプリの
# イメージにしか無いので、そのアプリのコンテナを借りる（readonly で開くだけ）。
# 出力: "<表の数> <行数>"。integrity_check が ok でなければ失敗。
sqlite_probe() {
  local container="$1" path="$2"
  MSYS_NO_PATHCONV=1 docker exec "$container" node -e '
    const Database = require("better-sqlite3");
    const db = new Database(process.argv[1], { readonly: true, fileMustExist: true });
    const integrity = db.pragma("integrity_check", { simple: true });
    const names = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = \x27table\x27 AND name NOT LIKE \x27sqlite_%\x27"
    ).all().map((row) => row.name);
    let rows = 0;
    for (const name of names) {
      rows += db.prepare(`SELECT count(*) AS n FROM "${name.replace(/"/g, "\"\"")}"`).get().n;
    }
    db.close();
    if (integrity !== "ok") throw new Error(`integrity_check: ${integrity}`);
    process.stdout.write(`${names.length} ${rows}`);
  ' "$path" 2>/dev/null | tr -d '\r'
}

# バックアップの中の SQLite を、稼働中のコンテナの /tmp へ写してから数える。
# 本番のファイルには触れない。戻り値: 0=成功 / 1=検証失敗 / 2=アーカイブに無い / 3=写せない
sqlite_probe_archive() {
  local container="$1" archive="$2" db_name="$3" fname="$4" out rc=0
  local stage="$RESTORE_WORK_DIR/probe-$fname"
  local probe="/tmp/tax-apps-probe-${fname}-$$.sqlite"
  rm -rf "$stage"
  mkdir -p "$stage"
  if ! tar xzf "$archive" -C "$stage" 2>/dev/null || [[ ! -f "$stage/$db_name" ]]; then
    rm -rf "$stage"
    return 2
  fi
  # コンテナ側のパスを MSYS に変換させないため MSYS_NO_PATHCONV=1 が要るが、
  # そうするとホスト側の POSIX パスも素通しになるので docker.exe が読める形へ直す。
  if ! MSYS_NO_PATHCONV=1 docker cp "$(to_win_path "$stage/$db_name")" "$container:$probe" >/dev/null 2>&1; then
    rm -rf "$stage"
    return 3
  fi
  out=$(sqlite_probe "$container" "$probe") || rc=1
  # docker cp で入れたファイルは root 所有になる。非rootで動くコンテナ
  # (insurance-app 等) では -u root が無いと消せず、毎回 DB の
  # フルコピーが /tmp に溜まっていく。readonly で開いても WAL/SHM は作られる。
  if ! MSYS_NO_PATHCONV=1 docker exec -u root "$container" \
    rm -f "$probe" "$probe-wal" "$probe-shm" >/dev/null 2>&1; then
    warn "$container:$probe を消せませんでした"
  fi
  rm -rf "$stage"
  [[ $rc -eq 0 ]] && printf '%s\n' "$out"
  return $rc
}

# ------------------------------------------------------------
# アプリ単位のリストア
# ------------------------------------------------------------
# 以前のリストアは「全アプリを丸ごと」しか無く、1アプリの誤削除を戻すために
# 他のアプリで今日入力した分まで巻き戻すか、手で SQL を流すかの二択だった。
# いまはアプリ単位で戻す（--all で全部）。1アプリの中では次の順に進む:
#
#   1. 戻す前に、バックアップの件数と現在の件数を並べて見せる（何も変えない）
#   2. 確認のあと、現在の全データを pre-restore_* として暗号化バックアップ
#   3. そのアプリのコンテナだけを止める（.sql から戻す PostgreSQL は動かしたまま）
#   4. 戻す → PostgreSQL は全テーブルの件数をダンプと照合
#   5. 止めたコンテナを起動し、healthy になるまで待つ → SQLite の件数を照合
#
# .env は「無いときだけ」戻す。pg_dump にロールのパスワードは入らないので、
# 本番起動でパスワードが回転した後に古い .env を戻すと DB に繋がらなくなる。
# 上書きは --with-env を付けたときだけ。新しい PC では DB を初めて起動する前に
# .env が要る（空のボリュームはその時の .env のパスワードで初期化される）ので、
# --env-only で .env だけ先に置いてから start → restore --all の順にする。

RESTORE_HEALTH_TIMEOUT="${RESTORE_HEALTH_TIMEOUT:-240}"
declare -A RESTORE_SQLITE_EXPECT=()

# apps/<app>/... → <app>
_app_of_path() {
  local p="${1#apps/}"
  printf '%s\n' "${p%%/*}"
}

# バックアップ対象を持つアプリの一覧（4つの表から作る。表の順を保つ）
restore_known_apps() {
  local t f
  {
    for t in "${PG_TARGETS[@]}"; do IFS=: read -r _ _ _ _ _ _ f <<< "$t"; echo "$f"; done
    for t in "${SQLITE_TARGETS[@]}"; do IFS=: read -r _ _ _ _ _ f <<< "$t"; echo "$f"; done
    for t in "${BIND_TARGETS[@]}"; do IFS=: read -r _ f _ <<< "$t"; _app_of_path "$f"; done
    for t in "${SETTINGS_TARGETS[@]}"; do IFS=: read -r _ f _ <<< "$t"; _app_of_path "$f"; done
  } | awk '!seen[$0]++'
}

# アプリ名の解決。完全一致 → 別名（itcm / svf）→ 一意な部分一致の順。
resolve_restore_app() {
  local want="${1,,}" app
  local -a hits=()
  case "$want" in
    itcm) want="inheritance-case-management" ;;
    svf)  want="stock-valuation-form" ;;
  esac
  while IFS= read -r app; do
    if [[ "$app" == "$want" ]]; then
      printf '%s\n' "$app"
      return 0
    fi
    [[ "$app" == *"$want"* ]] && hits+=("$app")
  done < <(restore_known_apps)
  if [[ ${#hits[@]} -eq 1 ]]; then
    printf '%s\n' "${hits[0]}"
    return 0
  fi
  if [[ ${#hits[@]} -gt 1 ]]; then
    err "「$1」に当てはまるアプリが複数あります: ${hits[*]}"
  else
    err "「$1」はバックアップ対象のアプリではありません"
  fi
  echo "  対象: $(restore_known_apps | tr '\n' ' ')" >&2
  return 1
}

# そのアプリの compose から起動された、稼働中のコンテナ名
app_running_containers() {
  local want name wd
  want=$(to_win_path "$PROJECT_ROOT/apps/$1" | tr 'A-Z\\' 'a-z/')
  while IFS=$'\t' read -r name wd; do
    [[ -z "$name" ]] && continue
    [[ "$(printf '%s' "$wd" | tr 'A-Z\\' 'a-z/')" == "$want" ]] && printf '%s\n' "$name"
  done < <(docker ps --format '{{.Names}}\t{{.Label "com.docker.compose.project.working_dir"}}' 2>/dev/null | tr -d '\r')
  return 0
}

# そのアプリのコンテナを止める（引数の2番目以降に挙げたものは残す）。止めたものは
# RESTORE_STOPPED に積み、戻し終わったら（途中で死んでも on_release_operation_lock が）起動する。
stop_app_containers() {
  local app="$1"
  shift
  local keep=" $* " c
  while IFS= read -r c; do
    [[ -z "$c" || "$keep" == *" $c "* ]] && continue
    if docker stop "$c" >/dev/null 2>&1; then
      RESTORE_STOPPED+=("$c")
      echo "  停止: $c"
    else
      err "$c を止められませんでした"
      return 1
    fi
  done < <(app_running_containers "$app")
}

wait_containers_healthy() {
  local deadline=$(( SECONDS + RESTORE_HEALTH_TIMEOUT )) c st
  local -a pending
  while :; do
    pending=()
    for c in "$@"; do
      st=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$c" 2>/dev/null | tr -d '\r')
      case "$st" in
        healthy|running) ;;
        *) pending+=("$c(${st:-不明})") ;;
      esac
    done
    [[ ${#pending[@]} -eq 0 ]] && return 0
    if (( SECONDS >= deadline )); then
      err "${RESTORE_HEALTH_TIMEOUT}秒待っても healthy になりません: ${pending[*]}"
      return 1
    fi
    sleep 3
  done
}

# 止めたコンテナを起動して healthy まで待つ
start_restore_stopped() {
  [[ ${#RESTORE_STOPPED[@]} -gt 0 ]] || return 0
  local c rc=0
  local -a started=("${RESTORE_STOPPED[@]}")
  RESTORE_STOPPED=()
  for c in "${started[@]}"; do
    if docker start "$c" >/dev/null 2>&1; then
      echo "  起動: $c"
    else
      err "$c を起動できませんでした"
      rc=1
    fi
  done
  [[ $rc -eq 0 ]] || return 1
  echo "  healthy になるのを待っています（最大 ${RESTORE_HEALTH_TIMEOUT} 秒）..."
  wait_containers_healthy "${started[@]}" || return 1
  ok "起動しました: ${started[*]}"
}

# SQLite のボリュームを、バックアップの中身で丸ごと置き換える。
# コンテナは呼び出し側（stop_app_containers）で止めてある。
#
# 所有者は「戻す前のボリュームの根」に揃える。アーカイブはホストの Git Bash の
# tar で詰め直している（backup_sqlite_volumes）ので、中の所有者は Windows の
# ユーザー（197609 など）になっている。root の tar はそれをそのまま復元し、
# `.` の項目でボリュームの根まで書き換えるため、非 root のアプリ（uid 1000）が
# DB のディレクトリに書けなくなる ── 2026-10-14 の insurance-app の実地試験で、
# healthcheck は通ったまま DB だけ開けない状態になった（件数照合が拾った）。
restore_sqlite_target() {
  local label="$1" archive="$2" vol="$3"
  local archive_dir_win
  archive_dir_win="$(to_win_path "$(dirname "$archive")")"
  docker volume inspect "$vol" >/dev/null 2>&1 || docker volume create "$vol" >/dev/null 2>&1
  if MSYS_NO_PATHCONV=1 docker run --rm -v "$vol:/data" -v "$archive_dir_win:/backup:ro" alpine:3.22 \
    sh -c "owner=\$(stat -c %u:%g /data) && rm -rf -- /data/* /data/.[!.]* /data/..?* && tar xzf /backup/$(basename "$archive") -C /data && chown -R \"\$owner\" /data" >/dev/null 2>&1; then
    ok "$label: $(basename "$archive")"
    (( restore_ok++ )) || true
  else
    err "$label: ボリュームへ戻せませんでした"
    (( restore_fail++ )) || true
  fi
}

# .env をどう扱うか: none（バックアップに無い）/ restore（今は無い）/ same（同じ）/
# overwrite（違う・--with-env あり）/ keep（違う・今のものを残す）
env_restore_action() {
  local src="$1" dest="$2" with_env="$3"
  if [[ ! -f "$src" ]]; then echo none
  elif [[ ! -f "$dest" ]]; then echo restore
  elif cmp -s "$src" "$dest"; then echo same
  elif [[ "$with_env" -eq 1 ]]; then echo overwrite
  else echo keep
  fi
}

env_action_text() {
  case "$1" in
    none)      echo "バックアップに無し" ;;
    restore)   echo "今は無いので戻す" ;;
    same)      echo "今のものと同じ（何もしない）" ;;
    overwrite) echo "今のものと違う → バックアップで上書き（--with-env）" ;;
    keep)      echo "今のものと違う → 今のものを残す（上書きは --with-env）" ;;
  esac
}

restore_settings_target() {
  local label="$1" src="$2" dest="$3" with_env="$4" app="$5" action
  action=$(env_restore_action "$src" "$dest" "$with_env")
  case "$action" in
    restore|overwrite)
      if cp "$src" "$dest"; then
        ok "$label: $(env_action_text "$action")"
        (( restore_ok++ )) || true
        if [[ "$action" == "overwrite" ]]; then
          warn "  .env を戻しても DB のパスワードは変わりません。繋がらなくなったら .env を pre-restore の版へ戻してください"
          echo "  compose へ反映: ./manage.sh apply $app"
        fi
      else
        err "$label: 書き込めませんでした"
        (( restore_fail++ )) || true
      fi
      ;;
    keep)
      warn "$label: $(env_action_text "$action")"
      (( restore_skip++ )) || true
      ;;
    *)
      echo "  $label: $(env_action_text "$action")"
      ;;
  esac
}

# ファイル数（.gitkeep は数えない）
_count_files() {
  if [[ -d "$1" ]]; then
    find "$1" -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d ' '
  else
    echo 0
  fi
}

# 戻す前の一覧。何も変えない。そのアプリが戻せない状態（DB が止まっている等）なら 1。
restore_preview_app() {
  local app="$1" dir="$2" with_env="$3" t blocked=0 found=0
  echo "■ $app"
  for t in "${PG_TARGETS[@]}"; do
    local label container pg_user db_name volume dump_file t_app
    IFS=: read -r label container pg_user db_name volume dump_file t_app <<< "$t"
    [[ "$t_app" == "$app" ]] || continue
    found=1
    if [[ -f "$dir/$dump_file.sql" ]]; then
      local current="（DB が止まっています）"
      if is_container_running "$container"; then
        current=$(pg_live_table_counts "$container" "$pg_user" "$db_name" | counts_summary) || current="（数えられません）"
      else
        blocked=1
      fi
      echo "  PostgreSQL $db_name"
      echo "    バックアップ: $(pg_dump_table_counts "$dir/$dump_file.sql" | counts_summary)"
      echo "    現在:         $current"
      if ! is_container_running "$container"; then
        err "  $container が止まっています。先に: ./manage.sh start $app"
      fi
    elif [[ -f "$dir/$dump_file-volume.tar.gz" ]]; then
      echo "  PostgreSQL $db_name: ボリュームの丸ごとの写し（件数は数えられません。DB も止めて戻します）"
    else
      echo "  PostgreSQL $db_name: バックアップに無し"
    fi
  done
  for t in "${SQLITE_TARGETS[@]}"; do
    local label container db_path vol fname t_app
    IFS=: read -r label container db_path vol fname t_app <<< "$t"
    [[ "$t_app" == "$app" ]] || continue
    found=1
    local archive="$dir/$fname.tar.gz" db_file
    db_file="$(basename "$db_path")"
    if [[ ! -f "$archive" ]]; then
      echo "  SQLite $db_file: バックアップに無し"
      continue
    fi
    echo "  SQLite $db_file"
    if ! is_container_running "$container"; then
      echo "    （$container が止まっているので件数は数えられません。ボリュームは戻せます）"
      continue
    fi
    local probe_out="" rc=0 b_tables b_rows c_tables c_rows
    probe_out=$(sqlite_probe_archive "$container" "$archive" "$db_file" "$fname") || rc=$?
    if [[ $rc -eq 0 ]]; then
      read -r b_tables b_rows <<< "$probe_out"
      RESTORE_SQLITE_EXPECT[$fname]="$b_tables $b_rows"
      echo "    バックアップ: $b_tables テーブル / $b_rows 行（integrity ok）"
    else
      err "    バックアップの $db_file を検証できません（rc=$rc）"
      blocked=1
    fi
    if probe_out=$(sqlite_probe "$container" "$db_path"); then
      read -r c_tables c_rows <<< "$probe_out"
      echo "    現在:         $c_tables テーブル / $c_rows 行"
    else
      echo "    現在:         （数えられません）"
    fi
  done
  for t in "${BIND_TARGETS[@]}"; do
    local label src_path dname
    IFS=: read -r label src_path dname <<< "$t"
    [[ "$(_app_of_path "$src_path")" == "$app" ]] || continue
    found=1
    if [[ -d "$dir/$dname" ]]; then
      echo "  $label: バックアップ $(_count_files "$dir/$dname") 件 / 現在 $(_count_files "$PROJECT_ROOT/$src_path") 件（上書きで足す。今あるだけのファイルは消さない）"
    else
      echo "  $label: バックアップに無し"
    fi
  done
  for t in "${SETTINGS_TARGETS[@]}"; do
    local label src_path fname
    IFS=: read -r label src_path fname <<< "$t"
    [[ "$(_app_of_path "$src_path")" == "$app" ]] || continue
    found=1
    echo "  .env: $(env_action_text "$(env_restore_action "$dir/$fname" "$PROJECT_ROOT/$src_path" "$with_env")")"
  done
  [[ $found -eq 1 ]] || echo "  （バックアップ対象がありません）"
  echo ""
  [[ $blocked -eq 0 ]]
}

# 1アプリを戻す。戻り値 0 = 全部成功
restore_one_app() {
  local app="$1" dir="$2" with_env="$3" t
  restore_ok=0
  restore_fail=0
  restore_skip=0
  backup_dir="$dir"
  print_banner "リストア: $app"

  # .sql から戻す PostgreSQL は動かしたまま（psql で流し込む）。それ以外は止める
  local -a keep=()
  for t in "${PG_TARGETS[@]}"; do
    local container dump_file t_app
    IFS=: read -r _ container _ _ _ dump_file t_app <<< "$t"
    [[ "$t_app" == "$app" && -f "$dir/$dump_file.sql" ]] && keep+=("$container")
  done
  local had_running
  had_running=$(app_running_containers "$app" | wc -l | tr -d ' ')
  if ! stop_app_containers "$app" "${keep[@]}"; then
    start_restore_stopped || true
    return 1
  fi

  for t in "${PG_TARGETS[@]}"; do
    local label container pg_user db_name volume dump_file t_app
    IFS=: read -r label container pg_user db_name volume dump_file t_app <<< "$t"
    [[ "$t_app" == "$app" ]] || continue
    restore_postgres "$label" "$container" "$pg_user" "$db_name" "$volume" "$dump_file" "$t_app"
  done
  for t in "${SQLITE_TARGETS[@]}"; do
    local label container db_path vol fname t_app
    IFS=: read -r label container db_path vol fname t_app <<< "$t"
    [[ "$t_app" == "$app" && -f "$dir/$fname.tar.gz" ]] || continue
    restore_sqlite_target "$label" "$dir/$fname.tar.gz" "$vol"
  done
  for t in "${BIND_TARGETS[@]}"; do
    local label src_path dname
    IFS=: read -r label src_path dname <<< "$t"
    [[ "$(_app_of_path "$src_path")" == "$app" ]] || continue
    restore_bind_data "" "$label" "$dir/$dname" "$PROJECT_ROOT/$src_path"
  done
  for t in "${SETTINGS_TARGETS[@]}"; do
    local label src_path fname
    IFS=: read -r label src_path fname <<< "$t"
    [[ "$(_app_of_path "$src_path")" == "$app" ]] || continue
    restore_settings_target "$label" "$dir/$fname" "$PROJECT_ROOT/$src_path" "$with_env" "$app"
  done

  echo ""
  if [[ "$had_running" -eq 0 ]]; then
    warn "$app は止まっていたので起動しません。起動: ./manage.sh start $app"
  elif ! start_restore_stopped; then
    (( restore_fail++ )) || true
    echo "  ログ: ./manage.sh logs $app"
  fi

  # SQLite は起動したアプリのコンテナを借りて数える（better-sqlite3 がそこにしか無い）
  for t in "${SQLITE_TARGETS[@]}"; do
    local label container db_path vol fname t_app
    IFS=: read -r label container db_path vol fname t_app <<< "$t"
    [[ "$t_app" == "$app" && -n "${RESTORE_SQLITE_EXPECT[$fname]:-}" ]] || continue
    is_container_running "$container" || continue
    local now now_t now_r
    if ! now=$(sqlite_probe "$container" "$db_path"); then
      err "$label: 戻した DB を検証できません"
      (( restore_fail++ )) || true
    elif [[ "$now" != "${RESTORE_SQLITE_EXPECT[$fname]}" ]]; then
      err "$label: 件数がバックアップと一致しません（バックアップ ${RESTORE_SQLITE_EXPECT[$fname]} / 復元後 $now ※テーブル数 行数）"
      (( restore_fail++ )) || true
    else
      read -r now_t now_r <<< "$now"
      ok "$label: 件数一致 ${now_t} テーブル / ${now_r} 行"
    fi
  done

  echo ""
  echo "  OK: $restore_ok  Skipped: $restore_skip  Failed: $restore_fail"
  [[ $restore_fail -eq 0 ]]
}

# バックアップの指定を解決して RESOLVED_BACKUP に入れる。
#   空      → 端末なら一覧から選ぶ／無人なら最新（pre-restore を除く）
#   日付    → その日のいちばん新しいもの
#   完全名  → そのもの（pre-restore_* も可）
# 戻り値 2 = 端末でやめた
resolve_restore_backup() {
  local sel="$1" interactive="$2"
  RESOLVED_BACKUP=""
  local -a backups=()
  local d
  while IFS= read -r d; do
    d="$(basename "$d")"
    backups+=("${d%.tar.gz.enc}")
  done < <(find "$BACKUP_BASE" -mindepth 1 -maxdepth 1 \
    \( -type d \( -name '????-??-??_??????' -o -name 'pre-restore_????-??-??_??????' \) \
    -o -type f \( -name '????-??-??_??????.tar.gz.enc' -o -name 'pre-restore_????-??-??_??????.tar.gz.enc' \) \) \
    -print 2>/dev/null | sort -r)

  if [[ ${#backups[@]} -eq 0 ]]; then
    err "バックアップがありません。先に: ./manage.sh backup"
    return 1
  fi

  _backup_path_of() {
    if [[ -f "$BACKUP_BASE/$1.tar.gz.enc" ]]; then
      printf '%s\n' "$BACKUP_BASE/$1.tar.gz.enc"
    else
      printf '%s\n' "$BACKUP_BASE/$1"
    fi
  }

  if [[ -n "$sel" ]]; then
    sel="${sel%.tar.gz.enc}"
    if [[ "$sel" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
      for d in "${backups[@]}"; do
        if [[ "$d" == "$sel"_* ]]; then
          RESOLVED_BACKUP="$(_backup_path_of "$d")"
          return 0
        fi
      done
      err "$sel のバックアップがありません"
      return 1
    fi
    for d in "${backups[@]}"; do
      if [[ "$d" == "$sel" ]]; then
        RESOLVED_BACKUP="$(_backup_path_of "$d")"
        return 0
      fi
    done
    err "$sel が見つかりません（$(to_win_path "$BACKUP_BASE")）"
    return 1
  fi

  if [[ "$interactive" -ne 1 ]]; then
    for d in "${backups[@]}"; do
      if [[ "$d" != pre-restore_* ]]; then
        RESOLVED_BACKUP="$(_backup_path_of "$d")"
        echo "バックアップの指定が無いので最新を使います: $d"
        return 0
      fi
    done
    err "pre-restore 以外のバックアップがありません。名前で指定してください"
    return 1
  fi

  echo "どのバックアップから戻しますか（新しい順）:"
  echo ""
  local i
  for i in "${!backups[@]}"; do
    echo "  [$((i+1))] ${backups[$i]}"
  done
  echo ""
  echo "  [0] やめる"
  echo ""
  local choice
  read -rp "番号: " choice
  choice=$(strip_cr "$choice")
  if [[ -z "$choice" || "$choice" == "0" ]]; then
    return 2
  fi
  if ! [[ "$choice" =~ ^[0-9]+$ ]] || (( choice < 1 || choice > ${#backups[@]} )); then
    err "番号が正しくありません"
    return 1
  fi
  RESOLVED_BACKUP="$(_backup_path_of "${backups[$((choice-1))]}")"
}

restore_usage() {
  cat <<'USAGE'
使い方:
  ./manage.sh restore                         端末で、アプリとバックアップを選ぶ
  ./manage.sh restore <app> [バックアップ]    1アプリだけ戻す
  ./manage.sh restore --all [バックアップ]    バックアップ対象を全部戻す
  ./manage.sh restore --env-only [app]        無い .env だけ置く（新しい PC の最初の一手）

  バックアップ: 2026-10-14_212138 / 2026-10-14（その日の最新）/ pre-restore_...
                省略すると端末では一覧から選び、無人では最新を使う
  --yes         確認を飛ばす（AI や手順書から叩くとき。端末が無いときは必須）
  --with-env    今ある .env もバックアップの版で上書きする（既定は無いときだけ戻す）
  アプリ名は itcm / svf の略称と、一意に決まる部分一致も通る
  手順書: docker/RESTORE.md
USAGE
}

cmd_restore() {
  local all=0 yes=0 with_env=0 env_only=0 app_arg="" sel="" a
  for a in "$@"; do
    [[ -z "$a" ]] && continue
    case "$a" in
      --all) all=1 ;;
      --yes|-y) yes=1 ;;
      --with-env) with_env=1 ;;
      --env-only) env_only=1 ;;
      -h|--help) restore_usage; return 0 ;;
      -*) err "知らないオプションです: $a"; restore_usage; return 1 ;;
      *)
        if [[ "$a" =~ ^(pre-restore_)?[0-9]{4}-[0-9]{2}-[0-9]{2}(_[0-9]{6})?(\.tar\.gz\.enc)?$ ]]; then
          if [[ -n "$sel" ]]; then err "バックアップの指定が2つあります: $sel / $a"; return 1; fi
          sel="$a"
        else
          if [[ -n "$app_arg" ]]; then err "アプリは1つだけ指定できます（全部なら --all）: $app_arg / $a"; return 1; fi
          app_arg="$a"
        fi
        ;;
    esac
  done
  if [[ $all -eq 1 && -n "$app_arg" ]]; then
    err "--all とアプリ名は同時に指定できません"
    return 1
  fi

  local interactive=0
  [[ -t 0 && -t 1 ]] && interactive=1

  print_banner "Tax Apps - Restore"

  if [[ ! -d "$BACKUP_BASE" ]]; then
    err "$(to_win_path "$BACKUP_BASE") がありません。先に: ./manage.sh backup"
    return 1
  fi

  # --- 対象のアプリ ---
  local -a apps=()
  local -a known=()
  mapfile -t known < <(restore_known_apps)
  if [[ -n "$app_arg" ]]; then
    local resolved
    resolved=$(resolve_restore_app "$app_arg") || return 1
    apps=("$resolved")
  elif [[ $all -eq 1 || $env_only -eq 1 ]]; then
    apps=("${known[@]}")
  elif [[ $interactive -eq 1 ]]; then
    echo "どのアプリを戻しますか:"
    echo ""
    local i
    for i in "${!known[@]}"; do
      echo "  [$((i+1))] ${known[$i]}"
    done
    echo "  [a] 全部"
    echo "  [0] やめる"
    echo ""
    local choice
    read -rp "番号: " choice
    choice=$(strip_cr "$choice")
    if [[ -z "$choice" || "$choice" == "0" ]]; then
      echo "やめました。"
      return 0
    elif [[ "${choice,,}" == "a" ]]; then
      apps=("${known[@]}")
    elif [[ "$choice" =~ ^[0-9]+$ ]] && (( choice >= 1 && choice <= ${#known[@]} )); then
      apps=("${known[$((choice-1))]}")
    else
      err "番号が正しくありません"
      return 1
    fi
    echo ""
  else
    err "戻すアプリを指定してください（全部なら --all）"
    restore_usage
    return 1
  fi

  # --- バックアップ ---
  local rc=0
  resolve_restore_backup "$sel" "$interactive" || rc=$?
  if [[ $rc -eq 2 ]]; then
    echo "やめました。"
    return 0
  fi
  [[ $rc -eq 0 ]] || return 1
  local source_name
  source_name="$(basename "$RESOLVED_BACKUP" .tar.gz.enc)"
  echo "バックアップ: $source_name"
  echo "アプリ:       ${apps[*]}"
  echo ""

  backup_dir="$RESOLVED_BACKUP"
  if [[ -f "$backup_dir" && "$backup_dir" == *.tar.gz.enc ]]; then
    extract_encrypted_backup "$backup_dir" || return 1
    backup_dir="$EXTRACTED_BACKUP_PATH"
  fi
  verify_backup_manifest "$backup_dir" || return 1
  local restore_source="$backup_dir"
  echo ""

  # --- .env だけ（新しい PC の最初の一手）---
  # 無いものを置くだけなので確認も pre-restore も取らない。今あるものには触らない。
  if [[ $env_only -eq 1 ]]; then
    local t placed=0 app_of
    for t in "${SETTINGS_TARGETS[@]}"; do
      local label src_path fname
      IFS=: read -r label src_path fname <<< "$t"
      app_of="$(_app_of_path "$src_path")"
      [[ " ${apps[*]} " == *" $app_of "* ]] || continue
      case "$(env_restore_action "$restore_source/$fname" "$PROJECT_ROOT/$src_path" 0)" in
        restore)
          if cp "$restore_source/$fname" "$PROJECT_ROOT/$src_path"; then
            ok "$label: 置きました"
            (( placed++ )) || true
          else
            err "$label: 書き込めませんでした"
            return 1
          fi
          ;;
        none) warn "$label: バックアップに無し" ;;
        same) echo "  $label: 今のものと同じ" ;;
        *)    echo "  $label: 既にあるので触りません" ;;
      esac
    done
    echo ""
    ok ".env を ${placed} 件置きました"
    echo "  次: ./manage.sh start → ./manage.sh restore --all $source_name --yes"
    ops_write_last_result "restore" "ok" "env-only from=$source_name placed=$placed"
    return 0
  fi

  # --- 戻す前の一覧 ---
  echo "戻す内容（バックアップ / 現在）:"
  echo ""
  local blocked=0 app
  for app in "${apps[@]}"; do
    restore_preview_app "$app" "$restore_source" "$with_env" || blocked=1
  done
  if [[ $blocked -eq 1 ]]; then
    err "戻せない項目があります。上の [ERROR] を直してからやり直してください（何も変えていません）"
    return 1
  fi

  warn "上のアプリの現在のデータを、このバックアップの内容で置き換えます。"
  echo "  戻す前に、現在の全データを pre-restore_* として暗号化バックアップします。"
  echo ""
  if [[ $yes -ne 1 ]]; then
    if [[ $interactive -ne 1 ]]; then
      err "確認なしでは実行しません。内容を確かめてから --yes を付けてください（何も変えていません）"
      return 1
    fi
    local confirm
    read -rp "戻しますか？ [y/N]: " confirm
    confirm=$(strip_cr "$confirm")
    if [[ "${confirm,,}" != "y" ]]; then
      echo "やめました（何も変えていません）。"
      return 0
    fi
  fi
  echo ""

  # --- 戻す前の保険 ---
  local pre_restore_name=""
  echo "[保険] 現在のデータを pre-restore としてバックアップします..."
  if cmd_backup "pre-restore"; then
    pre_restore_name="$(basename "$backup_dir" .tar.gz.enc)"
    ok "保険のバックアップ: $pre_restore_name"
  elif [[ ${backup_fail:-0} -eq 0 && ${backup_ok:-0} -eq 0 ]]; then
    warn "保険に取る現在のデータがありませんでした。続けます"
  else
    err "保険のバックアップに失敗しました。中断します（現在のデータは変えていません）"
    ops_write_last_result "restore" "failed" "apps=$(IFS=,; echo "${apps[*]}") from=$source_name pre-restore-failed"
    return 1
  fi
  backup_dir="$restore_source"
  echo ""

  # --- アプリごとに戻す ---
  local -a done_ok=() done_fail=()
  for app in "${apps[@]}"; do
    if restore_one_app "$app" "$restore_source" "$with_env"; then
      done_ok+=("$app")
    else
      done_fail+=("$app")
    fi
  done

  print_summary_banner "Restore Complete" "${#done_fail[@]}"
  echo "  バックアップ: $source_name"
  [[ ${#done_ok[@]} -gt 0 ]] && echo "  成功: ${done_ok[*]}"
  [[ ${#done_fail[@]} -gt 0 ]] && echo "  失敗: ${done_fail[*]}"
  if [[ -n "$pre_restore_name" ]]; then
    echo "  戻す前のデータ: $pre_restore_name"
    echo "    元へ戻すなら: ./manage.sh restore <app> $pre_restore_name"
  fi
  echo ""
  local detail
  detail="apps=$(IFS=,; echo "${apps[*]}") from=$source_name ok=${#done_ok[@]} failed=${#done_fail[@]}"
  [[ -n "$pre_restore_name" ]] && detail+=" pre=$pre_restore_name"
  if [[ ${#done_fail[@]} -gt 0 ]]; then
    ops_write_last_result "restore" "failed" "$detail"
    return 1
  fi
  ops_write_last_result "restore" "ok" "$detail"
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
    -e POSTGRES_INITDB_ARGS="--lc-collate=C --lc-ctype=en_US.utf8" \
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
    local label pg_user db_name dump_file _container _volume _app
    IFS=: read -r label _container pg_user db_name _volume dump_file _app <<< "$target"
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
    if ! pg_create_c_database "$DRILL_PG_CONTAINER" postgres "$db_name" >/dev/null 2>&1; then
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
    # 本番のリストアと同じ関数で作っているので、ここで C でなければ
    # 本番へ戻したときも libc 依存の並びになる。
    local drill_collate
    drill_collate=$(docker exec "$DRILL_PG_CONTAINER" psql -U postgres -d "$db_name" -tAc \
      "SELECT datcollate FROM pg_database WHERE datname = current_database();" 2>/dev/null | tr -d '\r\n ')
    if [[ "$drill_collate" != "C" ]]; then
      err "$label: restored database collation is ${drill_collate:-unknown}, not C."
      (( drill_fail++ )) || true
      continue
    fi

    if [[ "${table_count:-0}" -gt 0 ]]; then
      # 本番のリストアと同じ照合（ダンプの COPY の行数 = 復元後の実件数）
      if verify_pg_counts_against_dump "$label" "$dir/$dump_file.sql" "$DRILL_PG_CONTAINER" postgres "$db_name"; then
        ok "$label restored (件数一致: $VERIFIED_COUNTS_SUMMARY)"
        (( drill_ok++ )) || true
      else
        (( drill_fail++ )) || true
      fi
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
    local label container db_path fname _volume _app
    IFS=: read -r label container db_path _volume fname _app <<< "$target"
    local archive="$dir/$fname.tar.gz"

    if [[ ! -f "$archive" ]]; then
      warn "$label: not in this backup"
      (( drill_skip++ )) || true
      continue
    fi
    # better-sqlite3 はアプリイメージにしか無いので、稼働中のコンテナを借りる。
    # 本番データには触れない（/tmp へ写したものを readonly で開くだけ）。
    if ! is_container_running "$container"; then
      warn "$label: skipped ($container is not running)"
      (( drill_skip++ )) || true
      continue
    fi

    local probe_out="" rc=0 tables rows
    probe_out=$(sqlite_probe_archive "$container" "$archive" "$(basename "$db_path")" "$fname") || rc=$?
    case $rc in
      0)
        read -r tables rows <<< "$probe_out"
        if [[ "${tables:-0}" -gt 0 ]]; then
          ok "$label restored ($tables tables / $rows rows, integrity ok)"
          (( drill_ok++ )) || true
        else
          err "$label: restored database has no tables"
          (( drill_fail++ )) || true
        fi
        ;;
      2) err "$label: $(basename "$db_path") is missing from $fname.tar.gz"; (( drill_fail++ )) || true ;;
      3) err "$label: could not copy the restored database into $container"; (( drill_fail++ )) || true ;;
      *) err "$label: restored database failed verification"; (( drill_fail++ )) || true ;;
    esac
  done
}

# 残骸を掃いた回はその件数も last-run に残す（理由は sweep_stale_restore_work）。
_drill_stale_suffix() {
  if [[ "${STALE_WORK_SWEPT:-0}" -gt 0 ]]; then
    printf ' swept=%s' "$STALE_WORK_SWEPT"
  fi
  return 0
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
      ops_write_last_result "drill" "no-backup" "対象の暗号化バックアップがありません"
      return 1
    fi
  fi

  if [[ ! -f "$archive" || "$archive" != *.tar.gz.enc ]]; then
    err "Encrypted backup not found: $requested"
    ops_write_last_result "drill" "no-backup" "requested=$requested"
    return 1
  fi

  echo "Target: $(basename "$archive")"
  echo ""

  if ! extract_encrypted_backup "$archive"; then
    ops_write_last_result "drill" "decrypt-failed" "$(basename "$archive")"
    return 1
  fi
  if ! verify_backup_manifest "$EXTRACTED_BACKUP_PATH"; then
    ops_write_last_result "drill" "manifest-failed" "$(basename "$archive")"
    return 1
  fi
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
    ops_write_last_result "drill" "failed" \
      "$(basename "$archive") ok=$drill_ok skipped=$drill_skip failed=$drill_fail$(_drill_stale_suffix)"
    echo ""
    return 1
  fi
  # 1件も復元していない回を ok と書かない（cmd_backup の no-data と同じ扱い）。
  # 全部 skip でも drill_fail は 0 なので、ここが無いと「訓練は成功している」
  # という記録だけが残り、実際には何も検証していない状態が隠れる。
  if [[ $drill_ok -eq 0 ]]; then
    warn "Nothing was actually restored; this drill verified nothing."
    ops_write_last_result "drill" "no-data" \
      "$(basename "$archive") ok=0 skipped=$drill_skip$(_drill_stale_suffix)"
    echo ""
    return 1
  fi
  ok "All drilled databases restored cleanly."
  ops_write_last_result "drill" "ok" \
    "$(basename "$archive") ok=$drill_ok skipped=$drill_skip$(_drill_stale_suffix)"
  echo ""
}

# 定期的な掃除。専用のスケジュールタスクは作らず、既に起きている
# ウォッチドッグ（cmd_due）に乗せる ── 無人タスクを増やすほど
# 「消えたのに誰も気づかない」対象が増える。
#
# ただし**ドリルの付属物にしてはいけない**。以前はこれを cmd_drill の
# 最後の1行として呼んでいた。ドリル自身の記録はその手前で書かれるので、
# 2026-10-04 にドリル成功の直後（ビルドキャッシュの削除中）にプロセスが
# 落ちたとき、ドリルは ok のまま掃除だけ記録を失った。そして掃除を呼ぶ
# 経路が「次に成功する週次ドリル」しか無かったため、4時間毎に
# ウォッチドッグが起きているのに**9日間直せなかった**（警告しきい値 192h に
# 対して唯一の駆動元が 168h 周期＝余裕が無く、ドリルを1回取りこぼすだけで
# 警告が確定する）。いまは cmd_due の独立した項目なので、中断されても
# 数時間後の次の回で再試行される。
#
# manage.sh prune を呼ばず ops_docker_prune を直に呼ぶのは、この時点で
# すでに操作ロック（due）を握っているため（再入できず自分と衝突する）。
run_scheduled_prune() {
  print_banner "Docker Cleanup"
  if ops_docker_prune; then
    ops_write_last_result "prune" "ok" "scheduled / ${OPS_PRUNE_DETAIL:-done}"
    echo ""
    return 0
  fi
  warn "Docker の掃除に失敗しました"
  ops_write_last_result "prune" "failed" "scheduled / ${OPS_PRUNE_DETAIL:-failed}"
  echo ""
  return 1
}

# リロードループの検知は manage.sh へ委譲する（URL からアプリを引く表も
# ゲートウェイのログの読み方もあちら側にしかない）。ロックはこちらが握った
# ままでよい ── loop-check は docker logs を読むだけでコンテナに触らない。
run_scheduled_loop_check() {
  "$SCRIPT_DIR/manage.sh" loop-check
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

# ------------------------------------
# 世代保持（GFS）
# ------------------------------------
# 判定は必ず**ファイル名の日付**で行う。mtime は当てにならない
# （外部コピー・リストア・ウイルス対策のいずれでも書き換わりうる）。
# 名前は is_full_backup_name が保証する YYYY-MM-DD_HHMMSS 形式なので、
# 先頭10文字がそのまま日付になる。

# その日付が属する週の始まり（月曜）を YYYY-MM-DD で返す。
backup_week_key() {
  local date_part="$1" dow
  # %u = 1(月)〜7(日)。date -d が無い環境ではここで失敗する。
  dow=$(date -d "$date_part" +%u 2>/dev/null) || return 1
  date -d "$date_part -$((dow - 1)) days" +%Y-%m-%d 2>/dev/null || return 1
}

# 残すべきバックアップ名を1行ずつ出す。
#
# 「消す方」ではなく「残す方」を決めるのが要点。消す条件を並べると、
# 条件の抜けがそのままデータの消失になる。残す集合を作って、
# そこに無いものだけを消せば、抜けは「消し損ね」にしかならない。
select_backups_to_keep() {
  [[ $# -gt 0 ]] || return 0
  local names=("$@")
  local keep_days="$FULL_BACKUP_RETENTION_DAYS"
  local keep_weeks="$WEEKLY_BACKUP_RETENTION_WEEKS"
  local keep_months="$MONTHLY_BACKUP_RETENTION_MONTHS"

  local today_epoch cutoff_daily
  today_epoch=$(date +%s)
  cutoff_daily=$(( today_epoch - keep_days * 86400 ))

  local seen_weeks=() seen_months=()
  local name date_part epoch week_key month_key k found

  # 新しい順に見る。各週・各月で最初に出会ったものがその期間の代表。
  local sorted=()
  while IFS= read -r name; do
    [[ -n "$name" ]] && sorted+=("$name")
  done < <(printf '%s\n' "${names[@]}" | sort -r)

  # 最新の1本だけは無条件で残す。
  # 全部が保持期間より古い（＝しばらくバックアップが走っていなかった）場合、
  # 素直に窓で判定すると残す集合が空になり、**次の1本が出来る前に
  # 手持ちの全世代を消す**ことになる。時計のずれでも同じことが起きうる。
  printf '%s\n' "${sorted[0]}"

  for name in "${sorted[@]:1}"; do
    date_part="${name:0:10}"
    epoch=$(date -d "$date_part" +%s 2>/dev/null) || { printf '%s\n' "$name"; continue; }

    # 1. 日次
    if [[ $epoch -ge $cutoff_daily ]]; then
      printf '%s\n' "$name"
      continue
    fi

    # 2. 週次
    if week_key=$(backup_week_key "$date_part"); then
      if [[ $epoch -ge $(( today_epoch - keep_weeks * 7 * 86400 )) ]]; then
        found=0
        for k in ${seen_weeks[@]+"${seen_weeks[@]}"}; do
          [[ "$k" == "$week_key" ]] && { found=1; break; }
        done
        if [[ $found -eq 0 ]]; then
          seen_weeks+=("$week_key")
          printf '%s\n' "$name"
          continue
        fi
      fi
    fi

    # 3. 月次
    month_key="${date_part:0:7}"
    if [[ $epoch -ge $(( today_epoch - keep_months * 31 * 86400 )) ]]; then
      found=0
      for k in ${seen_months[@]+"${seen_months[@]}"}; do
        [[ "$k" == "$month_key" ]] && { found=1; break; }
      done
      if [[ $found -eq 0 ]]; then
        seen_months+=("$month_key")
        printf '%s\n' "$name"
        continue
      fi
    fi
  done
}

# 通常のバックアップ（pre-restore を除く）に GFS を適用する。
#
# pre-restore_* はリストア直前の保険でしかなく、世代として積む意味が無いので
# これまで通り日数だけで消す。
prune_full_backups() {
  local dir="$1"
  [[ -d "$dir" ]] || return 0

  # date -d が使えない環境（BSD date 等）では日付が一切引けない。
  # そのときは従来の日数だけの方式へ落とす ── 黙って全部残すと
  # ディスクが埋まり、黙って全部消すと復旧手段が消える。
  if ! date -d "2020-01-01" +%s >/dev/null 2>&1; then
    warn "date -d が使えないため世代保持を行いません（日数のみで削除します）"
    remove_old_dirs "$dir" "????-??-??_??????" "$FULL_BACKUP_RETENTION_DAYS"
    remove_old_files "$dir" "????-??-??_??????.tar.gz.enc" "$FULL_BACKUP_RETENTION_DAYS"
    return 0
  fi

  local names=() entry base
  while IFS= read -r entry; do
    base=$(basename "$entry")
    base="${base%.tar.gz.enc}"
    is_full_backup_name "$base" || continue
    [[ "$base" == pre-restore_* ]] && continue
    names+=("$base")
  done < <(find "$dir" -maxdepth 1 \( -name '????-??-??_??????' -o -name '????-??-??_??????.tar.gz.enc' \) 2>/dev/null)

  [[ ${#names[@]} -eq 0 ]] && return 0

  # 同じ世代がディレクトリと暗号化ファイルの両方で存在しうるので、名前で一意化する。
  local unique=()
  while IFS= read -r base; do
    [[ -n "$base" ]] && unique+=("$base")
  done < <(printf '%s\n' "${names[@]}" | sort -u)

  local keep_list
  keep_list=$(select_backups_to_keep "${unique[@]}")

  local kept=0 removed=0
  for base in "${unique[@]}"; do
    if printf '%s\n' "$keep_list" | grep -qx "$base"; then
      (( kept++ )) || true
      continue
    fi
    [[ -d "$dir/$base" ]] && rm -rf "$dir/$base" 2>/dev/null || true
    [[ -f "$dir/$base.tar.gz.enc" ]] && rm -f "$dir/$base.tar.gz.enc" 2>/dev/null || true
    echo "  Deleting: $base"
    (( removed++ )) || true
  done

  echo "  Kept: $kept generation(s)  Deleted: $removed"
}

# ------------------------------------
# 外部（別ドライブ／NAS）へのコピー
# ------------------------------------
# 同じPCの docker/backups/ にしか無いバックアップは、ドライブが壊れた瞬間に
# バックアップごと消える。ランサムウェアなら暗号化済みアーカイブごと持って行かれる。
#
# コピー先は ~/.tax-apps/backup-external-dest（リポジトリの外）に書く。
# **未設定なら何もしない**（警告も記録も出さない）。設定されているのに
# 書けないときだけ記録を残す ── 「設定したつもりで効いていない」が
# 一番危ないため。
copy_backup_to_external() {
  local archive="$1"
  local dest

  if ! dest=$(ops_external_backup_dest); then
    return 0
  fi

  echo ""
  echo "External copy: $dest"

  if [[ ! -d "$dest" ]]; then
    warn "コピー先が見つかりません: $dest"
    echo "  外付けドライブが外れているか、NAS に繋がっていない可能性があります。"
    echo "  設定ファイル: $(to_win_path "$OPS_EXTERNAL_DEST_FILE")"
    ops_write_last_result "backup-external" "unavailable" "dest not mounted"
    return 1
  fi

  if ! cp "$archive" "$dest/"; then
    warn "外部コピーに失敗しました: $(basename "$archive")"
    ops_write_last_result "backup-external" "failed" "$(basename "$archive")"
    return 1
  fi

  # コピー先でも世代を絞る。外部側は「最後の砦」なので日数は本体と揃える。
  local ext_removed=0 entry base keep_list names=()
  while IFS= read -r entry; do
    base=$(basename "$entry")
    base="${base%.tar.gz.enc}"
    is_full_backup_name "$base" || continue
    [[ "$base" == pre-restore_* ]] && continue
    names+=("$base")
  done < <(find "$dest" -maxdepth 1 -name '????-??-??_??????.tar.gz.enc' 2>/dev/null)

  if [[ ${#names[@]} -gt 0 ]] && date -d "2020-01-01" +%s >/dev/null 2>&1; then
    keep_list=$(select_backups_to_keep "${names[@]}")
    for base in "${names[@]}"; do
      printf '%s\n' "$keep_list" | grep -qx "$base" && continue
      rm -f "$dest/$base.tar.gz.enc" 2>/dev/null || true
      echo "  Deleting (external): $base"
      (( ext_removed++ )) || true
    done
  fi

  echo "  Copied: $(basename "$archive")"
  ops_write_last_result "backup-external" "ok" "$(basename "$archive")"
  return 0
}

# ------------------------------------
# 期限切れの無人処理をまとめて実行する（ウォッチドッグからの入口）
# ------------------------------------
# なぜ時刻トリガーに任せないのか: ここのタスクはすべて LogonType Interactive
# なので、ログオンセッションが無い間は1つも動かない。つまり「毎日 3:00」の
# ようなトリガーは、その時刻に PC が起きていなければ StartWhenAvailable の
# 追いつき実行だけが頼りになる。この PC ではそれが当てにならず、記録に残る
# 9回のバックアップのうち定刻(3:00)に走ったのは1回だけ、2026-09-22 と
# 2026-09-28 は追いつきもせず丸ごと失われた。
#
# そこで「いつ走るか」をスケジュールから last-run の記録へ移す。タスクの役目は
# ウォッチドッグを起こすことだけで、何を実行するかは前回の成功時刻が決める。
# 起こされる回数が増えても、しきい値より新しい成功があればスキップするので
# 二重取得にはならない（「日次」が「PCを使った日に1回」になる）。
#
# **しきい値は OPS_WATCHED_RESULTS の警告しきい値より必ず小さくすること**
# （backup: 20h < 30h / drill: 168h < 192h / prune: 144h < 192h /
# reload-loop: 3h < 24h）。
# 逆転すると「警告を出してから実行する」順序になり、デスクトップの警告が
# 毎回ウソをつく。掃除だけ警告しきい値から2日離してあるのは、以前これが
# ドリルの付属物で、駆動元の周期（168h）と警告しきい値（192h）がほぼ
# 同じだったために1回取りこぼすだけで必ず警告が出ていたから。
DUE_BACKUP_HOURS="${TAX_APPS_DUE_BACKUP_HOURS:-20}"
DUE_DRILL_HOURS="${TAX_APPS_DUE_DRILL_HOURS:-168}"
DUE_PRUNE_HOURS="${TAX_APPS_DUE_PRUNE_HOURS:-144}"
DUE_LOOPCHECK_HOURS="${TAX_APPS_DUE_LOOPCHECK_HOURS:-3}"

# 記録が無い（一度も成功していない）ときは期限切れとして扱う。
_due_needed() {
  local name="$1" threshold="$2" age status
  status=$(ops_last_result_field "$name" status) || return 0
  [[ "$status" == "ok" ]] || return 0
  age=$(ops_last_result_age_hours "$name") || return 0
  [[ "$age" -ge "$threshold" ]]
}

# cmd_backup / cmd_drill を if の条件に直接置くと、bash はその中まで errexit を
# 止める。途中の想定外の失敗が無視されて最後の集計だけで ok になりうるので、
# サブシェルで set -e を張り直してから終了コードだけ受け取る。
_due_run() {
  local rc=0
  set +e
  ( set -e; "$@" )
  rc=$?
  set -e
  return "$rc"
}

cmd_due() {
  print_banner "Tax Apps - Due Unattended Work"

  # タスクの生存確認は cmd_backup の中からだけでなくここでも呼ぶ。両方
  # スキップした回でも通るようにするため（スキップした日に確認が飛ぶと、
  # タスクが消えたことに気づく経路がその日だけ欠ける）。
  ensure_watchdog_task

  local status="ok" backup_state="skip" drill_state="skip" prune_state="skip" loop_state="skip"

  if _due_needed "backup" "$DUE_BACKUP_HOURS"; then
    if _due_run cmd_backup; then
      backup_state="ran"
    else
      backup_state="failed"
      status="failed"
    fi
  else
    echo "バックアップ: ${DUE_BACKUP_HOURS}時間以内に成功しているのでスキップ（$(ops_format_last_result backup)）"
    echo ""
  fi

  # バックアップの後に回すのは、直前に取れた最新のアーカイブで訓練できるから。
  if _due_needed "drill" "$DUE_DRILL_HOURS"; then
    if _due_run cmd_drill; then
      drill_state="ran"
    else
      drill_state="failed"
      status="failed"
    fi
  else
    echo "リストア訓練: ${DUE_DRILL_HOURS}時間以内に成功しているのでスキップ（$(ops_format_last_result drill)）"
    echo ""
  fi

  # 掃除はバックアップ・ドリルの成否に関わらず判定する。ドリルが失敗した回に
  # 掃除まで一緒に止まると、駆動元が1つしか無かった以前の形に戻ってしまう。
  if _due_needed "prune" "$DUE_PRUNE_HOURS"; then
    if _due_run run_scheduled_prune; then
      prune_state="ran"
    else
      prune_state="failed"
      status="failed"
    fi
  else
    echo "Dockerの掃除: ${DUE_PRUNE_HOURS}時間以内に成功しているのでスキップ（$(ops_format_last_result prune)）"
    echo ""
  fi

  # ループ検知も他の3つの成否に依存させない。こちらは何も作らず何も消さない
  # 読み取りだけの処理なので、バックアップが失敗した回でも走らせて困らない。
  if _due_needed "reload-loop" "$DUE_LOOPCHECK_HOURS"; then
    if _due_run run_scheduled_loop_check; then
      loop_state="ran"
    else
      # ループを見つけた回もここへ来る（検知は last-run の failed で残る）。
      loop_state="failed"
      status="failed"
    fi
  else
    echo "ループ検知: ${DUE_LOOPCHECK_HOURS}時間以内に成功しているのでスキップ（$(ops_format_last_result reload-loop)）"
    echo ""
  fi

  # ウォッチドッグ(PowerShell)が読む唯一の行。日本語のログ行はコンソールの
  # コードページ次第で拾えないため、連絡は ASCII 1行に限る。
  echo "DUE_RESULT status=$status backup=$backup_state drill=$drill_state prune=$prune_state loop=$loop_state"
  [[ "$status" == "ok" ]]
}

COMMAND="${1:-help}"
case "$COMMAND" in
  # 無人で走る3つは待つ。ログオン直後に日次バックアップ・週次ドリル・
  # ウォッチドッグが -StartWhenAvailable でまとめて起き、必ず誰かが負ける。
  # 数分待てば全部順番に通るので、その回を捨てる理由が無い。
  # 待ち時間はタスク側の ExecutionTimeLimit より十分短くしてある。
  backup|drill|itcm|due)
    check_dependencies
    # itcm は backup-db.bat が使う歴史的な別名でしかない。ロックの持ち主表示も
    # 直近結果の記録も backup に寄せる（itcm 名義で記録すると status から見えない）。
    lock_action="$COMMAND"
    if [[ "$lock_action" == "itcm" ]]; then lock_action="backup"; fi
    acquire_operation_lock "$lock_action" "$(ops_default_lock_wait 900)" || exit 1
    ;;
  # restore / verify は人が見ている前提なので待たない。
  restore|verify)
    check_dependencies
    acquire_operation_lock "$COMMAND" "$(ops_default_lock_wait 120)" || exit 1
    ;;
esac

case "$COMMAND" in
  backup)  cmd_backup ;;
  restore) cmd_restore "${@:2}" ;;
  verify)  cmd_verify "${2:-}" ;;
  drill)   cmd_drill "${2:-}" ;;
  # Keep the historical command name used by backup-db.bat, but create the
  # same encrypted, restorable full backup as the main backup command.
  itcm)    cmd_backup ;;
  # 期限切れのものだけを実行する。ウォッチドッグからの入口。
  due)     cmd_due ;;
  *)
    echo "Usage: $0 {backup|restore [app|--all] [backup] [--yes]|verify <backup>|drill [backup]|due|itcm}"
    exit 1
    ;;
esac
