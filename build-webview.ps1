#!/usr/bin/env pwsh
# Build script for Clotho webview frontend

param(
    [switch]$Watch,
    [switch]$Clean,
    [switch]$Dev
)

Write-Host "Clotho Webview Build Script" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

$WebviewDir = "webviews\visual-editor\clang-format"
$OriginalLocation = Get-Location

try {
    # Clean if requested
    if ($Clean) {
        Write-Host "Cleaning webview dist..." -ForegroundColor Yellow
        if (Test-Path "$WebviewDir\dist") {
            Remove-Item "$WebviewDir\dist" -Recurse -Force
            Write-Host "✓ Cleaned dist directory" -ForegroundColor Green
        }
        if (Test-Path "$WebviewDir\node_modules") {
            Remove-Item "$WebviewDir\node_modules" -Recurse -Force
            Write-Host "✓ Cleaned node_modules" -ForegroundColor Green
        }
    }

    # Check if webview directory exists
    if (-not (Test-Path $WebviewDir)) {
        Write-Host "❌ Webview directory not found: $WebviewDir" -ForegroundColor Red
        exit 1
    }

    # Navigate to webview directory
    Set-Location $WebviewDir

    # Check if package.json exists
    if (-not (Test-Path "package.json")) {
        Write-Host "❌ package.json not found in webview directory" -ForegroundColor Red
        exit 1
    }

    # Install dependencies if node_modules doesn't exist
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing webview dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
            exit 1
        }
        Write-Host "✓ Dependencies installed" -ForegroundColor Green
    }

    # Build the webview
    if ($Watch) {
        Write-Host "Starting webview in watch mode..." -ForegroundColor Yellow
        npm run dev
    }
    elseif ($Dev) {
        Write-Host "Building webview in development mode..." -ForegroundColor Yellow
        npm run build -- --mode development
    }
    else {
        Write-Host "Building webview for production..." -ForegroundColor Yellow
        npm run build
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Webview build completed successfully" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Webview build failed" -ForegroundColor Red
        exit 1
    }

}
catch {
    Write-Host "❌ Build script failed: $_" -ForegroundColor Red
    exit 1
}
finally {
    # Return to original location
    Set-Location $OriginalLocation
}

Write-Host ""
Write-Host "Build completed!" -ForegroundColor Green
Write-Host "You can now compile the extension and test the clang-format editor." -ForegroundColor Cyan
