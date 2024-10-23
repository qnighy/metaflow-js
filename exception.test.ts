import { assertEquals } from "jsr:@std/assert";
import { Try } from "./exception.ts";

Deno.test("Try pick Error", () => {
  const result = Try(() => {
    throw new Error();
  }).pick(Error).done(() => 42);
  assertEquals(result, 42);
});

Deno.test("Try pick TypeError by Error predicate", () => {
  const result = Try(() => {
    throw new TypeError();
  }).pick(Error).done(() => 42);
  assertEquals(result, 42);
});
