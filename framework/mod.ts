import type { VFile as _VFile } from "vfile";
import type _VDir from "./src/vdir.ts";
import type { Element as HastElement } from "hast";

export { VTree } from "./src/vdir.ts";

declare global {
  export namespace Arisa {
    type MaybePromise<T> = T | Promise<T>;

    /**
     * Re-export VFile as Arisa.VFile
     */
    type VFile = _VFile;
    // deno-lint-ignore no-explicit-any
    type VDir = _VDir<any>;
    
    interface Data {
      title?: string,
      url?: string,
      fileInfo?: {
        src: string,
        mtime: Date | null;
        atime: Date | null;
        btime: Date | null;
        ctime: Date | null;
      }
    }

    interface Content {
      vdir: VDir,
      hast?: HastElement,
      data: Data,
    }

    interface Template {
      renderTemplate?: (innerTemplate: Template) => MaybePromise<Template>;
      renderContent?: (content: Content) => MaybePromise<Content>;
    }
  }
}
