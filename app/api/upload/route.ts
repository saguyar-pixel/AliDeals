import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { verifyAdminAccess } from "@/lib/security/firewall";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 100% Cloud-Only Media Upload to Supabase Storage ('review-assets' bucket)
 * Strictly zero local filesystem / /public/uploads dependencies.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Security Check: Admin Access Authorization
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: אין הרשאת מנהל." }, { status: 403 });
    }

    const client = getSupabaseServerClient();
    if (!client) {
      return NextResponse.json(
        { error: "שרת ה-Supabase אינו מוגדר כראוי או חסרים מפתחות גישה." },
        { status: 503 }
      );
    }

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const altText = (formData.get("altText") as string) || "";
    const folder = (formData.get("folder") as string) || "reviews";

    if (!file) {
      return NextResponse.json({ error: "לא נבחר קובץ להעלאה" }, { status: 400 });
    }

    // 3. Validate Mime Type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `סוג קובץ לא נתמך (${file.type}). נתמכים: WebP, PNG, JPG, GIF.` },
        { status: 400 }
      );
    }

    // 4. File Size Limit (Max 8MB)
    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "גודל הקובץ חורג מהמגבלה המותרת (עד 8MB)." },
        { status: 400 }
      );
    }

    // 5. Ensure Bucket Exists
    const bucketName = "review-assets";
    try {
      const { data: buckets } = await client.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === bucketName || b.id === bucketName);
      if (!bucketExists) {
        await client.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: maxSize,
          allowedMimeTypes: allowedTypes,
        });
      }
    } catch {
      // Bucket might already exist or service role has direct access
    }

    // 6. Generate Clean, Collision-Free File Path
    const ext = file.name.split(".").pop()?.toLowerCase() || "webp";
    const cleanFileName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const uniqueId = Math.random().toString(36).substring(2, 9);
    const filePath = `${folder}/${Date.now()}_${cleanFileName}_${uniqueId}.${ext}`;

    // 7. Convert File to Buffer and Upload Directly to Cloud
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await client.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "31536000", // 1 year CDN cache
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase Storage upload error:", uploadError);
      return NextResponse.json(
        { error: `שגיאה בהעלאת הקובץ ל-Supabase Storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 8. Retrieve Public CDN URL
    const { data: publicUrlData } = client.storage
      .from(bucketName)
      .getPublicUrl(uploadData.path || filePath);

    const publicUrl = publicUrlData.publicUrl;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: filePath,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      altText,
      message: "התמונה הועלתה בהצלחה ל-Supabase Storage וזמינה לצפייה פומבית ב-CDN!",
    });
  } catch (err: any) {
    console.error("POST /api/upload exception:", err);
    return NextResponse.json(
      { error: err?.message || "שגיאה בלתי צפויה בהעלאת המדיה" },
      { status: 500 }
    );
  }
}
