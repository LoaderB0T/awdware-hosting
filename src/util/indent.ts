export const indent = (str: string, indentation: number = 1) => {
  return str
    .split('\n')
    .map(line => (line ? '  '.repeat(indentation) + line : ''))
    .join('\n');
};
