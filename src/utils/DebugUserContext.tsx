// components/DebugUserContext.tsx - Debug component to inspect user context
"use client";

import React, { useEffect } from 'react';
import { useUser } from '@/context/userContext';
import { getRouteProtection } from '@/config/routeProtection';
import { usePathname } from 'next/navigation';

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

  // Test session endpoint
  const testSessionEndpoint = async () => {
    try {
      const response = await fetch('/api/user/online-status', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      console.log('🔗 Session Endpoint Response:', data);
    } catch (error) {
      console.error('💥 Session Endpoint Error:', error);
    }
  };

  // Auto-test session on component mount
  useEffect(() => {
    testSessionEndpoint();
  }, []);

  // Role validation test
  const testRoleValidation = () => {
    if (!userProfile || !routeProtection?.requiredRoles) return null;
    
    const userRole = userProfile.role;
    const requiredRoles = routeProtection.requiredRoles;
    
    console.log('🎭 Role Validation Test:');
    console.log('User Role:', userRole, typeof userRole);
    console.log('Required Roles:', requiredRoles, requiredRoles.map(r => typeof r));
    console.log('Includes Test:', requiredRoles.includes(userRole));
    console.log('Find Test:', requiredRoles.find(role => role === userRole));
    
    return {
      userRole,
      requiredRoles,
      passes: requiredRoles.includes(userRole),
      exactMatch: requiredRoles.find(role => role === userRole)
    };
  };

  const roleTest = testRoleValidation();

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-sm z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg">🐛 Debug Panel</h3>
        <button 
          onClick={() => document.getElementById('debug-panel')?.remove()}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        <div>
          <strong>📍 Current Path:</strong>
          <div className="text-xs bg-gray-100 p-1 rounded">{pathname}</div>
        </div>
        
        <div>
          <strong>🔐 Route Protection:</strong>
          <div className="text-xs bg-gray-100 p-1 rounded">
            {routeProtection ? JSON.stringify(routeProtection, null, 2) : 'None'}
          </div>
        </div>
        
        <div>
          <strong>👤 User State:</strong>
          <div className="text-xs bg-gray-100 p-1 rounded">{userState}</div>
        </div>
        
        <div>
          <strong>🔑 Has Active Session:</strong>
          <div className="text-xs bg-gray-100 p-1 rounded">{hasActiveSession ? '✅ Yes' : '❌ No'}</div>
        </div>
        
        <div>
          <strong>⏳ Is Loading:</strong>
          <div className="text-xs bg-gray-100 p-1 rounded">{isLoading ? '⏳ Yes' : '✅ No'}</div>
        </div>
        
        <div>
          <strong>👨‍💼 User Profile:</strong>
          <div className="text-xs bg-gray-100 p-1 rounded max-h-24 overflow-y-auto">
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
        
        {roleTest && (
          <div>
            <strong>🎭 Role Test:</strong>
            <div className="text-xs bg-gray-100 p-1 rounded">
              <div>User Role: {roleTest.userRole} ({typeof roleTest.userRole})</div>
              <div>Required: {roleTest.requiredRoles.join(', ')}</div>
              <div>Passes: {roleTest.passes ? '✅' : '❌'}</div>
              <div>Exact Match: {roleTest.exactMatch || 'None'}</div>
            </div>
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          <button
            onClick={refreshUserData}
            className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
          >
            🔄 Refresh
          </button>
          <button
            onClick={testSessionEndpoint}
            className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
          >
            🔗 Test API
          </button>
          <button
            onClick={() => console.log('Current User Context:', {
              userProfile, hasActiveSession, isLoading, userState
            })}
            className="px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
          >
            📋 Log Context
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebugUserContext;