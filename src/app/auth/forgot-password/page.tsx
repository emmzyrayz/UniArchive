"use client";

import React, {useState} from "react";
// import {Button} from "@/components/ui/button";
// import {Input} from "@/components/ui/input";
import {motion} from "framer-motion";
import Image from 'next/image';
import Logo from '@/assets/img/logo/uniarchive.png';

const steps = ["Account Info", "University Info"];


export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  return (
    <div className="max-w-md mx-auto mt-10 p-6 flex flex-col items-center justify-center bg-white rounded-xl shadow-md gap-2">
      <div className="logo rounded-[10px] mb-2 w-[300px] h-[300px] flex items-center justify-center bg-black/50">
        <Image
          src={Logo}
          alt=""
          width={300}
          height={500}
          className=" object-cover w-full h-full"
        />
      </div>
      <h2 className="text-2xl font-bold mb-4 flex w-full">Forgot Password</h2>
      <div className="flex flex-col gap-2 w-full space-y-4">
        <input
          name="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex w-full p-2 border-gray-300 border-b-[2px] rounded-t-md hover:border-gray-600 transition-all 500ms ease-in-out outline-none"
        />
        <button className="flex p-3 rounded bg-black/30 hover:bg-black/60 cursor-pointer ml-auto text-white/70 hover:text-white">
          Reset Password
        </button>
      </div>
    </div>
  );
}