# Metaflow: library-level augmentation of JavaScript data flow and control flow

This is a small library of utility functions, just like
[fp-ts](https://github.com/gcanti/fp-ts), but focusing on those things:

- data flow patterns
- control flow patterns

## Installation

- Node.js: `npx jsr add @qnighy/metaflow` but check
  [Using JSR with Node.js](https://jsr.io/docs/with/node) for details,
  especially with `.npmrc` things.
- Deno: `deno add jsr:@qnighy/metaflow`

## `exception.ts`: expression-based exception handling

This library is about exception handling, but with two policies:

- Honor the native JavaScript exception handling mechanism, namely `throw` and
  `try`-`catch`, rather than sticking to the "Result" pattern.
- Turn statements into expressions, especially method chains.

Why not the "Result" pattern? I have two major reasons:

- There is no equivalent to `try!` or `?` as in Rust. I think you get the idea
  unless you are a big fan of Go's
  `if x, err := foo(); err != nil { return nil, errors.Wrap(err); }; if y, err := bar(x); err != nil { return nil, errors.Wrap(err); }; if z, err := baz(x); err != nil { return nil, errors.Wrap(err); }; if w, err := quux(x); err != nil { return errors.Wrap(err); }`,
  where I forgot adding `nil,` in the last branch when refactoring. (I'm not
  blaming the Wrapping part; this is a good practice)
- It is easy to forget error handling if the result value of the operation is
  not used. Typical example is `write()` on an I/O stream. In JavaScript, this
  is already witnessed in the form of `Promise` rejection handling. So you need
  equivalent of `@typescript-eslint/no-floating-promises` whenever you invent a
  "Result" pattern.

Let's get to the examples:

```typescript
import { Throw, Try } from "jsr:@qnighy/metaflow/exception";

// Catch all and default to null
const url = Try(() => new URL(input)).done(() => null);

// Catch a specific error and default to a special value
const url = Try(() => new URL(input)).pick(SyntaxError).done(() =>
  new URL("http://default.example.com")
);

// Wrap the error
const url = Try(() => new URL(input)).pick(SyntaxError).done((e) =>
  Throw(new URLError(e))
);

// Use raw result value (advanced!)
const urlResult = Try(() => new URL(input)).result;
if (urlResult.type === "Ok") {
  // ...
} else {
  // ...
}
```

## `do.ts`: pipeline alternative

This is mostly an alternative to
[pipelines](https://github.com/tc39/proposal-pipeline-operator) and
[call-this](https://github.com/tc39/proposal-call-this), which unfortunately are
stuck in the early stage of the TC39 process.

So it's roughly equivalent to many
[existing library functions named pipe](https://gcanti.github.io/fp-ts/modules/function.ts.html#pipe),
but differs in one thing: **mine uses method chaining**. The reason is clear:
the meaning that the operator `|>` would convey is very similar to method
chaining. I decided to (probably re-)invent a wheel because I couldn't find one,
although the idea is simple.

```typescript
import { Do } from "jsr:@qnighy/metaflow/do";

const result = Do(42)
  .pipe((it) => it + 1) // Equivalent to: |> % + 1
  .pipe((it) => it * 2) // Equivalent to: |> % * 2
  .done();
console.log(result); // => 86
```

I recommend using `it` as the parameter name as this is the most standard way to
describe the most local topic (although the name conflicts the `it()` DSL in
test harnesses).

As a typical method chain, extending it with other operators is easy. One such
example is equivalent to `|> await`:

```typescript
import { Do } from "jsr:@qnighy/metaflow/do";

const result = await Do(42)
  .pipeAwait(async (it) => it + 1) // Equivalent to: |> await Promise.resolve(% + 1)
  .pipeAwait(async (it) => it * 2) // Equivalent to: |> await Promise.resolve(% * 2)
  .done();
console.log(result); // => 86
```

There's also an alternative to the `~>` operator:

```typescript
import { Do } from "jsr:@qnighy/metaflow/do";

function double(this: number): number {
  return this * 2;
}
const result = Do(42)
  .pipe((it) => it + 1) // Equivalent to: |> % + 1
  .rcall(double) // Equivalent to: ~>double
  .done();
console.log(result); // => 86
```

## `tap.ts`: Ruby's beloved `Object#tap`

Utilities that would be convenient once `~>` is available.

```typescript
import { tapMe } from "jsr:@qnighy/metaflow/tap";

const result = 42~>tapMe((x) => console.log(x)) + 1;
console.log(result); // => 43
```

It also has `tap(x, f)` which can be used as `|> tap(%, (x) => console.log(x))`.
However, this is more easily written as `|> (console.log(%), %)`.

## License

Licensed under the MIT License and the Apache License, Version 2.0, at your
option.

### MIT License

Copyright 2024 Masaki Hara

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the “Software”), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### Apache-2.0

Copyright 2024 Masaki Hara

Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed
under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied. See the License for the
specific language governing permissions and limitations under the License.
