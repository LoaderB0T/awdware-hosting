import { copyFileSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { config, mainConfig } from './data/configs.js';
import { dockerComposeTemplate, projectTemplate, traefikTemplate } from './data/templates.js';
import { CustomProject, ImageProject, LocalProject, Project } from './types/project.js';
import { indent } from './util/indent.js';
import { replacePlaceholders } from './util/replace-placeholders.js';
const projects = config.projects;

export class Main {
  private _template: string;
  constructor() {
    this._template = dockerComposeTemplate;
  }

  public main() {
    const dockerComposeFile = this.renderDockerComposeFile();
    writeFileSync('./output/docker-compose.yml', dockerComposeFile);
    copyFileSync('./templates/traefik.toml', './output/traefik.toml');
    copyFileSync('./templates/.env', './output/.env');
    this.handleCustomFiles();

    const gitPullFile = this.renderGitPullFile();
    writeFileSync('./output/git-pull.ts', gitPullFile);

    copyFileSync('./templates/copy-secrets.ts', './output/copy-secrets.ts');
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
    let gitPullTemplate = readFileSync('./templates/git-pull.ts', 'utf8');
    return replacePlaceholders(gitPullTemplate, { projects: () => projectPaths.join('", "').replaceAll('\\', '/') });
  }

  private handleCustomFiles() {
    config.customFiles?.forEach(file => {
      const from = path.resolve(process.cwd(), mainConfig.secretsPath, 'hosting', file.from);

      if (file.to) {
        copyFileSync(from, path.join('./output', file.to));
      }
      if (file.appendToTraefikConfig) {
        const traefikCnfig = readFileSync('./output/traefik.toml', 'utf8');
        const content = readFileSync(from, 'utf8');
        writeFileSync('./output/traefik.toml', traefikCnfig + '\n' + content);
      }
    });
  }

  private renderDockerComposeFile() {
    const projectStrings = projects.map(p => {
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
    });
    const projectString = projectStrings.join('\n\n');
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

  private getLabels(project: LocalProject | ImageProject) {
    if (!project.host) {
      return '';
    }
    return replacePlaceholders(traefikTemplate, {
      port: () => (project.port ? `traefik.port=${project.port}` : '')
    });
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
    return replacePlaceholders(projectTemplate, {
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
    const content = readFileSync(file, 'utf8');
    return indent(content);
  }
}
