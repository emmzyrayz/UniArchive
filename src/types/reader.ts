// types/reader.ts
// Reader annotations as the client and the API exchange them (dates as ISO
// strings). Highlight boxes are percentages of the page, so they line up at
// any zoom level or screen size.
export interface Highlight {
  id: string;
  pageNumber: number;
  /** % from the page's left edge */
  x: number;
  /** % from the page's top edge */
  y: number;
  /** % of the page width */
  width: number;
  /** % of the page height */
  height: number;
  /** Text under the box, read from the PDF text layer ("" for scans/images) */
  text: string;
  /** Hex colour, e.g. "#FFEB3B" */
  color: string;
  note?: string;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  pageNumber: number;
  label?: string;
  scrollPosition?: number;
  createdAt: string;
}

export interface Annotations {
  highlights: Highlight[];
  bookmarks: Bookmark[];
}
