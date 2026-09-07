import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Executes Git commands safely using execFile with strict argument arrays.
 * This completely prevents Command Injection / Remote Code Execution (RCE)
 * because arguments are passed directly to the OS kernel without shell expansion.
 */
export async function safeGitCommitAndPush(commitMessage: string): Promise<{ success: boolean; output: string }> {
  // 1. Sanitize commit message: replace newlines and quotes with safe spaces
  const sanitizedMessage = commitMessage
    .replace(/[\r\n]+/g, " ")
    .replace(/["'`$\\]/g, "")
    .slice(0, 100);

  try {
    // 2. git add data/
    await execFileAsync("git", ["add", "data/"]);

    // 3. git commit -m <sanitizedMessage>
    const commitResult = await execFileAsync("git", ["commit", "-m", sanitizedMessage]);

    // 4. git push origin main
    const pushResult = await execFileAsync("git", ["push", "origin", "main"]);

    return {
      success: true,
      output: `${commitResult.stdout}\n${pushResult.stdout}`,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    // Ignore "nothing to commit"
    if (errorMsg.includes("nothing to commit") || errorMsg.includes("clean")) {
      return { success: true, output: "No changes to commit (already clean)." };
    }
    console.warn("[Safe Git Notice]:", errorMsg);
    return { success: false, output: errorMsg };
  }
}
