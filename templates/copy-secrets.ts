import { readFileSync } from "fs";
import path from "path";
import { exit } from "process";
import { executeCmd } from "../execute-cmd.js";

const configuration = process.argv[2];

const main = async () => {
  const config = JSON.parse(readFileSync("projects.json", "utf8"));
  const globalSecretsPath = path.resolve(config.secretsPath);
  const secretsPath = path.resolve(
    path.join(config.secretsPath, configuration)
  );
  console.log(secretsPath);
  const res1 = await executeCmd(
    "powershell ./cpy.ps1",
    `[secrets] `,
    globalSecretsPath
  );
  const res2 = executeCmd("powershell ./cpy.ps1", `[secrets] `, secretsPath);
  return res1 && res2;
};

main().then((r) => {
  if (r) {
    console.log("done copying secrets!");
  } else {
    console.error("failed copying secrets!");
    exit(1);
  }
});
