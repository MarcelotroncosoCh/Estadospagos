import { readFile, writeFile } from "node:fs/promises";

const generatedPath = new URL("../dist/server/wrangler.json", import.meta.url);
const outputPath = new URL("../dist/server/wrangler.cloudflare.json", import.meta.url);
const config = JSON.parse(await readFile(generatedPath, "utf8"));

config.name = "estadospagos";
config.topLevelName = "estadospagos";
config.d1_databases = [{
  binding: "DB",
  database_name: "estadospagos-db",
  database_id: "0fa1221a-2c58-4414-abbe-a1f57437e348",
  migrations_dir: "../../drizzle",
}];
config.r2_buckets = [{
  binding: "FILES",
  bucket_name: "estadospagos-files",
}];

await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`);
console.log("Cloudflare deployment configuration prepared.");
