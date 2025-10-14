import { ReactElement } from "react";
import { Card, Button } from "@/components/UI";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactElement;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  className = "",
}: EmptyStateProps) {
  return (
    <Card variant="elevated" className={`text-center p-12 ${className}`}>
      <div className="max-w-md mx-auto">
        {/* Icon */}
        {icon && (
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
            {icon}
          </div>
        )}

        {/* Title & Description */}
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        {description && <p className="text-gray-500 mb-6">{description}</p>}

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
      </div>
    </Card>
  );
}
