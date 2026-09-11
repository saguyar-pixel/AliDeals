import { AgentEditProposal, AgentRole } from "./types";
import { safeReadJson, safeWriteJson } from "./storage-helper";
import { supabaseDb } from "../db";
import { addAgentLog, saveOrchestratorMessage } from "./team-orchestrator";
import { revalidatePath } from "next/cache";
import { safeGitCommitAndPush } from "../security/safe-git";

const PROPOSALS_FILE = "agent_proposals.json";

/**
 * Get all edit proposals
 */
export function getEditProposals(): AgentEditProposal[] {
  return safeReadJson<AgentEditProposal[]>(PROPOSALS_FILE, []);
}

/**
 * Get pending edit proposals awaiting human approval
 */
export function getPendingEditProposals(): AgentEditProposal[] {
  return getEditProposals().filter((p) => p.status === "pending");
}

/**
 * Alon or an agent creates a proposed change to a live page or product.
 * NOTHING changes on the live site until approved by the user!
 */
export function createEditProposal(proposal: {
  proposedBy: AgentRole;
  targetType: "page" | "product";
  targetId: string;
  targetTitle: string;
  targetSlug?: string;
  changeSummaryHe: string;
  diff: Array<{
    field: string;
    fieldLabelHe: string;
    oldValue: any;
    newValue: any;
  }>;
}): AgentEditProposal {
  const proposals = getEditProposals();
  const id = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newProposal: AgentEditProposal = {
    id,
    timestamp: now,
    proposedBy: proposal.proposedBy,
    targetType: proposal.targetType,
    targetId: proposal.targetId,
    targetTitle: proposal.targetTitle,
    targetSlug: proposal.targetSlug,
    changeSummaryHe: proposal.changeSummaryHe,
    diff: proposal.diff,
    status: "pending",
  };

  proposals.unshift(newProposal);
  safeWriteJson(PROPOSALS_FILE, proposals.slice(0, 100));

  // Log in team feed
  addAgentLog(
    proposal.proposedBy,
    "אלון",
    "warning",
    `הצעת עריכה חדשה ממתינה לאישור: ${proposal.targetTitle} (${proposal.changeSummaryHe})`,
    { proposalId: id, targetId: proposal.targetId }
  );

  // Post interactive message to user chat
  saveOrchestratorMessage({
    id: `orch_prop_${id}`,
    sender: "orchestrator",
    text: `📋 **הצעת עריכה באתר (${proposal.targetType === "page" ? "עמוד" : "מוצר"})**: "${proposal.targetTitle}"\n\n` +
      `**מהות השינוי:** ${proposal.changeSummaryHe}\n` +
      `**שדות לשינוי:**\n` +
      proposal.diff.map((d) => `• **${d.fieldLabelHe}**: מ-"${String(d.oldValue || '—').slice(0, 40)}" ל-"${String(d.newValue || '—').slice(0, 40)}"`).join("\n") +
      `\n\n*האתר החי לא יעודכן ללא אישורך המפורש.*`,
    timestamp: new Date().toLocaleTimeString("he-IL", { hour12: false }),
    actionRequired: true,
    actionType: "approve_edit",
    actionPayload: {
      proposalId: id,
      targetType: proposal.targetType,
      targetId: proposal.targetId,
      targetTitle: proposal.targetTitle,
    },
  });

  return newProposal;
}

/**
 * User explicitly approves an edit proposal.
 * Applies the diff to the live database, revalidates ISR cache, and syncs git.
 */
export async function approveProposal(proposalId: string): Promise<{ success: boolean; message: string }> {
  const proposals = getEditProposals();
  const proposal = proposals.find((p) => p.id === proposalId);

  if (!proposal) {
    return { success: false, message: "הצעת העריכה לא נמצאה" };
  }

  if (proposal.status !== "pending") {
    return { success: false, message: `הצעה זו כבר נמצאת בסטטוס: ${proposal.status}` };
  }

  const now = new Date().toISOString();

  if (proposal.targetType === "page") {
    const pages = await supabaseDb.getPages();
    const page = pages.find((p) => p.id === proposal.targetId || p.slug === proposal.targetId);
    if (!page) {
      return { success: false, message: "העמוד המבוקש לעריכה לא נמצא במאגר" };
    }

    const updatedPage = { ...page };
    proposal.diff.forEach((d) => {
      (updatedPage as any)[d.field] = d.newValue;
    });
    updatedPage.updatedAt = now;

    await supabaseDb.upsertPage(updatedPage);

    // Revalidate paths
    try {
      revalidatePath("/");
      revalidatePath(`/${page.type === "review" ? "reviews" : "top5"}/${page.slug}`);
      revalidatePath("/admin/content");
    } catch {}

    await safeGitCommitAndPush(`Alon Site Edit: Updated page ${page.slug} [User Approved]`);
  } else if (proposal.targetType === "product") {
    const products = await supabaseDb.getProducts();
    const product = products.find((p) => p.id === proposal.targetId || p.aliId === proposal.targetId);
    if (!product) {
      return { success: false, message: "המוצר המבוקש לעריכה לא נמצא במאגר" };
    }

    const updatedProduct = { ...product };
    proposal.diff.forEach((d) => {
      (updatedProduct as any)[d.field] = d.newValue;
    });
    updatedProduct.updatedAt = now;

    await supabaseDb.upsertProduct(updatedProduct);

    // Revalidate affected pages
    try {
      revalidatePath("/");
      revalidatePath("/admin/products");
    } catch {}

    await safeGitCommitAndPush(`Alon Site Edit: Updated product ${product.aliId} [User Approved]`);
  }

  // Mark proposal as approved
  proposal.status = "approved";
  proposal.reviewedAt = now;
  safeWriteJson(PROPOSALS_FILE, proposals);

  addAgentLog(
    "orchestrator",
    "אלון",
    "success",
    `עריכת האתר אושרה ויושמה בהצלחה: ${proposal.targetTitle}`,
    { proposalId }
  );

  saveOrchestratorMessage({
    id: `orch_appr_${Date.now()}`,
    sender: "orchestrator",
    text: `✅ **העריכה יושמה בהצלחה באתר החי!**\nהשינויים עבור "${proposal.targetTitle}" נשמרו, הקאש רוענן והאתר עודכן.`,
    timestamp: new Date().toLocaleTimeString("he-IL", { hour12: false }),
  });

  return { success: true, message: "העריכה אושרה ויושמה בהצלחה" };
}

/**
 * User rejects an edit proposal.
 */
export function rejectProposal(proposalId: string, reason?: string): { success: boolean; message: string } {
  const proposals = getEditProposals();
  const proposal = proposals.find((p) => p.id === proposalId);

  if (!proposal) {
    return { success: false, message: "הצעת העריכה לא נמצאה" };
  }

  const now = new Date().toISOString();
  proposal.status = "rejected";
  proposal.reviewedAt = now;
  proposal.rejectionReason = reason || "נדחה ע\"י המנהל";
  safeWriteJson(PROPOSALS_FILE, proposals);

  addAgentLog(
    "orchestrator",
    "אלון",
    "info",
    `הצעת עריכה נדחתה ע"י המנהל: ${proposal.targetTitle}`,
    { proposalId, reason }
  );

  saveOrchestratorMessage({
    id: `orch_rej_${Date.now()}`,
    sender: "orchestrator",
    text: `❌ הצעת העריכה עבור "${proposal.targetTitle}" נדחתה לבקשתך ולא יושמה באתר.`,
    timestamp: new Date().toLocaleTimeString("he-IL", { hour12: false }),
  });

  return { success: true, message: "ההצעה נדחתה" };
}
