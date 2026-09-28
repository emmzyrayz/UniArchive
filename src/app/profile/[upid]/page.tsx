// app/profile/[upid]/page.tsx
// Anyone's public profile: who they are and what they've contributed to the
// UniLibrary. No sign-in needed, and no private data (see
// src/lib/publicProfile.ts). Your own upid redirects to /profile.
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { useUser } from "@/context/userContext";
import { useUserReactions } from "@/hooks/useUserReactions";
import {
  PROFILE_CARD_CLASS,
  ProfileAvatar,
  RoleBadge,
} from "@/components/profile/profileUi";
import { MaterialCard } from "@/components/unilibrary/MaterialCard";
import { BadgeList } from "@/components/profile/BadgeList";
import { MaterialCardSkeleton } from "@/components/unilibrary/MaterialCardSkeleton";
import { levelLabel } from "@/components/unilibrary/materialLabels";
import type { PublicMaterialsResponse, PublicProfile } from "@/types/publicProfile";

const PAGE_SIZE = 12;

type ProfileState =
  | { key: string; status: "ready"; profile: PublicProfile }
  | { key: string; status: "not_found" }
  | { key: string; status: "error" };

type MaterialsState = { key: string; data: PublicMaterialsResponse } | { key: string; error: true };

const noopSubscribe = () => () => {};

const memberSince = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { month: "long", year: "numeric" });

/** "← Back to Admin" when we came from the admin panel. */
function useBackLabel(): string {
  const referrer = useSyncExternalStore(
    noopSubscribe,
    () => document.referrer,
    () => "",
  );
  try {
    const url = referrer ? new URL(referrer) : null;
    if (url && url.origin === window.location.origin && url.pathname.startsWith("/admin")) {
      return "Back to Admin";
    }
  } catch {
    // Malformed referrer: fall through
  }
  return "Back";
}

function BackButton() {
  const router = useRouter();
  const label = useBackLabel();
  return (
    <button
      type="button"
      onClick={() => {
        // Opened directly (new tab, shared link): there's nothing to go back to
        if (window.history.length > 1) router.back();
        else router.push("/unilibrary");
      }}
      className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
    >
      <FiArrowLeft aria-hidden /> {label}
    </button>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className={`${PROFILE_CARD_CLASS} flex animate-pulse items-center gap-5 p-6`}>
        <div className="h-24 w-24 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-1/2 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-3 w-1/3 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-3 w-2/5 rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>
      </div>
      <div className={`${PROFILE_CARD_CLASS} h-12 animate-pulse`} />
      {[0, 1, 2].map((i) => (
        <MaterialCardSkeleton key={i} />
      ))}
    </div>
  );
}

function Contributions({ upid }: { upid: string }) {
  const { hasActiveSession, userProfile } = useUser();
  const [first, setFirst] = useState<MaterialsState | null>(null);
  const [extra, setExtra] = useState<{ key: string; pages: PublicMaterialsResponse[] }>({ key: upid, pages: [] });
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/users/${encodeURIComponent(upid)}/materials?limit=${PAGE_SIZE}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setFirst({ key: upid, data: (await res.json()) as PublicMaterialsResponse });
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setFirst({ key: upid, error: true });
      });
    return () => controller.abort();
  }, [upid]);

  const current = first?.key === upid ? first : null;
  const pages = extra.key === upid ? extra.pages : [];
  const firstPage = current && "data" in current ? current.data : null;
  const last = pages.at(-1) ?? firstPage;
  // A new upload between pages can shift items; don't show one twice
  const materials = [firstPage, ...pages]
    .flatMap((p) => p?.materials ?? [])
    .filter((m, i, all) => all.findIndex((x) => x._id === m._id) === i);
  const userReactions = useUserReactions(
    materials.map((m) => m._id),
    hasActiveSession ? (userProfile?.upid ?? null) : null,
  );

  const loadMore = async () => {
    if (!last || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(upid)}/materials?limit=${PAGE_SIZE}&page=${last.page + 1}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as PublicMaterialsResponse;
      setExtra((prev) => ({ key: upid, pages: [...(prev.key === upid ? prev.pages : []), data] }));
    } catch {
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const recordView = (materialId: string) => {
    // keepalive: the request outlives the navigation to the reader
    fetch(`/api/materials/${materialId}/view`, { method: "POST", keepalive: true }).catch(() => {});
  };

  return (
    <section aria-labelledby="contributions-heading" className="space-y-4">
      <h2 id="contributions-heading" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        Contributions
      </h2>
      {!current ? (
        [0, 1, 2].map((i) => <MaterialCardSkeleton key={i} />)
      ) : "error" in current ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-muted">
          Couldn&apos;t load contributions. Check your connection and refresh.
        </p>
      ) : materials.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-text-muted">
          No verified materials yet
        </p>
      ) : (
        <>
          {materials.map((m) => (
            <MaterialCard
              key={m._id}
              material={m}
              isAuthenticated={hasActiveSession}
              onRead={recordView}
              userReaction={userReactions[m._id]}
            />
          ))}
          {last?.hasMore && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-lg border border-border bg-surface-raised px-5 py-2 text-sm font-medium text-text-primary hover:bg-surface disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
              {loadMoreError && (
                <p className="text-xs text-red-600 dark:text-red-400">Couldn&apos;t load more. Try again.</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function PublicProfilePage() {
  const router = useRouter();
  const upid = useParams<{ upid: string }>().upid;
  const { userProfile } = useUser();
  const [state, setState] = useState<ProfileState | null>(null);

  // Your own profile has a private view with more on it
  const isOwn = !!userProfile?.upid && userProfile.upid === upid;
  useEffect(() => {
    if (isOwn) router.replace("/profile");
  }, [isOwn, router]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/users/${encodeURIComponent(upid)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        if (res.status === 404) return setState({ key: upid, status: "not_found" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { profile } = (await res.json()) as { profile: PublicProfile };
        setState({ key: upid, status: "ready", profile });
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setState({ key: upid, status: "error" });
      });
    return () => controller.abort();
  }, [upid]);

  const current = state?.key === upid ? state : null;

  return (
    <div className="mt-[70px] min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <BackButton />

        {isOwn || !current ? (
          <ProfileSkeleton />
        ) : current.status === "not_found" ? (
          <div className={`${PROFILE_CARD_CLASS} p-10 text-center`}>
            <h1 className="text-lg font-semibold text-text-primary">User not found</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm text-text-secondary">
              This profile doesn&apos;t exist or has been removed.
            </p>
            <div className="mt-5">
              <BackButton />
            </div>
          </div>
        ) : current.status === "error" ? (
          <p className={`${PROFILE_CARD_CLASS} p-6 text-center text-sm text-text-secondary`}>
            Couldn&apos;t load this profile. Check your connection and refresh.
          </p>
        ) : (
          <ProfileView profile={current.profile} />
        )}
      </div>
    </div>
  );
}

function ProfileView({ profile: p }: { profile: PublicProfile }) {
  const school = [p.universityAbbr || p.universityName, p.facultyName, p.departmentName, p.level && levelLabel(p.level)]
    .filter(Boolean)
    .join(" · ");
  const since = memberSince(p.createdAt);

  return (
    <>
      <section className={`${PROFILE_CARD_CLASS} p-6`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ProfileAvatar name={p.fullName} photoUrl={p.profilePhoto} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-text-primary">{p.fullName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm text-text-secondary">@{p.username || p.upid}</span>
              <span className="text-text-muted" aria-hidden>
                •
              </span>
              <RoleBadge role={p.role} />
            </div>
            <p className="mt-2 text-xs text-text-muted">Member since {since}</p>
            {school && <p className="mt-1 text-sm text-text-secondary">{school}</p>}
          </div>
        </div>
        {p.bio && <p className="mt-5 whitespace-pre-line text-sm text-text-primary">{p.bio}</p>}
      </section>

      <div className={`${PROFILE_CARD_CLASS} px-6 py-3 text-sm text-text-secondary`}>
        📄 <strong className="text-text-primary">{p.verifiedMaterialCount}</strong> verified material
        {p.verifiedMaterialCount === 1 ? "" : "s"} · Joined {since}
      </div>

      <BadgeList url={`/api/users/${encodeURIComponent(p.upid)}/badges`} />

      <Contributions upid={p.upid} />
    </>
  );
}
