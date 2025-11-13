// Simple UI helper: map option key to affected macro preview area label

export function getAffectedAreaLabel(optionKey: string): string {
  const k = optionKey;
  // Include
  if (k === 'SortIncludes' || k === 'IncludeBlocks' || k.startsWith('Include')) return '头文件 / Includes';
  // Namespace
  if (k === 'NamespaceIndentation' || k === 'CompactNamespaces' || k.includes('Namespace')) return '命名空间';
  // Class & Struct
  if (k === 'BreakBeforeBraces' || k === 'AlignConsecutiveDeclarations' || k === 'AccessModifierOffset' || k.includes('Brace')) return '类与结构体';
  // Function declaration
  if (k === 'BreakAfterReturnType' || k === 'BinPackParameters' || k.includes('ReturnType')) return '函数声明';
  // Function call
  if (k === 'BinPackArguments' || k === 'PackConstructorInitializers') return '函数调用';
  // Pointers / Operators
  if (k === 'PointerAlignment' || k === 'BreakBeforeBinaryOperators' || k === 'SpaceBeforeAssignmentOperators') return '指针与运算符';
  // Control flow
  if (k === 'AllowShortIfStatementsOnASingleLine' || k === 'IndentCaseBlocks' || k === 'IndentCaseLabels' || k === 'SpaceBeforeParens') return '控制流';
  // Spacing/Indentation
  if (k === 'IndentWidth' || k === 'UseTab' || k === 'SpacesInParentheses' || k === 'ColumnLimit' || k === 'AlignAfterOpenBracket') return '缩进与空格';
  // Base style
  if (k === 'BasedOnStyle') return '全局风格';
  return '其它';
}

