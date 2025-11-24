// context/schoolContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface Department {
  id: string;
  name: string;
}

interface Faculty {
  id: string;
  name: string;
  departments: Department[];
}

export interface University {
  id: string;
  name: string;
  location: string;
  website: string;
  logoUrl: string;
  faculties: Faculty[];
}

interface SchoolContextType {
  universities: University[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextType | null>(null);

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchools = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/public/universities', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to fetch schools');
      
      const result = await response.json();
      setUniversities(result.universities || []);
    } catch (err) {
      console.error('Error fetching schools:', err);
      setError('Failed to load school data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  return (
    <SchoolContext.Provider 
      value={{ 
        universities, 
        isLoading, 
        error, 
        refresh: fetchSchools 
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
}