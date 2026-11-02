/** Private, committed-source packaging. Never reads .env or uploads anything. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const gitText = (...args: string[]) => git(...args).toString("utf8").trim();
const forbiddenPath = (name: string) =>
  /(^|\/)(?:\.git|node_modules|data|output|dist|\.claude)(?:\/|$)/i.test(name) ||
  /(^|\/)\.env(?!\.example$)(?:\.|$)/i.test(name) ||
  /\.(?:wav|mp3|mp4|webm|m4a|ogg|flac|log|pem|p12|pfx)$/i.test(name);

// Deliberately narrow high-confidence patterns, not a claim of comprehensive security review.
const secretKinds = (body: string) => [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["openai-style-key", /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}\b/],
  ["github-token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ["google-api-key", /\bAIza[A-Za-z0-9_-]{30,}\b/],
  ["jwt", /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/],
].filter(([, pattern]) => (pattern as RegExp).test(body)).map(([kind]) => kind as string);

function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !["--audit-only", "--self-test"].includes(arg))) throw new Error("Supported options: --audit-only, --self-test");
  if (args.includes("--self-test")) {
    for (const name of [".env", "server/.env.local", "data/settings.json", "output/a.wav", ".git/config", "x/key.pem", "capture.webm"]) assert.equal(forbiddenPath(name), true, name);
    for (const name of [".env.example", "server/config.ts", "docs/EVALUATION.md"]) assert.equal(forbiddenPath(name), false, name);
    assert.deepEqual(secretKinds("sk-proj-" + "a".repeat(40)), ["openai-style-key"]);
    assert.deepEqual(secretKinds("ghp_" + "a".repeat(36)), ["github-token"]);
    assert.deepEqual(secretKinds("eyJ" + "a".repeat(20) + "." + "b".repeat(20) + "." + "c".repeat(20)), ["jwt"]);
    assert.deepEqual(secretKinds("META_API_KEY=\nOPENAI_API_KEY=\n"), []);
    console.log("Packaging privacy fixture checks passed.");
    return;
  }
  const head = gitText("rev-parse", "HEAD");
  const branch = gitText("branch", "--show-current");
  const dirty = gitText("status", "--porcelain").length > 0;
  const paths = git("ls-tree", "-rz", "--name-only", head).toString("utf8").split("\0").filter(Boolean);
  const blocked = paths.filter(forbiddenPath);
  if (blocked.length) throw new Error(`Snapshot contains ${blocked.length} forbidden private/generated paths; inspect locally before packaging.`);
  const historicalPaths = [...new Set(git("log", "--all", "--format=", "--name-only", "-z").toString("utf8").split("\0").map(name => name.trim()).filter(Boolean))];
  const historicalBlocked = historicalPaths.filter(forbiddenPath);
  if (historicalBlocked.length) throw new Error(`History contains ${historicalBlocked.length} forbidden private/generated paths; manual review required before packaging.`);
  const template = gitText("show", `${head}:.env.example`);
  if (template.split(/\r?\n/).some(line => /^\s*[A-Z][A-Z0-9_]*\s*=\s*\S/.test(line))) throw new Error("Committed .env.example contains nonempty configuration values.");

  const objectIds = [...new Set(gitText("rev-list", "--objects", "--all").split("\n").map(line => line.split(" ")[0]).filter(Boolean))];
  const metadata = execFileSync("git", ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"], { cwd: root, input: objectIds.join("\n") + "\n", maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
  const blobs = metadata.trim().split("\n").map(line => line.split(" ")).filter(([, type]) => type === "blob");
  if (blobs.reduce((sum, [, , size]) => sum + Number(size), 0) > 60 * 1024 * 1024) throw new Error("Historical blob data exceeds audit size limit; manual review required.");
  const bodies = execFileSync("git", ["cat-file", "--batch"], { cwd: root, input: blobs.map(([id]) => id).join("\n") + "\n", maxBuffer: 64 * 1024 * 1024 });
  const findings: { object: string; kinds: string[] }[] = [];
  let offset = 0;
  for (const [id, , size] of blobs) {
    const headerEnd = bodies.indexOf(10, offset);
    if (headerEnd < 0 || bodies.subarray(offset, headerEnd).toString("utf8") !== `${id} blob ${size}`) throw new Error("Historical object stream could not be verified.");
    const bodyEnd = headerEnd + 1 + Number(size);
    if (bodies[bodyEnd] !== 10) throw new Error("Historical object size could not be verified.");
    const kinds = secretKinds(bodies.subarray(headerEnd + 1, bodyEnd).toString("utf8"));
    if (kinds.length) findings.push({ object: id, kinds });
    offset = bodyEnd + 1;
  }
  const audit = { head, branch, workingTreeDirty: dirty, trackedFiles: paths.length, historicalPathsChecked: historicalPaths.length, historicalBlobsScanned: blobs.length, secretPatternFindings: findings, scope: "All blobs reachable from local refs; narrow pattern scan only; no .env values read. Not security or legal clearance." };
  console.log(JSON.stringify(audit, null, 2));
  if (findings.length) throw new Error("Potential credentials found in committed history. Package withheld; inspect listed object IDs locally without printing secret content.");
  if (args.includes("--audit-only")) return;
  if (dirty) throw new Error("Package withheld: commit reviewed changes first. --audit-only can inspect the current committed snapshot while work continues.");
  if (branch !== "hackathon/meta-2026") throw new Error("Package withheld: expected hackathon/meta-2026 branch.");
  const out = join(root, "output", "submission", head);
  mkdirSync(out, { recursive: true });
  const archive = join(out, "ai-mc-studio-source.zip");
  git("archive", "--format=zip", "--prefix=ai-mc-studio/", `--output=${archive}`, head);
  const bytes = readFileSync(archive);
  const manifest = { ...audit, generatedAt: new Date().toISOString(), archive: "ai-mc-studio-source.zip", archiveBytes: bytes.length, archiveSha256: createHash("sha256").update(bytes).digest("hex"), sourceFiles: paths, publicationApproved: false, submitted: false, humanAcceptance: "Not established by packaging", video: "Not included; final English capture and review required", note: "Private review package only. Git history, ignored files and recordings are not included. Public GitHub history requires separate review and approval. This ZIP does not replace the required public repository or video." };
  writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Private package prepared: ${out}`);
}

try { main(); } catch (error) { console.error(error instanceof Error ? error.message : "Preparation failed"); process.exitCode = 1; }
