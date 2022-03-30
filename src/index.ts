import { argv } from 'process';
import { Main } from './main.js';
import { Target } from './types/target.js';

let targetIndex = argv.indexOf('--target');
if (targetIndex === -1) {
  targetIndex = argv.indexOf('-t');
}
const target = targetIndex === -1 ? undefined : (argv[targetIndex + 1] as Target);

const main = new Main(target);
main.main();
