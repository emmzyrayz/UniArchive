// utils/DebugUserContext.tsx - Enhanced debug component with collapsible UI and admin-only access
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '@/context/userContext';
import { getRouteProtection } from '@/config/routeProtection';
import { usePathname } from 'next/navigation';

interface Position {
  x: number;
  y: number;
}

interface TestResult {
  timestamp: string;
  test: string;
  status: 'success' | 'error' | 'pending';
  data?: Record<string, unknown> | string | number | boolean | null;
  error?: string;
}

const DebugUserContext: React.FC = () => {
  const {
    userProfile,
    hasActiveSession,
    isLoading,
    userState,
    refreshUserData
  } = useUser();
  
  const pathname = usePathname();
  const routeProtection = getRouteProtection(pathname);
  
  // Component state
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [activeTab, setActiveTab] = useState<'context' | 'tests' | 'api'>('context');
  
  const debugRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  // All hooks must be called before any early returns
  

  // Drag functionality hooks
  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - (isCollapsed ? 60 : 400);
    const maxY = window.innerHeight - (isCollapsed ? 60 : 500);
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging, dragOffset, isCollapsed]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Add test result
  const addTestResult = (test: string, status: 'success' | 'error' | 'pending', data?: Record<string, unknown> | string | number | boolean | null,  error?: string) => {
    const result: TestResult = {
      timestamp: new Date().toLocaleTimeString(),
      test,
      status,
      data,
      error
    };
    setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  // Test session endpoint
  const testSessionEndpoint = React.useCallback(async () => {
    addTestResult('Session Status', 'pending');
    try {
      const response = await fetch('/api/user/online-status', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      addTestResult('Session Status', 'success', data);
      console.log('🔗 Session Endpoint Response:', data);
    } catch (error) {
      addTestResult('Session Status', 'error', null, error instanceof Error ? error.message : 'Unknown error');
      console.error('💥 Session Endpoint Error:', error);
    }
  }, []);

  // Test server-side authentication
  const testServerAuth = async () => {
    addTestResult('Server Auth', 'pending');
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      addTestResult('Server Auth', response.ok ? 'success' : 'error', data);
    } catch (error) {
      addTestResult('Server Auth', 'error', null, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Test user data refresh
  const testUserDataRefresh = async () => {
    addTestResult('User Data Refresh', 'pending');
    try {
      await refreshUserData();
      addTestResult('User Data Refresh', 'success', { refreshed: true });
    } catch (error) {
      addTestResult('User Data Refresh', 'error', null, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Test role validation
  const testRoleValidation = () => {
    if (!userProfile || !routeProtection?.requiredRoles) return null;
    
    const userRole = userProfile.role;
    const requiredRoles = routeProtection.requiredRoles;
    
    const result = {
      userRole,
      requiredRoles,
      passes: requiredRoles.includes(userRole),
      exactMatch: requiredRoles.find(role => role === userRole)
    };
    
    addTestResult('Role Validation', result.passes ? 'success' : 'error', result);
    return result;
  };

  // Auto-test session on component mount
  useEffect(() => {
    if (userProfile?.role === 'admin') {
      testSessionEndpoint();
    }
  }, [testSessionEndpoint, userProfile?.role]);

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCollapsed) return;
    
    setIsDragging(true);
    const rect = debugRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // ADMIN-ONLY ACCESS CHECK - All hooks must be called before this early return
  if (!hasActiveSession || !userProfile || userProfile.role !== 'admin') {
    return null;
  }

  // Collapsed button
  if (isCollapsed) {
    return (
      <div
        ref={debugRef}
        className="fixed z-90 w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg cursor-pointer flex items-center justify-center hover:scale-110 transition-all duration-200"
        style={{ left: position.x, top: position.y }}
        onClick={() => setIsCollapsed(false)}
        onMouseDown={handleMouseDown}
      >
        <span className="text-white font-bold text-sm">🐛</span>
      </div>
    );
  }

  // Expanded panel
  return (
    <div
      ref={debugRef}
      className="fixed z-90 bg-white border border-gray-300 rounded-lg shadow-2xl overflow-hidden"
      style={{ 
        left: position.x, 
        top: position.y,
        width: '400px',
        maxHeight: '500px'
      }}
    >
      {/* Header */}
      <div 
        ref={dragRef}
        className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🐛</span>
          <h3 className="font-bold text-sm">Admin Debug Panel</h3>
        </div>
        <button 
          onClick={() => setIsCollapsed(true)}
          className="text-white hover:text-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'context' as const, label: '📋 Context', icon: '📋' },
          { id: 'tests' as const, label: '🧪 Tests', icon: '🧪' },
          { id: 'api' as const, label: '🔗 API', icon: '🔗' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 text-xs font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            {tab.icon} {tab.label.split(' ')[1]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 max-h-80 overflow-y-auto text-xs">
        {activeTab === 'context' && (
          <div className="space-y-3">
            <div>
              <strong className="text-gray-700">📍 Current Path:</strong>
              <div className="bg-gray-100 p-2 rounded mt-1 font-mono text-xs">{pathname}</div>
            </div>
            
            <div>
              <strong className="text-gray-700">👤 User State:</strong>
              <div className="bg-gray-100 p-2 rounded mt-1">{userState}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <strong className="text-gray-700">🔑 Session:</strong>
                <div className={`p-2 rounded mt-1 ${hasActiveSession ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {hasActiveSession ? '✅ Active' : '❌ Inactive'}
                </div>
              </div>
              <div>
                <strong className="text-gray-700">⏳ Loading:</strong>
                <div className={`p-2 rounded mt-1 ${isLoading ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {isLoading ? '⏳ Yes' : '✅ No'}
                </div>
              </div>
            </div>
            
            <div>
              <strong className="text-gray-700">👨‍💼 User Profile:</strong>
              <div className="bg-gray-100 p-2 rounded mt-1 font-mono text-xs max-h-32 overflow-y-auto">
                {userProfile ? (
                  <pre>{JSON.stringify({
                    fullName: userProfile.fullName,
                    email: userProfile.email,
                    role: userProfile.role,
                    isVerified: userProfile.isVerified,
                    school: userProfile.school
                  }, null, 2)}</pre>
                ) : 'None'}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={testRoleValidation}
                className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
              >
                🎭 Role Test
              </button>
              <button
                onClick={testUserDataRefresh}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                🔄 Refresh Test
              </button>
              <button
                onClick={() => {
                  console.log('Current User Context:', {
                    userProfile, hasActiveSession, isLoading, userState
                  });
                  addTestResult('Console Log', 'success', { logged: true });
                }}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                📋 Log Context
              </button>
            </div>
            
            <div>
              <strong className="text-gray-700">📊 Test Results:</strong>
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {testResults.length === 0 ? (
                  <div className="text-gray-500 text-center py-4">No tests run yet</div>
                ) : (
                  testResults.map((result, index) => (
                    <div key={index} className={`p-2 rounded text-xs ${
                      result.status === 'success' ? 'bg-green-100 text-green-800' :
                      result.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{result.test}</span>
                        <span className="text-xs opacity-75">{result.timestamp}</span>
                      </div>
                      {result.error && (
                        <div className="mt-1 text-xs opacity-75">Error: {result.error}</div>
                      )}
                      {result.data && (
                        <div className="mt-1 font-mono text-xs bg-white bg-opacity-50 p-1 rounded">
                          {JSON.stringify(result.data, null, 1)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={testSessionEndpoint}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                🔗 Test Session
              </button>
              <button
                onClick={testServerAuth}
                className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
              >
                🛡️ Test Auth
              </button>
            </div>
            
            <div>
              <strong className="text-gray-700">🔐 Route Protection:</strong>
              <div className="bg-gray-100 p-2 rounded mt-1 font-mono text-xs max-h-32 overflow-y-auto">
                {routeProtection ? JSON.stringify(routeProtection, null, 2) : 'None'}
              </div>
            </div>

            <div>
              <strong className="text-gray-700">🌐 Client-Server Communication:</strong>
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="font-medium text-blue-800">Client State</div>
                    <div className="text-blue-600">
                      Session: {hasActiveSession ? '✅' : '❌'}<br/>
                      Loading: {isLoading ? '⏳' : '✅'}<br/>
                      State: {userState}
                    </div>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <div className="font-medium text-green-800">Server Sync</div>
                    <div className="text-green-600">
                      Profile: {userProfile ? '✅' : '❌'}<br/>
                      Role: {userProfile?.role || 'None'}<br/>
                      Verified: {userProfile?.isVerified ? '✅' : '❌'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugUserContext;