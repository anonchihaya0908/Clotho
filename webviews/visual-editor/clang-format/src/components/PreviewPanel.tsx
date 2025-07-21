/**
 * Preview Panel Component - 宏观预览面板
 */

import React, { useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import cpp from 'highlight.js/lib/languages/cpp';
// 使用更适合的主题，或者不导入让CSS来控制
// import 'highlight.js/styles/vs2015.css'; // VS Code dark theme

// 注册 C++ 语言
hljs.registerLanguage('cpp', cpp);

export interface PreviewPanelProps {
    macroPreview: string;
    isValid: boolean;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
    macroPreview,
    isValid
}) => {
    const codeRef = useRef<HTMLElement>(null);

    // 应用语法高亮
    useEffect(() => {
        if (codeRef.current && macroPreview) {
            // 清除之前的高亮
            codeRef.current.removeAttribute('data-highlighted');
            codeRef.current.textContent = macroPreview;

            try {
                // 应用 C++ 语法高亮
                hljs.highlightElement(codeRef.current);
                console.log('Highlight.js applied to preview panel:', codeRef.current.classList);
            } catch (error) {
                console.error('Highlight.js error in preview panel:', error);
            }
        }
    }, [macroPreview]);

    return (
        <div className="preview-panel">
            <div className="preview-header">
                <h3>Macro Preview</h3>
                <div className={`validation-indicator ${isValid ? 'valid' : 'invalid'}`}>
                    {isValid ? '✓ Valid' : '⚠ Invalid'}
                </div>
            </div>

            <div className="preview-content">
                <pre className="code-preview">
                    <code
                        ref={codeRef}
                        className="language-cpp"
                    >
                        {macroPreview || `// Sample C++ code for testing syntax highlighting
#include <iostream>
#include <vector>
#include <string>

class MyClass {
private:
    std::vector<int> data;
    std::string name;
    
public:
    MyClass(const std::string& n) : name(n) {}
    
    void addValue(int value) {
        data.push_back(value);
    }
    
    void printData() const {
        std::cout << "Data for " << name << ": ";
        for (size_t i = 0; i < data.size(); ++i) {
            std::cout << data[i];
            if (i < data.size() - 1) {
                std::cout << ", ";
            }
        }
        std::cout << std::endl;
    }
};

int main() {
    MyClass obj("test");
    obj.addValue(42);
    obj.addValue(24);
    obj.printData();
    return 0;
}`}
                    </code>
                </pre>
            </div>
        </div>
    );
};
