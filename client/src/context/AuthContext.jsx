import { createContext, useState, useEffect, useCallback } from "react";
import { loginApi, getMeApi } from "../services/authService";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const userData = await getMeApi();
          setUser(userData);
        } catch (error) {
          console.error("Failed to load user session:", error);
          logout();
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [token, logout]);

  const login = async (email, password) => {
    const data = await loginApi(email, password);
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data);
    return data;
  };

  const isAdmin = user?.role === "Administrator";
  const isReceptionist = user?.role === "Receptionist";
  const isEmployee = user?.role === "Employee";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAdmin,
        isReceptionist,
        isEmployee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;