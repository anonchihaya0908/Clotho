/**
 * Preview Service
 * 负责为 Clang-Format 配置选项生成预览代码
 * 将预览逻辑与配置元数据解耦
 */

import { ConfigCategories } from '../../common/types/clang-format-shared';
import { CLANG_FORMAT_OPTIONS } from './data/clang-format-options-database';

/**
 * 配置键到预览模板的映射接口
 */
interface KeywordToTemplateMapping {
  keywords: string[];
  template: string;
}

/**
 * 预览代码生成服务
 * 根据配置项的类型和用途动态生成合适的预览代码
 */
export class PreviewService {
  private static readonly PREVIEW_TEMPLATES = {
    // 对齐相关预览模板
    ALIGNMENT: {
      BRACKET_ALIGN: `function(argument1,
         argument2,
         argument3);`,

      CONSECUTIVE_ASSIGNMENTS: `int a = 1;
int bb = 2;
int ccc = 3;`,

      CONSECUTIVE_DECLARATIONS: `int a;
int bb;
int ccc;`,

      MACRO_DEFINITIONS: `#define A 1
#define BB 2
#define CCC 3`,
    },

    // 大括号相关预览模板
    BRACES: {
      BRACE_WRAPPING: `if (condition) {
  statement;
}`,

      BREAK_BEFORE_BRACES: `if (condition)
{
  statement;
}`,

      COMPACT_NAMESPACES: `namespace A { namespace B {
  function();
}}`,
    },

    // 间距相关预览模板
    SPACING: {
      SPACES_AROUND_OPERATORS: `a = b + c;
x *= y;`,

      SPACES_IN_BRACKETS: `array[index];
func(arg1, arg2);`,

      SPACES_IN_PARENTHESES: `if ( condition ) {
  func( argument );
}`,
    },

    // 缩进相关预览模板
    INDENTATION: {
      TAB_WIDTH: `function() {
\tstatement1;
\tstatement2;
}`,

      INDENT_WIDTH: `if (condition) {
  statement1;
  statement2;
}`,

      CONTINUATION_INDENT: `function(veryLongParameterName,
        anotherLongParameterName);`,
    },

    // 换行相关预览模板
    WRAPPING: {
      COLUMN_LIMIT: `// This is a very long comment that might exceed the column limit
function veryLongFunctionName(parameter1, parameter2, parameter3);`,

      BREAK_BEFORE_BINARY_OPERATORS: `bool value = argument1 &&
             argument2 &&
             argument3;`,

      ALLOW_SHORT_FUNCTIONS: `int getX() { return x; }
int getLongFunctionName() {
  return value;
}`,
    },

    // 注释相关预览模板
    COMMENTS: {
      REFLOW_COMMENTS: `// This is a long comment that might need to be
// reflowed to fit within the column limit`,

      SPACE_BEFORE_COMMENTS: `statement;    // comment
anotherStatement; // another comment`,
    },

    // 通用模板
    GENERAL: {
      DEFAULT: `void function() {
  if (condition) {
    statement;
  }
}`,

      CLASS_DEFINITION: `class MyClass {
public:
  void method();
private:
  int member;
};`,

      NAMESPACE: `namespace MyNamespace {
  void function();
}`,
    },
  };

  /**
     * 配置关键词到预览模板的映射表
     * 使用数组存储关键词，支持多关键词匹配
     */
  private static readonly KEYWORD_TO_TEMPLATE_MAP: KeywordToTemplateMapping[] = [
    // 对齐相关
    { keywords: ['alignafteropen'], template: PreviewService.PREVIEW_TEMPLATES.ALIGNMENT.BRACKET_ALIGN },
    { keywords: ['alignconsecutiveassignments'], template: PreviewService.PREVIEW_TEMPLATES.ALIGNMENT.CONSECUTIVE_ASSIGNMENTS },
    { keywords: ['alignconsecutivedeclarations'], template: PreviewService.PREVIEW_TEMPLATES.ALIGNMENT.CONSECUTIVE_DECLARATIONS },
    { keywords: ['alignconsecutivemacros'], template: PreviewService.PREVIEW_TEMPLATES.ALIGNMENT.MACRO_DEFINITIONS },

    // 大括号相关
    { keywords: ['bracewrapping', 'wrapbraces'], template: PreviewService.PREVIEW_TEMPLATES.BRACES.BRACE_WRAPPING },
    { keywords: ['breakbeforebraces'], template: PreviewService.PREVIEW_TEMPLATES.BRACES.BREAK_BEFORE_BRACES },
    { keywords: ['compactnamespaces'], template: PreviewService.PREVIEW_TEMPLATES.BRACES.COMPACT_NAMESPACES },

    // 间距相关
    { keywords: ['spacesinparentheses'], template: PreviewService.PREVIEW_TEMPLATES.SPACING.SPACES_IN_PARENTHESES },
    { keywords: ['spacesinbrackets', 'spacesinsquare'], template: PreviewService.PREVIEW_TEMPLATES.SPACING.SPACES_IN_BRACKETS },
    { keywords: ['spacearound', 'spacebefore', 'spaceafter'], template: PreviewService.PREVIEW_TEMPLATES.SPACING.SPACES_AROUND_OPERATORS },

    // 缩进相关
    { keywords: ['tabwidth'], template: PreviewService.PREVIEW_TEMPLATES.INDENTATION.TAB_WIDTH },
    { keywords: ['indentwidth', 'indent'], template: PreviewService.PREVIEW_TEMPLATES.INDENTATION.INDENT_WIDTH },
    { keywords: ['continuation'], template: PreviewService.PREVIEW_TEMPLATES.INDENTATION.CONTINUATION_INDENT },

    // 换行相关
    { keywords: ['columnlimit'], template: PreviewService.PREVIEW_TEMPLATES.WRAPPING.COLUMN_LIMIT },
    { keywords: ['breakbefore', 'binary'], template: PreviewService.PREVIEW_TEMPLATES.WRAPPING.BREAK_BEFORE_BINARY_OPERATORS },
    { keywords: ['allowshort', 'function'], template: PreviewService.PREVIEW_TEMPLATES.WRAPPING.ALLOW_SHORT_FUNCTIONS },

    // 注释相关
    { keywords: ['reflowcomments'], template: PreviewService.PREVIEW_TEMPLATES.COMMENTS.REFLOW_COMMENTS },
    { keywords: ['spacebeforecomments'], template: PreviewService.PREVIEW_TEMPLATES.COMMENTS.SPACE_BEFORE_COMMENTS },

    // 类和命名空间相关
    { keywords: ['class', 'access'], template: PreviewService.PREVIEW_TEMPLATES.GENERAL.CLASS_DEFINITION },
    { keywords: ['namespace'], template: PreviewService.PREVIEW_TEMPLATES.GENERAL.NAMESPACE },
  ];

  /**
     * 根据配置项生成预览代码
     * @param key 配置项的键名
     * @param category 配置项的分类
     * @param type 配置项的类型
     * @returns 生成的预览代码
     */
  public static generatePreviewCode(
    key: string,
    category: ConfigCategories,
    _type: 'boolean' | 'number' | 'string' | 'enum' // eslint-disable-line @typescript-eslint/no-unused-vars
  ): string {
    // 首先尝试从数据库中获取专门的预览模板
    const option = CLANG_FORMAT_OPTIONS.find(opt => opt.key === key);
    if (option && option.previewTemplate) {
      return option.previewTemplate;
    }

    // 优先根据特定的键名生成预览
    const specificPreview = this.getSpecificPreview(key);
    if (specificPreview) {
      return specificPreview;
    }

    // 根据分类生成通用预览
    return this.getCategoryPreview(category);
  }

  /**
     * 根据特定的配置项键名获取预览代码
     * 使用映射表替代冗长的 if 语句，提高性能和可维护性
     */
  private static getSpecificPreview(key: string): string | null {
    const keyLower = key.toLowerCase();

    // 遍历映射表，查找匹配的关键词
    for (const mapping of this.KEYWORD_TO_TEMPLATE_MAP) {
      // 检查是否所有关键词都在配置键中出现
      const allKeywordsMatch = mapping.keywords.every(keyword =>
        keyLower.includes(keyword.toLowerCase())
      );

      if (allKeywordsMatch) {
        return mapping.template;
      }
    }

    return null;
  }

  /**
     * 根据分类获取通用预览代码
     */
  private static getCategoryPreview(category: ConfigCategories): string {
    switch (category) {
      case ConfigCategories.ALIGNMENT:
        return this.PREVIEW_TEMPLATES.ALIGNMENT.CONSECUTIVE_ASSIGNMENTS;

      case ConfigCategories.BRACES:
        return this.PREVIEW_TEMPLATES.BRACES.BRACE_WRAPPING;

      case ConfigCategories.SPACING:
        return this.PREVIEW_TEMPLATES.SPACING.SPACES_AROUND_OPERATORS;

      case ConfigCategories.INDENTATION:
        return this.PREVIEW_TEMPLATES.INDENTATION.INDENT_WIDTH;

      case ConfigCategories.WRAPPING:
        return this.PREVIEW_TEMPLATES.WRAPPING.COLUMN_LIMIT;

      case ConfigCategories.COMMENTS:
        return this.PREVIEW_TEMPLATES.COMMENTS.REFLOW_COMMENTS;

      case ConfigCategories.CPP_FEATURES:
        return this.PREVIEW_TEMPLATES.GENERAL.CLASS_DEFINITION;

      case ConfigCategories.POINTERS_REFS:
        return 'int* ptr;\nconst char* str;';

      case ConfigCategories.EMPTY_LINES:
        return 'statement1;\n\nstatement2;';

      case ConfigCategories.MISC:
      case ConfigCategories.BASIC:
      default:
        return this.PREVIEW_TEMPLATES.GENERAL.DEFAULT;
    }
  }
}
