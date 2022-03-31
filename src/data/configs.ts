import path from 'path';
import { Config } from '../types/config.js';
import { MainConfig } from '../types/main-config.js';
import { readFileSync } from '../util/read-file-sync.js';

export const mainConfig = JSON.parse(readFileSync('./config.json')) as MainConfig;

const getConfigFilePath = (target: string) => {
  if (target === 'prod') {
    target = '';
  } else {
    target = `.${target}`;
  }
  return path.resolve(process.cwd(), mainConfig.secretsPath, `hosting/projects${target}.json`);
};

const prepareConfig = (target: string) => {
  const cfg = JSON.parse(readFileSync(getConfigFilePath(target))) as Config;

  cfg.customFiles ??= [];
  cfg.volumes ??= [];

  return cfg;
};

export const config = (target: string) => prepareConfig(target);
