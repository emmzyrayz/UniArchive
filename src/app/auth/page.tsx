"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SignIn from "./components/signin";
import SignUp from "./components/signup";
import ForgotPassword from "./components/forgot-pass";
import VerifyEmail from "./components/verify";
import ResetPassword from "./components/reset-pass";

export type AuthView = "signin" | "signup" | "forgot" | "verify" | "reset";

function AuthPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get view from URL, default to signin
  const view = (searchParams.get("view") as AuthView) || "signin";

  const handleNavigate = (newView: AuthView) => {
    router.push(`/auth?view=${newView}`);
  };

  const renderView = () => {
    switch (view) {
      case "signin":
        return <SignIn key="signin" onNavigate={handleNavigate} />;
      case "signup":
        return <SignUp key="signup" onNavigate={handleNavigate} />;
      case "forgot":
        return <ForgotPassword key="forgot" onNavigate={handleNavigate} />;
      case "verify":
        return <VerifyEmail key="verify" onNavigate={handleNavigate} />;
        // return <SignIn key="signin" onNavigate={handleNavigate} />; // Fallback until verify is ready
      case "reset":
        return <ResetPassword key="reset" onNavigate={handleNavigate} />;
      default:
        return <SignIn key="signin" onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
