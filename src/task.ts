import { MultiReaderSingleWriter as Mrsw } from "./mrsw.ts";
import Watcher from "./watcher.ts";

export abstract class Task<V, M> {
  private _subList: ((_ts: number, info: M) => MaybePromise<void>)[] = [];
  private _ts: number;
  private _result: Promise<V> | null = null;

  constructor(private _mutex: Mrsw) {
    this._ts = Date.now();
  }

  protected abstract work(): MaybePromise<V>;

  private async _getResult(): Promise<V> {
    if (!this._result) this._result = Promise.resolve(this.work());

    return await this._result;
  }

  public async getResult(callback: (info: M) => void): Promise<V> {
    return await this._mutex.read(async() => {
      this._subList.push((_ts, info) => callback(info));
      return await this._getResult();
    })
  }

  protected async getResultFrom<VV>(task: Task<VV, M>): Promise<VV> {
    return await this._mutex.read(async() => {
      task._subList.push((_ts, info) => this._update(_ts, info));
      return await task._getResult();
    });
  }

  private async _update(_ts: number, info: M) {
    if (_ts >= this._ts) return;
    this._ts = _ts;

    await Promise.all(this._subList.map(sub => sub(_ts, info)));
    this._subList = [];
    this._result = null;
  }

  public async update(info: M) {
    await this._mutex.write(() => this._update(Date.now(), info));
  }
}
