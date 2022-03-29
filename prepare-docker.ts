import * as fs from "fs";
import path from "path";

type CustomFile = {
  from: string;
  to?: string;
  appendToTraefikConfig?: boolean;
};

type MainConfig = {
  secretsPath: string;
};

type Config = {
  projects: Project[];
  volumes?: string[];
  customFiles?: CustomFile[];
};

type Project = LocalProject | CustomProject | ImageProject;

type LocalProject = {
  type: "local";
  name: string;
  context: string;
  dockerfile?: string;
  host: string;
  root: string;
};

type CustomProject = {
  type: "custom";
  file: string;
};

type ImageProject = {
  type: "image";
  name: string;
  host: string;
  image: string;
  volumes?: string[];
  port?: number;
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
  const file = path.resolve(
    process.cwd(),
    secretsPath,
    "hosting",
    project.file
  );
  const content = fs.readFileSync(file, "utf8");
  return indent(content, "  ");
};

const imageProject = (template: string, project: ImageProject) => {
  template = template.replaceAll("%%name%%", project.name);
  template = template.replaceAll("%%host%%", project.host);
  template = template.replaceAll("%%image%%", project.image);
  let volumes = "";
  if (project.volumes?.length) {
    volumes = `volumes:${project.volumes
      .map((v) => `\n      - ${v}`)
      .join("")}`;
  }
  template = template.replace("%%volumes%%", volumes);
  let port = "";
  if (project.port) {
    port = `- "traefik.port=${project.port}"`;
  }
  template = template.replace("%%port%%", port);
  return template;
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
const imageProjectTemplate = indent(
  fs.readFileSync("./templates/image-project.template.yml", "utf8")
);

const secretsPath = (
  JSON.parse(fs.readFileSync("./config.json", "utf8")) as MainConfig
).secretsPath;

const projectJsonPath = path.resolve(
  process.cwd(),
  secretsPath,
  "hosting/projects.json"
);
const projectTestJsonPath = path.resolve(
  process.cwd(),
  secretsPath,
  "hosting/projects.test.json"
);

const config = JSON.parse(fs.readFileSync(projectJsonPath, "utf8")) as Config;
const testConfig = JSON.parse(
  fs.readFileSync(projectTestJsonPath, "utf8")
) as Config;

config.customFiles ??= [];
config.customFiles.push(...(testConfig.customFiles ?? []));
config.projects.push(...testConfig.projects);
config.volumes ??= [];
config.volumes.push(...(testConfig.volumes ?? []));

const projects = config.projects;
projects
  .filter((p) => p.type === "local")
  .forEach((p) => {
    const project = p as LocalProject;
    project.context = path.join("../", project.context);
  });

const projectStrings = [
  ...projects
    .filter((p) => p.type === "local")
    .map((project) =>
      replacePlaceholders(projectTemplate, project as LocalProject)
    ),
  ...projects
    .filter((p) => p.type === "image")
    .map((project) =>
      imageProject(imageProjectTemplate, project as ImageProject)
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
  volumeString = `${indent(volumeString)}`;
}
template = template.replace(/%%volumes%%/g, volumeString);

fs.writeFileSync("./output/docker-compose.yml", template);
fs.copyFileSync("./templates/traefik.toml", "./output/traefik.toml");
fs.copyFileSync("./templates/.env", "./output/.env");

config.customFiles?.forEach((file) => {
  const from = path.resolve(process.cwd(), secretsPath, "hosting", file.from);

  if (file.to) {
    fs.copyFileSync(from, path.join("./output", file.to));
  }
  if (file.appendToTraefikConfig) {
    const traefikCnfig = fs.readFileSync("./output/traefik.toml", "utf8");
    const content = fs.readFileSync(from, "utf8");
    fs.writeFileSync("./output/traefik.toml", traefikCnfig + "\n" + content);
  }
});

const projectPaths: string[] = [];
projects.forEach((p) => {
  if (p.type === "local") {
    let newPath = p.root;
    newPath = path.resolve(process.cwd(), newPath);
    if (!projectPaths.includes(newPath)) {
      projectPaths.push(newPath);
    }
  }
});
let gitPullTemplate = fs.readFileSync("./templates/git-pull.ts", "utf8");
gitPullTemplate = gitPullTemplate
  .replace(/%%PROJECTS%%/g, projectPaths.join('", "'))
  .replaceAll("\\", "/");
fs.writeFileSync("./output/git-pull.ts", gitPullTemplate);

fs.copyFileSync("./templates/copy-secrets.ts", "./output/copy-secrets.ts");
