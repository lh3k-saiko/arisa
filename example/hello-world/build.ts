import { assert } from "jsr:@std/assert@1.0.11";
import * as YAML from "jsr:@std/yaml@1.0.5";

import Handlebars from "npm:handlebars@4.7.8";

import { fromMarkdown } from "npm:mdast-util-from-markdown@2.0.2";
import { frontmatter } from 'npm:micromark-extension-frontmatter@2.0.0'
import { frontmatterFromMarkdown } from "npm:mdast-util-frontmatter@2.0.1";
import { toHast as mdToHast } from "npm:mdast-util-to-hast@13.2.0";
import * as unistVisit from "npm:unist-util-visit@5.0.0";

import esbuild from "npm:esbuild@0.25.0";

import { Context, htmlToHast } from "../../index.ts";

class YamlLoader implements Arisa.Loader {
  load(_path: string, data: Arisa.RawData): Arisa.Page {
    Object.assign(data, YAML.parse(data.content as string) as Arisa.Data);
    
    return { data };
  }
}

class HbsLoader implements Arisa.Loader {
  template?: Handlebars.TemplateDelegate;

  constructor(
    public parseOptions?: Handlebars.ParseOptions,
    public runtimeOptions?: Handlebars.RuntimeOptions,
  ) {}

  load(_path: string, data: Arisa.RawData): void {
    this.template = Handlebars.compile(data.content, this.parseOptions);
  }

  extend(_path: string, page: Arisa.Page): Arisa.Page {
    assert(this.template);

    const html = this.template(page.data, this.runtimeOptions);
    const hast = htmlToHast(html);

    return Object.assign(page, { hast });
  }
}

class MdLoader implements Arisa.Loader {
  load(_path: string, data: Arisa.RawData): Arisa.Page {
    const ast = fromMarkdown(data.content, "utf-8", {
      extensions: [frontmatter(["yaml"])],
      mdastExtensions: [frontmatterFromMarkdown(["yaml"])],
    });

    unistVisit.visit(ast, "yaml", (node, index, parent) => {
      Object.assign(data, YAML.parse(node.value) as Arisa.Data);
      if(parent) parent.children = parent.children.filter((_, i) => i !== index);
      return unistVisit.EXIT;
    })

    const hast = mdToHast(ast);

    return { data, hast };
  }
}

const ctx = new Context();

ctx.add("./content/**/*", "./content");
ctx.addLoader(".hbs", () => new HbsLoader);
ctx.addLoader(".md", () => new MdLoader);
ctx.addLoader([".yaml", ".yml"], () => new YamlLoader);

console.log(ctx);

await ctx.build();
