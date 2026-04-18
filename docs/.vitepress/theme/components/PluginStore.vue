<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { STORE_INDEX_URL } from '../constants';

interface PluginCommand {
  name: string;
  title?: string;
  subtitle?: string;
  mode?: string;
  description?: string;
}

interface Manifest {
  name?: string;
  title?: string;
  subtitle?: string;
  icon?: string;
  main?: string;
  commands?: PluginCommand[];
}

interface StorePlugin {
  name: string;
  icon: string;
  version: string;
  author: string;
  manifest: Manifest;
}

const loading = ref(true);
const error = ref<string | null>(null);
const plugins = ref<StorePlugin[]>([]);
const updateTime = ref<number | null>(null);

async function loadStore() {
  loading.value = true;
  error.value = null;
  try {
    const r = await fetch(STORE_INDEX_URL);
    if (!r.ok) {
      throw new Error(`HTTP ${r.status}`);
    }
    const json = (await r.json()) as { updateTime?: number; plugins?: StorePlugin[] };
    plugins.value = Array.isArray(json.plugins) ? json.plugins : [];
    updateTime.value = typeof json.updateTime === 'number' ? json.updateTime : null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    plugins.value = [];
  } finally {
    loading.value = false;
  }
}

const pluginQuery = ref<string | null>(null);

function readPluginQuery() {
  const raw = new URLSearchParams(window.location.search).get('plugin');
  pluginQuery.value = raw && raw.length > 0 ? raw : null;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && pluginQuery.value) {
    e.preventDefault();
    void clearSelection();
  }
}

onMounted(() => {
  loadStore();
  readPluginQuery();
  window.addEventListener('popstate', readPluginQuery);
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('popstate', readPluginQuery);
  window.removeEventListener('keydown', onKeydown);
  document.body.style.removeProperty('overflow');
});

const selectedName = computed(() => pluginQuery.value);

const selectedPlugin = computed(() => {
  const q = selectedName.value;
  if (!q) return null;
  return plugins.value.find((p) => p.name === q) ?? null;
});

watch(selectedPlugin, (p) => {
  document.body.style.overflow = p ? 'hidden' : '';
});

const searchQuery = ref('');

const filteredPlugins = computed(() => {
  const raw = searchQuery.value.trim().toLowerCase();
  if (!raw) return plugins.value;
  const tokens = raw.split(/\s+/).filter(Boolean);
  return plugins.value.filter((p) => {
    const hay = [
      p.name,
      p.manifest?.title ?? '',
      p.manifest?.subtitle ?? '',
      p.author,
      p.version,
    ]
      .join(' ')
      .toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
});

const selectedCommands = computed((): PluginCommand[] => {
  const cmds = selectedPlugin.value?.manifest?.commands;
  if (!Array.isArray(cmds) || !cmds.length) return [];
  return cmds.filter((c): c is PluginCommand => c != null && typeof c === 'object' && typeof c.name === 'string');
});

/** 使用 History API 更新 ?plugin=，避免 vitepress router.go 触发整页滚动到顶部 */
function setPluginInUrl(name: string | null) {
  const path = window.location.pathname;
  const search = name ? `?plugin=${encodeURIComponent(name)}` : '';
  const next = `${path}${search}${window.location.hash}`;
  window.history.pushState(window.history.state, '', next);
  readPluginQuery();
}

function selectPlugin(name: string) {
  setPluginInUrl(name);
}

function clearSelection() {
  setPluginInUrl(null);
}
</script>

<template>
  <div class="plugin-store">
    <header class="plugin-store__header">
      <h1 class="plugin-store__h1">插件商店</h1>
      <p v-if="updateTime" class="plugin-store__meta" :title="new Date(updateTime).toISOString()">
        索引更新于 {{ new Date(updateTime).toLocaleString('zh-CN') }}
      </p>
    </header>

    <div v-if="!loading && !error && plugins.length" class="plugin-store__toolbar">
      <div class="plugin-store__search-wrap">
        <label class="plugin-store__search-label" for="plugin-store-search">搜索</label>
        <input
          id="plugin-store-search"
          v-model="searchQuery"
          type="search"
          class="plugin-store__search"
          placeholder="按名称、副标题、作者或版本筛选…"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
      <p v-if="filteredPlugins.length" class="plugin-store__count">
        共 {{ filteredPlugins.length }} 个插件
      </p>
    </div>

    <div v-if="loading" class="plugin-store__state">正在加载插件列表…</div>
    <div v-else-if="error" class="plugin-store__state plugin-store__state--error">
      加载失败：{{ error }}
      <button type="button" class="plugin-store__retry" @click="loadStore">重试</button>
    </div>
    <template v-else>
      <p v-if="plugins.length && !filteredPlugins.length" class="plugin-store__state plugin-store__state--empty">
        没有与当前搜索条件匹配的插件。
      </p>

      <ul v-else-if="filteredPlugins.length" class="plugin-store__grid" role="list">
        <li v-for="p in filteredPlugins" :key="p.name" class="plugin-store__cell">
          <article class="plugin-store__card">
            <div class="plugin-store__tile">
              <div class="plugin-store__tile-icon-slot" aria-hidden="true">
                <img
                  v-if="p.icon"
                  class="plugin-store__tile-icon"
                  :src="p.icon"
                  alt=""
                  width="48"
                  height="48"
                  loading="lazy"
                  decoding="async"
                />
                <div v-else class="plugin-store__tile-icon plugin-store__tile-icon--placeholder" />
              </div>
              <h3 class="plugin-store__tile-title">{{ p.manifest.title ?? p.name }}</h3>
              <p class="plugin-store__tile-sub">{{ p.manifest.subtitle ?? p.version }}</p>
            </div>
            <div class="plugin-store__card-actions">
              <button
                type="button"
                class="plugin-store__detail"
                :aria-label="`查看插件详情：${p.manifest.title ?? p.name}`"
                @click="selectPlugin(p.name)"
              >
                查看详情
              </button>
              <button
                type="button"
                class="plugin-store__install plugin-store__install--row"
                disabled
                title="将在客户端版本中支持"
              >
                一键安装（即将推出）
              </button>
            </div>
          </article>
        </li>
      </ul>

      <p v-else class="plugin-store__state">暂无插件数据。</p>
    </template>

    <Teleport to="body">
      <Transition name="plugin-store-dlg">
        <div
          v-if="selectedPlugin"
          class="plugin-store__backdrop"
          role="presentation"
          @click.self="clearSelection"
        >
          <div
            class="plugin-store__modal"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="'plugin-store-dialog-title'"
            @click.stop
          >
            <button
              type="button"
              class="plugin-store__modal-close"
              aria-label="关闭"
              @click="clearSelection"
            >
              ×
            </button>
            <div class="plugin-store__modal-head">
              <img
                v-if="selectedPlugin.icon"
                class="plugin-store__modal-icon"
                :src="selectedPlugin.icon"
                alt=""
                width="72"
                height="72"
              />
              <div>
                <h2 id="plugin-store-dialog-title" class="plugin-store__modal-title">
                  {{ selectedPlugin.manifest.title ?? selectedPlugin.name }}
                </h2>
                <p class="plugin-store__modal-sub">{{ selectedPlugin.manifest.subtitle ?? '' }}</p>
              </div>
            </div>
            <dl class="plugin-store__dl">
              <dt>包名</dt>
              <dd><code>{{ selectedPlugin.name }}</code></dd>
              <dt>版本</dt>
              <dd>{{ selectedPlugin.version }}</dd>
              <dt v-if="selectedPlugin.author">作者</dt>
              <dd v-if="selectedPlugin.author">{{ selectedPlugin.author }}</dd>
            </dl>

            <section v-if="selectedCommands.length" class="plugin-store__commands">
              <h3 class="plugin-store__commands-h">命令</h3>
              <ul class="plugin-store__cmd-list" role="list">
                <li v-for="(cmd, idx) in selectedCommands" :key="`${cmd.name}-${idx}`" class="plugin-store__cmd-item">
                  <div class="plugin-store__cmd-head">
                    <span class="plugin-store__cmd-title">{{ cmd.title ?? cmd.name }}</span>
                    <code v-if="cmd.mode" class="plugin-store__cmd-mode">{{ cmd.mode }}</code>
                  </div>
                  <code class="plugin-store__cmd-name">{{ cmd.name }}</code>
                  <p v-if="cmd.subtitle" class="plugin-store__cmd-sub">{{ cmd.subtitle }}</p>
                  <p v-if="cmd.description" class="plugin-store__cmd-desc">{{ cmd.description }}</p>
                </li>
              </ul>
            </section>

            <button type="button" class="plugin-store__install" disabled title="将在客户端版本中支持">
              一键安装（即将推出）
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.plugin-store {
  width: 100%;
  margin: 0 auto;
  padding: 0 0 2rem;
}

.plugin-store__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem 1.25rem;
  margin: 0 0 1rem;
}

.plugin-store__h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
  border: none;
}

.plugin-store__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
  margin-bottom: 1.25rem;
}

.plugin-store__search-wrap {
  flex: 1 1 18rem;
  min-width: 0;
  margin-bottom: 0;
}

.plugin-store__search-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--vp-c-text-3);
  margin-bottom: 0.35rem;
}

.plugin-store__search {
  box-sizing: border-box;
  width: 100%;
  max-width: none;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.plugin-store__search::placeholder {
  color: var(--vp-c-text-3);
}

.plugin-store__search:focus {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 55%, var(--vp-c-divider));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--vp-c-brand-1) 22%, transparent);
}

.plugin-store__state {
  padding: 1.5rem;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  text-align: center;
}

.plugin-store__state--error {
  color: var(--vp-c-danger-1);
}

.plugin-store__state--empty {
  text-align: left;
}

.plugin-store__retry {
  margin-left: 0.75rem;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
  cursor: pointer;
  font-size: 0.875rem;
}

.plugin-store__meta {
  margin: 0;
  padding: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}

.plugin-store__count {
  flex: 0 0 auto;
  margin: 0;
  padding: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}

@media (max-width: 520px) {
  .plugin-store__meta {
    white-space: normal;
  }

  .plugin-store__count {
    flex: 1 1 100%;
  }
}

/* 覆盖 VitePress .vp-doc ul / .vp-doc li + li，避免插件网格错位 */
.plugin-store ul.plugin-store__grid {
  padding-left: 0;
  margin-top: 0;
  margin-bottom: 0;
}

.plugin-store__grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  /* 固定行高，保证同一行与跨行卡片外框高度一致 */
  grid-auto-rows: 220px;
  gap: 0.875rem;
  align-items: stretch;
}

.plugin-store .plugin-store__grid > li + li {
  margin-top: 0;
}

.plugin-store__cell {
  display: flex;
  min-height: 0;
  min-width: 0;
  height: 100%;
}

.plugin-store__card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  border-radius: 14px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  overflow: hidden;
  box-sizing: border-box;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.12s;
}

.plugin-store__card:hover {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 45%, var(--vp-c-divider));
  box-shadow: 0 8px 28px color-mix(in srgb, var(--vp-c-brand-1) 12%, transparent);
  transform: translateY(-2px);
}

.plugin-store__card:focus-within {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 55%, var(--vp-c-divider));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--vp-c-brand-1) 22%, transparent);
}

.plugin-store__tile {
  display: grid;
  grid-template-rows: 40px auto auto minmax(0, 1fr);
  grid-template-columns: 1fr;
  align-items: start;
  justify-items: stretch;
  row-gap: 0.3rem;
  box-sizing: border-box;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  margin: 0;
  padding: 0.7rem 0.65rem 0.2rem;
  text-align: center;
}

.plugin-store__card-actions {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  margin-top: auto;
}

.plugin-store__detail {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0.2rem 0.65rem 0.35rem;
  border: none;
  background: transparent;
  color: var(--vp-c-brand-1);
  font-size: 0.7rem;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  outline: none;
}

/* stretched link：让整张卡片可点击打开详情 */
.plugin-store__detail::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
}

.plugin-store__detail:focus-visible {
  outline: none;
}

.plugin-store__tile-icon-slot {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.plugin-store__tile-icon {
  display: block;
  width: 40px;
  height: 40px;
  border-radius: 9px;
  object-fit: contain;
}

.plugin-store__tile-icon--placeholder {
  width: 40px;
  height: 40px;
  border-radius: 9px;
  background: var(--vp-c-bg-mute);
}

.plugin-store__tile-title {
  margin: 0;
  flex-shrink: 0;
  width: 100%;
  font-weight: 600;
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
  line-height: 1.3;
  min-height: calc(0.85rem * 1.3 * 2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.plugin-store__tile-sub {
  margin: 0;
  min-height: calc(0.72rem * 1.35 * 2);
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.plugin-store__install--row {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  width: 100%;
  margin: 0;
  border-radius: 0;
  border-top: 1px solid var(--vp-c-divider);
  padding: 0.4rem 0.6rem;
  font-size: 0.72rem;
}

.plugin-store__backdrop {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: color-mix(in srgb, var(--vp-c-bg) 55%, rgba(0, 0, 0, 0.45));
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.plugin-store__modal {
  position: relative;
  width: 100%;
  max-width: 440px;
  max-height: min(90vh, 640px);
  overflow-y: auto;
  padding: 1.5rem 1.5rem 1.25rem;
  border-radius: 16px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  box-shadow:
    0 24px 48px color-mix(in srgb, #000 18%, transparent),
    0 0 0 1px color-mix(in srgb, var(--vp-c-divider) 80%, transparent);
}

.plugin-store__modal-close {
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plugin-store__modal-close:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.plugin-store__modal-head {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-right: 2rem;
}

.plugin-store__modal-icon {
  display: block;
  border-radius: 12px;
  flex-shrink: 0;
}

.plugin-store__modal-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.plugin-store__modal-sub {
  margin: 0.35rem 0 0;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  line-height: 1.45;
}

.plugin-store__dl {
  margin: 0 0 1rem;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.35rem 0.75rem;
  font-size: 0.875rem;
}

.plugin-store__dl dt {
  color: var(--vp-c-text-3);
  font-weight: 500;
}

.plugin-store__dl dd {
  margin: 0;
  color: var(--vp-c-text-1);
  word-break: break-all;
}

.plugin-store__install {
  width: 100%;
  padding: 0.65rem 1rem;
  border-radius: 10px;
  border: none;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
  cursor: not-allowed;
}

.plugin-store-dlg-enter-active,
.plugin-store-dlg-leave-active {
  transition: opacity 0.22s ease;
}

.plugin-store-dlg-enter-active .plugin-store__modal,
.plugin-store-dlg-leave-active .plugin-store__modal {
  transition:
    transform 0.26s cubic-bezier(0.34, 1.15, 0.64, 1),
    opacity 0.22s ease;
}

.plugin-store-dlg-enter-from,
.plugin-store-dlg-leave-to {
  opacity: 0;
}

.plugin-store-dlg-enter-from .plugin-store__modal,
.plugin-store-dlg-leave-to .plugin-store__modal {
  transform: translateY(14px) scale(0.97);
  opacity: 0;
}

.plugin-store__commands {
  margin: 0 0 1rem;
}

.plugin-store__commands-h {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  letter-spacing: 0.02em;
}

.plugin-store__cmd-list {
  list-style: none;
  padding: 0.25rem 0.35rem 0.25rem 0.15rem;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  max-height: min(40vh, 280px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--vp-c-text-3) 42%, transparent) color-mix(
    in srgb,
    var(--vp-c-bg-soft) 88%,
    transparent
  );
}

.plugin-store__cmd-list::-webkit-scrollbar {
  width: 6px;
}

.plugin-store__cmd-list::-webkit-scrollbar-track {
  margin: 4px 0;
  background: transparent;
  border-radius: 99px;
}

.plugin-store__cmd-list::-webkit-scrollbar-thumb {
  border-radius: 99px;
  background: color-mix(in srgb, var(--vp-c-text-3) 42%, transparent);
}

.plugin-store__cmd-list::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--vp-c-text-3) 62%, transparent);
}

.plugin-store__cmd-item {
  padding: 0.55rem 0.65rem;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  font-size: 0.8125rem;
}

.plugin-store__cmd-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.2rem;
}

.plugin-store__cmd-title {
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.35;
}

.plugin-store__cmd-mode {
  flex-shrink: 0;
  font-size: 0.7rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-3);
}

.plugin-store__cmd-name {
  display: block;
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  margin-bottom: 0.15rem;
}

.plugin-store__cmd-sub {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.45;
  font-size: 0.8rem;
}

.plugin-store__cmd-desc {
  margin: 0.35rem 0 0;
  color: var(--vp-c-text-3);
  line-height: 1.45;
  font-size: 0.78rem;
}
</style>
