// components/auth/SignUpWizard.tsx
// Email -> Profile -> School email (optional) -> Password -> POST /api/auth/register.
// A verified school email is sent to register as its challenge token.
// Email verification happens afterwards on /auth?view=verify&mode=signup,
// because the account (and its verification code) only exists once
// registration succeeds.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { StepProgress } from "./UI/StepProgress";
import { StepEmail } from "./steps/stepEmail";
import { StepProfile } from "./steps/StepProfile";
import { StepSchoolEmail } from "./steps/stepSchoolEmail";
import { StepPassword } from "./steps/stepPassword";
import { errorMessage, postJson, signInWithGoogle } from "@/lib/authClient";

export interface SignUpFormData {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  school: string;
  schoolEmail: string;
  schoolEmailOtp: string;
  // From /api/auth/school-email/send; proves the address once verified
  schoolEmailToken: string;
  password: string;
  confirmPassword: string;
}

type StepKey = "email" | "profile" | "schoolEmail" | "password";

const STEP_META: Record<StepKey, string> = {
  email: "Email",
  profile: "Profile",
  schoolEmail: "School Email",
  password: "Password",
};

const FLOW: StepKey[] = ["email", "profile", "schoolEmail", "password"];

const PROFILE_FIELDS = ["firstName", "lastName", "username", "school"];

const initialFormData: SignUpFormData = {
  email: "",
  firstName: "",
  lastName: "",
  username: "",
  school: "",
  schoolEmail: "",
  schoolEmailOtp: "",
  schoolEmailToken: "",
  password: "",
  confirmPassword: "",
};

export default function SignUpWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [formData, setFormData] = useState<SignUpFormData>(initialFormData);
  const [verifiedFields, setVerifiedFields] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");

  const currentStepKey = FLOW[stepIndex];

  const markVerified = (field: string) => {
    setVerifiedFields((prev) => new Set(prev).add(field));
  };

  const unmarkVerified = (field: string) => {
    setVerifiedFields((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  };

  // A code or verification is for one address at one school
  const resetSchoolEmail = () => {
    setFormData((prev) => ({ ...prev, schoolEmailOtp: "", schoolEmailToken: "" }));
    unmarkVerified("schoolEmail");
  };

  const updateField = (field: keyof SignUpFormData, value: string) => {
    if (field === "school" && value !== formData.school) resetSchoolEmail();
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const goNext = () => {
    setNotice("");
    setDirection(1);
    setStepIndex((i) => Math.min(i + 1, FLOW.length - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const goToStep = (index: number) => {
    if (index <= stepIndex) {
      setDirection(index < stepIndex ? -1 : 1);
      setStepIndex(index);
    }
  };

  /** Returns an error message for the password step, or null on success. */
  const handleRegister = async (): Promise<string | null> => {
    const result = await postJson("/api/auth/register", {
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      username: formData.username,
      school: formData.school,
      ...(verifiedFields.has("schoolEmail") && { schoolEmailToken: formData.schoolEmailToken }),
    });

    if (result.ok) {
      router.push(
        `/auth?view=verify&mode=signup&email=${encodeURIComponent(formData.email.trim())}`,
      );
      return null;
    }

    // Field errors on earlier steps: send the user back to fix them
    const fieldErrors = result.data.errors ?? {};
    if (Object.keys(fieldErrors).some((f) => PROFILE_FIELDS.includes(f))) {
      setNotice(Object.values(fieldErrors).join(" "));
      setDirection(-1);
      setStepIndex(FLOW.indexOf("profile"));
      return null;
    }
    if (fieldErrors.email) {
      setNotice(fieldErrors.email);
      setDirection(-1);
      setStepIndex(0);
      return null;
    }
    if (fieldErrors.schoolEmail) {
      resetSchoolEmail();
      setNotice(fieldErrors.schoolEmail);
      setDirection(-1);
      setStepIndex(FLOW.indexOf("schoolEmail"));
      return null;
    }
    if (fieldErrors.password) return fieldErrors.password;

    if (result.status === 409) {
      return "We couldn't create this account. The email or username may already be in use — try signing in or pick another username.";
    }
    return errorMessage(result);
  };

  // Google creates the account on first sign-in, or signs in an existing one
  const handleSocialAuth = () => {
    setNotice("Redirecting to Google...");
    signInWithGoogle().catch(() => setNotice("Could not connect to Google. Please try again."));
  };

  function renderStep() {
    switch (currentStepKey) {
      case "email":
        return (
          <StepEmail
            value={formData.email}
            locked={verifiedFields.has("email")}
            onChange={(v) => updateField("email", v)}
            onNext={goNext}
            onSocialAuth={handleSocialAuth}
          />
        );
      case "profile":
        return (
          <StepProfile
            firstName={formData.firstName}
            lastName={formData.lastName}
            username={formData.username}
            school={formData.school}
            onChange={updateField}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case "schoolEmail":
        return (
          <StepSchoolEmail
            value={formData.schoolEmail}
            school={formData.school}
            otp={formData.schoolEmailOtp}
            challengeToken={formData.schoolEmailToken}
            verified={verifiedFields.has("schoolEmail")}
            onChange={(v) => updateField("schoolEmail", v)}
            onOtpChange={(v) => updateField("schoolEmailOtp", v)}
            onCodeSent={(token) => updateField("schoolEmailToken", token)}
            onVerified={() => markVerified("schoolEmail")}
            onReset={resetSchoolEmail}
            onSkip={goNext}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case "password":
        return (
          <StepPassword
            password={formData.password}
            confirmPassword={formData.confirmPassword}
            onChange={updateField}
            onBack={goBack}
            onSubmit={handleRegister}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl p-8 rounded-2xl">
      <StepProgress
        labels={FLOW.map((key) => STEP_META[key])}
        currentIndex={stepIndex}
        onStepClick={goToStep}
      />

      {notice && (
        <div
          role="alert"
          className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
        >
          {notice}
        </div>
      )}

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={stepIndex}
            custom={direction}
            initial={{ x: direction * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -40, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
