"use client";

import Link from "next/link";
import Image from "next/image";
import {useState} from "react";

import Logo from "@/assets/img/logo/uniarchive.png";

// Import icons
import {
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaLinkedinIn,
  FaArrowRight,
} from "react-icons/fa";
import {MdEmail, MdPhone, MdLocationOn} from "react-icons/md";

export const Footer = () => {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle subscription logic here
    console.log("Subscribed with:", email);
    setEmail("");
  };

  return (
    <footer className="w-full bg-black text-white relative mt-[70px]">
      {/* Wave SVG */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none transform translate-y-[-99%]">
        <svg
          className="relative block w-full h-[70px]"
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
            fill="black"
          ></path>
        </svg>
      </div>

      <div className="container mx-auto px-4 pt-20 pb-10">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-12">
          {/* Logo and Description */}
          <div className="w-full md:w-1/3 flex flex-col items-start">
            <Link
              href="/"
              className="flex flex-row gap-2 items-center hover:scale-105 transition-all duration-500 ease-in-out mb-6"
            >
              <Image
                src={Logo}
                alt="UniArchive Logo"
                width={300}
                height={300}
                className="w-[45px] h-[45px] object-fit rounded-[8px]"
              />
              <span className="text-[22px] font-bold">UniArchive</span>
            </Link>
            <p className="text-white/70 text-sm mb-6">
              UniArchive is your go-to platform for academic excellence. We
              provide comprehensive educational resources, study materials, and
              support to help you achieve your academic goals.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="bg-white/10 hover:bg-white/20 transition-all duration-300 w-8 h-8 rounded-full flex items-center justify-center"
              >
                <FaFacebookF size={14} />
              </a>
              <a
                href="#"
                className="bg-white/10 hover:bg-white/20 transition-all duration-300 w-8 h-8 rounded-full flex items-center justify-center"
              >
                <FaTwitter size={14} />
              </a>
              <a
                href="#"
                className="bg-white/10 hover:bg-white/20 transition-all duration-300 w-8 h-8 rounded-full flex items-center justify-center"
              >
                <FaInstagram size={14} />
              </a>
              <a
                href="#"
                className="bg-white/10 hover:bg-white/20 transition-all duration-300 w-8 h-8 rounded-full flex items-center justify-center"
              >
                <FaYoutube size={14} />
              </a>
              <a
                href="#"
                className="bg-white/10 hover:bg-white/20 transition-all duration-300 w-8 h-8 rounded-full flex items-center justify-center"
              >
                <FaLinkedinIn size={14} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="w-full md:w-1/5">
            <h3 className="text-lg font-bold mb-6 relative">
              Quick Links
              <span className="absolute bottom-[-8px] left-0 w-12 h-[2px] bg-white/50"></span>
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-white/70 hover:text-white transition-all duration-300 flex items-center"
                >
                  <FaArrowRight className="mr-2 text-xs" /> Home
                </Link>
              </li>
              <li>
                <Link
                  href="/school"
                  className="text-white/70 hover:text-white transition-all duration-300 flex items-center"
                >
                  <FaArrowRight className="mr-2 text-xs" /> School
                </Link>
              </li>
              <li>
                <Link
                  href="/courses"
                  className="text-white/70 hover:text-white transition-all duration-300 flex items-center"
                >
                  <FaArrowRight className="mr-2 text-xs" /> Courses
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-white/70 hover:text-white transition-all duration-300 flex items-center"
                >
                  <FaArrowRight className="mr-2 text-xs" /> About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-white/70 hover:text-white transition-all duration-300 flex items-center"
                >
                  <FaArrowRight className="mr-2 text-xs" /> Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="w-full md:w-1/5">
            <h3 className="text-lg font-bold mb-6 relative">
              Resources
              <span className="absolute bottom-[-8px] left-0 w-12 h-[2px] bg-white/50"></span>
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/study-materials"
                  className="text-white/70 hover:text-white transition-all duration-300 flex items-center"
                >
                  <FaArrowRight className="mr-2 text-xs" /> Study Materials
                </Link>
              </li>
              <li>
                <Link
                  href="/past-papers"
                  className="text-white/70 hover:text-white transition-all duration-300 flex items-center"
                >
                  <FaArrowRight className="mr-2 text-xs" /> Past Papers
                </Link>
              </li>
              <li>
                <Link
                  href="/tutorials"
                  className="text-white/70 hover:text-white transition-all duration-300 flex items-center"
                >
                  <FaArrowRight className="mr-2 text-xs" /> Tutorials
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-white/70 hover:text-white transition-all duration-300 flex items-center"
                >
                  <FaArrowRight className="mr-2 text-xs" /> Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-white/70 hover:text-white transition-all duration-300 flex items-center"
                >
                  <FaArrowRight className="mr-2 text-xs" /> FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="w-full md:w-1/4">
            <h3 className="text-lg font-bold mb-6 relative">
              Stay Updated
              <span className="absolute bottom-[-8px] left-0 w-12 h-[2px] bg-white/50"></span>
            </h3>
            <p className="text-white/70 text-sm mb-4">
              Subscribe to our newsletter for the latest educational resources
              and updates.
            </p>
            <form onSubmit={handleSubscribe} className="flex mb-6">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                required
                className="bg-white/10 rounded-l-lg px-4 py-2 w-full focus:outline-none"
              />
              <button
                type="submit"
                className="bg-white/20 hover:bg-white/30 rounded-r-lg px-4 transition-all duration-300"
              >
                <FaArrowRight />
              </button>
            </form>
            <div className="space-y-3">
              <div className="flex items-center text-white/70">
                <MdEmail className="mr-3" />
                <span>info@uniarchive.com</span>
              </div>
              <div className="flex items-center text-white/70">
                <MdPhone className="mr-3" />
                <span>+1 (123) 456-7890</span>
              </div>
              <div className="flex items-center text-white/70">
                <MdLocationOn className="mr-3" />
                <span>123 Education St, Knowledge City</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-[1px] bg-white/10 my-8"></div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-white/60 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} UniArchive. All rights reserved.
          </p>
          <div className="flex space-x-4 text-white/60 text-sm">
            <Link
              href="/privacy-policy"
              className="hover:text-white transition-all duration-300"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-white transition-all duration-300"
            >
              Terms of Use
            </Link>
            <Link
              href="/sitemap"
              className="hover:text-white transition-all duration-300"
            >
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
