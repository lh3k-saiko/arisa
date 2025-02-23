import type * as Hast from "hast";
import { timeStamp } from "node:console";
import path from "node:path";

declare global {
  namespace Arisa {
    interface Data {
      sourcePath?: string,
      url?: string,
      title?: string,
      layout?: string,
      atime?: Date,
      btime?: Date,
      ctime?: Date,
      [index: string]: unknown,
    }
    
    interface Page {
      html?: string | Hast.Node,
      css?: string | string[],
      js?: string | string[],
      data: Data,
    }
    
    interface Loader {
      loadTemplate?: (path: string, content: string) => void | Promise<void>,
      load: (path: string, content: string, data: Data) => Page | Promise<Page>,
    
      clearCache?: () => Promise<void>,
    }
  }
}

abstract class Task<V, M> {
  private _subList: ((_ttag: number, info: M) => void | Promise<void>)[] = [];
  private _ttag: number;
  private _result: Promise<V> | null = null;

  constructor() {
    this._ttag = Date.now();
  }

  protected abstract work(): V | Promise<V>;

  private async _getResult(): Promise<V> {
    if(!this._result) this._result = Promise.resolve(this.work());

    return await this._result;
  }

  public async getResult(callback: (info: M) => void): Promise<V> {
    this._subList.push((_ttag, info) => callback(info));
    return await this._getResult();
  }

  protected async getResultFrom<VV> (task: Task<VV, M>): Promise<VV> {
    task._subList.push((_ttag, info) => this._update(_ttag, info));
    return await task._getResult();
  }

  private async _update(_ttag: number, info: M) {
    if(_ttag >= this._ttag) return ;
    this._ttag = _ttag;

    await Promise.all(this._subList.map(sub => sub(_ttag, info)));
    this._subList = [];
    this._result = null;
  }

  public async update(info: M) {
    await this._update(Date.now(), info);
  }
}

export class Context {
  private _pages: string[] = [];
  private _loaders: Record<string, () => Arisa.Loader> = {};
  private _layout: Record<string, string> = {};
  private _output: string = "./dist";
  private _root: string = path.resolve(".");
  private _globalData: Arisa.Data = {};

  /**
   * To include more input files.
   * 
   * Use [picomatch](https://www.npmjs.com/package/picomatch) to test whether files should be included.
   * 
   * ```ts
   * addPage("./home.md"); // add one file
   * addPage("./content/**\/*"); // add all files under ./content
   * ```
   * 
   * @param rule One or multiple picomatch rules to be applied
   */

  addPage(rule: string | string[]) {
    if (typeof rule === "string") rule = [rule];
    rule.forEach(rule => this._pages.push(rule));
  }

  /**
   * Set the loader for input files with certain extensions.
   * 
   * @param ext one or more extensions
   * @param loader the loader to be set
   */
  addLoader(ext: string | string[], loader: () => Arisa.Loader) {
    if (typeof ext === "string") ext = [ext];
    ext.map(ext => ext.startsWith(".") ? ext : "." + ext).forEach(ext => this._loaders[ext] = loader);
  }

  getLoader(filename: string): Arisa.Loader | null {
    filename = path.basename(filename);

    for (let i = filename.indexOf(filename); i != -1; i = filename.indexOf(filename, i)) {
      const ext = filename.substring(i);
      if (ext in this._loaders)
        return this._loaders[ext]();
    }

    return null;
  }
  
  addLayout(name: string, templatePath: string) {
    this._layout[name] = templatePath;
  }

  addLayoutDir(layoutDir: string, nameMap = (p: string) => path.basename(p)) {
    function* dfs(p: string): Generator<string, void> {
      const stat = Deno.statSync(p);
      if(stat.isFile) {
        yield path.resolve(p);
        return ;
      }

      if(!stat.isDirectory) return ;

      for(const dirent of Deno.readDirSync(p)) {
        yield* dfs(path.join(p, dirent.name));
      }

      return ;
    }

    for(const p of dfs(layoutDir)) {
      this.addLayout(nameMap(p), p);
    }

    return ;
  }

  /**
   * Set the output dir.
   * 
   * @param output The new output dir to be set.
   */
  setOutputDir(output: string) {
    this._output = output;
  }

  /**
   * Set the global data.
   * 
   * @param data The new global data to be set.
   */
  setGlobalData(data: Arisa.Data) {
    this._globalData = data;
  }

  async build(): Promise<void> {

  }
}
