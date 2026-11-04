$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
$cli = "C:\Users\31957\.dsh\profiles\web\node_modules\dsh-media-gen\scripts\gen-image.mjs"
$imgDir = Join-Path $root "assets\img"
New-Item -ItemType Directory -Force -Path $imgDir | Out-Null

$jsonPath = Join-Path $PSScriptRoot "prompts.json"
$prompts = [System.IO.File]::ReadAllText($jsonPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$log = Join-Path $PSScriptRoot "gen-images.log"
Set-Content -Path $log -Value "start" -Encoding UTF8

foreach ($item in $prompts) {
  $name = $item.name
  try {
    $raw = & node $cli $item.prompt --size $item.size 2>&1
    $last = $raw | Select-Object -Last 1
    $json = $last | ConvertFrom-Json
    if ($json.file -and (Test-Path $json.file)) {
      $dest = Join-Path $imgDir ($name + ".jpg")
      Copy-Item -LiteralPath $json.file -Destination $dest -Force
      Add-Content -Path $log -Value ("OK  " + $name + "  " + $json.file) -Encoding UTF8
    } else {
      Add-Content -Path $log -Value ("BAD " + $name + "  " + $last) -Encoding UTF8
    }
  } catch {
    Add-Content -Path $log -Value ("ERR " + $name + "  " + $_.Exception.Message) -Encoding UTF8
  }
}
Add-Content -Path $log -Value "DONE" -Encoding UTF8
