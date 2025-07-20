# Clotho Extension Development Test Script
# 快速测试扩展的 PowerShell 脚本

Write-Host "🔨 Building Clotho extension..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host "📦 Generated files:" -ForegroundColor Cyan
    Get-ChildItem -Path ".\out" | ForEach-Object { 
        Write-Host "  - $($_.Name) ($([math]::Round($_.Length/1KB, 2)) KB)" -ForegroundColor Gray
    }
    
    Write-Host "`n🚀 Starting VS Code for testing..." -ForegroundColor Yellow
    code --extensionDevelopmentPath=. --new-window
}
else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
