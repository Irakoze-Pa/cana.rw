import {
  X,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  Building2,
  FileText,
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
    address: "",
    isCompanyCustomer: false,
    businessName: "",
    tin: "",
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

    if (!formData.address.trim()) {
      setError("Please enter your address.");
      return;
    }

    if (formData.isCompanyCustomer && !formData.businessName.trim()) {
      setError("Please enter the company name.");
      return;
    }

    if (formData.isCompanyCustomer && !formData.tin.trim()) {
      setError("Please enter the company TIN number.");
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
        address: "",
        isCompanyCustomer: false,
        businessName: "",
        tin: "",
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
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-modal-title"
        className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl sm:max-h-[90vh]"
      >
        <div className="h-1.5 bg-red-600" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close registration"
          className="absolute right-4 top-5 rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition hover:border-black hover:text-black sm:right-6"
        >
          <X size={20} />
        </button>

        <div className="px-5 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-9">
          <div className="flex items-center gap-3">
          <img
            src={logo}
              alt="CANAN Business Group"
              className="h-12 w-auto object-contain sm:h-14"
          />
            <div className="border-l border-gray-200 pl-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-600">Customer account</p>
              <p className="mt-1 text-xs font-medium text-gray-500">CANAN Business Group</p>
            </div>
          </div>

          <div className="mt-7">
            <h2 id="register-modal-title" className="text-2xl font-extrabold tracking-tight text-black sm:text-3xl">Create your account</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-gray-600">Save quotations, place orders and follow your requests in one place.</p>
          </div>

        <form
          onSubmit={handleSubmit}
            className="mt-7 space-y-4"
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

          <Input
            name="address"
            value={formData.address}
            onChange={handleChange}
            icon={<MapPin size={18} />}
            placeholder="Address"
          />

          <fieldset className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
            <legend className="px-1 text-sm font-semibold text-gray-700">Are you registering for a company?</legend>
            <p className="mt-1 text-xs leading-5 text-gray-500">This helps CANA prepare quotations and invoices correctly.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[{ label: "No", value: false }, { label: "Yes", value: true }].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setFormData((current) => ({ ...current, isCompanyCustomer: option.value }))}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-bold transition ${formData.isCompanyCustomer === option.value ? "border-black bg-black text-white" : "border-gray-200 bg-white text-gray-600 hover:border-black hover:text-black"}`}
                  aria-pressed={formData.isCompanyCustomer === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          {formData.isCompanyCustomer && (
            <div className="space-y-4 rounded-xl border border-red-100 bg-red-50/40 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-600">Company details</p>
              <Input
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                icon={<Building2 size={18} />}
                placeholder="Company name"
              />
              <Input
                name="tin"
                value={formData.tin}
                onChange={handleChange}
                icon={<FileText size={18} />}
                placeholder="TIN number"
              />
            </div>
          )}

          {/* Password */}
          <Input
            name="password"
            value={formData.password}
            onChange={handleChange}
            icon={<Lock size={18} />}
            placeholder="Password"
            type="password"
          />

          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-600">
                {error}
              </p>
            </div>
          )}

          {success && (
            <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-medium text-green-600">
                {success}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black py-3.5 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Creating..."
              : "Create Account"}
          </button>
        </form>

          <p className="mt-4 text-xs leading-5 text-gray-500">By creating an account, you can request quotations and manage your CANA orders securely.</p>

          <div className="mt-5 border-t border-gray-100 pt-5 text-center text-sm text-gray-600">
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
  const label = placeholder.replace(" address", "");

  return (
    <div>
      <label htmlFor={`register-${name}`} className="mb-2 block text-sm font-semibold text-gray-700">{label}</label>
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3.5 transition focus-within:border-black focus-within:bg-white focus-within:ring-2 focus-within:ring-black/5">
      <span className="shrink-0 text-gray-400">
        {icon}
      </span>

      <input
        id={`register-${name}`}
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-black outline-none placeholder:text-gray-400"
      />
    </div>
    </div>
  );
}

export default RegisterModal;
