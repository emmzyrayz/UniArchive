// app/contribute/[materialId]/page.tsx
// The conversion workspace: type out a material's past questions, or write
// typed notes for notes and textbooks, from the PDF beside the editor.
// ?doc=<id> edits one of the material's typed notes instead.
//
// Who may do what is the same as on the material page: past questions by
// anyone signed in; notes by Collaborators and above; editing a note by its
// author or an auditor and above. The API enforces it; this page explains.
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { useUser } from "@/context/userContext";
import { can } from "@/lib/auth/permissions";
import { NOTE_CATEGORIES, QUESTION_CATEGORIES } from "@/lib/constants/layer2";
import { hasHigherOrEqualRole } from "@/types/roles";
import { Workspace, type WorkspaceBook } from "@/components/conversions/Workspace";
import type { ContentDocumentDto, MaterialDetail } from "@/types/layer2";

type Loaded =
  | { key: string; material: MaterialDetail; editing?: ContentDocumentDto }
  | { key: string; problem: string };

type BookState = { key: string; book: WorkspaceBook } | { key: string; error: string };

function ContributeWorkspace() {
  const { materialId } = useParams<{ materialId: string }>();
  const docId = useSearchParams().get("doc") ?? undefined;
  const { userProfile } = useUser();
  const key = `${materialId}:${docId ?? ""}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [bookState, setBookState] = useState<BookState | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    (async () => {
      const res = await fetch(`/api/materials/${encodeURIComponent(materialId)}`, { signal, cache: "no-store" });
      if (res.status === 404) return setLoaded({ key, problem: "This material doesn't exist or has been removed." });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const material = (await res.json()) as MaterialDetail;

      let editing: ContentDocumentDto | undefined;
      if (docId) {
        const docs = await fetch(`/api/materials/${encodeURIComponent(materialId)}/content`, { signal, cache: "no-store" });
        if (!docs.ok) throw new Error(`HTTP ${docs.status}`);
        editing = ((await docs.json()) as { documents: ContentDocumentDto[] }).documents.find((d) => d.id === docId);
        if (!editing) return setLoaded({ key, problem: "This note doesn't exist or has been removed." });
      }
      setLoaded({ key, material, editing });

      // The PDF: a signed URL, as the reader gets it
      const bookRes = await fetch(`/api/books/${encodeURIComponent(material.bookId)}`, { signal, cache: "no-store" });
      const data = (await bookRes.json().catch(() => ({}))) as { book?: WorkspaceBook; message?: string };
      if (!bookRes.ok || !data.book) {
        setBookState({ key, error: data.message ?? "Couldn't load the PDF. Reload to try again; your typing is saved." });
        return;
      }
      setBookState({ key, book: data.book });
    })().catch((error: Error) => {
      if (error.name === "AbortError") return;
      setLoaded((l) => (l?.key === key ? l : { key, problem: "Couldn't load this material. Check your connection and reload." }));
      setBookState({ key, error: "Couldn't load the PDF. Reload to try again; your typing is saved." });
    });
    return () => controller.abort();
  }, [materialId, docId, key]);

  const current = loaded?.key === key ? loaded : null;
  const book = bookState?.key === key ? bookState : null;

  if (!current || !userProfile) {
    return <Shell materialId={materialId}>Loading…</Shell>;
  }
  if ("problem" in current) return <Shell materialId={materialId}>{current.problem}</Shell>;

  const { material, editing } = current;
  const role = userProfile.role;
  const isQuestions = (!!material.category && QUESTION_CATEGORIES.includes(material.category));
  const isNotes = (!!material.category && NOTE_CATEGORIES.includes(material.category));

  if (!isQuestions && !isNotes) {
    return <Shell materialId={materialId}>This kind of material isn&apos;t typed out. Past questions, notes and textbooks are.</Shell>;
  }
  if (isNotes && !hasHigherOrEqualRole(role, "collaborator")) {
    return (
      <Shell materialId={materialId}>
        Typed notes are written by Collaborators and above. Keep contributing to the UniLibrary to earn the role.
      </Shell>
    );
  }
  if (editing && editing.createdByUpid !== userProfile.upid && !hasHigherOrEqualRole(role, "auditor")) {
    return <Shell materialId={materialId}>You can only edit typed notes you wrote.</Shell>;
  }

  return (
    <Workspace
      materialId={material._id}
      materialTitle={material.title}
      courseCode={material.courseCode}
      kind={isQuestions ? "questions" : "note"}
      editing={editing}
      book={book && "book" in book ? book.book : null}
      bookError={book && "error" in book ? book.error : null}
      upid={userProfile.upid}
      canMarkCorrect={can(role, "submission.verify_tier2")}
    />
  );
}

function Shell({ materialId, children }: { materialId: string; children: React.ReactNode }) {
  return (
    <div className="mt-[70px] min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl space-y-6">
        <Link
          href={`/materials/${materialId}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <FiArrowLeft aria-hidden /> Back to the material
        </Link>
        <p className="rounded-xl border border-border bg-surface-raised p-6 text-center text-sm text-text-secondary">{children}</p>
      </div>
    </div>
  );
}

export default function ContributePage() {
  return (
    <Suspense fallback={null}>
      <ContributeWorkspace />
    </Suspense>
  );
}
