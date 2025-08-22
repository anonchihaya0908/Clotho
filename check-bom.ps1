$files = @(
    ".vscode\settings.json",
    ".vscode\keybindings.json", 
    ".vscode\launch.json",
    ".vscode\tasks.json",
    "package.json",
    "webviews\visual-editor\clang-format\package.json",
    "webviews\visual-editor\clang-format\tsconfig.json",
    "webviews\visual-editor\clang-format\.eslintrc.json"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $file).Path)
        $hasBOM = $bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF
        $status = if ($hasBOM) { "HAS BOM" } else { "NO BOM" }
        Write-Host "$file : $status"
        
        if ($hasBOM) {
            Write-Host "  First 10 bytes: $($bytes[0..9] | ForEach-Object { $_.ToString('X2') })"
        }
    } else {
        Write-Host "$file : FILE NOT FOUND"
    }
}
