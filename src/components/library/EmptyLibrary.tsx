// components/library/EmptyLibrary.tsx
import { Button } from "@/components/UI/Buttons";

export function EmptyLibrary() {
  return (
    <div className="rounded-xl border border-dashed border-border-strong bg-surface p-12 text-center">
      <div className="text-4xl mb-3">📚</div>
      <h3 className="font-semibold text-text-primary">Your library is empty</h3>
      <p className="text-sm text-text-secondary mt-1 mb-5">
        Upload your first PDF to get started.
      </p>
      <Button href="/upload">Upload a document</Button>
    </div>
  );
}
