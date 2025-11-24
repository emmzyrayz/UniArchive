declare module "lowlight/lib/core" {
  const lowlight: any;
  export {lowlight};
}

declare module "highlight.js/lib/languages/css" {
  const css: any;
  export default css;
}

declare module "highlight.js/lib/languages/javascript" {
  const js: any;
  export default js;
}

declare module "highlight.js/lib/languages/typescript" {
  const ts: any;
  export default ts;
}
