import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execFileAsync = promisify(execFile);

/**
 * Pushes updated data files directly via GitHub REST API if GITHUB_TOKEN is available.
 * This allows the Cloud CMS (Vercel) to commit and trigger automatic site rebuilds.
 */
async function pushViaGitHubApi(commitMessage: string): Promise<{ success: boolean; output: string }> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return {
      success: true,
      output: "נשמר בזיכרון המערכת בענן. להפצה אוטומטית ל-GitHub, הוסף GITHUB_TOKEN ב-Vercel.",
    };
  }

  const repo = process.env.GITHUB_REPOSITORY || "saguyar-pixel/AliDeals";
  const branch = "main";
  const filesToSync = ["data/pages.json", "data/products.json"];
  let updatedCount = 0;

  for (const relPath of filesToSync) {
    try {
      const fullPath = path.join(process.cwd(), relPath);
      const tmpPath = path.join("/tmp", path.basename(relPath));
      let content = "";

      if (fs.existsSync(tmpPath)) {
        content = fs.readFileSync(tmpPath, "utf8");
      } else if (fs.existsSync(fullPath)) {
        content = fs.readFileSync(fullPath, "utf8");
      } else {
        continue;
      }

      // 1. Fetch current file sha from GitHub
      const getUrl = `https://api.github.com/repos/${repo}/contents/${relPath}?ref=${branch}`;
      const getRes = await fetch(getUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "AliDeals-Cloud-CMS",
        },
      });

      let sha: string | undefined;
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        sha = fileInfo.sha;
      }

      // 2. Commit to GitHub
      const putUrl = `https://api.github.com/repos/${repo}/contents/${relPath}`;
      const putRes = await fetch(putUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "AliDeals-Cloud-CMS",
        },
        body: JSON.stringify({
          message: `${commitMessage} [Cloud CMS]`,
          content: Buffer.from(content, "utf8").toString("base64"),
          branch,
          sha,
        }),
      });

      if (putRes.ok) {
        updatedCount++;
      }
    } catch (e) {
      console.warn(`Failed to push ${relPath} via GitHub API:`, e);
    }
  }

  if (updatedCount > 0) {
    return {
      success: true,
      output: `עודכנו בהצלחה ${updatedCount} קבצים ב-GitHub דרך ה-API! האתר החי ייבנה מחדש בעוד כ-30 שניות.`,
    };
  }

  return { success: false, output: "לא הצלחנו לעדכן את הקבצים ב-GitHub דרך ה-API" };
}

/**
 * Executes Git commands safely using execFile or GitHub REST API in serverless.
 */
export async function safeGitCommitAndPush(commitMessage: string): Promise<{ success: boolean; output: string }> {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  // If running in cloud serverless, use GitHub API directly
  if (isServerless || process.env.GITHUB_TOKEN) {
    return await pushViaGitHubApi(commitMessage);
  }

  // 1. Sanitize commit message
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
    if (errorMsg.includes("nothing to commit") || errorMsg.includes("clean")) {
      return { success: true, output: "No changes to commit (already clean)." };
    }
    console.warn("[Safe Git Notice]:", errorMsg);
    return { success: false, output: errorMsg };
  }
}
