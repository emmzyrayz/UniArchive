// types/comments.ts
// A comment as GET /api/materials/[id]/comments returns it.

export interface CommentDto {
  id: string;
  parentId: string | null;
  depth: 0 | 1;
  /** null once deleted: the thread keeps its place, the author doesn't show */
  author: { upid: string; name: string; profilePhoto?: string } | null;
  /** "[deleted]" once deleted */
  text: string;
  isDeleted: boolean;
  upvoteCount: number;
  /** Only when the request was signed in */
  upvotedByMe?: boolean;
  replyCount: number;
  /** Top-level comments only: the first few replies, oldest first */
  replies?: CommentDto[];
  createdAt: string;
  editedAt?: string;
}

export interface CommentsResponse {
  comments: CommentDto[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}
