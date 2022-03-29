import { executeCmd } from '../util/execute-cmd.js';

const configuration = process.argv[2];

const gitPullInFolder = async (folder: string) => {
  const a = folder.split('/');
  let test = false;
  if (folder.includes('test')) {
    test = true;
  }
  if ((configuration === 'test' && !test) || (configuration === 'prod' && test)) {
    return;
  }
  const projectName = a[a.length - 1];
  return executeCmd('git pull', `[${projectName}${test ? ' (test)' : ''}] `, folder);
};

const projects = ['%%PROJECTS%%'];

const main = async () => {
  console.log();
  const promises = projects.map(p => gitPullInFolder(p));
  return Promise.all(promises);
};

main().then(() => {
  console.log('done pulling!');
});
