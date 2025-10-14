import { createContext, useContext, useReducer, ReactNode } from "react";
import { Toast, ToastItem } from "@/components/reuse";

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

type ToastAction =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "REMOVE_TOAST"; id: string };

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case "ADD_TOAST":
      return [...state, action.toast];
    case "REMOVE_TOAST":
      return state.filter((toast) => toast.id !== action.id);
    default:
      return state;
  }
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    dispatch({ type: "ADD_TOAST", toast: { ...toast, id } });
  };

  const removeToast = (id: string) => {
    dispatch({ type: "REMOVE_TOAST", id });
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  const { addToast } = context;

  return {
    success: (
      title: string,
      message?: string,
      options?: Partial<Omit<Toast, "id" | "type" | "title" | "message">>
    ) => {
      addToast({ type: "success", title, message, ...options });
    },
    error: (
      title: string,
      message?: string,
      options?: Partial<Omit<Toast, "id" | "type" | "title" | "message">>
    ) => {
      addToast({ type: "error", title, message, ...options });
    },
    warning: (
      title: string,
      message?: string,
      options?: Partial<Omit<Toast, "id" | "type" | "title" | "message">>
    ) => {
      addToast({ type: "warning", title, message, ...options });
    },
    info: (
      title: string,
      message?: string,
      options?: Partial<Omit<Toast, "id" | "type" | "title" | "message">>
    ) => {
      addToast({ type: "info", title, message, ...options });
    },
  };
}
