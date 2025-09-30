"""
提取 clang-format-options-database.ts 中的中文字段并生成翻译模板

使用方法:
1. 运行此脚本生成 AI 翻译提示词
2. 将提示词发送给 ChatGPT/Claude 进行批量翻译
3. 将翻译结果合并到 bundle.l10n.json
"""

import re
import json

# 读取 TypeScript 文件
with open('src/visual-editor/clang-format/data/clang-format-options-database.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 提取所有配置项
pattern = r"\{\s*key:\s*'([^']+)',\s*name:\s*'([^']+)',\s*description:\s*'([^']+)',"
matches = re.findall(pattern, content)

print(f"找到 {len(matches)} 个配置项\n")
print("=" * 80)
print("AI 翻译提示词:")
print("=" * 80)
print()
print("请将以下 clang-format 配置项从中文翻译为英文 JSON 格式。")
print("保持专业术语准确性,参考 clang-format 官方文档。")
print()
print("输出格式示例:")
print('{')
print('  "clangFormat.option.BasedOnStyle.name": "Based On Style",')
print('  "clangFormat.option.BasedOnStyle.description": "The base coding style to inherit from..."')
print('}')
print()
print("待翻译内容:")
print()

# 生成翻译模板
translation_data = {}
for key, name, description in matches:
    print(f"配置项: {key}")
    print(f"  中文名称: {name}")
    print(f"  中文描述: {description}")
    print()
    
    translation_data[f"clangFormat.option.{key}.name"] = ""
    translation_data[f"clangFormat.option.{key}.description"] = ""

# 输出 JSON 模板
print("\n" + "=" * 80)
print("JSON 模板 (填写英文翻译):")
print("=" * 80)
print(json.dumps(translation_data, ensure_ascii=False, indent=2))
