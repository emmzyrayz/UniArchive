import {Editor} from "@tiptap/core";

declare global {
  interface Window {
    editor: Editor;
  }
}

declare module "*.mp4" {
  const src: string;
  export default src;
}
