$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$bundledNode = "C:\Users\30742\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$node = $null

if (Test-Path $bundledNode) {
  $node = $bundledNode
} else {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCommand) {
    $node = $nodeCommand.Source
  }
}

if (-not $node) {
  throw "未找到 Node.js。请安装 Node.js，或在 Codex 环境中运行。"
}

$url = "http://127.0.0.1:4738"
$alreadyReady = $false

try {
  Invoke-RestMethod "$url/api/dashboard" | Out-Null
  $alreadyReady = $true
} catch {
  $alreadyReady = $false
}

if (-not $alreadyReady) {
  Start-Process -FilePath $node -ArgumentList "server.js" -WorkingDirectory $root -WindowStyle Hidden
}

$ready = $false

for ($i = 0; $i -lt 20; $i += 1) {
  try {
    Invoke-RestMethod "$url/api/dashboard" | Out-Null
    $ready = $true
    break
  } catch {
    Start-Sleep -Milliseconds 300
  }
}

if (-not $ready) {
  throw "得背单词服务启动超时。"
}

Start-Process $url
Write-Host "得背单词已启动：$url"
