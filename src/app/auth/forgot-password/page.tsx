"use client";

import React, { useState } from "react";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { LuCircleAlert, LuCircleCheck, LuMail, LuArrowLeft } from 'react-icons/lu';
import Logo from '@/assets/img/logo/uniarchive.png';

export default function ForgotPassword() {
  const router = useRouter();
  const { forgotPassword, isLoading } = useAuth();
  
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    if (!email) {
      setError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      setIsEmailValid(false);
      return;
    }

    try {
      const result = await forgotPassword(email);
      
      if (result.success) {
        setSuccess(true);
        setError("");
      } else {
        setError(result.message);
        setSuccess(false);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setSuccess(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 flex flex-col items-center justify-center bg-white rounded-xl shadow-md gap-4">
        <div className="logo rounded-[10px] mb-2 w-[200px] h-[200px] flex items-center justify-center bg-black/50">
          <Image
            src={Logo}
            alt="UniArchive Logo"
            width={200}
            height={200}
            className="object-cover w-full h-full"
          />
        </div>
        
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <LuCircleCheck className="h-16 w-16 text-green-500" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900">Check Your Email</h2>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <LuMail className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-800">Email Sent Successfully!</p>
            </div>
            <p className="text-sm text-green-700">
              We&apos;ve sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-xs text-green-600">
              Please check your inbox and click the link to reset your password.
            </p>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <p>Didn&apos;t receive the email?</p>
            <ul className="text-xs space-y-1 text-left">
              <li>• Check your spam/junk folder</li>
              <li>• Make sure you entered the correct email</li>
              <li>• Wait a few minutes and try again</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={() => {
              setSuccess(false);
              setEmail("");
              setError("");
            }}
            className="flex p-3 rounded bg-blue-600 hover:bg-blue-700 cursor-pointer text-white transition-colors duration-300 justify-center items-center space-x-2"
          >
            <LuMail className="h-4 w-4" />
            <span>Send Another Email</span>
          </button>
          
          <button
            onClick={() => router.push('/auth/signin')}
            className="flex p-3 rounded bg-gray-300 hover:bg-gray-400 cursor-pointer text-gray-700 hover:text-gray-800 transition-colors duration-300 justify-center items-center space-x-2"
          >
            <LuArrowLeft className="h-4 w-4" />
            <span>Back to Login</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 flex flex-col items-center justify-center bg-white rounded-xl shadow-md gap-2">
      <div className="logo rounded-[10px] mb-2 w-[300px] h-[300px] flex items-center justify-center bg-black/50">
        <Image
          src={Logo}
          alt="UniArchive Logo"
          width={300}
          height={500}
          className="object-cover w-full h-full"
        />
      </div>
      
      <h2 className="text-2xl font-bold mb-4 flex w-full">Forgot Password</h2>
      
      <div className="w-full mb-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full space-y-4">
        <div className="space-y-2">
          <input
            type="email"
            name="email"
            placeholder="Enter your email address"
            value={email}
            onChange={handleEmailChange}
            onKeyPress={handleKeyPress}
            className={`flex w-full p-3 border-gray-300 border-b-[2px] rounded-t-md hover:border-gray-600 transition-all duration-500 ease-in-out outline-none focus:border-blue-500 ${
              !isEmailValid && email ? 'border-red-500 hover:border-red-600 focus:border-red-500' : ''
            }`}
            disabled={isLoading}
          />
          
          {!isEmailValid && email && (
            <p className="text-red-500 text-xs flex items-center space-x-1">
              <LuCircleAlert className="h-3 w-3" />
              <span>Please enter a valid email address</span>
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
            <LuCircleAlert className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isLoading || !email || !isEmailValid}
          className="flex p-3 rounded bg-black/30 hover:bg-black/60 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer ml-auto text-white/70 hover:text-white disabled:text-gray-500 transition-all duration-300 items-center justify-center space-x-2 min-w-[140px]"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Sending...</span>
            </>
          ) : (
            <>
              <LuMail className="h-4 w-4" />
              <span>Reset Password</span>
            </>
          )}
        </button>
      </div>

      {/* Back to Login */}
      <div className="mt-4 w-full">
        <button
          onClick={() => router.push('/auth/signin')}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1 mx-auto"
        >
          <LuArrowLeft className="h-3 w-3" />
          <span>Back to Login</span>
        </button>
      </div>
    </div>
  );
}