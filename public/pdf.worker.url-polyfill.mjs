// Polyfills for the pdf.js worker, which has its own global scope and doesn't
// see the page's polyfills (src/app/layout.tsx has the same ones):
//  - Uint8Array.prototype.toHex / Uint8Array.fromHex (ES2024)
//  - URL.parse (Chrome < 126: Android 10 WebView, Kiwi Browser, forks)
// Kept in its own module so the wrapper can import it before the real
// worker: imports are hoisted, so code in the wrapper's body would run
// only after pdf.worker.min.mjs had already been evaluated.
if (typeof Uint8Array !== "undefined") {
  if (typeof Uint8Array.prototype.toHex !== "function") {
    Object.defineProperty(Uint8Array.prototype, "toHex", {
      value: function () {
        let out = "";
        for (let i = 0; i < this.length; i++) {
          out += (this[i] < 16 ? "0" : "") + this[i].toString(16);
        }
        return out;
      },
      writable: true,
      configurable: true,
      enumerable: false,
    });
  }
  if (typeof Uint8Array.fromHex !== "function") {
    Object.defineProperty(Uint8Array, "fromHex", {
      value: function (hex) {
        if (typeof hex !== "string") throw new TypeError("fromHex expects a string");
        if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
          throw new SyntaxError("Invalid hex string");
        }
        const arr = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
        }
        return arr;
      },
      writable: true,
      configurable: true,
      enumerable: false,
    });
  }
}

if (typeof URL.parse !== "function") {
  URL.parse = function (url, base) {
    try {
      return new URL(url, base);
    } catch (e) {
      return null;
    }
  };
}
