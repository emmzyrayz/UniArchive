export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-accent flex items-center justify-center p-4">
      <div className="w-full max-w-lg">{children}</div>
    </main>
  );
}
