// POST /api/drive/import
//   { target: "library" | "platform", fileId, resourceKey?, accessToken? }
// Imports one Google Drive PDF (lib/drive/importFile.ts): one shared
// "Anyone with the link" (read with the server key), or, with accessToken,
// one the person picked in the Google Picker (their short-lived drive.file
// token, used for this file only and never stored or logged). It goes into
// the caller's library, or (staff) into the platform queue as an
// unidentified PDF. One file per request, so a big folder is imported by
// the browser one file at a time with progress, and each request stays
// inside the function time limit.
// Always 200 with { status: imported | duplicate | failed, ... } once the
// file was tried; 4xx/5xx only for the request itself (auth, limits).
import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError, readJson } from "@/lib/api";
import { importDriveFile } from "@/lib/drive/importFile";
import {
  authorizeTarget,
  enforceImportLimits,
  isAccessToken,
  isDriveId,
  isResourceKey,
  publicLinkKey,
} from "@/lib/drive/routeAccess";

// Streams up to 500 MB from Drive to storage
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<{ target: string; fileId: string; resourceKey: string; accessToken: string }>(request);
    const { session, target } = await authorizeTarget(request, body?.target);
    if (!isDriveId(body?.fileId)) {
      return NextResponse.json({ message: "fileId must be a Google Drive file id." }, { status: 400 });
    }
    const resourceKey = isResourceKey(body?.resourceKey) ? body.resourceKey : undefined;
    const picked = body?.accessToken !== undefined;
    if (picked && !isAccessToken(body?.accessToken)) {
      return NextResponse.json({ message: "accessToken isn't a Google access token." }, { status: 400 });
    }
    const auth = picked ? { accessToken: body!.accessToken as string } : { apiKey: publicLinkKey() };
    await enforceImportLimits(request, session, target);

    const result = await importDriveFile(
      target === "library"
        ? { kind: "library", owner: session }
        : { kind: "platform", uploader: session, source: "drive" },
      { fileId: body.fileId, resourceKey },
      auth,
      picked ? "picker" : "link",
    );
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "POST /api/drive/import");
  }
}
