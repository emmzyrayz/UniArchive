// app/materials/[id]/layout.tsx
// The page sets its own metadata (server-rendered; see page.tsx).
export default function MaterialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
