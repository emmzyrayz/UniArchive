"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuEye,
  LuEyeOff,
  LuLock,
  LuCircleX,
  LuCircleAlert,
  LuCircleCheck,
} from "react-icons/lu";
import { AuthNavigationProps } from "../types";

export default function ResetPass({ onNavigate }: AuthNavigationProps) {
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Extract token from URL on component mount
  useEffect(() => {
    // In production, get token from URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get("token");
    
    // OFFLINE SIMULATION - Use mock token
    // REMOVE this and use actual URL token in production
    setToken(resetToken || "mock-reset-token-12345");

    if (!resetToken && process.env.NODE_ENV === "production") {
      setErrors({ submit: "Invalid or expired reset link" });
    }
  }, []);

  // Password validation
  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[@$!%*?&]/.test(password);

    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // Clear submit error when user starts typing
    if (errors.submit) {
      setErrors((prev) => ({ ...prev, submit: "" }));
    }
  };

  const passwordValidation = validatePassword(formData.newPassword);

  // Validate form before submission
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.newPassword) {
      newErrors.newPassword = "Password is required";
    } else if (!passwordValidation.isValid) {
      newErrors.newPassword = "Password does not meet all requirements";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // OFFLINE PASSWORD RESET SIMULATION - Replace with actual API call
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!token) {
      setErrors({ submit: "Invalid or expired reset link" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock success - REMOVE this logic when connecting to backend
    setSuccess(true);
    console.log("Password reset successful with token:", token);

    setIsLoading(false);

    /* REPLACE THE ABOVE WITH THIS WHEN CONNECTING TO BACKEND:
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          onNavigate?.("signin");
        }, 3000);
      } else {
        setErrors({
          submit: data.message || 'Failed to reset password. The link may be expired.'
        });
      }
    } catch (error) {
      setErrors({
        submit: 'Network error. Please check your connection and try again.'
      });
    } finally {
      setIsLoading(false);
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
            Password Reset Successful!
          </h2>
          <p className="text-gray-600 text-sm">
            Your password has been successfully updated.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">
            You can now sign in with your new password.
          </p>
        </div>

        <button
          onClick={() => onNavigate?.("signin")}
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
        >
          Go to Sign In
        </button>
      </motion.div>
    );
  }

  // Main Form
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <LuLock className="h-8 w-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Reset Your Password
        </h2>
        <p className="text-gray-600 text-sm">
          Enter your new password below
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* New Password Field */}
        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            New Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors pr-12 outline-none ${
                errors.newPassword ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter your new password"
              disabled={isLoading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={isLoading}
            >
              {showPassword ? (
                <LuEyeOff className="h-5 w-5" />
              ) : (
                <LuEye className="h-5 w-5" />
              )}
            </button>
          </div>
          <AnimatePresence>
            {errors.newPassword && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-1 text-sm text-red-600 flex items-center space-x-1"
              >
                <LuCircleAlert className="h-3 w-3" />
                <span>{errors.newPassword}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Password Requirements */}
        <AnimatePresence>
          {formData.newPassword && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-50 rounded-lg p-4 space-y-2"
            >
              <p className="text-sm font-medium text-gray-700 mb-2">
                Password Requirements:
              </p>
              <div className="space-y-1.5">
                {[
                  { key: "minLength", text: "At least 8 characters" },
                  { key: "hasUpper", text: "One uppercase letter (A-Z)" },
                  { key: "hasLower", text: "One lowercase letter (a-z)" },
                  { key: "hasNumber", text: "One number (0-9)" },
                  {
                    key: "hasSpecial",
                    text: "One special character (@$!%*?&)",
                  },
                ].map(({ key, text }) => (
                  <div key={key} className="flex items-center space-x-2">
                    {passwordValidation[
                      key as keyof typeof passwordValidation
                    ] ? (
                      <LuCircleCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <LuCircleX className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span
                      className={`text-xs ${
                        passwordValidation[
                          key as keyof typeof passwordValidation
                        ]
                          ? "text-green-600 font-medium"
                          : "text-gray-600"
                      }`}
                    >
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirm Password Field */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors pr-12 outline-none ${
                errors.confirmPassword ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Confirm your new password"
              disabled={isLoading}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={isLoading}
            >
              {showConfirmPassword ? (
                <LuEyeOff className="h-5 w-5" />
              ) : (
                <LuEye className="h-5 w-5" />
              )}
            </button>
          </div>
          <AnimatePresence>
            {errors.confirmPassword && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-1 text-sm text-red-600 flex items-center space-x-1"
              >
                <LuCircleAlert className="h-3 w-3" />
                <span>{errors.confirmPassword}</span>
              </motion.p>
            )}
          </AnimatePresence>

          {/* Match indicator */}
          {formData.confirmPassword && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2"
            >
              {formData.newPassword === formData.confirmPassword ? (
                <p className="text-xs text-green-600 flex items-center space-x-1">
                  <LuCircleCheck className="h-3 w-3" />
                  <span>Passwords match</span>
                </p>
              ) : (
                <p className="text-xs text-red-600 flex items-center space-x-1">
                  <LuCircleX className="h-3 w-3" />
                  <span>Passwords do not match</span>
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Submit Error */}
        <AnimatePresence>
          {errors.submit && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2"
            >
              <LuCircleAlert className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{errors.submit}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !passwordValidation.isValid || formData.newPassword !== formData.confirmPassword}
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Resetting Password...
            </>
          ) : (
            <>
              <LuLock className="h-4 w-4 mr-2" />
              Reset Password
            </>
          )}
        </button>
      </form>

      {/* Back to Login */}
      <div className="pt-4 border-t border-gray-200 text-center">
        <button
          onClick={() => onNavigate?.("signin")}
          disabled={isLoading}
          className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          Back to Sign In
        </button>
      </div>
    </div>
  );
}