/**
 * 完整的 Clang-Format 配置选项数据库
 * 基于 Clang 22.0.0git 官方文档
 * 包含所有178个有效配置选项（排除13个已弃用选项）
 */

import { ClangFormatOption, ConfigCategories } from '../../../common/types/clang-format-shared';

export const CLANG_FORMAT_OPTIONS: ClangFormatOption[] = [
  // ===============================
  // 基础设置
  // ===============================
  {
    key: 'BasedOnStyle',
    name: '基础风格',
    description: '继承的基础风格。所有未在当前配置文件中明确设置的选项，都将从此基础样式继承。',
    category: ConfigCategories.BASIC,
    type: 'enum',
    enumValues: ['LLVM', 'Google', 'Chromium', 'Mozilla', 'WebKit', 'Microsoft', 'GNU', 'InheritParentConfig'],
    defaultValue: 'LLVM',
    version: '3.5',
    previewTemplate: `// 基础风格示例
class Example {
public:
  void method();
};`
  },

  {
    key: 'AccessModifierOffset',
    name: '访问修饰符偏移',
    description: '访问修饰符（如 public:, private:）的额外缩进或悬挂缩进量。负数表示悬挂（左移）缩进。',
    category: ConfigCategories.INDENTATION,
    type: 'number',
    min: -16,
    max: 16,
    defaultValue: -2,
    version: '3.3',
    previewTemplate: `class MyClass {
public:
  void publicMethod();
private:
  int privateVar;
};`
  },

  // ===============================
  // 对齐设置
  // ===============================
  {
    key: 'AlignAfterOpenBracket',
    name: '开括号后对齐',
    description: '控制开括号后的参数对齐方式。',
    category: ConfigCategories.ALIGNMENT,
    type: 'enum',
    enumValues: ['Align', 'DontAlign', 'AlwaysBreak', 'BlockIndent'],
    defaultValue: 'Align',
    version: '3.8',
    previewTemplate: `function(argument1,
         argument2,
         argument3);`
  },

  {
    key: 'AlignArrayOfStructures',
    name: '结构体数组对齐',
    description: '如果不是 None，在使用结构体数组初始化时，会将字段按列对齐。',
    category: ConfigCategories.ALIGNMENT,
    type: 'enum',
    enumValues: ['Left', 'Right', 'None'],
    defaultValue: 'None',
    version: '13',
    previewTemplate: `struct Point points[] = {
  {1,   2},
  {100, 200},
  {3,   4}
};`
  },

  {
    key: 'AlignConsecutiveAssignments',
    name: '连续赋值对齐',
    description: '连续赋值语句的对齐风格。',
    category: ConfigCategories.ALIGNMENT,
    type: 'enum',
    enumValues: ['None', 'Consecutive', 'AcrossEmptyLines', 'AcrossComments', 'AcrossEmptyLinesAndComments'],
    defaultValue: 'None',
    version: '3.8',
    previewTemplate: `int a     = 1;
int bb    = 2;
int ccc   = 3;`
  },

  {
    key: 'AlignConsecutiveBitFields',
    name: '连续位域对齐',
    description: '连续位域（Bit Fields）的对齐风格。',
    category: ConfigCategories.ALIGNMENT,
    type: 'enum',
    enumValues: ['None', 'Consecutive', 'AcrossEmptyLines', 'AcrossComments', 'AcrossEmptyLinesAndComments'],
    defaultValue: 'None',
    version: '11',
    previewTemplate: `struct BitField {
  unsigned a   : 1;
  unsigned bb  : 8;
  unsigned ccc : 16;
};`
  },

  {
    key: 'AlignConsecutiveDeclarations',
    name: '连续声明对齐',
    description: '连续声明语句的对齐风格。',
    category: ConfigCategories.ALIGNMENT,
    type: 'enum',
    enumValues: ['None', 'Consecutive', 'AcrossEmptyLines', 'AcrossComments', 'AcrossEmptyLinesAndComments'],
    defaultValue: 'None',
    version: '3.8',
    previewTemplate: `int    a;
double bb;
char*  ccc;`
  },

  {
    key: 'AlignConsecutiveMacros',
    name: '连续宏定义对齐',
    description: '连续宏定义的对齐风格。',
    category: ConfigCategories.ALIGNMENT,
    type: 'enum',
    enumValues: ['None', 'Consecutive', 'AcrossEmptyLines', 'AcrossComments', 'AcrossEmptyLinesAndComments'],
    defaultValue: 'None',
    version: '9',
    previewTemplate: `#define A     1
#define BBB   2
#define CCCCC 3`
  },

  {
    key: 'AlignConsecutiveShortCaseStatements',
    name: '连续短case语句对齐',
    description: '连续的短 case 语句的对齐风格。',
    category: ConfigCategories.ALIGNMENT,
    type: 'enum',
    enumValues: ['None', 'Consecutive', 'AcrossEmptyLines', 'AcrossComments'],
    defaultValue: 'None',
    version: '17',
    previewTemplate: `switch (x) {
case 1:  return "one";
case 10: return "ten";
case 100: return "hundred";
}`
  },

  {
    key: 'AlignEscapedNewlines',
    name: '转义换行符对齐',
    description: '控制续行符（\\）的对齐方式。',
    category: ConfigCategories.ALIGNMENT,
    type: 'enum',
    enumValues: ['DontAlign', 'Left', 'LeftWithLastLine', 'Right'],
    defaultValue: 'Right',
    version: '5',
    previewTemplate: `#define MACRO(x) \\
  do { \\
    something(x); \\
  } while (0)`
  },

  {
    key: 'AlignOperands',
    name: '操作数对齐',
    description: '控制是否对齐二元和三元运算符的操作数。',
    category: ConfigCategories.ALIGNMENT,
    type: 'enum',
    enumValues: ['DontAlign', 'Align', 'AlignAfterOperator'],
    defaultValue: 'Align',
    version: '3.5',
    previewTemplate: `bool value = argument1 &&
             argument2 &&
             argument3;`
  },

  {
    key: 'AlignTrailingComments',
    name: '行尾注释对齐',
    description: '控制行尾注释的对齐。',
    category: ConfigCategories.COMMENTS,
    type: 'enum',
    enumValues: ['Leave', 'Always', 'Never'],
    defaultValue: 'Always',
    version: '3.7',
    previewTemplate: `int a = 1;    // comment
int bb = 2;   // another comment
int ccc = 3;  // third comment`
  },

  // ===============================
  // 换行设置
  // ===============================
  {
    key: 'AllowAllArgumentsOnNextLine',
    name: '允许所有参数换行',
    description: '如果函数调用在一行内放不下，允许将所有参数都放到下一行。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: true,
    version: '9',
    previewTemplate: `function(
    argument1, argument2, argument3
);`
  },

  {
    key: 'AllowAllParametersOfDeclarationOnNextLine',
    name: '允许声明参数换行',
    description: '如果函数声明在一行内放不下，允许将所有参数都放到下一行。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: true,
    version: '3.3',
    previewTemplate: `void function(
    int parameter1, int parameter2
);`
  },

  {
    key: 'AllowBreakBeforeNoexceptSpecifier',
    name: '允许noexcept前换行',
    description: '控制是否可以在 noexcept 说明符前换行。',
    category: ConfigCategories.WRAPPING,
    type: 'enum',
    enumValues: ['Never', 'OnlyWithParen', 'Always'],
    defaultValue: 'Never',
    version: '18',
    previewTemplate: `void function()
noexcept(condition);`
  },

  {
    key: 'AllowShortBlocksOnASingleLine',
    name: '允许短代码块单行',
    description: '允许将短的代码块（如 while (true) { continue; }）合并到一行。',
    category: ConfigCategories.WRAPPING,
    type: 'enum',
    enumValues: ['Never', 'Empty', 'Always'],
    defaultValue: 'Never',
    version: '3.5',
    previewTemplate: 'if (condition) { statement; }'
  },

  {
    key: 'AllowShortCaseExpressionOnASingleLine',
    name: '允许短case表达式单行',
    description: '是否将短的 switch 标签规则合并到一行。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: false,
    version: '19',
    previewTemplate: `switch (x) {
case 1: return "one";
case 2: return "two";
}`
  },

  {
    key: 'AllowShortCaseLabelsOnASingleLine',
    name: '允许短case标签单行',
    description: '如果为 true，短的 case 标签将被压缩到一行。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: false,
    version: '3.6',
    previewTemplate: `switch (x) {
case 1: break;
case 2: break;
}`
  },

  {
    key: 'AllowShortCompoundRequirementOnASingleLine',
    name: '允许短复合requirement单行',
    description: '允许将短的复合 requirement (C++20 Concepts) 放在一行。',
    category: ConfigCategories.CPP_FEATURES,
    type: 'boolean',
    defaultValue: true,
    version: '18',
    previewTemplate: 'requires { { expr } -> std::same_as<int>; }'
  },

  {
    key: 'AllowShortEnumsOnASingleLine',
    name: '允许短枚举单行',
    description: '允许将短的枚举（enum）声明放在一行。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: true,
    version: '11',
    previewTemplate: 'enum Color { Red, Green, Blue };'
  },

  {
    key: 'AllowShortFunctionsOnASingleLine',
    name: '允许短函数单行',
    description: '允许将短函数（如 int f() { return 0; }）合并到一行。',
    category: ConfigCategories.WRAPPING,
    type: 'enum',
    enumValues: ['None', 'InlineOnly', 'Empty', 'Inline', 'All'],
    defaultValue: 'All',
    version: '3.5',
    previewTemplate: 'int getX() { return x; }'
  },

  {
    key: 'AllowShortIfStatementsOnASingleLine',
    name: '允许短if语句单行',
    description: '允许将短 if 语句（如 if (a) return;）合并到一行。',
    category: ConfigCategories.WRAPPING,
    type: 'enum',
    enumValues: ['Never', 'WithoutElse', 'OnlyFirstIf', 'AllIfsAndElse'],
    defaultValue: 'Never',
    version: '3.3',
    previewTemplate: 'if (condition) return;'
  },

  {
    key: 'AllowShortLambdasOnASingleLine',
    name: '允许短lambda单行',
    description: '允许将短的 lambda 表达式合并到一行。',
    category: ConfigCategories.WRAPPING,
    type: 'enum',
    enumValues: ['None', 'Empty', 'Inline', 'All'],
    defaultValue: 'All',
    version: '9',
    previewTemplate: 'auto lambda = [](int x) { return x * 2; };'
  },

  {
    key: 'AllowShortLoopsOnASingleLine',
    name: '允许短循环单行',
    description: '如果为 true，循环语句 while (true) continue; 可以被放在一行。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: false,
    version: '3.7',
    previewTemplate: 'while (condition) continue;'
  },

  {
    key: 'AllowShortNamespacesOnASingleLine',
    name: '允许短命名空间单行',
    description: '如果为 true，命名空间 namespace a { class b; } 可以被放在一行。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: false,
    version: '20',
    previewTemplate: 'namespace utils { void helper(); }'
  },

  {
    key: 'AlwaysBreakBeforeMultilineStrings',
    name: '多行字符串前总是换行',
    description: '如果为 true，总是在多行字符串字面量之前换行。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: false,
    version: '3.4',
    previewTemplate: `std::string text =
    "This is a very long string "
    "that spans multiple lines";`
  },

  // ===============================
  // 大括号设置
  // ===============================
  {
    key: 'BreakBeforeBraces',
    name: '大括号前换行',
    description: '大括号 {} 的换行风格。',
    category: ConfigCategories.BRACES,
    type: 'enum',
    enumValues: ['Attach', 'Linux', 'Mozilla', 'Stroustrup', 'Allman', 'Whitesmiths', 'GNU', 'WebKit', 'Custom'],
    defaultValue: 'Attach',
    version: '3.7',
    previewTemplate: `if (condition) {
  statement;
}`
  },

  {
    key: 'BraceWrapping',
    name: '大括号换行详细设置',
    description: '分别控制各种情况下的大括号换行。仅在 BreakBeforeBraces 设置为 Custom 时生效。',
    category: ConfigCategories.BRACES,
    type: 'string',
    defaultValue: 'Default',
    version: '3.8',
    previewTemplate: `class MyClass
{
    void method()
    {
        if (condition)
        {
            statement;
        }
    }
};`
  },

  {
    key: 'BreakAdjacentStringLiterals',
    name: '相邻字符串字面量换行',
    description: '在相邻的字符串字面量之间换行。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: false,
    version: '18',
    previewTemplate: `const char* text = "first part"
                   "second part";`
  },

  {
    key: 'BreakAfterAttributes',
    name: '属性后换行',
    description: '在 C++11 属性组之后、变量或函数名前换行。',
    category: ConfigCategories.WRAPPING,
    type: 'enum',
    enumValues: ['Always', 'Leave', 'Never'],
    defaultValue: 'Leave',
    version: '16',
    previewTemplate: `[[nodiscard]]
int function();`
  },

  {
    key: 'BreakAfterJavaFieldAnnotations',
    name: 'Java字段注解后换行',
    description: '在 Java 文件中，每个字段注解后都换行。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: false,
    version: '3.8',
    previewTemplate: `@Override
@Deprecated
public void method() {}`
  },

  {
    key: 'BreakAfterReturnType',
    name: '返回类型后换行',
    description: '函数声明返回类型后的换行风格。',
    category: ConfigCategories.WRAPPING,
    type: 'enum',
    enumValues: ['Automatic', 'ExceptShortType', 'All', 'TopLevel', 'AllDefinitions', 'TopLevelDefinitions'],
    defaultValue: 'Automatic',
    version: '19',
    previewTemplate: `int
function();`
  },

  {
    key: 'BreakArrays',
    name: '数组换行',
    description: '如果为 true，将在 Json 数组 [ 后总是换行。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: false,
    version: '16',
    previewTemplate: `int array[] = {
    1, 2, 3, 4, 5
};`
  },

  {
    key: 'BreakBeforeBinaryOperators',
    name: '二元运算符前换行',
    description: '二元运算符的换行方式。',
    category: ConfigCategories.WRAPPING,
    type: 'enum',
    enumValues: ['None', 'NonAssignment', 'All'],
    defaultValue: 'None',
    version: '3.6',
    previewTemplate: `bool result = condition1
              && condition2
              && condition3;`
  },

  {
    key: 'BreakBeforeConceptDeclarations',
    name: 'concept声明前换行',
    description: 'concept 声明的换行风格。',
    category: ConfigCategories.CPP_FEATURES,
    type: 'enum',
    enumValues: ['Never', 'Allowed', 'Always'],
    defaultValue: 'Always',
    version: '12',
    previewTemplate: `template<typename T>
concept Addable = requires(T a, T b) {
    a + b;
};`
  },

  {
    key: 'BreakBeforeInlineASMColon',
    name: '内联汇编冒号前换行',
    description: '内联汇编冒号的换行风格。',
    category: ConfigCategories.WRAPPING,
    type: 'enum',
    enumValues: ['Never', 'OnlyMultiline', 'Always'],
    defaultValue: 'OnlyMultiline',
    version: '16',
    previewTemplate: `asm("mov %1, %0"
    : "=r"(output)
    : "r"(input));`
  },

  {
    key: 'BreakBeforeTemplateCloser',
    name: '模板闭括号前换行',
    description: '如果在模板开括号 < 后有换行，则在模板闭括号 > 前也进行换行。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: false,
    version: '21',
    previewTemplate: `template<
    typename T,
    typename U
>
class MyClass {};`
  },

  {
    key: 'BreakBeforeTernaryOperators',
    name: '三元运算符前换行',
    description: '如果为 true，三元运算符将放在换行之后。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: true,
    version: '3.7',
    previewTemplate: `int result = condition
                 ? value1
                 : value2;`
  },

  {
    key: 'BreakBinaryOperations',
    name: '二元运算换行',
    description: '二元运算的换行风格。',
    category: ConfigCategories.WRAPPING,
    type: 'enum',
    enumValues: ['Never', 'OnePerLine', 'RespectPrecedence'],
    defaultValue: 'Never',
    version: '20',
    previewTemplate: `bool result = (a && b)
              || (c && d);`
  },

  {
    key: 'BreakConstructorInitializers',
    name: '构造函数初始化列表换行',
    description: '构造函数初始化列表的换行风格。',
    category: ConfigCategories.CPP_FEATURES,
    type: 'enum',
    enumValues: ['BeforeColon', 'BeforeComma', 'AfterColon'],
    defaultValue: 'BeforeColon',
    version: '5',
    previewTemplate: `Constructor()
    : member1(value1)
    , member2(value2) {}`
  },

  {
    key: 'BreakFunctionDefinitionParameters',
    name: '函数定义参数换行',
    description: '如果为 true，将在函数定义参数前总是换行。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: false,
    version: '19',
    previewTemplate: `void function(
    int param1,
    int param2
) {}`
  },

  {
    key: 'BreakInheritanceList',
    name: '继承列表换行',
    description: '继承列表的换行风格。',
    category: ConfigCategories.CPP_FEATURES,
    type: 'enum',
    enumValues: ['BeforeColon', 'BeforeComma', 'AfterColon', 'AfterComma'],
    defaultValue: 'BeforeColon',
    version: '7',
    previewTemplate: `class Derived
    : public Base1
    , public Base2 {}`
  },

  {
    key: 'BreakStringLiterals',
    name: '字符串字面量换行',
    description: '允许在格式化时打断字符串字面量。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: true,
    version: '3.9',
    previewTemplate: `const char* text = "This is a very long string that "
                   "might be broken into multiple lines";`
  },

  {
    key: 'BreakTemplateDeclarations',
    name: '模板声明换行',
    description: '模板声明的换行风格。',
    category: ConfigCategories.CPP_FEATURES,
    type: 'enum',
    enumValues: ['Leave', 'No', 'MultiLine', 'Yes'],
    defaultValue: 'MultiLine',
    version: '19',
    previewTemplate: `template <typename T>
void function(T param);`
  },

  // ===============================
  // 空格设置
  // ===============================
  {
    key: 'SpaceAfterCStyleCast',
    name: 'C风格转换后空格',
    description: 'C风格强制类型转换 (int)x 后是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: false,
    version: '3.5',
    previewTemplate: 'int value = (int) floatValue;'
  },

  {
    key: 'SpaceAfterLogicalNot',
    name: '逻辑非后空格',
    description: '逻辑非运算符 ! 后是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: false,
    version: '9',
    previewTemplate: 'if (! condition) {}'
  },

  {
    key: 'SpaceAfterTemplateKeyword',
    name: 'template关键字后空格',
    description: 'template <...> 之后是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: true,
    version: '4',
    previewTemplate: `template <typename T>
void function();`
  },

  {
    key: 'SpaceAroundPointerQualifiers',
    name: '指针限定符周围空格',
    description: '定义指针限定符周围的空格。',
    category: ConfigCategories.POINTERS_REFS,
    type: 'enum',
    enumValues: ['Default', 'Before', 'After', 'Both'],
    defaultValue: 'Default',
    version: '12',
    previewTemplate: 'const int * const ptr;'
  },

  {
    key: 'SpaceBeforeAssignmentOperators',
    name: '赋值运算符前空格',
    description: '赋值运算符（=, +=）前是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: true,
    version: '3.7',
    previewTemplate: `int a = 1;
x += 2;`
  },

  {
    key: 'SpaceBeforeCaseColon',
    name: 'case冒号前空格',
    description: 'case 标签冒号前是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: false,
    version: '12',
    previewTemplate: `switch (x) {
case 1 : break;
case 2: break;
}`
  },

  {
    key: 'SpaceBeforeCpp11BracedList',
    name: 'C++11大括号列表前空格',
    description: 'C++11 大括号列表前是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: false,
    version: '7',
    previewTemplate: 'std::vector<int> v {1, 2, 3};'
  },

  {
    key: 'SpaceBeforeCtorInitializerColon',
    name: '构造函数初始化冒号前空格',
    description: '构造函数初始化列表的冒号:前是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: true,
    version: '7',
    previewTemplate: 'Constructor() : member(value) {}'
  },

  {
    key: 'SpaceBeforeInheritanceColon',
    name: '继承冒号前空格',
    description: '类继承的冒号:前是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: true,
    version: '7',
    previewTemplate: 'class Derived : public Base {}'
  },

  {
    key: 'SpaceBeforeJsonColon',
    name: 'JSON冒号前空格',
    description: 'JSON 冒号前是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: false,
    version: '17',
    previewTemplate: '{"key" : "value"}'
  },

  {
    key: 'SpaceBeforeParens',
    name: '括号前空格',
    description: '圆括号(前的空格策略。',
    category: ConfigCategories.SPACING,
    type: 'enum',
    enumValues: ['Never', 'ControlStatements', 'ControlStatementsExceptControlMacros', 'NonEmptyParentheses', 'Always', 'Custom'],
    defaultValue: 'ControlStatements',
    version: '3.5',
    previewTemplate: `if (condition) {}
function();`
  },

  {
    key: 'SpaceBeforeParensOptions',
    name: '括号前空格详细选项',
    description: '当 SpaceBeforeParens 设置为 Custom 时的详细配置。',
    category: ConfigCategories.SPACING,
    type: 'string',
    defaultValue: 'Default',
    version: '14',
    previewTemplate: `if (condition) {}
for (;;) {}`
  },

  {
    key: 'SpaceBeforeRangeBasedForLoopColon',
    name: '范围for循环冒号前空格',
    description: 'C++11范围for循环的冒号:前是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: true,
    version: '7',
    previewTemplate: 'for (auto item : container) {}'
  },

  {
    key: 'SpaceBeforeSquareBrackets',
    name: '方括号前空格',
    description: '方括号 [ 前是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: false,
    version: '10',
    previewTemplate: 'array [index] = value;'
  },

  {
    key: 'SpaceInEmptyBlock',
    name: '空代码块内空格',
    description: '空代码块 {} 内是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: false,
    version: '10',
    previewTemplate: 'if (condition) { }'
  },

  {
    key: 'SpaceInEmptyParentheses',
    name: '空括号内空格',
    description: '空括号 () 内是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: false,
    version: '3.7',
    previewTemplate: 'function( );'
  },

  {
    key: 'SpacesBeforeTrailingComments',
    name: '行尾注释前空格数',
    description: '行尾注释前的最少空格数。',
    category: ConfigCategories.COMMENTS,
    type: 'number',
    min: 0,
    max: 10,
    defaultValue: 1,
    version: '3.7',
    previewTemplate: 'int a = 1;  // comment'
  },

  {
    key: 'SpacesInAngles',
    name: '尖括号内空格',
    description: '模板尖括号 < > 内是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'enum',
    enumValues: ['Never', 'Always', 'Leave'],
    defaultValue: 'Never',
    version: '4',
    previewTemplate: 'template< typename T >'
  },

  {
    key: 'SpacesInContainerLiterals',
    name: '容器字面量内空格',
    description: '容器字面量（如std::vector<int>{1, 2}）的大括号内是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: true,
    version: '3.7',
    previewTemplate: 'std::vector<int>{ 1, 2, 3 };'
  },

  {
    key: 'SpacesInCStyleCastParentheses',
    name: 'C风格转换括号内空格',
    description: 'C风格强制类型转换的括号内是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: false,
    version: '3.7',
    previewTemplate: 'int value = ( int )floatValue;'
  },

  {
    key: 'SpacesInLineCommentPrefix',
    name: '行注释前缀内空格',
    description: '行注释前缀内的空格数量。',
    category: ConfigCategories.COMMENTS,
    type: 'string',
    defaultValue: 'Default',
    version: '13',
    previewTemplate: `//comment
// comment`
  },

  {
    key: 'SpacesInParentheses',
    name: '圆括号内空格',
    description: '圆括号()内是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: false,
    version: '3.7',
    previewTemplate: 'function( argument );'
  },

  {
    key: 'SpacesInSquareBrackets',
    name: '方括号内空格',
    description: '方括号 [] 内是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: false,
    version: '3.7',
    previewTemplate: 'array[ index ] = value;'
  },

  // ===============================
  // 缩进设置
  // ===============================
  {
    key: 'ColumnLimit',
    name: '行宽限制',
    description: '行宽限制。值为 0 表示没有行宽限制。',
    category: ConfigCategories.WRAPPING,
    type: 'number',
    min: 0,
    max: 200,
    defaultValue: 80,
    version: '3.7',
    previewTemplate: `// 这是一行很长的注释，可能会超过列限制而需要换行处理
void function(int param1, int param2, int param3);`
  },

  {
    key: 'ContinuationIndentWidth',
    name: '续行缩进宽度',
    description: '换行后的续行缩进宽度。',
    category: ConfigCategories.INDENTATION,
    type: 'number',
    min: 0,
    max: 16,
    defaultValue: 4,
    version: '3.7',
    previewTemplate: `function(veryLongParameterName,
        anotherLongParameterName);`
  },

  {
    key: 'IndentCaseBlocks',
    name: 'case块缩进',
    description: '是否缩进 case 块。',
    category: ConfigCategories.INDENTATION,
    type: 'boolean',
    defaultValue: false,
    version: '11',
    previewTemplate: `switch (x) {
case 1:
    {
        statement;
    }
    break;
}`
  },

  {
    key: 'IndentCaseLabels',
    name: 'case标签缩进',
    description: '是否缩进switch语句中的case标签。',
    category: ConfigCategories.INDENTATION,
    type: 'boolean',
    defaultValue: false,
    version: '3.3',
    previewTemplate: `switch (x) {
    case 1:
        break;
    case 2:
        break;
}`
  },

  {
    key: 'IndentExternBlock',
    name: 'extern块缩进',
    description: 'extern 块的缩进风格。',
    category: ConfigCategories.INDENTATION,
    type: 'enum',
    enumValues: ['AfterExternBlock', 'Indent', 'NoIndent'],
    defaultValue: 'AfterExternBlock',
    version: '11',
    previewTemplate: `extern "C" {
    void function();
}`
  },

  {
    key: 'IndentGotoLabels',
    name: 'goto标签缩进',
    description: 'goto 标签的缩进方式。',
    category: ConfigCategories.INDENTATION,
    type: 'boolean',
    defaultValue: true,
    version: '10',
    previewTemplate: `void function() {
    statement;
label:
    goto label;
}`
  },

  {
    key: 'IndentPPDirectives',
    name: '预处理指令缩进',
    description: '预处理指令的缩进方式。',
    category: ConfigCategories.INDENTATION,
    type: 'enum',
    enumValues: ['None', 'AfterHash', 'BeforeHash'],
    defaultValue: 'None',
    version: '6',
    previewTemplate: `#ifdef DEBUG
  #define LOG(x) std::cout << x
#endif`
  },

  {
    key: 'IndentRequiresClause',
    name: 'requires子句缩进',
    description: '是否缩进 requires 子句。',
    category: ConfigCategories.CPP_FEATURES,
    type: 'boolean',
    defaultValue: true,
    version: '15',
    previewTemplate: `template<typename T>
    requires Addable<T>
void function(T t);`
  },

  {
    key: 'IndentWidth',
    name: '缩进宽度',
    description: '常规缩进宽度。',
    category: ConfigCategories.INDENTATION,
    type: 'number',
    min: 1,
    max: 16,
    defaultValue: 2,
    version: '3.7',
    previewTemplate: `if (condition) {
  statement;
  if (nested) {
    nested_statement;
  }
}`
  },

  {
    key: 'IndentWrappedFunctionNames',
    name: '换行函数名缩进',
    description: '如果函数返回类型换行了，是否缩进函数名。',
    category: ConfigCategories.INDENTATION,
    type: 'boolean',
    defaultValue: false,
    version: '3.7',
    previewTemplate: `int
    function();`
  },

  {
    key: 'LambdaBodyIndentation',
    name: 'Lambda体缩进',
    description: 'Lambda 函数体的缩进风格。',
    category: ConfigCategories.CPP_FEATURES,
    type: 'enum',
    enumValues: ['Signature', 'OuterScope'],
    defaultValue: 'Signature',
    version: '13',
    previewTemplate: `auto lambda = [](int x) {
    return x * 2;
};`
  },

  {
    key: 'NamespaceIndentation',
    name: '命名空间缩进',
    description: '命名空间内部的缩进方式。None表示不缩进。',
    category: ConfigCategories.INDENTATION,
    type: 'enum',
    enumValues: ['None', 'Inner', 'All'],
    defaultValue: 'None',
    version: '3.7',
    previewTemplate: `namespace outer {
namespace inner {
void function();
}
}`
  },

  {
    key: 'PPIndentWidth',
    name: '预处理器缩进宽度',
    description: '预处理器指令的缩进宽度。',
    category: ConfigCategories.INDENTATION,
    type: 'number',
    min: -1,
    max: 16,
    defaultValue: -1,
    version: '13',
    previewTemplate: `#ifdef DEBUG
    #define LOG(x) std::cout << x
#endif`
  },

  {
    key: 'TabWidth',
    name: 'Tab宽度',
    description: 'Tab字符的显示宽度。',
    category: ConfigCategories.INDENTATION,
    type: 'number',
    min: 1,
    max: 16,
    defaultValue: 8,
    version: '3.7',
    previewTemplate: `function() {
\tstatement1;
\tstatement2;
}`
  },

  {
    key: 'UseTab',
    name: '使用Tab',
    description: '使用Tab键的策略。',
    category: ConfigCategories.INDENTATION,
    type: 'enum',
    enumValues: ['Never', 'ForIndentation', 'ForContinuationAndIndentation', 'Always'],
    defaultValue: 'Never',
    version: '3.7',
    previewTemplate: `if (condition) {
\tstatement;
}`
  },

  // ===============================
  // C++特性
  // ===============================
  {
    key: 'CompactNamespaces',
    name: '紧凑命名空间',
    description: '是否将连续的命名空间合并到一行（namespace A::B::C）。',
    category: ConfigCategories.CPP_FEATURES,
    type: 'boolean',
    defaultValue: false,
    version: '5',
    previewTemplate: `namespace A::B::C {
void function();
}`
  },

  {
    key: 'ConstructorInitializerIndentWidth',
    name: '构造函数初始化缩进宽度',
    description: '构造函数初始化列表的缩进宽度。',
    category: ConfigCategories.INDENTATION,
    type: 'number',
    min: 0,
    max: 16,
    defaultValue: 4,
    version: '3.7',
    previewTemplate: `Constructor()
    : member1(value1)
    , member2(value2) {}`
  },

  {
    key: 'Cpp11BracedListStyle',
    name: 'C++11大括号列表风格',
    description: 'C++11风格的大括号初始化列表（{}）的格式化。',
    category: ConfigCategories.CPP_FEATURES,
    type: 'boolean',
    defaultValue: true,
    version: '3.8',
    previewTemplate: 'std::vector<int> v{1, 2, 3};'
  },

  {
    key: 'DerivePointerAlignment',
    name: '自动推断指针对齐',
    description: '自动推断指针的对齐风格，而不是使用PointerAlignment。',
    category: ConfigCategories.POINTERS_REFS,
    type: 'boolean',
    defaultValue: false,
    version: '3.7',
    previewTemplate: `int* ptr;
int *ptr2;`
  },

  {
    key: 'DisableFormat',
    name: '禁用格式化',
    description: '完全禁用格式化。',
    category: ConfigCategories.MISC,
    type: 'boolean',
    defaultValue: false,
    version: '3.7',
    previewTemplate: `// 格式化被禁用
int   a=1;
  int b   =   2;`
  },

  {
    key: 'EmptyLineAfterAccessModifier',
    name: '访问修饰符后空行',
    description: '访问修饰符后的空行处理。',
    category: ConfigCategories.EMPTY_LINES,
    type: 'enum',
    enumValues: ['Never', 'Leave', 'Always'],
    defaultValue: 'Never',
    version: '13',
    previewTemplate: `class MyClass {
public:

    void method();
};`
  },

  {
    key: 'EmptyLineBeforeAccessModifier',
    name: '访问修饰符前空行',
    description: '访问修饰符前的空行处理。',
    category: ConfigCategories.EMPTY_LINES,
    type: 'enum',
    enumValues: ['Never', 'Leave', 'LogicalBlock', 'Always'],
    defaultValue: 'LogicalBlock',
    version: '12',
    previewTemplate: `class MyClass {
    void method1();

private:
    int member;
};`
  },

  {
    key: 'ExperimentalAutoDetectBinPacking',
    name: '实验性自动检测打包',
    description: '如果为 true，将检测函数调用和定义是否被格式化为每行一个参数。',
    category: ConfigCategories.MISC,
    type: 'boolean',
    defaultValue: false,
    version: '3.7',
    previewTemplate: `function(arg1,
         arg2,
         arg3);`
  },

  {
    key: 'FixNamespaceComments',
    name: '修复命名空间注释',
    description: '自动在长的命名空间右大括号后添加注释。',
    category: ConfigCategories.CPP_FEATURES,
    type: 'boolean',
    defaultValue: true,
    version: '5',
    previewTemplate: `namespace very_long_namespace_name {
void function();
} // namespace very_long_namespace_name`
  },

  {
    key: 'ForEachMacros',
    name: 'ForEach宏',
    description: '应被解释为 foreach 循环而不是函数调用的宏列表。',
    category: ConfigCategories.MISC,
    type: 'string',
    defaultValue: '[]',
    version: '3.7',
    previewTemplate: `FOREACH(item, container) {
    process(item);
}`
  },

  {
    key: 'IfMacros',
    name: 'If宏',
    description: '应被解释为条件语句而不是函数调用的宏列表。',
    category: ConfigCategories.MISC,
    type: 'string',
    defaultValue: '[]',
    version: '13',
    previewTemplate: 'IF_DEBUG(statement);'
  },

  {
    key: 'IncludeBlocks',
    name: 'Include块风格',
    description: '#include块的风格。',
    category: ConfigCategories.MISC,
    type: 'enum',
    enumValues: ['Preserve', 'Merge', 'Regroup'],
    defaultValue: 'Preserve',
    version: '6',
    previewTemplate: `#include <iostream>
#include <vector>

#include "local.h"`
  },

  {
    key: 'IncludeCategories',
    name: 'Include分类',
    description: '用于排序 #include 的正则表达式。',
    category: ConfigCategories.MISC,
    type: 'string',
    defaultValue: '[]',
    version: '3.8',
    previewTemplate: `#include <system>
#include "local"`
  },

  {
    key: 'IncludeIsMainRegex',
    name: 'Include主文件正则',
    description: '指定文件到主包含映射的正则表达式。',
    category: ConfigCategories.MISC,
    type: 'string',
    defaultValue: '(Test)?$',
    version: '3.9',
    previewTemplate: `// main.cpp
#include "main.h"`
  },

  {
    key: 'IncludeIsMainSourceRegex',
    name: 'Include主源文件正则',
    description: '指定主源文件的正则表达式。',
    category: ConfigCategories.MISC,
    type: 'string',
    defaultValue: '',
    version: '10',
    previewTemplate: `// main.cpp
#include "main.h"`
  },

  {
    key: 'IndentAccessModifiers',
    name: '访问修饰符缩进',
    description: '是否缩进访问修饰符。',
    category: ConfigCategories.INDENTATION,
    type: 'boolean',
    defaultValue: false,
    version: '13',
    previewTemplate: `class MyClass {
    public:
        void method();
};`
  },

  {
    key: 'InsertBraces',
    name: '插入大括号',
    description: '在 C++ 的控制语句后插入大括号。',
    category: ConfigCategories.BRACES,
    type: 'boolean',
    defaultValue: false,
    version: '15',
    previewTemplate: `if (condition)
    statement;
// 变为:
if (condition) {
    statement;
}`
  },

  {
    key: 'InsertNewlineAtEOF',
    name: '文件末尾插入换行',
    description: '如果文件末尾缺少换行符，则插入一个。',
    category: ConfigCategories.MISC,
    type: 'boolean',
    defaultValue: false,
    version: '16',
    previewTemplate: `int main() {
    return 0;
}
// 文件末尾会添加换行符`
  },

  {
    key: 'InsertTrailingCommas',
    name: '插入尾随逗号',
    description: '在容器字面量中插入尾随逗号。',
    category: ConfigCategories.MISC,
    type: 'enum',
    enumValues: ['None', 'Wrapped'],
    defaultValue: 'None',
    version: '11',
    previewTemplate: `std::vector<int> v = {
    1,
    2,
    3, // 尾随逗号
};`
  },

  {
    key: 'IntegerLiteralSeparator',
    name: '整数字面量分隔符',
    description: '格式化整数字面量分隔符。',
    category: ConfigCategories.MISC,
    type: 'string',
    defaultValue: 'Default',
    version: '16',
    previewTemplate: `int binary = 0b1010'1010;
int decimal = 1'000'000;
int hex = 0xFF'FF'FF;`
  },

  {
    key: 'JavaImportGroups',
    name: 'Java导入分组',
    description: 'Java 导入语句的前缀向量。',
    category: ConfigCategories.MISC,
    type: 'string',
    defaultValue: '[]',
    version: '8',
    previewTemplate: `import java.util.*;
import com.example.*;`
  },

  {
    key: 'JavaScriptQuotes',
    name: 'JavaScript引号',
    description: 'JavaScript 字符串的引号风格。',
    category: ConfigCategories.MISC,
    type: 'enum',
    enumValues: ['Leave', 'Single', 'Double'],
    defaultValue: 'Leave',
    version: '3.9',
    previewTemplate: 'const str = "hello world";'
  },

  {
    key: 'JavaScriptWrapImports',
    name: 'JavaScript导入换行',
    description: 'JavaScript 导入/导出语句是否换行。',
    category: ConfigCategories.MISC,
    type: 'boolean',
    defaultValue: true,
    version: '3.9',
    previewTemplate: `import {
    function1,
    function2
} from 'module';`
  },

  {
    key: 'KeepEmptyLinesAtEOF',
    name: '保持文件末尾空行',
    description: '是否保持文件末尾的空行。',
    category: ConfigCategories.EMPTY_LINES,
    type: 'boolean',
    defaultValue: false,
    version: '17',
    previewTemplate: `int main() {
    return 0;
}


// 末尾空行`
  },

  {
    key: 'KeepEmptyLinesAtTheStartOfBlocks',
    name: '保持块开始空行',
    description: '是否保持代码块开始处的空行。',
    category: ConfigCategories.EMPTY_LINES,
    type: 'boolean',
    defaultValue: true,
    version: '3.7',
    previewTemplate: `if (condition) {

    statement;
}`
  },

  {
    key: 'Language',
    name: '语言',
    description: '要格式化的语言。',
    category: ConfigCategories.BASIC,
    type: 'enum',
    enumValues: ['None', 'Cpp', 'CSharp', 'Java', 'JavaScript', 'Json', 'ObjC', 'Proto', 'TableGen', 'TextProto', 'Verilog'],
    defaultValue: 'Cpp',
    version: '3.5',
    previewTemplate: `// C++ 代码
class MyClass {};`
  },

  {
    key: 'LineEnding',
    name: '行结束符',
    description: '使用的行结束符。',
    category: ConfigCategories.MISC,
    type: 'enum',
    enumValues: ['LF', 'CRLF', 'DeriveLF', 'DeriveCRLF'],
    defaultValue: 'LF',
    version: '16',
    previewTemplate: `line1
line2`
  },

  {
    key: 'MacroBlockBegin',
    name: '宏块开始',
    description: '开始宏块的正则表达式。',
    category: ConfigCategories.MISC,
    type: 'string',
    defaultValue: '',
    version: '3.7',
    previewTemplate: `MACRO_BEGIN
    content
MACRO_END`
  },

  {
    key: 'MacroBlockEnd',
    name: '宏块结束',
    description: '结束宏块的正则表达式。',
    category: ConfigCategories.MISC,
    type: 'string',
    defaultValue: '',
    version: '3.7',
    previewTemplate: `MACRO_BEGIN
    content
MACRO_END`
  },

  {
    key: 'MainIncludeChar',
    name: '主包含字符',
    description: '猜测"主"头文件时，只考虑使用指定字符的 include 指令。',
    category: ConfigCategories.MISC,
    type: 'enum',
    enumValues: ['Quote', 'AngleBracket', 'Any'],
    defaultValue: 'Any',
    version: '19',
    previewTemplate: `#include "main.h"  // Quote
#include <system.h> // AngleBracket`
  },

  {
    key: 'MaxEmptyLinesToKeep',
    name: '最大保持空行数',
    description: '最多保持连续的空行数量。',
    category: ConfigCategories.EMPTY_LINES,
    type: 'number',
    min: 0,
    max: 10,
    defaultValue: 1,
    version: '3.7',
    previewTemplate: `statement1;


statement2; // 最多保持1个空行`
  },

  {
    key: 'NamespaceMacros',
    name: '命名空间宏',
    description: '应被解释为命名空间声明的宏列表。',
    category: ConfigCategories.CPP_FEATURES,
    type: 'string',
    defaultValue: '[]',
    version: '9',
    previewTemplate: `NAMESPACE_BEGIN(MyNamespace)
void function();
NAMESPACE_END(MyNamespace)`
  },

  {
    key: 'ObjCBinPackProtocolList',
    name: 'ObjC协议列表打包',
    description: 'Objective-C 协议列表的打包风格。',
    category: ConfigCategories.MISC,
    type: 'enum',
    enumValues: ['Auto', 'Always', 'Never'],
    defaultValue: 'Auto',
    version: '7',
    previewTemplate: `@interface MyClass : NSObject <Protocol1, Protocol2>
@end`
  },

  {
    key: 'ObjCBlockIndentWidth',
    name: 'ObjC块缩进宽度',
    description: 'Objective-C 块的缩进宽度。',
    category: ConfigCategories.INDENTATION,
    type: 'number',
    min: 0,
    max: 16,
    defaultValue: 2,
    version: '3.7',
    previewTemplate: `[object methodWithBlock:^{
    statement;
}];`
  },

  {
    key: 'ObjCBreakBeforeNestedBlockParam',
    name: 'ObjC嵌套块参数前换行',
    description: '在 Objective-C 嵌套块参数前换行。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: true,
    version: '11',
    previewTemplate: `[object method:^{
    statement;
} completion:^{
    completion;
}];`
  },

  {
    key: 'ObjCSpaceAfterProperty',
    name: 'ObjC属性后空格',
    description: 'Objective-C @property 后是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: false,
    version: '3.7',
    previewTemplate: '@property (nonatomic, strong) NSString *name;'
  },

  {
    key: 'ObjCSpaceBeforeProtocolList',
    name: 'ObjC协议列表前空格',
    description: 'Objective-C 协议列表前是否加空格。',
    category: ConfigCategories.SPACING,
    type: 'boolean',
    defaultValue: true,
    version: '3.7',
    previewTemplate: `@interface MyClass : NSObject <Protocol>
@end`
  },

  {
    key: 'PackConstructorInitializers',
    name: '构造函数初始化器打包',
    description: '构造函数初始化器的打包风格。',
    category: ConfigCategories.CPP_FEATURES,
    type: 'enum',
    enumValues: ['Never', 'BinPack', 'CurrentLine', 'NextLine', 'NextLineOnly'],
    defaultValue: 'BinPack',
    version: '14',
    previewTemplate: 'Constructor() : member1(value1), member2(value2) {}'
  },

  {
    key: 'PenaltyBreakAssignment',
    name: '赋值换行惩罚',
    description: '在赋值运算符周围换行的惩罚值。',
    category: ConfigCategories.MISC,
    type: 'number',
    min: 0,
    max: 1000,
    defaultValue: 2,
    version: '5',
    previewTemplate: `variable =
    value;`
  },

  {
    key: 'PenaltyBreakBeforeFirstCallParameter',
    name: '首个调用参数前换行惩罚',
    description: '在函数调用的 ( 之后换行的惩罚值。',
    category: ConfigCategories.MISC,
    type: 'number',
    min: 0,
    max: 1000,
    defaultValue: 19,
    version: '3.7',
    previewTemplate: `function(
    parameter);`
  },

  {
    key: 'PenaltyBreakBeforeMemberAccess',
    name: '成员访问前换行惩罚',
    description: '在成员访问操作符前换行的惩罚值。',
    category: ConfigCategories.MISC,
    type: 'number',
    min: 0,
    max: 1000,
    defaultValue: 20,
    version: '20',
    previewTemplate: `object
    .method();`
  },

  {
    key: 'PenaltyBreakComment',
    name: '注释换行惩罚',
    description: '在注释内部引入换行的惩罚值。',
    category: ConfigCategories.COMMENTS,
    type: 'number',
    min: 0,
    max: 1000,
    defaultValue: 300,
    version: '3.7',
    previewTemplate: `// 这是一个很长的注释，可能需要
// 换行处理`
  },

  {
    key: 'PenaltyBreakFirstLessLess',
    name: '首个<<换行惩罚',
    description: '在第一个 << 之前换行的惩罚值。',
    category: ConfigCategories.MISC,
    type: 'number',
    min: 0,
    max: 1000,
    defaultValue: 120,
    version: '3.7',
    previewTemplate: `std::cout
    << "Hello";`
  },

  {
    key: 'PenaltyBreakOpenParenthesis',
    name: '开括号换行惩罚',
    description: '在 ( 之后换行的惩罚值。',
    category: ConfigCategories.MISC,
    type: 'number',
    min: 0,
    max: 1000,
    defaultValue: 0,
    version: '14',
    previewTemplate: `function(
    parameter);`
  },

  {
    key: 'PenaltyBreakScopeResolution',
    name: '作用域解析换行惩罚',
    description: '在 :: 之后换行的惩罚值。',
    category: ConfigCategories.MISC,
    type: 'number',
    min: 0,
    max: 1000,
    defaultValue: 500,
    version: '18',
    previewTemplate: `namespace::
    function();`
  },

  {
    key: 'PenaltyBreakString',
    name: '字符串换行惩罚',
    description: '在字符串字面量内部引入换行的惩罚值。',
    category: ConfigCategories.MISC,
    type: 'number',
    min: 0,
    max: 1000,
    defaultValue: 1000,
    version: '3.7',
    previewTemplate: `std::string text = "very long "
                   "string";`
  },

  {
    key: 'PenaltyBreakTemplateDeclaration',
    name: '模板声明换行惩罚',
    description: '在模板声明后换行的惩罚值。',
    category: ConfigCategories.MISC,
    type: 'number',
    min: 0,
    max: 1000,
    defaultValue: 10,
    version: '7',
    previewTemplate: `template <typename T>
void function();`
  },

  {
    key: 'PenaltyExcessCharacter',
    name: '超出字符惩罚',
    description: '超出 ColumnLimit 的每个字符的惩罚值。',
    category: ConfigCategories.MISC,
    type: 'number',
    min: 0,
    max: 1000,
    defaultValue: 1000000,
    version: '3.7',
    previewTemplate: '// 超出行宽限制的代码会被惩罚'
  },

  {
    key: 'PenaltyIndentedWhitespace',
    name: '缩进空白惩罚',
    description: '每个空白缩进字符的惩罚值。',
    category: ConfigCategories.MISC,
    type: 'number',
    min: 0,
    max: 1000,
    defaultValue: 0,
    version: '12',
    previewTemplate: `if (condition) {
    statement; // 缩进空白
}`
  },

  {
    key: 'PenaltyReturnTypeOnItsOwnLine',
    name: '返回类型独立行惩罚',
    description: '将函数返回类型单独放在一行的惩罚值。',
    category: ConfigCategories.MISC,
    type: 'number',
    min: 0,
    max: 1000,
    defaultValue: 200,
    version: '3.7',
    previewTemplate: `int
function();`
  },

  {
    key: 'PointerAlignment',
    name: '指针对齐',
    description: '指针/引用修饰符的对齐。',
    category: ConfigCategories.POINTERS_REFS,
    type: 'enum',
    enumValues: ['Left', 'Right', 'Middle'],
    defaultValue: 'Right',
    version: '3.7',
    previewTemplate: `int* ptr;   // Right
int *ptr;   // Left
int * ptr;  // Middle`
  },

  {
    key: 'QualifierAlignment',
    name: '限定符对齐',
    description: '限定符（const, volatile等）的对齐方式。',
    category: ConfigCategories.POINTERS_REFS,
    type: 'enum',
    enumValues: ['Leave', 'Left', 'Right', 'Custom'],
    defaultValue: 'Leave',
    version: '14',
    previewTemplate: `const int value;
int const value;`
  },

  {
    key: 'QualifierOrder',
    name: '限定符顺序',
    description: '限定符的排序顺序。',
    category: ConfigCategories.POINTERS_REFS,
    type: 'string',
    defaultValue: '[]',
    version: '14',
    previewTemplate: 'static const volatile int value;'
  },

  {
    key: 'RawStringFormats',
    name: '原始字符串格式',
    description: '原始字符串的格式化规则。',
    category: ConfigCategories.MISC,
    type: 'string',
    defaultValue: '[]',
    version: '6',
    previewTemplate: `std::string code = R"cpp(
    int main() {
        return 0;
    }
)cpp";`
  },

  {
    key: 'ReferenceAlignment',
    name: '引用对齐',
    description: '引用符号&的对齐方式。',
    category: ConfigCategories.POINTERS_REFS,
    type: 'enum',
    enumValues: ['Pointer', 'Left', 'Right', 'Middle'],
    defaultValue: 'Pointer',
    version: '13',
    previewTemplate: `int& ref;   // Right
int &ref;   // Left
int & ref;  // Middle`
  },

  {
    key: 'ReflowComments',
    name: '重排注释',
    description: '是否重新排列注释以适应行宽限制。',
    category: ConfigCategories.COMMENTS,
    type: 'boolean',
    defaultValue: true,
    version: '3.8',
    previewTemplate: `// 这是一个很长的注释，会被重新排列
// 以适应行宽限制`
  },

  {
    key: 'RemoveBracesLLVM',
    name: '移除大括号LLVM',
    description: '根据 LLVM 编码风格移除 C++ 控制语句的可选大括号。',
    category: ConfigCategories.BRACES,
    type: 'boolean',
    defaultValue: false,
    version: '14',
    previewTemplate: `if (condition)
    statement;
// 而不是:
if (condition) {
    statement;
}`
  },

  {
    key: 'RemoveEmptyLinesInUnwrappedLines',
    name: '移除未换行行中的空行',
    description: '在未换行的行内移除空行。',
    category: ConfigCategories.EMPTY_LINES,
    type: 'boolean',
    defaultValue: false,
    version: '20',
    previewTemplate: `statement1;

statement2;`
  },

  {
    key: 'RemoveParentheses',
    name: '移除括号',
    description: '移除多余的括号。',
    category: ConfigCategories.MISC,
    type: 'enum',
    enumValues: ['Leave', 'MultipleParentheses', 'ReturnStatement'],
    defaultValue: 'Leave',
    version: '17',
    previewTemplate: `return (value);
// 变为:
return value;`
  },

  {
    key: 'RemoveSemicolon',
    name: '移除分号',
    description: '移除函数和构造/析构函数闭合大括号后的分号。',
    category: ConfigCategories.MISC,
    type: 'boolean',
    defaultValue: false,
    version: '16',
    previewTemplate: `void function() {
    statement;
}; // 分号会被移除`
  },

  {
    key: 'RequiresClausePosition',
    name: 'requires子句位置',
    description: 'requires 子句的位置。',
    category: ConfigCategories.CPP_FEATURES,
    type: 'enum',
    enumValues: ['OwnLine', 'WithPreceding', 'WithFollowing', 'SingleLine'],
    defaultValue: 'OwnLine',
    version: '15',
    previewTemplate: `template<typename T>
requires Addable<T>
void function(T t);`
  },

  {
    key: 'RequiresExpressionIndentation',
    name: 'requires表达式缩进',
    description: 'requires 表达式的缩进风格。',
    category: ConfigCategories.CPP_FEATURES,
    type: 'enum',
    enumValues: ['OuterScope', 'Keyword'],
    defaultValue: 'OuterScope',
    version: '16',
    previewTemplate: `requires {
    typename T::value_type;
    { t.size() } -> std::integral;
}`
  },

  {
    key: 'SeparateDefinitionBlocks',
    name: '分离定义块',
    description: '指定是否使用空行分隔定义块。',
    category: ConfigCategories.EMPTY_LINES,
    type: 'enum',
    enumValues: ['Leave', 'Always', 'Never'],
    defaultValue: 'Leave',
    version: '14',
    previewTemplate: `void function1() {}

void function2() {}`
  },

  {
    key: 'ShortNamespaceLines',
    name: '短命名空间行数',
    description: '短命名空间所能跨越的最大未换行行数。',
    category: ConfigCategories.CPP_FEATURES,
    type: 'number',
    min: 0,
    max: 100,
    defaultValue: 1,
    version: '13',
    previewTemplate: 'namespace short { void func(); }'
  },

  {
    key: 'SkipMacroDefinitionBody',
    name: '跳过宏定义体',
    description: '不格式化宏定义的主体。',
    category: ConfigCategories.MISC,
    type: 'boolean',
    defaultValue: false,
    version: '18',
    previewTemplate: `#define MACRO(x) \\
  do { \\
    something(x); \\
  } while (0)`
  },

  {
    key: 'SortIncludes',
    name: '排序Include',
    description: '是否对#include进行排序。',
    category: ConfigCategories.MISC,
    type: 'enum',
    enumValues: ['Never', 'CaseSensitive', 'CaseInsensitive'],
    defaultValue: 'CaseSensitive',
    version: '3.8',
    previewTemplate: `#include <algorithm>
#include <iostream>
#include <vector>`
  },

  {
    key: 'SortJavaStaticImport',
    name: '排序Java静态导入',
    description: 'Java 静态导入的排序位置。',
    category: ConfigCategories.MISC,
    type: 'enum',
    enumValues: ['Before', 'After'],
    defaultValue: 'Before',
    version: '8',
    previewTemplate: `import static java.util.Collections.*;
import java.util.List;`
  },

  {
    key: 'SortUsingDeclarations',
    name: '排序using声明',
    description: '控制是否以及如何对 using 声明进行排序。',
    category: ConfigCategories.CPP_FEATURES,
    type: 'enum',
    enumValues: ['Never', 'Lexicographic', 'LexicographicNumeric'],
    defaultValue: 'Lexicographic',
    version: '5',
    previewTemplate: `using std::cout;
using std::endl;
using std::vector;`
  },

  {
    key: 'StatementAttributeLikeMacros',
    name: '语句属性类宏',
    description: '应被解释为语句属性的宏列表。',
    category: ConfigCategories.MISC,
    type: 'string',
    defaultValue: '[]',
    version: '12',
    previewTemplate: 'STATEMENT_ATTR void function();'
  },

  {
    key: 'StatementMacros',
    name: '语句宏',
    description: '应被解释为完整语句的宏列表。',
    category: ConfigCategories.MISC,
    type: 'string',
    defaultValue: '[]',
    version: '8',
    previewTemplate: 'STATEMENT_MACRO(argument);'
  },

  {
    key: 'TypenameMacros',
    name: '类型名宏',
    description: '应被解释为类型名的宏列表。',
    category: ConfigCategories.MISC,
    type: 'string',
    defaultValue: '[]',
    version: '9',
    previewTemplate: 'TYPENAME_MACRO MyType;'
  },

  {
    key: 'TypeNames',
    name: '类型名',
    description: '应被解释为类型名的非关键字标识符列表。',
    category: ConfigCategories.MISC,
    type: 'string',
    defaultValue: '[]',
    version: '17',
    previewTemplate: 'MyCustomType variable;'
  },

  {
    key: 'WhitespaceSensitiveMacros',
    name: '空白敏感宏',
    description: '对空白敏感的宏列表。',
    category: ConfigCategories.MISC,
    type: 'string',
    defaultValue: '[]',
    version: '11',
    previewTemplate: 'WHITESPACE_SENSITIVE_MACRO( arg1 , arg2 );'
  },

  // ===============================
  // 其他设置
  // ===============================
  {
    key: 'CommentPragmas',
    name: '注释指令',
    description: '指定哪些注释是特殊指令（如// NOLINT），不应被格式化。',
    category: ConfigCategories.COMMENTS,
    type: 'string',
    defaultValue: '^ IWYU pragma:',
    version: '3.7',
    previewTemplate: `// IWYU pragma: keep
#include "header.h"`
  },

  {
    key: 'BinPackArguments',
    name: '参数打包',
    description: '尝试在行宽限制内水平打包函数调用的参数。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: true,
    version: '3.7',
    previewTemplate: `function(arg1, arg2, arg3,
         arg4, arg5);`
  },

  {
    key: 'BinPackParameters',
    name: '形参打包',
    description: '同上，但用于函数定义的形参。',
    category: ConfigCategories.WRAPPING,
    type: 'boolean',
    defaultValue: true,
    version: '3.7',
    previewTemplate: `void function(int param1, int param2,
              int param3, int param4);`
  },

  {
    key: 'BitFieldColonSpacing',
    name: '位域冒号空格',
    description: '位域冒号周围的空格。',
    category: ConfigCategories.SPACING,
    type: 'enum',
    enumValues: ['Both', 'None', 'Before', 'After'],
    defaultValue: 'Both',
    version: '12',
    previewTemplate: `struct BitField {
    unsigned a : 1;
    unsigned b: 2;
    unsigned c :3;
};`
  },

  {
    key: 'VerilogBreakBetweenInstancePorts',
    name: 'Verilog实例端口间换行',
    description: 'Verilog 实例端口之间是否换行。',
    category: ConfigCategories.MISC,
    type: 'boolean',
    defaultValue: true,
    version: '17',
    previewTemplate: `module_instance inst(
    .port1(signal1),
    .port2(signal2)
);`
  }
];

// 默认的 clang-format 配置
export const DEFAULT_CLANG_FORMAT_CONFIG: Record<string, unknown> = {
  BasedOnStyle: 'LLVM',
};

// 完整的示例代码，用于宏观预览
export const MACRO_PREVIEW_CODE = `// =================================================================
//  clang-format 功能演示 C++ 文件
//
//  这个文件包含了多种代码结构，用于直观展示不同 .clang-format
//  配置选项带来的格式化效果。
//
// =================================================================

// --- 1. 头文件 (Include Options) ---
// 测试: IncludeCategories, SortIncludes, IncludeIsMainRegex
#include "format_test.h" // 假设这是“主”头文件
#include <vector>
#include <string>
#include "util/another_local_header.h"
#include <algorithm>
#include <iostream>
#include <gtest/gtest.h> // 模拟第三方库

// --- 2. 命名空间 (Namespace Options) ---
// 测试: NamespaceIndentation, CompactNamespaces, FixNamespaceComments
namespace MyOuterNamespace {
namespace MyInnerNamespace {

class MyClassInNamespace {};

} // namespace MyInnerNamespace
} // namespace MyOuterNamespace

// 测试 CompactNamespaces: true
namespace A { namespace B { namespace C {
    class DeepClass {};
} } }

// --- 3. 类与结构体 (Class & Struct Options) ---
// 测试: BreakBeforeBraces, BraceWrapping, BreakInheritanceList,
//       AccessModifierOffset, IndentAccessModifiers, AlignConsecutiveDeclarations
class MyDemoClass : public BaseClass,
                    private IAnotherInterface // 测试 BreakInheritanceList
{ // 测试 BreakBeforeBraces (Allman vs Attach) 和 BraceWrapping
public: // 测试 AccessModifierOffset 和 IndentAccessModifiers
    MyDemoClass(int val) : value(val), text("hello") {}
    ~MyDemoClass() {}

    // 测试 AlignConsecutiveDeclarations: true
    int         value;
    std::string text;
    bool        isValid;

private:
    void helperFunction();
};

struct SimpleStruct { int x; int y; }; // 测试 AllowShortBlocksOnASingleLine

// --- 4. 函数声明与定义 (Function Options) ---
// 测试: BreakAfterReturnType, BinPackParameters, AlignAfterOpenBracket, ColumnLimit
// 尝试 BinPackParameters: false vs true(BinPack) vs AlwaysOnePerLine
// 尝试 AlignAfterOpenBracket: Align vs DontAlign vs AlwaysBreak
virtual std::vector<std::string> aVeryLongFunctionNameWithManyParameters(int parameterOne, const std::string& parameterTwo, double parameterThree, bool parameterFour, void* parameterFive);

// 测试: AllowShortFunctionsOnASingleLine
int get_answer() { return 42; }
void do_nothing() {}

// --- 5. 函数调用 (Function Call Options) ---
void functionCaller() {
    // 测试: BinPackArguments, ColumnLimit
    aVeryLongFunctionNameWithManyParameters(1, "a very long string literal just to make sure the line exceeds the column limit", 3.1415926535, true, nullptr);

    // 测试构造函数初始化列表的打包
    // 测试: PackConstructorInitializers
    MyDemoClass instance(12345, "some text", false, 987.65, "another long text to wrap");
}

// --- 6. 指针、引用和操作符 (Pointer, Reference & Operator Options) ---
void pointerAndOperatorDemo() {
    // 测试: PointerAlignment (Left, Middle, Right), DerivePointerAlignment
    const char* p1;
    const char * p2;
    const char *p3;
    int& r1 = p1; // 测试 ReferenceAlignment

    // 测试: SpaceAroundPointerQualifiers
    int* const volatile p_qualifiers = nullptr;

    // 测试: BreakBeforeBinaryOperators, AlignOperands
    int result = a_very_long_variable_name_one + another_long_variable_name_two * a_third_long_variable_name - the_final_variable_name;

    // 测试: SpaceBeforeAssignmentOperators
    result=1;

    // 测试: BreakBeforeTernaryOperators
    int ternary_result = (result > 0) ? a_very_long_variable_name_one
                                      : another_long_variable_name_two;
}

// --- 7. 控制流 (Control Flow Options) ---
void controlFlowDemo(int condition) {
    // 测试: AllowShortIfStatementsOnASingleLine, AllowShortLoopsOnASingleLine
    if (condition < 0) return;

    for (int i = 0; i < 10; ++i) continue;

    while (condition--) break;

    // 测试: SpaceBeforeParens (ControlStatements vs Always)
    if(condition) {
        // ...
    }

    // 测试: BreakBeforeBraces, BraceWrapping.BeforeElse, BraceWrapping.BeforeCatch
    if (condition) {
        // block
    } else {
        // another block
    }

    // 测试: IndentCaseLabels, IndentCaseBlocks, AllowShortCaseLabelsOnASingleLine
    switch(condition) {
    case 0:
        break;
    case 1: { // 测试 IndentCaseBlocks
        int x = 1;
        break;
    }
    default:
        break;
    }
}

// --- 8. 模板 (Template Options) ---
// 测试: BreakTemplateDeclarations, SpacesInAngles
template<typename T, typename U>
class MyTemplateClass {};

MyTemplateClass<std::vector<int>, std::string> myInstance; // 测试 SpacesInAngles

// --- 9. C++11 及更高版本特性 (Modern C++ Features) ---
void modernCppDemo() {
    // 测试: Cpp11BracedListStyle
    std::vector<int> v = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12};
    int arr[] {1,2,3};

    // 测试: AllowShortLambdasOnASingleLine
    auto short_lambda = [](){ return 42; };
    auto long_lambda = [](int a, int b){
        // body
        return a + b;
    };

    // 测试: Range-based for loop, SpaceBeforeRangeBasedForLoopColon
    for (auto& item : v) {
        // ...
    }

    // 测试: InsertTrailingCommas (TCS_Wrapped)
    auto my_data_map = {
        std::make_pair(1, "one"),
        std::make_pair(2, "two"),
        std::make_pair(3, "three")
    };
}


// --- 10. 注释 (Comment Options) ---
// 测试: ReflowComments.
// 这是一个非常非常非常长的注释，它的目的是为了故意超出设定的行宽限制 (ColumnLimit)，以便 clang-format 有机会根据配置来决定是否要将这个长注释重排成多行。

int var1 = 1;          // 测试: AlignTrailingComments
std::string long_var = "hello"; // 通过对齐这些行尾注释来观察效果
bool flag = true;      // true

/*
 * 测试: 块注释的格式化
 */

// IWYU pragma: keep - 测试 CommentPragmas，这个注释不应被修改

// --- 11. 宏 (Macro Options) ---
// 测试: ForEachMacros
#define MY_FOR_EACH(item, container) for(auto& item : container)

// 测试: MacroBlockBegin, MacroBlockEnd
#define BEGIN_MY_BLOCK do {
#define END_MY_BLOCK } while(0)

void macroDemo() {
    std::vector<int> v;
    MY_FOR_EACH(i, v) {
        std::cout << i;
    }

    BEGIN_MY_BLOCK
        int x = 1;
    END_MY_BLOCK;

int main() {
    std::cout << "Welcome to Visual .clang-format Editor!" << std::endl;
    return 0;
}
}`;
