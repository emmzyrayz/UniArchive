import { useState } from "react";
import { Button, Modal, Alert } from "@/components/UI";

interface EnrollButtonProps {
  courseId: string;
  courseTitle: string;
  isEnrolled?: boolean;
  price?: number;
  onEnroll: (courseId: string) => Promise<void>;
  onContinue?: (courseId: string) => void;
  className?: string;
}

export default function EnrollButton({
  courseId,
  courseTitle,
  isEnrolled = false,
  price,
  onEnroll,
  onContinue,
  className = "",
}: EnrollButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onEnroll(courseId);
      setShowConfirm(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to enroll in course"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    onContinue?.(courseId);
  };

  if (isEnrolled) {
    return (
      <Button
        variant="primary"
        label="Continue Learning"
        onClick={handleContinue}
        className={className}
      />
    );
  }

  return (
    <>
      <Button
        variant="primary"
        label={price ? `Enroll for $${price}` : "Enroll for Free"}
        onClick={() => setShowConfirm(true)}
        className={className}
      />

      <Modal
        isOpen={showConfirm}
        onClose={() => !isLoading && setShowConfirm(false)}
        title="Enroll in Course"
        size="sm"
      >
        <div className="space-y-4">
          {error && (
            <Alert
              type="error"
              message={error}
              closable
              onClose={() => setError(null)}
            />
          )}

          <p className="text-gray-600">
            Are you sure you want to enroll in <strong>{courseTitle}</strong>?
            {price && <span> This will cost ${price}.</span>}
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="terms"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-700">
                I agree to the terms and conditions
              </label>
            </div>

            {!price && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <svg
                  className="w-5 h-5 text-green-600"
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
                <span className="text-sm text-green-700">
                  This course is free!
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              label="Cancel"
              onClick={() => setShowConfirm(false)}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              variant="primary"
              label={isLoading ? "Enrolling..." : "Confirm Enrollment"}
              loading={isLoading}
              onClick={handleEnroll}
              disabled={isLoading}
              className="flex-1"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
