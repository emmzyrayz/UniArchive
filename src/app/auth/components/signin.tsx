"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthNavigationProps } from "../types";
import { Button, Input } from "@/components/UI";

// Mock user data for offline testing - REMOVE when connecting to backend
const mockUsers = [
  {
    email: "student@uniarchive.com",
    password: "password123",
    name: "John Doe",
    university: "University of Lagos",
  },
  {
    email: "test@example.com",
    password: "test1234",
    name: "Jane Smith",
    university: "University of Ibadan",
  },
];

export default function Signin({ onNavigate }: AuthNavigationProps) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<typeof mockUsers[0] | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }

    return true;
  };

  // OFFLINE LOGIN SIMULATION - Replace with actual API call
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setIsSubmitting(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock authentication - REMOVE this logic when connecting to backend
    const user = mockUsers.find(
      (u) => u.email === formData.email && u.password === formData.password
    );

    if (user) {
      setLoggedInUser(user);
      setShowSuccessModal(true);
      
      // In production, you'd save the auth token here:
      // if (rememberMe) {
      //   localStorage.setItem('authToken', response.token);
      // } else {
      //   sessionStorage.setItem('authToken', response.token);
      // }
    } else {
      setError("Invalid email or password");
    }

    setIsSubmitting(false);

    /* REPLACE THE ABOVE WITH THIS WHEN CONNECTING TO BACKEND:
    
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          rememberMe: rememberMe
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store auth token
        if (rememberMe) {
          localStorage.setItem('authToken', data.token);
        } else {
          sessionStorage.setItem('authToken', data.token);
        }
        
        setLoggedInUser(data.user);
        setShowSuccessModal(true);
        
        // Redirect after short delay
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        setError(data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
    */
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(""); // Clear error when user types
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">
            Welcome Back
          </h2>
          <p className="text-center text-gray-600">Sign in to your account</p>
        </div>

        {/* Demo Credentials Banner - REMOVE in production */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <p className="font-semibold text-blue-800 mb-1">Demo Credentials:</p>
          <p className="text-blue-700">Email: student@uniarchive.com</p>
          <p className="text-blue-700">Password: password123</p>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="email"
            type="email"
            placeholder="Email Address*"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />

          <Input
            name="password"
            placeholder="Password*"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => onNavigate?.("forgot")}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
              disabled={isSubmitting}
            >
              Forgot Password?
            </button>
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            label="Sign In"
            loading={isSubmitting}
            loadingText="Signing In"
            spinnerStyle="style2"
            variant="none"
            base="off"
          />
        </form>

        {/* Sign Up Link */}
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-gray-600 text-sm">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => onNavigate?.("signup")}
              className="text-indigo-600 hover:text-indigo-800 font-semibold"
              disabled={isSubmitting}
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && loggedInUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowSuccessModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Welcome Back!
                </h3>
                <p className="text-gray-600 text-sm">
                  You&apos;ve successfully signed in
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm mb-6">
                <p>
                  <span className="font-semibold text-gray-700">Name:</span>{" "}
                  <span className="text-gray-600">{loggedInUser.name}</span>
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Email:</span>{" "}
                  <span className="text-gray-600">{loggedInUser.email}</span>
                </p>
                <p>
                  <span className="font-semibold text-gray-700">
                    University:
                  </span>{" "}
                  <span className="text-gray-600">
                    {loggedInUser.university}
                  </span>
                </p>
              </div>

              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  // In production: window.location.href = '/dashboard';
                  console.log("Redirecting to dashboard...");
                }}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                label="Go to Dashboard"
                variant="none"
                base="off"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}