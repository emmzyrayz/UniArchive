import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

const SignInInstance = dynamic(() => import("./components/SignIn"));
const SignUpWizard = dynamic(() => import("./components/SignUpWizard"));
const ForgotPasswordInstance = dynamic(
  () => import("./components/ForgotPassword"),
);
const VerifyEmailInstance = dynamic(() => import("./components/verify"));
const SuccessInstance = dynamic(() => import("./components/success"));

// Valid view types
const validViews = [
  "signin",
  "signup",
  "forgot-password",
  "verify",
  "reset-password",
  "success",
] as const;
type ViewType = (typeof validViews)[number];

const ResetPasswordInstance = dynamic(
  () => import("./components/ResetPassword"),
);


export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    email?: string;
    verified?: string;
    from?: string;
    error?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const view = (resolvedParams.view as ViewType) || "signin";
  const email = resolvedParams.email;

  if (!validViews.includes(view)) {
    redirect("/auth?view=signin");
  }

  switch (view) {
    case "signup":
      return <SignUpWizard />;
    case "forgot-password":
      return <ForgotPasswordInstance />;
    case "verify":
      return <VerifyEmailInstance />;
    case "reset-password":
      return <ResetPasswordInstance />;
    case "success":
      return <SuccessInstance />;
    case "signin":
    default:
      return (
        <SignInInstance
          defaultEmail={email}
          justVerified={resolvedParams.verified === "1"}
          from={resolvedParams.from}
          error={resolvedParams.error}
        />
      );
  }
}