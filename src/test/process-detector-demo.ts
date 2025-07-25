/**
 * ProcessDetector & ProcessRunner 重构演示
 * 展示重构后的功能和改进
 */

import { ProcessDetector } from '../common/process-detector';
import { ProcessRunner } from '../common/process-runner';

/**
 * ProcessDetector & ProcessRunner 的重构后功能演示
 */
export class ProcessManagementDemo {

    /**
     * 演示基础进程检测功能
     */
    public static async demonstrateBasicDetection(): Promise<void> {
        console.log('=== ProcessDetector 基础检测演示 ===');

        // 1. 查找主进程（使用新的分级日志）
        const mainProcess = await ProcessDetector.findMainProcessByName('clangd');

        if (mainProcess) {
            console.log('✅ 找到主进程:', {
                pid: mainProcess.pid,
                memory: `${Math.round(mainProcess.memory / 1024)}MB`,
                relationship: mainProcess.relationship,
            });
        } else {
            console.log('❌ 未找到主进程');
        }
    }

    /**
     * 演示高级策略检测
     */
    public static async demonstrateStrategyDetection(): Promise<void> {
        console.log('\n=== ProcessDetector 策略检测演示 ===');

        // 模拟 API 检测器
        const mockApiDetector = async (): Promise<number | undefined> => {
            // 模拟 API 检测失败
            return undefined;
        };

        const result = await ProcessDetector.detectProcessWithStrategy('clangd', mockApiDetector);

        console.log('🔍 检测结果:', {
            success: result.success,
            method: result.method,
            candidateCount: result.candidateCount,
            debugInfo: result.debugInfo,
        });

        if (result.processInfo) {
            console.log('📊 进程信息:', {
                pid: result.processInfo.pid,
                relationship: result.processInfo.relationship,
                memory: `${Math.round(result.processInfo.memory / 1024)}MB`,
            });
        }
    }

    /**
     * 演示详细诊断功能
     */
    public static async demonstrateDiagnostics(): Promise<void> {
        console.log('\n=== ProcessDetector 诊断功能演示 ===');

        const diagnostics = await ProcessDetector.getDiagnosticInfo('clangd');

        console.log('🔍 诊断结果:', {
            timestamp: new Date(diagnostics.timestamp).toLocaleTimeString(),
            ourPid: diagnostics.ourPid,
            processCount: diagnostics.processCount,
            detectionTime: `${diagnostics.performanceMetrics.detectionTimeMs}ms`,
            totalMemory: `${Math.round(diagnostics.performanceMetrics.memoryUsageKB / 1024)}MB`,
        });

        console.log('\n📋 进程分类:');
        console.log(`  直接子进程: ${diagnostics.classification.directChildren.length}`);
        console.log(`  间接子进程: ${diagnostics.classification.grandchildren.length}`);
        console.log(`  孤立进程: ${diagnostics.classification.orphans.length}`);

        console.log('\n💡 智能推荐:');
        diagnostics.recommendations.forEach(rec => {
            console.log(`  ${rec}`);
        });

        // 显示详细进程信息（仅在调试模式）
        if (process.env.CLOTHO_DEBUG === 'true') {
            console.log('\n🔬 详细进程列表:');
            diagnostics.classification.directChildren.forEach(p => {
                console.log(`  ✅ PID ${p.pid}: ${Math.round(p.memory / 1024)}MB (${p.relationship})`);
            });

            if (diagnostics.classification.orphans.length > 0) {
                console.log('\n⚠️ 孤立进程:');
                diagnostics.classification.orphans.forEach(p => {
                    console.log(`  ❓ PID ${p.pid}: ${Math.round(p.memory / 1024)}MB (${p.relationship})`);
                });
            }
        }
    }

    /**
     * 演示 ProcessRunner 的 TypeScript 最佳实践改进
     */
    public static async demonstrateProcessRunner(): Promise<void> {
        console.log('\n=== ProcessRunner TypeScript 最佳实践演示 ===');

        console.log('🔧 ProcessRunner 重构亮点:');
        console.log('  ✅ 静态导入替代动态 require');
        console.log('  ✅ 明确类型定义替代 any 类型');
        console.log('  ✅ 核心方法提取，消除代码重复');
        console.log('  ✅ 统一日志记录方式');

        try {
            // 演示基础命令执行
            console.log('\n📝 测试基础命令执行:');
            const simpleResult = await ProcessRunner.runCommand('echo "Hello ProcessRunner"');
            console.log('✅ 基础命令结果:', simpleResult.trim());

            // 演示详细命令执行
            console.log('\n📊 测试详细命令执行:');
            const detailedResult = await ProcessRunner.runCommandWithDetails('echo "Detailed Result"');
            console.log('✅ 详细结果:', {
                stdout: detailedResult.stdout.trim(),
                stderr: detailedResult.stderr,
                exitCode: detailedResult.exitCode,
            });

            // 演示命令存在性检查
            console.log('\n🔍 测试命令存在性检查:');
            const cmdExists = await ProcessRunner.commandExists('echo');
            console.log('✅ echo 命令存在:', cmdExists);

            // 演示错误处理
            console.log('\n❌ 测试错误处理:');
            try {
                await ProcessRunner.runCommand('invalid-command-that-does-not-exist');
            } catch (error) {
                console.log('✅ 错误被正确处理:', error instanceof Error ? error.message.substring(0, 50) + '...' : 'Unknown error');
            }

        } catch (error) {
            console.log('❌ ProcessRunner 演示中发生错误:', error);
        }
    }

    /**
     * 演示日志分级功能
     */
    public static async demonstrateLogging(): Promise<void> {
        console.log('\n=== ProcessDetector 日志分级演示 ===');

        console.log('🔧 当前调试模式:', process.env.CLOTHO_DEBUG === 'true' ? '开启' : '关闭');
        console.log('💡 设置 CLOTHO_DEBUG=true 可查看详细调试日志');

        // 演示不同环境下的日志行为
        const originalDebug = process.env.CLOTHO_DEBUG;

        console.log('\n📝 生产环境模式 (CLOTHO_DEBUG=false):');
        process.env.CLOTHO_DEBUG = 'false';
        await ProcessDetector.findMainProcessByName('notepad'); // 不会有详细日志

        console.log('\n📝 调试环境模式 (CLOTHO_DEBUG=true):');
        process.env.CLOTHO_DEBUG = 'true';
        await ProcessDetector.findMainProcessByName('notepad'); // 会有详细日志

        // 恢复原始设置
        process.env.CLOTHO_DEBUG = originalDebug;
    }

    /**
     * 演示错误处理改进
     */
    public static async demonstrateErrorHandling(): Promise<void> {
        console.log('\n=== ProcessDetector 错误处理演示 ===');

        try {
            // 测试错误处理 - 使用无效的进程名
            const result = await ProcessDetector.findMainProcessByName('');
            console.log('✅ 错误被优雅处理，返回结果:', result);

            // 测试诊断的错误处理
            const diagnostics = await ProcessDetector.getDiagnosticInfo('invalid-process-name');
            console.log('✅ 诊断错误被优雅处理');
            console.log('📊 错误状态诊断:', {
                processCount: diagnostics.processCount,
                recommendations: diagnostics.recommendations[0],
            });

        } catch (error) {
            // 这应该不会执行，因为错误都被装饰器处理了
            console.log('❌ 未期望的错误:', error);
        }
    }

    /**
     * 性能基准测试
     */
    public static async performanceBenchmark(): Promise<void> {
        console.log('\n=== ProcessDetector 性能基准测试 ===');

        const iterations = 5;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            const diagnostics = await ProcessDetector.getDiagnosticInfo('clangd');
            const end = Date.now();

            times.push(end - start);
            console.log(`第 ${i + 1} 次测试: ${end - start}ms`);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        console.log('📊 性能统计:');
        console.log(`  平均时间: ${avgTime.toFixed(2)}ms`);
        console.log(`  最快时间: ${minTime}ms`);
        console.log(`  最慢时间: ${maxTime}ms`);
    }

    /**
     * 运行所有演示
     */
    public static async runAllDemos(): Promise<void> {
        console.log('🚀 ProcessDetector & ProcessRunner 重构功能完整演示');
        console.log('==========================================');

        try {
            await this.demonstrateBasicDetection();
            await this.demonstrateStrategyDetection();
            await this.demonstrateDiagnostics();
            await this.demonstrateProcessRunner();
            await this.demonstrateLogging();
            await this.demonstrateErrorHandling();
            await this.performanceBenchmark();

            console.log('\n✅ 所有演示完成！');
            console.log('💡 重构后的进程管理系统具有以下优势：');
            console.log('   - 🧹 生产环境无调试日志污染');
            console.log('   - 🛡️ 统一的错误处理机制');
            console.log('   - 🔄 消除代码重复，提高可维护性');
            console.log('   - 📊 增强的诊断和监控能力');
            console.log('   - 💡 智能推荐系统');
            console.log('   - ⚡ 性能监控和基准测试');
            console.log('   - 🎯 TypeScript 最佳实践');
            console.log('   - 🔧 企业级架构设计');

        } catch (error) {
            console.error('❌ 演示过程中发生错误:', error);
        }
    }
}

// 如果直接运行此文件，执行演示
if (require.main === module) {
    ProcessManagementDemo.runAllDemos().catch(console.error);
}
