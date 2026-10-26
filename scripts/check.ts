import { resolve } from "node:path";
import { validatePackage } from "./package";

const root = resolve(import.meta.dir, "..");
const findings = validatePackage(root);
if (findings.length) {
  for (const finding of findings) console.error(`${finding.file}: ${finding.message}`);
  process.exitCode = 1;
} else console.log("astack package: metadata, manifests, published set and local resources verified");
