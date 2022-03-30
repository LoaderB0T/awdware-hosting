import path from 'path';
import { Config } from '../types/config.js';
import { MainConfig } from '../types/main-config.js';
import { Target } from '../types/target.js';
import { readFileSync } from '../util/read-file-sync.js';

export const mainConfig = JSON.parse(readFileSync('./config.json')) as MainConfig;

const projectJsonPath = path.resolve(process.cwd(), mainConfig.secretsPath, 'hosting/projects.json');

const projectTestJsonPath = path.resolve(process.cwd(), mainConfig.secretsPath, 'hosting/projects.test.json');

const configFile = JSON.parse(readFileSync(projectJsonPath)) as Config;

const testConfigFile = JSON.parse(readFileSync(projectTestJsonPath)) as Config;

const prepareConfig = (target?: Target) => {
  configFile.customFiles ??= [];
  configFile.volumes ??= [];
  if (!target || target === 'test') {
    configFile.customFiles.push(...(testConfigFile.customFiles ?? []));
    configFile.projects.push(...testConfigFile.projects);
    configFile.volumes.push(...(testConfigFile.volumes ?? []));
  }
  return configFile;
};

export const config = (target?: Target) => prepareConfig(target);
