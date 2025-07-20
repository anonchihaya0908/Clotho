# Clangd 监控调试指南

## 问题
Windows 上无法检测到 clangd 进程的 PID

## 调试步骤

### 1. 检查clangd扩展状态
1. 确保已安装 "clangd" 扩展 (llvm-vs-code-extensions.vscode-clangd)
2. 打开一个 C/C++ 文件触发 clangd 激活
3. 查看状态栏左下角是否有 clangd 相关状态

### 2. 使用内置调试命令
1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 "Clotho: Debug Clangd Detection" 并执行
3. 查看开发者控制台 (`Help > Toggle Developer Tools > Console`) 的输出
4. 会显示详细的检测过程信息

### 3. 手动检查进程
在 PowerShell 中运行以下命令：
```powershell
# 方法 1: Get-Process
Get-Process -Name clangd -ErrorAction SilentlyContinue

# 方法 2: tasklist
tasklist /FI "IMAGENAME eq clangd.exe"

# 方法 3: wmic
wmic process where "name='clangd.exe'" get processid,commandline
```

### 4. 检查扩展 API
调试命令会显示：
- clangd 扩展是否找到
- 扩展是否激活
- API 是否可用
- 语言客户端状态
- 可用的客户端属性

### 5. 状态栏显示说明
- `⚡ Clangd: 245MB` - 正常运行
- `⚠️ Clangd: 1.2GB` - 内存使用警告
- `❌ Clangd: 2.5GB` - 内存使用过高
- `🚫 Clangd: Not Found` - 未找到进程

## 可能的解决方案

1. **重启 clangd**
   - 使用命令 "clangd: Restart language server"

2. **重新加载窗口**
   - `Ctrl+Shift+P` > "Developer: Reload Window"

3. **检查项目配置**
   - 确保有 `compile_commands.json` 或 `CMakeLists.txt`

4. **禁用/启用监控**
   - 在设置中搜索 "clotho.clangdMonitor.enabled"

## 监控配置
```json
{
  "clotho.clangdMonitor.enabled": true,
  "clotho.clangdMonitor.updateInterval": 3000,
  "clotho.clangdMonitor.showCpu": false,
  "clotho.clangdMonitor.warningThreshold": 1000,
  "clotho.clangdMonitor.errorThreshold": 2000
}
```
