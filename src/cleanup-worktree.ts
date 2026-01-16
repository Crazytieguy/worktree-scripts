import { $, argv } from "bun";

async function main() {
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

	// Check for uncommitted changes
	const diffCheck = await $`git diff --quiet`.nothrow().quiet();
	const diffCachedCheck = await $`git diff --cached --quiet`.nothrow().quiet();
	if (diffCheck.exitCode !== 0 || diffCachedCheck.exitCode !== 0) {
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
	const commitCountOutput =
		await $`git rev-list --count ${mainBranch}..${currentBranch}`
			.nothrow()
			.quiet();
	const commitCount =
		parseInt(commitCountOutput.stdout.toString().trim(), 10) || 0;

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
	const logOutput = await $`git log --oneline ${mainBranch}..${currentBranch}`
		.nothrow()
		.quiet();
	const commits = logOutput.stdout.toString().trim();
	if (commits) {
		for (const c of commits.split("\n").slice(0, 10)) {
			console.log(`  ${c}`);
		}
	} else {
		console.log("  (none)");
	}

	// Move to main worktree before removing current one
	console.log();
	console.log("Switching to main worktree...");
	process.chdir(mainPath);

	// Remove the worktree
	console.log(`Removing worktree at ${currentPath}...`);
	await $`git worktree remove ${currentPath}`;

	console.log();
	console.log("Cleanup complete!");
	console.log(`Branch '${currentBranch}' is ready to merge`);
	console.log(`You are now in: ${mainPath}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
