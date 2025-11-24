// hooks/useAuthFlow.ts - Improved authentication flow with better state management
import { useAuth } from "@/context/authContext";
import { useUser } from "@/context/userContext";
import { UserState } from "@/context/userContext";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

export const useAuthFlow = () => {
  const { login, verifyEmail, isLoading: authLoading } = useAuth();
  const { refreshUserData, isLoading: userLoading, userState } = useUser();
  const router = useRouter();
  
  // Use ref to prevent multiple simultaneous redirects
  const redirectingRef = useRef(false);

  const signInWithRedirect = useCallback(async (
    email: string, 
    password: string, 
    redirectPath: string = "/"
  ) => {
    try {
      console.log("AuthFlow: Starting sign-in flow...");
      
      // Reset redirecting flag
      redirectingRef.current = false;
      
      // Step 1: Authenticate
      const authResult = await login(email, password);
      
      if (authResult.success) {
        console.log("AuthFlow: Authentication successful, loading user data...");
        
        // Step 2: Load user data with retry logic
        let userDataLoaded = false;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!userDataLoaded && retryCount < maxRetries) {
          console.log(`AuthFlow: Loading user data (attempt ${retryCount + 1}/${maxRetries})...`);
          
          userDataLoaded = await refreshUserData();
          
          if (!userDataLoaded) {
            retryCount++;
            if (retryCount < maxRetries) {
              console.log("AuthFlow: User data load failed, retrying in 500ms...");
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
        
        if (userDataLoaded) {
          console.log("AuthFlow: User data loaded successfully");
          
          // Step 3: Wait for user state to stabilize before redirecting
          const waitForActiveSession = (): Promise<boolean> => {
            return new Promise((resolve) => {
              let attempts = 0;
              const maxAttempts = 20; // 2 seconds total
              
              const checkState = () => {
                attempts++;
                console.log(`AuthFlow: Checking user state (${attempts}/${maxAttempts}):`, userState);
                
                // Check if user state is now active
                if (userState === UserState.ACTIVE_SESSION) {
                  console.log("AuthFlow: User state is active, ready to redirect");
                  resolve(true);
                  return;
                }
                
                // If we've exceeded attempts, proceed anyway
                if (attempts >= maxAttempts) {
                  console.log("AuthFlow: Max attempts reached, proceeding with redirect");
                  resolve(false);
                  return;
                }
                
                // Continue checking
                setTimeout(checkState, 100);
              };
              
              checkState();
            });
          };
          
          await waitForActiveSession();
          
          // Step 4: Redirect with protection against multiple redirects
          if (!redirectingRef.current) {
            redirectingRef.current = true;
            console.log(`AuthFlow: Redirecting to ${redirectPath}...`);
            
            // Use replace instead of push to prevent back button issues
            router.replace(redirectPath);
          }
          
        } else {
          console.warn("AuthFlow: User data load failed after all retries");
          // Still attempt redirect as the auth was successful
          if (!redirectingRef.current) {
            redirectingRef.current = true;
            console.log(`AuthFlow: Redirecting despite user data load failure to ${redirectPath}...`);
            router.replace(redirectPath);
          }
        }
        
        return { success: true, message: "Sign-in successful!" };
      } else {
        console.log("AuthFlow: Authentication failed:", authResult.message);
        return authResult;
      }
    } catch (error) {
      console.error("AuthFlow: Sign-in flow error:", error);
      return { 
        success: false, 
        message: "An unexpected error occurred during sign-in." 
      };
    }
  }, [login, refreshUserData, router, userState]);

  const verifyEmailWithRedirect = useCallback(async (
    email: string, 
    code: string, 
    redirectPath: string = "/"
  ) => {
    try {
      console.log("AuthFlow: Starting email verification flow...");
      
      // Reset redirecting flag
      redirectingRef.current = false;
      
      // Step 1: Verify email
      const verifyResult = await verifyEmail(email, code);
      
      if (verifyResult.success) {
        console.log("AuthFlow: Email verification successful, loading user data...");
        
        // Step 2: Load user data with retry logic
        let userDataLoaded = false;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!userDataLoaded && retryCount < maxRetries) {
          console.log(`AuthFlow: Loading user data (attempt ${retryCount + 1}/${maxRetries})...`);
          
          userDataLoaded = await refreshUserData();
          
          if (!userDataLoaded) {
            retryCount++;
            if (retryCount < maxRetries) {
              console.log("AuthFlow: User data load failed, retrying in 500ms...");
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
        
        if (userDataLoaded) {
          console.log("AuthFlow: User data loaded successfully");
          
          // Step 3: Wait for user state to stabilize
          const waitForActiveSession = (): Promise<boolean> => {
            return new Promise((resolve) => {
              let attempts = 0;
              const maxAttempts = 20;
              
              const checkState = () => {
                attempts++;
                console.log(`AuthFlow: Checking user state (${attempts}/${maxAttempts}):`, userState);
                
                if (userState === UserState.ACTIVE_SESSION) {
                  console.log("AuthFlow: User state is active, ready to redirect");
                  resolve(true);
                  return;
                }
                
                if (attempts >= maxAttempts) {
                  console.log("AuthFlow: Max attempts reached, proceeding with redirect");
                  resolve(false);
                  return;
                }
                
                setTimeout(checkState, 100);
              };
              
              checkState();
            });
          };
          
          await waitForActiveSession();
          
          // Step 4: Redirect
          if (!redirectingRef.current) {
            redirectingRef.current = true;
            console.log(`AuthFlow: Redirecting to ${redirectPath}...`);
            router.replace(redirectPath);
          }
          
        } else {
          console.warn("AuthFlow: User data load failed after all retries");
          if (!redirectingRef.current) {
            redirectingRef.current = true;
            console.log(`AuthFlow: Redirecting despite user data load failure to ${redirectPath}...`);
            router.replace(redirectPath);
          }
        }
        
        return { success: true, message: "Email verified successfully!" };
      } else {
        console.log("AuthFlow: Email verification failed:", verifyResult.message);
        return verifyResult;
      }
    } catch (error) {
      console.error("AuthFlow: Email verification flow error:", error);
      return { 
        success: false, 
        message: "An unexpected error occurred during verification." 
      };
    }
  }, [verifyEmail, refreshUserData, router, userState]);

  return {
    signInWithRedirect,
    verifyEmailWithRedirect,
    isLoading: authLoading || userLoading,
  };
};