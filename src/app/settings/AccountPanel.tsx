// app/settings/AccountPanel.tsx
// Settings > Account: a summary of the profile (edited at /profile/edit,
// which saves through /api/user/profile) and password. There's no
// change-password form: the emailed reset code is the one way to change a
// password, and it also lets an account that signs in with Google set one.
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/context/userContext";
import { Button } from "@/components/UI/Buttons";

export function AccountPanel() {
  const { userProfile, getUserDisplayName } = useUser();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/connections", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { password?: boolean } | null) => setHasPassword(data ? !!data.password : null))
      .catch(() => setHasPassword(null));
  }, []);

  const school = userProfile?.universityName || userProfile?.school;
  const details = [school, userProfile?.departmentName, userProfile?.email].filter(Boolean);

  return (
    <>
      <div className="rounded-xl border border-border bg-surface-raised p-6">
        <h2 className="mb-1 font-semibold text-text-primary">Profile</h2>
        <p className="font-medium text-text-primary">{getUserDisplayName()}</p>
        {details.length > 0 && <p className="mt-0.5 text-sm text-text-secondary">{details.join(" · ")}</p>}
        <p className="mb-4 mt-3 text-sm text-text-secondary">
          Change your name, photo, bio, phone, school, faculty, department and level on your profile page.
        </p>
        <Button variant="secondary" href="/profile/edit">
          Edit profile
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface-raised p-6">
        <h2 className="mb-2 font-semibold text-text-primary">Password</h2>
        <p className="mb-4 text-sm text-text-secondary">
          {hasPassword === false
            ? "You sign in with Google. Set a password to also sign in with your email: we'll email you a code to create one."
            : "To change your password, we'll email you a code, then you choose a new one."}
        </p>
        <Button variant="secondary" href="/auth?view=forgot-password">
          {hasPassword === false ? "Set a password" : "Change password"}
        </Button>
      </div>
    </>
  );
}
