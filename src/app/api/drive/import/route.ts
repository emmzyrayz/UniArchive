// POST /api/drive/import
//   { target: "library" | "platform", fileId, resourceKey? }
// Imports one Google Drive PDF shared "Anyone with the link"
// (lib/drive/importFile.ts): into the caller's library, or (staff) into the
// platform queue as an unidentified PDF. One file per request, so a big
// folder is imported by the browser one file at a time with progress, and
// each request stays inside the function time limit.
// Always 200 with { status: imported | duplicate | failed, ... } once the
// file was tried; 4xx/5xx only for the request itself (auth, limits).
import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError, readJson } from "@/lib/api";
import { importDriveFile } from "@/lib/drive/importFile";
import {
  authorizeTarget,
  enforceImportLimits,
  isDriveId,
  isResourceKey,
  publicLinkKey,
} from "@/lib/drive/routeAccess";

// Streams up to 500 MB from Drive to storage
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<{ target: string; fileId: string; resourceKey: string }>(request);
    const { session, target } = await authorizeTarget(request, body?.target);
    if (!isDriveId(body?.fileId)) {
      return NextResponse.json({ message: "fileId must be a Google Drive file id." }, { status: 400 });
    }
    const resourceKey = isResourceKey(body?.resourceKey) ? body.resourceKey : undefined;
    const auth = { apiKey: publicLinkKey() };
    await enforceImportLimits(request, session, target);

    const result = await importDriveFile(
      target === "library"
        ? { kind: "library", owner: session }
        : { kind: "platform", uploader: session, source: "drive" },
      { fileId: body.fileId, resourceKey },
      auth,
      "link",
    );
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "POST /api/drive/import");
  }
}
