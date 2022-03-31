import { readFileSync } from '../util/read-file-sync.js';

export const dockerComposeTemplate = readFileSync('./src/templates/docker-compose.template.yml');
export const dockerComposeTraefikTemplate = readFileSync('./src/templates/traefik/docker-compose-traefik.yml');
export const projectTemplate = readFileSync('./src/templates/project.template.yml');
export const imageProjectTemplate = readFileSync('./src/templates/image-project.template.yml');
export const traefikTemplate = readFileSync('./src/templates/traefik/traefik.template.yml');
