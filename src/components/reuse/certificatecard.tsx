import { Card, Button, Badge } from "@/components/UI";
import {
  LuDownload,
  LuShare2,
  LuEye,
  LuAward,
  LuCalendar,
} from "react-icons/lu";

interface CertificateCardProps {
  id: string;
  title: string;
  courseName: string;
  issueDate: string;
  expiryDate?: string;
  instructor?: string;
  organization: string;
  grade?: string;
  credits?: number;
  verificationUrl?: string;
  thumbnail?: string;
  onView?: (certificateId: string) => void;
  onDownload?: (certificateId: string) => void;
  onShare?: (certificateId: string) => void;
  className?: string;
}

export default function CertificateCard({
  id,
  title,
  courseName,
  issueDate,
  expiryDate,
  instructor,
  organization,
  grade,
  credits,
  verificationUrl,
//   thumbnail,
  onView,
  onDownload,
  onShare,
  className = "",
}: CertificateCardProps) {
  const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;
  const isRecent =
    new Date(issueDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card
      variant="elevated"
      padding="none"
      className={`overflow-hidden hover:shadow-xl transition-shadow duration-300 ${className}`}
    >
      {/* Header with Gradient Background */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white">
        {/* Certificate Icon */}
        <div className="absolute top-4 right-4 opacity-20">
          <LuAward className="w-24 h-24" />
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">{title}</h3>
              <p className="text-indigo-100 text-lg">{courseName}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-200">
              <LuCalendar className="w-4 h-4" />
              <span className="text-sm">Issued {formatDate(issueDate)}</span>
            </div>
            <p className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">
              {organization}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {instructor && (
            <div>
              <span className="text-gray-500 block mb-1">Instructor</span>
              <p className="font-medium text-gray-900">{instructor}</p>
            </div>
          )}

          {grade && (
            <div>
              <span className="text-gray-500 block mb-1">Grade</span>
              <p className="font-semibold text-green-600 text-lg">{grade}</p>
            </div>
          )}

          {expiryDate && (
            <div>
              <span className="text-gray-500 block mb-1">Expires</span>
              <p
                className={`font-medium ${
                  isExpired ? "text-red-600" : "text-gray-900"
                }`}
              >
                {formatDate(expiryDate)}
              </p>
            </div>
          )}

          {credits && (
            <div>
              <span className="text-gray-500 block mb-1">Credits</span>
              <p className="font-medium text-gray-900">{credits} Credits</p>
            </div>
          )}
        </div>

        {/* Verification Link */}
        {verificationUrl && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-500 block mb-1">
              Certificate ID & Verification
            </span>
            <a
              href={verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
            >
              Verify Certificate
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        )}

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {isExpired && (
            <Badge label="Expired" color="red" variant="soft" size="sm" />
          )}
          {isRecent && !isExpired && (
            <Badge label="New" color="green" variant="soft" size="sm" />
          )}
          {!isExpired && !isRecent && (
            <Badge label="Active" color="blue" variant="soft" size="sm" />
          )}
          {credits && credits > 0 && (
            <Badge
              label={`${credits} ${credits === 1 ? "Credit" : "Credits"}`}
              color="indigo"
              variant="soft"
              size="sm"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          {onView && (
            <Button
              variant="primary"
              label="View"
              onClick={() => onView(id)}
              icon={<LuEye className="w-4 h-4" />}
              className="flex-1"
            />
          )}
          {onDownload && (
            <Button
              variant="outline"
              label="Download"
              onClick={() => onDownload(id)}
              icon={<LuDownload className="w-4 h-4" />}
            />
          )}
          {onShare && (
            <Button
              variant="outline"
              label="Share"
              onClick={() => onShare(id)}
              icon={<LuShare2 className="w-4 h-4" />}
            />
          )}
        </div>
      </div>
    </Card>
  );
}


// Example Usage
// 1. Basic Certificate Card
// tsx<CertificateCard
//   id="cert-123"
//   title="Certificate of Completion"
//   courseName="Introduction to Web Development"
//   issueDate="2024-01-15"
//   organization="Tech University"
//   onView={(id) => console.log("View:", id)}
//   onDownload={(id) => console.log("Download:", id)}
//   onShare={(id) => console.log("Share:", id)}
// />
// 2. With All Details
// tsx<CertificateCard
//   id="cert-456"
//   title="Advanced Data Structures"
//   courseName="CS 301 - Data Structures & Algorithms"
//   issueDate="2024-03-10"
//   expiryDate="2027-03-10"
//   instructor="Dr. Jane Smith"
//   organization="Computer Science Department"
//   grade="A+"
//   credits={4}
//   verificationUrl="https://university.edu/verify/cert-456"
//   onView={handleView}
//   onDownload={handleDownload}
//   onShare={handleShare}
// />
// 3. Complete Example - Certificates Page
// tsx"use client";

// import { useState } from "react";
// import { CertificateCard } from "@/components/complex";
// import { Modal } from "@/components/UI";

// export default function CertificatesPage() {
//   const [certificates] = useState([
//     {
//       id: "1",
//       title: "Certificate of Completion",
//       courseName: "Introduction to Machine Learning",
//       issueDate: "2024-01-15",
//       expiryDate: "2027-01-15",
//       instructor: "Prof. John Doe",
//       organization: "AI Academy",
//       grade: "A",
//       credits: 3,
//       verificationUrl: "https://verify.com/cert-1",
//     },
//     {
//       id: "2",
//       title: "Professional Certificate",
//       courseName: "Full Stack Web Development",
//       issueDate: "2023-11-20",
//       instructor: "Sarah Johnson",
//       organization: "Code Institute",
//       grade: "A+",
//       credits: 5,
//       verificationUrl: "https://verify.com/cert-2",
//     },
//     {
//       id: "3",
//       title: "Completion Certificate",
//       courseName: "Data Science Fundamentals",
//       issueDate: "2023-06-30",
//       expiryDate: "2024-06-30", // Expired
//       instructor: "Dr. Mike Chen",
//       organization: "Data Science Institute",
//       grade: "B+",
//       credits: 4,
//       verificationUrl: "https://verify.com/cert-3",
//     },
//   ]);

//   const handleView = (id: string) => {
//     // Open certificate in modal or new page
//     console.log("Viewing certificate:", id);
//   };

//   const handleDownload = async (id: string) => {
//     // Download certificate PDF
//     const response = await fetch(`/api/certificates/${id}/download`);
//     const blob = await response.blob();
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `certificate-${id}.pdf`;
//     a.click();
//   };

//   const handleShare = (id: string) => {
//     // Share certificate
//     const shareUrl = `${window.location.origin}/certificates/${id}`;
//     if (navigator.share) {
//       navigator.share({
//         title: "My Certificate",
//         url: shareUrl,
//       });
//     } else {
//       navigator.clipboard.writeText(shareUrl);
//       alert("Link copied to clipboard!");
//     }
//   };

//   return (
//     <div className="container mx-auto p-6">
//       <div className="mb-8">
//         <h1 className="text-3xl font-bold text-gray-900 mb-2">
//           My Certificates
//         </h1>
//         <p className="text-gray-600">
//           View and manage your earned certificates
//         </p>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//         {certificates.map((cert) => (
//           <CertificateCard
//             key={cert.id}
//             {...cert}
//             onView={handleView}
//             onDownload={handleDownload}
//             onShare={handleShare}
//           />
//         ))}
//       </div>
//     </div>
//   );
// }
// 4. Profile Page - Recent Certificates
// tsx<div>
//   <h2 className="text-2xl font-bold mb-4">Recent Certificates</h2>
//   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//     {recentCertificates.map((cert) => (
//       <CertificateCard
//         key={cert.id}
//         {...cert}
//         onView={handleView}
//         onDownload={handleDownload}
//       />
//     ))}
//   </div>
// </div>
// 5. Course Completion Certificate
// tsx// Show after completing a course
// <Modal isOpen={showCertificate} onClose={() => setShowCertificate(false)}>
//   <CertificateCard
//     id={certificate.id}
//     title="Congratulations!"
//     courseName={course.title}
//     issueDate={new Date().toISOString()}
//     organization={course.institution}
//     grade={finalGrade}
//     credits={course.credits}
//     onDownload={handleDownload}
//     onShare={handleShare}
//     className="border-0 shadow-none"
//   />
// </Modal>
// 6. Certificate Verification Page
// tsx<div className="max-w-2xl mx-auto">
//   <CertificateCard
//     id={certificate.id}
//     title={certificate.title}
//     courseName={certificate.course}
//     issueDate={certificate.issueDate}
//     organization={certificate.organization}
//     instructor={certificate.instructor}
//     grade={certificate.grade}
//     verificationUrl={certificate.verificationUrl}
//     // No actions on verification page
//   />
  
//   <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
//     <p className="text-green-800">
//       ✓ This certificate has been verified as authentic
//     </p>
//   </div>
// </div>
// 7. Expired Certificate Handling
// tsx{certificates.map((cert) => {
//   const isExpired = cert.expiryDate && new Date(cert.expiryDate) < new Date();
  
//   return (
//     <CertificateCard
//       key={cert.id}
//       {...cert}
//       onView={handleView}
//       onDownload={!isExpired ? handleDownload : undefined}
//       onShare={!isExpired ? handleShare : undefined}
//       className={isExpired ? "opacity-75" : ""}
//     />
//   );
// })}
// 🎨 Features:

// ✅ Beautiful gradient header - Eye-catching design
// ✅ Certificate watermark - Award icon in background
// ✅ Status badges - New, Active, or Expired
// ✅ Expiry handling - Visual indicator for expired certificates
// ✅ Verification link - Direct link to verify authenticity
// ✅ Grade display - Prominent grade with color coding
// ✅ Credits badge - Shows course credit value
// ✅ Responsive grid - Works on all screen sizes
// ✅ Hover effects - Enhanced shadow on hover
// ✅ Action buttons - View, Download, Share