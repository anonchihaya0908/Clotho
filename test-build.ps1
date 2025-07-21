#!/usr/bin/env pwsh
# 测试 Clotho 扩展构建流程

Write-Host "🧪 Testing Clotho Extension Build Process" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$ErrorCount = 0

# 1. 测试后端编译
Write-Host "`n📦 Step 1: Testing backend compilation..." -ForegroundColor Yellow
try {
    npm run compile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backend compilation successful" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Backend compilation failed" -ForegroundColor Red
        $ErrorCount++
    }
}
catch {
    Write-Host "❌ Backend compilation error: $_" -ForegroundColor Red
    $ErrorCount++
}

# 2. 检查关键文件
Write-Host "`n📁 Step 2: Checking essential files..." -ForegroundColor Yellow

$RequiredFiles = @(
    "out\bundle.js",
    "src\visual-editor\clang-format\coordinator.ts",
    "src\visual-editor\clang-format\format-service.ts",
    "src\visual-editor\clang-format\config-options.ts",
    "src\visual-editor\clang-format\types.ts",
    "webviews\visual-editor\clang-format\package.json",
    "webviews\visual-editor\clang-format\webpack.config.js"
)

foreach ($file in $RequiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ Found: $file" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Missing: $file" -ForegroundColor Red
        $ErrorCount++
    }
}

# 3. 测试前端依赖
Write-Host "`n🔧 Step 3: Testing frontend dependencies..." -ForegroundColor Yellow
$OriginalLocation = Get-Location
try {
    Set-Location "webviews\visual-editor\clang-format"
    
    if (Test-Path "package.json") {
        Write-Host "✅ Frontend package.json found" -ForegroundColor Green
        
        # 检查是否可以读取 package.json
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        if ($packageJson.dependencies.react) {
            Write-Host "✅ React dependency configured" -ForegroundColor Green
        }
        else {
            Write-Host "❌ React dependency missing" -ForegroundColor Red
            $ErrorCount++
        }
    }
    else {
        Write-Host "❌ Frontend package.json not found" -ForegroundColor Red
        $ErrorCount++
    }
}
catch {
    Write-Host "❌ Frontend dependency check failed: $_" -ForegroundColor Red
    $ErrorCount++
}
finally {
    Set-Location $OriginalLocation
}

# 4. 检查命令注册
Write-Host "`n⚡ Step 4: Checking command registration..." -ForegroundColor Yellow
try {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $commands = $packageJson.contributes.commands
    
    $clangFormatCommand = $commands | Where-Object { $_.command -eq "clotho.openClangFormatEditor" }
    if ($clangFormatCommand) {
        Write-Host "✅ Clang-format editor command registered" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Clang-format editor command not found" -ForegroundColor Red
        $ErrorCount++
    }
}
catch {
    Write-Host "❌ Command registration check failed: $_" -ForegroundColor Red
    $ErrorCount++
}

# 5. 总结
Write-Host "`n📊 Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

if ($ErrorCount -eq 0) {
    Write-Host "🎉 All tests passed! The clang-format editor is ready to use." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Build the webview frontend: .\build-webview.ps1" -ForegroundColor White
    Write-Host "2. Install the extension: F5 to run in a new Extension Development Host" -ForegroundColor White
    Write-Host "3. Test the editor: Ctrl+Shift+P -> 'Clotho: Open Clang-Format Visual Editor'" -ForegroundColor White
}
else {
    Write-Host "❌ Found $ErrorCount error(s). Please fix them before using the extension." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "For detailed usage instructions, see: docs\visual-editor-clang-format.md" -ForegroundColor Cyan
