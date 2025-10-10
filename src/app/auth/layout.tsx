"use client";

import React from "react";
import Image from "next/image";
import Logo from "@/assets/img/logo/uniarchive.png";
import { motion } from "framer-motion";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        className="max-w-md w-full mx-auto p-8 bg-white rounded-2xl shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-24 h-24 bg-indigo-600 rounded-2xl flex items-center justify-center">
            <Image
              src={Logo}
              alt=""
              width={300}
              height={500}
              className=" object-cover w-full h-full rounded-xl shadow-lg hover:shadow-2xl bg-transparent"
            />
          </div>
          <span className="font-bold text-2xl mt-2 text-shadow-lg text-shadow-black/20">Uni Archive</span>
        </div>

        <div className="child">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
