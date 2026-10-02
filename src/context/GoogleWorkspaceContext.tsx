import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken
} from '../services/googleWorkspaceAuth';

interface GoogleWorkspaceContextType {
  user: FirebaseUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const GoogleWorkspaceContext = createContext<GoogleWorkspaceContextType | undefined>(undefined);

export const GoogleWorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setIsLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const signIn = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        return true;
      }
      // User closed the popup without completing sign-in
      return false;
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user')
      ) {
        // Normal user cancellation - do not set an error
        return false;
      }
      console.error('[GoogleWorkspaceProvider] Sign in failed:', err);
      const msg = err?.message || 'Failed to authenticate with Google';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutGoogle();
      setUser(null);
      setAccessToken(null);
    } catch (err: any) {
      console.error('[GoogleWorkspaceProvider] Sign out error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <GoogleWorkspaceContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!accessToken && !!user,
        isLoading,
        error,
        signIn,
        signOut,
        clearError
      }}
    >
      {children}
    </GoogleWorkspaceContext.Provider>
  );
};

export const useGoogleWorkspace = (): GoogleWorkspaceContextType => {
  const context = useContext(GoogleWorkspaceContext);
  if (!context) {
    throw new Error('useGoogleWorkspace must be used within a GoogleWorkspaceProvider');
  }
  return context;
};
