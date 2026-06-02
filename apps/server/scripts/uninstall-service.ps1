<#
  Removes the TargetGoals Tasks auto-start scheduled task.
      npm run service:uninstall   (-w @targetgoals/server)
  or:
      powershell -ExecutionPolicy Bypass -File apps/server/scripts/uninstall-service.ps1
#>

$ErrorActionPreference = 'Stop'
$TaskName = 'TargetGoalsTasksServer'

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $existing) {
  Write-Host "No scheduled task named '$TaskName' found. Nothing to do."
  return
}

try { Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue } catch {}
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Removed scheduled task '$TaskName'. (The server process, if running, will stop on next reboot or stop it now via Task Manager.)"
