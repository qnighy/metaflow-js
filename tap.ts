/**
 * The tap function (as known in Ruby) for use with the proposed pipeline operator `|>`.
 *
 * @param obj the tap target
 * @param f the side-effect function
 * @returns the first argument
 *
 * @example
 *   ```typescript
 *   const result = tap(42, console.log); // console.log(42) is called, then 42 is returned
 *   // Or: const result = 42 |> tap(%, console.log);
 *   // Or, even without tap: const result = 42 |> (console.log(%), %);
 *   ```
 */
export function tap<T>(obj: T, f: (value: T) => void): T {
  f(obj);
  return obj;
}

/**
 * The tap function (as known in Ruby) for use with the proposed call-this operator `~>`.
 *
 * @param this the tap target
 * @param f the side-effect function
 * @returns the first argument
 *
 * @example
 *   ```typescript
 *   const result = tapMe.call(42, console.log); // console.log(42) is called, then 42 is returned
 *   // Or: const result = 42~>tapMe(console.log);
 *   ```
 */
export function tapMe<T>(this: T, f: (value: T) => void): T {
  f(this);
  return this;
}

/**
 * The tap function (as known in Ruby) for use with the proposed pipeline operator `|>`, async version.
 *
 * @param obj the tap target
 * @param f the asynchronous side-effect function
 * @returns the first argument
 *
 * @example
 *   ```typescript
 *   const result = await tapAsync(42, async (x) => console.log(x)); // console.log(42) is called, then 42 is returned
 *   // Or: const result = 42 |> await tapAsync(%, async (x) => console.log(x));
 *   // Or, even without tap: const result = 42 |> (await Promise.resolve(console.log(%)), %);
 *   ```
 */
export async function tapAsync<T>(obj: T, f: (value: T) => Promise<void>): Promise<T> {
  await f(obj);
  return obj;
}

/**
 * The tap function (as known in Ruby) for use with the proposed call-this operator `~>`, async version.
 *
 * @param this the tap target
 * @param f the asynchronous side-effect function
 * @returns the first argument
 *
 * @example
 *   ```typescript
 *   const result = await tapMeAsync.call(42, async (x) => console.log); // console.log(42) is called, then 42 is returned
 *   // Or: const result = await 42~>tapMeAsync(async (x) => console.log(x));
 *   ```
 */
export async function tapMeAsync<T>(this: T, f: (value: T) => Promise<void>): Promise<T> {
  await f(this);
  return this;
}
