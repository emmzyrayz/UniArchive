// components/unilibrary/CommentSection.tsx
// The discussion under a material card, opened from its "comments" toggle.
// Top-level comments with one level of replies, newest or top first,
// upvotes, report, and edit (15 minutes) / delete for your own comments.
// User admins can delete anyone's.
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowUp } from "react-icons/fi";
import { useUser } from "@/context/userContext";
import { can } from "@/lib/auth/permissions";
import {
  COMMENT_COUNTER_FROM,
  COMMENT_EDIT_WINDOW_MS,
  COMMENT_MAX_LENGTH,
} from "@/lib/constants/comments";
import { initialsOf } from "@/components/profile/profileUi";
import { timeAgo } from "@/components/admin/reviewShared";
import type { CommentDto, CommentsResponse } from "@/types/comments";

type Sort = "newest" | "top";

const PAGE_SIZE = 20;
const smallButton = "text-xs font-medium text-neutral-500 hover:text-primary disabled:opacity-50";

async function request<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!res.ok) throw new Error(data?.message ?? `Request failed (HTTP ${res.status}).`);
  return data as T;
}

function Avatar({ name, photo }: { name: string; photo?: string }) {
  return (
    <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-primary/15 text-[10px] font-bold text-primary">
      {photo ? (
        <Image src={photo} alt="" fill sizes="28px" className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center">{initialsOf(name)}</span>
      )}
    </div>
  );
}

/** Textarea that grows with its text, with a counter near the limit. */
function Composer({
  label,
  initialText = "",
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  label?: string;
  initialText?: string;
  submitLabel: string;
  onSubmit: (text: string) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  const trimmed = text.trim();
  const tooLong = trimmed.length > COMMENT_MAX_LENGTH;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed || tooLong) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-1.5">
      {label && <p className="text-xs text-text-muted">{label}</p>}
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={1}
        autoFocus={autoFocus}
        placeholder="Write a comment..."
        aria-label={label ?? "Write a comment"}
        className="w-full resize-none overflow-hidden rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="flex items-center justify-end gap-2">
        {text.length > COMMENT_COUNTER_FROM && (
          <span className={`mr-auto text-xs ${tooLong ? "text-red-600 dark:text-red-400" : "text-text-muted"}`}>
            {trimmed.length}/{COMMENT_MAX_LENGTH}
          </span>
        )}
        {error && <span className="mr-auto text-xs text-red-600 dark:text-red-400">{error}</span>}
        {onCancel && (
          <button type="button" onClick={onCancel} className={smallButton}>
            Cancel
          </button>
        )}
        {trimmed && (
          <button
            type="submit"
            disabled={busy || tooLong}
            className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Posting…" : submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}

interface ItemHandlers {
  onReply?: () => void;
  onChange: (updated: CommentDto) => void;
  onDeleted: (updated: CommentDto) => void;
}

function CommentItem({
  materialId,
  comment: c,
  isReply,
  replying,
  handlers,
}: {
  materialId: string;
  comment: CommentDto;
  isReply: boolean;
  replying?: boolean;
  handlers: ItemHandlers;
}) {
  const { hasActiveSession, userProfile } = useUser();
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete" | "confirmReport">("view");
  const [reported, setReported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/materials/${materialId}/comments/${c.id}`;

  if (c.isDeleted) {
    return <p className="py-1 text-sm italic text-text-muted">[deleted]</p>;
  }

  const isOwn = !!userProfile && c.author?.upid === userProfile.upid;
  const canModerate = !!userProfile && can(userProfile.role, "manage_users");
  // Re-checked on each render; the server enforces the window regardless
  // eslint-disable-next-line react-hooks/purity
  const canEdit = isOwn && Date.now() - new Date(c.createdAt).getTime() < COMMENT_EDIT_WINDOW_MS;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const toggleUpvote = () =>
    run(async () => {
      const before = c;
      // Show it straight away; the server's count settles it
      handlers.onChange({
        ...c,
        upvotedByMe: !c.upvotedByMe,
        upvoteCount: Math.max(0, c.upvoteCount + (c.upvotedByMe ? -1 : 1)),
      });
      try {
        const data = await request<{ upvoted: boolean; upvoteCount: number }>(`${base}/upvote`, "POST");
        handlers.onChange({ ...c, upvotedByMe: data.upvoted, upvoteCount: data.upvoteCount });
      } catch (err) {
        handlers.onChange(before);
        throw err;
      }
    });

  return (
    <div className="flex gap-2.5">
      <Avatar name={c.author?.name ?? "?"} photo={c.author?.profilePhoto} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-muted">
          <Link href={`/profile/${encodeURIComponent(c.author?.upid ?? "")}`} className="font-medium text-text-secondary hover:underline">
            @{c.author?.upid}
          </Link>{" "}
          · {timeAgo(c.createdAt)}
          {c.editedAt && " · edited"}
          {isReply && <span aria-label="reply"> ↩</span>}
        </p>

        {mode === "edit" ? (
          <div className="mt-1">
            <Composer
              initialText={c.text}
              submitLabel="Save"
              autoFocus
              onCancel={() => setMode("view")}
              onSubmit={async (text) => {
                const { comment } = await request<{ comment: CommentDto }>(base, "PATCH", { text });
                handlers.onChange({ ...c, text: comment.text, editedAt: comment.editedAt });
                setMode("view");
              }}
            />
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-line break-words text-sm text-text-primary">{c.text}</p>
        )}

        {mode === "confirmDelete" ? (
          <p className="mt-1.5 flex items-center gap-3 text-xs">
            <span className="text-text-secondary">Delete this comment?</span>
            <button
              type="button"
              disabled={busy}
              className="font-semibold text-red-600 dark:text-red-400"
              onClick={() =>
                run(async () => {
                  const { comment } = await request<{ comment: CommentDto | null }>(base, "DELETE");
                  handlers.onDeleted(comment ?? { ...c, isDeleted: true, author: null, text: "[deleted]" });
                })
              }
            >
              Delete
            </button>
            <button type="button" className={smallButton} onClick={() => setMode("view")}>
              Cancel
            </button>
          </p>
        ) : mode === "confirmReport" ? (
          <p className="mt-1.5 flex items-center gap-3 text-xs">
            <span className="text-text-secondary">Report this comment to the moderators?</span>
            <button
              type="button"
              disabled={busy}
              className="font-semibold text-red-600 dark:text-red-400"
              onClick={() =>
                run(async () => {
                  await request(`${base}/report`, "POST");
                  setReported(true);
                  setMode("view");
                })
              }
            >
              Report
            </button>
            <button type="button" className={smallButton} onClick={() => setMode("view")}>
              Cancel
            </button>
          </p>
        ) : (
          mode === "view" && (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {hasActiveSession && !isOwn ? (
                <button
                  type="button"
                  onClick={toggleUpvote}
                  disabled={busy}
                  aria-pressed={!!c.upvotedByMe}
                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                    c.upvotedByMe ? "text-primary" : "text-neutral-500 hover:text-primary"
                  }`}
                >
                  <FiArrowUp aria-hidden /> {c.upvoteCount}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                  <FiArrowUp aria-hidden /> {c.upvoteCount}
                </span>
              )}
              {handlers.onReply && hasActiveSession && (
                <button type="button" onClick={handlers.onReply} className={smallButton} aria-expanded={replying}>
                  Reply
                </button>
              )}
              {canEdit && (
                <button type="button" onClick={() => setMode("edit")} className={smallButton}>
                  Edit
                </button>
              )}
              {(isOwn || canModerate) && (
                <button type="button" onClick={() => setMode("confirmDelete")} className={smallButton}>
                  Delete
                </button>
              )}
              {hasActiveSession && !isOwn &&
                (reported ? (
                  <span className="text-xs text-text-muted">Reported</span>
                ) : (
                  <button type="button" onClick={() => setMode("confirmReport")} className={smallButton}>
                    Report
                  </button>
                ))}
            </div>
          )
        )}
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}

type Loaded = { key: string; data: CommentsResponse } | { key: string; error: string };

export function CommentSection({
  materialId,
  isAuthenticated,
  onCountChange,
}: {
  materialId: string;
  isAuthenticated: boolean;
  /** +1 / -1 as comments are posted or deleted, for the card's count */
  onCountChange: (delta: number) => void;
}) {
  const pathname = usePathname();
  const [sort, setSort] = useState<Sort>("newest");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [comments, setComments] = useState<{ key: string; list: CommentDto[] }>({ key: "", list: [] });
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const base = `/api/materials/${materialId}/comments`;
  const key = `${materialId}:${sort}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${base}?sort=${sort}&limit=${PAGE_SIZE}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
        setLoaded({ key, data: data as CommentsResponse });
        setComments({ key, list: (data as CommentsResponse).comments });
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setLoaded({ key, error: error.message || "Couldn't load comments." });
      });
    return () => controller.abort();
  }, [base, sort, key]);

  const current = loaded?.key === key ? loaded : null;
  const list = comments.key === key ? comments.list : [];
  const meta = current && "data" in current ? current.data : null;

  /** Applies `fn` to the comment with `id`, wherever it is in the thread. */
  const update = (id: string, fn: (c: CommentDto) => CommentDto | null) =>
    setComments((prev) => ({
      key: prev.key,
      list: prev.list.flatMap((c) => {
        if (c.id === id) {
          const next = fn(c);
          return next ? [next] : [];
        }
        if (!c.replies?.some((r) => r.id === id)) return [c];
        return [
          {
            ...c,
            replies: c.replies.flatMap((r) => {
              if (r.id !== id) return [r];
              const next = fn(r);
              return next ? [next] : [];
            }),
          },
        ];
      }),
    }));

  const loadMore = async () => {
    if (!meta || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = Math.floor(list.length / PAGE_SIZE) + 1;
      const data = await request<CommentsResponse>(`${base}?sort=${sort}&limit=${PAGE_SIZE}&page=${page}`);
      setComments((prev) => ({
        key: prev.key,
        list: [...prev.list, ...data.comments.filter((c) => !prev.list.some((p) => p.id === c.id))],
      }));
      setLoaded({ key, data: { ...data } });
    } catch (error) {
      console.warn("Couldn't load more comments:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const showAllReplies = async (parent: CommentDto) => {
    try {
      const data = await request<CommentsResponse>(`${base}?parentId=${parent.id}&limit=50`);
      update(parent.id, (c) => ({ ...c, replies: data.comments }));
    } catch (error) {
      console.warn("Couldn't load replies:", error);
    }
  };

  const onDeleted = (deleted: CommentDto, parentId: string | null) => {
    onCountChange(-1);
    if (parentId) {
      // A deleted reply disappears; its parent has one reply fewer
      update(parentId, (p) => ({
        ...p,
        replyCount: Math.max(0, p.replyCount - 1),
        replies: p.replies?.filter((r) => r.id !== deleted.id),
      }));
    } else {
      // A deleted comment stays as a placeholder only if it has replies
      update(deleted.id, (c) => (c.replyCount > 0 ? { ...deleted, replies: c.replies, replyCount: c.replyCount } : null));
    }
  };

  return (
    <section className="mt-3 space-y-4 border-t border-neutral-100 pt-3 dark:border-neutral-700" aria-label="Comments">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Comments{meta ? ` (${meta.total})` : ""}
        </h4>
        <div className="flex gap-1" role="group" aria-label="Sort comments">
          {(["newest", "top"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              aria-pressed={sort === s}
              className={`rounded-md px-2 py-0.5 text-xs ${
                sort === s ? "bg-primary/10 font-semibold text-primary" : "text-text-muted hover:text-text-primary"
              }`}
            >
              {s === "newest" ? "Newest" : "Top"}
            </button>
          ))}
        </div>
      </div>

      {!current ? (
        <p className="text-sm text-text-muted">Loading comments…</p>
      ) : "error" in current ? (
        <p className="text-sm text-red-600 dark:text-red-400">{current.error}</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-text-muted">No comments yet. Start the discussion.</p>
      ) : (
        <ul className="space-y-4">
          {list.map((c) => (
            <li key={c.id} className="space-y-3">
              <CommentItem
                materialId={materialId}
                comment={c}
                isReply={false}
                replying={replyTo === c.id}
                handlers={{
                  onReply: () => setReplyTo((open) => (open === c.id ? null : c.id)),
                  onChange: (u) => update(c.id, (old) => ({ ...u, replies: old.replies })),
                  onDeleted: (d) => onDeleted(d, null),
                }}
              />
              {(c.replies?.length || replyTo === c.id || c.replyCount > (c.replies?.length ?? 0)) && (
                <div className="ml-9 space-y-3 border-l border-neutral-200 pl-3 dark:border-neutral-700">
                  {c.replies?.map((r) => (
                    <CommentItem
                      key={r.id}
                      materialId={materialId}
                      comment={r}
                      isReply
                      handlers={{
                        onChange: (u) => update(r.id, () => u),
                        onDeleted: (d) => onDeleted(d, c.id),
                      }}
                    />
                  ))}
                  {c.replyCount > (c.replies?.length ?? 0) && (
                    <button type="button" onClick={() => showAllReplies(c)} className={smallButton}>
                      Show all {c.replyCount} replies
                    </button>
                  )}
                  {replyTo === c.id && !c.isDeleted && (
                    <Composer
                      label={`Replying to @${c.author?.upid}`}
                      submitLabel="Reply"
                      autoFocus
                      onCancel={() => setReplyTo(null)}
                      onSubmit={async (text) => {
                        const { comment } = await request<{ comment: CommentDto }>(base, "POST", {
                          text,
                          parentId: c.id,
                        });
                        onCountChange(1);
                        update(c.id, (p) => ({
                          ...p,
                          replyCount: p.replyCount + 1,
                          replies: [...(p.replies ?? []), comment],
                        }));
                        setReplyTo(null);
                      }}
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {meta?.hasMore && list.length < meta.total && (
        <button type="button" onClick={loadMore} disabled={loadingMore} className={smallButton}>
          {loadingMore ? "Loading…" : "Load more comments"}
        </button>
      )}

      {isAuthenticated ? (
        <Composer
          submitLabel="Post"
          onSubmit={async (text) => {
            const { comment } = await request<{ comment: CommentDto }>(base, "POST", { text });
            onCountChange(1);
            setComments((prev) => ({ key: prev.key, list: [comment, ...prev.list] }));
          }}
        />
      ) : (
        <p className="text-sm text-text-muted">
          <Link href={`/auth?view=signin&from=${encodeURIComponent(pathname)}`} className="font-medium text-primary hover:underline">
            Sign in to comment
          </Link>
        </p>
      )}
    </section>
  );
}
