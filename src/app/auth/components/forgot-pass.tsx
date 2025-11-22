"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuCircleAlert,
  LuCircleCheck,
  LuMail,
  LuArrowLeft,
} from "react-icons/lu";
import { AuthNavigationProps } from "../types";
import { Input } from "@/components/UI";

// Mock registered emails for offline testing - REMOVE when connecting to backend
const mockRegisteredEmails = [
  "student@uniarchive.com",
  "test@example.com",
  "john.doe@university.edu",
];

export default function ForgotPass({ onNavigate }: AuthNavigationProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    // Clear error when user starts typing
    if (error) {
      setError("");
    }

    // Validate email format in real-time
    if (value && !validateEmail(value)) {
      setIsEmailValid(false);
    } else {
      setIsEmailValid(true);
    }
  };

  // OFFLINE PASSWORD RESET SIMULATION - Replace with actual API call
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validate email before submitting
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError("");

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock check if email exists - REMOVE this logic when connecting to backend
    const emailExists = mockRegisteredEmails.includes(email.toLowerCase());

    if (emailExists) {
      setSuccess(true);
      // In production: The backend will send the actual email
      console.log("Password reset email would be sent to:", email);
    } else {
      setError(
        "No account found with this email address. Please check and try again."
      );
    }

    setIsLoading(false);

    /* REPLACE THE ABOVE WITH THIS WHEN CONNECTING TO BACKEND:
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.message || 'Failed to send reset email. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
    */
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading && email && isEmailValid) {
      handleSubmit();
    }
  };

  // Success Screen
  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="flex justify-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <LuCircleCheck className="h-10 w-10 text-green-600" />
            </div>
          </motion.div>

          <h2 className="text-2xl font-bold text-gray-900">
            Check Your Email
          </h2>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3 text-left">
            <div className="flex items-center space-x-2">
              <LuMail className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-800">
                Email Sent Successfully!
              </p>
            </div>
            <p className="text-sm text-green-700">
              We&apos;ve sent a password reset link to{" "}
              <strong className="font-semibold">{email}</strong>
            </p>
            <p className="text-xs text-green-600">
              Please check your inbox and click the link to reset your
              password. The link will expire in 1 hour.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-700">
            <p className="font-medium">Didn&apos;t receive the email?</p>
            <ul className="text-xs space-y-1.5 text-left">
              <li className="flex items-start space-x-2">
                <span className="text-indigo-600 mt-0.5">•</span>
                <span>Check your spam/junk folder</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-indigo-600 mt-0.5">•</span>
                <span>Make sure you entered the correct email</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-indigo-600 mt-0.5">•</span>
                <span>Wait a few minutes for the email to arrive</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full pt-2">
          <button
            onClick={() => {
              setSuccess(false);
              setEmail("");
              setError("");
              setIsEmailValid(true);
            }}
            className="flex p-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-300 justify-center items-center space-x-2 font-semibold"
          >
            <LuMail className="h-4 w-4" />
            <span>Send Another Email</span>
          </button>

          <button
            onClick={() => onNavigate?.("signin")}
            className="flex p-3 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 hover:text-gray-900 transition-colors duration-300 justify-center items-center space-x-2 font-medium"
          >
            <LuArrowLeft className="h-4 w-4" />
            <span>Back to Sign In</span>
          </button>
        </div>
      </motion.div>
    );
  }

  // Main Form
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">
          Forgot Password
        </h2>
        <p className="text-center text-gray-600 text-sm">
          Enter your email to receive a password reset link
        </p>
      </div>

      {/* Demo Email Banner - REMOVE in production */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <p className="font-semibold text-blue-800 mb-1">Demo Emails:</p>
        <p className="text-blue-700 text-xs">
          Try: student@uniarchive.com or test@example.com
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <div className="relative">
            <Input
              type="email"
              name="email"
              placeholder="Enter your email address*"
              value={email}
              onChange={handleEmailChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              required
            />
            {email && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isEmailValid ? (
                  <LuCircleCheck className="h-5 w-5 text-green-500" />
                ) : (
                  <LuCircleAlert className="h-5 w-5 text-red-500" />
                )}
              </div>
            )}
          </div>

          <AnimatePresence>
            {!isEmailValid && email && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-red-600 text-xs flex items-center space-x-1"
              >
                <LuCircleAlert className="h-3 w-3" />
                <span>Please enter a valid email address</span>
              </motion.p>
            )}
          </AnimatePresence>
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
              <LuCircleAlert className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !email || !isEmailValid}
          className="w-full flex p-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white disabled:text-gray-500 transition-all duration-300 items-center justify-center space-x-2 font-semibold"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Sending...</span>
            </>
          ) : (
            <>
              <LuMail className="h-4 w-4" />
              <span>Send Reset Link</span>
            </>
          )}
        </button>

        {/* Additional Info */}
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
          <p>
            <span className="font-semibold">Note:</span> The password reset
            link will be valid for 1 hour. If you don&apos;t receive an email,
            please check your spam folder or contact support.
          </p>
        </div>
      </form>

      {/* Back to Login */}
      <div className="pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => onNavigate?.("signin")}
          disabled={isLoading}
          className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1 mx-auto text-sm transition-colors disabled:opacity-50"
        >
          <LuArrowLeft className="h-3 w-3" />
          <span>Back to Sign In</span>
        </button>
      </div>
    </div>
  );
}