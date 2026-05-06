
/**
 * Generated into converted plugins as `.raycast-build/raycast-worker-runtime.ts`.
 * React custom renderer: Raycast List/Detail/Action UI runs in the Node Worker; snapshots go to the wujie view client.
 *
 * 由 `server.ts` 引入；插件业务代码通过 `@raycast/api`（别名到 `@public-tauri/api/raycast`）导入 UI 与 API。
 */
import React from 'react';
import Reconciler from 'react-reconciler';
import { DefaultEventPriority } from 'react-reconciler/constants.js';
import type { RaycastViewSnapshot } from './raycast-view-protocol';
import type { JsonPatchOp } from './json-patch';
import { generateJsonPatch } from './json-patch';
import { __getRaycastContext, __setRaycastContext } from '@public-tauri/api/raycast';
import type {
  HostElementInstance,
  HostInstance,
  HostRootContainer,
  HostTextInstance,
} from './host-instance';
import { buildSnapshotFromHostRoot } from './virtual-serialize';

let viewLaunchProps: Record<string, unknown> = {};

export function __setRaycastViewContext(context: {
  pluginName?: string;
  commandName?: string;
  preferences?: Record<string, unknown>;
  supportPath?: string;
  assetsPath?: string;
  launchProps?: Record<string, unknown>;
}) {
  viewLaunchProps = context.launchProps || {};
  __setRaycastContext({
    pluginName: context.pluginName,
    commandName: context.commandName,
    commandMode: 'view',
    preferences: context.preferences,
    supportPath: context.supportPath,
    assetsPath: context.assetsPath,
  });
}

const noop = () => {};

const swallowError = (_error: Error, _info: unknown) => {};

export function createRaycastViewSession(options: {
  emitSnapshot: (snapshot: RaycastViewSnapshot) => void;
  emitPatch: (patches: JsonPatchOp[]) => void;
}) {
  const handlers = new Map<string, (...args: unknown[]) => void | Promise<void>>();
  let hostIdSeq = 0;
  const nextHostId = () => {
    hostIdSeq += 1;
    return `rv:n:${hostIdSeq}`;
  };

  let latestSnapshot: RaycastViewSnapshot | null = null;
  let sentInitialSnapshot = false;
  const rootNode: HostRootContainer = { children: [] };
  let snapshotQueued = false;

  const serializeRoot = (): RaycastViewSnapshot => buildSnapshotFromHostRoot(rootNode.children, handlers, {
    commandName: __getRaycastContext().commandName || '',
  });

  const emitSnapshot = () => {
    const nextSnapshot = serializeRoot();

    if (!sentInitialSnapshot || !latestSnapshot) {
      latestSnapshot = nextSnapshot;
      sentInitialSnapshot = true;
      options.emitSnapshot(latestSnapshot);
      return;
    }

    const patches = generateJsonPatch(latestSnapshot, nextSnapshot);
    latestSnapshot = nextSnapshot;
    if (patches.length > 0) {
      options.emitPatch(patches);
    }
  };

  const scheduleSnapshotAfterCommit = () => {
    if (snapshotQueued) return;
    snapshotQueued = true;
    queueMicrotask(() => {
      snapshotQueued = false;
      emitSnapshot();
      reconciler.flushSyncWork?.();
    });
  };

  const hostConfig = {
    getRootHostContext: () => ({}),
    prepareForCommit: () => null,
    preparePortalMount: () => null,
    clearContainer: () => false,
    resetAfterCommit: () => {
      scheduleSnapshotAfterCommit();
    },
    getChildHostContext: () => ({}),
    shouldSetTextContent: () => false,
    createInstance: (type: string, props: Record<string, unknown>): HostElementInstance => {
      console.log('createInstance', type, props);
      return {
        type,
        hostId: nextHostId(),
        props,
        parent: null,
        children: [],
      };
    },
    createTextInstance: (text: string): HostTextInstance => ({
      type: 'text',
      hostId: nextHostId(),
      text,
      parent: null,
    }),
    resetTextContent: noop,
    hideTextInstance: noop,
    unhideTextInstance: noop,
    getPublicInstance: (instance: HostInstance) => instance,
    hideInstance: noop,
    unhideInstance: noop,
    appendInitialChild: (parent: HostElementInstance | HostRootContainer, child: HostInstance) => {
      child.parent = parent;
      parent.children.push(child);
    },
    appendChild: (parent: HostElementInstance | HostRootContainer, child: HostInstance) => {
      child.parent = parent;
      parent.children.push(child);
    },
    insertBefore: (parent: HostElementInstance | HostRootContainer, child: HostInstance, beforeChild: HostInstance) => {
      child.parent = parent;
      parent.children = parent.children.filter(item => item !== child);
      parent.children.splice(parent.children.indexOf(beforeChild), 0, child);
    },
    finalizeInitialChildren: () => false,
    isPrimaryRenderer: true,
    supportsMutation: true,
    supportsPersistence: false,
    supportsHydration: false,
    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,
    noTimeout: -1,
    getCurrentEventPriority: () => DefaultEventPriority,
    getCurrentUpdatePriority: () => DefaultEventPriority,
    setCurrentUpdatePriority: noop,
    resolveUpdatePriority: () => DefaultEventPriority,
    shouldAttemptEagerTransition: () => false,
    maySuspendCommit: () => false,
    preloadInstance: () => true,
    startSuspendingCommit: noop,
    suspendInstance: noop,
    waitForCommitToBeReady: () => noop,
    mayResourceSuspendCommit: () => false,
    beforeActiveInstanceBlur: noop,
    afterActiveInstanceBlur: noop,
    detachDeletedInstance: noop,
    getInstanceFromNode: () => null,
    prepareScopeUpdate: noop,
    getInstanceFromScope: () => null,
    appendChildToContainer: (container: HostRootContainer, child: HostInstance) => {
      child.parent = container;
      container.children.push(child);
    },
    insertInContainerBefore: (container: HostRootContainer, child: HostInstance, beforeChild: HostInstance) => {
      child.parent = container;
      container.children = container.children.filter(item => item !== child);
      container.children.splice(container.children.indexOf(beforeChild), 0, child);
    },
    removeChildFromContainer: (container: HostRootContainer, child: HostInstance) => {
      container.children = container.children.filter(item => item !== child);
      child.parent = null;
    },
    prepareUpdate: () => true,
    commitMount: noop,
    // React 19 / reconciler ≥0.31：无 updatePayload，签名为 (instance, type, prevProps, nextProps, internalHandle)
    commitUpdate: (instance: HostElementInstance, _type: unknown, _prevProps: unknown, nextProps: Record<string, unknown>) => {
      instance.props = nextProps;
    },
    commitTextUpdate: (textInstance: HostTextInstance, _oldText: string, newText: string) => {
      textInstance.text = newText;
    },
    removeChild: (parent: HostElementInstance, child: HostInstance) => {
      parent.children = parent.children.filter(item => item !== child);
      child.parent = null;
    },
  };

  // HostConfig 随 react-reconciler 版本扩展字段；变异宿主只需最小子集（见官方 custom renderer 示例）。
  const reconciler = Reconciler(hostConfig as any);

  let rootContainer: ReturnType<typeof reconciler.createContainer> | null = null;

  const mount = async (Command: React.ComponentType<Record<string, unknown>>) => {
    hostIdSeq = 0;
    rootContainer = reconciler.createContainer(
      rootNode,
      0,
      null,
      false,
      null,
      '',
      swallowError,
      swallowError,
      swallowError,
      noop,
    );
    reconciler.updateContainer(
      React.createElement(Command, viewLaunchProps),
      rootContainer,
      null,
      noop,
    );
    reconciler.flushSyncWork?.();
  };

  const dispatchHostEvent = async (hostId: string, event = 'onAction', args: unknown[] = []) => {
    const handler = handlers.get(`${hostId}:${event}`);
    if (!handler) throw new Error(`Unknown Raycast host event: ${hostId} · ${event}`);
    await handler(...args);
    reconciler.flushSyncWork?.();
  };

  const unmount = () => {
    if (rootContainer) {
      reconciler.updateContainer(null, rootContainer, null, noop);
      rootContainer = null;
    }
    hostIdSeq = 0;
    latestSnapshot = null;
    sentInitialSnapshot = false;
    handlers.clear();
  };

  return { mount, dispatchHostEvent, unmount };
}
