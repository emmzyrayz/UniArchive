"use client";
import {motion} from "framer-motion";
import Image from "next/image";
import logo from '@/assets/img/favicon.ico';

import {IoLogoGooglePlaystore} from "react-icons/io5";
import {FaAppStore} from "react-icons/fa";

export const MobileAppPromo = () => {
  return (
    <section className="bg-gray-100 py-16 px-4">
      <div className="max-w-6xl mx-auto flex flex-col-reverse lg:flex-row items-center justify-between gap-10">
        {/* Left Text */}
        <motion.div
          className="text-center lg:text-left flex-1"
          initial={{opacity: 0, x: -40}}
          whileInView={{opacity: 1, x: 0}}
          transition={{duration: 0.6}}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Download the UniArchive App
          </h2>
          <p className="text-gray-700 mb-6">
            Access all your university materials, courses, and lectures anytime,
            anywhere. Stay connected and keep learning on the go!
          </p>

          <div className="flex justify-center lg:justify-start gap-4">
            {/* Replace with real store links and icons */}
            <a
              href="#"
              className="bg-black hover:bg-gray-500 text-white px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-opacity-80 transition"
            >
              <FaAppStore className="w-5 h-5" />
              <span>App Store</span>
            </a>
            <a
              href="#"
              className="bg-green-600 text-white px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-green-700 transition"
            >
              <IoLogoGooglePlaystore className="w-5 h-5" />
              <span>Google Play</span>
            </a>
          </div>
        </motion.div>

        {/* Right Image */}
        <motion.div
          className="flex-1"
          initial={{opacity: 0, x: 40}}
          whileInView={{opacity: 1, x: 0}}
          transition={{duration: 0.6}}
        >
          <Image
            src={logo} // Replace with your app screenshot
            alt="Mobile App"
            width={500}
            height={500}
            className="mx-auto"
          />
        </motion.div>
      </div>
    </section>
  );
};
