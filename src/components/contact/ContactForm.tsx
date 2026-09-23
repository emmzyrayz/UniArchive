// components/contact/ContactForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/UI/Buttons";
import AuthInput from "@/app/auth/components/UI/AuthInput";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUBJECTS = [
  { value: "general", label: "General question" },
  { value: "bug", label: "Report a bug" },
  { value: "feature", label: "Feature request" },
  { value: "account", label: "Account issue" },
];

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

async function submitContactForm(data: ContactFormData): Promise<boolean> {
  // TODO: replace with real backend call, likely emailService.sendEmail(...)
  console.log("Stubbed contact form submission:", data);
  await new Promise((resolve) => setTimeout(resolve, 600));
  return true;
}

export function ContactForm() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    subject: "general",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Please enter your name.";
    if (!EMAIL_REGEX.test(formData.email))
      newErrors.email = "Please enter a valid email address.";
    if (!formData.message.trim()) {
      newErrors.message = "Please enter a message.";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Please tell us a bit more (at least 10 characters).";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const success = await submitContactForm(formData);
      if (success) {
        setIsSubmitted(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-text-primary">Message sent</h2>
        <p className="text-sm text-text-secondary mt-2">
          Thanks for reaching out — we&apos;ll get back to you as soon as we
          can.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setIsSubmitted(false);
            setFormData({
              name: "",
              email: "",
              subject: "general",
              message: "",
            });
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-border bg-surface-raised p-8"
      noValidate
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AuthInput
          name="name"
          label="Your name"
          type="text"
          placeholder="John Doe"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          error={errors.name}
          required
        />
        <AuthInput
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          error={errors.email}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="subject"
          className="block text-sm font-medium text-text-secondary"
        >
          Subject
        </label>
        <select
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={(e) => handleChange("subject", e.target.value)}
          className="w-full px-4 py-3 border rounded-md text-text-primary bg-background border-border focus:ring-2 focus:ring-primary focus:border-primary"
        >
          {SUBJECTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="message"
          className="block text-sm font-medium text-text-secondary"
        >
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="Tell us what's on your mind..."
          value={formData.message}
          onChange={(e) => handleChange("message", e.target.value)}
          className={`w-full px-4 py-3 border rounded-md text-text-primary bg-background focus:ring-2 focus:ring-primary focus:border-primary resize-none ${
            errors.message ? "border-error" : "border-border"
          }`}
          required
        />
        {errors.message && (
          <p className="text-sm text-error mt-1">{errors.message}</p>
        )}
      </div>

      <Button onClick={() => {}} size="lg">
        {isSubmitting ? "Sending..." : "Send message"}
      </Button>
    </form>
  );
}
