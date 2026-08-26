import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Compass size={30} />
        </div>
        <p className="mt-7 text-sm font-bold uppercase tracking-[0.18em] text-red-600">
          Error 404
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950">
          This page does not exist
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          The page may have moved, or the address may be incorrect.
        </p>
        <Link to="/" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
          <ArrowLeft size={17} />
          Return to home
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
