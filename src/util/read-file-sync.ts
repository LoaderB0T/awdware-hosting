import { readFileSync as readFileSyncInternal } from 'fs';

export const readFileSync = (filePath: string) => {
  return readFileSyncInternal(filePath, 'utf8').replaceAll('\r\n', '\n');
};
