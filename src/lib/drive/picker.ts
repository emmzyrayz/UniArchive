// src/lib/drive/picker.ts (browser only)
// "From my Drive": a short-lived Google token for the drive.file scope
// (Google Identity Services, popup, nothing stored) and the Google Picker,
// where the person picks PDFs (several at once, folders browsable). With
// drive.file, UniArchive can only open the files picked here: no folder
// listing, so no restricted-scope security assessment.

export interface PickerConfig {
  clientId: string;
  apiKey: string;
  appId: string;
}

export interface PickedFile {
  id: string;
  name: string;
  size?: number;
  resourceKey?: string;
}

const SCOPE = "https://www.googleapis.com/auth/drive.file";

// The parts of Google's globals we use
interface TokenResponse {
  access_token?: string;
  error?: string;
}
interface GoogleGlobal {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (r: TokenResponse) => void;
        error_callback?: (e: { type?: string }) => void;
      }): { requestAccessToken(options?: { prompt?: string }): void };
    };
  };
  picker: {
    PickerBuilder: new () => PickerBuilder;
    DocsView: new (viewId?: string) => DocsView;
    ViewId: { DOCS: string };
    Feature: { MULTISELECT_ENABLED: string; SUPPORT_DRIVES: string };
    Action: { PICKED: string; CANCEL: string };
  };
}
interface DocsView {
  setMimeTypes(types: string): DocsView;
  setIncludeFolders(include: boolean): DocsView;
  setSelectFolderEnabled(enabled: boolean): DocsView;
  setMode?(mode: string): DocsView;
}
interface PickerBuilder {
  setAppId(id: string): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  addView(view: DocsView): PickerBuilder;
  enableFeature(feature: string): PickerBuilder;
  setTitle(title: string): PickerBuilder;
  setMaxItems(n: number): PickerBuilder;
  setCallback(cb: (data: PickerData) => void): PickerBuilder;
  build(): { setVisible(visible: boolean): void };
}
interface PickerData {
  action: string;
  docs?: { id: string; name: string; mimeType: string; sizeBytes?: number | string; resourceKey?: string }[];
}
declare global {
  interface Window {
    google?: GoogleGlobal;
    gapi?: { load(name: string, cb: () => void): void };
  }
}

const loaded = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  let p = loaded.get(src);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loaded.delete(src);
        reject(new Error("Couldn't load Google's file picker. Check your connection."));
      };
      document.head.appendChild(s);
    });
    loaded.set(src, p);
  }
  return p;
}

async function loadPicker(): Promise<GoogleGlobal> {
  await Promise.all([loadScript("https://accounts.google.com/gsi/client"), loadScript("https://apis.google.com/js/api.js")]);
  await new Promise<void>((resolve) => window.gapi!.load("picker", resolve));
  return window.google!;
}

/** Asks Google for a drive.file token (a popup the first time). */
export async function requestDriveToken(config: PickerConfig): Promise<string> {
  const google = await loadPicker();
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: config.clientId,
      scope: SCOPE,
      callback: (r) => (r.access_token ? resolve(r.access_token) : reject(new Error("Google didn't give access. Try again."))),
      error_callback: (e) =>
        reject(new Error(e.type === "popup_closed" ? "The Google window was closed." : "Couldn't open the Google sign-in window. Allow pop-ups for this site.")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}

/** Opens the Picker; resolves with the picked PDFs, or null if cancelled. */
export async function pickDriveFiles(config: PickerConfig, token: string, max: number): Promise<PickedFile[] | null> {
  const google = await loadPicker();
  const { picker } = google;
  return new Promise((resolve) => {
    const view = new picker.DocsView(picker.ViewId.DOCS)
      .setMimeTypes("application/pdf")
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false);
    new picker.PickerBuilder()
      .setAppId(config.appId)
      .setOAuthToken(token)
      .setDeveloperKey(config.apiKey)
      .setTitle("Choose PDFs to import")
      .addView(view)
      .enableFeature(picker.Feature.MULTISELECT_ENABLED)
      .enableFeature(picker.Feature.SUPPORT_DRIVES)
      .setMaxItems(max)
      .setCallback((data) => {
        if (data.action === picker.Action.PICKED) {
          resolve(
            (data.docs ?? [])
              .filter((d) => d.mimeType === "application/pdf")
              .map((d) => ({
                id: d.id,
                name: d.name,
                ...(d.sizeBytes !== undefined && { size: Number(d.sizeBytes) }),
                ...(d.resourceKey && { resourceKey: d.resourceKey }),
              })),
          );
        } else if (data.action === picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build()
      .setVisible(true);
  });
}
