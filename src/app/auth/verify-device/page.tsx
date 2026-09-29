// app/auth/verify-device/page.tsx
// Where /api/auth/social-callback sends a Google sign-in from a device that
// isn't trusted yet. The pending challenge comes from the httpOnly
// `ua_device_challenge` cookie; nothing sensitive is in the URL.
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { AuthCard, ExpiredRequest } from "../components/AuthCard";
import { DeviceVerification } from "../components/DeviceVerification";
import {
  DEVICE_CHALLENGE_COOKIE,
  getDeviceChallenge,
  readChallengeToken,
} from "@/lib/auth/deviceRecognition";

export const metadata: Metadata = { title: "Verify this device · UniArchive" };

export default async function VerifyDevicePage() {
  const cookieStore = await cookies();
  const challenge = await getDeviceChallenge(
    readChallengeToken(cookieStore.get(DEVICE_CHALLENGE_COOKIE)?.value),
  ).catch(() => null);

  return (
    <AuthCard>
      {challenge ? (
        <DeviceVerification
          maskedEmail={challenge.maskedEmail}
          secondaryAction={
            <Link href="/auth?view=signin" className="text-text-secondary hover:text-text-primary">
              ← Back to sign in
            </Link>
          }
        />
      ) : (
        <ExpiredRequest
          title="This sign-in has expired"
          message="Sign-in codes are valid for 10 minutes. Please sign in again to get a new one."
        />
      )}
    </AuthCard>
  );
}
