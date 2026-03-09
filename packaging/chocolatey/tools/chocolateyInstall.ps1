$ErrorActionPreference = 'Stop'

$packageName = 'stubidp'
$url64       = 'URL_PLACEHOLDER'
$checksum64  = 'SHA256_PLACEHOLDER'

$toolsDir = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"
$destination = Join-Path $toolsDir 'stubidp.exe'

Get-ChocolateyWebFile `
  -PackageName   $packageName `
  -FileFullPath  $destination `
  -Url64bit      $url64 `
  -Checksum64    $checksum64 `
  -ChecksumType64 'sha256'

Write-Host "stubidp installed to $destination"
