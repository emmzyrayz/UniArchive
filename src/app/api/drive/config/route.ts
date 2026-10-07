// GET /api/drive/config
// What the browser needs to open the Google Picker ("From my Drive" in the
// import dialog): the OAuth client id (the same one as Google sign-in), the
// Picker API key and the Cloud project number. All three are public by
// design (they're in the page either way); `picker` is null until set up.
// Also says whether public link import is available. Signed in only.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const apiKey = process.env.GOOGLE_PICKER_API_KEY?.trim();
    const appId = process.env.GOOGLE_CLOUD_PROJECT_NUMBER?.trim();
    return NextResponse.json({
      picker: clientId && apiKey && appId ? { clientId, apiKey, appId } : null,
      links: !!process.env.GOOGLE_DRIVE_API_KEY?.trim(),
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/drive/config");
  }
}
