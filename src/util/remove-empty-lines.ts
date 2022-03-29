export const removeEmptyLines = (str: string) => {
  return str
    .split('\n')
    .filter(x => !!x && x.trim())
    .join('\n');
};
