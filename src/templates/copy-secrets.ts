import path from 'path';
import { exit } from 'process';
import { executeCmd } from '../src/util/execute-cmd.js';
import { readFileSync } from '../src/util/read-file-sync.js';

const configuration = process.argv[2];

const main = async () => {
  const config = JSON.parse(readFileSync('config.json'));
  const globalSecretsPath = path.resolve(config.secretsPath);
  const secretsPath = path.resolve(path.join(config.secretsPath, configuration));
  console.log(secretsPath);
  const res1 = await executeCmd('powershell ./cpy.ps1', `[secrets] `, globalSecretsPath);
  const res2 = executeCmd('powershell ./cpy.ps1', `[secrets] `, secretsPath);
  return res1 && res2;
};

main().then(r => {
  if (r) {
    console.log('done copying secrets!');
  } else {
    console.error('failed copying secrets!');
    exit(1);
  }
});
