import React, { useMemo } from 'react';
import { ClangFormatOption, SearchConfigProps, OptionFilters } from '../../types';
import './style.css';

// 使用共享的SearchConfigProps类型

// 配置项的中英文映射，便于搜索
const CONFIG_SEARCH_MAP: Record<string, string[]> = {
    'IndentWidth': ['缩进', '宽度', 'indent', 'width', '空格'],
    'TabWidth': ['tab', '制表符', '宽度', 'width'],
    'UseTab': ['tab', '制表符', '使用', 'use'],
    'ColumnLimit': ['列', '限制', '行长度', '字符', 'column', 'limit', 'line', 'length'],
    'BreakBeforeBraces': ['大括号', '换行', '断行', 'brace', 'break', 'before'],
    'PointerAlignment': ['指针', '对齐', 'pointer', 'alignment'],
    'ReferenceAlignment': ['引用', '对齐', 'reference', 'alignment'],
    'SpaceBeforeParens': ['空格', '括号', '前', 'space', 'before', 'parentheses'],
    'SpaceAfterCStyleCast': ['空格', 'c', '转换', '后', 'space', 'after', 'cast'],
    'BasedOnStyle': ['基础', '风格', '样式', 'based', 'style', 'base'],
    'AccessModifierOffset': ['访问', '修饰符', '偏移', 'access', 'modifier', 'offset'],
    'AlignAfterOpenBracket': ['对齐', '括号', '后', 'align', 'after', 'bracket'],
    'AlignConsecutiveAssignments': ['对齐', '连续', '赋值', 'align', 'consecutive', 'assignments'],
    'AlignConsecutiveDeclarations': ['对齐', '连续', '声明', 'align', 'consecutive', 'declarations'],
    'AlignOperands': ['对齐', '操作数', 'align', 'operands'],
    'AlignTrailingComments': ['对齐', '尾随', '注释', 'align', 'trailing', 'comments'],
    'AllowAllParametersOfDeclarationOnNextLine': ['参数', '声明', '下一行', 'parameters', 'declaration', 'next', 'line'],
    'AllowShortBlocksOnASingleLine': ['短', '块', '单行', 'short', 'blocks', 'single', 'line'],
    'AllowShortFunctionsOnASingleLine': ['短', '函数', '单行', 'short', 'functions', 'single', 'line'],
    'AllowShortIfStatementsOnASingleLine': ['短', 'if', '语句', '单行', 'short', 'if', 'statements', 'single', 'line'],
    'BinPackArguments': ['参数', '打包', 'bin', 'pack', 'arguments'],
    'BinPackParameters': ['参数', '打包', 'bin', 'pack', 'parameters'],
    'BreakAfterJavaFieldAnnotations': ['java', '字段', '注解', '断行', 'break', 'after', 'field', 'annotations'],
    'BreakBeforeBinaryOperators': ['二元', '操作符', '断行', '前', 'break', 'before', 'binary', 'operators'],
    'BreakBeforeTernaryOperators': ['三元', '操作符', '断行', '前', 'break', 'before', 'ternary', 'operators'],
    'BreakConstructorInitializers': ['构造函数', '初始化', '断行', 'break', 'constructor', 'initializers'],
    'BreakInheritanceList': ['继承', '列表', '断行', 'break', 'inheritance', 'list'],
    'BreakStringLiterals': ['字符串', '字面量', '断行', 'break', 'string', 'literals'],
    'CommentPragmas': ['注释', '编译指示', 'comment', 'pragmas'],
    'CompactNamespaces': ['紧凑', '命名空间', 'compact', 'namespaces'],
    'ConstructorInitializerAllOnOneLineOrOnePerLine': ['构造函数', '初始化', '一行', 'constructor', 'initializer', 'one', 'line'],
    'ConstructorInitializerIndentWidth': ['构造函数', '初始化', '缩进', '宽度', 'constructor', 'initializer', 'indent', 'width'],
    'ContinuationIndentWidth': ['继续', '缩进', '宽度', 'continuation', 'indent', 'width'],
    'Cpp11BracedListStyle': ['cpp11', '花括号', '列表', '样式', 'cpp11', 'braced', 'list', 'style'],
    'DeriveLineEnding': ['派生', '行', '结尾', 'derive', 'line', 'ending'],
    'DerivePointerAlignment': ['派生', '指针', '对齐', 'derive', 'pointer', 'alignment'],
    'ExperimentalAutoDetectBinPacking': ['实验性', '自动', '检测', '打包', 'experimental', 'auto', 'detect', 'bin', 'packing'],
    'FixNamespaceComments': ['修复', '命名空间', '注释', 'fix', 'namespace', 'comments'],
    'ForEachMacros': ['foreach', '宏', 'foreach', 'macros'],
    'IncludeBlocks': ['包含', '块', 'include', 'blocks'],
    'IndentCaseLabels': ['缩进', 'case', '标签', 'indent', 'case', 'labels'],
    'IndentPPDirectives': ['缩进', '预处理', '指令', 'indent', 'pp', 'directives'],
    'IndentWrappedFunctionNames': ['缩进', '换行', '函数', '名称', 'indent', 'wrapped', 'function', 'names'],
    'JavaScriptQuotes': ['javascript', '引号', 'javascript', 'quotes'],
    'JavaScriptWrapImports': ['javascript', '换行', '导入', 'javascript', 'wrap', 'imports'],
    'KeepEmptyLinesAtTheStartOfBlocks': ['保持', '空行', '块', '开始', 'keep', 'empty', 'lines', 'start', 'blocks'],
    'MacroBlockBegin': ['宏', '块', '开始', 'macro', 'block', 'begin'],
    'MacroBlockEnd': ['宏', '块', '结束', 'macro', 'block', 'end'],
    'MaxEmptyLinesToKeep': ['最大', '空行', '保持', 'max', 'empty', 'lines', 'keep'],
    'NamespaceIndentation': ['命名空间', '缩进', 'namespace', 'indentation'],
    'PenaltyBreakAssignment': ['惩罚', '断行', '赋值', 'penalty', 'break', 'assignment'],
    'PenaltyBreakBeforeFirstCallParameter': ['惩罚', '断行', '第一个', '调用', '参数', 'penalty', 'break', 'before', 'first', 'call', 'parameter'],
    'PenaltyBreakComment': ['惩罚', '断行', '注释', 'penalty', 'break', 'comment'],
    'PenaltyBreakFirstLessLess': ['惩罚', '断行', '第一个', 'penalty', 'break', 'first', 'less'],
    'PenaltyBreakString': ['惩罚', '断行', '字符串', 'penalty', 'break', 'string'],
    'PenaltyBreakTemplateDeclaration': ['惩罚', '断行', '模板', '声明', 'penalty', 'break', 'template', 'declaration'],
    'PenaltyExcessCharacter': ['惩罚', '超出', '字符', 'penalty', 'excess', 'character'],
    'PenaltyReturnTypeOnItsOwnLine': ['惩罚', '返回', '类型', '单独', '行', 'penalty', 'return', 'type', 'own', 'line'],
    'ReflowComments': ['重排', '注释', 'reflow', 'comments'],
    'SortIncludes': ['排序', '包含', 'sort', 'includes'],
    'SortUsingDeclarations': ['排序', 'using', '声明', 'sort', 'using', 'declarations'],
    'SpaceAfterTemplateKeyword': ['空格', '模板', '关键字', '后', 'space', 'after', 'template', 'keyword'],
    'SpaceBeforeAssignmentOperators': ['空格', '赋值', '操作符', '前', 'space', 'before', 'assignment', 'operators'],
    'SpaceBeforeCtorInitializerColon': ['空格', '构造函数', '初始化', '冒号', '前', 'space', 'before', 'ctor', 'initializer', 'colon'],
    'SpaceBeforeInheritanceColon': ['空格', '继承', '冒号', '前', 'space', 'before', 'inheritance', 'colon'],
    'SpaceBeforeRangeBasedForLoopColon': ['空格', '基于范围', 'for', '循环', '冒号', '前', 'space', 'before', 'range', 'based', 'for', 'loop', 'colon'],
    'SpaceInEmptyParentheses': ['空格', '空', '括号', 'space', 'empty', 'parentheses'],
    'SpacesBeforeTrailingComments': ['空格', '尾随', '注释', '前', 'spaces', 'before', 'trailing', 'comments'],
    'SpacesInAngles': ['空格', '尖', '括号', 'spaces', 'angles'],
    'SpacesInCStyleCastParentheses': ['空格', 'c', '风格', '转换', '括号', 'spaces', 'c', 'style', 'cast', 'parentheses'],
    'SpacesInContainerLiterals': ['空格', '容器', '字面量', 'spaces', 'container', 'literals'],
    'SpacesInParentheses': ['空格', '括号', 'spaces', 'parentheses'],
    'SpacesInSquareBrackets': ['空格', '方', '括号', 'spaces', 'square', 'brackets'],
    'Standard': ['标准', 'standard'],
    'StatementMacros': ['语句', '宏', 'statement', 'macros'],
    'TypenameMacros': ['类型名', '宏', 'typename', 'macros']
};

export const SearchConfig: React.FC<SearchConfigProps> = ({
    options,
    searchQuery,
    config,
    onChange
}) => {
    // 过滤搜索结果
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) {
            return options;
        }

        const query = searchQuery.toLowerCase().trim();

        return options.filter(option => {
            // 搜索配置项名称
            if (option.key.toLowerCase().includes(query)) {
                return true;
            }

            // 搜索中英文关键词
            const keywords = CONFIG_SEARCH_MAP[option.key] || [];
            return keywords.some(keyword =>
                keyword.toLowerCase().includes(query)
            );
        });
    }, [options, searchQuery]);

    const renderOptionValue = (option: ClangFormatOption) => {
        const value = config[option.key];
        // 所有选项都支持，因为只使用 C++
        const isDisabled = false;

        switch (option.type) {
            case 'boolean':
                return (
                    <label className={`search-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                        <input
                            type="checkbox"
                            checked={Boolean(value)}
                            disabled={isDisabled}
                            onChange={(e) => onChange(option.key, e.target.checked)}
                        />
                        <span className="search-checkbox-custom"></span>
                        <span className="checkbox-text">
                            {value ? '启用' : '禁用'}
                        </span>
                    </label>
                );

            case 'number':
                return (
                    <input
                        type="number"
                        value={value || ''}
                        disabled={isDisabled}
                        onChange={(e) => onChange(option.key, parseInt(e.target.value) || 0)}
                        className={`search-number-input ${isDisabled ? 'disabled' : ''}`}
                        min={option.min}
                        max={option.max}
                        placeholder={option.defaultValue?.toString() || ''}
                    />
                );

            case 'string':
                return (
                    <input
                        type="text"
                        value={value || ''}
                        disabled={isDisabled}
                        onChange={(e) => onChange(option.key, e.target.value)}
                        className={`search-text-input ${isDisabled ? 'disabled' : ''}`}
                        placeholder="输入值..."
                    />
                );

            case 'enum':
                return (
                    <select
                        value={value !== undefined ? value : (option.defaultValue || '')}
                        disabled={isDisabled}
                        onChange={(e) => onChange(option.key, e.target.value)}
                        className={`search-select-input ${isDisabled ? 'disabled' : ''}`}
                    >
                        {option.enumValues?.map((enumValue: string) => (
                            <option key={enumValue} value={enumValue}>
                                {enumValue}
                            </option>
                        ))}
                    </select>
                );

            default:
                return <span className="unknown-type">未知类型</span>;
        }
    };

    const getSearchResultIcon = (option: ClangFormatOption) => {
        // 根据配置类型返回不同图标
        if (option.key.includes('Indent') || option.key.includes('Width')) return '↹';
        if (option.key.includes('Space')) return '␣';
        if (option.key.includes('Break') || option.key.includes('Brace')) return '{}';
        if (option.key.includes('Align')) return '⌐';
        if (option.key.includes('Comment')) return '';
        if (option.key.includes('Penalty')) return '';
        if (option.key.includes('Sort') || option.key.includes('Include')) return '';
        if (option.key.includes('Pointer') || option.key.includes('Reference')) return '*&';
        if (option.key.includes('Namespace')) return '';
        if (option.key.includes('Template')) return '';
        return '';
    };

    return (
        <div className="search-config">
            <div className="search-header">
                <h3> 搜索配置</h3>
                <p>找到了 <strong>{filteredOptions.length}</strong> 个匹配的配置项</p>
            </div>

            {searchQuery.trim() && filteredOptions.length === 0 && (
                <div className="no-results">
                    <div className="no-results-icon"></div>
                    <div className="no-results-text">
                        <h4>未找到匹配的配置项</h4>
                        <p>尝试使用其他关键词，比如：</p>
                        <div className="search-suggestions">
                            <span className="suggestion">缩进</span>
                            <span className="suggestion">大括号</span>
                            <span className="suggestion">空格</span>
                            <span className="suggestion">对齐</span>
                            <span className="suggestion">指针</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="search-results">
                {filteredOptions.map((option: ClangFormatOption) => {
                    // 所有选项都支持，因为只使用 C++
                    const isDisabled = false;

                    return (
                        <div key={option.key} className={`search-result-item ${isDisabled ? 'disabled' : ''}`}>
                            <div className="result-header">
                                <div className="result-title">
                                    <span className="result-icon">{getSearchResultIcon(option)}</span>
                                    <span className="result-name">{option.name || option.key}</span>
                                    <span className="result-type">{option.type}</span>
                                    <span className="result-category">{option.category}</span>
                                </div>
                                <div className="result-value">
                                    {renderOptionValue(option)}
                                </div>
                            </div>

                            {option.description && (
                                <div className="result-description">
                                    {option.description}
                                </div>
                            )}

                            {/* 显示搜索匹配的关键词 */}
                            {searchQuery.trim() && (
                                <div className="result-keywords">
                                    <span className="keywords-label">相关关键词:</span>
                                    {(CONFIG_SEARCH_MAP[option.key] || [])
                                        .filter(keyword =>
                                            keyword.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .slice(0, 3)
                                        .map((keyword, index) => (
                                            <span key={index} className="keyword-tag">
                                                {keyword}
                                            </span>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredOptions.length > 0 && (
                <div className="search-footer">
                    <div className="search-tip">
                        <span className="tip-icon"></span>
                        <span>点击配置项进行修改，修改后会实时预览效果</span>
                    </div>
                </div>
            )}
        </div>
    );
};
