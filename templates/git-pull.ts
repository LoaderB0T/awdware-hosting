import { executeCmd } from "../execute-cmd.js";

const gitPullInFolder = async (folder: string) => {
  const a = folder.split("/");
  let test = false;
  if (folder.includes("test")) {
    test = true;
  }
  const projectName = a[a.length - 1];
  return executeCmd(
    "git pull",
    `[${projectName}${test ? " (test)" : ""}] `,
    folder
  );
};

const projects = ["%%PROJECTS%%"];

const main = async () => {
  console.log();
  const promises = projects.map((p) => gitPullInFolder(p));
  return Promise.all(promises);
};

main().then(() => {
  console.log("done pulling!");
});
