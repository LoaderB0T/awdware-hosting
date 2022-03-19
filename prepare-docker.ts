import * as fs from "fs";
import path from "path";

type Config = {
  domain: string;
  projects: Project[];
};

type Project = {
  name: string;
  context: string;
  host: string;
};

const replacePlaceholders = (template: string, project: Project) => {
  const placeHolders: (keyof Project)[] = ["name", "context", "host"];
  placeHolders.forEach((placeHolder) => {
    template = template.replace(
      new RegExp(`%%${placeHolder}%%`, "g"),
      project[placeHolder]
    );
  });
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

const config = JSON.parse(fs.readFileSync("./projects.json", "utf8")) as Config;

const projects = config.projects;
projects.forEach((p) => {
  p.context = path.join("../", p.context);
});

template = template.replace(/%%domain%%/g, config.domain);

const projectStrings = projects.map((project) =>
  replacePlaceholders(projectTemplate, project)
);
const projectString = projectStrings.join("\n\n");

template = template.replace(/%%projects%%/g, projectString);

fs.writeFileSync("./output/docker-compose.yml", template);
fs.copyFileSync("./templates/traefik.toml", "./output/traefik.toml");
