"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthNavigationProps } from "../types";
import { Input } from "@/components/UI";

const steps = ["Account Info", "University Info", "Password", "Confirmation"];

// Mock university data for offline testing
const mockUniversities = [
  { id: 1, name: "University of Lagos", type: "federal", membership: "public" },
  {
    id: 2,
    name: "University of Ibadan",
    type: "federal",
    membership: "public",
  },
  { id: 3, name: "Covenant University", type: "state", membership: "private" },
];

const mockFaculties = {
  1: ["Faculty of Science", "Faculty of Arts", "Faculty of Engineering"],
  2: ["Faculty of Medicine", "Faculty of Law", "Faculty of Education"],
  3: ["Faculty of Computing", "Faculty of Management", "Faculty of Sciences"],
};

const mockDepartments = {
  "Faculty of Science": ["Computer Science", "Physics", "Chemistry", "Biology"],
  "Faculty of Arts": ["English", "History", "Philosophy", "Languages"],
  "Faculty of Engineering": [
    "Civil Engineering",
    "Electrical Engineering",
    "Mechanical Engineering",
  ],
  "Faculty of Medicine": ["Medicine & Surgery", "Nursing", "Pharmacy"],
  "Faculty of Law": ["Common Law", "Islamic Law"],
  "Faculty of Education": ["Educational Management", "Curriculum Studies"],
  "Faculty of Computing": [
    "Computer Science",
    "Information Systems",
    "Software Engineering",
  ],
  "Faculty of Management": [
    "Business Administration",
    "Accounting",
    "Marketing",
  ],
  "Faculty of Sciences": ["Mathematics", "Statistics", "Biotechnology"],
};

export default function SignUp({ onNavigate }: AuthNavigationProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showCustomLevel, setShowCustomLevel] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Manual input fallback states
  const [useManualInput, setUseManualInput] = useState(false);
  const [manualUniversityName, setManualUniversityName] = useState("");
  const [manualFacultyName, setManualFacultyName] = useState("");
  const [manualDepartmentName, setManualDepartmentName] = useState("");

  // Search and filter states
  const [universitySearch, setUniversitySearch] = useState("");
  const [membershipFilter, setMembershipFilter] = useState<
    "public" | "private" | ""
  >("");
  const [levelFilter, setLevelFilter] = useState<"federal" | "state" | "">("");
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
  });

  // Filter universities based on search and filters
  const filteredUniversities = mockUniversities.filter((uni) => {
    const matchesSearch = uni.name
      .toLowerCase()
      .includes(universitySearch.toLowerCase());
    const matchesMembership =
      !membershipFilter || uni.membership === membershipFilter;
    const matchesLevel = !levelFilter || uni.type === levelFilter;
    return matchesSearch && matchesMembership && matchesLevel;
  });

  // Get faculties for selected university
  const availableFaculties = formData.university
    ? mockFaculties[
        parseInt(formData.university) as keyof typeof mockFaculties
      ] || []
    : [];

  // Get departments for selected faculty
  const availableDepartments = formData.faculty
    ? mockDepartments[formData.faculty as keyof typeof mockDepartments] || []
    : [];

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

    if (name === "level") {
      if (value === "Other") {
        setShowCustomLevel(true);
        setFormData({ ...formData, [name]: value, customLevel: "" });
      } else {
        setShowCustomLevel(false);
        setFormData({ ...formData, [name]: value, customLevel: "" });
      }
    } else if (name === "university") {
      // Reset faculty and department when university changes
      setFormData({ ...formData, [name]: value, faculty: "", department: "" });
    } else if (name === "faculty") {
      // Reset department when faculty changes
      setFormData({ ...formData, [name]: value, department: "" });
    } else {
      setFormData({ ...formData, [name]: value });
    }

    setError("");
  };

  const handleManualInputToggle = () => {
    setUseManualInput(!useManualInput);
    setFormData((prev) => ({
      ...prev,
      university: "",
      faculty: "",
      department: "",
    }));
    setManualUniversityName("");
    setManualFacultyName("");
    setManualDepartmentName("");
  };

  const validateStep = () => {
    switch (step) {
      case 0:
        if (
          !formData.name ||
          !formData.email ||
          !formData.dob ||
          !formData.phone ||
          !formData.gender
        ) {
          setError("Please fill in all required fields");
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          setError("Please enter a valid email address");
          return false;
        }
        break;
      case 1:
        if (useManualInput) {
          if (
            !manualUniversityName ||
            !manualFacultyName ||
            !manualDepartmentName ||
            !formData.regnumber ||
            !formData.level
          ) {
            setError("Please fill in all university information");
            return false;
          }
        } else {
          if (
            !formData.university ||
            !formData.faculty ||
            !formData.department ||
            !formData.regnumber ||
            !formData.level
          ) {
            setError("Please fill in all university information");
            return false;
          }
        }
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
    }
    return true;
  };

  // OFFLINE SUBMISSION - This is what you'll replace with actual API call
  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // In production, replace this with:
    // const response = await fetch('/api/auth/signup', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(getFinalFormData())
    // });

    setIsSubmitting(false);
    setShowSuccessModal(true);
  };

  // Helper function to get final form data
  const getFinalFormData = () => {
    const selectedUniversity = mockUniversities.find(
      (u) => u.id === parseInt(formData.university)
    );

    return {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      gender: formData.gender,
      dob: formData.dob,
      phone: formData.phone,
      university: useManualInput
        ? manualUniversityName
        : selectedUniversity?.name || "",
      faculty: useManualInput ? manualFacultyName : formData.faculty,
      department: useManualInput ? manualDepartmentName : formData.department,
      level: formData.level === "Other" ? formData.customLevel : formData.level,
      regnumber: formData.regnumber,
    };
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (step === 2) {
      await handleSubmit();
      nextStep(); // Move to confirmation step
    } else {
      nextStep();
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">
            Create Account
          </h2>
          <p className="text-center text-gray-600 mb-6">
            Step {step + 1} of {steps.length}: {steps[step]}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          ></div>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Step 0: Account Info */}
        {step === 0 && (
          <div className="space-y-4">
            <Input
              name="name"
              placeholder="Full Name*"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <Input
              name="email"
              placeholder="Email*"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <Input
              name="dob"
              placeholder="Date of Birth*"
              type="date"
              value={formData.dob}
              onChange={handleChange}
              required
            />
            <Input
              type="tel"
              name="phone"
              placeholder="Phone Number*"
              value={formData.phone}
              onChange={handleChange}
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
                  useManualInput ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useManualInput ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Search and Filter Controls */}
            {!useManualInput && (
              <div className="space-y-3">
                <Input
                  name="uni-search"
                  type="text"
                  placeholder="Search universities by name..."
                  value={universitySearch}
                  onChange={(e) => setUniversitySearch(e.target.value)}
                />

                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 underline"
                >
                  {showFilters ? "Hide Filters" : "Show Filters"}
                </button>

                {showFilters && (
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={membershipFilter}
                      onChange={(e) =>
                        setMembershipFilter(
                          e.target.value as "public" | "private" | ""
                        )
                      }
                      className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    >
                      <option value="">All Types</option>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>

                    <select
                      value={levelFilter}
                      onChange={(e) =>
                        setLevelFilter(
                          e.target.value as "federal" | "state" | ""
                        )
                      }
                      className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
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
              <Input
                name="uni-name"
                type="text"
                placeholder="Enter University Name*"
                value={manualUniversityName}
                onChange={(e) => setManualUniversityName(e.target.value)}
                required
              />
            ) : (
              <select
                name="university"
                value={formData.university}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              >
                <option value="">Select University*</option>
                {filteredUniversities.map((uni) => (
                  <option key={uni.id} value={uni.id}>
                    {uni.name}
                  </option>
                ))}
              </select>
            )}

            {/* Faculty Selection */}
            {useManualInput ? (
              <Input
                name="faculty-name"
                type="text"
                placeholder="Enter Faculty Name*"
                value={manualFacultyName}
                onChange={(e) => setManualFacultyName(e.target.value)}
                required
              />
            ) : (
              <select
                name="faculty"
                value={formData.faculty}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
                disabled={!formData.university}
              >
                <option value="">
                  {formData.university
                    ? "Select Faculty*"
                    : "Select university first"}
                </option>
                {availableFaculties.map((faculty) => (
                  <option key={faculty} value={faculty}>
                    {faculty}
                  </option>
                ))}
              </select>
            )}

            {/* Department Selection */}
            {useManualInput ? (
              <Input
                name="department-name"
                type="text"
                placeholder="Enter Department Name*"
                value={manualDepartmentName}
                onChange={(e) => setManualDepartmentName(e.target.value)}
                required
              />
            ) : (
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
                disabled={!formData.faculty}
              >
                <option value="">
                  {formData.faculty
                    ? "Select Department*"
                    : "Select faculty first"}
                </option>
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            )}

            {/* Level Selection */}
            <select
              name="level"
              value={formData.level}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
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
            <AnimatePresence>
              {showCustomLevel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Input
                    name="customLevel"
                    type="text"
                    placeholder="Enter your level/year (e.g., Year 8, 800L)*"
                    value={formData.customLevel}
                    onChange={handleChange}
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Please specify your current level or year of study
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Registration Number */}
            <Input
              type="text"
              name="regnumber"
              placeholder="Registration Number*"
              value={formData.regnumber}
              onChange={handleChange}
              required
            />
          </div>
        )}

        {/* Step 2: Password */}
        {step === 2 && (
          <div className="space-y-4">
            <Input
              name="password"
              placeholder="Password*"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <Input
              name="confirmpassword"
              placeholder="Confirm Password*"
              type="password"
              value={formData.confirmpassword}
              onChange={handleChange}
              required
            />
            <div className="text-sm text-gray-600">
              Password must be at least 8 characters long
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Review Your Information
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
              <p>
                <span className="font-semibold">Name:</span> {formData.name}
              </p>
              <p>
                <span className="font-semibold">Email:</span> {formData.email}
              </p>
              <p>
                <span className="font-semibold">Phone:</span> {formData.phone}
              </p>
              <p>
                <span className="font-semibold">Gender:</span> {formData.gender}
              </p>
              <p>
                <span className="font-semibold">Date of Birth:</span>{" "}
                {formData.dob}
              </p>
              <p>
                <span className="font-semibold">University:</span>{" "}
                {getFinalFormData().university}
              </p>
              <p>
                <span className="font-semibold">Faculty:</span>{" "}
                {getFinalFormData().faculty}
              </p>
              <p>
                <span className="font-semibold">Department:</span>{" "}
                {getFinalFormData().department}
              </p>
              <p>
                <span className="font-semibold">Level:</span>{" "}
                {getFinalFormData().level}
              </p>
              <p>
                <span className="font-semibold">Registration Number:</span>{" "}
                {formData.regnumber}
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          {step > 0 && (
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
              step === 0 ? "ml-auto" : ""
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : step === 2 ? (
              "Create Account"
            ) : step < 3 ? (
              "Next"
            ) : (
              "View Summary"
            )}
          </button>
        </div>

        {/* Login Link */}
        <div className="text-center pt-4">
          <p className="text-gray-600 text-sm">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => onNavigate?.("signin")}
              className="text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
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
              className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
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
                  Registration Successful!
                </h3>
                <p className="text-gray-600 text-sm">
                  Your account has been created successfully.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                <h4 className="font-semibold text-gray-800 mb-3">
                  Account Details:
                </h4>
                <div className="space-y-2">
                  <p>
                    <span className="font-semibold text-gray-700">Name:</span>{" "}
                    <span className="text-gray-600">{formData.name}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">Email:</span>{" "}
                    <span className="text-gray-600">{formData.email}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">Phone:</span>{" "}
                    <span className="text-gray-600">{formData.phone}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">Gender:</span>{" "}
                    <span className="text-gray-600">{formData.gender}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">
                      Date of Birth:
                    </span>{" "}
                    <span className="text-gray-600">{formData.dob}</span>
                  </p>

                  <hr className="my-3 border-gray-300" />

                  <p>
                    <span className="font-semibold text-gray-700">
                      University:
                    </span>{" "}
                    <span className="text-gray-600">
                      {getFinalFormData().university}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">
                      Faculty:
                    </span>{" "}
                    <span className="text-gray-600">
                      {getFinalFormData().faculty}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">
                      Department:
                    </span>{" "}
                    <span className="text-gray-600">
                      {getFinalFormData().department}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">Level:</span>{" "}
                    <span className="text-gray-600">
                      {getFinalFormData().level}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">
                      Reg Number:
                    </span>{" "}
                    <span className="text-gray-600">{formData.regnumber}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  onNavigate?.("signin");
                }}
                className="w-full mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
              >
                Go to Sign In
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
