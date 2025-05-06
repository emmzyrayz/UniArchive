"use client";

import React, {useState} from "react";
import {motion} from "framer-motion";
import {
  LuMapPin,
  LuMail,
  LuPhone,
  LuClock,
  LuFacebook,
  LuTwitter,
  LuInstagram,
  LuLinkedin,
  LuChevronDown,
  LuChevronUp,
} from "react-icons/lu";

type FormData = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

type FormErrors = {
  [key in keyof FormData]?: string;
};



export default function Page() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = "Name is required";
      isValid = false;
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
      isValid = false;
    }

    if (!formData.subject) {
      errors.subject = "Please select a subject";
      isValid = false;
    }

    if (!formData.message.trim()) {
      errors.message = "Message is required";
      isValid = false;
    } else if (formData.message.length < 10) {
      errors.message = "Message must be at least 10 characters";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const {name, value} = e.target;
    setFormData({...formData, [name]: value});

    // Clear error when field is being edited
    if (formErrors[name as keyof FormData]) {
      setFormErrors({...formErrors, [name]: undefined});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !agreedToTerms) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      // Replace with your actual API endpoint
      // const response = await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(formData),
      // });

      // if (!response.ok) throw new Error('Failed to submit form');

      // Simulating successful submission for demo purposes
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSubmitSuccess(true);
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
      setAgreedToTerms(false);
    } catch (error) {
      setSubmitError(
        "There was an error submitting your form. Please try again."
      );
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle function to handle click on FAQ item
  const toggleFaq = (index: number): void => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  // FAQ data
  const faqItems: FaqItem[] = [
    {
      question: "What are your office hours?",
      answer:
        "Our administrative offices are open Monday through Friday from 8:00 AM to 5:00 PM, and Saturday from 9:00 AM to 1:00 PM.",
    },
    {
      question: "How quickly can I expect a response?",
      answer:
        "We strive to respond to all inquiries within 24-48 business hours. For urgent matters, please call our support line.",
    },
    {
      question: "Can I schedule a campus tour?",
      answer:
        "Yes! We offer guided campus tours every Tuesday and Thursday. Please contact our admissions office to schedule a visit.",
    },
    {
      question: "How can I apply for financial aid?",
      answer:
        "Information about financial aid options and application procedures can be found on our Financial Aid page. You can also contact our financial aid office directly for personalized assistance.",
    },
  ];

  const fadeIn = {
    hidden: {opacity: 0},
    visible: {opacity: 1},
  };

  return (
    <div className="bg-gradient-to-b from-blue-50 to-white flex w-full min-h-screen py-8 md:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center lg:px-8 pt-9">
        <motion.header
          className="text-center mb-10 md:mb-16"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{duration: 0.5}}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Get in Touch
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Have questions about our programs or need assistance? We&apos;re here to
            help you on your educational journey.
          </p>
        </motion.header>

        <div className="flex flex-row items-center justify-center gap-6 md:gap-3">
          {/* Contact Information */}
          <motion.div
            className="flex items-center justify-center w-[35%] h-full"
            initial={{opacity: 0, x: -20}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.5, delay: 0.2}}
          >
            <div className="bg-white rounded-xl shadow-md flex flex-col w-full h-full p-6">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6">
                Contact Information
              </h2>

              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 text-blue-600">
                    <LuMapPin size={20} />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-[16px] md:text-[18px] font-medium text-gray-900">
                      Address
                    </h3>
                    <p className="mt-1 text-[12px] md:text-[14px] text-gray-600">
                      123 Education Street
                      <br />
                      Learning City, ED 12345
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 text-blue-600">
                    <LuPhone size={20} />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-[16px] md:text-[18px] font-medium text-gray-900">
                      Phone
                    </h3>
                    <p className="mt-1 text-[12px] md:text-[14px] text-gray-600">
                      General: (123) 456-7890
                      <br />
                      Support: (123) 456-7891
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 text-blue-600">
                    <LuMail size={20} />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-[16px] md:text-[18px] font-medium text-gray-900">
                      Email
                    </h3>
                    <p className="mt-1 text-[12px] md:text-[14px] text-gray-600">
                      <a
                        href="mailto:info@educationalwebsite.com"
                        className="hover:text-blue-600 transition-colors"
                      >
                        info@educationalwebsite.com
                      </a>
                      <br />
                      <a
                        href="mailto:support@educationalwebsite.com"
                        className="hover:text-blue-600 transition-colors"
                      >
                        support@educationalwebsite.com
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 text-blue-600">
                    <LuClock size={20} />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-base md:text-lg font-medium text-gray-900">
                      Office Hours
                    </h3>
                    <p className="mt-1 text-sm md:text-base text-gray-600">
                      Monday - Friday: 8:00 AM - 5:00 PM
                      <br />
                      Saturday: 9:00 AM - 1:00 PM
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center w-full mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Connect With Us
                </h3>
                <div className="flex space-x-4">
                  <a
                    href="#"
                    className="text-gray-500 hover:text-blue-600 transition-colors"
                    aria-label="Facebook"
                  >
                    <LuFacebook size={20} />
                  </a>
                  <a
                    href="#"
                    className="text-gray-500 hover:text-blue-600 transition-colors"
                    aria-label="Twitter"
                  >
                    <LuTwitter size={20} />
                  </a>
                  <a
                    href="#"
                    className="text-gray-500 hover:text-blue-600 transition-colors"
                    aria-label="Instagram"
                  >
                    <LuInstagram size={20} />
                  </a>
                  <a
                    href="#"
                    className="text-gray-500 hover:text-blue-600 transition-colors"
                    aria-label="LinkedIn"
                  >
                    <LuLinkedin size={20} />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            className="flex items-center justify-center w-[65%]  h-full"
            initial={{opacity: 0, x: 20}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.5, delay: 0.2}}
          >
            <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col w-full h-full  p-6">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6">
                Send us a Message
              </h2>

              {submitSuccess ? (
                <motion.div
                  className="bg-green-50 p-4 rounded-lg mb-6"
                  initial={{opacity: 0, scale: 0.9}}
                  animate={{opacity: 1, scale: 1}}
                >
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-green-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Message sent successfully
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>
                          Thank you for contacting us. We will get back to you
                          soon!
                        </p>
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                          onClick={() => setSubmitSuccess(false)}
                        >
                          Send another message
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                  {submitError && (
                    <div className="bg-red-50 p-4 rounded-lg" role="alert">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-red-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            Error
                          </h3>
                          <div className="mt-2 text-sm text-red-700">
                            <p>{submitError}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Full Name
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="name"
                          id="name"
                          autoComplete="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="John Doe"
                          className={`py-3 px-4 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 border rounded-md ${
                            formErrors.name
                              ? "border-red-300"
                              : "border-gray-300"
                          }`}
                          aria-invalid={formErrors.name ? "true" : "false"}
                          aria-describedby={
                            formErrors.name ? "name-error" : undefined
                          }
                        />
                        {formErrors.name && (
                          <p
                            className="mt-1 text-sm text-red-600"
                            id="name-error"
                          >
                            {formErrors.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Email
                      </label>
                      <div className="mt-1">
                        <input
                          type="email"
                          name="email"
                          id="email"
                          autoComplete="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="john@example.com"
                          className={`py-3 px-4 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 border rounded-md ${
                            formErrors.email
                              ? "border-red-300"
                              : "border-gray-300"
                          }`}
                          aria-invalid={formErrors.email ? "true" : "false"}
                          aria-describedby={
                            formErrors.email ? "email-error" : undefined
                          }
                        />
                        {formErrors.email && (
                          <p
                            className="mt-1 text-sm text-red-600"
                            id="email-error"
                          >
                            {formErrors.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="subject"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Subject
                      </label>
                      <div className="mt-1">
                        <select
                          id="subject"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          className={`py-3 px-4 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 border rounded-md ${
                            formErrors.subject
                              ? "border-red-300"
                              : "border-gray-300"
                          }`}
                          aria-invalid={formErrors.subject ? "true" : "false"}
                          aria-describedby={
                            formErrors.subject ? "subject-error" : undefined
                          }
                        >
                          <option value="">Please select</option>
                          <option value="General Inquiry">
                            General Inquiry
                          </option>
                          <option value="Admission Information">
                            Admission Information
                          </option>
                          <option value="Course Information">
                            Course Information
                          </option>
                          <option value="Technical Support">
                            Technical Support
                          </option>
                          <option value="Feedback">Feedback</option>
                          <option value="Other">Other</option>
                        </select>
                        {formErrors.subject && (
                          <p
                            className="mt-1 text-sm text-red-600"
                            id="subject-error"
                          >
                            {formErrors.subject}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="message"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Message
                      </label>
                      <div className="mt-1">
                        <textarea
                          id="message"
                          name="message"
                          rows={6}
                          value={formData.message}
                          onChange={handleChange}
                          placeholder="Your message here..."
                          className={`py-3 px-4 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 border rounded-md ${
                            formErrors.message
                              ? "border-red-300"
                              : "border-gray-300"
                          }`}
                          aria-invalid={formErrors.message ? "true" : "false"}
                          aria-describedby={
                            formErrors.message ? "message-error" : undefined
                          }
                        />
                        {formErrors.message && (
                          <p
                            className="mt-1 text-sm text-red-600"
                            id="message-error"
                          >
                            {formErrors.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <input
                            id="privacy-policy"
                            name="privacy-policy"
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            aria-required="true"
                          />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-gray-500">
                            By selecting this, you agree to our{" "}
                            <a
                              href="#"
                              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                            >
                              Privacy Policy
                            </a>{" "}
                            and{" "}
                            <a
                              href="#"
                              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                            >
                              Terms of Service
                            </a>
                            .
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                        isSubmitting ? "opacity-75 cursor-not-allowed" : ""
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        "Send Message"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>

        {/* Map Section */}
        <motion.div
          className="flex w-full items-center justify-center mt-10 md:mt-16"
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5, delay: 0.3}}
        >
          <div className="flex flex-col w-full bg-white rounded-xl shadow-md overflow-hidden">
            <div className="flex flex-col items-start justify-center p-6">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
                Find Us
              </h2>
              <p className="text-gray-600 mb-6">
                Visit our campus to learn more about our educational programs
                and facilities.
              </p>
            </div>
            {/* Responsive map container with aspect ratio */}
            <div className="relative w-full h-0 pb-[56.25%] md:pb-[50%] lg:pb-[40%]">
              <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                <p className="text-gray-500 text-base md:text-lg">
                  Map placeholder - Integrate Google Maps or similar service
                  here
                </p>
                <iframe
                  src="https://maps.google.com/maps?width=100%25&amp;height=600&amp;hl=en&amp;q=1%20Grafton%20Street,%20Dublin,%20Ireland+(UniArchive)&amp;t=h&amp;z=14&amp;ie=UTF8&amp;iwloc=B&amp;output=embed"
                  className="absolute inset-0 w-full h-full"
                  style={{border: 0}}
                  allowFullScreen
                  loading="lazy"
                  title="Campus Map"
                ></iframe>
              </div>
            </div>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          className="mt-10 md:mt-16 mb-10"
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5, delay: 0.4}}
        >
          <div className="bg-white rounded-xl shadow-md overflow-hidden p-6">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6">
              Frequently Asked Questions
            </h2>

            <div className="space-y-3 md:space-y-4">
              {faqItems.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Question Tab - Clickable header */}
                  <button
                    className="w-full flex justify-between items-center p-4 md:p-5 text-left bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={activeIndex === index}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <h3 className="text-base md:text-lg font-medium text-gray-900">
                      {item.question}
                    </h3>
                    <span className="ml-2 flex-shrink-0 text-gray-500">
                      {activeIndex === index ? (
                        <LuChevronUp className="h-5 w-5" />
                      ) : (
                        <LuChevronDown className="h-5 w-5" />
                      )}
                    </span>
                  </button>

                  {/* Answer - Collapsible content */}
                  <div
                    id={`faq-answer-${index}`}
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      activeIndex === index ? "max-h-96" : "max-h-0"
                    }`}
                  >
                    <p className="p-4 md:p-5 text-sm md:text-base text-gray-600 border-t border-gray-200">
                      {item.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
