function safe<T>(promise: Promise<T>): Promise<[undefined, T] | [Error]>;
function safe<T>(fn: () => T): [undefined, T] | [Error];
function safe<T>(
  input: Promise<T> | (() => T)
): Promise<[undefined, T] | [Error]> | [undefined, T] | [Error] {
  if (input instanceof Promise) return safeAsync(input);
  return safeSync(input);
}

async function safeAsync<T>(
  promise: Promise<T>
): Promise<[undefined, T] | [Error]> {
  return promise
    .then((data) => [undefined, data] as [undefined, T])
    .catch((error) => [error as Error]);
}

function safeSync<T>(fn: () => T): [undefined, T] | [Error] {
  try {
    const data = fn();
    return [undefined, data] as [undefined, T];
  } catch (error) {
    return [error as Error];
  }
}

export default safe;
