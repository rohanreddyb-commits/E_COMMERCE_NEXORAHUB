"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/utils/api";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        if (!pathname.includes("/signin") && !pathname.includes("/signup")) {
          router.push("/signin");
        }
        return;
      }

      try {
        const res = await api.get("/auth/me");
        if (res.success && res.user) {
          if (res.user.role === "Admin") {
            setUser(res.user);
          } else {
            // Log out if not admin
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            router.push("/signin");
          }
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.push("/signin");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (!pathname.includes("/signin") && !pathname.includes("/signup")) {
          router.push("/signin");
        }
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [pathname, router]);

  const login = (token: string, userData: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    router.push("/");
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/signin");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
