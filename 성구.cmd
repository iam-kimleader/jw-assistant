@echo off
rem Short entry point for the scripture lookup tool. See README.md for usage.
rem
rem NOTE: this file must stay ASCII-only. cmd.exe reads batch files with the OEM
rem code page, not UTF-8, so Korean comments here get mis-parsed and their bytes
rem are executed as commands. The project's Korean-comment rule cannot apply to
rem a .cmd body; the Korean explanation lives in README.md instead.
rem
rem Data paths are resolved relative to the repository root, so move there first.
pushd "%~dp0"
node --no-warnings scripts\lookup.mjs %*
set LOOKUP_EXIT=%ERRORLEVEL%
popd
exit /b %LOOKUP_EXIT%
