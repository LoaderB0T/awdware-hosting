export const indent = (str: string, indentation: number = 1) => {
  return str
    .split('\n')
    .filter(x => !!x)
    .map(line => '  '.repeat(indentation) + line)
    .join('\n');
};
