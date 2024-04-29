import { assertEquals, assertRejects } from "jsr:@std/assert";
import { Do } from "./do.ts";

Deno.test("Do-done cancellation", () => {
  const result = Do(42).done();
  assertEquals(result, 42);
});

Deno.test("Synchronous pipe", () => {
  const result = Do(42)
    .pipe((it) => it + 1)
    .pipe((it) => it * 2)
    .done();
  assertEquals(result, 86);
});

Deno.test("Pipe does not execute until done() is called", () => {
  let called = false;
  Do(42).pipe((it) => {
    called = true;
    return it;
  });
  assertEquals(called, false);
});

Deno.test("Asynchronous pipe", async () => {
  const result = await Do(42)
    .pipeAwait((it) => Promise.resolve(it))
    .pipe((it) => it + 1)
    .pipeAwait((it) => Promise.resolve(it * 2))
    .done();
  assertEquals(result, 86);
});

Deno.test("Fails on unprecedented Promise collapse", async () => {
  await assertRejects(async () => {
    await Do(42)
      .pipeAwait((it) => Promise.resolve(it + 1))
      .pipe((it) => Promise.resolve(it * 2))
      .done();
  })
});

Deno.test("Microtick counting baseline: resolve-and-await takes 1 turn", async () => {
  const counter = new MicrotickCouter(10);
  await Promise.resolve(null);
  assertEquals(counter.count, 1);
  await counter.finished;
});

Deno.test("AsyncThunk await count: case 0 (sync)", async () => {
  const counter = new MicrotickCouter(10);
  const result = Do(0)
    .pipe((it) => it + 1)
    .pipe((it) => it + 1)
    .pipe((it) => it + 1)
    .done();
  assertEquals(result, 3);
  assertEquals(counter.count, 0);
  await counter.finished;
});

Deno.test("AsyncThunk await count: case 1", async () => {
  const counter = new MicrotickCouter(10);
  const result = await Do(0)
    .pipe((it) => it + 1)
    .pipe((it) => it + 1)
    .pipeAwait((it) => Promise.resolve(it + 1))
    .done();
  assertEquals(result, 3);
  assertEquals(counter.count, 1);
  await counter.finished;
});

Deno.test("AsyncThunk await count: case 2", async () => {
  const counter = new MicrotickCouter(10);
  const result = await Do(0)
    .pipe((it) => it + 1)
    .pipeAwait((it) => Promise.resolve(it + 1))
    .pipe((it) => it + 1)
    .done();
  assertEquals(result, 3);
  assertEquals(counter.count, 2);
  await counter.finished;
});

Deno.test("AsyncThunk await count: case 3", async () => {
  const counter = new MicrotickCouter(10);
  const result = await Do(0)
    .pipe((it) => it + 1)
    .pipeAwait((it) => Promise.resolve(it + 1))
    .pipeAwait((it) => Promise.resolve(it + 1))
    .done();
  assertEquals(result, 3);
  assertEquals(counter.count, 3);
  await counter.finished;
});

Deno.test("AsyncThunk await count: case 4", async () => {
  const counter = new MicrotickCouter(10);
  const result = await Do(0)
    .pipeAwait((it) => Promise.resolve(it + 1))
    .pipe((it) => it + 1)
    .pipe((it) => it + 1)
    .done();
  assertEquals(result, 3);
  assertEquals(counter.count, 2);
  await counter.finished;
});

Deno.test("AsyncThunk await count: case 5", async () => {
  const counter = new MicrotickCouter(10);
  const result = await Do(0)
    .pipeAwait((it) => Promise.resolve(it + 1))
    .pipe((it) => it + 1)
    .pipeAwait((it) => Promise.resolve(it + 1))
    .done();
  assertEquals(result, 3);
  assertEquals(counter.count, 3);
  await counter.finished;
});

Deno.test("AsyncThunk await count: case 6", async () => {
  const counter = new MicrotickCouter(10);
  const result = await Do(0)
    .pipeAwait((it) => Promise.resolve(it + 1))
    .pipeAwait((it) => Promise.resolve(it + 1))
    .pipe((it) => it + 1)
    .done();
  assertEquals(result, 3);
  assertEquals(counter.count, 3);
  await counter.finished;
});

Deno.test("AsyncThunk await count: case 7", async () => {
  const counter = new MicrotickCouter(10);
  const result = await Do(0)
    .pipeAwait((it) => Promise.resolve(it + 1))
    .pipeAwait((it) => Promise.resolve(it + 1))
    .pipeAwait((it) => Promise.resolve(it + 1))
    .done();
  assertEquals(result, 3);
  assertEquals(counter.count, 4);
  await counter.finished;
});

class MicrotickCouter {
  private _count: number;
  readonly maxCount: number;
  readonly finished: Promise<void>;

  constructor(maxCount: number) {
    this._count = 0;
    this.maxCount = maxCount;
    this.finished = (async () => {
      for (let i = 0; i <= maxCount; i++) {
        this._count = i;
        await (null as unknown);
      }
      this._count = Infinity;
    })();
  }

  get count(): number {
    return this._count;
  }
}
