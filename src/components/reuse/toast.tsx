import { useEffect } from "react";
import { Alert } from "@/components/UI";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export function ToastItem({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onClose]);

  return (
    <div className="animate-in slide-in-from-right-full duration-300">
      <Alert
        type={toast.type}
        title={toast.title}
        message={toast.message}
        closable
        onClose={() => onClose(toast.id)}
        className="min-w-80 shadow-lg"
      />
    </div>
  );
}
