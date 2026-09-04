import { readFileSync, writeFileSync } from "node:fs";
import { buildManifest } from "./manifest";
import { BrandKit, Script } from "./schema";

const propsPath = process.argv[2];
const outputPath = process.argv[3];

if (!propsPath || !outputPath) {
  console.error("Usage: manifest-cli <props.json> <layout.json>");
  process.exit(1);
}

let props: unknown;
try {
  props = JSON.parse(readFileSync(propsPath, "utf8"));
} catch (error) {
  console.error(`Could not read props JSON: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const input = props as { brand?: unknown; script?: unknown };
const brand = BrandKit.safeParse(input?.brand);
const script = Script.safeParse(input?.script);

if (!brand.success || !script.success) {
  console.error(JSON.stringify({
    brand: brand.success ? [] : brand.error.issues,
    script: script.success ? [] : script.error.issues,
  }, null, 2));
  process.exit(1);
}

writeFileSync(outputPath, `${JSON.stringify(buildManifest(script.data, brand.data), null, 2)}\n`);
