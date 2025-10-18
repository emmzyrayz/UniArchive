import { ReactElement, useMemo, useCallback } from "react";
import { Card, Button, Alert } from "@/components/UI";

type ErrorType =
  | "error"
  | "warning"
  | "not-found"
  | "unauthorized"
  | "server-error";

interface ErrorAction {
  label: string;
  onClick: () => void;
}

interface ErrorStateProps {
  title: string;
  description?: string;
  error?: string;
  icon?: ReactElement;
  action?: ErrorAction;
  secondaryAction?: ErrorAction;
  showDetails?: boolean;
  className?: string;
  type?: ErrorType;
  onSupportClick?: () => void;
  showSupportLink?: boolean;
  errorCode?: string;
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
  type = "error",
  onSupportClick,
  showSupportLink = true,
  errorCode,
}: ErrorStateProps) {
  const errorIcons = useMemo(
    () => ({
      error: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      ),
      warning: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      "not-found": (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      unauthorized: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
      "server-error": (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 12h14M5 12a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v5a2 2 0 01-2 2M5 12a2 2 0 00-2 2v5a2 2 0 002 2h14a2 2 0 002-2v-5a2 2 0 00-2-2m-2-4h.01M17 16h.01"
          />
        </svg>
      ),
    }),
    []
  );

  const bgColors = useMemo(
    () => ({
      error: "bg-red-100 text-red-600",
      warning: "bg-yellow-100 text-yellow-600",
      "not-found": "bg-blue-100 text-blue-600",
      unauthorized: "bg-purple-100 text-purple-600",
      "server-error": "bg-orange-100 text-orange-600",
    }),
    []
  );

  const handleSupportClick = useCallback(() => {
    if (onSupportClick) {
      onSupportClick();
    } else {
      window.location.href = "/support";
    }
  }, [onSupportClick]);

  const displayIcon = useMemo(
    () => icon || errorIcons[type],
    [icon, type, errorIcons]
  );

  const bgColorClass = useMemo(() => bgColors[type], [type, bgColors]);

  return (
    <Card variant="elevated" className={`text-center p-8 ${className}`}>
      <div className="max-w-md mx-auto">
        {/* Icon */}
        <div
          className={`mx-auto w-16 h-16 ${bgColorClass} rounded-full flex items-center justify-center mb-4`}
          role="img"
          aria-label={`${type} icon`}
        >
          {displayIcon}
        </div>

        {/* Error Code */}
        {errorCode && (
          <div className="text-xs text-gray-500 mb-3 font-mono">
            Error Code: {errorCode}
          </div>
        )}

        {/* Title & Description */}
        <h3 className="text-lg font-semibold text-black mb-2">{title}</h3>
        {description && (
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            {description}
          </p>
        )}

        {/* Error Details */}
        {error && showDetails && (
          <Alert
            type="error"
            message={error}
            className="mb-6 text-left text-sm"
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
              className="flex-1"
            />
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              label={secondaryAction.label}
              onClick={secondaryAction.onClick}
              className="flex-1"
            />
          )}
        </div>

        {/* Support Link */}
        {showSupportLink && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleSupportClick}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              aria-label="Contact support team"
            >
              Contact Support →
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

// Usage Examples:

// import ErrorState from "@/components/ErrorState";
// import { useState } from "react";

// // Example 1: Generic Error State
// export function GenericErrorState() {
//   return (
//     <div className="p-6">
//       <ErrorState
//         title="Something went wrong"
//         description="We encountered an unexpected error. Please try again later."
//         action={{
//           label: "Retry",
//           onClick: () => window.location.reload(),
//         }}
//         secondaryAction={{
//           label: "Go Home",
//           onClick: () => (window.location.href = "/"),
//         }}
//       />
//     </div>
//   );
// }

// // Example 2: 404 Not Found
// export function NotFoundError() {
//   return (
//     <div className="p-6">
//       <ErrorState
//         title="Page Not Found"
//         description="The course you're looking for doesn't exist or has been moved."
//         type="not-found"
//         errorCode="404"
//         action={{
//           label: "Browse Courses",
//           onClick: () => (window.location.href = "/courses"),
//         }}
//         secondaryAction={{
//           label: "Return Home",
//           onClick: () => (window.location.href = "/"),
//         }}
//       />
//     </div>
//   );
// }

// // Example 3: 401 Unauthorized
// export function UnauthorizedError() {
//   return (
//     <div className="p-6">
//       <ErrorState
//         title="Access Denied"
//         description="You need to be logged in to access this course. Please sign in to continue."
//         type="unauthorized"
//         errorCode="401"
//         action={{
//           label: "Sign In",
//           onClick: () => (window.location.href = "/login"),
//         }}
//         secondaryAction={{
//           label: "Sign Up",
//           onClick: () => (window.location.href = "/signup"),
//         }}
//       />
//     </div>
//   );
// }

// // Example 4: 500 Server Error
// export function ServerError() {
//   return (
//     <div className="p-6">
//       <ErrorState
//         title="Server Error"
//         description="Our servers are experiencing issues. We're working to fix this."
//         type="server-error"
//         errorCode="500"
//         action={{
//           label: "Retry",
//           onClick: () => window.location.reload(),
//         }}
//       />
//     </div>
//   );
// }

// // Example 5: Course Load Error with Details
// export function CourseLoadError() {
//   const [showDetails, setShowDetails] = useState(false);

//   return (
//     <div className="p-6">
//       <ErrorState
//         title="Failed to Load Course"
//         description="We couldn't load the course materials. Your connection may be unstable."
//         error="Network timeout: Failed to fetch course data after 30 seconds"
//         showDetails={showDetails}
//         type="error"
//         errorCode="ERR_COURSE_LOAD"
//         action={{
//           label: "Try Again",
//           onClick: () => window.location.reload(),
//         }}
//         secondaryAction={{
//           label: showDetails ? "Hide Details" : "Show Details",
//           onClick: () => setShowDetails(!showDetails),
//         }}
//       />
//     </div>
//   );
// }

// // Example 6: Enrollment Error
// export function EnrollmentError() {
//   const handleRetry = () => {
//     console.log("Retrying enrollment...");
//   };

//   const handleViewAlternatives = () => {
//     console.log("Viewing alternative courses...");
//   };

//   return (
//     <div className="p-6">
//       <ErrorState
//         title="Enrollment Failed"
//         description="We couldn't process your enrollment. Please try again or choose a different payment method."
//         type="warning"
//         action={{
//           label: "Retry Enrollment",
//           onClick: handleRetry,
//         }}
//         secondaryAction={{
//           label: "View Alternatives",
//           onClick: handleViewAlternatives,
//         }}
//       />
//     </div>
//   );
// }

// // Example 7: Submission Error
// export function SubmissionError() {
//   return (
//     <div className="p-6">
//       <ErrorState
//         title="Submission Failed"
//         description="Your assignment couldn't be submitted. Please check your connection and try again."
//         error="Failed to upload file: File size exceeds 100MB limit",
//         showDetails={true}
//         type="error"
//         action={{
//           label: "Try Again",
//           onClick: () => console.log("Retrying submission"),
//         }}
//         secondaryAction={{
//           label: "Save as Draft",
//           onClick: () => console.log("Saving as draft"),
//         }}
//       />
//     </div>
//   );
// }

// // Example 8: Payment Error
// export function PaymentError() {
//   const handleRetryPayment = () => {
//     console.log("Retrying payment...");
//   };

//   const handleContactSupport = () => {
//     console.log("Contacting support...");
//   };

//   return (
//     <div className="p-6">
//       <ErrorState
//         title="Payment Failed"
//         description="Your payment couldn't be processed. Please check your card details and try again."
//         type="error"
//         errorCode="PAYMENT_DECLINED"
//         action={{
//           label: "Retry Payment",
//           onClick: handleRetryPayment,
//         }}
//         secondaryAction={{
//           label: "Use Different Card",
//           onClick: () => console.log("Opening card selector"),
//         }}
//         onSupportClick={handleContactSupport}
//       />
//     </div>
//   );
// }

// // Example 9: Maintenance Mode
// export function MaintenanceError() {
//   return (
//     <div className="p-6">
//       <ErrorState
//         title="Under Maintenance"
//         description="We're performing scheduled maintenance. We'll be back shortly."
//         type="warning"
//         action={{
//           label: "Check Status",
//           onClick: () => (window.location.href = "/status"),
//         }}
//       />
//     </div>
//   );
// }

// // Example 10: Complete Error Handling Page
// export default function ErrorHandlingDashboard() {
//   const [currentError, setCurrentError] = useState<string>("generic");

//   const errors = {
//     generic: {
//       component: GenericErrorState,
//       label: "Generic Error",
//     },
//     notfound: {
//       component: NotFoundError,
//       label: "404 Not Found",
//     },
//     unauthorized: {
//       component: UnauthorizedError,
//       label: "401 Unauthorized",
//     },
//     server: {
//       component: ServerError,
//       label: "500 Server Error",
//     },
//     courseload: {
//       component: CourseLoadError,
//       label: "Course Load Error",
//     },
//     enrollment: {
//       component: EnrollmentError,
//       label: "Enrollment Error",
//     },
//     submission: {
//       component: SubmissionError,
//       label: "Submission Error",
//     },
//     payment: {
//       component: PaymentError,
//       label: "Payment Error",
//     },
//     maintenance: {
//       component: MaintenanceError,
//       label: "Maintenance Mode",
//     },
//   };

//   const CurrentErrorComponent =
//     errors[currentError as keyof typeof errors]?.component ||
//     GenericErrorState;

//   return (
//     <div className="bg-gray-50 min-h-screen p-8">
//       <div className="max-w-6xl mx-auto">
//         {/* Header */}
//         <div className="mb-12">
//           <h1 className="text-4xl font-bold text-black mb-2">Error States</h1>
//           <p className="text-gray-600">
//             Different error state configurations for common scenarios
//           </p>
//         </div>

//         {/* Error Selector */}
//         <div className="mb-8 bg-white rounded-lg p-6 border border-gray-200">
//           <h2 className="text-lg font-semibold text-black mb-4">
//             Select Error Type
//           </h2>
//           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
//             {Object.entries(errors).map(([key, { label }]) => (
//               <button
//                 key={key}
//                 onClick={() => setCurrentError(key)}
//                 className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
//                   currentError === key
//                     ? "bg-indigo-600 text-white"
//                     : "bg-gray-100 text-black hover:bg-gray-200"
//                 }`}
//               >
//                 {label}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Error Display */}
//         <div className="bg-white rounded-lg p-8 border border-gray-200">
//           <CurrentErrorComponent />
//         </div>

//         {/* Error Types Reference */}
//         <div className="mt-12 grid md:grid-cols-2 gap-6">
//           <div className="bg-white rounded-lg p-6 border border-gray-200">
//             <h3 className="text-lg font-semibold text-black mb-4">
//               Available Error Types
//             </h3>
//             <ul className="space-y-2 text-sm">
//               <li className="text-gray-700">
//                 <strong>error:</strong> Generic errors with red theme
//               </li>
//               <li className="text-gray-700">
//                 <strong>warning:</strong> Non-critical issues with yellow theme
//               </li>
//               <li className="text-gray-700">
//                 <strong>not-found:</strong> 404 errors with blue theme
//               </li>
//               <li className="text-gray-700">
//                 <strong>unauthorized:</strong> 401 errors with purple theme
//               </li>
//               <li className="text-gray-700">
//                 <strong>server-error:</strong> 5xx errors with orange theme
//               </li>
//             </ul>
//           </div>

//           <div className="bg-white rounded-lg p-6 border border-gray-200">
//             <h3 className="text-lg font-semibold text-black mb-4">
//               Common Use Cases
//             </h3>
//             <ul className="space-y-2 text-sm">
//               <li className="text-gray-700">
//                 • Failed course enrollment or payment
//               </li>
//               <li className="text-gray-700">
//                 • Assignment submission errors
//               </li>
//               <li className="text-gray-700">
//                 • Access denied or authentication required
//               </li>
//               <li className="text-gray-700">
//                 • Network or server unavailability
//               </li>
//               <li className="text-gray-700">
//                 • Missing resources or pages
//               </li>
//             </ul>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }