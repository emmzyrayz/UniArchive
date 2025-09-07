// components/PublicContextTest.tsx
"use client";

import React, { useState } from "react";
import { usePublic } from "@/context/publicContext";

export const PublicContextTest = () => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<string>("");

  const { unifiedData, isLoading, error, refreshData, getCachedData } =
    usePublic();

  const handleRefresh = async () => {
    console.log("Refreshing data...");
    try {
      await refreshData();
      console.log("Data refreshed successfully");
    } catch (err) {
      console.error("Error refreshing data:", err);
    }
  };

  const handleCheckCache = () => {
    const cached = getCachedData();
    console.log("Cached data:", cached);
    if (cached) {
      console.log("Cache is valid and contains data");
    } else {
      console.log("No valid cached data found");
    }
  };

  const handleClearCache = () => {
    localStorage.removeItem("uniarchive_public_data");
    localStorage.removeItem("uniarchive_public_data_expiry");
    console.log("Cache cleared");
  };

  const handleLogCurrentData = () => {
    console.log("=== CURRENT UNIFIED DATA ===");
    console.log("Loading:", isLoading);
    console.log("Error:", error);
    console.log("Data:", unifiedData);
    console.log("Universities count:", unifiedData?.length || 0);

    if (unifiedData && unifiedData.length > 0) {
      const totalFaculties = unifiedData.reduce(
        (sum, uni) => sum + uni.faculties.length,
        0
      );
      const totalDepartments = unifiedData.reduce(
        (sum, uni) =>
          sum +
          uni.faculties.reduce((fSum, fac) => fSum + fac.departments.length, 0),
        0
      );
      const totalCourses = unifiedData.reduce(
        (sum, uni) =>
          sum +
          uni.faculties.reduce(
            (fSum, fac) =>
              fSum +
              fac.departments.reduce(
                (dSum, dept) => dSum + dept.courses.length,
                0
              ),
            0
          ),
        0
      );
      const totalMaterials = unifiedData.reduce(
        (sum, uni) =>
          sum +
          uni.faculties.reduce(
            (fSum, fac) =>
              fSum +
              fac.departments.reduce(
                (dSum, dept) =>
                  dSum +
                  dept.courses.reduce(
                    (cSum, course) => cSum + course.materials.length,
                    0
                  ),
                0
              ),
            0
          ),
        0
      );

      console.log("Total faculties:", totalFaculties);
      console.log("Total departments:", totalDepartments);
      console.log("Total courses:", totalCourses);
      console.log("Total materials:", totalMaterials);
    }
    console.log("=== END DATA LOG ===");
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-xl font-bold mb-4">
          Public Context Test - Loading
        </h2>
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Loading unified data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-red-800">
          Public Context Test - Error
        </h2>
        <p className="text-red-600 mb-4">Error: {error}</p>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
          <button
            onClick={handleLogCurrentData}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Log Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
      <h2 className="text-xl font-bold mb-4 text-green-800">
        Public Context Test - Success
      </h2>

      {/* Control Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh Data
        </button>
        <button
          onClick={handleCheckCache}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Check Cache
        </button>
        <button
          onClick={handleClearCache}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Clear Cache
        </button>
        <button
          onClick={handleLogCurrentData}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Log Data
        </button>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          {showDetails ? "Hide" : "Show"} Details
        </button>
      </div>

      {/* Summary Stats */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-3 rounded border">
          <div className="text-2xl font-bold text-blue-600">
            {unifiedData?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Universities</div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-2xl font-bold text-purple-600">
            {unifiedData?.reduce((sum, uni) => sum + uni.faculties.length, 0) ||
              0}
          </div>
          <div className="text-sm text-gray-600">Faculties</div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-2xl font-bold text-green-600">
            {unifiedData?.reduce(
              (sum, uni) =>
                sum +
                uni.faculties.reduce(
                  (fSum, fac) => fSum + fac.departments.length,
                  0
                ),
              0
            ) || 0}
          </div>
          <div className="text-sm text-gray-600">Departments</div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-2xl font-bold text-orange-600">
            {unifiedData?.reduce(
              (sum, uni) =>
                sum +
                uni.faculties.reduce(
                  (fSum, fac) =>
                    fSum +
                    fac.departments.reduce(
                      (dSum, dept) => dSum + dept.courses.length,
                      0
                    ),
                  0
                ),
              0
            ) || 0}
          </div>
          <div className="text-sm text-gray-600">Courses</div>
        </div>
      </div>

      {/* University Selector */}
      {unifiedData && unifiedData.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select University to Inspect:
          </label>
          <select
            value={selectedUniversity}
            onChange={(e) => setSelectedUniversity(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="">Select a university...</option>
            {unifiedData.map((uni) => (
              <option key={uni.id} value={uni.id}>
                {uni.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Detailed View */}
      {showDetails && unifiedData && unifiedData.length > 0 && (
        <div className="bg-white border rounded p-4">
          <h3 className="font-bold mb-3">Data Structure:</h3>

          {selectedUniversity ? (
            // Show selected university details
            unifiedData
              .filter((uni) => uni.id === selectedUniversity)
              .map((university) => (
                <div key={university.id} className="mb-4">
                  <h4 className="font-semibold text-lg text-blue-800 mb-2">
                    {university.name}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Location: {university.location} | Website:{" "}
                    {university.website}
                  </p>

                  {university.faculties.map((faculty) => (
                    <div
                      key={faculty.id}
                      className="ml-4 mb-3 border-l-2 border-blue-200 pl-3"
                    >
                      <h5 className="font-medium text-purple-700">
                        {faculty.name}
                      </h5>

                      {faculty.departments.map((department) => (
                        <div key={department.id} className="ml-4 mt-2">
                          <h6 className="font-medium text-green-700">
                            {department.name} ({department.courses.length}{" "}
                            courses)
                          </h6>

                          {department.courses.slice(0, 3).map((course) => (
                            <div
                              key={course.id}
                              className="ml-4 text-sm text-gray-600"
                            >
                              • {course.code}: {course.name} (
                              {course.materials.length} materials)
                            </div>
                          ))}

                          {department.courses.length > 3 && (
                            <div className="ml-4 text-sm text-gray-500">
                              ... and {department.courses.length - 3} more
                              courses
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))
          ) : (
            // Show all universities summary
            <div className="max-h-96 overflow-y-auto">
              {unifiedData.map((university) => (
                <div key={university.id} className="mb-3 p-3 border rounded">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-blue-800">
                      {university.name}
                    </h4>
                    <button
                      onClick={() => setSelectedUniversity(university.id)}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                    >
                      Inspect
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">
                    {university.faculties.length} faculties,{" "}
                    {university.faculties.reduce(
                      (sum, fac) => sum + fac.departments.length,
                      0
                    )}{" "}
                    departments
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(!unifiedData || unifiedData.length === 0) && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <p className="text-yellow-800">
            No unified data available. The context might still be loading or
            there might be no data in your underlying contexts.
          </p>
        </div>
      )}
    </div>
  );
};
