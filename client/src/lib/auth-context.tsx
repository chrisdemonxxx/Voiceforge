import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(() => {
    // Load API key from localStorage on mount
    return localStorage.getItem("voiceforge_api_key");
  });

  const setApiKey = (key: string | null) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem("voiceforge_api_key", key);
    } else {
      localStorage.removeItem("voiceforge_api_key");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        apiKey,
        setApiKey,
        isAuthenticated: !!apiKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
