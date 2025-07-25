/**
 * Heartbeat Animation Utility
 * 提供心跳闪烁动画效果的通用工具类
 */

import * as vscode from 'vscode';

export interface HeartbeatAnimationConfig {
  /** 动画间隔（毫秒），默认1000ms */
  interval?: number;
  /** 基础图标，默认 $(pulse) */
  baseIcon?: string;
  /** 动画图标序列，默认使用透明度变化 */
  animationIcons?: string[];
  /** 是否启用动画，默认true */
  enabled?: boolean;
}

/**
 * 心跳动画管理器
 * 为状态栏或其他UI元素提供心跳闪烁效果
 */
export class HeartbeatAnimation {
  private static readonly DEFAULT_CONFIG: Required<HeartbeatAnimationConfig> = {
    interval: 1000,
    baseIcon: '$(pulse)',
    animationIcons: ['$(pulse)', ''],
    enabled: true,
  };

  private config: Required<HeartbeatAnimationConfig>;
  private animationTimer: NodeJS.Timeout | undefined;
  private currentFrame = 0;
  private isRunning = false;

  constructor(config: HeartbeatAnimationConfig = {}) {
    this.config = { ...HeartbeatAnimation.DEFAULT_CONFIG, ...config };
  }

  /**
   * 开始心跳动画
   * @param callback 每帧回调，传入当前帧是否可见
   */
  start(callback: (isVisible: boolean) => void): void {
    if (this.isRunning || !this.config.enabled) {
      return;
    }

    this.isRunning = true;
    this.currentFrame = 0;

    // 动画序列现在是可见性状态
    const visibilityFrames = [true, false, true, false];

    const animate = () => {
      if (!this.isRunning) {return;}

      const isVisible = visibilityFrames[this.currentFrame];
      callback(isVisible);

      this.currentFrame = (this.currentFrame + 1) % visibilityFrames.length;
    };

    // 立即执行第一帧
    animate();

    // 启动定时器
    this.animationTimer = setInterval(animate, this.config.interval);
  }

  /**
   * 停止心跳动画
   * @param callback 可选的停止回调
   */
  stop(callback?: () => void): void {
    if (!this.isRunning) {return;}

    this.isRunning = false;

    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = undefined;
    }

    // 执行停止回调
    if (callback) {
      callback();
    }
  }

  /**
   * 更新动画配置
   */
  updateConfig(newConfig: Partial<HeartbeatAnimationConfig>): void {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      // 临时停止动画以更新配置
      this.stop();
    }

    this.config = { ...this.config, ...newConfig };

    // 注意：更新配置后需要重新调用start来应用新配置
    // 调用者需要自己重新启动动画
  }

  /**
   * 获取当前配置
   */
  getConfig(): Readonly<Required<HeartbeatAnimationConfig>> {
    return { ...this.config };
  }

  /**
   * 检查动画是否运行中
   */
  isAnimating(): boolean {
    return this.isRunning;
  }

  /**
   * 获取当前帧的可见性状态
   */
  getCurrentVisibility(): boolean {
    if (!this.isRunning) {
      return true; // 默认可见
    }
    const visibilityFrames = [true, false, true, false];
    return visibilityFrames[this.currentFrame];
  }

  /**
   * 销毁动画实例
   */
  dispose(): void {
    this.stop();
  }
}

/**
 * 创建专用于初始化状态的心跳动画
 * 500毫秒快速闪烁，基于可见性状态切换
 */
export function createInitializingHeartbeat(): HeartbeatAnimation {
  return new HeartbeatAnimation({
    interval: 500, // 500毫秒的快速闪烁
    baseIcon: '$(pulse)',
    animationIcons: [], // 不再使用，保留兼容性
    enabled: true,
  });
}

/**
 * 创建专用于活跃状态的静态显示
 * 显示静态的$(pulse)图标，不进行动画
 */
export function createActiveDisplay(): HeartbeatAnimation {
  return new HeartbeatAnimation({
    interval: 1000,
    baseIcon: '$(pulse)',
    animationIcons: [], // 不再使用
    enabled: false, // 禁用动画，只显示静态图标
  });
}

/**
 * 创建标准心跳动画
 * 1秒间隔的缓慢闪烁
 */
export function createStandardHeartbeat(): HeartbeatAnimation {
  return new HeartbeatAnimation({
    interval: 1000,
    baseIcon: '$(pulse)',
    animationIcons: ['$(pulse)', ''],
    enabled: true,
  });
}

/**
 * 动画预设配置
 */
export const HEARTBEAT_PRESETS = {
  /** 初始化状态：500ms快速闪烁 */
  INITIALIZING: {
    interval: 500,
    baseIcon: '$(pulse)',
    animationIcons: [], // 基于可见性状态，不再使用图标数组
    enabled: true,
  },
  /** 活跃状态：静态显示 */
  ACTIVE: {
    interval: 1000,
    baseIcon: '$(pulse)',
    animationIcons: [], // 不再使用
    enabled: false,
  },
  /** 标准心跳：1秒闪烁 */
  STANDARD: {
    interval: 1000,
    baseIcon: '$(pulse)',
    animationIcons: [], // 不再使用
    enabled: true,
  },
} as const;
