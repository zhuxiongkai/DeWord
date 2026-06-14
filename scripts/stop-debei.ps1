$connections = Get-NetTCPConnection -LocalPort 4738 -State Listen -ErrorAction SilentlyContinue
$processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $processIds) {
  Stop-Process -Id $processId -Force
}

if ($processIds) {
  Write-Host "得背单词服务已停止。"
} else {
  Write-Host "没有发现正在运行的得背单词服务。"
}
