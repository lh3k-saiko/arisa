import { assert, unreachable } from "@std/assert";

export type Dirent = {
  type: "vdir",
  value: Arisa.VDir,
} | {
  type: "vfile",
  value: Arisa.VFile
} | {
  type: "ref",
  value: string,
}

// deno-lint-ignore no-explicit-any
export default interface VDir< V extends VDir<any> > {
  parent?: VDir<V>;
  get(path: string): Dirent | null;
  set(path: string, vfile: Arisa.VFile): Dirent | null;
  del(path: string): Dirent | null;
}

export class VTree implements VDir<VTree> {
  private _dir: Record<string, Dirent> = {};
  parent?: VTree;

  _get(path: string, fillMissing: boolean, onDelete: boolean): Dirent | null {
    assert(!fillMissing || !onDelete);
    const pathSegments = path.trim().split("/").filter(p => p.length > 0);
    // deno-lint-ignore no-this-alias
    let root: VTree = this;
    if(path.startsWith("/")) {
      while(root.parent) root = root.parent;
      if(pathSegments.length === 0) {
        if(onDelete) return null;
        return { "type": "vdir", value: root };
      }
    }
    if(pathSegments.length === 0) return null;
    
    let current = root;
    for(let i = 0; i < pathSegments.length; i++) {
      if(pathSegments[i] === ".") continue;
      if(pathSegments[i] === "..") {
        if(current.parent) {
          current = current.parent;
        }
        else return null;
      }
      if(!(pathSegments[i] in this._dir)) {
        if(fillMissing) {
          this._dir[pathSegments[i]] = { type: "vdir", value: new VTree() };
        } else {
          return null;
        }
      }
      const dirent = this._dir[pathSegments[i]];
      if(i === pathSegments.length - 1) {
        if(onDelete) delete this._dir[pathSegments[i]];
        return dirent;
      } else
      if(dirent.type === "vdir" && i < pathSegments.length - 1) {
        current = dirent.value as VTree;
      } else
      return null;
    }
    unreachable();
  }

  get(path: string): Dirent | null {
    return this._get(path, false, false);
  }

  set(path: string, refOrVfile: string | Arisa.VFile): Dirent | null {
    const dirent = this._get(path, true, false)!;
    if(!dirent) return null;
    if(typeof refOrVfile === "string") {
      dirent.type = "ref";
      dirent.value = refOrVfile;
    } else {
      dirent.type = "vfile";
      dirent.value = refOrVfile;
    }
    return dirent;
  }

  del(path: string): Dirent | null {
    return this._get(path, false, true);
  }
}
