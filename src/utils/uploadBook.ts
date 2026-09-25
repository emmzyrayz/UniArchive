// src/utils/uploadBook.ts
// The browser side of a book upload, shared by the upload page and the
// offline upload queue:
// 1. Ask the server for a signed upload (Cloudinary up to 10 MB, B2 above)
// 2. Upload the file straight to storage
// 3. Create the book record

/** Optional academic context stored with the book (ids from the profile). */
export interface BookAcademicDetails {
  universityId?: string;
  facultyId?: string;
  departmentId?: string;
  level?: string;
  semester?: string;
}

export interface UploadDetails extends BookAcademicDetails {
  title: string;
  description?: string;
  tags: string[];
}

/** An upload failure, with the HTTP status when the server gave one. */
export class UploadError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new UploadError(
      (data as { message?: string }).message ?? "Upload failed. Please try again.",
      response.status,
    );
  }
  return data as T;
}

// fetch() can't report upload progress, so the PUT to storage uses XHR.
function putFileWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(
            new UploadError(`Storage rejected the upload (HTTP ${xhr.status}).`, xhr.status),
          );
    xhr.onerror = () => reject(new Error("Network error while uploading the file."));
    xhr.send(file);
  });
}

// Multipart POST straight to Cloudinary, with the fields signed by presign.
function postFormWithProgress(
  url: string,
  fields: Record<string, string>,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) form.append(name, value);
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let message = `Storage rejected the upload (HTTP ${xhr.status}).`;
      try {
        const data = JSON.parse(xhr.responseText) as { error?: { message?: string } };
        if (data.error?.message) message = data.error.message;
      } catch {
        // keep the generic message
      }
      reject(new UploadError(message, xhr.status));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading the file."));
    xhr.send(form);
  });
}

type PresignResponse =
  | {
      provider: "cloudinary";
      uploadUrl: string;
      fields: Record<string, string>;
      publicId: string;
    }
  | { provider: "backblaze"; uploadUrl: string; storageKey: string };

/** Uploads a PDF and creates its book record. */
export async function uploadBook(
  file: File,
  form: UploadDetails,
  onProgress: (percent: number) => void,
): Promise<void> {
  const presign = await postJson<PresignResponse>("/api/upload/presign", {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });
  const details = {
    title: form.title.trim(),
    description: (form.description ?? "").trim(),
    tags: form.tags,
    universityId: form.universityId,
    facultyId: form.facultyId,
    departmentId: form.departmentId,
    level: form.level,
    semester: form.semester,
  };

  // Keep the last few percent for the record-creation step
  if (presign.provider === "cloudinary") {
    await postFormWithProgress(presign.uploadUrl, presign.fields, file, (p) =>
      onProgress(p * 0.95),
    );
    await postJson("/api/upload/finalize", {
      ...details,
      publicId: presign.publicId,
    });
  } else {
    await putFileWithProgress(presign.uploadUrl, file, (p) => onProgress(p * 0.95));
    await postJson("/api/books", {
      ...details,
      storageKey: presign.storageKey,
      fileSize: file.size,
      mimeType: file.type,
    });
  }
  onProgress(100);
}
