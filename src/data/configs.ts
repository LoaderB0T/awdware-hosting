import { readFileSync } from 'fs';
import path from 'path';
import { Config } from '../types/config.js';
import { MainConfig } from '../types/main-config.js';

export const mainConfig = JSON.parse(readFileSync('./config.json', 'utf8')) as MainConfig;

const projectJsonPath = path.resolve(process.cwd(), mainConfig.secretsPath, 'hosting/projects.json');

const projectTestJsonPath = path.resolve(process.cwd(), mainConfig.secretsPath, 'hosting/projects.test.json');

const configFile = JSON.parse(readFileSync(projectJsonPath, 'utf8')) as Config;

const testConfigFile = JSON.parse(readFileSync(projectTestJsonPath, 'utf8')) as Config;

const prepareConfig = () => {
  configFile.customFiles ??= [];
  configFile.customFiles.push(...(testConfigFile.customFiles ?? []));
  configFile.projects.push(...testConfigFile.projects);
  configFile.volumes ??= [];
  configFile.volumes.push(...(testConfigFile.volumes ?? []));
  return configFile;
};

export const config = prepareConfig();
