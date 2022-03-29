export const replacePlaceholders = <T>(
  template: string,
  replacerFunctions: Partial<Record<keyof T, () => string | undefined>>
) => {
  const keys = Object.keys(replacerFunctions) as (keyof T)[];
  keys.forEach(key => {
    if (typeof key === 'string' || typeof key === 'number') {
      template = template.replaceAll(`%%${key}%%`, replacerFunctions[key]!() ?? '');
    }
  });
  return template;
};
