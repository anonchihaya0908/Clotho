#!/usr/bin/env pwsh
# Clotho Monorepo 验证脚本
# 验证 npm workspaces 设置是否正确

Write-Host "🔍 Clotho Monorepo 验证" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

$ErrorCount = 0

# 1. 验证 workspaces 配置
Write-Host "`n📦 Step 1: 验证 workspaces 配置..." -ForegroundColor Yellow

try {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    if ($packageJson.workspaces) {
        Write-Host "✅ Workspaces 配置存在" -ForegroundColor Green
        Write-Host "   工作区: $($packageJson.workspaces -join ', ')" -ForegroundColor Gray
    }
    else {
        Write-Host "❌ 未找到 workspaces 配置" -ForegroundColor Red
        $ErrorCount++
    }
    
    if ($packageJson.private -eq $true) {
        Write-Host "✅ 根项目正确设置为 private" -ForegroundColor Green
    }
    else {
        Write-Host "❌ 根项目应设置为 private" -ForegroundColor Red
        $ErrorCount++
    }
}
catch {
    Write-Host "❌ 无法读取 package.json: $_" -ForegroundColor Red
    $ErrorCount++
}

# 2. 验证依赖安装
Write-Host "`n📚 Step 2: 验证依赖安装..." -ForegroundColor Yellow

if (Test-Path "node_modules") {
    Write-Host "✅ 根目录 node_modules 存在" -ForegroundColor Green
    
    # 检查是否有前端的符号链接
    if (Test-Path "node_modules\visual-editor-clang-format-webview") {
        Write-Host "✅ 前端 workspace 正确链接" -ForegroundColor Green
    }
    else {
        Write-Host "❌ 前端 workspace 链接缺失" -ForegroundColor Red
        $ErrorCount++
    }
}
else {
    Write-Host "❌ node_modules 不存在，请运行 npm install" -ForegroundColor Red
    $ErrorCount++
}

# 3. 验证前端构建产物
Write-Host "`n🔨 Step 3: 验证构建产物..." -ForegroundColor Yellow

$webviewDist = "webviews\visual-editor\clang-format\dist"
if (Test-Path $webviewDist) {
    $jsFile = "$webviewDist\index.js"
    $cssFile = "$webviewDist\index.css"
    
    if (Test-Path $jsFile) {
        Write-Host "✅ 前端 JavaScript 构建产物存在" -ForegroundColor Green
    }
    else {
        Write-Host "❌ 前端 JavaScript 构建产物缺失" -ForegroundColor Red
        $ErrorCount++
    }
    
    if (Test-Path $cssFile) {
        Write-Host "✅ 前端 CSS 构建产物存在" -ForegroundColor Green
    }
    else {
        Write-Host "❌ 前端 CSS 构建产物缺失" -ForegroundColor Red
        $ErrorCount++
    }
}
else {
    Write-Host "❌ 前端构建目录不存在，请运行构建" -ForegroundColor Red
    $ErrorCount++
}

# 4. 验证扩展构建产物
if (Test-Path "out\bundle.js") {
    Write-Host "✅ 扩展构建产物存在" -ForegroundColor Green
}
else {
    Write-Host "❌ 扩展构建产物缺失" -ForegroundColor Red
    $ErrorCount++
}

# 5. 测试 workspace 命令
Write-Host "`n⚡ Step 4: 测试 workspace 命令..." -ForegroundColor Yellow

try {
    npm ls --workspace=visual-editor-clang-format-webview --depth=0 >$null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Workspace 命令正常工作" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Workspace 命令失败" -ForegroundColor Red
        $ErrorCount++
    }
}
catch {
    Write-Host "❌ Workspace 命令测试失败: $_" -ForegroundColor Red
    $ErrorCount++
}

# 6. 验证管理脚本
Write-Host "`n🛠️ Step 5: 验证管理脚本..." -ForegroundColor Yellow

if (Test-Path "manage.ps1") {
    Write-Host "✅ 管理脚本存在" -ForegroundColor Green
}
else {
    Write-Host "❌ 管理脚本缺失" -ForegroundColor Red
    $ErrorCount++
}

if (Test-Path "WORKSPACE_README.md") {
    Write-Host "✅ Workspace 文档存在" -ForegroundColor Green
}
else {
    Write-Host "❌ Workspace 文档缺失" -ForegroundColor Red
    $ErrorCount++
}

# 总结
Write-Host "`n📊 验证总结" -ForegroundColor Cyan
Write-Host "============" -ForegroundColor Cyan

if ($ErrorCount -eq 0) {
    Write-Host "🎉 所有验证通过！Monorepo 设置完美！" -ForegroundColor Green
    Write-Host ""
    Write-Host "接下来您可以：" -ForegroundColor Cyan
    Write-Host "1. 使用 .\manage.ps1 help 查看所有命令" -ForegroundColor White
    Write-Host "2. 使用 .\manage.ps1 dev 启动开发模式" -ForegroundColor White
    Write-Host "3. 使用 .\manage.ps1 build -Production 生产构建" -ForegroundColor White
    Write-Host "4. 阅读 WORKSPACE_README.md 了解详细用法" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 开始享受统一的开发体验吧！" -ForegroundColor Green
}
else {
    Write-Host "❌ 发现 $ErrorCount 个问题需要修复" -ForegroundColor Red
    Write-Host ""
    Write-Host "建议的修复步骤：" -ForegroundColor Yellow
    Write-Host "1. 确保在根目录运行：npm install" -ForegroundColor White
    Write-Host "2. 构建前端：.\manage.ps1 webview" -ForegroundColor White
    Write-Host "3. 构建扩展：.\manage.ps1 extension" -ForegroundColor White
    Write-Host "4. 重新运行此验证脚本" -ForegroundColor White
    
    exit 1
}

Write-Host ""
Write-Host "💡 提示：查看 WORKSPACE_README.md 获取完整的使用指南" -ForegroundColor Cyan
