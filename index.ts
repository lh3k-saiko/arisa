import type * as Hast from "hast";
import { VFile } from "vfile";

import path from "node:path";

import { MultiReaderSingleWriter as Mrsw } from "./src/mrsw.ts";

declare global {
  type MaybePromise<T> = T | Promise<T>;
  type MaybeArray<T> = T | Array<T>;

  namespace Arisa {
    interface Data {
      sourcePath?: string,
      url?: string,
      title?: string,
      layout?: string,
      atime?: Date,
      btime?: Date,
      ctime?: Date,
      content?: string | Page,
      [index: string]: unknown,
    }

    interface RawData extends Data {
      content: string
    }

    interface Page {
      hast?: Hast.Node,
      css?: MaybeArray<VFile | string>,
      js?: MaybeArray<VFile | string>,
      "assets"?: MaybeArray<VFile | string>,
      data: Data,
    }

    interface Loader {
      load: (path: string, data: RawData) => MaybePromise<void | Page>,
      extend?: (path: string, page: Page) => MaybePromise<Page>,

      clearCache?: () => Promise<void>,
    }
  }
}

interface NamedAssets {
  type: 'static' | 'page';
  match: string;
  defaultUrlRule: (p: string) => string;
}

export class Context {
  private _namedAssets: NamedAssets[] = [];
  private _loaders: Record<string, () => Arisa.Loader> = {};
  private _output: string = "./dist";
  private _defaultData: Arisa.Data = {};

  /**
   * To include more input files.
   * 
   * Use [picomatch](https://www.npmjs.com/package/picomatch) to test whether files should be included.
   * 
   * ```ts
   * const ctx = new Context();
   * 
   * ctx.add("./home.md"); // add one file
   * ctx.add("./content/**\/*"); // add all files under ./content
   * ```
   * 
   * @param rule One or multiple picomatch rules to be applied
   */

  add(rule: MaybeArray<string>, rootOrDefaultUrlRule?: string | ((p: string) => string)) {
    if (typeof rule === "string") rule = [rule];

    const root = typeof rootOrDefaultUrlRule === "string" ? rootOrDefaultUrlRule : Deno.cwd();
    const defaultUrlRule = typeof (rootOrDefaultUrlRule) === "function" ? rootOrDefaultUrlRule :
      (p: string) => path.relative(root, p).replaceAll('\\', '/').replace(/^\.\/+/g, "/");

    rule.forEach(rule => this._namedAssets.push({ type: 'page', match: rule, defaultUrlRule }));
  }

  copy(rule: MaybeArray<string>, rootOrDefaultUrlRule?: string | ((p: string) => string)) {
    if (typeof rule === "string") rule = [rule];

    const root = typeof rootOrDefaultUrlRule === "string" ? rootOrDefaultUrlRule : Deno.cwd();
    const defaultUrlRule = typeof (rootOrDefaultUrlRule) === "function" ? rootOrDefaultUrlRule :
      (p: string) => path.relative(root, p).replaceAll('\\', '/').replace(/^\.\/+/g, "/");

    rule.forEach(rule => this._namedAssets.push({ type: 'static', match: rule, defaultUrlRule }));
  }

  /**
   * Set the loader for input files with certain extensions.
   * 
   * @param ext one or more extensions
   * @param loader the loader to be set
   */
  addLoader(ext: MaybeArray<string>, loader: () => Arisa.Loader) {
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
  setDefaultData(data: Arisa.Data) {
    this._defaultData = data;
  }

  async build(): Promise<void> {

  }
}

export { fromHtml as htmlToHast } from "hast-util-from-html";
