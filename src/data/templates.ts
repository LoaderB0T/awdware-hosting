import { readFileSync } from 'fs';
import { indent } from '../util/indent.js';

export const dockerComposeTemplate = readFileSync('./src/templates/docker-compose.template.yml', 'utf8');
export const projectTemplate = indent(readFileSync('./src/templates/project.template.yml', 'utf8'));
export const imageProjectTemplate = indent(readFileSync('./src/templates/image-project.template.yml', 'utf8'));
export const traefikTemplate = indent(readFileSync('./src/templates/traefik.template.yml', 'utf8'));
