import api from "./api";

export interface RegisterData {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
}

export interface AuthUser {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: "customer" | "staff" | "admin";
  company: "cana_group" | "cana_paints" | "cana_services";
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
    token: string;
  };
}

export const registerUser = async (data: RegisterData) => {
  const response = await api.post<AuthResponse>("/auth/register", data);
  return response.data;
};

export interface LoginData {
  phone: string;
  password: string;
}

export const loginUser = async (data: LoginData) => {
  const response = await api.post<AuthResponse>("/auth/login", data);
  return response.data;
};
