# Membuat dist/chrome (Chrome/Edge) dan dist/firefox dari src/, plus zip untuk store.
# Chrome memakai background.service_worker, Firefox memakai background.scripts.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue
foreach ($t in "chrome", "firefox") {
  Copy-Item src "dist\$t" -Recurse
}
$m = Get-Content src\manifest.json -Raw | ConvertFrom-Json
$m.background = @{ scripts = @("background.js") }
$m | Add-Member browser_specific_settings @{ gecko = @{
  id = "privacy-shield-wa@example.local"
  strict_min_version = "128.0"
  data_collection_permissions = @{ required = @("none"); optional = @("cameraData") }
} }
[IO.File]::WriteAllText("$PWD\dist\firefox\manifest.json", ($m | ConvertTo-Json -Depth 10), (New-Object Text.UTF8Encoding $false))
foreach ($t in "chrome", "firefox") {
  tar -a -c -f "dist\privacy-shield-$t.zip" -C "dist\$t" .
}
Write-Host "OK: dist\chrome, dist\firefox, dan zip untuk store"
