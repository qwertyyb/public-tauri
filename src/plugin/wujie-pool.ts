/**
 * Wujie 子应用池 - LRU 缓存策略管理
 *
 * 核心功能：
 * 1. 限制最大 Wujie 子应用数量为 MAX_WUJIE_APPS
 * 2. 使用 LRU（最近最少使用）策略驱逐超限的子应用
 * 3. 支持保护特定插件不被驱逐（如内置插件）
 */

import { destroyApp } from 'wujie';
import { MAX_WUJIE_APPS, INNER_PLUGIN_NAMES } from './constants';
import logger from '@/utils/logger';

interface WujieAppEntry {
  name: string;
  lastAccess: number;
}

/**
 * Wujie 子应用池
 * 使用 Map 存储子应用注册顺序，使用数组记录访问顺序实现 LRU
 */
class WujieAppPool {
  /** 保护的应用名称集合（不会被 LRU 驱逐） */
  private protectedApps: Set<string> = new Set();

  /** 子应用注册记录（用于 LRU 驱逐） */
  private entries: WujieAppEntry[] = [];

  /** 已注册的子应用名称集合 */
  private registeredApps: Set<string> = new Set();

  /**
   * 注册一个新子应用
   * 如果超出最大数量，会自动驱逐最久未使用的非保护应用
   */
  set(name: string): void {
    // 已经在池中，更新访问时间
    if (this.registeredApps.has(name)) {
      this.touch(name);
      return;
    }

    // 检查是否是受保护的插件
    if (INNER_PLUGIN_NAMES.includes(name as any)) {
      this.protectedApps.add(name);
    }

    // 驱逐超限的非保护应用
    this.evictIfNeeded();

    // 注册新应用
    this.entries.push({
      name,
      lastAccess: Date.now(),
    });
    this.registeredApps.add(name);

    logger.info(`[WujiePool] Registered: ${name}, total: ${this.registeredApps.size}`);
  }

  /**
   * 标记指定应用为受保护（不会被 LRU 驱逐）
   */
  protect(name: string): void {
    this.protectedApps.add(name);
    logger.info(`[WujiePool] Protected: ${name}`);
  }

  /**
   * 取消保护
   */
  unprotect(name: string): void {
    this.protectedApps.delete(name);
  }

  /**
   * 更新应用的访问时间（标记为最近使用）
   */
  touch(name: string): void {
    const entry = this.entries.find(e => e.name === name);
    if (entry) {
      entry.lastAccess = Date.now();
    }
  }

  /**
   * 主动销毁并移除指定应用
   */
  destroy(name: string): void {
    if (!this.registeredApps.has(name)) {
      return;
    }

    try {
      destroyApp(name);
      logger.info(`[WujiePool] Destroyed: ${name}`);
    } catch (err) {
      logger.error(`[WujiePool] Failed to destroy ${name}:`, err);
    }

    this.entries = this.entries.filter(e => e.name !== name);
    this.registeredApps.delete(name);
    this.protectedApps.delete(name);
  }

  /**
   * 驱逐最久未使用的非保护应用（如果超出最大数量）
   */
  private evictIfNeeded(): void {
    while (this.entries.length >= MAX_WUJIE_APPS) {
      // 按最后访问时间升序排序（最旧的在前）
      const candidates = this.entries
        .filter(e => !this.protectedApps.has(e.name))
        .sort((a, b) => a.lastAccess - b.lastAccess);

      if (candidates.length === 0) {
        logger.warn('[WujiePool] All apps are protected, cannot evict');
        return;
      }

      const toEvict = candidates[0];
      this.destroy(toEvict.name);
    }
  }

  /**
   * 检查指定应用是否已注册
   */
  has(name: string): boolean {
    return this.registeredApps.has(name);
  }

  /**
   * 获取已注册的应用数量
   */
  get size(): number {
    return this.registeredApps.size;
  }

  /**
   * 获取所有已注册的应用名称
   */
  getAllNames(): string[] {
    return [...this.registeredApps];
  }

  /**
   * 清除所有非保护应用
   */
  clearNonProtected(): void {
    const nonProtected = this.entries.filter(e => !this.protectedApps.has(e.name));
    nonProtected.forEach(e => this.destroy(e.name));
  }

  /**
   * 重置池状态（清除所有记录）
   */
  reset(): void {
    this.entries = [];
    this.registeredApps.clear();
    // 保留保护列表，但清除注册记录
  }
}

// 导出单例
export const wujiePool = new WujieAppPool();
