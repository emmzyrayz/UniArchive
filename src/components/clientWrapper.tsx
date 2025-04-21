// app/ClientWrapper.tsx
'use client';

import {createContext, useContext, useState, useEffect} from "react";
import {usePathname} from "next/navigation";
import {Loading} from "@/components/UI/loading";

const LoadingContext = createContext({
  isLoading: true,
  setIsLoading: (loading: boolean) => {},
});

export const useLoading = () => useContext(LoadingContext);

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
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
    <LoadingContext.Provider value={{isLoading, setIsLoading}}>
      {isLoading && <Loading />}
      <div className={isLoading ? "hidden" : "block"}>{children}</div>
    </LoadingContext.Provider>
  );
}