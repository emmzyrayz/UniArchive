// components/admin/broadcasts/BroadcastEditor.tsx
// /admin/mail/broadcasts/[id]: Content (generated form + live preview),
// Audience (criteria + live count) and Review (summary, test copy). Edits
// are local until saved; switching steps, testing and leaving all save.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminBroadcastDto } from "@/types/admin";
import { cleanFields, getTemplate, personalize, renderBroadcast, type TemplateFields } from "@/lib/broadcast/templates";
import { cleanAudience, describeAudience, type BroadcastAudience } from "@/lib/broadcast/audience";
import type { EmailKind } from "@/lib/emailPrefs";
import { timeAgo } from "../reviewShared";
import { Modal, ModalActions } from "../ReviewModals";
import { AdminPageShell, adminRequest, cardClass, dangerButton, inputClass, primaryButton, secondaryButton } from "../adminUi";
import { TemplateFieldsForm } from "./TemplateFieldsForm";
import { AudiencePicker } from "./AudiencePicker";

type Step = "content" | "audience" | "review";
const STEPS: { id: Step; label: string }[] = [
  { id: "content", label: "1. Content" },
  { id: "audience", label: "2. Audience" },
  { id: "review", label: "3. Review" },
];

const KIND_LABEL: Record<EmailKind, string> = {
  announcements: "Announcement (everyone who hasn't turned them off)",
  newsletter: "Newsletter (only people who opted in)",
};

export function BroadcastEditor({ id }: { id: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<AdminBroadcastDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<EmailKind>("announcements");
  const [fields, setFields] = useState<TemplateFields>({});
  const [audience, setAudience] = useState<BroadcastAudience | null>(null);
  const [dirty, setDirty] = useState(false);
  const [step, setStep] = useState<Step>("content");
  const [busy, setBusy] = useState<"save" | "test" | "delete" | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const apply = (b: AdminBroadcastDto) => {
    setLoaded(b);
    setName(b.name);
    setKind(b.kind);
    setFields(b.fields as TemplateFields);
    setAudience(b.audience);
    setDirty(false);
  };

  useEffect(() => {
    adminRequest<{ broadcast: AdminBroadcastDto }>(`/api/admin/broadcasts/${id}`)
      .then(({ broadcast }) => apply(broadcast))
      .catch((err: Error) => setLoadError(err.message));
  }, [id]);

  // Warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const template = loaded ? getTemplate(loaded.templateId) : undefined;
  const editable = loaded?.status === "draft";

  const contentProblems = useMemo(() => (template ? cleanFields(template, fields).problems : []), [template, fields]);
  const audienceProblems = useMemo(() => (audience ? cleanAudience(audience).problems : []), [audience]);

  const preview = useMemo(() => {
    if (!template) return null;
    return personalize(renderBroadcast(template, cleanFields(template, fields).fields, kind), {
      firstName: "Ada",
      prefsUrl: "#",
      unsubscribeUrl: "#",
    });
  }, [template, fields, kind]);

  const save = async (): Promise<boolean> => {
    if (!dirty || !editable) return true;
    setBusy("save");
    setMessage(null);
    try {
      const { broadcast } = await adminRequest<{ broadcast: AdminBroadcastDto }>(`/api/admin/broadcasts/${id}`, "PATCH", {
        name,
        kind,
        fields,
        audience,
      });
      apply(broadcast);
      return true;
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Couldn't save." });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const goTo = async (next: Step) => {
    if (await save()) setStep(next);
  };

  const sendTest = async () => {
    if (!(await save())) return;
    setBusy("test");
    setMessage(null);
    try {
      const { sentTo } = await adminRequest<{ sentTo: string }>(`/api/admin/broadcasts/${id}/test`, "POST", {});
      setMessage({ tone: "ok", text: `Test sent to ${sentTo}. Check your inbox (and spam folder).` });
      setLoaded((b) => (b ? { ...b, lastTestAt: new Date().toISOString() } : b));
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Couldn't send the test." });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    try {
      await adminRequest(`/api/admin/broadcasts/${id}`, "DELETE");
      setDirty(false);
      router.push("/admin/mail/broadcasts");
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Couldn't delete." });
      setConfirmDelete(false);
      setBusy(null);
    }
  };

  if (loadError) {
    return (
      <AdminPageShell title="Broadcast">
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
      </AdminPageShell>
    );
  }
  if (!loaded || !audience) {
    return (
      <AdminPageShell title="Broadcast" loading>
        <p className="text-sm text-text-muted">Loading...</p>
      </AdminPageShell>
    );
  }
  if (!template) {
    return (
      <AdminPageShell title={loaded.name}>
        <p className="text-sm text-red-600 dark:text-red-400">This broadcast uses a template that no longer exists.</p>
      </AdminPageShell>
    );
  }

  const edit = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };
  const problems = [...contentProblems, ...audienceProblems];

  return (
    <AdminPageShell
      title={`${template.emoji} ${loaded.name}`}
      subtitle={
        <>
          <Link href="/admin/mail/broadcasts" className="text-primary hover:underline">
            All broadcasts
          </Link>{" "}
          · {template.label} · {loaded.status}
          {dirty ? " · unsaved changes" : ` · saved ${timeAgo(loaded.updatedAt)}`}
        </>
      }
      actions={
        editable && (
          <button type="button" className={primaryButton} disabled={!dirty || busy !== null} onClick={save}>
            {busy === "save" ? "Saving..." : dirty ? "Save draft" : "Saved"}
          </button>
        )
      }
    >
      {!editable && (
        <p className="mb-5 rounded-lg border border-border bg-surface-raised p-3 text-sm text-text-secondary">
          This broadcast is {loaded.status}; it can no longer be edited.
        </p>
      )}
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`mb-5 rounded-lg border p-3 text-sm ${
            message.tone === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
              : "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
          }`}
        >
          {message.text}
        </p>
      )}

      <nav className="mb-5 flex gap-2" aria-label="Steps">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goTo(s.id)}
            aria-current={step === s.id ? "step" : undefined}
            className={step === s.id ? primaryButton : secondaryButton}
            disabled={busy !== null}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <fieldset disabled={!editable} className="contents">
        {step === "content" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className={`${cardClass} space-y-4`}>
              <label className="block text-sm font-medium text-text-secondary">
                Internal name (only admins see it)
                <input className={`mt-1 ${inputClass}`} value={name} maxLength={120} onChange={(e) => edit(setName)(e.target.value)} />
              </label>
              {template.kind === "choose" ? (
                <label className="block text-sm font-medium text-text-secondary">
                  Kind of email
                  <select className={`mt-1 w-full ${inputClass}`} value={kind} onChange={(e) => edit(setKind)(e.target.value as EmailKind)}>
                    <option value="announcements">{KIND_LABEL.announcements}</option>
                    <option value="newsletter">{KIND_LABEL.newsletter}</option>
                  </select>
                </label>
              ) : (
                <p className="text-xs text-text-muted">Goes out as: {KIND_LABEL[kind]}</p>
              )}
              <TemplateFieldsForm template={template} fields={fields} onChange={edit(setFields)} />
            </div>
            <div className={cardClass}>
              <h2 className="mb-1 font-semibold text-text-primary">Preview</h2>
              <p className="mb-3 text-xs text-text-muted">Subject: {preview?.subject || "(none yet)"}</p>
              <iframe title="Email preview" srcDoc={preview?.html ?? ""} sandbox="" className="h-[640px] w-full rounded-lg border border-border bg-white" />
            </div>
          </div>
        )}

        {step === "audience" && <AudiencePicker audience={audience} kind={kind} onChange={edit(setAudience)} />}
      </fieldset>

      {step === "review" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className={`${cardClass} space-y-3 text-sm`}>
            <h2 className="font-semibold text-text-primary">Summary</h2>
            <p>
              <span className="text-text-muted">Template:</span> {template.emoji} {template.label}
            </p>
            <p>
              <span className="text-text-muted">Kind:</span> {KIND_LABEL[kind]}
            </p>
            <p>
              <span className="text-text-muted">Subject:</span> {preview?.subject}
            </p>
            <p>
              <span className="text-text-muted">Audience:</span> {describeAudience(audience)}{" "}
              <button type="button" className="text-primary hover:underline" onClick={() => goTo("audience")}>
                (count)
              </button>
            </p>
            {problems.length > 0 ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300">
                <p className="font-medium">Before this can be sent:</p>
                <ul className="mt-1 list-disc pl-5">
                  {problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-green-700 dark:text-green-400">Content and audience are complete.</p>
            )}
          </div>
          <div className={`${cardClass} space-y-3 text-sm`}>
            <h2 className="font-semibold text-text-primary">Test and send</h2>
            <p className="text-text-secondary">
              Send yourself a copy first: it uses your name, and its links work. The unsubscribe link in a test only
              opens your email preferences.
            </p>
            <button
              type="button"
              className={secondaryButton}
              onClick={sendTest}
              disabled={busy !== null || contentProblems.length > 0}
            >
              {busy === "test" ? "Sending..." : "Send me a test"}
            </button>
            {loaded.lastTestAt && <p className="text-xs text-text-muted">Last test {timeAgo(loaded.lastTestAt)}.</p>}
            <p className="rounded-lg border border-border bg-surface p-3 text-xs text-text-muted">
              Sending to the audience through Brevo (now or scheduled) arrives in the next update.
            </p>
            {editable && (
              <button type="button" className={dangerButton} onClick={() => setConfirmDelete(true)} disabled={busy !== null}>
                Delete draft
              </button>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <Modal title="Delete this draft?" onClose={() => busy === null && setConfirmDelete(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              remove();
            }}
            className="text-sm text-text-secondary"
          >
            <p>&ldquo;{loaded.name}&rdquo; will be deleted. This can&apos;t be undone.</p>
            <ModalActions
              onCancel={() => setConfirmDelete(false)}
              confirmLabel="Delete"
              confirmClass="bg-red-600 hover:bg-red-700"
              disabled={false}
              busy={busy === "delete"}
            />
          </form>
        </Modal>
      )}
    </AdminPageShell>
  );
}
