// POST /api/drive/scan  { url, target: "library" | "platform" }
// Reads a Google Drive link shared "Anyone with the link" and lists the PDFs
// in it (a folder and up to 3 levels of subfolders, 500 files; or the one
// file), marking ones this owner imported before. Nothing is imported here:
// the dialog then imports the chosen files one by one (./import).
// library: anyone who may upload; platform: staff (material.ingest).
import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { parseDriveUrl } from "@/lib/drive/urls";
import { DriveError, FOLDER_MIME, getMeta, isPdf, listPdfs } from "@/lib/drive/api";
import { authorizeTarget, importedBefore, publicLinkKey } from "@/lib/drive/routeAccess";

export interface DriveScanFile {
  id: string;
  name: string;
  size?: number;
  resourceKey?: string;
  folderPath: string;
  importedBefore: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<{ url: string; target: string }>(request);
    const { session, target } = await authorizeTarget(request, body?.target);
    await enforceRateLimit(request, "driveScan", `drive-scan:${session.userId}`);
    const ref = typeof body?.url === "string" ? parseDriveUrl(body.url) : null;
    if (!ref) {
      return NextResponse.json(
        { message: "That isn't a Google Drive link. Paste the link from Drive's Share > Copy link." },
        { status: 400 },
      );
    }
    const auth = { apiKey: publicLinkKey() };

    try {
      const meta = await getMeta(ref.id, auth, ref.resourceKey);
      let files: Omit<DriveScanFile, "importedBefore">[];
      let truncated = false;
      if (meta.mimeType === FOLDER_MIME) {
        const listing = await listPdfs(meta.id, auth, { resourceKey: ref.resourceKey ?? meta.resourceKey });
        files = listing.files.map((f) => ({ id: f.id, name: f.name, size: f.size, resourceKey: f.resourceKey, folderPath: f.folderPath }));
        truncated = listing.truncated;
      } else if (isPdf(meta)) {
        files = [{ id: meta.id, name: meta.name, size: meta.size, resourceKey: ref.resourceKey ?? meta.resourceKey, folderPath: "" }];
      } else {
        return NextResponse.json({ message: `"${meta.name}" isn't a PDF. Only PDFs can be imported.` }, { status: 400 });
      }

      const before = await importedBefore(target === "library" ? session.userId : "platform", files.map((f) => f.id));
      return NextResponse.json(
        {
          kind: meta.mimeType === FOLDER_MIME ? "folder" : "file",
          name: meta.name,
          truncated,
          files: files.map((f) => ({ ...f, importedBefore: before.has(f.id) })),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      if (error instanceof DriveError) {
        return NextResponse.json({ message: error.message }, { status: error.status === 401 ? 403 : error.status });
      }
      throw error;
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/drive/scan");
  }
}
