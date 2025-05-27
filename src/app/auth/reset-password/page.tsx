"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { LuEye, LuEyeOff, LuLock, LuCircleX, LuCircleAlert, LuCircleCheck } from 'react-icons/lu';

const ResetPasswordPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState<string>('');

  // Extract token from URL params
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.push('/auth/forgot-password');
      return;
    }
    setResetToken(token);
  }, [searchParams, router]);

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
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};

    // Validate password
    const passwordValidation = validatePassword(formData.newPassword);
    if (!passwordValidation.isValid) {
      newErrors.newPassword = 'Password must meet all requirements below';
    }

    // Validate password confirmation
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const result = await resetPassword(resetToken, formData.newPassword);
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/auth/signin');
        }, 3000);
      } else {
        setErrors({ submit: result.message });
      }
    } catch {
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    }
  };

  const passwordValidation = validatePassword(formData.newPassword);

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <LuCircleCheck className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h1>
            <p className="text-gray-600">
              Your password has been successfully updated. You will be redirected to the login page in a few seconds.
            </p>
          </div>
          <button
            onClick={() => router.push('/auth/signin')}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <LuLock className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
          <p className="text-gray-600">Enter your new password below</p>
        </div>

        <div className="space-y-6">
          {/* New Password Field */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12 ${
                  errors.newPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <LuEyeOff className="h-5 w-5" /> : <LuEye className="h-5 w-5" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
            )}
          </div>

          {/* Password Requirements */}
          {formData.newPassword && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
              <div className="space-y-1">
                {[
                  { key: 'minLength', text: 'At least 8 characters' },
                  { key: 'hasUpper', text: 'One uppercase letter' },
                  { key: 'hasLower', text: 'One lowercase letter' },
                  { key: 'hasNumber', text: 'One number' },
                  { key: 'hasSpecial', text: 'One special character (@$!%*?&)' }
                ].map(({ key, text }) => (
                  <div key={key} className="flex items-center space-x-2">
                    {passwordValidation[key as keyof typeof passwordValidation] ? (
                      <LuCircleCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <LuCircleX className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm ${
                      passwordValidation[key as keyof typeof passwordValidation] ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12 ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Confirm your new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <LuEyeOff className="h-5 w-5" /> : <LuEye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <LuCircleAlert className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading || !passwordValidation.isValid || formData.newPassword !== formData.confirmPassword}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </div>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/auth/signin')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;