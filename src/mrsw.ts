// deno-lint-ignore-file no-explicit-any
import { Semaphore } from "async-mutex";

export class MultiReaderSingleWriter {
  private _mutexReadCount = new Semaphore(1);
  private _mutexWriterWait = new Semaphore(1);
  private _mutex = new Semaphore(1);

  private _readCount = 0;

  async write<F extends (...args: any[]) => any>(fn: F, ...args: Parameters<F>): Promise<ReturnType<F>> {
    // console.debug("acquire write");

    await this._mutexWriterWait.acquire();
    await this._mutex.acquire();
    this._mutexWriterWait.release();

    // console.debug("start write");

    return Promise.resolve(fn(...args)).finally(() => {
      this._mutex.release();
      // console.debug("end write")
    });
  }

  async read<F extends (...args: any[]) => any>(fn: F, ...args: Parameters<F>): Promise<ReturnType<F>> {
    // console.debug("acquire read");

    await this._mutexWriterWait.acquire();
    this._mutexWriterWait.release();
    
    await this._mutexReadCount.acquire();
    if(this._readCount === 0) {
      await this._mutex.acquire();
      this._readCount += 1;
      this._mutexReadCount.release();
    } else {
      this._readCount += 1;
      this._mutexReadCount.release();
    }

    // console.debug("start read", this._readCount);

    return Promise.resolve(fn(...args)).finally(() => {
      this._mutexReadCount.acquire().then(() => {
        this._readCount -= 1;
        if(this._readCount === 0) this._mutex.release();
        this._mutexReadCount.release();
        // console.debug("end read", this._readCount);
      });
    });
  }
}

export function read(mrsw: MultiReaderSingleWriter) {
  return function(func: any, context: any) {
    return function(this: any, ...args: unknown[]) {
      return mrsw.read(() => func.call(this, ...args));
    }
  }
}

export function write(mrsw: MultiReaderSingleWriter) {
  return function(func: any, context: any) {
    return function(this: any, ...args: unknown[]) {
      return mrsw.write(() => func.call(this, ...args));
    }
  }
}
