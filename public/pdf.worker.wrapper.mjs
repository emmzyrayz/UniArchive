// PDF.js worker entry point. Module imports evaluate in order, so the
// polyfill is installed before the real worker runs.
import "./pdf.worker.url-polyfill.mjs";
import "./pdf.worker.min.mjs";
