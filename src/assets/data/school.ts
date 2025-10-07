import { StaticImageData } from 'next/image';
// Replace these imports with your actual images
import Image1 from '@/assets/img/gallery/featured1.png';
import Image2 from '@/assets/img/gallery/featured2.png';
import Image3 from '@/assets/img/gallery/featured3.png';
import Image4 from '@/assets/img/gallery/featured4.png';
import Image5 from '@/assets/img/gallery/featured5.png';


export interface School {
  id: string;
  name: string;
  location: string;
  description: string;
  mainImage: string | StaticImageData;  // Changed from imageUrl
  images: (string | StaticImageData)[]; // New images array
  studentCount: number;
  rating: number;
  founded: number;
  isTopRated?: boolean;
  isTrending?: boolean;
  isFeatured?: boolean;
  bestEnvironment?: boolean;
  isAffordable?: boolean;
  lowCutOff?: boolean;
  tuitionFee?: number;
  livingIndex?: number;
  cutOffScore?: number;
  phone?: string;
  email?: string;
  address?: string;
  accreditation?: string;
  vision?: string;
  mission?: string;
  coreValues?: string;
  imageDescriptions?: string[];
  achievements?: string[];
  news?: NewsItem[]; 
  history?: {
    year: number;
    event: string;
    type?: string; // If you're using 'foundation', 'expansion', 'modernEra'
  }[];
  faculties?: {
    name: string;
    description?: string;
    departments: string[];
    image?: string | StaticImageData; // Make image optional
  }[];
  blogPosts?: {
    title: string;
    date: string;
    excerpt: string;
    image?: string | StaticImageData;
    location?: string;
    category?: string;
  }[];
  socialMedia?: {
    website?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
}

// Define types for our data
export interface NewsItem {
  title: string;
  date: string;
  category?: string;
  excerpt: string;
  image?: string | StaticImageData;
  content?: string;
}

export interface SchoolEvent {
  title: string;
  description: string;
  date: string;
  location?: string;
  time?: string;
}

export interface SchoolNewsProps {
  schoolName: string;
  news?: NewsItem[];
  events?: Event[];
}

export interface Faculty {
  name: string;
  description: string;
  departments: string[];
  image?: string | StaticImageData; // Add if needed
}


export const mockSchools: School[] = [
  {
    id: "1",
    name: "Oakridge Academy",
    location: "New York, NY",
    description: "A prestigious school known for its academic excellence and innovative teaching methods.",
    mainImage: Image1,
    images: [Image1, Image2, Image3],
    studentCount: 1200,
    rating: 4.8,
    founded: 1985,
    isTopRated: true,
    isFeatured: true,
    tuitionFee: 25000,
    livingIndex: 85,
    cutOffScore: 75,
    phone: "+1 (212) 555-1234",
    email: "admissions@oakridge.edu",
    address: "123 Academic Way, New York, NY 10001",
    history: [
      { year: 1985, event: "Founded as a small liberal arts academy" },
      { year: 1995, event: "Expanded to include STEM programs" },
      { year: 2010, event: "Awarded National Blue Ribbon School status" }
    ],
    faculties: [
      {
        name: "Faculty of Sciences",
        description: "Leading research in biological and physical sciences",
        departments: ["Biology", "Chemistry", "Physics"],
      },
      {
        name: "Faculty of Arts",
        description: "Nurturing creative talent across disciplines",
        departments: ["Fine Arts", "Performing Arts", "Digital Media"]
      }
    ],
    blogPosts: [
      {
        title: "New Campus Expansion",
        date: "2024-03-15",
        excerpt: "Announcing our new state-of-the-art research facility",
        image: Image4
      },
      {
        title: "Annual Science Fair Winners",
        date: "2024-02-28",
        excerpt: "Students showcase innovative projects in regional competition",
        image: Image5
      }
    ],
    socialMedia: {
      website: "https://oakridge.edu",
      facebook: "https://facebook.com/oakridge",
      twitter: "https://twitter.com/oakridge",
      instagram: "https://instagram.com/oakridge"
    },
    accreditation: "State Accredited",
    vision: "To be a global leader in innovative education",
    mission: "Empowering students through transformative learning experiences",
    coreValues: "Integrity, Excellence, Innovation, Community",
    imageDescriptions: [
      "Main campus building",
      "Student research lab",
      "Sports facilities"
    ],
    achievements: [
      "Ranked #1 in STEM Education",
      "National Science Fair Champions 2023",
      "Best Campus Sustainability Award 2024"
    ],
    // Add if using separate news property
    news: [
      {
        title: "New Scholarship Program",
        date: "2024-05-01",
        excerpt: "Announcing full-ride scholarships for STEM students",
        image: Image4
      }
    ]
  },
  {
    id: "2",
    name: "Westview High",
    location: "Los Angeles, CA",
    description: "Offering diverse programs with focus on arts and sciences.",
    mainImage: Image2,
    images: [Image2, Image1, Image3],
    studentCount: 2000,
    rating: 4.5,
    founded: 1972,
    isTrending: true,
    bestEnvironment: true,
    tuitionFee: 18000,
    livingIndex: 92,
    cutOffScore: 68,
    phone: "+1 (310) 555-5678",
    email: "info@westviewhigh.edu",
    address: "456 Creative Blvd, Los Angeles, CA 90001",
    history: [
      { year: 1972, event: "Established as community arts school" },
      { year: 1985, event: "Added performing arts center" },
      { year: 2020, event: "Ranked top arts school in California" }
    ],
    faculties: [
      {
        name: "Performing Arts",
        description: "World-class training in music and theater",
        departments: ["Music", "Drama", "Dance"]
      }
    ],
    socialMedia: {
      website: "https://westviewhigh.edu",
      instagram: "https://instagram.com/westviewhigh"
    },
    accreditation: "State Accredited",
    vision: "To be a global leader in innovative education",
    mission: "Empowering students through transformative learning experiences",
    coreValues: "Integrity, Excellence, Innovation, Community",
    imageDescriptions: [
      "Main campus building",
      "Student research lab",
      "Sports facilities"
    ],
    achievements: [
      "Ranked #1 in STEM Education",
      "National Science Fair Champions 2023",
      "Best Campus Sustainability Award 2024"
    ],
    // Add if using separate news property
    news: [
      {
        title: "New Scholarship Program",
        date: "2024-05-01",
        excerpt: "Announcing full-ride scholarships for STEM students",
        image: Image4
      }
    ]    
  },
   {
    id: "3",
    name: "Lincoln Memorial School",
    location: "Chicago, IL",
    description: "Historic institution with strong community ties and traditional values.",
    mainImage: Image3,
    images: [Image3, Image1, Image2],
    studentCount: 1500,
    rating: 4.7,
    founded: 1950,
    isTopRated: true,
    isTrending: true,
    tuitionFee: 22000,
    livingIndex: 78,
    cutOffScore: 72,
    phone: "+1 (310) 555-5678",
    email: "info@westviewhigh.edu",
    address: "456 Creative Blvd, Los Angeles, CA 90001",
    history: [
      { year: 1972, event: "Established as community arts school" },
      { year: 1985, event: "Added performing arts center" },
      { year: 2020, event: "Ranked top arts school in California" }
    ],
    faculties: [
      {
        name: "Performing Arts",
        description: "World-class training in music and theater",
        departments: ["Music", "Drama", "Dance"]
      }
    ],
    socialMedia: {
      website: "https://westviewhigh.edu",
      instagram: "https://instagram.com/westviewhigh"
    },
    accreditation: "State Accredited",
    vision: "To be a global leader in innovative education",
    mission: "Empowering students through transformative learning experiences",
    coreValues: "Integrity, Excellence, Innovation, Community",
    imageDescriptions: [
      "Main campus building",
      "Student research lab",
      "Sports facilities"
    ],
    achievements: [
      "Ranked #1 in STEM Education",
      "National Science Fair Champions 2023",
      "Best Campus Sustainability Award 2024"
    ],
    // Add if using separate news property
    news: [
      {
        title: "New Scholarship Program",
        date: "2024-05-01",
        excerpt: "Announcing full-ride scholarships for STEM students",
        image: Image4
      }
    ]
  },
  {
    id: "4",
    name: "Tech Horizons Institute",
    location: "San Francisco, CA",
    description: "Specialized in STEM education with cutting-edge facilities.",
    mainImage: Image1,
    images: [Image1, Image3, Image2],
    studentCount: 850,
    rating: 4.9,
    founded: 2005,
    isTopRated: true,
    isFeatured: true,
    bestEnvironment: true,
    tuitionFee: 30000,
    livingIndex: 90,
    cutOffScore: 80,
    phone: "+1 (310) 555-5678",
    email: "info@westviewhigh.edu",
    address: "456 Creative Blvd, Los Angeles, CA 90001",
    history: [
      { year: 1972, event: "Established as community arts school" },
      { year: 1985, event: "Added performing arts center" },
      { year: 2020, event: "Ranked top arts school in California" }
    ],
    faculties: [
      {
        name: "Performing Arts",
        description: "World-class training in music and theater",
        departments: ["Music", "Drama", "Dance"]
      }
    ],
    socialMedia: {
      website: "https://westviewhigh.edu",
      instagram: "https://instagram.com/westviewhigh"
    },
    accreditation: "State Accredited",
    vision: "To be a global leader in innovative education",
    mission: "Empowering students through transformative learning experiences",
    coreValues: "Integrity, Excellence, Innovation, Community",
    imageDescriptions: [
      "Main campus building",
      "Student research lab",
      "Sports facilities"
    ],
    achievements: [
      "Ranked #1 in STEM Education",
      "National Science Fair Champions 2023",
      "Best Campus Sustainability Award 2024"
    ],
    // Add if using separate news property
    news: [
      {
        title: "New Scholarship Program",
        date: "2024-05-01",
        excerpt: "Announcing full-ride scholarships for STEM students",
        image: Image4
      }
    ]
  },
  {
    id: "5",
    name: "Greenfield Academy",
    location: "Austin, TX",
    description: "Eco-friendly campus with programs focused on sustainable development.",
    mainImage: Image2,
    images: [Image2, Image1],
    studentCount: 1100,
    rating: 4.6,
    founded: 1998,
    isAffordable: true,
    lowCutOff: true,
    tuitionFee: 12000,
    livingIndex: 82,
    cutOffScore: 60,
    phone: "+1 (310) 555-5678",
    email: "info@westviewhigh.edu",
    address: "456 Creative Blvd, Los Angeles, CA 90001",
    history: [
      { year: 1972, event: "Established as community arts school" },
      { year: 1985, event: "Added performing arts center" },
      { year: 2020, event: "Ranked top arts school in California" }
    ],
    faculties: [
      {
        name: "Performing Arts",
        description: "World-class training in music and theater",
        departments: ["Music", "Drama", "Dance"]
      }
    ],
    socialMedia: {
      website: "https://westviewhigh.edu",
      instagram: "https://instagram.com/westviewhigh"
    },
    accreditation: "State Accredited",
    vision: "To be a global leader in innovative education",
    mission: "Empowering students through transformative learning experiences",
    coreValues: "Integrity, Excellence, Innovation, Community",
    imageDescriptions: [
      "Main campus building",
      "Student research lab",
      "Sports facilities"
    ],
    achievements: [
      "Ranked #1 in STEM Education",
      "National Science Fair Champions 2023",
      "Best Campus Sustainability Award 2024"
    ],
    // Add if using separate news property
    news: [
      {
        title: "New Scholarship Program",
        date: "2024-05-01",
        excerpt: "Announcing full-ride scholarships for STEM students",
        image: Image4
      }
    ]
  },
  {
    id: "6",
    name: "Maritime College",
    location: "Seattle, WA",
    description: "Specialized in naval studies and marine sciences.",
    mainImage: Image3,
    images: [Image3, Image2, Image1],
    studentCount: 750,
    rating: 4.4,
    founded: 1963,
    isAffordable: true,
    lowCutOff: true,
    tuitionFee: 15000,
    livingIndex: 75,
    cutOffScore: 65,
    phone: "+1 (310) 555-5678",
    email: "info@westviewhigh.edu",
    address: "456 Creative Blvd, Los Angeles, CA 90001",
    history: [
      { year: 1972, event: "Established as community arts school" },
      { year: 1985, event: "Added performing arts center" },
      { year: 2020, event: "Ranked top arts school in California" }
    ],
    faculties: [
      {
        name: "Performing Arts",
        description: "World-class training in music and theater",
        departments: ["Music", "Drama", "Dance"]
      }
    ],
    socialMedia: {
      website: "https://westviewhigh.edu",
      instagram: "https://instagram.com/westviewhigh"
    },
    accreditation: "State Accredited",
    vision: "To be a global leader in innovative education",
    mission: "Empowering students through transformative learning experiences",
    coreValues: "Integrity, Excellence, Innovation, Community",
    imageDescriptions: [
      "Main campus building",
      "Student research lab",
      "Sports facilities"
    ],
    achievements: [
      "Ranked #1 in STEM Education",
      "National Science Fair Champions 2023",
      "Best Campus Sustainability Award 2024"
    ],
    // Add if using separate news property
    news: [
      {
        title: "New Scholarship Program",
        date: "2024-05-01",
        excerpt: "Announcing full-ride scholarships for STEM students",
        image: Image4
      }
    ]
  },
  // Add similar updates for other schools...
];