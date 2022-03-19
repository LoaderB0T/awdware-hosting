import * as fs from "fs";
import path, { join } from "path";

type CustomFile = {
  from: string;
  to?: string;
  appendToTraefikConfig?: boolean;
};

type Config = {
  domain: string;
  projects: Project[];
  volumes?: string[];
  customFiles?: CustomFile[];
};

type Project = LocalProject | CustomProject;

type LocalProject = {
  type: "local";
  name: string;
  context: string;
  dockerfile?: string;
  host: string;
};

type CustomProject = {
  type: "custom";
  file: string;
};

const replacePlaceholders = (template: string, project: LocalProject) => {
  const placeHolders: (keyof LocalProject)[] = ["name", "context", "host"];
  placeHolders.forEach((placeHolder) => {
    template = template.replace(
      new RegExp(`%%${placeHolder}%%`, "g"),
      project[placeHolder]!
    );
  });
  const dockerFileRegExp = new RegExp(`%%dockerfile%%`, "g");
  if (project.dockerfile) {
    template = template.replace(
      dockerFileRegExp,
      `dockerfile: ${project.dockerfile}`
    );
  } else {
    template = template.replace(dockerFileRegExp, "");
  }
  return template;
};

const customProject = (project: CustomProject) => {
  const file = path.resolve(process.cwd(), project.file);
  const content = fs.readFileSync(file, "utf8");
  return indent(content, "  ");
};

const indent = (str: string, indentation: string = "  ") => {
  return str
    .split("\n")
    .map((line) => indentation + line)
    .join("\n");
};

let template = fs.readFileSync(
  "./templates/docker-compose.template.yml",
  "utf8"
);
const projectTemplate = indent(
  fs.readFileSync("./templates/project.template.yml", "utf8")
);

const config = JSON.parse(fs.readFileSync("./projects.json", "utf8")) as Config;

const projects = config.projects;
projects
  .filter((p) => p.type === "local")
  .forEach((p) => {
    const project = p as LocalProject;
    project.context = path.join("../", project.context);
  });

template = template.replace(/%%domain%%/g, config.domain);

const projectStrings = [
  ...projects
    .filter((p) => p.type === "local")
    .map((project) =>
      replacePlaceholders(projectTemplate, project as LocalProject)
    ),
  ...projects
    .filter((p) => p.type === "custom")
    .map((project) => customProject(project as CustomProject)),
];
const projectString = projectStrings.join("\n");

template = template.replace(/%%projects%%/g, projectString);

let volumeString = (config.volumes ?? [])
  .map((v) => `${v}:\n  name: ${v}`)
  .join("\n");
if (volumeString) {
  volumeString = `volumes:\n${indent(volumeString)}`;
}
template = template.replace(/%%volumes%%/g, volumeString);

fs.writeFileSync("./output/docker-compose.yml", template);
fs.copyFileSync("./templates/traefik.toml", "./output/traefik.toml");
fs.copyFileSync("./templates/.env", "./output/.env");

config.customFiles?.forEach((file) => {
  if (file.to) {
    fs.copyFileSync(file.from, path.join("./output", file.to));
  }
  if (file.appendToTraefikConfig) {
    const traefikCnfig = fs.readFileSync("./output/traefik.toml", "utf8");
    const content = fs.readFileSync(file.from, "utf8");
    fs.writeFileSync("./output/traefik.toml", traefikCnfig + "\n" + content);
  }
});
