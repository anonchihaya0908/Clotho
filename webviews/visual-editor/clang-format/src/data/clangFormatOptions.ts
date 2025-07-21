/**
 * Complete ClangFormat Options Database
 * 完整的 ClangFormat 配置选项数据库
 */

export interface ClangFormatOption {
    key: string;
    name: string;
    description: string;
    category: string;
    type: 'boolean' | 'number' | 'string' | 'enum';
    enumValues?: string[];
    min?: number;
    max?: number;
    defaultValue?: any;
    example?: string;
}

export const CLANG_FORMAT_OPTIONS: ClangFormatOption[] = [
    // 1. 语言 (Language)
    {
        key: 'Language',
        name: '编程语言',
        description: '指定要格式化的语言。通常自动检测，但可强制指定。',
        category: '基础设置',
        type: 'enum',
        enumValues: ['Cpp', 'ObjC'],
        defaultValue: 'Cpp',
        example: 'Cpp - C/C++完全支持，ObjC - Objective-C/C++完全支持'
    },

    // 2. 基础风格 (Based On Style)
    {
        key: 'BasedOnStyle',
        name: '基础风格',
        description: '继承的基础风格。file会向上查找目录中的.clang-format文件并继承。',
        category: '基础设置',
        type: 'enum',
        enumValues: ['LLVM', 'Google', 'Chromium', 'Microsoft', 'Mozilla', 'WebKit', 'file'],
        defaultValue: 'LLVM'
    },

    // 3. 访问修饰符 (Access Modifiers)
    {
        key: 'AccessModifierOffset',
        name: '访问修饰符偏移',
        description: 'public:, private:等访问修饰符的缩进偏移。负数表示悬挂缩进。',
        category: '缩进设置',
        type: 'number',
        min: -16,
        max: 16,
        defaultValue: -2
    },

    // 4. 对齐 (Alignment)
    {
        key: 'AlignAfterOpenBracket',
        name: '开括号后对齐',
        description: '开括号 ( [ { 后的对齐方式。Align表示对齐到开括号，AlwaysBreak表示总是在括号后换行。',
        category: '对齐设置',
        type: 'enum',
        enumValues: ['Align', 'DontAlign', 'AlwaysBreak', 'BlockIndent'],
        defaultValue: 'Align'
    },
    {
        key: 'AlignConsecutiveAssignments',
        name: '连续赋值对齐',
        description: '对齐连续的赋值语句。',
        category: '对齐设置',
        type: 'enum',
        enumValues: ['None', 'Consecutive', 'AcrossEmptyLines', 'AcrossComments'],
        defaultValue: 'None'
    },
    {
        key: 'AlignConsecutiveBitFields',
        name: '连续位域对齐',
        description: '对齐连续的位域声明。',
        category: '对齐设置',
        type: 'enum',
        enumValues: ['None', 'Consecutive', 'AcrossEmptyLines', 'AcrossComments'],
        defaultValue: 'None'
    },
    {
        key: 'AlignConsecutiveDeclarations',
        name: '连续声明对齐',
        description: '对齐连续的变量声明。',
        category: '对齐设置',
        type: 'enum',
        enumValues: ['None', 'Consecutive', 'AcrossEmptyLines', 'AcrossComments'],
        defaultValue: 'None'
    },
    {
        key: 'AlignConsecutiveMacros',
        name: '连续宏定义对齐',
        description: '对齐连续的宏定义。',
        category: '对齐设置',
        type: 'enum',
        enumValues: ['None', 'Consecutive', 'AcrossEmptyLines', 'AcrossComments'],
        defaultValue: 'None'
    },
    {
        key: 'AlignEscapedNewlines',
        name: '转义换行符对齐',
        description: '对齐宏定义中反斜杠 \\ 换行符。',
        category: '对齐设置',
        type: 'enum',
        enumValues: ['DontAlign', 'Left', 'Right'],
        defaultValue: 'Right'
    },
    {
        key: 'AlignOperands',
        name: '操作数对齐',
        description: '对齐二元或三元运算符的操作数。',
        category: '对齐设置',
        type: 'enum',
        enumValues: ['DontAlign', 'Align', 'AlignAfterOperator'],
        defaultValue: 'Align'
    },
    {
        key: 'AlignTrailingComments',
        name: '行尾注释对齐',
        description: '对齐行尾注释。',
        category: '对齐设置',
        type: 'boolean',
        defaultValue: true
    },

    // 5. Allow 开头的选项 (Allow Options)
    {
        key: 'AllowAllParametersOfDeclarationOnNextLine',
        name: '允许参数换行',
        description: '允许函数声明的所有参数换到下一行。',
        category: '换行设置',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'AllowAllConstructorInitializersOnNextLine',
        name: '允许构造函数初始化换行',
        description: '允许构造函数初始化列表的所有成员换到下一行。',
        category: '换行设置',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'AllowShortBlocksOnASingleLine',
        name: '允许短代码块单行',
        description: '允许短的代码块写在单行。Empty只允许空块{}。',
        category: '换行设置',
        type: 'enum',
        enumValues: ['Never', 'Empty', 'Always'],
        defaultValue: 'Never'
    },
    {
        key: 'AllowShortCaseLabelsOnASingleLine',
        name: '允许短case标签单行',
        description: '允许短的case标签写在单行。',
        category: '换行设置',
        type: 'boolean',
        defaultValue: false
    },
    {
        key: 'AllowShortFunctionsOnASingleLine',
        name: '允许短函数单行',
        description: '允许短函数写在单行。',
        category: '换行设置',
        type: 'enum',
        enumValues: ['None', 'Inline', 'Empty', 'All'],
        defaultValue: 'All'
    },
    {
        key: 'AllowShortIfStatementsOnASingleLine',
        name: '允许短if语句单行',
        description: '允许短if语句写在单行。',
        category: '换行设置',
        type: 'enum',
        enumValues: ['Never', 'WithoutElse', 'OnlyEmptyLines', 'Always'],
        defaultValue: 'Never'
    },
    {
        key: 'AllowShortLambdasOnASingleLine',
        name: '允许短lambda单行',
        description: '允许短lambda表达式写在单行。',
        category: '换行设置',
        type: 'enum',
        enumValues: ['None', 'Empty', 'Inline', 'All'],
        defaultValue: 'All'
    },
    {
        key: 'AllowShortLoopsOnASingleLine',
        name: '允许短循环单行',
        description: '允许短循环（for, while, do-while）写在单行。',
        category: '换行设置',
        type: 'boolean',
        defaultValue: false
    },

    // 6. AlwaysBreak 开头的选项 (Always Break Options)
    {
        key: 'AlwaysBreakAfterDefinitionReturnType',
        name: '函数定义返回类型后换行',
        description: '总是在函数定义的返回类型后换行。TopLevel只针对顶级函数。',
        category: '换行设置',
        type: 'enum',
        enumValues: ['None', 'All', 'TopLevel'],
        defaultValue: 'None'
    },
    {
        key: 'AlwaysBreakAfterReturnType',
        name: '函数返回类型后换行',
        description: '总是在函数返回类型后换行（包括声明和定义）。',
        category: '换行设置',
        type: 'enum',
        enumValues: ['None', 'All', 'TopLevel', 'TopLevelDefinitions'],
        defaultValue: 'None'
    },
    {
        key: 'AlwaysBreakBeforeMultilineStrings',
        name: '多行字符串前换行',
        description: '总是在多行字符串字面量前换行。',
        category: '换行设置',
        type: 'boolean',
        defaultValue: false
    },
    {
        key: 'AlwaysBreakTemplateDeclarations',
        name: '模板声明后换行',
        description: '总是在模板声明后换行。MultiLine只在模板声明本身是多行时才换行。',
        category: '换行设置',
        type: 'enum',
        enumValues: ['No', 'MultiLine', 'Yes'],
        defaultValue: 'MultiLine'
    },

    // 7. 打包 (Bin Packing)
    {
        key: 'BinPackArguments',
        name: '参数打包',
        description: '尝试在行宽限制内水平打包函数调用的参数。false表示要么全在一行，要么每个一行。',
        category: '打包设置',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'BinPackParameters',
        name: '形参打包',
        description: '同上，但用于函数定义的形参。',
        category: '打包设置',
        type: 'boolean',
        defaultValue: true
    },

    // 8. 大括号 (Braces)
    {
        key: 'BreakBeforeBraces',
        name: '大括号前换行',
        description: '大括号前的换行风格。',
        category: '大括号设置',
        type: 'enum',
        enumValues: ['Attach', 'Linux', 'Mozilla', 'Stroustrup', 'Allman', 'GNU', 'WebKit', 'Custom'],
        defaultValue: 'Attach'
    },

    // 9. C++ 相关 (C++ Specific)
    {
        key: 'BreakBeforeConceptDeclarations',
        name: 'concept声明前换行',
        description: '在C++20的concept声明前换行。',
        category: 'C++特性',
        type: 'enum',
        enumValues: ['Never', 'Always', 'Allow'],
        defaultValue: 'Always'
    },
    {
        key: 'BreakConstructorInitializers',
        name: '构造函数初始化列表换行',
        description: '构造函数初始化列表的换行方式。',
        category: 'C++特性',
        type: 'enum',
        enumValues: ['BeforeColon', 'BeforeComma', 'AfterColon'],
        defaultValue: 'BeforeColon'
    },
    {
        key: 'BreakStringLiterals',
        name: '字符串字面量换行',
        description: '是否允许打断长的字符串字面量。',
        category: '换行设置',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'CompactNamespaces',
        name: '紧凑命名空间',
        description: '是否将连续的命名空间合并到一行（namespace A::B::C）。',
        category: 'C++特性',
        type: 'boolean',
        defaultValue: false
    },
    {
        key: 'ConstructorInitializerAllOnOneLineOrOnePerLine',
        name: '构造函数初始化列表格式',
        description: '构造函数初始化列表要么全在一行，要么每个成员一行。',
        category: 'C++特性',
        type: 'boolean',
        defaultValue: false
    },
    {
        key: 'ConstructorInitializerIndentWidth',
        name: '构造函数初始化缩进',
        description: '构造函数初始化列表的缩进宽度。',
        category: '缩进设置',
        type: 'number',
        min: 0,
        max: 16,
        defaultValue: 4
    },
    {
        key: 'Cpp11BracedListStyle',
        name: 'C++11大括号列表风格',
        description: 'C++11风格的大括号初始化列表（{}）的格式化。true表示大括号和内容之间没有空格。',
        category: 'C++特性',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'DerivePointerAlignment',
        name: '自动推断指针对齐',
        description: '自动推断指针的对齐风格，而不是使用PointerAlignment。',
        category: '指针和引用',
        type: 'boolean',
        defaultValue: false
    },
    {
        key: 'FixNamespaceComments',
        name: '修复命名空间注释',
        description: '自动在长的命名空间右大括号后添加注释。',
        category: 'C++特性',
        type: 'boolean',
        defaultValue: true
    },

    // 10. 缩进与列宽 (Indentation & Columns)
    {
        key: 'ColumnLimit',
        name: '行宽限制',
        description: '行宽限制。',
        category: '行宽设置',
        type: 'number',
        min: 0,
        max: 200,
        defaultValue: 80
    },
    {
        key: 'ContinuationIndentWidth',
        name: '续行缩进宽度',
        description: '换行后的续行缩进宽度。',
        category: '缩进设置',
        type: 'number',
        min: 0,
        max: 16,
        defaultValue: 4
    },
    {
        key: 'IndentPPDirectives',
        name: '预处理指令缩进',
        description: '预处理指令的缩进方式。',
        category: '缩进设置',
        type: 'enum',
        enumValues: ['None', 'AfterHash', 'BeforeHash'],
        defaultValue: 'None'
    },
    {
        key: 'IndentWidth',
        name: '缩进宽度',
        description: '常规缩进宽度。',
        category: '缩进设置',
        type: 'number',
        min: 1,
        max: 16,
        defaultValue: 2
    },
    {
        key: 'IndentWrappedFunctionNames',
        name: '换行函数名缩进',
        description: '如果函数返回类型换行了，是否缩进函数名。',
        category: '缩进设置',
        type: 'boolean',
        defaultValue: false
    },
    {
        key: 'NamespaceIndentation',
        name: '命名空间缩进',
        description: '命名空间内部的缩进方式。None表示不缩进。',
        category: '缩进设置',
        type: 'enum',
        enumValues: ['None', 'Inner', 'All'],
        defaultValue: 'None'
    },
    {
        key: 'TabWidth',
        name: 'Tab宽度',
        description: 'Tab字符的显示宽度。',
        category: '缩进设置',
        type: 'number',
        min: 1,
        max: 16,
        defaultValue: 8
    },
    {
        key: 'UseTab',
        name: '使用Tab',
        description: '使用Tab键的策略。',
        category: '缩进设置',
        type: 'enum',
        enumValues: ['Never', 'ForIndentation', 'ForContinuationAndIndentation', 'Always'],
        defaultValue: 'Never'
    },

    // 11. 空格 (Spacing)
    {
        key: 'SpaceAfterCStyleCast',
        name: 'C风格转换后空格',
        description: 'C风格强制类型转换 (int)x 后是否加空格。',
        category: '空格设置',
        type: 'boolean',
        defaultValue: false
    },
    {
        key: 'SpaceAfterTemplateKeyword',
        name: 'template关键字后空格',
        description: 'template <...> 之后是否加空格。',
        category: '空格设置',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'SpaceBeforeAssignmentOperators',
        name: '赋值运算符前空格',
        description: '赋值运算符（=, +=）前是否加空格。',
        category: '空格设置',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'SpaceBeforeCtorInitializerColon',
        name: '构造函数初始化冒号前空格',
        description: '构造函数初始化列表的冒号:前是否加空格。',
        category: '空格设置',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'SpaceBeforeInheritanceColon',
        name: '继承冒号前空格',
        description: '类继承的冒号:前是否加空格。',
        category: '空格设置',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'SpaceBeforeParens',
        name: '括号前空格',
        description: '圆括号(前的空格策略。',
        category: '空格设置',
        type: 'enum',
        enumValues: ['Never', 'ControlStatements', 'NonEmptyParentheses', 'Always'],
        defaultValue: 'ControlStatements'
    },
    {
        key: 'SpaceBeforeRangeBasedForLoopColon',
        name: '范围for循环冒号前空格',
        description: 'C++11范围for循环的冒号:前是否加空格。',
        category: '空格设置',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'SpaceInEmptyParentheses',
        name: '空括号内空格',
        description: '空括号 () 内是否加空格。',
        category: '空格设置',
        type: 'boolean',
        defaultValue: false
    },
    {
        key: 'SpacesInAngles',
        name: '尖括号内空格',
        description: '模板尖括号 < > 内是否加空格。',
        category: '空格设置',
        type: 'enum',
        enumValues: ['Never', 'Always', 'Leave'],
        defaultValue: 'Never'
    },
    {
        key: 'SpacesInCStyleCastParentheses',
        name: 'C风格转换括号内空格',
        description: 'C风格强制类型转换的括号内是否加空格。',
        category: '空格设置',
        type: 'boolean',
        defaultValue: false
    },
    {
        key: 'SpacesInContainerLiterals',
        name: '容器字面量内空格',
        description: '容器字面量（如std::vector<int>{1, 2}）的大括号内是否加空格。',
        category: '空格设置',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'SpacesInParentheses',
        name: '圆括号内空格',
        description: '圆括号()内是否加空格。',
        category: '空格设置',
        type: 'boolean',
        defaultValue: false
    },
    {
        key: 'SpacesInSquareBrackets',
        name: '方括号内空格',
        description: '方括号 [] 内是否加空格。',
        category: '空格设置',
        type: 'boolean',
        defaultValue: false
    },

    // 12. 其他 (Miscellaneous)
    {
        key: 'CommentPragmas',
        name: '注释指令',
        description: '指定哪些注释是特殊指令（如// NOLINT），不应被格式化。',
        category: '其他设置',
        type: 'string',
        defaultValue: '^ IWYU pragma:'
    },
    {
        key: 'IncludeBlocks',
        name: 'Include块风格',
        description: '#include块的风格。Regroup会按SortIncludes的规则重新分组。',
        category: '其他设置',
        type: 'enum',
        enumValues: ['Preserve', 'Merge', 'Regroup'],
        defaultValue: 'Preserve'
    },
    {
        key: 'PointerAlignment',
        name: '指针对齐',
        description: '指针/引用修饰符的对齐。',
        category: '指针和引用',
        type: 'enum',
        enumValues: ['Left', 'Right', 'Middle'],
        defaultValue: 'Right'
    },
    {
        key: 'ReferenceAlignment',
        name: '引用对齐',
        description: '引用符号&的对齐方式。Pointer表示跟随指针对齐设置。',
        category: '指针和引用',
        type: 'enum',
        enumValues: ['Pointer', 'Left', 'Right', 'Middle'],
        defaultValue: 'Pointer'
    },
    {
        key: 'SortIncludes',
        name: '排序Include',
        description: '是否对#include进行排序。',
        category: '其他设置',
        type: 'enum',
        enumValues: ['Never', 'CaseSensitive', 'CaseInsensitive'],
        defaultValue: 'CaseSensitive'
    },
    {
        key: 'SortUsingDeclarations',
        name: '排序using声明',
        description: '是否对using声明进行排序。',
        category: '其他设置',
        type: 'boolean',
        defaultValue: true
    },

    // 更多高级选项
    {
        key: 'BreakBeforeBinaryOperators',
        name: '二元运算符前换行',
        description: '在二元运算符前是否换行。',
        category: '换行设置',
        type: 'enum',
        enumValues: ['None', 'NonAssignment', 'All'],
        defaultValue: 'None'
    },
    {
        key: 'BreakBeforeTernaryOperators',
        name: '三元运算符前换行',
        description: '在三元运算符前是否换行。',
        category: '换行设置',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'BreakInheritanceList',
        name: '继承列表换行',
        description: '继承列表的换行方式。',
        category: 'C++特性',
        type: 'enum',
        enumValues: ['BeforeColon', 'BeforeComma', 'AfterColon'],
        defaultValue: 'BeforeColon'
    },
    {
        key: 'IndentCaseLabels',
        name: 'case标签缩进',
        description: '是否缩进switch语句中的case标签。',
        category: '缩进设置',
        type: 'boolean',
        defaultValue: false
    },
    {
        key: 'KeepEmptyLinesAtTheStartOfBlocks',
        name: '保持块开始空行',
        description: '是否保持代码块开始处的空行。',
        category: '空行设置',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'MaxEmptyLinesToKeep',
        name: '最大保持空行数',
        description: '最多保持连续的空行数量。',
        category: '空行设置',
        type: 'number',
        min: 0,
        max: 10,
        defaultValue: 1
    },
    {
        key: 'ReflowComments',
        name: '重排注释',
        description: '是否重新排列注释以适应行宽限制。',
        category: '其他设置',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'SpacesBeforeTrailingComments',
        name: '行尾注释前空格数',
        description: '行尾注释前的最少空格数。',
        category: '空格设置',
        type: 'number',
        min: 0,
        max: 10,
        defaultValue: 1
    }
];

// 按类别分组
export const CLANG_FORMAT_CATEGORIES = [
    '基础设置',
    '缩进设置',
    '对齐设置',
    '换行设置',
    '大括号设置',
    '空格设置',
    '空行设置',
    '打包设置',
    'C++特性',
    '指针和引用',
    '行宽设置',
    '其他设置'
];

// 获取指定类别的选项
export function getOptionsByCategory(category: string): ClangFormatOption[] {
    return CLANG_FORMAT_OPTIONS.filter(option => option.category === category);
}

// 根据关键词搜索选项
export function searchOptions(query: string): ClangFormatOption[] {
    const lowerQuery = query.toLowerCase();
    return CLANG_FORMAT_OPTIONS.filter(option =>
        option.key.toLowerCase().includes(lowerQuery) ||
        option.name.toLowerCase().includes(lowerQuery) ||
        option.description.toLowerCase().includes(lowerQuery)
    );
}

// 根据语言确定哪些选项应该被禁用
export function getDisabledOptionsForLanguage(language: string): string[] {
    switch (language) {
        case 'ObjC':
            // Objective-C不支持的选项
            return [
                'Cpp11BracedListStyle',
                'BreakBeforeConceptDeclarations',
                'CompactNamespaces',
                'FixNamespaceComments',
                'NamespaceIndentation',
                'SortUsingDeclarations',
                'SpaceBeforeCtorInitializerColon',
                'SpaceBeforeInheritanceColon',
                'SpaceBeforeRangeBasedForLoopColon',
                'BreakConstructorInitializers',
                'BreakInheritanceList',
                'ConstructorInitializerAllOnOneLineOrOnePerLine',
                'ConstructorInitializerIndentWidth'
            ];
        case 'Cpp':
        default:
            // C++支持所有选项
            return [];
    }
}

// 检查选项是否在当前语言下被禁用
export function isOptionDisabledForLanguage(optionKey: string, language: string): boolean {
    const disabledOptions = getDisabledOptionsForLanguage(language);
    return disabledOptions.includes(optionKey);
}