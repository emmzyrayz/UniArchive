// components/SchoolDebug.tsx
"use client";

import { useSchool } from "@/context/schoolContext";
import {  useState } from "react";

export const SchoolDebug = () => {
  const { universities, isLoading, error, refresh } = useSchool();
  const [apiTest, setApiTest] = useState<{
    status: "idle" | "testing" | "success" | "error";
    result?: unknown;
    error?: string;
  }>({ status: "idle" });

  const testApiDirectly = async () => {
    setApiTest({ status: "testing" });

    try {
      const response = await fetch("/api/public/universities");
      const data = await response.json();

      setApiTest({
        status: response.ok ? "success" : "error",
        result: data,
        error: response.ok
          ? undefined
          : `HTTP ${response.status}: ${JSON.stringify(data)}`,
      });
    } catch (err) {
      setApiTest({
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  return (
    <div className="p-6 bg-gray-100 rounded-lg space-y-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold">School Data Debug Panel</h2>

      {/* Context State */}
      <div className="bg-white p-4 rounded">
        <h3 className="font-semibold text-lg mb-2">Context State</h3>
        <div className="space-y-2 text-sm">
          <p>
            <strong>Loading:</strong> {isLoading ? "Yes" : "No"}
          </p>
          <p>
            <strong>Error:</strong> {error || "None"}
          </p>
          <p>
            <strong>Universities Count:</strong> {universities.length}
          </p>
          {universities.length > 0 && (
            <div>
              <strong>Sample University:</strong>
              <pre className="bg-gray-50 p-2 rounded mt-1 text-xs overflow-auto">
                {JSON.stringify(universities[0], null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* API Test */}
      <div className="bg-white p-4 rounded">
        <h3 className="font-semibold text-lg mb-2">Direct API Test</h3>
        <button
          onClick={testApiDirectly}
          disabled={apiTest.status === "testing"}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {apiTest.status === "testing" ? "Testing..." : "Test API Directly"}
        </button>

        {apiTest.status !== "idle" && (
          <div className="mt-3">
            <p>
              <strong>Status:</strong> {apiTest.status}
            </p>
            {apiTest.error && (
              <div className="text-red-600">
                <strong>Error:</strong> {apiTest.error}
              </div>
            )}
            {apiTest.result !== undefined && (
              <div>
                <strong>Response:</strong>
                <pre className="bg-gray-50 p-2 rounded mt-1 text-xs overflow-auto max-h-40">
                  {JSON.stringify(apiTest.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white p-4 rounded">
        <h3 className="font-semibold text-lg mb-2">Actions</h3>
        <button
          onClick={refresh}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Refresh Data
        </button>
      </div>

      {/* Environment Info */}
      <div className="bg-white p-4 rounded">
        <h3 className="font-semibold text-lg mb-2">Environment Info</h3>
        <div className="space-y-1 text-sm">
          <p>
            <strong>Window Location:</strong>{" "}
            {typeof window !== "undefined"
              ? window.location.href
              : "Server-side"}
          </p>
          <p>
            <strong>Base URL:</strong>{" "}
            {typeof window !== "undefined" ? window.location.origin : "N/A"}
          </p>
          <p>
            <strong>API URL:</strong>{" "}
            {typeof window !== "undefined"
              ? `${window.location.origin}/api/public/universities`
              : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
};
