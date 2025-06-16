"use client";

import React, { useState, useEffect, useRef } from "react";
import { ICourse, CourseOutlineWeek, generateCourseId } from "@/models/courseModel";
import { useAdmin } from "@/context/adminContext";

interface CourseEditorProps {
  initialData: Partial<ICourse>;
  onSave: (data: Partial<ICourse>) => void;
  onUpdate?: (id: string, data: Partial<ICourse>) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
  mode?: "create" | "edit";
}

const defaultCourse: Partial<ICourse> = {
  courseId: "",
  courseName: "",
  courseCode: "",
  courseOutline: [],
  creditUnit: 1,
  semester: "First",
  level: "",
  schoolId: "",
  schoolName: "",
  facultyId: "",
  facultyName: "",
  departmentId: "",
  departmentName: "",
};

const defaultCourseOutlineWeek: CourseOutlineWeek = {
  weekId: "week-1",
  index: 1,
  topics: [
    {
      id: "topic-1",
      name: "",
      subtopics: [
        { id: "subtopic-1-1", name: "" }
      ]
    }
  ]
};

// Deep equality check utility
const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  
  if (a == null || b == null) return a === b;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as Record<string, unknown>);
const keysB = Object.keys(b as Record<string, unknown>);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => deepEqual(
      (a as Record<string, unknown>)[key], 
      (b as Record<string, unknown>)[key]
    ));
  }
  
  return false;
};

// Normalize course data for comparison
const normalizeCourseData = (data: Partial<ICourse>): Partial<ICourse> => {
  return {
    courseId: data.courseId || "",
    courseName: data.courseName || "",
    courseCode: data.courseCode || "",
    courseOutline: data.courseOutline || [],
    creditUnit: data.creditUnit || 1,
    semester: data.semester || "First",
    level: data.level || "",
    schoolId: data.schoolId || "",
    schoolName: data.schoolName || "",
    facultyId: data.facultyId || "",
    facultyName: data.facultyName || "",
    departmentId: data.departmentId || "",
    departmentName: data.departmentName || "",
  };
};

export default function CourseEditor({
  initialData,
  onSave,
  onUpdate,
  onDelete,
  isLoading = false,
  mode = "create",
}: CourseEditorProps) {
  const [formData, setFormData] = useState<Partial<ICourse>>({
    ...defaultCourse,
    ...initialData,
  });
  const [outlineWeeks, setOutlineWeeks] = useState<CourseOutlineWeek[]>([defaultCourseOutlineWeek]);
  const [isModified, setIsModified] = useState(false);
  const { universities } = useAdmin();

  // Store initial data for comparison (use ref to avoid re-renders)
  const initialDataRef = useRef<{
    formData: Partial<ICourse>;
    outlineWeeks: CourseOutlineWeek[];
  }>({
    formData: normalizeCourseData(initialData),
    outlineWeeks: []
  });

  // Get faculties and departments based on current selection
  const faculties = React.useMemo(() => {
    const school = universities.find((u) => u.id === formData.schoolId);
    return school ? school.faculties : [];
  }, [universities, formData.schoolId]);

  const departments = React.useMemo(() => {
    const faculty = faculties.find((f) => f.id === formData.facultyId);
    return faculty ? faculty.departments : [];
  }, [faculties, formData.facultyId]);

  // Initialize outline weeks from course data
  useEffect(() => {
    if (initialData.courseOutline && initialData.courseOutline.length > 0) {
      const firstItem = initialData.courseOutline[0];
      // Type guard for new format
      const isNewFormat = (item: unknown): item is CourseOutlineWeek => {
        return typeof item === 'object' && item !== null && 'weekId' in item && 'topics' in item;
      };
      if (isNewFormat(firstItem)) {
        const weeks = initialData.courseOutline as CourseOutlineWeek[];
        setOutlineWeeks(weeks);
        initialDataRef.current.outlineWeeks = weeks;
      } else {
        // Legacy: fallback to one week, one topic
        setOutlineWeeks([defaultCourseOutlineWeek]);
        initialDataRef.current.outlineWeeks = [defaultCourseOutlineWeek];
      }
    } else {
      setOutlineWeeks([defaultCourseOutlineWeek]);
      initialDataRef.current.outlineWeeks = [defaultCourseOutlineWeek];
    }
  }, [initialData.courseOutline]);

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    const newFormData = { ...defaultCourse, ...initialData };
    setFormData(newFormData);
    initialDataRef.current.formData = normalizeCourseData(initialData);
  }, [initialData]);

  // Improved modification detection
  useEffect(() => {
    // Skip modification check for create mode
    if (mode === "create") {
      setIsModified(true);
      return;
    }

    // Compare current form data with initial data
    const currentFormData = normalizeCourseData(formData);
    const hasFormChanges = !deepEqual(currentFormData, initialDataRef.current.formData);
    
    // Compare current outline with initial outline
    const hasOutlineChanges = !deepEqual(outlineWeeks, initialDataRef.current.outlineWeeks);
    
    const modified = hasFormChanges || hasOutlineChanges;
    setIsModified(modified);
    
    // Debug logging
    console.log('Modification check:', {
      mode,
      hasFormChanges,
      hasOutlineChanges,
      modified,
      currentFormData,
      initialFormData: initialDataRef.current.formData,
      currentOutline: outlineWeeks,
      initialOutline: initialDataRef.current.outlineWeeks
    });
  }, [formData, outlineWeeks, mode]);

  const handleInputChange = (
    field: keyof ICourse,
    value: string | number | CourseOutlineWeek[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Outline week/topic/subtopic handlers for new format
  const handleWeekTitleChange = (weekIdx: number, topicIdx: number, value: string) => {
  setOutlineWeeks(weeks =>
    weeks.map((week, wIdx) =>
      wIdx !== weekIdx
        ? week
        : {
            ...week,
            topics: week.topics.map((topic, tIdx) =>
              tIdx !== topicIdx ? topic : { ...topic, name: value }
            ),
          }
    )
  );
};

const handleSubtopicChange = (weekIdx: number, topicIdx: number, subIdx: number, value: string) => {
  setOutlineWeeks(weeks =>
    weeks.map((week, wIdx) =>
      wIdx !== weekIdx
        ? week
        : {
            ...week,
            topics: week.topics.map((topic, tIdx) =>
              tIdx !== topicIdx
                ? topic
                : {
                    ...topic,
                    subtopics: topic.subtopics.map((sub, sIdx) =>
                      sIdx !== subIdx ? sub : { ...sub, name: value }
                    ),
                  }
            ),
          }
    )
  );
};

const addSubtopic = (weekIdx: number, topicIdx: number) => {
  setOutlineWeeks(weeks =>
    weeks.map((week, wIdx) =>
      wIdx !== weekIdx
        ? week
        : {
            ...week,
            topics: week.topics.map((topic, tIdx) =>
              tIdx !== topicIdx
                ? topic
                : {
                    ...topic,
                    subtopics: [
                      ...topic.subtopics,
                      {
                        id: `subtopic-${weekIdx + 1}-${topicIdx + 1}-${topic.subtopics.length + 1}`,
                        name: "",
                      },
                    ],
                  }
            ),
          }
    )
  );
};

const removeSubtopic = (weekIdx: number, topicIdx: number, subIdx: number) => {
  setOutlineWeeks(weeks =>
    weeks.map((week, wIdx) =>
      wIdx !== weekIdx
        ? week
        : {
            ...week,
            topics: week.topics.map((topic, tIdx) =>
              tIdx !== topicIdx
                ? topic
                : {
                    ...topic,
                    subtopics:
                      topic.subtopics.length > 1
                        ? topic.subtopics.filter((_, sIdx) => sIdx !== subIdx)
                        : topic.subtopics,
                  }
            ),
          }
    )
  );
};

const addTopic = (weekIdx: number) => {
  setOutlineWeeks(weeks =>
    weeks.map((week, wIdx) =>
      wIdx !== weekIdx
        ? week
        : {
            ...week,
            topics: [
              ...week.topics,
              {
                id: `topic-${weekIdx + 1}-${week.topics.length + 1}`,
                name: "",
                subtopics: [
                  { id: `subtopic-${weekIdx + 1}-${week.topics.length + 1}-1`, name: "" },
                ],
              },
            ],
          }
    )
  );
};

const removeTopic = (weekIdx: number, topicIdx: number) => {
  setOutlineWeeks(weeks =>
    weeks.map((week, wIdx) =>
      wIdx !== weekIdx
        ? week
        : {
            ...week,
            topics:
              week.topics.length > 1
                ? week.topics.filter((_, tIdx) => tIdx !== topicIdx)
                : week.topics,
          }
    )
  );
};
  
  const addWeek = () => {
    setOutlineWeeks(prev => [
      ...prev,
      {
        weekId: `week-${prev.length+1}`,
        index: prev.length+1,
        topics: [
          {
            id: `topic-${prev.length+1}-1`,
            name: "",
            subtopics: [
              { id: `subtopic-${prev.length+1}-1-1`, name: "" }
            ]
          }
        ]
      }
    ]);
  };
  
  const removeWeek = (weekIdx: number) => {
    if (outlineWeeks.length > 1) {
      const updated = outlineWeeks.filter((_, idx) => idx !== weekIdx);
      // Re-index weeks
      const reNumbered = updated.map((week, idx) => ({ ...week, weekId: `week-${idx+1}`, index: idx+1 }));
      setOutlineWeeks(reNumbered);
    }
  };

  const handleSubmit = () => {
    // Generate courseId if not present
    const courseId =
      formData.courseId ||
      generateCourseId(
        formData.departmentId || "",
        formData.level || "",
        formData.courseCode || ""
      );
    // Clean up outline: remove empty topics/subtopics
    const cleanedOutline = outlineWeeks
      .map((week) => ({
        ...week,
        topics: week.topics
          .filter(topic => topic.name.trim() !== "")
          .map((topic) => ({
            ...topic,
            subtopics: topic.subtopics.filter(st => st.name && st.name.trim() !== "")
          }))
          .filter(topic => topic.subtopics.length > 0)
      }))
      .filter(week => week.topics.length > 0);
    const data: Partial<ICourse> = {
      ...formData,
      courseId,
      courseOutline: cleanedOutline
    };
    if (mode === "edit" && onUpdate && formData.courseId) {
      onUpdate(formData.courseId, data);
    } else {
      onSave(data);
    }
  };

  const isRequiredMissing =
    !formData.courseName ||
    !formData.courseCode ||
    !formData.departmentId ||
    !formData.facultyId ||
    !formData.schoolId ||
    !formData.level ||
    outlineWeeks.every(week => week.topics.every(topic => !topic.name.trim()));

  const canUpdate = mode === "edit" && isModified && !isRequiredMissing;

  return (
    <div className="border rounded-lg p-6 mb-6 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">
            {formData.courseName || "New Course"}
          </h3>
          {mode === "edit" && (
            <p className="text-sm text-gray-500">Editing existing course</p>
          )}
        </div>
        <div className="flex flex-col items-end space-y-1">
          <span
            className={`px-2 py-1 text-xs rounded ${
              isRequiredMissing
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {isRequiredMissing ? "Missing Data" : "Ready"}
          </span>
          {mode === "edit" && (
            <span className={`px-2 py-1 text-xs rounded ${
              isModified 
                ? "bg-blue-100 text-blue-800" 
                : "bg-gray-100 text-gray-600"
            }`}>
              {isModified ? "Modified" : "No Changes"}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Course Name*</label>
          <input
            type="text"
            className={`w-full p-2 border rounded ${
              !formData.courseName ? "border-red-300" : "border-gray-300"
            }`}
            value={formData.courseName || ""}
            onChange={(e) => handleInputChange("courseName", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Course Code*</label>
          <input
            type="text"
            className={`w-full p-2 border rounded ${
              !formData.courseCode ? "border-red-300" : "border-gray-300"
            }`}
            value={formData.courseCode || ""}
            onChange={(e) => handleInputChange("courseCode", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Credit Unit</label>
          <input
            type="number"
            className="w-full p-2 border border-gray-300 rounded"
            value={formData.creditUnit || ""}
            onChange={(e) =>
              handleInputChange("creditUnit", Number(e.target.value))
            }
            min={1}
            max={10}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Semester</label>
          <select
            className="w-full p-2 border border-gray-300 rounded"
            value={formData.semester || "First"}
            onChange={(e) => handleInputChange("semester", e.target.value)}
          >
            <option value="First">First</option>
            <option value="Second">Second</option>
            <option value="Annual">Annual</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Level*</label>
          <select
            className={`w-full p-2 border rounded ${
              !formData.level ? "border-red-300" : "border-gray-300"
            }`}
            value={formData.level || ""}
            onChange={(e) => handleInputChange("level", e.target.value)}
            required
          >
            <option value="">Select Level</option>
            <option value="100L">100 Level</option>
            <option value="200L">200 Level</option>
            <option value="300L">300 Level</option>
            <option value="400L">400 Level</option>
            <option value="500L">500 Level</option>
          </select>
        </div>
        
        {/* School Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1">
            School (University)*
          </label>
          <select
            className={`w-full p-2 border rounded ${
              !formData.schoolId ? "border-red-300" : "border-gray-300"
            }`}
            value={formData.schoolId || ""}
            onChange={(e) => {
              const selectedSchool = universities.find(
                (u) => u.id === e.target.value
              );
              setFormData((prev) => ({
                ...prev,
                schoolId: selectedSchool?.id || "",
                schoolName: selectedSchool?.name || "",
                facultyId: "",
                facultyName: "",
                departmentId: "",
                departmentName: "",
              }));
            }}
            required
          >
            <option value="">Select School</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Faculty Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1">Faculty*</label>
          <select
            className={`w-full p-2 border rounded ${
              !formData.facultyId ? "border-red-300" : "border-gray-300"
            }`}
            value={formData.facultyId || ""}
            onChange={(e) => {
              const selectedFaculty = faculties.find(
                (f) => f.id === e.target.value
              );
              setFormData((prev) => ({
                ...prev,
                facultyId: selectedFaculty?.id || "",
                facultyName: selectedFaculty?.name || "",
                departmentId: "",
                departmentName: "",
              }));
            }}
            required
            disabled={!formData.schoolId}
          >
            <option value="">
              {formData.schoolId ? "Select Faculty" : "Select School First"}
            </option>
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Department Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1">Department*</label>
          <select
            className={`w-full p-2 border rounded ${
              !formData.departmentId ? "border-red-300" : "border-gray-300"
            }`}
            value={formData.departmentId || ""}
            onChange={(e) => {
              const selectedDept = departments.find(
                (d) => d.id === e.target.value
              );
              setFormData((prev) => ({
                ...prev,
                departmentId: selectedDept?.id || "",
                departmentName: selectedDept?.name || "",
              }));
            }}
            required
            disabled={!formData.facultyId}
          >
            <option value="">
              {formData.facultyId
                ? "Select Department"
                : "Select Faculty First"}
            </option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Weekly Course Outline Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <label className="block text-sm font-medium">Course Outline*</label>
          <button
            type="button"
            onClick={addWeek}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
          >
            + Add Week
          </button>
        </div>
        <div className="space-y-6">
          {outlineWeeks.map((week, weekIdx) => (
            <div key={week.weekId} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-medium text-gray-800">Week {week.index}</h4>
                {outlineWeeks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWeek(weekIdx)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove Week
                  </button>
                )}
              </div>
              {week.topics.map((topic, topicIdx) => (
                <div key={topic.id} className="mb-4 border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">Topic*</label>
                    {week.topics.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTopic(weekIdx, topicIdx)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Remove Topic
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    className={`w-full p-2 border rounded ${!topic.name.trim() ? "border-red-300" : "border-gray-300"}`}
                    value={topic.name}
                    onChange={e => handleWeekTitleChange(weekIdx, topicIdx, e.target.value)}
                    placeholder={`Topic for week ${week.index}`}
                    required
                  />
                  <div className="flex justify-between items-center mt-2 mb-1">
                    <label className="block text-xs font-medium">Subtopics</label>
                    <button
                      type="button"
                      onClick={() => addSubtopic(weekIdx, topicIdx)}
                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                    >
                      + Add Subtopic
                    </button>
                  </div>
                  <div className="space-y-2">
                    {topic.subtopics.map((sub, subIdx) => (
                      <div key={sub.id} className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 min-w-[60px]">Subtopic {subIdx + 1}:</span>
                        <input
                          type="text"
                          className="flex-1 p-2 border border-gray-300 rounded text-sm"
                          value={sub.name || ""}
                          onChange={e => handleSubtopicChange(weekIdx, topicIdx, subIdx, e.target.value)}
                          placeholder={`Subtopic for topic ${topicIdx + 1}`}
                        />
                        {topic.subtopics.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSubtopic(weekIdx, topicIdx, subIdx)}
                            className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addTopic(weekIdx)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs mt-2"
              >
                + Add Topic
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            isRequiredMissing || isLoading || (mode === "edit" && !canUpdate)
          }
          className={`px-4 py-2 rounded ${
            isRequiredMissing || isLoading || (mode === "edit" && !canUpdate)
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {mode === "edit"
            ? canUpdate
              ? isLoading
                ? "Updating..."
                : "Update Course"
              : "No Changes"
            : isLoading
            ? "Saving..."
            : "Save Course"}
        </button>
        {mode === "edit" && onDelete && formData.courseId && (
          <button
            type="button"
            onClick={() => onDelete(formData.courseId!)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            disabled={isLoading}
          >
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            console.log("=== DEBUG DATA ===");
            console.log("Mode:", mode);
            console.log("Is Modified:", isModified);
            console.log("Can Update:", canUpdate);
            console.log("Initial Data:", initialDataRef.current);
            console.log("Current Form Data:", formData);
            console.log("Current Outline:", outlineWeeks);
            console.log("Normalized Initial:", normalizeCourseData(initialDataRef.current.formData));
            console.log("Normalized Current:", normalizeCourseData(formData));
            console.log("Form Equal:", deepEqual(normalizeCourseData(formData), initialDataRef.current.formData));
            console.log("Outline Equal:", deepEqual(outlineWeeks, initialDataRef.current.outlineWeeks));
          }}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          Debug Data
        </button>
      </div>
    </div>
  );
}