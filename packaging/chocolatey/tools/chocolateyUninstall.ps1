$ErrorActionPreference = 'Stop'

$toolsDir = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"
$target = Join-Path $toolsDir 'stubidp.exe'

if (Test-Path $target) {
  Remove-Item $target -Force
  Write-Host "stubidp removed."
}
