// /app/admin/schools/page.tsx
import UniversityList from '@/components/schools/uniList';
import universitiesData from '@/assets/data/schoolData';

export default function UniversityUploadPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">University Data Manager</h1>
          <p className="text-gray-600">
            Review and complete university information before uploading to the database
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Tip:</span> Required fields are marked with a red border. 
              Add faculties and departments as needed. Save each university individually when complete.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-900">Total Universities</div>
              <div className="text-2xl font-bold text-blue-600">{universitiesData.universities.length}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-900">Features</div>
              <div className="text-xs text-gray-600 mt-1">
                Dynamic editing, ID generation, search & pagination
              </div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-900">Status</div>
              <div className="text-green-600 font-medium">Ready for Upload</div>
            </div>
          </div>
        </header>

        <UniversityList universities={universitiesData.universities} />
      </div>
    </div>
  );
}