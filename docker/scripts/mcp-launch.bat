@echo off
rem ============================================================
rem Launcher registered in claude_desktop_config.json (setup-mcp.sh).
rem   "command": "cmd.exe", "args": ["/d", "/c", "<this file>"]
rem
rem Claude Desktop may start before Docker Desktop. A bare "docker run"
rem then fails at once and is never retried. mcp-wait-docker.ps1 waits
rem for the engine and checks the image and the network first.
rem
rem stdout is the MCP channel: nothing but the server may write to it.
rem The helper gets stdin from nul (it must not eat "initialize") and its
rem stdout is sent to stderr. Messages go to the Claude MCP log.
rem The wait (seconds) can be changed with TAX_APPS_MCP_DOCKER_WAIT.
rem Extra arguments (e.g. -e SVF_API_BASE=...) are passed to docker run.
rem
rem ASCII only: cmd.exe reads .bat files in the console codepage (932).
rem ============================================================
setlocal
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0mcp-wait-docker.ps1" <nul 1>&2
if errorlevel 1 exit /b 1
docker run -i --rm --network tax-apps-network %* tax-apps-mcp
exit /b %errorlevel%
