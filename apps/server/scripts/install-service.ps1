<#
  Registers the TargetGoals Tasks server to auto-start at logon as a hidden,
  self-restarting background task (Windows Task Scheduler). No extra dependencies.

  Run from the repo root or apps/server:
      npm run service:install   (-w @targetgoals/server)
  or directly:
      powershell -ExecutionPolicy Bypass -File apps/server/scripts/install-service.ps1

  Uninstall with install-service's sibling: uninstall-service.ps1
#>

$ErrorActionPreference = 'Stop'
$TaskName = 'TargetGoalsTasksServer'

# Repo root = three levels up from this script (apps/server/scripts -> repo root)
$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..')).Path
Write-Host "Repo root: $RepoRoot"

# Run the server hidden via PowerShell so no console window appears.
$inner = "Set-Location -LiteralPath '$RepoRoot'; npm run start:server"
$argument = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command `"$inner`""

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argument
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description 'TargetGoals Tasks self-hosted sync server' `
  -Force | Out-Null

Write-Host "Registered scheduled task '$TaskName' (auto-start at logon)."

# Start it now so you don't have to log out/in.
Start-ScheduledTask -TaskName $TaskName
Write-Host "Started '$TaskName'."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Open http://localhost:4000/pair to copy the pairing QR + token."
Write-Host "  2. For phone access, install Tailscale and set PUBLIC_URL in apps/server/.env"
Write-Host "     (ideally the 'tailscale serve' HTTPS URL). See docs/SELF-HOSTING.md."
Write-Host "  3. Manage later: Start-ScheduledTask / Stop-ScheduledTask -TaskName $TaskName"
