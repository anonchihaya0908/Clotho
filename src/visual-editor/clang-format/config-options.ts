/**
 * Clang-Format Configuration Options Metadata
 * 包含所有配置项的元数据和微观预览代码
 */

import { ClangFormatOption, ConfigCategories } from '../../common/types/index';

export const CLANG_FORMAT_OPTIONS: ClangFormatOption[] = [
    // Alignment 对齐相关
    {
        key: 'AlignAfterOpenBracket',
        name: 'Align After Open Bracket',
        description: 'If true, horizontally aligns arguments after an open bracket.',
        type: 'enum',
        defaultValue: 'Align',
        possibleValues: ['Align', 'DontAlign', 'AlwaysBreak', 'BlockIndent'],
        category: ConfigCategories.ALIGNMENT,
        microPreviewCode: `function(argument1,
         argument2,
         argument3);`
    },
    {
        key: 'AlignConsecutiveAssignments',
        name: 'Align Consecutive Assignments',
        description: 'If true, aligns consecutive assignments.',
        type: 'enum',
        defaultValue: 'inherit',
        possibleValues: ['inherit', 'None', 'Consecutive', 'AcrossEmptyLines', 'AcrossComments', 'AcrossEmptyLinesAndComments'],
        category: ConfigCategories.ALIGNMENT,
        microPreviewCode: `int a = 1;
int bb = 2;
int ccc = 3;`
    },
    {
        key: 'AlignConsecutiveDeclarations',
        name: 'Align Consecutive Declarations',
        description: 'If true, aligns consecutive declarations.',
        type: 'enum',
        defaultValue: 'inherit',
        possibleValues: ['inherit', 'None', 'Consecutive', 'AcrossEmptyLines', 'AcrossComments', 'AcrossEmptyLinesAndComments'],
        category: ConfigCategories.ALIGNMENT,
        microPreviewCode: `int a;
double bb;
char* ccc;`
    },
    {
        key: 'AlignConsecutiveMacros',
        name: 'Align Consecutive Macros',
        description: 'If true, aligns consecutive C/C++ preprocessor macros.',
        type: 'enum',
        defaultValue: 'inherit',
        possibleValues: ['inherit', 'None', 'Consecutive', 'AcrossEmptyLines', 'AcrossComments', 'AcrossEmptyLinesAndComments'],
        category: ConfigCategories.ALIGNMENT,
        microPreviewCode: `#define A 1
#define BB 22
#define CCC 333`
    },

    // Braces 大括号相关
    {
        key: 'BraceWrapping',
        name: 'Brace Wrapping',
        description: 'Control of individual brace wrapping cases.',
        type: 'string',
        defaultValue: 'Default',
        category: ConfigCategories.BRACES,
        microPreviewCode: `if (condition) {
    statement;
}`
    },
    {
        key: 'BreakBeforeBraces',
        name: 'Break Before Braces',
        description: 'The brace breaking style to use.',
        type: 'enum',
        defaultValue: 'Attach',
        possibleValues: ['Attach', 'Linux', 'Mozilla', 'Stroustrup', 'Allman', 'Whitesmiths', 'GNU', 'WebKit', 'Custom'],
        category: ConfigCategories.BRACES,
        microPreviewCode: `if (condition)
{
    statement;
}`
    },

    // Spacing 间距相关
    {
        key: 'SpaceBeforeParens',
        name: 'Space Before Parentheses',
        description: 'Defines in which cases to put a space before opening parentheses.',
        type: 'enum',
        defaultValue: 'ControlStatements',
        possibleValues: ['Never', 'ControlStatements', 'ControlStatementsExceptControlMacros', 'NonEmptyParentheses', 'Always', 'Custom'],
        category: ConfigCategories.SPACING,
        microPreviewCode: `if (condition) {
    function();
}`
    },
    {
        key: 'SpacesInParentheses',
        name: 'Spaces In Parentheses',
        description: 'If true, spaces will be inserted after ( and before ).',
        type: 'boolean',
        defaultValue: false,
        category: ConfigCategories.SPACING,
        microPreviewCode: `function( arg1, arg2 );
if ( condition ) {}`
    },

    // Indentation 缩进相关
    {
        key: 'IndentWidth',
        name: 'Indent Width',
        description: 'The number of columns to use for indentation.',
        type: 'integer',
        defaultValue: 2,
        category: ConfigCategories.INDENTATION,
        microPreviewCode: `if (condition) {
  statement;
  if (nested) {
    nested_statement;
  }
}`
    },
    {
        key: 'UseTab',
        name: 'Use Tab',
        description: 'The way to use tab characters in the resulting file.',
        type: 'enum',
        defaultValue: 'Never',
        possibleValues: ['Never', 'ForIndentation', 'ForContinuationAndIndentation', 'Always'],
        category: ConfigCategories.INDENTATION,
        microPreviewCode: `if (condition) {
	statement;
	if (nested) {
		nested_statement;
	}
}`
    },

    // Wrapping 换行相关
    {
        key: 'ColumnLimit',
        name: 'Column Limit',
        description: 'The column limit. A column limit of 0 means that there is no column limit.',
        type: 'integer',
        defaultValue: 80,
        category: ConfigCategories.WRAPPING,
        microPreviewCode: `function_with_very_long_name(argument1, argument2, argument3, argument4);`
    },
    {
        key: 'AllowShortFunctionsOnASingleLine',
        name: 'Allow Short Functions On A Single Line',
        description: 'Dependent on the value, short functions can be put on a single line.',
        type: 'enum',
        defaultValue: 'inherit',
        possibleValues: ['inherit', 'None', 'InlineOnly', 'Empty', 'Inline', 'All'],
        category: ConfigCategories.WRAPPING,
        microPreviewCode: `void shortFunction() { return; }

void anotherFunction() {
    statement;
}`
    },
    {
        key: 'AllowShortIfStatementsOnASingleLine',
        name: 'Allow Short If Statements On A Single Line',
        description: 'Dependent on the value, short if statements can be put on a single line.',
        type: 'enum',
        defaultValue: 'Never',
        possibleValues: ['Never', 'WithoutElse', 'OnlyFirstIf', 'AllIfsAndElse'],
        category: ConfigCategories.WRAPPING,
        microPreviewCode: `if (condition) return;
if (condition) { statement; }`
    },

    // Comments 注释相关
    {
        key: 'AlignTrailingComments',
        name: 'Align Trailing Comments',
        description: 'If true, aligns trailing comments.',
        type: 'boolean',
        defaultValue: true,
        category: ConfigCategories.COMMENTS,
        microPreviewCode: `int a = 1;  // comment
int bb = 2; // comment
int ccc = 3;// comment`
    },

    // General 常规设置
    {
        key: 'BasedOnStyle',
        name: 'Based On Style',
        description: 'The style used for all options not specifically set.',
        type: 'enum',
        defaultValue: 'LLVM',
        possibleValues: ['LLVM', 'Google', 'Chromium', 'Mozilla', 'WebKit', 'Microsoft', 'GNU'],
        category: ConfigCategories.GENERAL,
        microPreviewCode: `// LLVM/Google: Attach braces
class Example {
public:
    void method();
};

// Microsoft: Allman braces
class Example
{
public:
    void method();
};`
    }
];

// 完整的示例代码，用于宏观预览
export const MACRO_PREVIEW_CODE = `// This file is designed to demonstrate the effects of most clang-format options.

#include <vector>
#include <string>
#include <iostream>
#include <map>

// Namespace and Class Definitions
namespace my_very_long_namespace_name {
class LongNamedExampleClass : public AnotherBase {
public:
    LongNamedExampleClass(int value, const std::string& name) : value_(value), name_(name) {}

    void processData(const std::vector<int>& data, bool shouldSort = true) {
        if (data.empty()) return;
        for (auto it = data.begin(); it != data.end(); ++it) {
            if (*it > 0) { processPositiveValue(*it); } else { processNegativeValue(*it); }
        }
        if (shouldSort) { sortData(); }
    }

    // Short function for single-line formatting
    int getValue() { return value_; }

    template<typename T> void templateMethod(T&& value) {
        auto result = aVeryVeryVeryVeryLongFunctionNameThatExceedsTheColumnLimit(std::forward<T>(value), anotherParameter, yetAnotherParameter);
        if (result.has_value()) { handleResult(result.value()); }
    }

private:
    int value_; // Member variable 1
    std::string name_;   // Member variable 2
    bool isValid_; // Member variable 3

    void processPositiveValue(int val) { /* ... */ }
    void processNegativeValue(int val) { /* ... */ }
    void sortData() { /* ... */ }
};
} // namespace my_very_long_namespace_name

// Pointer and Reference Alignment
void pointerAlignmentExample(int* left, int * middle, int *right, const std::string& ref) {
    int* a=nullptr;
    char & b = ref[0];
}

// Consecutive Assignments and Declarations
void alignmentExample() {
    int         firstValue  = 1;
    double      secondValue = 2.0;
    const char* thirdValue  = "three";

    int alpha;
    double beta;
    const char* gamma;
}

// Control Statements and Braces
void controlStatements(bool condition1, bool condition2) {
    if (condition1) { std::cout << "Condition 1"; }
    else { std::cout << "Not Condition 1"; }

    while (condition2)
    {
        doSomething();
    }

    switch (an_enum_variable) {
    case A:
        statement;
        break;
    case B: {
        statement;
        break;
    }
    }
}

// C-Style Casts and Parentheses Spacing
int castExample() {
    return ( int ) ( 2.0 * ( 3.0 + 4.0) );
}

// Lambda Expressions
auto lambda = [] (int x, int y) -> int { return x + y; };

// Macro Definitions
#define MAX_SIZE 100
#define MIN_VALUE 0
#define DEFAULT_NAME "example"

// C++11 Braced List Initialization
std::vector<int> list = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15};
std::map<std::string, int> map = { {"key1", 1}, {"long_key_2", 2} };

// Concept (C++20)
template<typename T>
concept MyConcept = requires(T t) {
    { t.foo() } -> std::same_as<int>;
};

int main() {
    std::cout << "Clotho .clang-format Editor Preview" << std::endl;
    return 0;
}`;

// 默认的 clang-format 配置 - 最小化配置，让其他选项从预设风格继承
export const DEFAULT_CLANG_FORMAT_CONFIG: Record<string, any> = {
    BasedOnStyle: 'LLVM'
    // 其他配置项应该从选定的预设风格继承，而不是预先设定
};
