// components/SafeContextWrapper.tsx
import React from "react";

// Simple provider type
type ContextProvider = React.ComponentType<{ children: React.ReactNode }>;

interface SafeContextWrapperProps {
  providers: ContextProvider[];
  children: React.ReactNode;
}

/**
 * Safe Context Wrapper with no TypeScript issues
 * @param providers - Array of context provider components
 * @param children - React children to be wrapped
 */
const SafeContextWrapper: React.FC<SafeContextWrapperProps> = ({
  providers,
  children,
}) => {
  return providers.reduceRight<React.ReactElement>((acc, Provider) => {
    return <Provider>{acc}</Provider>;
  }, children as React.ReactElement);
};

export default SafeContextWrapper;
