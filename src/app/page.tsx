// import Image from "next/image";
"use client";

import { Button, Textarea, Select, Checkbox, Alert, Avatar, RadioGroup, Card, Badge, Modal, Skeleton, Tooltip, Divider } from "@/components/UI";
import { useState } from "react";

// icons...
import { LuCircleCheck, LuClock } from "react-icons/lu";
import {
  FiInfo,
  FiHelpCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiLock,
  FiStar,
  FiClock,
  FiVideo,
  FiAward,
  FiBook,
} from "react-icons/fi";


export default function Home() {
  const [description, setDescription] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [checked, setChecked] = useState<boolean>(false);
  const [gender, setGender] = useState<string>("");

  // const [isOpen, setIsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);


  function handleDelete(): void {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="flex flex-col justify-center p-4 items-center gap-3">
      <Button label="test btn" />
      <Textarea
        label="Description"
        placeholder="Enter your description..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Select
        label="Subject"
        name="subject"
        placeholder="Choose a subject"
        options={["Math", "Physics", "Chemistry", "Biology"]}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <Checkbox
        variant="toggle"
        label="select here"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
      />
      <RadioGroup
        label="Gender"
        name="gender"
        direction="horizontal"
        helperText="Choose the format that works best for you"
        required
        options={[
          {
            value: "free",
            label: "Free Plan",
            description: "Access to basic courses",
          },
          {
            value: "pro",
            label: "Pro Plan",
            description: "Unlimited access to all courses",
          },
          {
            value: "enterprise",
            label: "Enterprise",
            description: "Custom solutions for organizations",
          },
        ]}
        value={gender}
        onChange={(value) => setGender(value)}
        error={!gender ? "Please select a plan" : ""}
      />

      <Card variant="elevated" className="text-center">
        <div className="text-4xl font-bold text-indigo-600">1,234</div>
        <div className="text-sm text-gray-500 mt-1">Total Students</div>
      </Card>

      <Card
        variant="outlined"
        header={<h2 className="text-xl font-bold">Course Title</h2>}
        footer={<Button label="Enroll Now" variant="primary" />}
      >
        <p>This is an amazing course about web development...</p>
      </Card>

      {/* Modal */}
      <>
        <Button label="Open Modal" onClick={() => setConfirmOpen(true)} />

        {/* Basic Modal */}
        <Modal
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title="Delete Course?"
          size="sm"
          footer={
            <div className="flex gap-2 justify-end">
              <Button
                label="Cancel"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
              />
              <Button label="Delete" variant="primary" onClick={handleDelete} />
            </div>
          }
        >
          <p className="text-gray-600">
            Are you sure you want to delete this course? This action cannot be
            undone.
          </p>
        </Modal>
      </>

      {/* Error Alert with Title */}
      <Alert
        type="error"
        title="Upload Failed"
        message="There was an error uploading your file. Please try again."
      />

      {/* Warning Alert */}
      <Alert
        type="warning"
        title="Low Storage"
        message="You are running out of storage space. Please upgrade your plan."
      />

      {/* Info Alert */}
      <Alert
        type="info"
        message="New features have been added to the dashboard. Check them out!"
      />

      {/* Avatar Group (Overlapping) */}
      <div className="flex -space-x-2">
        <Avatar
          src="/user1.jpg"
          alt="User 1"
          size="sm"
          className="ring-2 ring-white"
        />
        <Avatar
          src="/user2.jpg"
          alt="User 2"
          size="sm"
          className="ring-2 ring-white"
        />
        <Avatar
          src="/user3.jpg"
          alt="User 3"
          size="sm"
          className="ring-2 ring-white"
        />
        <Avatar
          fallback="+5"
          size="sm"
          className="ring-2 ring-white bg-gray-600"
        />
      </div>

      {/* Profile Header */}
      <div className="flex items-center gap-4 bg-white/50 p-2 rounded-md shadow-lg">
        <Avatar
          src="/profile.jpg"
          alt="Emmanuel Okoro"
          size="xl"
          status="online"
        />
        <div>
          <h1 className="text-2xl font-bold">Emmanuel Okoro</h1>
          <p className="text-gray-600">Web Developer</p>
        </div>
      </div>

      <div className="p-6 space-y-6 bg-white">
        {/* Course Status Badges */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-black">Course Status</h2>
          <div className="flex flex-wrap gap-2">
            <Badge
              label="Published"
              color="green"
              variant="soft"
              icon={<LuCircleCheck size={14} />}
            />
            <Badge
              label="Draft"
              color="yellow"
              variant="soft"
              icon={<LuClock size={14} />}
            />
            <Badge label="Archived" color="gray" variant="soft" />
            <Badge label="Under Review" color="blue" variant="soft" pulse />
          </div>
        </div>

        {/* Difficulty Levels */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-black">Difficulty Levels</h2>
          <div className="flex flex-wrap gap-2">
            <Badge label="Beginner" color="green" size="sm" />
            <Badge label="Intermediate" color="blue" size="md" />
            <Badge label="Advanced" color="indigo" size="lg" />
            <Badge label="Expert" color="red" variant="outlined" />
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-black">Live Status</h2>
          <div className="flex flex-wrap gap-2">
            <Badge label="Live Now" color="red" variant="dot" pulse />
            <Badge label="Online" color="green" variant="dot" />
            <Badge label="Away" color="yellow" variant="dot" />
            <Badge label="Offline" color="gray" variant="dot" />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8 bg-white dark:bg-gray-900">
        {/* Course Card Skeletons */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-black dark:text-white">
            Course Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <Skeleton variant="image" animation="wave" className="mb-4" />
                <Skeleton
                  variant="text"
                  width="80%"
                  animation="wave"
                  className="mb-2"
                />
                <Skeleton
                  variant="text"
                  width="60%"
                  animation="wave"
                  className="mb-4"
                />
                <div className="flex justify-between items-center">
                  <Skeleton variant="text" width="4rem" animation="wave" />
                  <Skeleton variant="text" width="6rem" animation="wave" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Profile Loading */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-black dark:text-white">
            User Profile
          </h2>
          <div className="flex items-center space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <Skeleton variant="avatar" animation="pulse" rounded="full" />
            <div className="space-y-2 flex-1">
              <Skeleton variant="text" width="40%" animation="pulse" />
              <Skeleton variant="text" width="60%" animation="pulse" />
              <Skeleton variant="text" width="30%" animation="pulse" />
            </div>
          </div>
        </div>

        {/* Lesson List Loading */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-black dark:text-white">
            Lesson List
          </h2>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <Skeleton
                  variant="circular"
                  width="2rem"
                  height="2rem"
                  animation="wave"
                />
                <div className="flex-1 space-y-2">
                  <Skeleton
                    variant="text"
                    width={`${70 + i * 5}%`}
                    animation="wave"
                  />
                  <Skeleton variant="text" width="40%" animation="wave" />
                </div>
                <Skeleton variant="text" width="4rem" animation="wave" />
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-black dark:text-white">
            Dashboard Stats
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
              <Skeleton
                variant="circular"
                width="3rem"
                height="3rem"
                animation="pulse"
                className="mx-auto mb-2"
              />
              <Skeleton
                variant="text"
                width="80%"
                animation="pulse"
                className="mx-auto"
              />
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
              <Skeleton
                variant="circular"
                width="3rem"
                height="3rem"
                animation="pulse"
                className="mx-auto mb-2"
              />
              <Skeleton
                variant="text"
                width="60%"
                animation="pulse"
                className="mx-auto"
              />
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
              <Skeleton
                variant="circular"
                width="3rem"
                height="3rem"
                animation="pulse"
                className="mx-auto mb-2"
              />
              <Skeleton
                variant="text"
                width="70%"
                animation="pulse"
                className="mx-auto"
              />
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
              <Skeleton
                variant="circular"
                width="3rem"
                height="3rem"
                animation="pulse"
                className="mx-auto mb-2"
              />
              <Skeleton
                variant="text"
                width="50%"
                animation="pulse"
                className="mx-auto"
              />
            </div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-black dark:text-white">
            Progress Loading
          </h2>
          <div className="space-y-3">
            <div>
              <Skeleton
                variant="text"
                width="30%"
                animation="wave"
                className="mb-2"
              />
              <Skeleton
                variant="rectangular"
                height="0.5rem"
                animation="wave"
                rounded="full"
              />
            </div>
            <div>
              <Skeleton
                variant="text"
                width="50%"
                animation="wave"
                className="mb-2"
              />
              <Skeleton
                variant="rectangular"
                height="0.5rem"
                animation="wave"
                rounded="full"
              />
            </div>
            <div>
              <Skeleton
                variant="text"
                width="40%"
                animation="wave"
                className="mb-2"
              />
              <Skeleton
                variant="rectangular"
                height="0.5rem"
                animation="wave"
                rounded="full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8 bg-white">
        {/* Course Action Buttons with Tooltips */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-black">Course Actions</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <Tooltip text="Watch video lesson" position="top">
              <button className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <FiVideo size={20} />
              </button>
            </Tooltip>

            <Tooltip text="Mark as completed" position="bottom">
              <button className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <FiCheckCircle size={20} />
              </button>
            </Tooltip>

            <Tooltip text="Save to favorites" position="left">
              <button className="p-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                <FiStar size={20} />
              </button>
            </Tooltip>

            <Tooltip
              text="Advanced content - requires prerequisites"
              position="right"
            >
              <button className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <FiLock size={20} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-black">Status Information</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <Tooltip
              text="This course includes interactive coding exercises and projects"
              position="top"
              arrow={false}
            >
              <span className="flex items-center gap-1 text-blue-600 cursor-help">
                <FiInfo size={16} />
                Interactive
              </span>
            </Tooltip>

            <Tooltip
              text={
                <div className="text-center">
                  <div className="font-semibold">Certificate Available</div>
                  <div className="text-xs mt-1">
                    Complete all assignments to earn your certificate
                  </div>
                </div>
              }
              position="bottom"
              maxWidth="12rem"
            >
              <span className="flex items-center gap-1 text-green-600 cursor-help">
                <FiAward size={16} />
                Certified
              </span>
            </Tooltip>

            <Tooltip
              text="Estimated time to complete: 8-10 hours"
              position="top-right"
            >
              <span className="flex items-center gap-1 text-gray-600 cursor-help">
                <FiClock size={16} />8 hours
              </span>
            </Tooltip>
          </div>
        </div>

        {/* Progress and Statistics */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-black">Progress Tracking</h2>
          <div className="flex flex-wrap gap-6 items-center">
            <Tooltip
              text="65% completed - 13/20 lessons finished"
              position="top"
            >
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: "65%" }}
                ></div>
              </div>
            </Tooltip>

            <Tooltip
              text={
                <div>
                  <div>Current streak: 7 days</div>
                  <div className="text-xs text-gray-300">
                    Keep learning to maintain your streak!
                  </div>
                </div>
              }
              position="bottom"
            >
              <div className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                🔥 7 days
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Click-Triggered Tooltips */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-black">
            Click to Reveal (Help Tips)
          </h2>
          <div className="flex flex-wrap gap-4 items-center">
            <Tooltip
              text="Use Ctrl+K to quickly search through course content"
              position="top"
              trigger="click"
              closeOnClickOutside={true}
            >
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <FiHelpCircle size={16} />
                Keyboard Shortcuts
              </button>
            </Tooltip>

            <Tooltip
              text={
                <div className="space-y-2">
                  <div className="font-semibold">Grading Criteria</div>
                  <ul className="text-xs list-disc list-inside space-y-1">
                    <li>Code correctness: 40%</li>
                    <li>Code quality: 30%</li>
                    <li>Documentation: 20%</li>
                    <li>Timeliness: 10%</li>
                  </ul>
                </div>
              }
              position="bottom"
              trigger="click"
              maxWidth="14rem"
            >
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <FiAlertTriangle size={16} />
                Grading Info
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8 bg-white max-w-4xl mx-auto">
        {/* Course Content Sections */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-black">Course Sections</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Introduction to React
              </h3>
              <p className="text-gray-600 mt-1">
                Learn the fundamentals of React programming
              </p>
            </div>

            <Divider variant="dashed" color="#e5e7eb" spacing="lg" />

            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Advanced Concepts
              </h3>
              <p className="text-gray-600 mt-1">
                Dive deeper into state management and hooks
              </p>
            </div>

            <Divider
              label="Up Next"
              labelPosition="left"
              color="#6366f1"
              thickness={2}
              spacing="lg"
            />

            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Project Building
              </h3>
              <p className="text-gray-600 mt-1">
                Apply your knowledge to real-world projects
              </p>
            </div>
          </div>
        </div>

        {/* Course Statistics with Icon Labels */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-black">Course Statistics</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-600">24</div>
              <div className="text-sm text-gray-600">Lessons</div>
            </div>

            <Divider
              orientation="vertical"
              thickness={2}
              color="#d1d5db"
              spacing="none"
            />

            <div>
              <div className="text-2xl font-bold text-green-600">18</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>

            <Divider
              orientation="vertical"
              thickness={2}
              color="#d1d5db"
              spacing="none"
            />

            <div>
              <div className="text-2xl font-bold text-blue-600">6</div>
              <div className="text-sm text-gray-600">Remaining</div>
            </div>
          </div>
        </div>

        {/* Module Progress */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-black">Module Progress</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Basic Concepts</span>
              <FiCheckCircle className="text-green-500" />
            </div>

            <Divider variant="dotted" thickness={2} spacing="sm" />

            <div className="flex justify-between items-center">
              <span className="text-gray-700">State Management</span>
              <FiCheckCircle className="text-green-500" />
            </div>

            <Divider variant="dotted" thickness={2} spacing="sm" />

            <div className="flex justify-between items-center">
              <span className="text-gray-700">Advanced Hooks</span>
              <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
            </div>
          </div>
        </div>

        {/* Rich Label Dividers */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-black">
            Section Dividers with Icons
          </h2>
          <div className="space-y-6">
            <Divider
              label={
                <div className="flex items-center gap-2 text-indigo-600">
                  <FiVideo size={16} />
                  <span className="font-semibold">Video Lectures</span>
                </div>
              }
              color="#6366f1"
              thickness={1}
              variant="solid"
            />

            <Divider
              label={
                <div className="flex items-center gap-2 text-green-600">
                  <FiBook size={16} />
                  <span className="font-semibold">Reading Materials</span>
                </div>
              }
              labelPosition="left"
              color="#10b981"
              thickness={1}
            />

            <Divider
              label={
                <div className="flex items-center gap-2 text-yellow-600">
                  <FiAward size={16} />
                  <span className="font-semibold">Assignments & Projects</span>
                </div>
              }
              labelPosition="right"
              color="#f59e0b"
              thickness={1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
