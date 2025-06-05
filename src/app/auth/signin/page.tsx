"use client";

import React, { useState } from "react";
import Image from "next/image";
import Logo from "@/assets/img/logo/uniarchive.png";
import { useAuth } from "@/context/authContext";
import { useAuthFlow } from "@/hooks/useAuthFlow"; // You'll need to create this file

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  
  const { resendVerification } = useAuth();
  const { signInWithRedirect, verifyEmailWithRedirect, isLoading } = useAuthFlow();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const result = await signInWithRedirect(formData.email, formData.password);
      
      if (!result.success) {
        // Check if the error is about email verification
        if (result.message.includes("verify your email")) {
          setShowVerification(true);
        }
        setError(result.message);
      }
      // If successful, the hook handles the redirect
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!verificationCode) {
      setError("Please enter the verification code");
      return;
    }

    try {
      const result = await verifyEmailWithRedirect(formData.email, verificationCode);
      
      if (!result.success) {
        setError(result.message);
      }
      // If successful, the hook handles the redirect
    } catch (err) {
      console.error("Verification error:", err);
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const handleResendVerification = async () => {
    setError("");
    
    try {
      const result = await resendVerification(formData.email);
      
      if (result.success) {
        setError(""); // Clear any existing errors
        alert("Verification code sent to your email!");
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error("Resend verification error:", err);
      setError("Failed to resend verification code. Please try again.");
    }
  };

  if (showVerification) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md">
        <div className="logo rounded-[10px] mb-2 w-[300px] h-[300px] flex items-center justify-center bg-black/50">
          <Image
            src={Logo}
            alt="UniArchive Logo"
            width={300}
            height={500}
            className="object-cover w-full h-full"
          />
        </div>
        <h2 className="text-2xl font-bold mb-4">Verify Your Email</h2>
        <p className="text-gray-600 mb-4">
          Please check your email and enter the verification code below.
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleVerification} className="flex flex-col gap-2 w-full space-y-4">
          <input
            name="verificationCode"
            placeholder="Enter verification code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            className="flex w-full p-2 border-gray-300 border-b-[2px] rounded-t-md hover:border-gray-600 transition-all 500ms ease-in-out outline-none"
            disabled={isLoading}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex p-3 rounded bg-black/30 hover:bg-black/60 cursor-pointer text-white/60 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Verifying..." : "Verify Email"}
            </button>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isLoading}
              className="flex p-3 rounded bg-gray-300 hover:bg-gray-400 cursor-pointer text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resend Code
            </button>
          </div>
        </form>

        <button
          onClick={() => setShowVerification(false)}
          className="mt-4 text-blue-600 hover:text-blue-800 underline"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md">
      <div className="logo rounded-[10px] mb-2 w-[300px] h-[300px] flex items-center justify-center bg-black/50">
        <Image
          src={Logo}
          alt="UniArchive Logo"
          width={300}
          height={500}
          className="object-cover w-full h-full"
        />
      </div>
      <h2 className="text-2xl font-bold mb-4">Login</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-2 w-full space-y-4">
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="flex w-full p-2 border-gray-300 border-b-[2px] rounded-t-md hover:border-gray-600 transition-all 500ms ease-in-out outline-none"
          disabled={isLoading}
          required
        />
        <input
          name="password"
          placeholder="Password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="flex w-full p-2 border-gray-300 border-b-[2px] rounded-t-md hover:border-gray-600 transition-all 500ms ease-in-out outline-none"
          disabled={isLoading}
          required
        />
        <button
          type="submit"
          disabled={isLoading}
          className="flex p-3 rounded bg-black/30 hover:bg-black/60 cursor-pointer ml-auto text-white/60 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <a
          href="/auth/forgot-password"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Forgot Password?
        </a>
      </div>
      
      <div className="mt-2 text-center">
        <span className="text-gray-600">Don&apos;t have an account? </span>
        <a
          href="/auth/signup"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Sign up
        </a>
      </div>
    </div>
  );
}