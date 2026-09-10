import { NextRequest, NextResponse } from "next/server";
import { jsonDb } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { safeGitCommitAndPush } from "@/lib/security/safe-git";

export async function DELETE(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const slug = searchParams.get("slug");

    if (!id && !slug) {
      return NextResponse.json({ error: "חובה לציין מזהה עמוד או slug למחיקה" }, { status: 400 });
    }

    const pages = jsonDb.getPages();
    const filtered = pages.filter((p) => (id ? p.id !== id : p.slug !== slug));

    const { safeWriteJson } = await import("@/lib/agent/storage-helper");
    safeWriteJson("pages.json", filtered);

    safeGitCommitAndPush(`CMS Page Deleted: ${slug || id}`).catch(() => {});

    return NextResponse.json({ success: true, message: "העמוד נמחק בהצלחה" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete page" }, { status: 500 });
  }
}
