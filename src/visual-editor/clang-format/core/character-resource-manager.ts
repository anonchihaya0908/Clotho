/**
 * 角色资源管理器
 * 管理动漫角色图片的加载、缓存和随机选择
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ErrorHandler } from '../../../common/error-handler';

/**
 * 角色信息接口
 */
export interface CharacterInfo {
    id: string;
    name: string;
    description: string;
    imagePath: string;
    imageUri: vscode.Uri;
    tags: string[];
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    series?: string;
}

/**
 * 角色数据库接口
 */
export interface CharacterDatabase {
    characters: CharacterInfo[];
    lastUsed: string[];
    favorites: string[];
    totalCount: number;
    lastUpdated: Date;
}

/**
 * 资源扫描选项
 */
export interface ScanOptions {
    extensions: string[];
    maxDepth: number;
    excludePatterns: string[];
    includeSubdirs: boolean;
}

/**
 * 角色资源管理器
 */
export class CharacterResourceManager {
    private characters: Map<string, CharacterInfo> = new Map();
    private imageCache: Map<string, string> = new Map();
    private lastUsedQueue: string[] = [];
    private favorites: Set<string> = new Set();
    private readonly maxCacheSize = 50;
    private readonly maxLastUsed = 20;

    constructor(
        private extensionUri: vscode.Uri,
        private imageFolderPath: string = 'src/assets/images'
    ) { }

    /**
     * 扫描角色图片文件
     */
    async scanCharacterImages(options: Partial<ScanOptions> = {}): Promise<CharacterInfo[]> {
        const defaultOptions: ScanOptions = {
            extensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
            maxDepth: 3,
            excludePatterns: ['node_modules', '.git', 'dist', 'out'],
            includeSubdirs: true
        };

        const scanOptions = { ...defaultOptions, ...options };

        try {
            console.log('🔍 CharacterResourceManager: Starting image scan...');

            const imageFiles = await this.findImageFiles(scanOptions);
            const characters: CharacterInfo[] = [];

            for (const filePath of imageFiles) {
                try {
                    const character = await this.createCharacterFromFile(filePath);
                    if (character) {
                        characters.push(character);
                        this.characters.set(character.id, character);
                    }
                } catch (error) {
                    console.warn(`Failed to process image file: ${filePath}`, error);
                }
            }

            console.log(`✅ CharacterResourceManager: Scanned ${characters.length} characters`);
            return characters;

        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'scanCharacterImages',
                module: 'CharacterResourceManager',
                showToUser: false,
                logLevel: 'error'
            });
            return [];
        }
    }

    /**
     * 获取随机角色
     */
    async getRandomCharacter(excludeRecent: boolean = true): Promise<CharacterInfo | null> {
        try {
            const availableCharacters = Array.from(this.characters.values());

            if (availableCharacters.length === 0) {
                console.log('📷 CharacterResourceManager: No characters available, scanning...');
                await this.scanCharacterImages();
                return this.getRandomCharacter(false); // 递归调用，但不排除最近使用的
            }

            let candidates = availableCharacters;

            // 排除最近使用的角色（如果有足够的选择）
            if (excludeRecent && this.lastUsedQueue.length > 0 && availableCharacters.length > 5) {
                candidates = availableCharacters.filter(char =>
                    !this.lastUsedQueue.includes(char.id)
                );
            }

            // 如果没有候选者，使用所有角色
            if (candidates.length === 0) {
                candidates = availableCharacters;
            }

            // 随机选择
            const randomIndex = Math.floor(Math.random() * candidates.length);
            const selectedCharacter = candidates[randomIndex];

            // 更新最近使用队列
            this.updateLastUsedQueue(selectedCharacter.id);

            console.log(`🎭 CharacterResourceManager: Selected character ${selectedCharacter.name}`);
            return selectedCharacter;

        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'getRandomCharacter',
                module: 'CharacterResourceManager',
                showToUser: false,
                logLevel: 'error'
            });
            return null;
        }
    }

    /**
     * 根据ID获取角色
     */
    getCharacterById(id: string): CharacterInfo | null {
        return this.characters.get(id) || null;
    }

    /**
     * 获取所有角色
     */
    getAllCharacters(): CharacterInfo[] {
        return Array.from(this.characters.values());
    }

    /**
     * 添加到收藏
     */
    addToFavorites(characterId: string): void {
        this.favorites.add(characterId);
        console.log(`⭐ CharacterResourceManager: Added ${characterId} to favorites`);
    }

    /**
     * 从收藏中移除
     */
    removeFromFavorites(characterId: string): void {
        this.favorites.delete(characterId);
        console.log(`💔 CharacterResourceManager: Removed ${characterId} from favorites`);
    }

    /**
     * 获取收藏的角色
     */
    getFavoriteCharacters(): CharacterInfo[] {
        return Array.from(this.favorites)
            .map(id => this.characters.get(id))
            .filter(char => char !== undefined) as CharacterInfo[];
    }

    /**
     * 生成webview可用的图片URI
     */
    generateWebviewUri(imagePath: string): vscode.Uri {
        try {
            const fullPath = path.resolve(imagePath);
            const fileUri = vscode.Uri.file(fullPath);

            // 这里需要webview panel来转换URI，暂时返回文件URI
            return fileUri;
        } catch (error) {
            console.error('Failed to generate webview URI:', error);
            return vscode.Uri.file(imagePath);
        }
    }

    /**
     * 预加载角色图片
     */
    async preloadCharacters(count: number = 5): Promise<void> {
        try {
            const characters = Array.from(this.characters.values()).slice(0, count);

            for (const character of characters) {
                if (!this.imageCache.has(character.id)) {
                    // 这里可以实现图片预加载逻辑
                    // 由于webview的限制，我们主要是确保文件存在
                    if (await this.fileExists(character.imagePath)) {
                        this.imageCache.set(character.id, character.imagePath);
                    }
                }
            }

            console.log(`🚀 CharacterResourceManager: Preloaded ${characters.length} characters`);
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'preloadCharacters',
                module: 'CharacterResourceManager',
                showToUser: false,
                logLevel: 'error'
            });
        }
    }

    /**
     * 清理缓存
     */
    clearCache(): void {
        this.imageCache.clear();
        console.log('🧹 CharacterResourceManager: Cache cleared');
    }

    /**
     * 获取统计信息
     */
    getStatistics(): {
        totalCharacters: number;
        cachedImages: number;
        favorites: number;
        recentlyUsed: number;
    } {
        return {
            totalCharacters: this.characters.size,
            cachedImages: this.imageCache.size,
            favorites: this.favorites.size,
            recentlyUsed: this.lastUsedQueue.length
        };
    }

    /**
     * 查找图片文件
     */
    private async findImageFiles(options: ScanOptions): Promise<string[]> {
        const imageFiles: string[] = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders || workspaceFolders.length === 0) {
            console.warn('No workspace folders found');
            return imageFiles;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const searchPath = path.join(rootPath, this.imageFolderPath);

        if (await this.fileExists(searchPath)) {
            await this.scanDirectory(searchPath, options, imageFiles, 0);
        } else {
            console.warn(`Image folder not found: ${searchPath}`);
        }

        return imageFiles;
    }

    /**
     * 递归扫描目录
     */
    private async scanDirectory(
        dirPath: string,
        options: ScanOptions,
        results: string[],
        depth: number
    ): Promise<void> {
        if (depth > options.maxDepth) {
            return;
        }

        try {
            const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                // 检查排除模式
                if (options.excludePatterns.some(pattern => entry.name.includes(pattern))) {
                    continue;
                }

                if (entry.isDirectory() && options.includeSubdirs) {
                    await this.scanDirectory(fullPath, options, results, depth + 1);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (options.extensions.includes(ext)) {
                        results.push(fullPath);
                    }
                }
            }
        } catch (error) {
            console.warn(`Failed to scan directory: ${dirPath}`, error);
        }
    }

    /**
     * 从文件创建角色信息
     */
    private async createCharacterFromFile(filePath: string): Promise<CharacterInfo | null> {
        try {
            const fileName = path.basename(filePath, path.extname(filePath));
            const dirName = path.basename(path.dirname(filePath));

            // 生成角色ID
            const id = this.generateCharacterId(filePath);

            // 解析角色信息
            const character: CharacterInfo = {
                id,
                name: this.parseCharacterName(fileName),
                description: this.generateDescription(fileName, dirName),
                imagePath: filePath,
                imageUri: this.generateWebviewUri(filePath),
                tags: this.extractTags(fileName, dirName),
                rarity: this.determineRarity(fileName),
                series: dirName !== 'images' ? dirName : undefined
            };

            return character;
        } catch (error) {
            console.error(`Failed to create character from file: ${filePath}`, error);
            return null;
        }
    }

    /**
     * 生成角色ID
     */
    private generateCharacterId(filePath: string): string {
        const relativePath = path.relative(process.cwd(), filePath);
        return Buffer.from(relativePath).toString('base64').substring(0, 16);
    }

    /**
     * 解析角色名称
     */
    private parseCharacterName(fileName: string): string {
        // 移除常见的文件名模式
        let name = fileName
            .replace(/[-_]/g, ' ')
            .replace(/\d+/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        // 首字母大写
        name = name.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

        return name || 'Unknown Character';
    }

    /**
     * 生成描述
     */
    private generateDescription(fileName: string, dirName: string): string {
        const series = dirName !== 'images' ? ` from ${dirName}` : '';
        return `A character${series}. Image: ${fileName}`;
    }

    /**
     * 提取标签
     */
    private extractTags(fileName: string, dirName: string): string[] {
        const tags: string[] = [];

        if (dirName !== 'images') {
            tags.push(dirName);
        }

        // 从文件名提取标签
        const lowerFileName = fileName.toLowerCase();
        if (lowerFileName.includes('cute')) tags.push('cute');
        if (lowerFileName.includes('cool')) tags.push('cool');
        if (lowerFileName.includes('happy')) tags.push('happy');
        if (lowerFileName.includes('sad')) tags.push('sad');

        return tags;
    }

    /**
     * 确定稀有度
     */
    private determineRarity(fileName: string): 'common' | 'rare' | 'epic' | 'legendary' {
        const lowerFileName = fileName.toLowerCase();

        if (lowerFileName.includes('legendary') || lowerFileName.includes('special')) {
            return 'legendary';
        } else if (lowerFileName.includes('epic') || lowerFileName.includes('rare')) {
            return 'epic';
        } else if (lowerFileName.includes('uncommon')) {
            return 'rare';
        }

        return 'common';
    }

    /**
     * 更新最近使用队列
     */
    private updateLastUsedQueue(characterId: string): void {
        // 移除已存在的ID
        const index = this.lastUsedQueue.indexOf(characterId);
        if (index > -1) {
            this.lastUsedQueue.splice(index, 1);
        }

        // 添加到队列开头
        this.lastUsedQueue.unshift(characterId);

        // 限制队列长度
        if (this.lastUsedQueue.length > this.maxLastUsed) {
            this.lastUsedQueue = this.lastUsedQueue.slice(0, this.maxLastUsed);
        }
    }

    /**
     * 检查文件是否存在
     */
    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.characters.clear();
        this.imageCache.clear();
        this.lastUsedQueue = [];
        this.favorites.clear();
        console.log('CharacterResourceManager: Disposed');
    
    }
}