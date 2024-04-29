/**
 * Throws the given exception.
 * @param e The exception to throw
 * 
 * @example
 *   ```typescript
 *   const value = Number(input) || Throw(new Error("Invalid input"));
 *   ```
 */
export function Throw(e: unknown): never {
  throw e;
}

/**
 * Throws the exception value given as `this`.
 * @param this The exception to throw
 * 
 * @example
 *   ```typescript
 *   const value = Number(input) || ThrowMe.call(new Error("Invalid input"));
 *   // Or, using the proposed call-this operator: new Error("Invalid input")~>ThrowMe();
 *   ```
 */
export function ThrowMe(this: unknown): never {
  throw this;
}

/**
 * Initiates a method chain to handle exceptions.
 * @param f The function to execute, which may throw an exception that you want to handle.
 * @returns A `TryChain` helper object containing the result of the function.
 * 
 * @example 
 *   ```typescript
 *   // Catch all and default to null
 *   const url = Try(() => new URL(input)).done(() => null);
 *   ```
 * 
 * @example
 *   ```typescript
 *   // Catch a specific error and default to a special value
 *   const url = Try(() => new URL(input)).pick(SyntaxError).done(() => new URL("http://default.example.com"));
 *   ```
 *
 * @example
 *   ```typescript
 *   // Wrap the error
 *   const url = Try(() => new URL(input)).pick(SyntaxError).done((e) => Throw(new URLError(e)));
 *   ```
 *
 * @example
 *   ```typescript
 *   // Use raw result value
 *   const urlResult = Try(() => new URL(input)).result;
 *   if (urlResult.type === "Ok") {
 *     // ...
 *   } else {
 *     // ...
 *   }
 *   ```
 */
export function Try<T>(f: () => T): TryChain<T, unknown> {
  let value: T;
  try {
    value = f();
  } catch (error) {
    return new TryChain({ type: "Err", error });
  }
  return new TryChain({ type: "Ok", value });
}

/**
 * The asynchronous version of {@link Try}.
 * @param f The asynchronous function to execute, which may throw (or reject the promise with) an exception that you want to handle.
 * @returns A promise to the `TryChain` helper object containing the result of the function.
 */
export async function TryAsync<T>(f: () => Promise<T>): Promise<TryChain<T, unknown>> {
  let value: T;
  try {
    value = await f();
  } catch (error) {
    return new TryChain({ type: "Err", error });
  }
  return new TryChain({ type: "Ok", value });
}

/**
 * A helper utility to handle {@link Result}.
 *
 * Usually you get its instance from {@link Try} or {@link TryAsync}.
 *
 * Note: unlike most existing utility packages for `Result`-based error handling,
 *       this package is designed to use `Result` only locally within a function.
 *       That is, once you decided what to do with the error you got, you are
 *       excepted to forget about the Result structure and use JavaScript's
 *       native `throw` mechanism to propagate the error.
 */
export class TryChain<out T, out E> {
  /**
   * The raw "Result" value, whose type is a direct sum of Ok and Err.
   */
  readonly result: Result<T, E>;

  /**
   * Initiate a method chain. You should basically use {@link Try} or {@link TryAsync} instead.
   *
   * @param result The raw "Result" value
   */
  constructor(result: Result<T, E>) {
    this.result = result;
  }

  /**
   * Transforms the value if it's an {@link Ok}.
   *
   * Useful if you are going to fall back to a certain value on error, but
   * you want to apply certain transformation to the value only when it is Ok.
   *
   * @param f A transformation applied if it's an Ok.
   * @returns The next chained value, possibly after the transformation.
   * 
   * @example
   *   ```typescript
   *   // Extract a hostname from a URL, or use a default value
   *   const hostname = Try(() => new URL(input))
   *     .map((url) => url.hostname)
   *     .done(() => "");
   *   ```
   */
  map<U>(f: (value: T) => U): TryChain<U, E> {
    if (this.result.type === "Ok") {
      return new TryChain({ type: "Ok", value: f(this.result.value) });
    } else {
      return new TryChain({ type: "Err", error: this.result.error });
    }
  }

  /**
   * Check for a specific error and handle it in a separate function.
   * 
   * This is useful when you want to handle errors in more than one way
   * depending on the error type, other than rethrowing.
   *
   * @param pred The predicate. See {@link ErrorPredicate} for details.
   * @param f The function called if the predicate matches
   * @returns the next chained value
   */
  case<U, E2>(pred: ErrorPredicate<E2>, f: (subchain: TryChain<never, E2>) => U): TryChain<T | U, E> {
    if (this.result.type === "Ok") {
      return this;
    } else if (isErrorOf(this.result.error, pred)) {
      const result = f(new TryChain({ type: "Err", error: this.result.error }));
      return new TryChain({ type: "Ok", value: result });
    } else {
      return this;
    }
  }

  /**
   * Check for a specific error, and if it doesn't match, simply rethrow it.
   * 
   * Useful when you want to handle only a specific class of errors.
   *
   * @param pred The predicate. See {@link ErrorPredicate} for details.
   * @returns the next chained value, if the predicate matches. Otherwise, the method does not return.
   */
  pick<E2>(pred: ErrorPredicate<E2>): TryChain<T, E & E2> {
    if (this.result.type === "Ok") {
      return new TryChain({ type: "Ok", value: this.result.value });
    } else if (isErrorOf(this.result.error, pred)) {
      return new TryChain({ type: "Err", error: this.result.error });
    } else {
      throw this.result.error;
    }
  }

  /**
   * Run a side-effect function if it's an {@link Err}.
   *
   * Useful for error reporting, including logging and some sort of toast UI.
   */
  tap(f: (error: E) => void): TryChain<T, E> {
    if (this.result.type === "Err") {
      f(this.result.error);
    }
    return this;
  }

  /**
   * Finish the error handling chain. The remaining error, if any, will be rethrown.
   *
   * @return The Ok value, if any. Otherwise, the method does not return.
   */
  done(): T;
  /**
   * Finish the error handling chain.
   *
   * @param fallback The error-handling function. You may return a fallback value or just rethrow something (in which case {@link Throw} would be convenient).
   * @return The Ok value or the fall back value.
   */
  done<U>(fallback: (error: E) => U): T | U;
  done<U>(fallback?: ((error: E) => U) | undefined): T | U {
    if (this.result.type === "Ok") {
      return this.result.value;
    } else if (fallback) {
      return fallback(this.result.error);
    } else {
      throw this.result.error;
    }
  }
}

/**
 * Values describing condition on an error instance. There are three types of predicates:
 * 
 * 1. Error constructor, like `SyntaxError` or `TypeError`
 * 2. Error predicate function, like `(e) => e instanceof TypeError && e.message.includes("ERR_INVALID_URL")`
 * 3. Union of the above, like `[SyntaxError, TypeError, (e) => e.name === "URLError"]`
 */
export type ErrorPredicate<E> =
  | ErrorConstructorPredicate<E>
  | ErrorPredicateFunction<E>
  | ErrorUnionPredicate<E>;
export type ErrorConstructorPredicate<out E> = new (...args: unknown[]) => E;
export type ErrorPredicateFunction<out E> = (e: unknown) => e is E
export type ErrorUnionPredicate<out E> = ErrorPredicate<E>[];

/**
 * Evaluates the predicate in the form of {@link ErrorPredicate}.
 *
 * This function is exported for convenience, but you usually don't need to call it directly.
 * See {@link TryChain.case} and {@link TryChain.pick} for the typical usage.
 *
 * @param e the error value to test
 * @param pred the predicate
 * @returns whether the predicate matches
 */
export function isErrorOf<E>(e: unknown, pred: ErrorPredicate<E>): e is E {
  if (typeof pred === "function") {
    const isLikelyErrorConstructor = pred.prototype instanceof Error || Object.getPrototypeOf(pred.prototype) !== Object.prototype;
    if (isLikelyErrorConstructor) {
      return e instanceof pred;
    } else {
      return (pred as ErrorPredicateFunction<E>)(e);
    }
  } else if (Array.isArray(pred)) {
    return pred.some((p) => isErrorOf(e, p));
  } else {
    throw new Error("Invalid predicate");
  }
}

/**
 * The plain raw Result value, as in Rust or other popular functional languages.
 */
export type Result<T, E> = Ok<T> | Err<E>;
export type Ok<out T> = {
  readonly type: "Ok";
  readonly value: T;
};
export type Err<out E> = {
  readonly type: "Err";
  readonly error: E;
};
