import { assert } from "jsr:@std/assert@1.0.11";
import * as YAML from "jsr:@std/yaml@1.0.5";

import Handlebars from "npm:handlebars@4.7.8";

import { fromMarkdown } from "npm:mdast-util-from-markdown@2.0.2";
import { frontmatter } from 'npm:micromark-extension-frontmatter@2.0.0'
import { frontmatterFromMarkdown } from "npm:mdast-util-frontmatter@2.0.1";
import { toHast } from "npm:mdast-util-to-hast@13.2.0";
import * as unistVisit from "npm:unist-util-visit@5.0.0";

import { Context } from "../../index.ts";

class YamlLoader implements Arisa.Loader {
  load(_path: string, content: string, data: Arisa.Data = {}): Arisa.Page {
    Object.assign(data, YAML.parse(content) as Arisa.Data);

    return { data };
  }
}

class HbsLoader implements Arisa.Loader {
  template?: Handlebars.TemplateDelegate;

  constructor(
    public parseOptions?: Handlebars.ParseOptions,
    public runtimeOptions?: Handlebars.RuntimeOptions,
  ) {}

  loadTemplate(_path: string, templateContent: string) {
    this.template = Handlebars.compile(templateContent, this.parseOptions);
  }

  load(_path: string, children: string, data: Arisa.Data = {}): Arisa.Page {
    assert(this.template);

    const html = this.template({ ...data, children }, this.runtimeOptions);
    return { html, data };
  }
}

class MdLoader implements Arisa.Loader {
  load(_path: string, content: string, data: Arisa.Data = {}): Arisa.Page {
    const ast = fromMarkdown(content, "utf-8", {
      extensions: [frontmatter(["yaml"])],
      mdastExtensions: [frontmatterFromMarkdown(["yaml"])],
    });

    unistVisit.visit(ast, "yaml", (node, index, parent) => {
      Object.assign(data, YAML.parse(node.value) as Arisa.Data);
      if(parent) parent.children = parent.children.filter((_, i) => i !== index);
      return unistVisit.EXIT;
    })

    const html = toHast(ast);

    return { data, html };
  }
}

const ctx = new Context();

ctx.addPage("content/**/*");
ctx.addLoader(".hbs", () => new HbsLoader);
ctx.addLoader(".md", () => new MdLoader);
ctx.addLoader([".yaml", ".yml"], () => new YamlLoader);

ctx.addLayoutDir("./layout");

console.log(ctx);

await ctx.build();
