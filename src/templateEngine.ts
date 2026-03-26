
import * as fs from 'fs';
import * as path from 'path';

interface Template {
  name: string;
  content: string;
}

class TemplateEngine {
  private templates: { [name: string]: Template };

  constructor() {
    this.templates = {};
  }

  getTemplate(name: string): Template {
    if (!this.templates[name]) {
      const filePath = path.join(__dirname, `../templates/${name}.template`);
      const content = fs.readFileSync(filePath, 'utf8');
      this.templates[name] = { name, content };
    }
    return this.templates[name];
  }

  render(template: Template, data: any): string {
    return template.content.replace(/{{(.*?)}}/g, (match, key) => data[key.trim()]);
  }
}

export function createTemplateEngine(): TemplateEngine {
  return new TemplateEngine();
}
