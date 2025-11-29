/**
 * AsyncFile - 支持同步和异步可迭代对象的 File 替代类
 *
 * 与原生 File 对象的主要区别：
 * - 支持异步可迭代对象作为数据源
 * - 支持流式处理大文件，无需一次性加载到内存
 * - 保持与原生 File 对象的 API 兼容性
 */

export interface AsyncFileOptions {
  type?: string;
  lastModified?: number;
  path?: string;
}

/**
 * AsyncFile - 支持同步和异步可迭代对象的 File 替代类
 */
export class AsyncFile {
  /**
   * 创建一个异步可迭代的数据源
   */
  static async fromAsyncIterable(
    asyncIterable: AsyncIterable<Uint8Array>,
    fileName: string,
    options: AsyncFileOptions = {},
  ): Promise<AsyncFile> {
    return new AsyncFile([asyncIterable], fileName, options);
  }

  /**
   * 从同步可迭代对象创建
   */
  static fromIterable(
    iterable: Iterable<Uint8Array>,
    fileName: string,
    options: AsyncFileOptions = {},
  ): AsyncFile {
    return new AsyncFile([iterable], fileName, options);
  }

  /**
   * 从流创建
   */
  static async fromStream(
    stream: ReadableStream<Uint8Array>,
    fileName: string,
    options: AsyncFileOptions = {},
  ): Promise<AsyncFile> {
    const asyncIterable: AsyncIterable<Uint8Array> = {
      [Symbol.asyncIterator]() {
        return (async function* () {
          const reader = stream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              yield value;
            }
          } finally {
            reader.releaseLock();
          }
        }());
      },
    };

    return new AsyncFile([asyncIterable], fileName, options);
  }

  /**
   * 从原生 File 对象创建 AsyncFile
   */
  static fromFile(file: File): AsyncFile {
    // 从 File 对象创建流，然后转换为 AsyncIterable
    const stream = file.stream();
    const asyncIterable: AsyncIterable<Uint8Array> = {
      [Symbol.asyncIterator]() {
        return (async function* () {
          const reader = stream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              yield value;
            }
          } finally {
            reader.releaseLock();
          }
        }());
      },
    };

    return new AsyncFile(
      [asyncIterable],
      file.name,
      {
        type: file.type,
        lastModified: file.lastModified,
        path: (file as any).webkitRelativePath || '',
      },
    );
  }

  public readonly name: string;
  public readonly lastModified: number;
  public readonly path: string;
  public readonly size: number;
  public readonly type: string;

  private data: Uint8Array | null = null;
  private dataPromise: Promise<Uint8Array> | null = null;
  private asyncIterable: AsyncIterable<Uint8Array> | Iterable<Uint8Array> | null = null;

  constructor(
    dataParts: Array<Uint8Array | ArrayBuffer | Blob | string | AsyncIterable<Uint8Array> | Iterable<Uint8Array>>,
    fileName: string,
    options: AsyncFileOptions = {},
  ) {
    this.name = fileName;
    this.lastModified = options.lastModified || Date.now();
    this.path = options.path || '';
    this.type = options.type || '';

    // 检查是否包含异步可迭代对象
    const hasAsyncIterable = dataParts.some(part => part && typeof part === 'object' && Symbol.asyncIterator in part);

    if (hasAsyncIterable) {
      // 异步模式：合并所有数据部分
      this.asyncIterable = this.mergeDataParts(dataParts);
      this.size = -1; // 异步模式下无法预先知道大小
    } else {
      // 同步模式：与原生 File 行为一致
      this.data = this.mergeSyncDataParts(dataParts as Array<Uint8Array | ArrayBuffer | Blob | string>);
      this.size = this.data.byteLength;
    }
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const data = await this.getData();
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  }

  async text(): Promise<string> {
    const data = await this.getData();
    return new TextDecoder().decode(data);
  }

  stream(): ReadableStream<Uint8Array> {
    if (this.data !== null) {
      // 同步数据：创建一个简单的流
      return new ReadableStream({
        start: (controller) => {
          controller.enqueue(this.data || undefined);
          controller.close();
        },
      });
    }

    // 异步数据：创建流式读取
    return new ReadableStream({
      start: async (controller) => {
        if (!this.asyncIterable) {
          controller.close();
          return;
        }

        try {
          for await (const chunk of this.asyncIterable) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }

  /**
   * 异步切片操作
   */
  async asyncSlice(start?: number, end?: number, contentType?: string): Promise<AsyncFile> {
    const data = await this.getData();
    const slicedData = data.slice(start || 0, end || data.length);

    return new AsyncFile(
      [slicedData],
      this.name,
      {
        type: contentType || this.type,
        lastModified: this.lastModified,
        path: this.path,
      },
    );
  }

  // 原生 File 方法的兼容实现
  slice(start?: number, end?: number, contentType?: string): AsyncFile {
    if (this.data !== null) {
      // 同步模式：直接切片
      const slicedData = this.data.slice(start || 0, end || this.data.length);
      return new AsyncFile(
        [slicedData],
        this.name,
        {
          type: contentType || this.type,
          lastModified: this.lastModified,
          path: this.path,
        },
      );
    }

    // 异步模式：返回一个代理对象，实际数据在需要时加载
    throw new Error('Cannot use synchronous slice() on AsyncFile with async data. Use asyncSlice() instead.');
  }

  // 实现 Symbol.toStringTag
  get [Symbol.toStringTag](): string {
    return 'AsyncFile';
  }

  /**
   * 检查是否为异步文件
   */
  get isAsync(): boolean {
    return this.data === null;
  }

  /**
   * 获取文件大小的 Promise 版本
   */
  async getSize(): Promise<number> {
    if (this.size >= 0) {
      return this.size;
    }

    const data = await this.getData();
    return data.length;
  }

  /**
   * 转换为原生 File 对象（仅适用于同步数据）
   */
  async toFile(): Promise<File> {
    const data = await this.getData();
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    return new File([buffer], this.name, {
      type: this.type,
      lastModified: this.lastModified,
    });
  }

  /**
   * 合并同步数据部分
   */
  private mergeSyncDataParts(parts: Array<Uint8Array | ArrayBuffer | Blob | string>): Uint8Array {
    const chunks: Uint8Array[] = [];

    for (const part of parts) {
      if (part instanceof Uint8Array) {
        chunks.push(part);
      } else if (part instanceof ArrayBuffer) {
        chunks.push(new Uint8Array(part));
      } else if (part instanceof Blob) {
        // 这里简化处理，实际应该递归处理 Blob 的数据
        chunks.push(new Uint8Array(part as any));
      } else if (typeof part === 'string') {
        chunks.push(new TextEncoder().encode(part));
      }
    }

    if (chunks.length === 0) {
      return new Uint8Array(0);
    }

    if (chunks.length === 1) {
      return chunks[0];
    }

    // 计算总长度
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);

    // 合并所有块
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * 合并数据部分（支持同步和异步）
   */
  private async* mergeDataParts(parts: Array<Uint8Array | ArrayBuffer | Blob | string | AsyncIterable<Uint8Array> | Iterable<Uint8Array>>): AsyncGenerator<Uint8Array> {
    for (const part of parts) {
      if (part instanceof Uint8Array) {
        yield part;
      } else if (part instanceof ArrayBuffer) {
        yield new Uint8Array(part);
      } else if (part instanceof Blob) {
        // 对于 Blob，我们将其转换为 Uint8Array
        const arrayBuffer = await part.arrayBuffer();
        yield new Uint8Array(arrayBuffer);
      } else if (typeof part === 'string') {
        yield new TextEncoder().encode(part);
      } else if (part && typeof part === 'object') {
        if (Symbol.asyncIterator in part) {
          // 异步可迭代对象
          for await (const chunk of part as AsyncIterable<Uint8Array>) {
            yield chunk;
          }
        } else if (Symbol.iterator in part) {
          // 同步可迭代对象
          for (const chunk of part as Iterable<Uint8Array>) {
            yield chunk;
          }
        }
      }
    }
  }

  /**
   * 异步获取文件数据
   */
  private async getData(): Promise<Uint8Array> {
    if (this.data !== null) {
      return this.data;
    }

    if (this.dataPromise === null) {
      this.dataPromise = this.loadAsyncData();
    }

    return this.dataPromise;
  }

  /**
   * 加载异步数据
   */
  private async loadAsyncData(): Promise<Uint8Array> {
    if (!this.asyncIterable) {
      return new Uint8Array(0);
    }

    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    for await (const chunk of this.asyncIterable) {
      chunks.push(chunk);
      totalLength += chunk.length;
    }

    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    this.data = result;
    this.asyncIterable = null; // 释放内存

    return result;
  }
}
