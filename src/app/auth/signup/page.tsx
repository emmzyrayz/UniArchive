"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useAuth } from "@/context/authContext";
import { useRouter } from "next/navigation";

// You'll need to import your logo
import Logo from "@/assets/img/logo/uniarchive.png";

const steps = ["Account Info", "University Info", "Password", "Confirmation", "Verify Email"];


// Interfaces for school data
interface Department {
  id: string;
  name: string;
}

interface Faculty {
  id: string;
  name: string;
  departmentsCount: number;
  departments: Department[];
}

interface University {
  id: string;
  name: string;
  description: string;
  location: string;
  website: string;
  logoUrl: string;
  foundingYear?: number;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  membership: 'public' | 'private';
  level: 'federal' | 'state';
  usid: string;
  psid: string;
  motto?: string;
  chancellor?: string;
  viceChancellor?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  facultiesCount: number;
  departmentsCount: number;
  faculties: Faculty[];
}

// Enhanced error interface
interface FetchError {
  message: string;
  code?: string;
  retryable?: boolean;
}

export default function SignUp() {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCustomLevel, setShowCustomLevel] = useState(false);
  
  // School data states
  const [universities, setUniversities] = useState<University[]>([]);
  const [filteredFaculties, setFilteredFaculties] = useState<Faculty[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [schoolDataError, setSchoolDataError] = useState<FetchError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Manual input fallback states
  const [useManualInput, setUseManualInput] = useState(false);
  const [manualUniversityName, setManualUniversityName] = useState("");
  const [manualFacultyName, setManualFacultyName] = useState("");
  const [manualDepartmentName, setManualDepartmentName] = useState("");

  // Search and filter states
  const [universitySearch, setUniversitySearch] = useState("");
  const [membershipFilter, setMembershipFilter] = useState<'public' | 'private' | ''>('');
  const [levelFilter, setLevelFilter] = useState<'federal' | 'state' | ''>('');
  const [showFilters, setShowFilters] = useState(false);


  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    gender: "",
    level: "",
    customLevel: "",
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

  // Fetch universities with retry logic and caching
  const fetchUniversities = useCallback(async (retry = false) => {
    try {
      setIsLoadingSchools(true);
      setSchoolDataError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (universitySearch) params.append('search', universitySearch);
      if (membershipFilter) params.append('membership', membershipFilter);
      if (levelFilter) params.append('level', levelFilter);
      params.append('limit', '100');

      const response = await fetch(`/api/public/universities?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add caching headers
        cache: retry ? 'no-cache' : 'default',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch universities`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch universities');
      }

      // Filter only active universities for signup
      const activeUniversities = result.universities?.filter(
        (uni: University) => uni.status === 'active'
      ) || [];
      
      setUniversities(activeUniversities);
      setRetryCount(0);
      console.log(`Loaded ${activeUniversities.length} active universities`);
      
    } catch (error) {
      console.error('Error fetching universities:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to load university data';
      const errorName = error instanceof Error ? error.name : 'FETCH_ERROR';
      
      const fetchError: FetchError = {
        message: errorMessage,
        code: errorName,
        retryable: !errorMessage.includes('404') && retryCount < 3
      };
      
      setSchoolDataError(fetchError);
      
      // Auto-retry for retryable errors
      if (fetchError.retryable && retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchUniversities(true);
        }, 2000 * (retryCount + 1)); // Exponential backoff
      }
    } finally {
      setIsLoadingSchools(false);
    }
  }, [universitySearch, membershipFilter, levelFilter, retryCount]);


  // Initial fetch
  useEffect(() => {
    fetchUniversities();
  }, [fetchUniversities]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (universitySearch || membershipFilter || levelFilter) {
        fetchUniversities();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [universitySearch, membershipFilter, levelFilter, fetchUniversities]);

   // Memoized filtered universities for performance
  const displayedUniversities = useMemo(() => {
    if (!universitySearch && !membershipFilter && !levelFilter) {
      return universities;
    }
    
    return universities.filter(uni => {
      const matchesSearch = !universitySearch || 
        uni.name.toLowerCase().includes(universitySearch.toLowerCase()) ||
        uni.location.toLowerCase().includes(universitySearch.toLowerCase());
      
      const matchesMembership = !membershipFilter || uni.membership === membershipFilter;
      const matchesLevel = !levelFilter || uni.level === levelFilter;
      
      return matchesSearch && matchesMembership && matchesLevel;
    });
  }, [universities, universitySearch, membershipFilter, levelFilter]);

    // Update faculties when university changes
  useEffect(() => {
    if (formData.university && !useManualInput) {
      const selectedUniversity = universities.find(uni => uni.id === formData.university);
      if (selectedUniversity) {
        setFilteredFaculties(selectedUniversity.faculties || []);
        // Clear faculty and department when university changes
        setFormData(prev => ({
          ...prev,
          faculty: "",
          department: ""
        }));
        setFilteredDepartments([]);
      }
    } else {
      setFilteredFaculties([]);
      setFilteredDepartments([]);
    }
  }, [formData.university, universities, useManualInput]);

  // Update departments when faculty changes
  useEffect(() => {
    if (formData.faculty && !useManualInput) {
      const selectedFaculty = filteredFaculties.find(fac => fac.id === formData.faculty);
      if (selectedFaculty) {
        setFilteredDepartments(selectedFaculty.departments || []);
        // Clear department when faculty changes
        setFormData(prev => ({
          ...prev,
          department: ""
        }));
      }
    } else if (useManualInput) {
      setFilteredDepartments([]);
    }
  }, [formData.faculty, filteredFaculties, useManualInput]);

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
    
    // Handle level selection change
    if (name === "level") {
      if (value === "Other") {
        setShowCustomLevel(true);
        setFormData({ ...formData, [name]: value, customLevel: "" });
      } else {
        setShowCustomLevel(false);
        setFormData({ ...formData, [name]: value, customLevel: "" });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    setError(""); // Clear error when user starts typing
  };

  const handleManualInputToggle = () => {
    setUseManualInput(!useManualInput);
    // Clear form data when switching modes
    setFormData(prev => ({
      ...prev,
      university: "",
      faculty: "",
      department: ""
    }));
    setManualUniversityName("");
    setManualFacultyName("");
    setManualDepartmentName("");
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
        if (useManualInput) {
          if (!manualUniversityName || !manualFacultyName || !manualDepartmentName || !formData.regnumber || !formData.level) {
            setError("Please fill in all university information");
            return false;
          }
        } else {
          if (!formData.university || !formData.faculty || !formData.department || !formData.regnumber || !formData.level) {
            setError("Please fill in all university information");
            return false;
          }
        }
        // Validate custom level if "Other" is selected
        if (formData.level === "Other" && !formData.customLevel.trim()) {
          setError("Please specify your level/year");
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
      let universityName, facultyName, departmentName;
      
      if (useManualInput) {
        universityName = manualUniversityName;
        facultyName = manualFacultyName;
        departmentName = manualDepartmentName;
      } else {
        // Get university name instead of ID for backend
        const selectedUniversity = universities.find(uni => uni.id === formData.university);
        const selectedFaculty = filteredFaculties.find(fac => fac.id === formData.faculty);
        const selectedDepartment = filteredDepartments.find(dep => dep.id === formData.department);
        
        universityName = selectedUniversity?.name || formData.university;
        facultyName = selectedFaculty?.name || formData.faculty;
        departmentName = selectedDepartment?.name || formData.department;
      }
      
      // Prepare form data with names instead of IDs
      const submitData = {
        ...formData,
        university: universityName,
        faculty: facultyName,
        department: departmentName,
        level: formData.level === "Other" ? formData.customLevel : formData.level
      };
      
      const result = await register(submitData);
      
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
          router.push("/auth/signin");
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
        
       {/* School Data Loading Error with Retry */}
        {schoolDataError && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg text-sm">
            <div className="flex items-center justify-between">
              <span>{schoolDataError.message}</span>
              {schoolDataError.retryable && (
                <button
                  onClick={() => fetchUniversities(true)}
                  disabled={isLoadingSchools}
                  className="text-indigo-600 hover:text-indigo-800 underline text-xs"
                >
                  Retry
                </button>
              )}
            </div>
            <p className="mt-2 text-xs">
              You can still proceed with manual entry below.
            </p>
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
            {/* Manual Input Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">
                Can&apos;t find your school? Use manual entry
              </span>
              <button
                type="button"
                onClick={handleManualInputToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useManualInput ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useManualInput ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Search and Filter Controls */}
            {!useManualInput && (
              <div className="space-y-3">
                {/* Search Input */}
                <input
                  type="text"
                  placeholder="Search universities by name or location..."
                  value={universitySearch}
                  onChange={(e) => setUniversitySearch(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
                
                {/* Filter Toggle */}
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 underline"
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>

                {/* Filters */}
                {showFilters && (
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={membershipFilter}
                      onChange={(e) => setMembershipFilter(e.target.value as 'public' | 'private' | '')}
                      className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                    >
                      <option value="">All Types</option>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                    
                    <select
                      value={levelFilter}
                      onChange={(e) => setLevelFilter(e.target.value as 'federal' | 'state' | '')}
                      className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                    >
                      <option value="">All Levels</option>
                      <option value="federal">Federal</option>
                      <option value="state">State</option>
                    </select>
                  </div>
                )}
              </div>
            )}
            
            {/* University Selection */}
            {useManualInput ? (
              <input
                type="text"
                placeholder="Enter University Name*"
                value={manualUniversityName}
                onChange={(e) => setManualUniversityName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                required
              />
            ) : (
              <div>
                <select
                  name="university"
                  value={formData.university}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  required
                  disabled={isLoadingSchools}
                >
                  <option value="">
                    {isLoadingSchools ? "Loading universities..." : "Select University*"}
                  </option>
                  {displayedUniversities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name} ({university.location})
                    </option>
                  ))}
                </select>
                {isLoadingSchools && (
                  <div className="flex items-center mt-2 text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                    Loading school data...
                  </div>
                )}
                {displayedUniversities.length === 0 && !isLoadingSchools && (
                  <p className="text-sm text-gray-500 mt-2">
                    No universities found. Try adjusting your search or filters.
                  </p>
                )}
              </div>
            )}

            {/* Faculty Selection */}
            {useManualInput ? (
              <input
                type="text"
                placeholder="Enter Faculty Name*"
                value={manualFacultyName}
                onChange={(e) => setManualFacultyName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                required
              />
            ) : (
              <select
                name="faculty"
                value={formData.faculty}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                required
                disabled={!formData.university || filteredFaculties.length === 0}
              >
                <option value="">
                  {!formData.university 
                    ? "Select university first" 
                    : filteredFaculties.length === 0 
                      ? "No faculties available" 
                      : "Select Faculty*"
                  }
                </option>
                {filteredFaculties.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.name}
                  </option>
                ))}
              </select>
            )}

            {/* Department Selection */}
            {useManualInput ? (
              <input
                type="text"
                placeholder="Enter Department Name*"
                value={manualDepartmentName}
                onChange={(e) => setManualDepartmentName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                required
              />
            ) : (
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                required
                disabled={!formData.faculty || filteredDepartments.length === 0}
              >
                <option value="">
                  {!formData.faculty 
                    ? "Select faculty first" 
                    : filteredDepartments.length === 0 
                      ? "No departments available" 
                      : "Select Department*"
                  }
                </option>
                {filteredDepartments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            )}

            {/* Level Selection */}
            <select
              name="level"
              value={formData.level}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              required
            >
              <option value="">Select your Level/Year*</option>
              <option value="100L">100 Level/Year 1</option>
              <option value="200L">200 Level/Year 2</option>
              <option value="300L">300 Level/Year 3</option>
              <option value="400L">400 Level/Year 4</option>
              <option value="500L">500 Level/Year 5</option>
              <option value="600L">600 Level/Year 6</option>
              <option value="700L">700 Level/Year 7</option>
              <option value="Other">Other (Specify)</option>
            </select>
            
            {/* Custom Level Input */}
            {showCustomLevel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <input
                  name="customLevel"
                  placeholder="Enter your level/year (e.g., Year 8, 800L, etc.)*"
                  value={formData.customLevel}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Please specify your current level or year of study
                </p>
              </motion.div>
            )}
            
            {/* Registration Number */}
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
              <p><span className="font-semibold">University:</span> {
                universities.find(uni => uni.id === formData.university)?.name || formData.university
              }</p>
              <p><span className="font-semibold">Faculty:</span> {
                filteredFaculties.find(fac => fac.id === formData.faculty)?.name || formData.faculty
              }</p>
              <p><span className="font-semibold">Department:</span> {
                filteredDepartments.find(dep => dep.id === formData.department)?.name || formData.department
              }</p>
              <p><span className="font-semibold">Level:</span> {formData.level === "Other" ? formData.customLevel : formData.level}</p>
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