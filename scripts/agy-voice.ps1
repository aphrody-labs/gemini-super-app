# PowerShell launcher connecting `agy` CLI with ANTIGRAVITY_MIC and Gemini Live Voice Hub
$ErrorActionPreference = "SilentlyContinue"
$env:ANTIGRAVITY_MIC = "127.0.0.1:24713"
[Environment]::SetEnvironmentVariable("ANTIGRAVITY_MIC", "127.0.0.1:24713", "User")

& "C:\Users\aphro\google\.venv\Scripts\python.exe" "C:\Users\aphro\google\scripts\voice_cli_trigger.py" --ensure-running --toggle-live on --surface agy_cli | Out-Null

Write-Host "✦ Gemini Live Voice Bridge active on ws://127.0.0.1:8765/ws/voice & ANTIGRAVITY_MIC=127.0.0.1:24713" -ForegroundColor Cyan
Write-Host "✦ Use /voice, /record, F5, or /voice-live inside agy CLI!" -ForegroundColor Magenta

if ($args.Count -gt 0) {
    & agy @args
} else {
    & agy
}
