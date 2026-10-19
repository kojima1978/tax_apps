#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "$0")" && pwd)
source "$script_dir/../lib/compose-build.sh"

test_dir=$(mktemp -d)
PROJECT_ROOT="$test_dir/project with spaces"
calls_file="$test_dir/calls"
mkdir -p "$PROJECT_ROOT/docker/scripts" "$PROJECT_ROOT/apps/example" "$test_dir/external"
cleanup() {
  rm -f "$calls_file"
  rmdir "$PROJECT_ROOT/docker/scripts" "$PROJECT_ROOT/docker" \
    "$PROJECT_ROOT/apps/example" "$PROJECT_ROOT/apps" "$PROJECT_ROOT" \
    "$test_dir/external" "$test_dir"
}
trap cleanup EXIT

docker_status=0
docker() {
  printf '%s\0' "$PWD" "$@" >> "$calls_file"
  return "$docker_status"
}

expected_args=(compose -f "$PROJECT_ROOT/apps/example/docker-compose.yml" \
  -f "$PROJECT_ROOT/apps/example/docker-compose.prod.yml" up -d --build --remove-orphans)
for caller_dir in "$PROJECT_ROOT" "$PROJECT_ROOT/docker/scripts" \
  "$PROJECT_ROOT/apps/example" "$test_dir/external"; do
  (
    cd "$caller_dir"
    : > "$calls_file"
    compose_from_project_root "${expected_args[@]:1}"
    [[ "$PWD" == "$caller_dir" ]]
    mapfile -d '' -t invocation < "$calls_file"
    [[ "${invocation[0]}" == "$PROJECT_ROOT" ]]
    [[ ${#invocation[@]} -eq $((${#expected_args[@]} + 1)) ]]
    for index in "${!expected_args[@]}"; do
      [[ "${invocation[index + 1]}" == "${expected_args[index]}" ]]
    done
  )
done

docker_status=7
: > "$calls_file"
if compose_from_project_root "${expected_args[@]:1}"; then
  printf 'ビルド失敗が成功扱いになりました\n' >&2
  exit 1
else
  [[ $? -eq 7 ]]
fi
mapfile -d '' -t invocation < "$calls_file"
[[ ${#invocation[@]} -eq $((${#expected_args[@]} + 1)) ]]
printf 'Compose の作業場所・引数・呼び出し元・失敗時の終了コード: OK\n'
