/**
 * File Type Detection Utilities
 * Functions for detecting C/C++ file types and extensions
 */

import * as path from 'path';
import { FileType } from '../types';
import { HEADER_EXTENSIONS, SOURCE_EXTENSIONS } from '../constants';

/**
 * Checks if a file is a header file based on its extension
 */
export function isHeaderFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return HEADER_EXTENSIONS.includes(ext as any);
}

/**
 * Checks if a file is a source file based on its extension
 */
export function isSourceFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return SOURCE_EXTENSIONS.includes(ext as any);
}

/**
 * Checks if a file is a valid C/C++ file
 */
export function isValidCppFile(filePath: string): boolean {
    return isHeaderFile(filePath) || isSourceFile(filePath);
}

/**
 * Gets the file type (header or source) from a file path
 */
export function getFileType(filePath: string): FileType | null {
    if (isHeaderFile(filePath)) {
        return 'header';
    } else if (isSourceFile(filePath)) {
        return 'source';
    }
    return null;
}

/**
 * Gets the appropriate file extension for the given file type and language
 */
export function getFileExtension(fileType: FileType, language: string): string {
    if (fileType === 'header') {
        return language === 'cpp' ? '.hpp' : '.h';
    } else if (fileType === 'source') {
        return language === 'cpp' ? '.cpp' : '.c';
    }
    return '';
}
