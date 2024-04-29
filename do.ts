/**
 * Initiates an extended method chain.
 * @param value the leftmost expression of the chain
 * @returns the method chain builder
 *
 * @example
 *   ```typescript
 *   const result = Do(42)
 *     .pipe((it) => it + 1) // Equivalent to: |> % + 1
 *     .pipe((it) => it * 2) // Equivalent to: |> % * 2
 *     .done();
 *   console.log(result); // => 86
 *   ```
 */
export function Do<T>(value: T): Thunk<T> {
  return new (Thunk as ThunkConstructor<T>)([[false, () => value]]);
}

type SyncStep = readonly [false, (x: unknown) => unknown];
type AsyncStep = SyncStep | readonly [true, (x: unknown) => Promise<unknown>];

type ThunkConstructor<T> = new (steps: readonly SyncStep[]) => Thunk<T>;

/**
 * A builder for extended method chains.
 *
 * Use {@link Do} to initiate the chain.
 */
export class Thunk<out T> {
  private readonly _steps: readonly SyncStep[];

  private constructor(steps: readonly SyncStep[]) {
    this._steps = steps;
  }

  /**
   * Concludes the method chain and executes it.
   * @returns the result of the method chain
   */
  done(): T {
    let current: unknown = undefined;
    for (const [, f] of this._steps) {
      current = f(current);
    }
    return current as T;
  }

  /**
   * Pipeline operator, equivalent to `|>` as in Pipeline Operator Proposal.
   * @param f the right hand side of the pipeline operator. It is recommended that you use an arrow function with the parameter named `it`.
   * @returns next builder in the chain
   *
   * @example
   *   ```typescript
   *   const result = Do(42)
   *     .pipe((it) => it + 1) // Equivalent to: |> % + 1
   *     .pipe((it) => it * 2) // Equivalent to: |> % * 2
   *     .done();
   *   console.log(result); // => 86
   *   ```
   */
  pipe<U>(f: (value: T) => U): Thunk<U> {
    return new Thunk([...this._steps, [false, f as (x: unknown) => unknown]]);
  }

  /**
   * Pipeline operator, equivalent to `|>` as in Pipeline Operator Proposal, combined with `await`.
   *
   * @param f the right hand side of the pipeline operator. It is recommended that you use an arrow function with the parameter named `it`.
   * @returns next builder in the chain
   *
   * @example
   *   ```typescript
   *   const result = await Do(42)
   *     .pipeAwait(async (it) => it + 1) // Equivalent to: |> await Promise.resolve(% + 1)
   *     .pipe((it) => it * 2)            // Equivalent to: |> % * 2
   *     .done();
   *   console.log(result); // => 86
   *   ```
   */
  pipeAwait<U>(f: (value: T) => Promise<U>): AsyncThunk<U> {
    return new (AsyncThunk as AsyncThunkConstructor<U>)([...this._steps, [true, f as (x: unknown) => Promise<unknown>]]);
  }

  /**
   * Call-this operator, equivalent to `~>` as in Call-this Operator Proposal.
   * @param f the right hand side of the call-this operator, like `f` in `e~>f(...args)`.
   * @param args the arguments, like `...args` in `e~>f(...args)`.
   * @returns next builder in the chain
   *
   * @example
   *  ```typescript
   *  function double(this: number): number {
   *    return this * 2;
   *  }
   *  const result = Do(42)
   *    .rcall(double) // Equivalent to: ~>double
   *    .done();
   *  console.log(result); // => 84
   *  ```
   */
  rcall<Args extends unknown[], R, F extends (this: T, ...args: Args) => R>(f: F, ...args: Args): Thunk<R> {
    return this.pipe((value) => f.call(value, ...args));
  }

  /**
   * Call-this operator, equivalent to `~>` as in Call-this Operator Proposal, combined with `|> await %`.
   * @param f the right hand side of the call-this operator, like `f` in `e~>f(...args)`.
   * @param args the arguments, like `...args` in `e~>f(...args)`.
   * @returns next builder in the chain
   *
   * @example
   *  ```typescript
   *  async function double(this: number): number {
   *    return this * 2;
   *  }
   *  const result = await Do(42)
   *    .rcallAwait(double) // Equivalent to: ~>double |> await %
   *    .done();
   *  console.log(result); // => 84
   *  ```
   */
  rcallAwait<Args extends unknown[], R, F extends (this: T, ...args: Args) => Promise<R>>(f: F, ...args: Args): AsyncThunk<R> {
    return this.pipeAwait((value) => f.call(value, ...args));
  }

  /**
   * The tap method as known as Object#tap in Ruby.
   * @param f the side-effect function
   * @returns next builder in the chain
   *
   * @example
   * ```typescript
   * const result = Do(42)
   *   .tap((it) => console.log(it)) // Equivalent to: |> (console.log(%), %)
   *   .pipe((it) => it + 1)          // Equivalent to: |> % + 1
   *   .done();
   * console.log(result); // => 43
   */
  tap(f: (value: T) => void): Thunk<T> {
    return this.pipe((value) => {
      f(value);
      return value;
    });
  }

  /**
   * The tap method as known as Object#tap in Ruby, async version.
   * @param f the asynchronous side-effect function
   * @returns next builder in the chain
   *
   * @example
   * ```typescript
   * const result = await Do(42)
   *   .tapAwait(async (it) => console.log(it)) // Equivalent to: |> (await Promise.resolve(console.log(%)), %)
   *   .pipe((it) => it + 1)          // Equivalent to: |> % + 1
   *   .done();
   * console.log(result); // => 43
   */
  tapAwait(f: (value: T) => Promise<void>): AsyncThunk<T> {
    return this.pipeAwait((value) => f(value).then(() => value));
  }
}

type AsyncThunkConstructor<T> = new (steps: readonly AsyncStep[]) => AsyncThunk<T>;

/**
 * An asynchronous variant of {@link Thunk}.
 *
 * Use {@link Do} to initiate the extended method chain.
 */
export class AsyncThunk<T> {
  private readonly _steps: readonly AsyncStep[];

  private constructor(steps: readonly AsyncStep[]) {
    this._steps = steps;
  }

  /**
   * Concludes the method chain and executes it.
   * @returns the result of the method chain
   */
  done(): Promise<T> {
    // Choose as few awaits as possible for consistency.
    // Note: this is about side effect ordering, not performance.
    //
    // ```
    // .pipe()     .pipe()     .pipe()      // => 0 awaits (synchronous)
    // .pipe()     .pipe()     .pipeAwait() // => 1 awaits (reduce one extra await)
    // .pipe()     .pipeAwait().pipe()      // => 2 awaits
    // .pipe()     .pipeAwait().pipeAwait() // => 3 awaits
    // .pipeAwait().pipe()     .pipe()      // => 2 awaits
    // .pipeAwait().pipe()     .pipeAwait() // => 3 awaits
    // .pipeAwait().pipeAwait().pipe()      // => 3 awaits
    // .pipeAwait().pipeAwait().pipeAwait() // => 4 awaits
    // ```

    const isSimplePipeline =
      this._steps.length >= 1
      && this._steps[this._steps.length - 1][0]
      && this._steps.slice(0, this._steps.length - 1).every(([isAsync]) => !isAsync);
    if (isSimplePipeline) {
      // Simple means only the last one is async; no additional await
      // Minimal of 1 microtick (from the user-returned Promise)
      let current: unknown = undefined;
      for (const [, f] of this._steps) {
        current = f(current);
      }
      return current as Promise<T>;
    } else {
      // Otherwise, we cannot reuse the user-returned Promise.
      // Minimal of 1 + N microtick, where N is number of pipeAwaits.
      return (async () => {
        let current: unknown = undefined;
        for (const [isAsync, f] of this._steps) {
          current = isAsync ? await f(current) : f(current);
        }
        if (typeof (current as Promise<unknown>)?.then === "function") {
          throw new Error("AsyncThunk: pipe callback returned a promise; try pipeAwait instead");
        }
        return current as T;
      })();
    }
  }

  /**
   * Pipeline operator, equivalent to `|>` as in Pipeline Operator Proposal.
   * @param f the right hand side of the pipeline operator. It is recommended that you use an arrow function with the parameter named `it`.
   * @returns next builder in the chain
   *
   * @example
   *   ```typescript
   *   const result = await Do(42)
   *     .pipeAwait(async (it) => it + 1) // Equivalent to: |> await Promise.resolve(% + 1)
   *     .pipe((it) => it * 2)            // Equivalent to: |> % * 2
   *     .done();
   *   console.log(result); // => 86
   *   ```
   */
  pipe<U>(f: (value: T) => U): AsyncThunk<U> {
    return new AsyncThunk([...this._steps, [false, f as (x: unknown) => unknown]]);
  }

  /**
   * Pipeline operator, equivalent to `|>` as in Pipeline Operator Proposal, combined with `await`.
   *
   * @param f the right hand side of the pipeline operator. It is recommended that you use an arrow function with the parameter named `it`.
   * @returns next builder in the chain
   *
   * @example
   *   ```typescript
   *   const result = await Do(42)
   *     .pipeAwait(async (it) => it + 1) // Equivalent to: |> await Promise.resolve(% + 1)
   *     .pipeAwait(async (it) => it * 2) // Equivalent to: |> await Promise.resolve(% * 2)
   *     .done();
   *   console.log(result); // => 86
   *   ```
   */
  pipeAwait<U>(f: (value: T) => Promise<U>): AsyncThunk<U> {
    return new AsyncThunk([...this._steps, [true, f as (x: unknown) => Promise<unknown>]]);
  }

  /**
   * Call-this operator, equivalent to `~>` as in Call-this Operator Proposal.
   * @param f the right hand side of the call-this operator, like `f` in `e~>f(...args)`.
   * @param args the arguments, like `...args` in `e~>f(...args)`.
   * @returns next builder in the chain
   *
   * @example
   *  ```typescript
   *  function double(this: number): number {
   *    return this * 2;
   *  }
   *  const result = await Do(42)
   *    .pipeAwait((it) => it + 1) // Equivalent to: |> await Promise.resolve(% + 1)
   *    .rcall(double)             // Equivalent to: ~>double
   *    .done();
   *  console.log(result); // => 86
   *  ```
   */
  rcall<Args extends unknown[], R, F extends (this: T, ...args: Args) => R>(f: F, ...args: Args): AsyncThunk<R> {
    return this.pipe((value) => f.call(value, ...args));
  }

  /**
   * Call-this operator, equivalent to `~>` as in Call-this Operator Proposal, combined with `|> await %`.
   * @param f the right hand side of the call-this operator, like `f` in `e~>f(...args)`.
   * @param args the arguments, like `...args` in `e~>f(...args)`.
   * @returns next builder in the chain
   *
   * @example
   *  ```typescript
   *  async function double(this: number): number {
   *    return this * 2;
   *  }
   *  const result = await Do(42)
   *    .pipeAwait((it) => it + 1) // Equivalent to: |> await Promise.resolve(% + 1)
   *    .rcallAwait(double)        // Equivalent to: ~>double |> await %
   *    .done();
   *  console.log(result); // => 86
   *  ```
   */
  rcallAwait<Args extends unknown[], R, F extends (this: T, ...args: Args) => Promise<R>>(f: F, ...args: Args): AsyncThunk<R> {
    return this.pipeAwait((value) => f.call(value, ...args));
  }

  /**
   * The tap method as known as Object#tap in Ruby.
   * @param f the side-effect function
   * @returns next builder in the chain
   *
   * @example
   * ```typescript
   * const result = await Do(42)
   *   .pipeAwait(async (it) => it + 1) // Equivalent to: |> await Promise.resolve(% + 1)
   *   .tap((it) => console.log(it))    // Equivalent to: |> (console.log(%), %)
   *   .done();
   * console.log(result); // => 43
   */
  tap(f: (value: T) => void): AsyncThunk<T> {
    return this.pipe((value) => {
      f(value);
      return value;
    });
  }

  /**
   * The tap method as known as Object#tap in Ruby, async version.
   * @param f the asynchronous side-effect function
   * @returns next builder in the chain
   *
   * @example
   * ```typescript
   * const result = await Do(42)
   *   .pipeAwait(async (it) => it + 1)         // Equivalent to: |> await Promise.resolve(% + 1)
   *   .tapAwait(async (it) => console.log(it)) // Equivalent to: |> (await Promise.resolve(console.log(%)), %)
   *   .done();
   * console.log(result); // => 43
   */
  tapAwait(f: (value: T) => Promise<void>): AsyncThunk<T> {
    return this.pipeAwait((value) => f(value).then(() => value));
  }
}
