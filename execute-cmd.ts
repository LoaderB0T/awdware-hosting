import { exec } from "child_process";

export const executeCmd = async (cmd: string, prefix: string, cwd?: string) => {
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
