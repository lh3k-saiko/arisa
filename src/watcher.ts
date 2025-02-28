import { MultiReaderSingleWriter } from "./mrsw.ts";

export default class Watcher {
  private _mutex = new MultiReaderSingleWriter;
  innerWatcher: Deno.FsWatcher;
  listeners = new Map<number, (event: Deno.FsEvent) => MaybePromise<void>>();

  _id = 0;

  constructor(innerWatcher: Deno.FsWatcher | MaybeArray<string>, recursive: boolean = true) {
    if(typeof innerWatcher === "string" || Array.isArray(innerWatcher)) {
      this.innerWatcher = Deno.watchFs(innerWatcher, { recursive })
    } else {
      this.innerWatcher = innerWatcher;
    }
    const daemon = (async () => {
      for await(const event of this.innerWatcher!) {
        this._mutex.read(
          () => this.listeners.values().forEach(f => f(event))
        );
      }
    });
    daemon();
  }

  async on(f: (event: Deno.FsEvent) => MaybePromise<void>) {
    return await this._mutex.write(() => {
      this._id += 1;
      this.listeners.set(this._id, f);
      return this._id;
    })
  }

  async off(id: number) {
    return await this._mutex.write(() => {
      return this.listeners.delete(id);
    })
  }

  async once(f: (event: Deno.FsEvent) => MaybePromise<void>) {
    return await this._mutex.write(() => {
      const id = ++this._id;
      let called = false;
      this.listeners.set(id, (e) => {
        if(called) return ;
        called = true;
        this._mutex.write(() => this.listeners.delete(id))
          .then(() => f(e));
      })
      return ;
    })
  }

  close() {
    if(this.innerWatcher) {
      this.innerWatcher.close();
    }
  }
}
