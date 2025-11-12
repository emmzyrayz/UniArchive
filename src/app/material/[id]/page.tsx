// app/materials/[id]/page.tsx
import MaterialDetailPage from '@/components/materialDetail';

export default function MaterialDetail({ params }: { params: { id: string } }) {
  return <MaterialDetailPage materialId={parseInt(params.id)} />;
}