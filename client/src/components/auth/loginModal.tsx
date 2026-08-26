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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-5 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-black"
        >
          <X size={20} />
        </button>

        {/* Logo */}
        <div className="text-center">
          <img
            src={logo}
            alt="CANA Group"
            className="mx-auto h-20 w-auto object-contain"
          />

          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-black">
            Welcome Back
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Login to your CANA account
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Phone Number
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 transition focus-within:border-black">
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

          {/* Password */}
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

            <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 transition focus-within:border-black">
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

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-600">
                {error}
              </p>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-red-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Register */}
        <div className="mt-7 text-center text-sm text-gray-600">
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
  );
}

export default LoginModal;
