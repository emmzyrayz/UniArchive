"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useAuth } from "@/context/authContext";
import { useRouter } from "next/navigation";

// You'll need to import your logo
import Logo from "@/assets/img/logo/uniarchive.png";

const steps = ["Account Info", "University Info", "Password", "Confirmation", "Verify Email"];

export default function SignUp() {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    gender: "",
    dob: "",
    phone: "",
    university: "",
    faculty: "",
    department: "",
    regnumber: "",
    confirmpassword: "",
    verify: "",
  });

  const { register, verifyEmail, resendVerification } = useAuth();
  const router = useRouter();

  const nextStep = () => {
    setError("");
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  };
  
  const prevStep = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError(""); // Clear error when user starts typing
  };

  const validateStep = () => {
    switch (step) {
      case 0:
        if (!formData.name || !formData.email || !formData.dob || !formData.phone || !formData.gender) {
          setError("Please fill in all required fields");
          return false;
        }
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          setError("Please enter a valid email address");
          return false;
        }
        break;
      case 1:
        if (!formData.university || !formData.faculty || !formData.department || !formData.regnumber) {
          setError("Please fill in all university information");
          return false;
        }
        break;
      case 2:
        if (!formData.password || !formData.confirmpassword) {
          setError("Please fill in both password fields");
          return false;
        }
        if (formData.password.length < 8) {
          setError("Password must be at least 8 characters long");
          return false;
        }
        if (formData.password !== formData.confirmpassword) {
          setError("Passwords do not match");
          return false;
        }
        break;
      case 3:
        if (!formData.verify) {
          setError("Please enter the verification code");
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (step === 2) {
      // Submit registration when moving from password step
      await handleSubmit();
    } else if (step === 3) {
      // Verify email when moving from verification step
      await handleVerification();
    } else {
      nextStep();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");
    
    try {
      const result = await register(formData);
      
      if (result.success) {
        setSuccess("Registration successful! Please check your email for verification code.");
        nextStep(); // Move to verification step
      } else {
        setError(result.message);
      }
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerification = async () => {
    setIsSubmitting(true);
    setError("");
    
    try {
      const result = await verifyEmail(formData.email, formData.verify);
      
      if (result.success) {
        setSuccess("Email verified successfully! Redirecting...");
        setTimeout(() => {
          router.push("/auth/signin"); // Redirect to dashboard or home
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setIsSubmitting(true);
    setError("");
    
    try {
      const result = await resendVerification(formData.email);
      
      if (result.success) {
        setSuccess("Verification code sent! Please check your email.");
      } else {
        setError(result.message);
      }
    } catch {
      setError("Failed to resend code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        className="max-w-md w-full mx-auto p-8 bg-white rounded-2xl shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo Section */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-indigo-600 rounded flex items-center justify-center">
            {/* Replace with your actual logo */}
            <Image
          src={Logo}
          alt=""
          width={300}
          height={500}
          className=" object-cover w-full h-full"
        />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">
          Create Account
        </h2>
        <p className="text-center text-gray-600 mb-6">
          Step {step + 1} of {steps.length}: {steps[step]}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          ></div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Step 0: Account Info */}
        {step === 0 && (
          <div className="space-y-4">
            <input
              name="name"
              placeholder="Full Name*"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              required
            />
            <input
              name="email"
              placeholder="Email*"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              required
            />
            <input
              name="dob"
              placeholder="Date of Birth*"
              type="date"
              value={formData.dob}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              required
            />
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number*"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              required
            />
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              required
            >
              <option value="">Select Gender*</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        )}

        {/* Step 1: University Info */}
        {step === 1 && (
          <div className="space-y-4">
            <input
              name="university"
              placeholder="University*"
              value={formData.university}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              required
            />
            <input
              name="faculty"
              placeholder="Faculty*"
              value={formData.faculty}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              required
            />
            <input
              name="department"
              placeholder="Department*"
              value={formData.department}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              required
            />
            <input
              name="regnumber"
              placeholder="Registration Number*"
              value={formData.regnumber}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>
        )}

        {/* Step 2: Password */}
        {step === 2 && (
          <div className="space-y-4">
            <input
              name="password"
              placeholder="Password*"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              required
            />
            <input
              name="confirmpassword"
              placeholder="Confirm Password*"
              type="password"
              value={formData.confirmpassword}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              required
            />
            <div className="text-sm text-gray-600">
              Password must be at least 8 characters long
            </div>
          </div>
        )}

        {/* Step 3: Verification */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-gray-600">
                We&apos;ve sent a verification code to your email address.
              </p>
            </div>
            <input
              name="verify"
              placeholder="Enter 6-digit verification code*"
              type="text"
              value={formData.verify}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-center text-lg tracking-widest"
              maxLength={6}
              required
            />
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isSubmitting}
              className="w-full text-indigo-600 hover:text-indigo-800 text-sm underline"
            >
              Didn&apos;t receive the code? Resend
            </button>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Review Your Information
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p><span className="font-semibold">Name:</span> {formData.name}</p>
              <p><span className="font-semibold">Email:</span> {formData.email}</p>
              <p><span className="font-semibold">Phone:</span> {formData.phone}</p>
              <p><span className="font-semibold">Gender:</span> {formData.gender}</p>
              <p><span className="font-semibold">Date of Birth:</span> {formData.dob}</p>
              <p><span className="font-semibold">University:</span> {formData.university}</p>
              <p><span className="font-semibold">Faculty:</span> {formData.faculty}</p>
              <p><span className="font-semibold">Department:</span> {formData.department}</p>
              <p><span className="font-semibold">Registration Number:</span> {formData.regnumber}</p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          {step > 0 && step < 4 && (
            <button
              onClick={prevStep}
              disabled={isSubmitting}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
            >
              Back
            </button>
          )}
          
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className={`px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 ${
              step === 0 || step === 4 ? 'ml-auto' : ''
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : step === 2 ? 'Create Account' : 
               step === 3 ? 'Verify Email' : 
               step < 3 ? 'Next' : 'Complete'}
          </button>
        </div>

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Already have an account?{' '}
            <a href="/auth/signin" className="text-indigo-600 hover:text-indigo-800 font-semibold">
              Sign In
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}