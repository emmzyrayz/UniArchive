"use client";

import React, {useState} from "react";
// import {Button} from "@/components/ui/button";
// import {Input} from "@/components/ui/input";
import {motion} from "framer-motion";
import Image from "next/image";
import Logo from "@/assets/img/logo/uniarchive.png";

const steps = ["Account Info", "University Info", "Confirmation"];

export default function SignUp()  {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    gender: "",
    university: "",
    faculty: "",
    department: "",
  });

  const nextStep = () =>
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const {name, value} = e.target;
    setFormData({...formData, [name]: value});
  };

  return (
    <motion.div
      className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md"
      initial={{opacity: 0}}
      animate={{opacity: 1}}
    >
      <div className="logo rounded-[10px] mb-2 w-[300px] h-[300px] flex items-center justify-center bg-black/50">
        <Image
          src={Logo}
          alt=""
          width={300}
          height={500}
          className=" object-cover w-full h-full"
        />
      </div>
      <h2 className="text-2xl font-bold mb-4">Signup - {steps[step]}</h2>

      {step === 0 && (
        <div className="flex flex-col gap-2 w-full space-y-4">
          <input
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            className="flex w-full p-2 border-gray-300 border-b-[2px] rounded-t-md hover:border-gray-600 transition-all 500ms ease-in-out outline-none "
          />
          <input
            name="email"
            placeholder="Email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="flex w-full p-2 border-gray-300 border-b-[2px] rounded-t-md hover:border-gray-600 transition-all 500ms ease-in-out outline-none "
          />
          <input
            name="password"
            placeholder="Password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            className="flex w-full p-2 border-gray-300 border-b-[2px] rounded-t-md hover:border-gray-600 transition-all 500ms ease-in-out outline-none "
          />
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full border outline-none rounded-lg p-2"
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-2 w-full space-y-4">
          <input
            name="university"
            placeholder="University of Choice"
            value={formData.university}
            onChange={handleChange}
            className="flex w-full p-2 border-gray-300 border-b-[2px] rounded-t-md hover:border-gray-600 transition-all 500ms ease-in-out outline-none"
          />
          <input
            name="Faculty"
            placeholder="Faculty of Choice"
            value={formData.faculty}
            onChange={handleChange}
            className="flex w-full p-2 border-gray-300 border-b-[2px] rounded-t-md hover:border-gray-600 transition-all 500ms ease-in-out outline-none"
          />
          <input
            name="Department"
            placeholder="Department of Choice"
            value={formData.department}
            onChange={handleChange}
            className="flex w-full p-2 border-gray-300 border-b-[2px] rounded-t-md hover:border-gray-600 transition-all 500ms ease-in-out outline-none"
          />
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-2 w-full space-y-4">
          <h3 className="text-lg font-medium">Review Your Information</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p>
              <span className="font-semibold">Name:</span> {formData.name}
            </p>
            <p>
              <span className="font-semibold">Email:</span> {formData.email}
            </p>
            <p>
              <span className="font-semibold">Gender:</span> {formData.gender}
            </p>
            <p>
              <span className="font-semibold">University:</span>{" "}
              {formData.university}
            </p>
            <p>
              <span className="font-semibold">Faculty:</span> {formData.faculty}
            </p>
            <p>
              <span className="font-semibold">Department:</span>{" "}
              {formData.department}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between mt-6 text-white/60 hover:text-white text-[16px] font-semibold">
        {step > 0 && (
          <button
            onClick={prevStep}
            className="flex p-3 rounded bg-black/30 hover:bg-black/60 cursor-pointer ml-auto"
          >
            Back
          </button>
        )}
        {step < steps.length - 1 ? (
          <button
            onClick={nextStep}
            className="flex p-3 rounded bg-black/30 hover:bg-black/60 cursor-pointer ml-auto"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            className="flex p-3 rounded bg-black/30 hover:bg-black/60 cursor-pointer ml-auto"
          >
            Sign Up
          </button>
        )}
      </div>
    </motion.div>
  );
}