"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuMail,
  LuCircleAlert,
  LuCircleCheck,
  LuRefreshCw,
  LuArrowLeft,
} from "react-icons/lu";
import { AuthNavigationProps } from "../types";

export default function VerifyEmail({ onNavigate }: AuthNavigationProps) {
  const [verificationCode, setVerificationCode] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);
  const [userEmail, setUserEmail] = useState("");

  // Refs for input fields
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Extract email from URL or localStorage (in production)
  useEffect(() => {
    // OFFLINE SIMULATION - Mock email
    // In production: get from URL params or session storage
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get("email") || "student@uniarchive.com";
    setUserEmail(email);
  }, []);

  // Timer for resend cooldown
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }

    return () => clearInterval(interval);
  }, [resendTimer]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    setError(""); // Clear error when user types

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Handle backspace
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle arrow keys
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Handle Enter key
    if (e.key === "Enter" && verificationCode.every((digit) => digit !== "")) {
      handleVerify();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);

    // Only process if it's all digits
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = [...verificationCode];
    pastedData.split("").forEach((char, index) => {
      if (index < 6) {
        newCode[index] = char;
      }
    });

    setVerificationCode(newCode);
    setError("");

    // Focus the next empty input or last input
    const nextEmptyIndex = newCode.findIndex((digit) => digit === "");
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  // OFFLINE VERIFICATION SIMULATION - Replace with actual API call
  const handleVerify = async () => {
    const code = verificationCode.join("");

    if (code.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setIsLoading(true);
    setError("");

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock verification - REMOVE this logic when connecting to backend
    // Accept "123456" as valid code for testing
    if (code === "123456") {
      setSuccess(true);
      console.log("Verification successful for:", userEmail);
    } else {
      setError("Invalid verification code. Please try again.");
      setVerificationCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }

    setIsLoading(false);

    /* REPLACE THE ABOVE WITH THIS WHEN CONNECTING TO BACKEND:
    
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          code: code
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        
        // Store auth token if provided
        if (data.token) {
          localStorage.setItem('authToken', data.token);
        }
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        setError(data.message || 'Invalid verification code. Please try again.');
        setVerificationCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
    */
  };

  // OFFLINE RESEND SIMULATION - Replace with actual API call
  const handleResend = async () => {
    if (!canResend) return;

    setIsResending(true);
    setError("");

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock resend success
    setCanResend(false);
    setResendTimer(60); // 60 second cooldown
    console.log("Resend verification code to:", userEmail);

    setIsResending(false);

    /* REPLACE THE ABOVE WITH THIS WHEN CONNECTING TO BACKEND:
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });

      const data = await response.json();

      if (response.ok) {
        setCanResend(false);
        setResendTimer(60); // 60 second cooldown
        // Optionally show success message
      } else {
        setError(data.message || 'Failed to resend code. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
    */
  };

  // Success Screen
  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LuCircleCheck className="h-10 w-10 text-green-600" />
          </div>
        </motion.div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Email Verified!
          </h2>
          <p className="text-gray-600 text-sm">
            Your email has been successfully verified.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">
            Welcome to Uni Archive! Your account is now active.
          </p>
        </div>

        <button
          onClick={() => onNavigate?.("signin")}
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
        >
          Continue to Sign In
        </button>
      </motion.div>
    );
  }

  // Main Form
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <LuMail className="h-8 w-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Verify Your Email
        </h2>
        <p className="text-gray-600 text-sm">
          We&apos;ve sent a 6-digit code to
        </p>
        <p className="text-indigo-600 font-semibold text-sm mt-1">
          {userEmail}
        </p>
      </div>

      {/* Demo Code Banner - REMOVE in production */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <p className="font-semibold text-blue-800 mb-1">Demo Code:</p>
        <p className="text-blue-700 text-center text-lg font-mono tracking-wider">
          1 2 3 4 5 6
        </p>
      </div>

      <div className="space-y-4">
        {/* Verification Code Inputs */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
            Enter Verification Code
          </label>
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {verificationCode.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isLoading}
                className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${
                  error
                    ? "border-red-500"
                    : digit
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-300"
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            Paste code or enter digits one by one
          </p>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2"
            >
              <LuCircleAlert className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={isLoading || verificationCode.some((digit) => digit === "")}
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Verifying...
            </>
          ) : (
            <>
              <LuCircleCheck className="h-5 w-5 mr-2" />
              Verify Email
            </>
          )}
        </button>

        {/* Resend Section */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <p className="text-sm text-gray-700 text-center">
            Didn&apos;t receive the code?
          </p>

          {canResend ? (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="w-full flex items-center justify-center space-x-2 text-indigo-600 hover:text-indigo-800 font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {isResending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <LuRefreshCw className="h-4 w-4" />
                  <span>Resend Code</span>
                </>
              )}
            </button>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Resend code in{" "}
                <span className="font-semibold text-indigo-600">
                  {resendTimer}s
                </span>
              </p>
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p>• Check your spam/junk folder</p>
            <p>• Make sure the email address is correct</p>
            <p>• Code expires in 15 minutes</p>
          </div>
        </div>
      </div>

      {/* Back to Sign Up */}
      <div className="pt-4 border-t border-gray-200 text-center">
        <button
          onClick={() => onNavigate?.("signup")}
          disabled={isLoading}
          className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center space-x-1 mx-auto"
        >
          <LuArrowLeft className="h-3 w-3" />
          <span>Back to Sign Up</span>
        </button>
      </div>
    </div>
  );
}
