import { CustomFile } from './custom-file.js';
import { Project } from './project.js';

export type Config = {
  projects: Project[];
  volumes?: string[];
  customFiles?: CustomFile[];
};
