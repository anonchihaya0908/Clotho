#!/usr/bin/env pwsh
# Clotho Monorepo Management Script
# 使用 npm workspaces 统一管理整个项目

param(
    [string]$Action = "help",
    [switch]$Watch,
    [switch]$Clean,
    [switch]$Production
)

Write-Host "🏗️ Clotho Monorepo Manager" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

$OriginalLocation = Get-Location

function Show-Help {
    Write-Host ""
    Write-Host "Usage: .\manage.ps1 <action> [options]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Actions:" -ForegroundColor Cyan
    Write-Host "  install     - Install all dependencies for the entire monorepo" -ForegroundColor White
    Write-Host "  build       - Build both extension and webview" -ForegroundColor White
    Write-Host "  clean       - Clean all build artifacts" -ForegroundColor White
    Write-Host "  dev         - Start development mode" -ForegroundColor White
    Write-Host "  webview     - Manage webview only" -ForegroundColor White
    Write-Host "  extension   - Manage extension only" -ForegroundColor White
    Write-Host "  test        - Run tests" -ForegroundColor White
    Write-Host "  package     - Package the extension for distribution" -ForegroundColor White
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  -Watch      - Enable watch mode (where applicable)" -ForegroundColor White
    Write-Host "  -Clean      - Clean before building" -ForegroundColor White
    Write-Host "  -Production - Build in production mode" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Green
    Write-Host "  .\manage.ps1 install" -ForegroundColor Gray
    Write-Host "  .\manage.ps1 build -Production" -ForegroundColor Gray
    Write-Host "  .\manage.ps1 webview -Watch" -ForegroundColor Gray
    Write-Host "  .\manage.ps1 dev" -ForegroundColor Gray
}

function Invoke-WorkspaceCommand {
    param(
        [string]$Workspace,
        [string]$Script,
        [string]$Description
    )
    
    Write-Host "📦 $Description..." -ForegroundColor Yellow
    
    if ($Workspace -eq "root") {
        npm run $Script
    }
    else {
        npm run $Script --workspace=$Workspace
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $Description completed" -ForegroundColor Green
    }
    else {
        Write-Host "❌ $Description failed" -ForegroundColor Red
        exit 1
    }
}

function Install-All {
    Write-Host "📦 Installing all dependencies..." -ForegroundColor Yellow
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All dependencies installed" -ForegroundColor Green
        Write-Host "📊 Workspace status:" -ForegroundColor Cyan
        npm ls --workspaces
    }
    else {
        Write-Host "❌ Installation failed" -ForegroundColor Red
        exit 1
    }
}

function Build-All {
    if ($Clean) {
        Clean-All
    }
    
    Write-Host "🔨 Building entire monorepo..." -ForegroundColor Yellow
    
    # 构建前端
    $buildMode = if ($Production) { "build" } else { "dev" }
    Invoke-WorkspaceCommand -Workspace "visual-editor-clang-format-webview" -Script $buildMode -Description "Building webview"
    
    # 构建扩展
    $extensionScript = if ($Production) { "vscode:prepublish" } else { "compile" }
    Invoke-WorkspaceCommand -Workspace "root" -Script $extensionScript -Description "Building extension"
    
    Write-Host "🎉 Full build completed!" -ForegroundColor Green
}

function Clean-All {
    Write-Host "🧹 Cleaning all build artifacts..." -ForegroundColor Yellow
    
    # 清理扩展
    if (Test-Path "out") {
        Remove-Item "out" -Recurse -Force
        Write-Host "✅ Cleaned extension output" -ForegroundColor Green
    }
    
    # 清理前端
    if (Test-Path "webviews\visual-editor\clang-format\dist") {
        Remove-Item "webviews\visual-editor\clang-format\dist" -Recurse -Force
        Write-Host "✅ Cleaned webview output" -ForegroundColor Green
    }
    
    # 可选：清理node_modules
    if ($Clean -and (Test-Path "node_modules")) {
        $choice = Read-Host "Do you want to clean node_modules as well? (y/N)"
        if ($choice -eq "y" -or $choice -eq "Y") {
            Remove-Item "node_modules" -Recurse -Force
            Write-Host "✅ Cleaned node_modules" -ForegroundColor Green
        }
    }
}

function Start-Development {
    Write-Host "🚀 Starting development mode..." -ForegroundColor Yellow
    
    # 首先构建前端
    Invoke-WorkspaceCommand -Workspace "visual-editor-clang-format-webview" -Script "build" -Description "Building webview for development"
    
    # 启动扩展开发模式
    if ($Watch) {
        Write-Host "🔄 Starting watch mode..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-Command", "npm run webview:dev" -NoNewWindow
        Start-Sleep 2
        npm run dev:watch
    }
    else {
        npm run dev
    }
}

function Manage-Webview {
    $script = if ($Watch) { "dev" } else { "build" }
    $description = if ($Watch) { "Starting webview in watch mode" } else { "Building webview" }
    
    Invoke-WorkspaceCommand -Workspace "visual-editor-clang-format-webview" -Script $script -Description $description
}

function Manage-Extension {
    if ($Clean) {
        if (Test-Path "out") {
            Remove-Item "out" -Recurse -Force
        }
    }
    
    $script = if ($Watch) { "esbuild:watch" } else { "compile" }
    $description = if ($Watch) { "Starting extension in watch mode" } else { "Building extension" }
    
    Invoke-WorkspaceCommand -Workspace "root" -Script $script -Description $description
}

function Test-All {
    Write-Host "🧪 Running tests..." -ForegroundColor Yellow
    
    # 首先确保构建是最新的
    Build-All
    
    # 运行测试
    npm run test
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All tests passed" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Tests failed" -ForegroundColor Red
        exit 1
    }
}

function Package-Extension {
    Write-Host "📦 Packaging extension..." -ForegroundColor Yellow
    
    # 生产模式构建
    $Production = $true
    Build-All
    
    # 打包
    npm run package
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Extension packaged successfully" -ForegroundColor Green
        Write-Host "📁 Look for .vsix file in the current directory" -ForegroundColor Cyan
    }
    else {
        Write-Host "❌ Packaging failed" -ForegroundColor Red
        exit 1
    }
}

# 主逻辑
try {
    switch ($Action.ToLower()) {
        "help" { Show-Help }
        "install" { Install-All }
        "build" { Build-All }
        "clean" { Clean-All }
        "dev" { Start-Development }
        "webview" { Manage-Webview }
        "extension" { Manage-Extension }
        "test" { Test-All }
        "package" { Package-Extension }
        default {
            Write-Host "❌ Unknown action: $Action" -ForegroundColor Red
            Show-Help
            exit 1
        }
    }
}
catch {
    Write-Host "❌ Script failed: $_" -ForegroundColor Red
    exit 1
}
finally {
    Set-Location $OriginalLocation
}

Write-Host ""
Write-Host "🎉 Done!" -ForegroundColor Green
