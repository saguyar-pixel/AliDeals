import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execFileAsync = promisify(execFile);

/**
 * Strips confidential API credentials from JSON content before syncing to GitHub.
 */
function scrubSecretsFromJsonContent(rawContent: string): string {
  try {
    const parsed = JSON.parse(rawContent);
    if (parsed && typeof parsed === "object") {
      if (parsed.settings && typeof parsed.settings === "object") {
        delete parsed.settings.geminiApiKey;
        delete parsed.settings.aliexpressAppSecret;
        delete parsed.settings.aliexpressAppKey;
      }
      delete parsed.geminiApiKey;
      delete parsed.aliexpressAppSecret;
      delete parsed.aliexpressAppKey;
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // Fallback regex redaction if non-standard JSON
    return rawContent.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, "[REDACTED_GEMINI_KEY]");
  }
  return rawContent;
}

/**
 * Pushes updated non-secret catalog files directly via GitHub REST API if GITHUB_TOKEN is available.
 * Never syncs `analytics_data.json` containing user settings/keys to GitHub.
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
  // Exclude data/analytics_data.json so settings/API keys are never committed to Git
  const filesToSync = [
    "data/pages.json",
    "data/products.json",
    "data/categories.json",
  ];
  let updatedCount = 0;

  for (const relPath of filesToSync) {
    try {
      const baseFilename = path.basename(relPath);
      const fullPath = path.join(process.cwd(), "data", baseFilename);
      const tmpPath = path.join("/tmp", baseFilename);
      let content = "";

      if (fs.existsSync(tmpPath)) {
        content = fs.readFileSync(tmpPath, "utf8");
      } else if (fs.existsSync(fullPath)) {
        content = fs.readFileSync(fullPath, "utf8");
      } else {
        continue;
      }

      content = scrubSecretsFromJsonContent(content);

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

  if (isServerless || process.env.GITHUB_TOKEN) {
    return await pushViaGitHubApi(commitMessage);
  }

  const sanitizedMessage = commitMessage
    .replace(/[\r\n]+/g, " ")
    .replace(/["'`$\\]/g, "")
    .slice(0, 100);

  try {
    // Stage only non-secret catalog files (never analytics_data.json)
    await execFileAsync("git", ["add", "data/pages.json", "data/products.json", "data/categories.json"]);

    const commitResult = await execFileAsync("git", ["commit", "-m", sanitizedMessage]);
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
