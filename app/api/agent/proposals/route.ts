import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/security/firewall";
import {
  getEditProposals,
  getPendingEditProposals,
  approveProposal,
  rejectProposal,
  createEditProposal,
} from "@/lib/agent/proposal-engine";

export async function GET(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה" }, { status: 403 });
    }

    const proposals = getEditProposals();
    const pending = getPendingEditProposals();

    return NextResponse.json({
      success: true,
      proposals,
      pendingCount: pending.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load proposals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה" }, { status: 403 });
    }

    const body = await req.json();
    const { action, proposalId, reason, proposal } = body;

    if (action === "approve") {
      if (!proposalId) {
        return NextResponse.json({ error: "Missing proposalId" }, { status: 400 });
      }
      const result = await approveProposal(proposalId);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    if (action === "reject") {
      if (!proposalId) {
        return NextResponse.json({ error: "Missing proposalId" }, { status: 400 });
      }
      const result = rejectProposal(proposalId, reason);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    if (action === "create") {
      if (!proposal || !proposal.targetId || !proposal.targetTitle || !proposal.diff) {
        return NextResponse.json({ error: "Invalid proposal data" }, { status: 400 });
      }
      const created = createEditProposal(proposal);
      return NextResponse.json({ success: true, proposal: created });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Proposal action failed" }, { status: 500 });
  }
}
