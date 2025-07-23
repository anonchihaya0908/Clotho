# 面板可见性智能管理功能实现报告

## 功能描述
实现了当用户切换 Clang-Format Editor 标签或关闭标签时，预览编辑器自动关闭；当用户切回来时，预览编辑器自动重新打开的功能。这样可以最小化视觉割裂感，提供更连贯的用户体验。

## 用户需求分析
当 Clang-Format Editor 面板不可见时（例如用户切换到其他标签），预览编辑器继续显示在第二列会造成：
1. **视觉割裂**：预览编辑器"孤零零"地留在那里，用户不清楚它的作用
2. **认知负担**：用户可能忘记这个编辑器是什么，或者误以为是普通文档
3. **工作流干扰**：占用编辑器空间，影响用户的正常工作

## 解决方案

### 1. 面板可见性监听
使用 VS Code 的 `onDidChangeViewState` API 监听 webview 面板的可见性变化：

```typescript
this.panel.onDidChangeViewState(async (e) => {
    if (e.webviewPanel.visible) {
        // 面板变为可见，重新打开预览编辑器
    } else {
        // 面板变为不可见，关闭预览编辑器
    }
});
```

### 2. 智能状态管理
区分两种预览关闭情况：
- **用户主动关闭**：设置 `isMacroPreviewOpen = false`，显示占位符
- **面板不可见时的自动关闭**：只清理编辑器引用，保持 `isMacroPreviewOpen` 状态

### 3. 自动重新打开逻辑
当面板重新变为可见时：
```typescript
if (this.isMacroPreviewOpen && !this.previewEditor && this.currentPreviewUri) {
    // 重新打开预览编辑器
    this.previewEditor = await vscode.window.showTextDocument(this.currentPreviewUri, {
        viewColumn: vscode.ViewColumn.Two,
        preserveFocus: true,
        preview: false
    });
}
```

## 技术实现

### 代码文件：`coordinator.ts`

#### 1. 新增面板可见性监听器
```typescript
this.panel.onDidChangeViewState(async (e) => {
    if (e.webviewPanel.visible) {
        // 面板可见：重新打开预览编辑器
        if (this.isMacroPreviewOpen && !this.previewEditor && this.currentPreviewUri) {
            try {
                this.previewEditor = await vscode.window.showTextDocument(this.currentPreviewUri, {
                    viewColumn: vscode.ViewColumn.Two,
                    preserveFocus: true,
                    preview: false
                });
            } catch (error) {
                console.warn('⚠️ Failed to reopen preview editor when panel became visible:', error);
            }
        }
    } else {
        // 面板不可见：关闭预览编辑器
        if (this.previewEditor && this.currentPreviewUri) {
            await this.closePreviewEditor();
            this.previewEditor = undefined;
        }
    }
});
```

#### 2. 修改文档关闭事件监听器
```typescript
vscode.workspace.onDidCloseTextDocument(async (document) => {
    if (this.currentPreviewUri && document.uri.toString() === this.currentPreviewUri.toString()) {
        // 只有在面板可见时才认为是用户主动关闭预览
        if (this.panel && this.panel.visible) {
            this.isMacroPreviewOpen = false;
            this.previewEditor = undefined;
            await this.notifyPreviewClosed();
        } else {
            // 面板不可见时的关闭，只清理编辑器引用，不改变状态
            this.previewEditor = undefined;
        }
    }
});
```

#### 3. 修改可见编辑器变化监听器
类似地修改了 `onDidChangeVisibleTextEditors` 监听器，确保只有在面板可见时才处理用户主动关闭的情况。

## 用户体验改进

### 场景 1：用户切换标签
1. 用户正在使用 Clang-Format Editor
2. 用户切换到其他标签（如 `main.cpp`）
3. 预览编辑器自动关闭，清理视觉干扰
4. 用户切回 Clang-Format Editor 标签
5. 预览编辑器自动重新打开，恢复工作状态

### 场景 2：用户关闭 Clang-Format Editor
1. 用户关闭整个 Clang-Format Editor 面板
2. 预览编辑器自动关闭
3. 工作区恢复到使用编辑器之前的状态

### 场景 3：用户在面板可见时主动关闭预览
1. 用户点击预览编辑器的 X 按钮
2. 系统识别为用户主动关闭
3. 设置 `isMacroPreviewOpen = false`
4. 显示占位符界面
5. 即使后续面板切换，也不会自动重新打开预览

## 预期效果

### ✅ 解决的问题
1. **消除视觉割裂**：预览编辑器只在面板可见时显示
2. **减少认知负担**：用户不会被孤立的预览编辑器困惑
3. **改善工作流**：自动管理编辑器空间，不干扰用户的正常工作
4. **保持状态一致性**：正确区分用户主动关闭和系统自动关闭

### ✅ 用户体验提升
1. **无缝切换**：在不同标签间切换时，预览状态自动跟随
2. **智能恢复**：回到编辑器时，预览状态完全恢复
3. **零干扰**：离开编辑器时，完全清理视觉痕迹
4. **直观反馈**：用户的每个操作都有对应的视觉反馈

## 测试建议

### 测试场景
1. **标签切换测试**：
   - 打开 Clang-Format Editor
   - 切换到其他文件标签
   - 确认预览编辑器自动关闭
   - 切回 Clang-Format Editor
   - 确认预览编辑器自动重新打开

2. **面板关闭测试**：
   - 关闭整个 Clang-Format Editor 面板
   - 确认预览编辑器也自动关闭
   - 重新打开面板
   - 确认预览编辑器正常显示

3. **用户主动关闭测试**：
   - 在面板可见时关闭预览编辑器
   - 确认显示占位符
   - 切换标签后再切回
   - 确认占位符依然显示（不自动重新打开）

### 验证指标
- ✅ 面板不可见时预览编辑器自动关闭
- ✅ 面板重新可见时预览编辑器自动重新打开
- ✅ 用户主动关闭的状态得到正确保持
- ✅ 无意外的编辑器残留或重复打开

## 总结
通过监听面板可见性变化，我们实现了预览编辑器的智能显示/隐藏功能。这个功能大大改善了用户体验，消除了视觉割裂感，让 Clang-Format Editor 的使用更加自然和流畅。

关键的设计决策是区分"用户主动关闭"和"系统自动关闭"，确保用户的意图得到正确理解和保持。这种智能化的状态管理让工具的行为更符合用户的直觉预期。
