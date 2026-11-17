
import {
  createContext,
  useContext,
  useState,
} from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("medichain_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem("medichain_user");
      return null;
    }
  });

  const login = (userData, token) => {
    localStorage.setItem("medichain_token", token);
    localStorage.setItem(
      "medichain_user",
      JSON.stringify(userData)
    );

    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("medichain_token");
    localStorage.removeItem("medichain_user");
    setUser(null);
  };

  const isAuthenticated = Boolean(
    localStorage.getItem("medichain_token") && user
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
