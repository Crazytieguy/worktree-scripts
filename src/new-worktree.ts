import { $, argv } from "bun";
import { existsSync, cpSync, mkdirSync } from "fs";
import { join, dirname, basename } from "path";
import ignore from "ignore";

// Word lists for random branch names
const ADJECTIVES = [
  "swift", "quick", "bright", "calm", "clever", "cool", "crisp", "eager", "fast", "fresh",
  "keen", "light", "neat", "prime", "sharp", "silent", "smooth", "steady", "warm",
  "bold", "brave", "clear", "fleet", "golden", "agile", "nimble", "rapid", "blazing", "cosmic",
];

const NOUNS = [
  "fox", "wolf", "bear", "hawk", "lion", "tiger", "raven", "eagle", "falcon", "otter",
  "cedar", "maple", "oak", "pine", "willow", "river", "stream", "brook", "delta", "canyon",
  "spark", "flame", "ember", "comet", "meteor", "nova", "pulse", "wave", "drift", "glow",
];

function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}-${noun}-${num}`;
}

async function main() {
  // Check we're in a git repo
  const gitCheck = await $`git rev-parse --git-dir`.nothrow().quiet();
  if (gitCheck.exitCode !== 0) {
    console.error("Error: not in a git repository");
    process.exit(1);
  }

  // Parse arguments: first non-flag arg is branch name, rest go to claude
  let branch = "";
  const claudeFlags: string[] = [];
  let parsingBranch = true;

  for (const arg of argv.slice(2)) {
    if (parsingBranch) {
      if (arg === "--") {
        parsingBranch = false;
      } else if (arg.startsWith("-")) {
        parsingBranch = false;
        claudeFlags.push(arg);
      } else {
        branch = arg;
        parsingBranch = false;
      }
    } else {
      claudeFlags.push(arg);
    }
  }

  // Generate random branch name if not provided
  if (!branch) {
    branch = generateRandomName();
    console.log(`Generated branch name: ${branch}`);
  }

  // Error if branch already exists
  const branchCheck = await $`git show-ref --verify --quiet refs/heads/${branch}`.nothrow().quiet();
  if (branchCheck.exitCode === 0) {
    console.error(`Error: branch '${branch}' already exists`);
    process.exit(1);
  }

  // Get repo root and project name
  const repoRoot = (await $`git rev-parse --show-toplevel`.text()).trim();
  const project = basename(repoRoot);
  const worktreePath = join(process.env.HOME!, "worktrees", project, branch);

  // Create worktree with new branch
  mkdirSync(join(process.env.HOME!, "worktrees", project), { recursive: true });
  await $`git worktree add -b ${branch} ${worktreePath}`;

  // Copy files matching .worktreeinclude patterns (only gitignored files)
  const worktreeIncludePath = join(repoRoot, ".worktreeinclude");
  if (existsSync(worktreeIncludePath)) {
    console.log("\nCopying files from .worktreeinclude...");

    const patterns = await Bun.file(worktreeIncludePath).text();
    const ig = ignore().add(patterns);

    // Get all gitignored files
    const ignoredOutput = await $`git ls-files --others --ignored --exclude-standard`.cwd(repoRoot).text();
    const ignoredFiles = ignoredOutput.trim().split("\n").filter(Boolean);

    // Copy files that match .worktreeinclude patterns
    const copiedDirs = new Set<string>();
    for (const file of ignoredFiles) {
      if (ig.ignores(file)) {
        const src = join(repoRoot, file);
        const dest = join(worktreePath, file);
        mkdirSync(dirname(dest), { recursive: true });
        cpSync(src, dest);

        // Track top-level matched directory for logging
        const parts = file.split("/");
        for (let i = 1; i <= parts.length; i++) {
          const prefix = parts.slice(0, i).join("/");
          if (ig.ignores(prefix)) {
            copiedDirs.add(prefix);
            break;
          }
        }
      }
    }

    for (const dir of copiedDirs) {
      console.log(`  Copied: ${dir}`);
    }
  }

  console.log(`\nWorktree created at: ${worktreePath}`);
  console.log("Starting claude...\n");

  // Replace this process with claude running in the new worktree
  process.chdir(worktreePath);
  const proc = Bun.spawn(["claude", ...claudeFlags], {
    cwd: worktreePath,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await proc.exited;
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
