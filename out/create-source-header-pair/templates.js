"use strict";
//
// TEMPLATES AND CONSTANTS
// =======================
//
// This module contains all the hardcoded data for file pair creation:
// - Template rules for different file types
// - File content templates with placeholders
// - Default placeholder names
// - Validation patterns
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILE_TEMPLATES = exports.TEMPLATE_RULES = exports.DEFAULT_PLACEHOLDERS = exports.VALIDATION_PATTERNS = void 0;
// Regular expression patterns to validate C/C++ identifiers
exports.VALIDATION_PATTERNS = {
    IDENTIFIER: /^[a-zA-Z_][a-zA-Z0-9_]*$/
};
// Default placeholder names for different file types
exports.DEFAULT_PLACEHOLDERS = {
    C_EMPTY: 'my_c_functions',
    C_STRUCT: 'MyStruct',
    CPP_EMPTY: 'utils',
    CPP_CLASS: 'MyClass',
    CPP_STRUCT: 'MyStruct'
};
// Template rules for available file pair types
exports.TEMPLATE_RULES = [
    {
        key: 'cpp_empty',
        label: '$(new-file) C++ Pair',
        description: 'Creates a basic Header/Source file pair with header guards.',
        language: 'cpp',
        headerExt: '.h',
        sourceExt: '.cpp'
    },
    {
        key: 'cpp_class',
        label: '$(symbol-class) C++ Class',
        description: 'Creates a Header/Source file pair with a boilerplate class definition.',
        language: 'cpp',
        headerExt: '.h',
        sourceExt: '.cpp',
        isClass: true
    },
    {
        key: 'cpp_struct',
        label: '$(symbol-struct) C++ Struct',
        description: 'Creates a Header/Source file pair with a boilerplate struct definition.',
        language: 'cpp',
        headerExt: '.h',
        sourceExt: '.cpp',
        isStruct: true
    },
    {
        key: 'c_empty',
        label: '$(file-code) C Pair',
        description: 'Creates a basic .h/.c file pair for function declarations.',
        language: 'c',
        headerExt: '.h',
        sourceExt: '.c'
    },
    {
        key: 'c_struct',
        label: '$(symbol-struct) C Struct',
        description: 'Creates a .h/.c file pair with a boilerplate typedef struct.',
        language: 'c',
        headerExt: '.h',
        sourceExt: '.c',
        isStruct: true
    }
];
// File templates with immutable structure
exports.FILE_TEMPLATES = {
    CPP_CLASS: {
        header: `#ifndef {{headerGuard}}
#define {{headerGuard}}

class {{fileName}} {
public:
  {{fileName}}();
  ~{{fileName}}();

private:
  // Add private members here
};

#endif  // {{headerGuard}}
`,
        source: `{{includeLine}}

{{fileName}}::{{fileName}}() {
  // Constructor implementation
}

{{fileName}}::~{{fileName}}() {
  // Destructor implementation
}
`
    },
    CPP_STRUCT: {
        header: `#ifndef {{headerGuard}}
#define {{headerGuard}}

struct {{fileName}} {
  // Struct members
};

#endif  // {{headerGuard}}
`,
        source: '{{includeLine}}'
    },
    C_STRUCT: {
        header: `#ifndef {{headerGuard}}
#define {{headerGuard}}

typedef struct {
  // Struct members
} {{fileName}};

#endif  // {{headerGuard}}
`,
        source: '{{includeLine}}'
    },
    C_EMPTY: {
        header: `#ifndef {{headerGuard}}
#define {{headerGuard}}

// Declarations for {{fileName}}.c

#endif  // {{headerGuard}}
`,
        source: `{{includeLine}}

// Implementations for {{fileName}}.c
`
    },
    CPP_EMPTY: {
        header: `#ifndef {{headerGuard}}
#define {{headerGuard}}

// Declarations for {{fileName}}.cpp

#endif  // {{headerGuard}}
`,
        source: '{{includeLine}}'
    }
};
//# sourceMappingURL=templates.js.map