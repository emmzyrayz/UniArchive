// src/components/clientWrapper.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  startTransition,
} from "react";
import { usePathname } from "next/navigation";
import Loading from "@/components/reuse/loading";

const LoadingContext = createContext<{
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}>({
  isLoading: false,
  setIsLoading: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    startTransition(() => setIsLoading(true));

    timerRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {isLoading && <Loading />}
      <div className={isLoading ? "hidden" : "block"}>{children}</div>
    </LoadingContext.Provider>
  );
}
