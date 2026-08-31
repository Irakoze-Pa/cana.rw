import { Link, useRouteError } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

export default function AppErrorPage() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : "Something unexpected happened.";
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><section className="max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AlertTriangle size={23} /></div><h1 className="mt-5 text-xl font-bold text-gray-900">We could not load this page</h1><p className="mt-2 text-sm text-gray-500">{message}</p><Link to="/" className="mt-6 inline-flex rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white">Return home</Link></section></main>;
}
