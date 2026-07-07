# Abre o Chrome com remote debugging na porta 9222
# Execute: .\start-chrome-debug.ps1

$porta = 9222
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"

# Verifica se já está rodando na porta
$portaAtiva = Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue

if ($portaAtiva) {
    Write-Host "Chrome ja esta ouvindo na porta $porta. Pronto para dev-browser --connect." -ForegroundColor Green
} else {
    Write-Host "Abrindo Chrome com --remote-debugging-port=$porta ..." -ForegroundColor Yellow
    Start-Process $chrome "--remote-debugging-port=$porta --no-first-run --no-default-browser-check"
    Start-Sleep -Seconds 2
    Write-Host "Chrome iniciado. Porta $porta ativa." -ForegroundColor Green
}

Write-Host ""
Write-Host "Para conectar via dev-browser, use no Claude Code:" -ForegroundColor Cyan
Write-Host '  @" ... "@ | dev-browser --connect' -ForegroundColor White
