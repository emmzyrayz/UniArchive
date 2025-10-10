import { ReactElement, ReactNode } from "react";

interface AlertProps {
  type?: "success" | "warning" | "error" | "info";
  message: string | ReactNode;
  title?: string;
  onClose?: () => void;
  closable?: boolean;
  icon?: ReactElement;
  className?: string;
  showIcon?: boolean;
}

export default function Alert({
  type = "info",
  message,
  title,
  onClose,
  closable = false,
  icon,
  className = "",
  showIcon = true,
}: AlertProps) {
  const colorStyles = {
    success: {
      bg: "bg-green-50",
      border: "border-green-400",
      text: "text-green-800",
      icon: "text-green-600",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-400",
      text: "text-yellow-800",
      icon: "text-yellow-600",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-400",
      text: "text-red-800",
      icon: "text-red-600",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-400",
      text: "text-blue-800",
      icon: "text-blue-600",
    },
  };

  const colors = colorStyles[type];

  // Default icons for each type
  const defaultIcons = {
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  const displayIcon = icon || (showIcon ? defaultIcons[type] : null);

  return (
    <div
      className={`
        ${colors.bg} ${colors.border} ${colors.text}
        border-l-4 rounded-lg p-4 
        flex items-start gap-3
        shadow-sm
        animate-in slide-in-from-top-2 fade-in duration-300
        ${className}
      `}
      role="alert"
    >
      {/* Icon */}
      {displayIcon && (
        <div className={`${colors.icon} mt-0.5 flex-shrink-0`}>
          {displayIcon}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && <div className="font-semibold text-sm mb-1">{title}</div>}
        <div className="text-sm leading-relaxed">{message}</div>
      </div>

      {/* Close Button */}
      {closable && onClose && (
        <button
          onClick={onClose}
          className={`
            ${colors.icon}
            hover:opacity-70
            flex-shrink-0 p-0.5 rounded
            transition-opacity duration-200
          `}
          aria-label="Close alert"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        
      )}
    </div>
  );
}


// Usage Example

// import { Alert, Button } from "@/components/UI";
// import { useState } from "react";

// function MyComponent() {
//   const [showSuccess, setShowSuccess] = useState(false);
//   const [showError, setShowError] = useState(false);

//   return (
//     <div className="space-y-4">
//       {/* Success Alert */}
//       <Alert
//         type="success"
//         message="Your course has been published successfully!"
//       />

//       {/* Error Alert with Title */}
//       <Alert
//         type="error"
//         title="Upload Failed"
//         message="There was an error uploading your file. Please try again."
//       />

//       {/* Warning Alert */}
//       <Alert
//         type="warning"
//         title="Low Storage"
//         message="You are running out of storage space. Please upgrade your plan."
//       />

//       {/* Info Alert */}
//       <Alert
//         type="info"
//         message="New features have been added to the dashboard. Check them out!"
//       />

//       {/* Closable Alert */}
//       {showSuccess && (
//         <Alert
//           type="success"
//           title="Success!"
//           message="Your profile has been updated."
//           closable={true}
//           onClose={() => setShowSuccess(false)}
//         />
//       )}

//       {/* Custom Icon */}
//       <Alert
//         type="info"
//         title="New Message"
//         message="You have 3 unread messages."
//         icon={
//           <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
//             <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
//             <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
//           </svg>
//         }
//       />

//       {/* Without Icon */}
//       <Alert
//         type="success"
//         message="Simple alert without icon"
//         showIcon={false}
//       />

//       {/* With ReactNode message */}
//       <Alert
//         type="warning"
//         title="Action Required"
//         message={
//           <div>
//             <p className="mb-2">Your subscription expires in 3 days.</p>
//             <Button label="Renew Now" size="sm" />
//           </div>
//         }
//       />

//       {/* Form Validation Errors */}
//       {formError && (
//         <Alert
//           type="error"
//           title="Validation Error"
//           message={
//             <ul className="list-disc list-inside space-y-1">
//               <li>Email is required</li>
//               <li>Password must be at least 8 characters</li>
//             </ul>
//           }
//           closable
//           onClose={() => setFormError(null)}
//         />
//       )}

//       {/* Notification Style */}
//       <div className="fixed top-4 right-4 w-96 space-y-2">
//         <Alert
//           type="success"
//           message="Student enrolled successfully!"
//           closable
//           onClose={() => {}}
//         />
//       </div>
//     </div>
//   );
// }

{
  /*Common use cases:

  ✅ Form validation errors
  ✅ Success notifications after actions
  ✅ Warning messages (storage limits, trial ending, etc.)
  ✅ Info banners for announcements
  ✅ Toast-style notifications (position fixed in corner) */
}