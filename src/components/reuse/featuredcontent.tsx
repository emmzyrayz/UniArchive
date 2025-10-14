import { Card } from "@/components/UI";

interface FeaturedSectionProps {
  title: string;
  items: Array<{ id: string; name: string; description?: string }>;
  onViewAll?: () => void;
}

export default function FeaturedSection({
  title,
  items,
  onViewAll,
}: FeaturedSectionProps) {
  return (
    <section className="py-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-blue-600 hover:underline font-medium"
          >
            View All
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <Card variant="elevated" className="text-center" key={item.id}>
          <div className="text-4xl font-bold text-indigo-600">{item.name}</div>
          <div className="text-sm text-gray-500 mt-1">{item.description}</div>
        </Card>
        ))}
      </div>
    </section>
  );
}
