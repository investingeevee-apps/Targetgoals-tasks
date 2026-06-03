<#
  Removes the no-admin Startup-folder auto-start launcher.
      npm run startup:uninstall -w @targetgoals/server
#>

$ErrorActionPreference = 'Stop'

$startup = [Environment]::GetFolderPath('Startup')
$vbsPath = Join-Path $startup 'TargetGoalsTasksServer.vbs'

if (Test-Path $vbsPath) {
  Remove-Item $vbsPath -Force
  Write-Host "Removed auto-start launcher: $vbsPath"
  Write-Host "A server started this session keeps running until reboot — stop 'node' in Task Manager to stop it now."
} else {
  Write-Host "No Startup launcher found ($vbsPath)."
}
