// public/sw-sync.js
// Loaded into the generated service worker via workboxOptions.importScripts.
// The upload queue lives in page code (src/utils/uploadQueue.ts), so on a
// background sync the worker just asks open pages to process it. With no page
// open, the queue is processed the next time the library is opened.
self.addEventListener("sync", (event) => {
  if (event.tag !== "upload-sync") return;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "PROCESS_UPLOAD_QUEUE" });
        });
      }),
  );
});
