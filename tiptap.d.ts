import "@tiptap/extension-text-align";
import "@tiptap/extension-font-size";
import "@tiptap/extension-font-family";
import "@tiptap/extension-color";
import "@tiptap/extension-image";
import "@tiptap/extension-table";
import "@tiptap/extension-task-list";
import "@tiptap/extension-code-block-lowlight";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textAlign: {
      setTextAlign: (alignment: string) => ReturnType;
    };
    fontSize: {
      setFontSize: (size: string) => ReturnType;
    };
    fontFamily: {
      setFontFamily: (fontFamily: string) => ReturnType;
    };
    color: {
      setColor: (color: string) => ReturnType;
    };
    image: {
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
      }) => ReturnType;
    };
    table: {
      insertTable: (options?: {
        rows?: number;
        cols?: number;
        withHeaderRow?: boolean;
      }) => ReturnType;
      addColumnBefore: () => ReturnType;
      addColumnAfter: () => ReturnType;
      addRowBefore: () => ReturnType;
      addRowAfter: () => ReturnType;
      deleteColumn: () => ReturnType;
      deleteRow: () => ReturnType;
      deleteTable: () => ReturnType;
    };
    taskList: {
      toggleTaskList: () => ReturnType;
    };
    codeBlock: {
      toggleCodeBlock: (language?: string) => ReturnType;
    };
  }
}
