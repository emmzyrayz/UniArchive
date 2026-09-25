// src/lib/cloudinary.ts
// Cloudinary storage for small PDFs (see CLOUDINARY_MAX_SIZE). Files are uploaded as
// `type: "authenticated"` image resources, so every delivery URL must be
// signed by the server, and Cloudinary can render any single page as an image
// for browsers too old to run pdf.js.
//
// Like the B2 flow, the browser uploads straight to Cloudinary with a signed
// request, so files never pass through a Next.js function.
import { v2 as cloudinary } from "cloudinary";
import { escapeRegex } from "@/lib/escapeRegex";

const REQUIRED_ENV = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

let configured = false;

// Configured on first use so importing this module never throws when the
// variables are missing (e.g. during `next build`).
function client(): typeof cloudinary {
  if (!configured) {
    const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variable(s): ${missing.join(", ")}`,
      );
    }
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
      api_key: process.env.CLOUDINARY_API_KEY!,
      api_secret: process.env.CLOUDINARY_API_SECRET!,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export interface CloudinarySignedUpload {
  uploadUrl: string;
  publicId: string;
  /** Form fields the browser must send alongside `file`, unchanged. */
  fields: Record<string, string>;
}

/**
 * Signs a direct browser upload for one PDF at a server-chosen public ID.
 * Every field in `fields` is covered by the signature, so the client can't
 * change the destination, access type or accepted format.
 */
export function createSignedPdfUpload(publicId: string): CloudinarySignedUpload {
  const c = client();
  const { cloud_name, api_key, api_secret } = c.config();
  const params = {
    public_id: publicId,
    type: "authenticated",
    allowed_formats: "pdf",
    timestamp: Math.floor(Date.now() / 1000),
  };
  const signature = c.utils.api_sign_request(params, api_secret!);

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
    publicId,
    fields: {
      public_id: params.public_id,
      type: params.type,
      allowed_formats: params.allowed_formats,
      timestamp: String(params.timestamp),
      api_key: api_key!,
      signature,
    },
  };
}

export interface CloudinaryPdfInfo {
  publicId: string;
  secureUrl: string;
  bytes: number;
  format: string;
  pageCount: number;
}

/** Looks up an uploaded PDF. Returns null when it doesn't exist. */
export async function getCloudinaryPdf(
  publicId: string,
): Promise<CloudinaryPdfInfo | null> {
  try {
    const result = await client().api.resource(publicId, {
      resource_type: "image",
      type: "authenticated",
      pages: true,
    });
    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      bytes: result.bytes ?? 0,
      format: result.format ?? "",
      pageCount: result.pages ?? 1,
    };
  } catch (error) {
    const e = error as { error?: { http_code?: number }; http_code?: number };
    if (e.error?.http_code === 404 || e.http_code === 404) return null;
    throw error;
  }
}

/**
 * Signed URL for one page (1-indexed) as an optimized image: auto format
 * (WebP/AVIF where supported), auto quality, at most 1200px wide.
 */
export function getCloudinaryPageImageUrl(
  publicId: string,
  pageNumber: number,
): string {
  return client().url(publicId, {
    resource_type: "image",
    type: "authenticated",
    sign_url: true,
    page: pageNumber,
    format: "jpg", // delivery extension; f_auto still picks the best format
    fetch_format: "auto",
    quality: "auto:good",
    width: 1200,
    crop: "limit",
  });
}

/** Signed URL for the original PDF, for browsers that run pdf.js. */
export function getCloudinaryPdfUrl(publicId: string): string {
  return client().url(publicId, {
    resource_type: "image",
    type: "authenticated",
    sign_url: true,
    format: "pdf",
  });
}

/** Deletes a PDF. A resource that's already gone counts as deleted. */
export async function deleteCloudinaryPdf(
  publicId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await client().uploader.destroy(publicId, {
      resource_type: "image",
      type: "authenticated",
      invalidate: true,
    });
    if (result.result === "ok" || result.result === "not found") {
      return { success: true };
    }
    return { success: false, error: `Cloudinary destroy: ${result.result}` };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}

// ---------------------------------------------------------------------------
// Avatars
// ---------------------------------------------------------------------------

/** Folder that holds one user's avatar. The public ID inside it is fixed. */
export function avatarFolder(userId: string): string {
  return `uniarchive/avatars/${userId}`;
}

const AVATAR_PUBLIC_ID = "avatar";

/**
 * Signs a direct browser upload for a user's avatar. Unlike PDFs, avatars are
 * public (`type: "upload"`) so they can be shown without signing each URL.
 * The incoming transformation crops to a 400x400 face-centred square before
 * storage, and `overwrite` + `invalidate` replace the old avatar and purge it
 * from the CDN.
 */
export function createSignedAvatarUpload(userId: string): CloudinarySignedUpload {
  const c = client();
  const { cloud_name, api_key, api_secret } = c.config();
  const params = {
    folder: avatarFolder(userId),
    public_id: AVATAR_PUBLIC_ID,
    type: "upload",
    allowed_formats: "jpg,jpeg,png,webp,heic",
    // Stored as JPEG so HEIC uploads display everywhere; next/image picks
    // WebP/AVIF at delivery. (f_auto can't be applied at upload time.)
    format: "jpg",
    transformation: "c_fill,g_face,h_400,w_400,q_auto:good",
    overwrite: "true",
    invalidate: "true",
    timestamp: Math.floor(Date.now() / 1000),
  };
  const signature = c.utils.api_sign_request(params, api_secret!);

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
    publicId: `${params.folder}/${params.public_id}`,
    fields: {
      ...params,
      timestamp: String(params.timestamp),
      api_key: api_key!,
      signature,
    },
  };
}

/**
 * True when `url` is an avatar this server signed for `userId`: a delivery
 * URL on our cloud, inside that user's avatar folder. Stops a client from
 * pointing profilePhoto at an arbitrary image.
 */
export function isOwnAvatarUrl(url: string, userId: string): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return false;
  const pattern = new RegExp(
    `^https://res\\.cloudinary\\.com/${escapeRegex(cloudName)}/image/upload/` +
      `(?:v\\d+/)?${escapeRegex(avatarFolder(userId))}/${AVATAR_PUBLIC_ID}\\.[a-z0-9]+$`,
    "i",
  );
  return pattern.test(url);
}
