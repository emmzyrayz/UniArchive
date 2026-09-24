// Polyfill URL.parse for browsers that don't have it
// (Android 10 WebView, Kiwi Browser, older Chrome forks — Chrome < 126).
// Kept in its own module so the wrapper can import it before the real
// worker: imports are hoisted, so code in the wrapper's body would run
// only after pdf.worker.min.mjs had already been evaluated.
if (typeof URL.parse !== "function") {
  URL.parse = function (url, base) {
    try {
      return new URL(url, base);
    } catch (e) {
      return null;
    }
  };
}
