import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { config, mainConfig } from './data/configs.js';
import {
  dockerComposeTemplate,
  dockerComposeTraefikTemplate,
  imageProjectTemplate,
  projectTemplate,
  traefikTemplate
} from './data/templates.js';
import { Config } from './types/config.js';
import { AdditionalProperties, CustomProject, ImageProject, LocalProject } from './types/project.js';
import { indent } from './util/indent.js';
import { readFileSync } from './util/read-file-sync.js';
import { removeEmptyLines } from './util/remove-empty-lines.js';
import { replacePlaceholders } from './util/replace-placeholders.js';

export class Main {
  private _template: string;
  private _target?: string;
  private _config: Config;
  private _outDirBase: string;
  private _outDir: string;
  private _outDirTraefik: string;

  constructor(target: string) {
    this._target = target;
    this._outDirBase = './output';
    this._outDir = `${this._outDirBase}/${target}`;
    this._outDirTraefik = `${this._outDirBase}/proxy`;
    this._config = config(this._target);
    this._template = dockerComposeTemplate;
  }

  public main() {
    if (!existsSync(this._outDirBase)) {
      mkdirSync(this._outDirBase);
    }
    this.createTraefikOutput();
    this.createTargetOutput();
  }

  private createTraefikOutput() {
    if (!existsSync(this._outDirTraefik)) {
      mkdirSync(this._outDirTraefik);
    }
    writeFileSync(`${this._outDirTraefik}/docker-compose.yml`, dockerComposeTraefikTemplate);
    copyFileSync('./src/templates/traefik/traefik.toml', `${this._outDirTraefik}/traefik.toml`);
    copyFileSync('./src/templates/.env', `${this._outDirTraefik}/.env`);
  }

  private createTargetOutput() {
    const dockerComposeFile = this.renderDockerComposeFile();
    if (!existsSync(this._outDir)) {
      mkdirSync(this._outDir);
    }
    writeFileSync(`${this._outDir}/docker-compose.yml`, dockerComposeFile);
    copyFileSync('./src/templates/.env', `${this._outDir}/.env`);
    this.handleCustomFiles();

    const gitPullFile = this.renderGitPullFile();
    writeFileSync('./output/git-pull.ts', gitPullFile);

    copyFileSync('./src/templates/copy-secrets.ts', './output/copy-secrets.ts');
  }

  private renderDockerComposeFile() {
    const projectStrings = this._config.projects
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
        if (!this._config.volumes) {
          return '';
        }
        const volumeString = this._config.volumes.map(v => `${v}:\n  name: ${v}`).join('\n');
        return indent(volumeString);
      }
    });
    return template;
  }

  private handleCustomFiles() {
    this._config.customFiles?.forEach(file => {
      const from = path.resolve(process.cwd(), mainConfig.secretsPath, 'hosting', file.from);

      if (file.to) {
        //ensure directory exists
        const to = path.join(process.cwd(), this._outDir, file.to);
        const toDir = path.dirname(to);
        if (!existsSync(toDir)) {
          mkdirSync(toDir, { recursive: true });
        }
        copyFileSync(from, to);
      }
      if (file.appendToTraefikConfig) {
        const traefikCnfig = readFileSync(`${this._outDirTraefik}/traefik.toml`);
        const content = readFileSync(from);
        writeFileSync(`${this._outDirTraefik}/traefik.toml`, traefikCnfig + '\n' + content);
      }
    });
  }

  private renderGitPullFile() {
    const projectPaths: string[] = [];
    this._config.projects.forEach(p => {
      if (p.type === 'local') {
        let newPath = p.root;
        newPath = path.resolve(process.cwd(), newPath);
        if (!projectPaths.includes(newPath)) {
          projectPaths.push(newPath);
        }
      }
    });
    let gitPullTemplate = readFileSync('./src/templates/git-pull.ts');
    return replacePlaceholders(gitPullTemplate, { projects: () => projectPaths.join("', '").replaceAll('\\', '/') });
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
    return `${indent('labels:', 1)}\n${indent(labels, 2)}`;
  }

  private getVolumes(project: LocalProject | ImageProject) {
    if (!project.volumes) {
      return '';
    }
    const volumesValueString = project.volumes.map(v => `- ${v}`).join('\n');
    return `volumes:\n${indent(volumesValueString, 2)}`;
  }
  private getEnv(project: LocalProject | ImageProject) {
    if (!project.env) {
      return '';
    }
    const environmentsString = project.env.map(e => `- ${e}`).join('\n');
    return `environment:\n${indent(environmentsString, 2)}`;
  }

  private getAdditionalProperties(project: LocalProject | ImageProject) {
    if (!project.additionalProperties) {
      return '';
    }
    return indent(this.recurseAdditionalProperties(project.additionalProperties));
  }

  private recurseAdditionalProperties(additionalProperties: AdditionalProperties) {
    let result = '';
    Object.keys(additionalProperties).forEach(key => {
      const value = additionalProperties[key];
      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          result += `${key}:\n${indent(value.map(v => `- ${v}`).join('\n'), 1)}`;
        } else {
          result += `${key}:\n${indent(this.recurseAdditionalProperties(value), 1)}`;
        }
      } else {
        result += `${key}: ${value}\n`;
      }
    });
    return result;
  }

  private getPort(project: LocalProject | ImageProject) {
    if (!project.port || project.host) {
      return '';
    }
    const portString = `- ${project.port}:${project.port}`;
    return `ports:\n${indent(portString, 2)}`;
  }

  private getDependsOn(project: LocalProject | ImageProject) {
    if (!project.dependsOn) {
      return '';
    }
    const portString = project.dependsOn.map(d => `- ${d}`).join('\n');
    return `depends_on:\n${indent(portString, 2)}`;
  }

  private localProject(project: LocalProject) {
    return replacePlaceholders(projectTemplate, {
      name: () => project.name,
      context: () => path.join('../../', project.context).replaceAll('\\', '/'), // so that the relative path matches the original relative path
      dockerfile: () => (project.dockerfile ? `dockerfile: ${project.dockerfile}` : undefined),
      volumes: () => this.getVolumes(project),
      labels: () => this.getLabels(project),
      env: () => this.getEnv(project),
      additionalProperties: () => this.getAdditionalProperties(project),
      dependsOn: () => this.getDependsOn(project)
    });
  }

  private imageProject(project: ImageProject) {
    return replacePlaceholders(imageProjectTemplate, {
      name: () => project.name,
      image: () => project.image,
      volumes: () => this.getVolumes(project),
      labels: () => this.getLabels(project),
      env: () => this.getEnv(project),
      port: () => this.getPort(project),
      additionalProperties: () => this.getAdditionalProperties(project),
      dependsOn: () => this.getDependsOn(project)
    });
  }

  private customProject(project: CustomProject) {
    const file = path.resolve(process.cwd(), mainConfig.secretsPath, 'hosting', project.file);
    const content = readFileSync(file);
    return indent(content);
  }
}
