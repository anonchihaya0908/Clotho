# Git 配置脚本
# 用于设置 Git 用户身份

Write-Host "=== Git 用户身份配置 ===" -ForegroundColor Cyan
Write-Host ""

# 获取用户输入
$userName = Read-Host "请输入您的 Git 用户名（例如：Togawa Sakiko）"
$userEmail = Read-Host "请输入您的 Git 邮箱（例如：your-email@example.com）"

Write-Host ""
Write-Host "配置信息：" -ForegroundColor Yellow
Write-Host "  用户名: $userName"
Write-Host "  邮箱:   $userEmail"
Write-Host ""

$confirm = Read-Host "确认配置？(y/n)"

if ($confirm -eq "y" -or $confirm -eq "Y") {
    # 全局配置
    git config --global user.name "$userName"
    git config --global user.email "$userEmail"
    
    Write-Host ""
    Write-Host "✅ Git 配置成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "当前配置：" -ForegroundColor Cyan
    git config --global user.name
    git config --global user.email
    Write-Host ""
    Write-Host "现在可以在 GitHub Desktop 中提交代码了！" -ForegroundColor Green
} else {
    Write-Host "❌ 配置已取消" -ForegroundColor Red
}

Write-Host ""
Write-Host "按任意键继续..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
