import { argv } from 'process';
import { Main } from './main.js';

let targetIndex = argv.indexOf('--target');
if (targetIndex === -1) {
  targetIndex = argv.indexOf('-t');
}
const target = targetIndex === -1 ? 'prod' : argv[targetIndex + 1];

const main = new Main(target);
main.main();
