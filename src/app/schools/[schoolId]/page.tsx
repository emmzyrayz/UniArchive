'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { School, SchoolEvent, mockSchools } from '@/assets/data/school';
import { 
  FaPhone, 
  FaEnvelope, 
  FaMapMarkerAlt, 
  FaRegBookmark,
  FaGlobe,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaHistory,
  FaUniversity,
  FaNewspaper,
  FaChevronRight
} from 'react-icons/fa';

export default function SchoolInfoPage() {
  const { schoolId } = useParams();
 const [school, setSchool] = useState<School | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeBlogIndex, setActiveBlogIndex] = useState(0);


  useEffect(() => {
  const foundSchool = mockSchools.find(school => school.id === schoolId);
  setSchool(foundSchool || null);

  const imageInterval = setInterval(() => {
    setActiveImageIndex(prev => (prev + 1) % (foundSchool?.images.length || 1));
  }, 5000);

  const blogInterval = setInterval(() => {
    setActiveBlogIndex(prev => (prev + 1) % (foundSchool?.blogPosts?.length || 1));
  }, 8000);

  return () => {
    clearInterval(imageInterval);
    clearInterval(blogInterval);
  };
}, [schoolId]);

useEffect(() => {
  if (school?.blogPosts && school.blogPosts.length > 1) {
    const blogInterval = setInterval(() => {
      setActiveBlogIndex(prev => (prev + 1) % school.blogPosts!.length);
    }, 8000);
    return () => clearInterval(blogInterval);
  }
}, [school?.blogPosts]);

  if (!school) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );

  const defaultNews = school.blogPosts?.length ? school.blogPosts : [
    {
      title: "University Achieves Breakthrough in Research",
      date: "May 10, 2025",
      category: "Campus News",
      excerpt: `${school.name} researchers have made a significant breakthrough in their field, opening new possibilities for innovation and advancement.`,
      image: "/api/placeholder/800/500"
    },
    {
      title: "New Student Orientation Schedule",
      date: "May 5, 2025",
      category: "Events",
      excerpt: "Information about the upcoming orientation for new students joining in the fall semester."
    },
    {
      title: "Faculty Wins Prestigious Award",
      date: "April 28, 2025",
      category: "Achievements",
      excerpt: "Professor Johnson receives international recognition for outstanding research contribution."
    },
    {
      title: "Campus Renovation Project",
      date: "April 15, 2025",
      category: "Campus Development",
      excerpt: "Updates on the ongoing campus improvement project scheduled for completion this summer."
    }
  ];

  // Default events if none provided
  const defaultEvents: SchoolEvent[] = school.blogPosts?.map(post => ({
  title: post.title,
  description: post.excerpt,
  date: post.date
})) ||  [
    {
      title: "Annual Sports Day",
      description: "Join us for our annual sports competition.",
      date: "12/04/1998",
      location: "Sports Complex"
    },
    {
      title: "Guest Lecture Series",
      description: "Distinguished speakers share industry insights.",
       date: "12/04/1998",
      location: "Auditorium"
    },
    {
      title: "Alumni Networking Event",
      description: "Connect with graduates and build professional networks.",
       date: "12/04/1998",
      location: "Grand Hall"
    }
  ];


  return (
    <div className="flex flex-col min-h-screen bg-gray-50 p-4 rounded-[12px]">
      {/* Gallery Section with Framer Motion */}
      <section className="relative h-96 md:h-[500px] lg:h-[600px] w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeImageIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <Image
              src={school.images[activeImageIndex]}
              alt={`School gallery ${activeImageIndex + 1}`}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute bottom-4 right-4 bg-black/60 p-3 text-white rounded-lg max-w-xl">
              <p className="text-sm md:text-base">
                {school.imageDescriptions?.[activeImageIndex] || school.description} 
                <span className="ml-2 text-gray-300">({activeImageIndex + 1}/{school.images.length})</span>
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Profile Photo */}
        <motion.div 
          className="absolute bottom-8 left-8 w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-white"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 120 }}
        >
          <Image
            src={school.mainImage || school.images[0]}
            alt={`${school.name} profile`}
            fill
            className="object-cover"
          />
        </motion.div>
      </section>

{/* 2. Shortcuts Section with React Icons */}

     {/* 2. Shortcuts Section with React Icons */}
      <section className="bg-white py-6 px-4 shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-3 md:gap-6">
          <motion.div 
            className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaPhone className="w-5 h-5 text-blue-600" />
            <span className="text-sm md:text-base">{school.phone || 'N/A'}</span>
          </motion.div>
          <motion.div 
            className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaEnvelope className="w-5 h-5 text-blue-600" />
            <span className="text-sm md:text-base">{school.email || 'N/A'}</span>
          </motion.div>
          <motion.div 
            className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaMapMarkerAlt className="w-5 h-5 text-blue-600" />
            <span className="text-sm md:text-base">{school.address || school.location}</span>
          </motion.div>
          <motion.div 
            className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaRegBookmark className="w-5 h-5 text-blue-600" />
            <span className="text-sm md:text-base">Save School</span>
          </motion.div>
          <motion.div 
            className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaUniversity className="w-5 h-5 text-blue-600" />
            <span className="text-sm md:text-base">Accreditation: {school.accreditation || 'Regionally Accredited'}</span>
          </motion.div>
        </div>
      </section>

      {/* 3. School Introduction */}
      <section className="py-12 px-4 bg-gradient-to-br from-blue-50 to-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-2 text-blue-900">{school.name}</h1>
            <p className="text-center text-gray-600 mb-8">Established {school.founded}</p>
            
            <div className="prose prose-lg max-w-none text-gray-700">
              <p className="leading-relaxed mb-4">
                {`Welcome to ${school.name}, where academic excellence meets innovation. 
                Located in the heart of ${school.location}, our institution is dedicated to providing 
                quality education that prepares students for the challenges of tomorrow's world.`}
              </p>
              <p className="leading-relaxed mb-4">
                With a commitment to holistic development, we emphasize not only academic growth but also 
                character building, leadership skills, and community service. Our diverse and inclusive 
                community fosters a learning environment where every student is valued and encouraged to reach their full potential.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-blue-800 mb-2">Vision</h3>
                  <p className="text-gray-600">{school.vision || "To be a global leader in education, fostering innovation and excellence."}</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-blue-800 mb-2">Mission</h3>
                  <p className="text-gray-600">{school.mission || "To empower students with knowledge, skills, and values to thrive in a rapidly changing world."}</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-blue-800 mb-2">Core Values</h3>
                  <p className="text-gray-600">{school.coreValues || "Excellence, Integrity, Innovation, Inclusivity, and Service"}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 4. School History */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-center mb-8">
              <FaHistory className="text-blue-600 mr-3 w-6 h-6" />
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Our History</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-800 font-bold">
                    {school.founded}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Foundation</h3>
                  <p className="text-gray-700">
                   {school.history?.find(h => h.type === 'foundation')?.event || `${school.name} was founded with a vision to provide quality education to all. 
                    Starting with just a handful of students and dedicated educators, the school began its journey toward excellence.`}
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-800 font-bold">
                    {Number(school.founded) + 25}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Growth & Expansion</h3>
                  <p className="text-gray-700">
                    {school.history?.find(h => h.type === 'expansion')?.event || `The school expanded its campus and curriculum, introducing new programs and facilities. 
                    This period marked significant growth in student enrollment and academic achievement.`}
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-800 font-bold">
                    {Number(school.founded) + 50}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Modern Era</h3>
                  <p className="text-gray-700">
                    {school.history?.find(h => h.type === 'modernEra')?.event || `Today, ${school.name} stands as a beacon of educational excellence, 
                    embracing technology and innovation while staying true to its founding principles. 
                    The school continues to evolve, adapting to the changing educational landscape while maintaining its core values.`}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-10 bg-blue-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-blue-800">Key Achievements</h3>
              <ul className="space-y-2">
                {school.achievements?.map((achievement, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-200 text-blue-800 mr-3 flex-shrink-0">✓</span>
                    <span className="text-gray-700">{achievement}</span>
                  </li>
                )) || (
                  <>
                    <li className="flex items-start">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-200 text-blue-800 mr-3 flex-shrink-0">✓</span>
                      <span className="text-gray-700">Recognized as a Center of Excellence in Education</span>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-200 text-blue-800 mr-3 flex-shrink-0">✓</span>
                      <span className="text-gray-700">Awarded for outstanding contribution to research and innovation</span>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-200 text-blue-800 mr-3 flex-shrink-0">✓</span>
                      <span className="text-gray-700">Consistently ranked among top educational institutions</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5. Faculties Section */}
      <section className="py-12 px-4 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-center mb-10">
              <FaUniversity className="text-blue-600 mr-3 w-6 h-6" />
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Our Faculties</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {school.faculties?.map((faculty, index) => (
                <motion.div
                  key={index}
                  className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
                  whileHover={{ y: -5 }}
                >
                  <div className="h-48 bg-blue-100 relative">
                    {faculty.image ? (
                      <Image 
                        src={faculty.image} 
                        alt={faculty.name} 
                        fill 
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <FaUniversity className="text-blue-300 w-16 h-16" />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-blue-900 mb-2">{faculty.name}</h3>
                    <p className="text-gray-600 mb-4">{faculty.description || `The Faculty of ${faculty.name} is dedicated to excellence in teaching, research, and service.`}</p>
                    
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Top Departments:</h4>
                      <ul className="space-y-1">
                        {faculty.departments?.slice(0, 3).map((department, idx) => (
                          <li key={idx} className="flex items-center text-gray-700">
                            <FaChevronRight className="text-blue-500 mr-2 w-3 h-3" />
                            {department}
                          </li>
                        )) || (
                          <>
                            <li className="flex items-center text-gray-700">
                              <FaChevronRight className="text-blue-500 mr-2 w-3 h-3" />
                              Department of Advanced Studies
                            </li>
                            <li className="flex items-center text-gray-700">
                              <FaChevronRight className="text-blue-500 mr-2 w-3 h-3" />
                              Department of Research
                            </li>
                            <li className="flex items-center text-gray-700">
                              <FaChevronRight className="text-blue-500 mr-2 w-3 h-3" />
                              Department of Professional Practice
                            </li>
                          </>
                        )}
                      </ul>
                    </div>
                    
                    <div className="mt-6">
                      <button className="text-blue-600 font-medium hover:text-blue-800 flex items-center">
                        View Faculty Details
                        <FaChevronRight className="ml-1 w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )) || (
                // Default faculties if none provided
                Array.from({ length: 3 }).map((_, index) => {
                  const defaultFaculties = [
                    { name: "Arts & Humanities", departments: ["Literature", "History", "Philosophy"] },
                    { name: "Science & Technology", departments: ["Computer Science", "Physics", "Mathematics"] },
                    { name: "Business Administration", departments: ["Marketing", "Finance", "Management"] }
                  ];
                  const faculty = defaultFaculties[index];
                  
                  return (
                    <motion.div
                      key={index}
                      className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
                      whileHover={{ y: -5 }}
                    >
                      <div className="h-48 bg-blue-100 relative flex items-center justify-center">
                        <FaUniversity className="text-blue-300 w-16 h-16" />
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-blue-900 mb-2">Faculty of {faculty.name}</h3>
                        <p className="text-gray-600 mb-4">The Faculty of {faculty.name} is dedicated to excellence in teaching, research, and service.</p>
                        
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-800 mb-2">Top Departments:</h4>
                          <ul className="space-y-1">
                            {faculty.departments.map((department, idx) => (
                              <li key={idx} className="flex items-center text-gray-700">
                                <FaChevronRight className="text-blue-500 mr-2 w-3 h-3" />
                                Department of {department}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="mt-6">
                          <button className="text-blue-600 font-medium hover:text-blue-800 flex items-center">
                            View Faculty Details
                            <FaChevronRight className="ml-1 w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 px-4 bg-white">
      <div className="max-w-6xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center justify-center mb-10">
            <FaNewspaper className="text-blue-600 mr-3 w-6 h-6" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">News & Updates</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Featured News */}
            <div className="lg:col-span-8">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Featured Story</h3>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeBlogIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-200"
                >
                  <div className="h-64 relative">
                    {defaultNews[activeBlogIndex]?.image ? (
                      <Image 
                        src={defaultNews[activeBlogIndex].image} 
                        alt={defaultNews[activeBlogIndex].title} 
                        fill 
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-blue-100 flex items-center justify-center">
                        <FaNewspaper className="text-blue-300 w-16 h-16" />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-3">
                      {defaultNews[activeBlogIndex]?.category || "Campus News"}
                    </span>
                    <h4 className="text-xl font-bold mb-2 text-gray-900">
                      {defaultNews[activeBlogIndex]?.title}
                    </h4>
                    <p className="text-gray-700 mb-4">
                      {defaultNews[activeBlogIndex]?.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">
                        {defaultNews[activeBlogIndex]?.date}
                      </span>
                      <motion.button 
                        className="text-blue-600 font-medium hover:text-blue-800 flex items-center"
                        whileHover={{ x: 5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        Read More
                        <FaChevronRight className="ml-1 w-3 h-3" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* News Selection Dots */}
              {defaultNews.length > 1 && (
                <div className="flex justify-center mt-4 space-x-2">
                  {defaultNews.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveBlogIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === activeBlogIndex ? "w-6 bg-blue-600" : "w-2 bg-gray-300"
                      }`}
                      aria-label={`View news item ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Latest Updates */}
            <div className="lg:col-span-4">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Latest Updates</h3>
              <div className="space-y-4">
                {defaultNews.slice(1, 4).map((item, index) => (
                  <motion.div 
                    key={index} 
                    className="bg-gray-50 rounded-lg p-4 hover:bg-blue-50 transition-colors cursor-pointer"
                    whileHover={{ x: 5 }}
                  >
                    <span className="text-sm text-gray-500">{item.date}</span>
                    <h4 className="font-medium text-gray-900 mb-1">{item.title}</h4>
                    <p className="text-gray-600 text-sm line-clamp-2">{item.excerpt}</p>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <motion.button 
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  View All News
                </motion.button>
              </div>
            </div>
          </div>
          
          {/* Events Calendar Preview */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold mb-6 text-gray-800">Upcoming Events</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {defaultEvents.map((event, index) => (
                <motion.div 
                  key={index} 
                  className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500"
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-start">
                    <div className="bg-blue-100 rounded p-2 text-center mr-4">
  <span className="block text-xl font-bold text-blue-800">
    {new Date(event.date).getDate()}
  </span>
  <span className="block text-xs text-blue-600">
    {new Date(event.date).toLocaleString('default', { month: 'short' })}
  </span>
</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{event.title}</h4>
                      <p className="text-gray-600 text-sm mt-1">{event.description}</p>
                      <div className="mt-2 flex items-center text-gray-500 text-xs">
                        <span>{event.time}</span>
                        <span className="mx-2">•</span>
                        <span>{event.location}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="mt-8 flex justify-center">
              <motion.button 
                className="flex items-center text-blue-600 font-medium hover:text-blue-800"
                whileHover={{ x: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                View Full Events Calendar
                <FaChevronRight className="ml-1 w-3 h-3" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>


      {/* Rest of the sections remain similar with added animations */}
      
      {/* Social Media Icons in Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-6 justify-center">
            {school.socialMedia?.website && (
              <a href={school.socialMedia.website} className="hover:text-blue-400">
                <FaGlobe className="w-6 h-6" />
              </a>
            )}
            {school.socialMedia?.facebook && (
              <a href={school.socialMedia.facebook} className="hover:text-blue-400">
                <FaFacebook className="w-6 h-6" />
              </a>
            )}
            {school.socialMedia?.twitter && (
              <a href={school.socialMedia.twitter} className="hover:text-blue-400">
                <FaTwitter className="w-6 h-6" />
              </a>
            )}
            {school.socialMedia?.instagram && (
              <a href={school.socialMedia.instagram} className="hover:text-blue-400">
                <FaInstagram className="w-6 h-6" />
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}