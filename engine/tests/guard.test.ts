import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });

describe("template and component guardrails", () => {
  it("has no inline hex literals or spring calls", () => {
    const testDirectory = fileURLToPath(new URL("../src", import.meta.url));
    const directories = [join(testDirectory, "templates"), join(testDirectory, "components")];
    const source = directories
      .flatMap(sourceFiles)
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(source).not.toMatch(/#[0-9a-fA-F]{6}/);
    expect(source).not.toContain("spring(");
  });
});
