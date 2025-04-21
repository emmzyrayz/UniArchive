// assets/data/userData.ts
import { User, UserRole } from './blogData';

// User preferences interface
export interface UserPreferences {
  userId: number;
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  privacySettings: {
    profileVisibility: 'public' | 'connections' | 'private';
    showOnlineStatus: boolean;
    showLastActive: boolean;
  };
  contentPreferences: {
    preferredTags: string[];
    contentLanguages: string[];
    contentFilters: string[];
  };
}

// User activity interface
export interface UserActivity {
  userId: number;
  lastLogin: string;
  sessionCount: number;
  totalTimeSpent: number; // in minutes
  recentSearches: string[];
  recentlyViewedBlogs: number[]; // Blog IDs
  recentlyViewedProfiles: number[]; // User IDs
}

// User relationships interface
export interface UserRelationship {
  id: number;
  userId: number;
  relatedUserId: number;
  relationship: 'following' | 'follower' | 'connection' | 'blocked';
  date: string;
}

// User preferences data
export const USER_PREFERENCES: UserPreferences[] = [
  {
    userId: 1,
    theme: 'system',
    notificationsEnabled: true,
    emailNotifications: true,
    privacySettings: {
      profileVisibility: 'public',
      showOnlineStatus: true,
      showLastActive: true,
    },
    contentPreferences: {
      preferredTags: ['Web Development', 'React', 'Next.js'],
      contentLanguages: ['en'],
      contentFilters: ['hide-sensitive-content'],
    },
  },
  {
    userId: 2,
    theme: 'dark',
    notificationsEnabled: true,
    emailNotifications: false,
    privacySettings: {
      profileVisibility: 'connections',
      showOnlineStatus: true,
      showLastActive: false,
    },
    contentPreferences: {
      preferredTags: ['Technology', 'AI', 'Web Development'],
      contentLanguages: ['en', 'zh'],
      contentFilters: [],
    },
  },
  {
    userId: 3,
    theme: 'light',
    notificationsEnabled: true,
    emailNotifications: true,
    privacySettings: {
      profileVisibility: 'public',
      showOnlineStatus: true,
      showLastActive: true,
    },
    contentPreferences: {
      preferredTags: ['TypeScript', 'Programming', 'Web Development'],
      contentLanguages: ['en'],
      contentFilters: [],
    },
  },
  {
    userId: 4,
    theme: 'dark',
    notificationsEnabled: true,
    emailNotifications: true,
    privacySettings: {
      profileVisibility: 'public',
      showOnlineStatus: false,
      showLastActive: true,
    },
    contentPreferences: {
      preferredTags: ['CSS', 'Design', 'Frontend'],
      contentLanguages: ['en', 'es'],
      contentFilters: [],
    },
  },
  {
    userId: 5,
    theme: 'system',
    notificationsEnabled: true,
    emailNotifications: true,
    privacySettings: {
      profileVisibility: 'public',
      showOnlineStatus: true,
      showLastActive: true,
    },
    contentPreferences: {
      preferredTags: ['Accessibility', 'Web Standards', 'Inclusion'],
      contentLanguages: ['en'],
      contentFilters: [],
    },
  },
  {
    userId: 6,
    theme: 'dark',
    notificationsEnabled: false,
    emailNotifications: false,
    privacySettings: {
      profileVisibility: 'connections',
      showOnlineStatus: false,
      showLastActive: false,
    },
    contentPreferences: {
      preferredTags: ['Architecture', 'Frontend', 'Programming'],
      contentLanguages: ['en'],
      contentFilters: ['hide-sensitive-content'],
    },
  }
];

// User activity data
export const USER_ACTIVITY: UserActivity[] = [
  {
    userId: 1,
    lastLogin: '2024-03-15T08:20:00Z',
    sessionCount: 48,
    totalTimeSpent: 1240,
    recentSearches: ['Next.js authentication', 'React server components', 'TypeScript generics'],
    recentlyViewedBlogs: [2, 3, 6],
    recentlyViewedProfiles: [3, 4, 5],
  },
  {
    userId: 2,
    lastLogin: '2024-03-14T14:45:00Z',
    sessionCount: 42,
    totalTimeSpent: 890,
    recentSearches: ['Edge computing trends', 'WebAssembly 2024', 'AI in web apps'],
    recentlyViewedBlogs: [1, 3, 5],
    recentlyViewedProfiles: [1, 3, 6],
  },
  {
    userId: 3,
    lastLogin: '2024-03-15T09:10:00Z',
    sessionCount: 56,
    totalTimeSpent: 1450,
    recentSearches: ['TypeScript best practices', 'Advanced type inference', 'React with TypeScript'],
    recentlyViewedBlogs: [1, 2, 4],
    recentlyViewedProfiles: [1, 2, 6],
  },
  {
    userId: 4,
    lastLogin: '2024-03-13T19:30:00Z',
    sessionCount: 34,
    totalTimeSpent: 720,
    recentSearches: ['Tailwind responsive design', 'CSS grid examples', 'Modern animations'],
    recentlyViewedBlogs: [1, 5, 6],
    recentlyViewedProfiles: [1, 3],
  },
  {
    userId: 5,
    lastLogin: '2024-03-15T11:40:00Z',
    sessionCount: 62,
    totalTimeSpent: 1680,
    recentSearches: ['WCAG 2.2 updates', 'Accessible forms', 'Keyboard navigation best practices'],
    recentlyViewedBlogs: [2, 3, 4],
    recentlyViewedProfiles: [1, 2, 3, 4],
  },
  {
    userId: 6,
    lastLogin: '2024-03-14T15:20:00Z',
    sessionCount: 38,
    totalTimeSpent: 930,
    recentSearches: ['Micro frontend architecture', 'State management patterns', 'Component design systems'],
    recentlyViewedBlogs: [1, 2, 5],
    recentlyViewedProfiles: [1, 2, 5],
  }
];

// User relationships data
export const USER_RELATIONSHIPS: UserRelationship[] = [
  {
    id: 1,
    userId: 1,
    relatedUserId: 2,
    relationship: 'connection',
    date: '2023-02-12T10:15:00Z',
  },
  {
    id: 2,
    userId: 1,
    relatedUserId: 3,
    relationship: 'connection',
    date: '2023-02-15T14:30:00Z',
  },
  {
    id: 3,
    userId: 1,
    relatedUserId: 5,
    relationship: 'following',
    date: '2023-03-05T09:45:00Z',
  },
  {
    id: 4,
    userId: 2,
    relatedUserId: 1,
    relationship: 'connection',
    date: '2023-02-12T10:15:00Z',
  },
  {
    id: 5,
    userId: 2,
    relatedUserId: 3,
    relationship: 'connection',
    date: '2023-01-20T16:50:00Z',
  },
  {
    id: 6,
    userId: 2,
    relatedUserId: 6,
    relationship: 'following',
    date: '2023-02-28T11:20:00Z',
  },
  {
    id: 7,
    userId: 3,
    relatedUserId: 1,
    relationship: 'connection',
    date: '2023-02-15T14:30:00Z',
  },
  {
    id: 8,
    userId: 3,
    relatedUserId: 2,
    relationship: 'connection',
    date: '2023-01-20T16:50:00Z',
  },
  {
    id: 9,
    userId: 3,
    relatedUserId: 4,
    relationship: 'following',
    date: '2023-06-10T13:25:00Z',
  },
  {
    id: 10,
    userId: 4,
    relatedUserId: 3,
    relationship: 'follower',
    date: '2023-06-10T13:25:00Z',
  },
  {
    id: 11,
    userId: 4,
    relatedUserId: 5,
    relationship: 'following',
    date: '2023-05-18T09:30:00Z',
  },
  {
    id: 12,
    userId: 5,
    relatedUserId: 1,
    relationship: 'follower',
    date: '2023-03-05T09:45:00Z',
  },
  {
    id: 13,
    userId: 5,
    relatedUserId: 4,
    relationship: 'follower',
    date: '2023-05-18T09:30:00Z',
  },
  {
    id: 14,
    userId: 5,
    relatedUserId: 6,
    relationship: 'connection',
    date: '2023-01-05T14:10:00Z',
  },
  {
    id: 15,
    userId: 6,
    relatedUserId: 2,
    relationship: 'follower',
    date: '2023-02-28T11:20:00Z',
  },
  {
    id: 16,
    userId: 6,
    relatedUserId: 5,
    relationship: 'connection',
    date: '2023-01-05T14:10:00Z',
  }
];

// Helper functions for user data
export const getUserPreferences = (userId: number): UserPreferences | undefined => {
  return USER_PREFERENCES.find(prefs => prefs.userId === userId);
};

export const getUserActivity = (userId: number): UserActivity | undefined => {
  return USER_ACTIVITY.find(activity => activity.userId === userId);
};

export const getUserRelationships = (userId: number): UserRelationship[] => {
  return USER_RELATIONSHIPS.filter(relationship => relationship.userId === userId);
};

export const getUserConnections = (userId: number): number[] => {
  return USER_RELATIONSHIPS
    .filter(relationship => relationship.userId === userId && relationship.relationship === 'connection')
    .map(relationship => relationship.relatedUserId);
};

export const getUserFollowers = (userId: number): number[] => {
  return USER_RELATIONSHIPS
    .filter(relationship => relationship.relatedUserId === userId && relationship.relationship === 'follower')
    .map(relationship => relationship.userId);
};

export const getUserFollowing = (userId: number): number[] => {
  return USER_RELATIONSHIPS
    .filter(relationship => relationship.userId === userId && relationship.relationship === 'following')
    .map(relationship => relationship.relatedUserId);
};

export const isUserConnected = (userId: number, targetUserId: number): boolean => {
  return USER_RELATIONSHIPS.some(
    relationship => relationship.userId === userId && 
    relationship.relatedUserId === targetUserId && 
    relationship.relationship === 'connection'
  );
};