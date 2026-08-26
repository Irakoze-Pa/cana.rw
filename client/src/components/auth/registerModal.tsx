import {
  X,
  User,
  Mail,
  Lock,
  Phone,
} from "lucide-react";

import { useState } from "react";

import logo from "@/assets/logocanan.png";

import { registerUser } from "@/services/authService";

type RegisterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
};

function RegisterModal({
  isOpen,
  onClose,
  onLogin,
}: RegisterModalProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  if (!isOpen) {
    return null;
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!formData.phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    if (!formData.password) {
      setError("Please enter a password.");
      return;
    }

    if (formData.password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await registerUser(formData);

      console.log(
        "Registration response:",
        response
      );

      setSuccess(
        "Account created successfully."
      );

      setFormData({
        fullName: "",
        phone: "",
        email: "",
        password: "",
      });

      setTimeout(() => {
        onClose();

        onLogin();
      }, 1200);
    } catch (err: any) {
      console.error(
        "Registration error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-5 backdrop-blur-sm"
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

        {/* Header */}
        <div className="text-center">
          <img
            src={logo}
            alt="CANA Group"
            className="mx-auto h-20 w-auto object-contain"
          />

          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-black">
            Create Account
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Join CANA Group
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4"
        >
          {/* Full Name */}
          <Input
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            icon={<User size={18} />}
            placeholder="Full name"
          />

          {/* Phone */}
          <Input
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            icon={<Phone size={18} />}
            placeholder="Phone number"
            type="tel"
          />

          {/* Email */}
          <Input
            name="email"
            value={formData.email}
            onChange={handleChange}
            icon={<Mail size={18} />}
            placeholder="Email address"
            type="email"
          />

          {/* Password */}
          <Input
            name="password"
            value={formData.password}
            onChange={handleChange}
            icon={<Lock size={18} />}
            placeholder="Password"
            type="password"
          />

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-600">
                {error}
              </p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
              <p className="text-sm font-medium text-green-600">
                {success}
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Creating..."
              : "Create Account"}
          </button>
        </form>

        {/* Login */}
        <div className="mt-7 text-center text-sm text-gray-600">
          <span>
            Already have an account?
          </span>

          <button
            type="button"
            onClick={onLogin}
            className="ml-2 font-bold text-red-600 transition hover:text-black"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

type InputProps = {
  icon: React.ReactNode;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  placeholder: string;
  type?: string;
};

function Input({
  icon,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}: InputProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 transition focus-within:border-black">
      <span className="shrink-0 text-gray-400">
        {icon}
      </span>

      <input
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-black outline-none placeholder:text-gray-400"
      />
    </div>
  );
}

export default RegisterModal;