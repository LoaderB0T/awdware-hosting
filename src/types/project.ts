export type LocalProject = {
  type: 'local';
  name: string;
  context: string;
  dockerfile?: string;
  host: string;
  root: string;
  volumes?: string[];
  port?: number;
  env?: string[];
};

export type CustomProject = {
  type: 'custom';
  file: string;
};

export type ImageProject = {
  type: 'image';
  name: string;
  host?: string;
  image: string;
  volumes?: string[];
  port?: number;
  env?: string[];
};

export type Project = LocalProject | CustomProject | ImageProject;
