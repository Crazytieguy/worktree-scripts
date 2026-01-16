#!/usr/bin/env bun
import { $, argv } from "bun";

async function main(): Promise<void> {
	// Check we're in a git repo
	const gitCheck = await $`git rev-parse --git-dir`.nothrow().quiet();
	if (gitCheck.exitCode !== 0) {
		console.error("Error: not in a git repository");
		process.exit(1);
	}

	// Handle --abort flag
	if (argv.includes("--abort")) {
		console.log("Aborting rebase...");
		await $`git rebase --abort`;
		console.log(
			"Rebase aborted. You can try cleanup-worktree again or continue working.",
		);
		process.exit(0);
	}

	// Get current worktree path and branch
	const currentPath = (await $`git rev-parse --show-toplevel`.text()).trim();
	const currentBranch = (
		await $`git rev-parse --abbrev-ref HEAD`.text()
	).trim();

	// Check for detached HEAD state
	if (currentBranch === "HEAD") {
		console.error("Error: worktree is in detached HEAD state");
		console.error("Please checkout a branch before cleaning up");
		process.exit(1);
	}

	// Find main worktree (the first one listed)
	const worktreeList = (await $`git worktree list`.text()).trim();
	const firstLine = worktreeList.split("\n")[0];
	const match = firstLine.match(/^(\S+)\s+\S+\s+\[(.+)\]$/);

	if (!match) {
		console.error("Error: could not parse git worktree list output");
		process.exit(1);
	}

	const mainPath = match[1];
	const mainBranch = match[2];

	// Check we're not in the main worktree
	if (currentPath === mainPath) {
		console.error("Error: cannot cleanup the main worktree");
		console.error("Run this command from within a secondary worktree");
		process.exit(1);
	}

	// Check for uncommitted changes (staged or unstaged)
	const hasUnstagedChanges =
		(await $`git diff --quiet`.nothrow().quiet()).exitCode !== 0;
	const hasStagedChanges =
		(await $`git diff --cached --quiet`.nothrow().quiet()).exitCode !== 0;
	if (hasUnstagedChanges || hasStagedChanges) {
		console.error("Error: you have uncommitted changes");
		console.error("Please commit or stash your changes before cleaning up");
		process.exit(1);
	}

	// Check for untracked files
	const untrackedFiles = (
		await $`git ls-files --others --exclude-standard`.text()
	).trim();
	if (untrackedFiles) {
		console.error("Error: you have untracked files");
		console.error(
			"Please commit, remove, or add them to .gitignore before cleaning up",
		);
		process.exit(1);
	}

	console.log(`Current worktree: ${currentPath}`);
	console.log(`Current branch: ${currentBranch}`);
	console.log(`Main worktree: ${mainPath}`);
	console.log(`Main branch: ${mainBranch}`);
	console.log();

	// Count commits to rebase
	const commitCountText = (
		await $`git rev-list --count ${mainBranch}..${currentBranch}`
			.nothrow()
			.quiet()
			.text()
	).trim();
	const commitCount = parseInt(commitCountText, 10) || 0;

	if (commitCount === 0) {
		console.log(
			`No commits to rebase (branch is up to date with ${mainBranch})`,
		);
	} else {
		console.log(`Rebasing ${commitCount} commit(s) onto ${mainBranch}...`);
		console.log();

		// Attempt rebase
		const rebaseResult = await $`git rebase ${mainBranch}`.nothrow();
		if (rebaseResult.exitCode !== 0) {
			console.log();
			console.log("Rebase has conflicts. Please resolve them:");
			console.log("  1. Fix the conflicts in the files listed above");
			console.log("  2. Run: git add <resolved-files>");
			console.log("  3. Run: git rebase --continue");
			console.log("  4. Run: cleanup-worktree again");
			console.log();
			console.log("Or run: cleanup-worktree --abort to abort the rebase");
			process.exit(1);
		}

		console.log();
		console.log("Rebase successful!");
	}

	// Show the commits that will be on the branch
	console.log();
	console.log(`Commits on ${currentBranch}:`);
	const commits = (
		await $`git log --oneline ${mainBranch}..${currentBranch}`.nothrow().text()
	).trim();
	if (commits) {
		for (const line of commits.split("\n").slice(0, 10)) {
			console.log(`  ${line}`);
		}
	} else {
		console.log("  (none)");
	}

	// Move to main worktree before removing current one
	console.log();
	console.log("Switching to main worktree...");
	process.chdir(mainPath);

	// Fast-forward main to include the worktree's commits
	console.log(`Fast-forwarding ${mainBranch} to ${currentBranch}...`);
	const mergeResult = await $`git merge --ff-only ${currentBranch}`
		.nothrow()
		.quiet();
	if (mergeResult.exitCode !== 0) {
		console.error(
			`Error: could not fast-forward ${mainBranch} to ${currentBranch}`,
		);
		console.error("This can happen if main has new commits. Try:");
		console.error(`  1. Go back to the worktree: cd ${currentPath}`);
		console.error(`  2. Rebase again: git rebase ${mainBranch}`);
		console.error("  3. Run cleanup-worktree again");
		process.exit(1);
	}

	// Remove the worktree
	console.log(`Removing worktree at ${currentPath}...`);
	await $`git worktree remove ${currentPath}`;

	// Delete the branch since it's now merged into main
	console.log(`Deleting branch ${currentBranch}...`);
	await $`git branch -d ${currentBranch}`.nothrow().quiet();

	console.log();
	console.log("Cleanup complete!");
	console.log(`Your changes are now on ${mainBranch}`);
	console.log(`You are now in: ${mainPath}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
