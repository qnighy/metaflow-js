import { assertEquals } from "jsr:@std/assert";
import { Try } from "./exception.ts";

class DemoError extends Error {
  constructor(demoRequiredArg: string) {
    super(`DemoError: ${demoRequiredArg}`);
  }
}

Deno.test("Try pick Error", () => {
  const result = Try(() => {
    throw new Error();
  }).pick(Error).done(() => 42);
  assertEquals(result, 42);
});

Deno.test("Try pick Error and catch subclass TypeError", () => {
  const result = Try(() => {
    throw new TypeError();
  }).pick(Error).done(() => 42);
  assertEquals(result, 42);
});

Deno.test("Try pick Error and catch subclass DemoError", () => {
  const result = Try(() => {
    throw new DemoError("demo");
  }).pick(DemoError).done(() => 42);
  assertEquals(result, 42);
});
