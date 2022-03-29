import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { config, mainConfig } from './data/configs.js';
import { dockerComposeTemplate, imageProjectTemplate, projectTemplate, traefikTemplate } from './data/templates.js';
import { CustomProject, ImageProject, LocalProject } from './types/project.js';
import { indent } from './util/indent.js';
import { readFileSync } from './util/read-file-sync.js';
import { removeEmptyLines } from './util/remove-empty-lines.js';
import { replacePlaceholders } from './util/replace-placeholders.js';
const projects = config.projects;

export class Main {
  private _template: string;
  constructor() {
    this._template = dockerComposeTemplate;
  }

  public main() {
    const dockerComposeFile = this.renderDockerComposeFile();
    if (!existsSync('./output')) {
      mkdirSync('./output');
    }
    writeFileSync('./output/docker-compose.yml', dockerComposeFile);
    copyFileSync('./src/templates/traefik.toml', './output/traefik.toml');
    copyFileSync('./src/templates/.env', './output/.env');
    this.handleCustomFiles();

    const gitPullFile = this.renderGitPullFile();
    writeFileSync('./output/git-pull.ts', gitPullFile);

    copyFileSync('./src/templates/copy-secrets.ts', './output/copy-secrets.ts');
  }

  private renderDockerComposeFile() {
    const projectStrings = projects
      .map(p => {
        switch (p.type) {
          case 'local':
            return this.localProject(p as LocalProject);
          case 'image':
            return this.imageProject(p as ImageProject);
          case 'custom':
            return this.customProject(p as CustomProject);
          default:
            throw new Error('Unknown project type');
        }
      })
      .map(p => removeEmptyLines(p));
    const projectString = indent(projectStrings.join('\n\n'));
    const template = replacePlaceholders(this._template, {
      projects: () => projectString,
      volumes: () => {
        if (!config.volumes) {
          return '';
        }
        const volumeString = config.volumes.map(v => `${v}:\n  name: ${v}`).join('\n');
        return indent(volumeString);
      }
    });
    return template;
  }

  private handleCustomFiles() {
    config.customFiles?.forEach(file => {
      const from = path.resolve(process.cwd(), mainConfig.secretsPath, 'hosting', file.from);

      if (file.to) {
        copyFileSync(from, path.join('./output', file.to));
      }
      if (file.appendToTraefikConfig) {
        const traefikCnfig = readFileSync('./output/traefik.toml');
        const content = readFileSync(from);
        writeFileSync('./output/traefik.toml', traefikCnfig + '\n' + content);
      }
    });
  }

  private renderGitPullFile() {
    const projectPaths: string[] = [];
    projects.forEach(p => {
      if (p.type === 'local') {
        let newPath = p.root;
        newPath = path.resolve(process.cwd(), newPath);
        if (!projectPaths.includes(newPath)) {
          projectPaths.push(newPath);
        }
      }
    });
    let gitPullTemplate = readFileSync('./src/templates/git-pull.ts');
    return replacePlaceholders(gitPullTemplate, { projects: () => projectPaths.join('", "').replaceAll('\\', '/') });
  }

  private getLabels(project: LocalProject | ImageProject) {
    if (!project.host) {
      return '';
    }
    const labels = replacePlaceholders(traefikTemplate, {
      port: () => (project.port ? `- "traefik.port=${project.port}"` : ''),
      name: () => project.name,
      host: () => project.host
    });
    return indent(labels, 2);
  }

  private localProject(project: LocalProject) {
    return replacePlaceholders(projectTemplate, {
      name: () => project.name,
      context: () => project.context,
      dockerfile: () => (project.dockerfile ? `dockerfile: ${project.dockerfile}` : undefined),
      labels: () => this.getLabels(project)
    });
  }

  private imageProject(project: ImageProject) {
    return replacePlaceholders(imageProjectTemplate, {
      name: () => project.name,
      image: () => project.image,
      volumes: () => {
        if (!project.volumes) {
          return '';
        }
        const volumesValueString = project.volumes.map(v => `${v}:${v}`).join('\n');
        return `volumes:\n${indent(volumesValueString, 3)}`;
      },
      labels: () => this.getLabels(project)
    });
  }

  private customProject(project: CustomProject) {
    const file = path.resolve(process.cwd(), mainConfig.secretsPath, 'hosting', project.file);
    const content = readFileSync(file);
    return indent(content);
  }
}
