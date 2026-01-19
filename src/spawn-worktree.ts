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

	// Get optional branch name from first argument
	const branch = argv[2] || generateRandomName();
	if (!argv[2]) {
		console.error(`Generated branch name: ${branch}`);
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
		console.error("\nCopying gitignored files to worktree...");
		for (const item of ignoredItems) {
			const src = join(mainRepoPath, item);
			const dest = join(worktreePath, item);
			console.error(`  ${item}`);
			cpSync(src, dest, { recursive: true });
		}
	}

	// Print worktree path to stdout for caller to use
	console.log(worktreePath);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
