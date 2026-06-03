<#
  Auto-start the server at login WITHOUT administrator rights, by dropping a hidden
  launcher into the current user's Startup folder. This is the easiest option.

      npm run startup:install -w @targetgoals/server
  or:
      powershell -ExecutionPolicy Bypass -File apps/server/scripts/install-startup.ps1

  (For a true Windows service that runs before login, use install-service.ps1 from an
  elevated/admin PowerShell instead.)
#>

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..')).Path
$startup = [Environment]::GetFolderPath('Startup')
$vbsPath = Join-Path $startup 'TargetGoalsTasksServer.vbs'

$vbs = @"
' Auto-starts the TargetGoals Tasks server at login, hidden (no console window).
' Delete this file to disable auto-start.
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "$RepoRoot"
WshShell.Run "cmd /c npm run start:server", 0, False
"@

Set-Content -Path $vbsPath -Value $vbs -Encoding ASCII
Write-Host "Installed auto-start launcher:"
Write-Host "  $vbsPath"

# Start it now so you don't have to log out/in.
Start-Process wscript.exe -ArgumentList "`"$vbsPath`""
Start-Sleep -Seconds 4
Write-Host "Started the server (hidden). Open http://localhost:4000/pair for the token."
Write-Host "Disable later with: npm run startup:uninstall -w @targetgoals/server"
