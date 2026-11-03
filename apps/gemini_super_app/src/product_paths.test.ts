import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { resolveProductRoot } from "./product_paths";

test("finds product resources from source and bundled entry directories", () => {
  const root = resolve(import.meta.dir, "../../..");
  expect(resolveProductRoot({ entryDir: import.meta.dir, cwd: "C:/", executableDir: "C:/" })).toBe(root);
  expect(resolveProductRoot({ entryDir: `${root}/dist`, cwd: "C:/", executableDir: "C:/" })).toBe(root);
  expect(() => resolveProductRoot({ override: `${root}/missing`, entryDir: import.meta.dir, cwd: root, executableDir: root })).toThrow("SUPER_APP_ROOT");
});
