import { exec } from "child_process";
import { exit } from "process";

const executeCmd = async (cmd: string, prefix: string, cwd?: string) => {
  return new Promise<boolean>((resolve, reject) => {
    const child = exec(cmd, { cwd }, (error, stdout, stderr) => {
      if (error) {
        console.error(error);
      }
    });
    child.stderr?.on("data", (buffer: Buffer) => {
      console.error(prefix + buffer.toString());
    });
    child.stdout?.on("data", (buffer: Buffer) => {
      console.log(prefix + buffer.toString());
    });
    child.on("exit", (code: number) => {
      resolve(code === 0);
    });
  });
};

const gitPullInFolder = async (folder: string) => {
  const a = folder.split("/");
  const projectName = a[a.length - 1];
  return executeCmd("git pull", `[${projectName}] `, folder);
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
