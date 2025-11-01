// app/ClientWrapper.tsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Loading } from "@/components/reuse";
import LayoutManager from "@/components/layoutManager";

const LoadingContext = createContext<{
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}>({
  isLoading: true,
  setIsLoading: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {isLoading && (
        <Loading
          variant="pages"
          size="xl"
          message="Preparing course..."
          messageAnimVariant="waveFade"
          messageSize="xl"
          className="flex w-full h-full items-center justify-center"
          fullScreen
        />
      )}
      <div className={isLoading ? "hidden" : "block"}>
        <LayoutManager>{children}</LayoutManager>
      </div>
    </LoadingContext.Provider>
  );
}