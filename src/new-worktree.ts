#!/usr/bin/env bun
import { cpSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { $, argv } from "bun";

// Word lists for random branch names
const ADJECTIVES = [
	"swift",
	"quick",
	"bright",
	"calm",
	"clever",
	"cool",
	"crisp",
	"eager",
	"fast",
	"fresh",
	"keen",
	"light",
	"neat",
	"prime",
	"sharp",
	"silent",
	"smooth",
	"steady",
	"warm",
	"bold",
	"brave",
	"clear",
	"fleet",
	"golden",
	"agile",
	"nimble",
	"rapid",
	"blazing",
	"cosmic",
];

const NOUNS = [
	"fox",
	"wolf",
	"bear",
	"hawk",
	"lion",
	"tiger",
	"raven",
	"eagle",
	"falcon",
	"otter",
	"cedar",
	"maple",
	"oak",
	"pine",
	"willow",
	"river",
	"stream",
	"brook",
	"delta",
	"canyon",
	"spark",
	"flame",
	"ember",
	"comet",
	"meteor",
	"nova",
	"pulse",
	"wave",
	"drift",
	"glow",
];

function randomElement<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)] as T;
}

function generateRandomName(): string {
	const adj = randomElement(ADJECTIVES);
	const noun = randomElement(NOUNS);
	const num = Math.floor(Math.random() * 100);
	return `${adj}-${noun}-${num}`;
}

async function main(): Promise<void> {
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
	const branchCheck =
		await $`git show-ref --verify --quiet refs/heads/${branch}`
			.nothrow()
			.quiet();
	if (branchCheck.exitCode === 0) {
		console.error(`Error: branch '${branch}' already exists`);
		process.exit(1);
	}

	// Get main repo path (first entry in worktree list is always the main repo)
	const worktreeList = await $`git worktree list --porcelain`.text();
	const mainRepoPath = worktreeList.match(/^worktree (.+)/)?.[1];
	if (!mainRepoPath) {
		console.error("Error: could not determine main repo path");
		process.exit(1);
	}

	const project = basename(mainRepoPath);
	const home = process.env.HOME ?? process.env.USERPROFILE;
	if (!home) {
		console.error("Error: HOME environment variable not set");
		process.exit(1);
	}
	const worktreePath = join(home, "worktrees", project, branch);

	// Create worktree with new branch (must run from main repo)
	mkdirSync(join(home, "worktrees", project), { recursive: true });
	await $`git worktree add -b ${branch} ${worktreePath}`.cwd(mainRepoPath);

	// Copy all gitignored items from main repo to worktree
	const ignoredOutput =
		await $`git ls-files --others --ignored --exclude-standard --directory`
			.cwd(mainRepoPath)
			.text();
	const ignoredItems = ignoredOutput.trim().split("\n").filter(Boolean);

	if (ignoredItems.length > 0) {
		console.log("\nCopying gitignored files to worktree...");
		for (const item of ignoredItems) {
			const src = join(mainRepoPath, item);
			const dest = join(worktreePath, item);
			console.log(`  ${item}`);
			cpSync(src, dest, { recursive: true });
		}
	}

	console.log(`\nWorktree created at: ${worktreePath}`);
	console.log("Starting claude...\n");

	// Change to the worktree directory so the shell ends up there after claude exits
	process.chdir(worktreePath);

	const proc = Bun.spawn(["claude", ...claudeFlags], {
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
