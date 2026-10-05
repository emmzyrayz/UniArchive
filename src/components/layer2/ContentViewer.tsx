// components/layer2/ContentViewer.tsx
// A material's typed notes (ContentDocuments), rendered with the shared
// BlockRenderer (KaTeX + DOMPurify). Several documents (chapters) get a
// chapter list: a sidebar on desktop, tabs on mobile. Collaborator+ can add
// notes; authors (or auditor+) edit, authors (or com_admin+) delete.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { useUser } from "@/context/userContext";
import { BlockRenderer } from "@/components/reader/BlockRenderer";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants/layer2";
import { timeAgo } from "@/components/admin/reviewShared";
import { adminRequest, secondaryButton } from "@/components/admin/adminUi";
import { roleHierarchy, type UserRole } from "@/types/roles";
import type { ContentDocumentDto } from "@/types/layer2";
import { ContentEditor } from "./ContentEditor";
import { ProfileHandle } from "@/components/profile/ProfileHandle";

const atLeast = (role: UserRole, min: UserRole) => roleHierarchy[role] >= roleHierarchy[min];

const chapterLabel = (d: ContentDocumentDto) =>
  d.chapterNumber !== undefined
    ? `Chapter ${d.chapterNumber}${d.chapterTitle ? `: ${d.chapterTitle}` : ""}`
    : d.title;

export function ContentViewer({
  materialId,
  onCountChange,
}: {
  materialId: string;
  onCountChange?: (count: number) => void;
}) {
  const { userProfile } = useUser();
  const [docs, setDocs] = useState<ContentDocumentDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ doc?: ContentDocumentDto } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminRequest<{ documents: ContentDocumentDto[] }>(`/api/materials/${materialId}/content`)
      .then((data) => {
        if (!cancelled) setDocs(data.documents);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "Couldn't load the notes.");
      });
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  const update = (next: ContentDocumentDto[]) => {
    setDocs(next);
    onCountChange?.(next.length);
  };

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!docs) return <p className="text-sm text-text-muted">Loading notes…</p>;

  const role = userProfile?.role;
  const canWrite = !!role && atLeast(role, "collaborator");

  if (editor) {
    return (
      <ContentEditor
        materialId={materialId}
        existing={editor.doc}
        onCancel={() => setEditor(null)}
        onSaved={(saved) => {
          setEditor(null);
          setSelectedId(saved.id);
          update(
            (editor.doc ? docs.map((d) => (d.id === saved.id ? saved : d)) : [...docs, saved]).sort(
              (a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0),
            ),
          );
        }}
      />
    );
  }

  const current = docs.find((d) => d.id === selectedId) ?? docs[0];
  const isAuthor = !!current && userProfile?.upid === current.createdByUpid;
  const mayEdit = !!role && !!current && (isAuthor || atLeast(role, "auditor"));
  const mayDelete = !!role && !!current && (isAuthor || atLeast(role, "com_admin"));

  const addButton = canWrite && (
    <button type="button" onClick={() => setEditor({})} className={`${secondaryButton} inline-flex items-center gap-1`}>
      <FiPlus aria-hidden /> Add notes
    </button>
  );

  if (docs.length === 0) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-text-muted">
          No typed notes yet.{" "}
          {canWrite
            ? "Write the first chapter so others can read it without the PDF."
            : "Collaborators and above can add typed notes."}
        </p>
        {addButton}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Typed notes ({docs.length})</h2>
        {addButton}
      </div>

      <div className={docs.length > 1 ? "grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]" : ""}>
        {docs.length > 1 && (
          <nav aria-label="Chapters" className="flex gap-1 overflow-x-auto border-b border-border lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:pr-3">
            {docs.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setSelectedId(d.id);
                  setConfirmDelete(false);
                }}
                aria-current={d.id === current?.id}
                className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm lg:whitespace-normal ${
                  d.id === current?.id ? "bg-primary/10 font-semibold text-primary" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {chapterLabel(d)}
              </button>
            ))}
          </nav>
        )}

        {current && (
          <article className="min-w-0 space-y-4">
            <header className="space-y-1 border-b border-border pb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {DOCUMENT_TYPE_LABELS[current.documentType]}
                {current.chapterNumber !== undefined && ` — ${chapterLabel(current)}`}
              </p>
              <h3 className="text-xl font-bold text-text-primary">{current.title}</h3>
              <p className="text-xs text-text-muted">
                by{" "}
                <ProfileHandle upid={current.createdByUpid} />{" "}
                · {current.lastEditedAt ? `last edited ${timeAgo(current.lastEditedAt)}` : `written ${timeAgo(current.createdAt)}`}
                {current.verificationTier && (
                  <span className="ml-2 rounded-full bg-green-500/10 px-2 py-0.5 font-semibold text-green-700 dark:text-green-400">
                    {current.verificationTier === "tier2" ? "⭐ Tier 2 endorsed" : "✓ Tier 1 verified"}
                  </span>
                )}
              </p>
              {current.sourceTextbook && (
                <p className="text-xs text-text-secondary">
                  📚 Based on:{" "}
                  <Link href={`/materials/${current.sourceTextbook.id}`} className="font-medium text-primary hover:underline">
                    {current.sourceTextbook.title}
                  </Link>{" "}
                  by{" "}
                  {current.sourceTextbook.isPlatform ? "UniArchive" : <ProfileHandle upid={current.sourceTextbook.submittedByUpid} />}
                </p>
              )}
              {(mayEdit || mayDelete) && (
                <div className="flex gap-3 pt-1 text-xs">
                  {mayEdit && (
                    <button type="button" onClick={() => setEditor({ doc: current })} className="font-medium text-primary hover:underline">
                      Edit
                    </button>
                  )}
                  {mayEdit && (
                    <Link href={`/contribute/${materialId}?doc=${current.id}`} className="font-medium text-primary hover:underline">
                      Edit beside the PDF
                    </Link>
                  )}
                  {mayDelete &&
                    (confirmDelete ? (
                      <span className="flex items-center gap-2">
                        Delete these notes?
                        <button
                          type="button"
                          className="font-semibold text-red-600 dark:text-red-400"
                          onClick={async () => {
                            try {
                              await adminRequest(`/api/materials/${materialId}/content/${current.id}`, "DELETE");
                              setConfirmDelete(false);
                              setSelectedId(null);
                              update(docs.filter((d) => d.id !== current.id));
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Couldn't delete.");
                            }
                          }}
                        >
                          Yes
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(false)} className="text-text-muted">
                          No
                        </button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmDelete(true)} className="text-text-muted hover:text-red-600">
                        Delete
                      </button>
                    ))}
                </div>
              )}
            </header>
            <BlockRenderer blocks={current.contentBlocks} />
          </article>
        )}
      </div>
    </div>
  );
}
