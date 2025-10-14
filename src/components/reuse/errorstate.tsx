import { ReactElement } from "react";
import { Card, Button, Alert } from "@/components/UI";

interface ErrorStateProps {
  title: string;
  description?: string;
  error?: string;
  icon?: ReactElement;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  showDetails?: boolean;
  className?: string;
}

export default function ErrorState({
  title,
  description,
  error,
  icon,
  action,
  secondaryAction,
  showDetails = false,
  className = "",
}: ErrorStateProps) {
  return (
    <Card variant="elevated" className={`text-center p-8 ${className}`}>
      <div className="max-w-md mx-auto">
        {/* Icon */}
        {icon ? (
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
            {icon}
          </div>
        ) : (
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        )}

        {/* Title & Description */}
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        {description && <p className="text-gray-500 mb-6">{description}</p>}

        {/* Error Details */}
        {error && showDetails && (
          <Alert
            type="error"
            message={error}
            className="mb-6 text-left"
            closable={false}
          />
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {action && (
            <Button
              variant="primary"
              label={action.label}
              onClick={action.onClick}
            />
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              label={secondaryAction.label}
              onClick={secondaryAction.onClick}
            />
          )}
        </div>

        {/* Support Link */}
        <div className="mt-6">
          <button className="text-sm text-indigo-600 hover:text-indigo-500">
            Contact Support →
          </button>
        </div>
      </div>
    </Card>
  );
}
