import { OptionPreviewSnippet } from '../../../common/types/clang-format-shared';

// Minimal curated snippets + anchors for M2 step 1
// token anchors are searched within the macro preview content to compute ranges dynamically

export const SNIPPETS_METADATA: Record<string, OptionPreviewSnippet> = {
  // Base style selection usually affects many rules; use header as a general anchor
  BasedOnStyle: {
    optionKey: 'BasedOnStyle',
    snippetId: 'based-on-style-basic',
    code: 'class Example {\npublic:\n  void method();\n};\n',
    anchors: [
      { id: 'include-section', token: '// --- 1. 头文件', startLine: 1 },
    ],
  },

  // Indentation width typically affects class/method blocks
  IndentWidth: {
    optionKey: 'IndentWidth',
    snippetId: 'indent-width-basic',
    code: 'int main(){\nint x=0;\nif(x){\nreturn 1;\n}\n}\n',
    anchors: [
      { id: 'class-section', token: '// --- 3. 类与结构体', startLine: 1 },
    ],
  },

  // Column limit affects long lines wrapping
  ColumnLimit: {
    optionKey: 'ColumnLimit',
    snippetId: 'column-limit-basic',
    code: 'void f(int a, int b, int c, int d, int e, int f){ /* long line */ }\n',
    anchors: [
      { id: 'long-line', token: '功能演示', startLine: 1 },
    ],
  },

  // AlignAfterOpenBracket influences parameter alignment
  AlignAfterOpenBracket: {
    optionKey: 'AlignAfterOpenBracket',
    snippetId: 'align-after-open-bracket',
    code: 'function(argument1,\n         argument2,\n         argument3);\n',
    anchors: [
      { id: 'param-section', token: '参数对齐', startLine: 1 },
    ],
  },

  // --- Include Options ---
  SortIncludes: {
    optionKey: 'SortIncludes',
    snippetId: 'sort-includes',
    code: '#include "z_local.h"\n#include "a_local.h"\n#include <vector>\n',
    anchors: [ { id: 'includes', token: '头文件 (Include Options)', startLine: 1 } ],
  },
  IncludeBlocks: {
    optionKey: 'IncludeBlocks',
    snippetId: 'include-blocks',
    code: '#include <c>\n#include <b>\n#include "local.h"\n',
    anchors: [ { id: 'includes-block', token: '头文件 (Include Options)', startLine: 1 } ],
  },

  // --- Namespace Options ---
  NamespaceIndentation: {
    optionKey: 'NamespaceIndentation',
    snippetId: 'namespace-indentation',
    code: 'namespace A {\nnamespace B {\nclass C {};\n}\n}\n',
    anchors: [ { id: 'ns-section', token: '命名空间 (Namespace Options)', startLine: 1 } ],
  },
  CompactNamespaces: {
    optionKey: 'CompactNamespaces',
    snippetId: 'compact-namespaces',
    code: 'namespace A { namespace B { namespace C { class D {}; } } }\n',
    anchors: [ { id: 'ns-compact', token: 'CompactNamespaces', startLine: 1 } ],
  },

  // --- Class & Struct Options ---
  BreakBeforeBraces: {
    optionKey: 'BreakBeforeBraces',
    snippetId: 'break-before-braces',
    code: 'class K\n{\n  int x;\n};\n',
    anchors: [ { id: 'class-section', token: '类与结构体 (Class & Struct Options)', startLine: 1 } ],
  },
  AlignConsecutiveDeclarations: {
    optionKey: 'AlignConsecutiveDeclarations',
    snippetId: 'align-consecutive-decls',
    code: 'int         a;\nstd::string b;\nbool        c;\n',
    anchors: [ { id: 'decls', token: 'AlignConsecutiveDeclarations', startLine: 1 } ],
  },
  AccessModifierOffset: {
    optionKey: 'AccessModifierOffset',
    snippetId: 'access-modifier-offset',
    code: 'class X {\npublic:\n  void f();\nprivate:\n  int v;\n};\n',
    anchors: [ { id: 'access', token: 'AccessModifierOffset', startLine: 1 } ],
  },

  // --- Function Options ---
  BreakAfterReturnType: {
    optionKey: 'BreakAfterReturnType',
    snippetId: 'break-after-return-type',
    code: 'std::vector<int>\nfoo(int a, int b);\n',
    anchors: [ { id: 'func-decl', token: '函数声明与定义 (Function Options)', startLine: 1 } ],
  },
  BinPackParameters: {
    optionKey: 'BinPackParameters',
    snippetId: 'binpack-parameters',
    code: 'void g(int a, int b, int c, int d, int e);\n',
    anchors: [ { id: 'func-params', token: '函数声明与定义 (Function Options)', startLine: 1 } ],
  },

  // --- Function Call Options ---
  BinPackArguments: {
    optionKey: 'BinPackArguments',
    snippetId: 'binpack-arguments',
    code: 'g(1, 2, 3, 4, 5, 6);\n',
    anchors: [ { id: 'func-call', token: '函数调用 (Function Call Options)', startLine: 1 } ],
  },
  PackConstructorInitializers: {
    optionKey: 'PackConstructorInitializers',
    snippetId: 'pack-ctor-inits',
    code: 'X::X() : a(1), b(2), c(3), d(4) {}\n',
    anchors: [ { id: 'ctor-init', token: '构造函数初始化列表', startLine: 1 } ],
  },

  // --- Pointer, Reference & Operator Options ---
  PointerAlignment: {
    optionKey: 'PointerAlignment',
    snippetId: 'pointer-alignment',
    code: 'const char* p1;\nconst char * p2;\nconst char *p3;\n',
    anchors: [ { id: 'ptr-section', token: '指针、引用和操作符', startLine: 1 } ],
  },
  BreakBeforeBinaryOperators: {
    optionKey: 'BreakBeforeBinaryOperators',
    snippetId: 'break-before-binary-ops',
    code: 'int r = a + b * c - d;\n',
    anchors: [ { id: 'ops', token: 'BreakBeforeBinaryOperators', startLine: 1 } ],
  },
  SpaceBeforeAssignmentOperators: {
    optionKey: 'SpaceBeforeAssignmentOperators',
    snippetId: 'space-before-assign',
    code: 'int x=1;\n',
    anchors: [ { id: 'assign', token: 'SpaceBeforeAssignmentOperators', startLine: 1 } ],
  },

  // --- Control Flow ---
  AllowShortIfStatementsOnASingleLine: {
    optionKey: 'AllowShortIfStatementsOnASingleLine',
    snippetId: 'short-if',
    code: 'int f(bool c){ if(c) return 1; return 0; }\n',
    anchors: [ { id: 'ctrl-flow', token: '控制流 (Control Flow Options)', startLine: 1 } ],
  },
  SpaceBeforeParens: {
    optionKey: 'SpaceBeforeParens',
    snippetId: 'space-before-parens',
    code: 'if(condition){ return; }\n',
    anchors: [ { id: 'parens', token: 'SpaceBeforeParens', startLine: 1 } ],
  },
  IndentCaseBlocks: {
    optionKey: 'IndentCaseBlocks',
    snippetId: 'indent-case-blocks',
    code: 'switch(x){ case 1: { int y = 0; break; } default: break; }\n',
    anchors: [ { id: 'switch', token: 'IndentCaseBlocks', startLine: 1 } ],
  },
  IndentCaseLabels: {
    optionKey: 'IndentCaseLabels',
    snippetId: 'indent-case-labels',
    code: 'switch(x){ case 0: break; case 1: break; }\n',
    anchors: [ { id: 'switch-labels', token: 'IndentCaseLabels', startLine: 1 } ],
  },

  // --- Spacing & Indentation ---
  SpacesInParentheses: {
    optionKey: 'SpacesInParentheses',
    snippetId: 'spaces-in-parens',
    code: 'int y = f( 1, 2 );\n',
    anchors: [ { id: 'spaces-parens', token: '函数调用 (Function Call Options)', startLine: 1 } ],
  },
  UseTab: {
    optionKey: 'UseTab',
    snippetId: 'use-tab',
    code: 'int x;\n\tint y;\n',
    anchors: [ { id: 'tabs', token: '类与结构体 (Class & Struct Options)', startLine: 1 } ],
  },
};

export function getOptionSnippet(optionKey: string): OptionPreviewSnippet | undefined {
  return SNIPPETS_METADATA[optionKey];
}
