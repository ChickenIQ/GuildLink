function safe<T>(promise: Promise<T>): Promise<[T, null] | [null, Error]>;
function safe<T>(fn: () => T): [T, null] | [null, Error];
function safe<T>(
  input: Promise<T> | (() => T)
): Promise<[T, null] | [null, Error]> | [T, null] | [null, Error] {
  if (input instanceof Promise) return safeAsync(input);
  return safeSync(input);
}

async function safeAsync<T>(
  promise: Promise<T>
): Promise<[T, null] | [null, Error]> {
  return promise
    .then((data) => [data, null] as [T, null])
    .catch((error) => [null, error as Error]);
}

function safeSync<T>(fn: () => T): [T, null] | [null, Error] {
  try {
    const data = fn();
    return [data, null] as [T, null];
  } catch (error) {
    return [null, error as Error];
  }
}

function isErr(value: any): value is Error {
  return value instanceof Error;
}

export { safe, isErr };
