import { useState } from "react";
import { Lock, Phone, X } from "lucide-react";

import { useNavigate } from "react-router-dom";

import logo from "@/assets/logocanan.png";

import { loginUser } from "@/services/authService";

import { useAuth } from "@/context/authContext";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: () => void;
  onForgotPassword: () => void;
  onLoginSuccess?: () => void;
}

function LoginModal({
  isOpen,
  onClose,
  onRegister,
  onForgotPassword,
  onLoginSuccess,
}: LoginModalProps) {
  const { login } = useAuth();

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  if (!isOpen) {
    return null;
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");

    if (!formData.phone || !formData.password) {
      setError("Please enter your phone and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await loginUser(formData);

      const user = response.data?.user;
      const token = response.data?.token;

      if (!user || !token) {
        throw new Error("Invalid login response.");
      }

      // Save authentication data
      login(user, token);

      // Close modal
      onClose();

      /*
       * If the page that opened this modal
       * provided onLoginSuccess, let that page
       * decide where to navigate.
       *
       * Example:
       * Products -> Request Quote
       */
      if (onLoginSuccess) {
        onLoginSuccess();
        return;
      }

      /*
       * Default redirect when LoginModal
       * is used somewhere else.
       */
      switch (user.role) {
        case "admin":
        case "staff":
          navigate("/management");
          break;

        case "customer":
          navigate("/dashboard");
          break;

        default:
          navigate("/");
          break;
      }
    } catch (err: any) {
      console.error("Login error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[90vh]"
      >
        <div className="h-1 bg-red-700" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close login"
          className="absolute right-4 top-5 rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition hover:border-black hover:text-black sm:right-6"
        >
          <X size={20} />
        </button>

        <div className="px-5 pb-6 pt-6 sm:px-7 sm:pb-7 sm:pt-7">
          <div className="flex items-center gap-3">
          <img
            src={logo}
              alt="CANAN Business Group"
              className="h-12 w-auto object-contain sm:h-14"
          />
            <div className="border-l border-gray-200 pl-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-600">Secure access</p>
              <p className="mt-1 text-xs font-medium text-gray-500">CANAN Business Group</p>
            </div>
          </div>

          <div className="mt-6">
            <h2 id="login-modal-title" className="text-2xl font-extrabold tracking-tight text-black sm:text-3xl">Welcome back</h2>
          </div>

        <form
          onSubmit={handleSubmit}
            className="mt-6 space-y-4"
        >
          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Phone Number
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3.5 transition focus-within:border-black focus-within:bg-white focus-within:ring-2 focus-within:ring-black/5">
              <Phone
                size={18}
                className="shrink-0 text-gray-400"
              />

              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                className="w-full bg-transparent text-sm text-black outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700"
              >
                Password
              </label>

              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs font-semibold text-red-600 transition hover:text-black"
              >
                Forgot password?
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3.5 transition focus-within:border-black focus-within:bg-white focus-within:ring-2 focus-within:ring-black/5">
              <Lock
                size={18}
                className="shrink-0 text-gray-400"
              />

              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="w-full bg-transparent text-sm text-black outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-600">
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-black px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

          <div className="mt-6 border-t border-gray-100 pt-4 text-center text-sm text-gray-600">
          <span>Don't have an account?</span>

          <button
            type="button"
            onClick={onRegister}
            className="ml-2 font-bold text-red-600 transition hover:text-black"
          >
            Create account
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
