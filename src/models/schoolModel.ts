// /models/schoolModel.ts
import mongoose, { Schema, Document } from 'mongoose';

type Ownership = "public" | "private";

interface IDepartment extends Document {
  id: string;
  name: string;
}

interface IFaculty extends Document {
  id: string;
  name: string;
  departments: IDepartment[];
}

interface ISchool extends Document {
  id: string;
  name: string;
  description: string;
  location: string;
  website: string;
  logoUrl: string;
  foundingYear?: number;
  faculties: IFaculty[];
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive' | 'pending';
  createdBy?: string; // Admin user ID who created this entry
  // New fields
  membership: Ownership;
  level?: "federal" | "state";
  usid: string; // Unique School ID
  psid: string; // Platform School ID (human-readable)
}

const DepartmentSchema = new Schema<IDepartment>({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
});

const FacultySchema = new Schema<IFaculty>({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  departments: [DepartmentSchema],
});

const SchoolSchema = new Schema<ISchool>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  website: {
    type: String,
    required: true,
    trim: true,
  },
  logoUrl: {
    type: String,
    required: true,
    trim: true,
  },
  foundingYear: {
    type: Number,
    min: 1800,
    max: new Date().getFullYear(),
  },
  faculties: [FacultySchema],
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active',
  },
  createdBy: {
    type: String,
    trim: true,
  },
  // New fields
  membership: {
    type: String,
    enum: ['public', 'private'],
    required: true,
    index: true,
  },
  level: {
    type: String,
    enum: ['federal', 'state'],
    required: false,
    index: true,
  },
  usid: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  psid: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
}, {
  timestamps: true,
  collection: 'schools', // Explicitly set collection name
});

// Create indexes for better query performance
SchoolSchema.index({ name: 'text', location: 'text', description: 'text' });
SchoolSchema.index({ 'faculties.name': 1 });
SchoolSchema.index({ 'faculties.departments.name': 1 });
SchoolSchema.index({ membership: 1, level: 1 }); // Compound index for filtering
SchoolSchema.index({ membership: 1, status: 1 });
SchoolSchema.index({ level: 1, status: 1 });


// Define query interface for type safety
interface SchoolQuery {
  membership: Ownership;
  status: 'active' | 'inactive' | 'pending';
  level?: "federal" | "state";
}
// Static methods
SchoolSchema.statics.findByLocation = function(location: string) {
  return this.find({ 
    location: { $regex: location, $options: 'i' },
    status: 'active'
  });
};

SchoolSchema.statics.findByName = function(name: string) {
  return this.findOne({ 
    name: { $regex: name, $options: 'i' },
    status: 'active'
  });
};

SchoolSchema.statics.findByOwnership = function(ownership: Ownership) {
  return this.find({
    membership: ownership,
    status: 'active'
  });
};

SchoolSchema.statics.findByLevel = function(level: "federal" | "state") {
  return this.find({
    level: level,
    status: 'active'
  });
};

SchoolSchema.statics.findByOwnershipAndLevel = function(ownership: Ownership, level?: "federal" | "state") {
  const query: SchoolQuery = {
    membership: ownership,
    status: 'active'
  };
  
  if (level) {
    query.level = level;
  }
  
  return this.find(query);
};

SchoolSchema.statics.searchSchools = function(query: string) {
  return this.find({
    $and: [
      { status: 'active' },
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { location: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { 'faculties.name': { $regex: query, $options: 'i' } },
          { 'faculties.departments.name': { $regex: query, $options: 'i' } }
        ]
      }
    ]
  });
};

SchoolSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalSchools: { $sum: 1 },
        publicSchools: {
          $sum: { $cond: [{ $eq: ['$membership', 'public'] }, 1, 0] }
        },
        privateSchools: {
          $sum: { $cond: [{ $eq: ['$membership', 'private'] }, 1, 0] }
        },
        federalSchools: {
          $sum: { $cond: [{ $eq: ['$level', 'federal'] }, 1, 0] }
        },
        stateSchools: {
          $sum: { $cond: [{ $eq: ['$level', 'state'] }, 1, 0] }
        },
        activeSchools: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Use the uniplatform database connection
const School = mongoose.models.School || mongoose.model<ISchool>('School', SchoolSchema);

export default School;
export type { ISchool, IFaculty, IDepartment, Ownership };