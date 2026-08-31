import {
  createContext,
  useContext,
  useState,
} from "react";

import type { ReactNode } from "react";

type User = {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;

  role: "customer" | "staff" | "admin";

  company:
    | "cana_group"
    | "cana_paints"
    | "cana_services";
  department?: "sales" | "production" | "warehouse" | "finance" | "marketing" | "hr" | "procurement" | "customer_service" | "management" | "transport";
  jobTitle?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;

  login: (user: User, token: string) => void;
  logout: () => void;
};

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser =
        localStorage.getItem("user");

      return savedUser
        ? JSON.parse(savedUser)
        : null;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("token")
  );

  const login = (
    user: User,
    token: string
  ) => {
    setUser(user);
    setToken(token);

    localStorage.setItem(
      "user",
      JSON.stringify(user)
    );

    localStorage.setItem(
      "token",
      token
    );
  };

  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
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
