import {
  Construction,
  ArrowLeft,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

type ManagementPlaceholderPageProps = {
  title: string;
  description: string;
};

function ManagementPlaceholderPage({
  title,
  description,
}: ManagementPlaceholderPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}

        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-red-600">
            CANA Management
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {title}
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            {description}
          </p>
        </div>

        {/* CONTENT */}

        <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="max-w-md px-6 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
              <Construction
                size={30}
                className="text-red-600"
              />
            </div>

            <h2 className="text-xl font-bold text-gray-900">
              {title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              This module is ready in the management
              navigation and will be developed next.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate("/management")
              }
              className="
                mt-6
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-red-600
                px-5
                py-3
                text-sm
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-red-700
              "
            >
              <ArrowLeft size={17} />

              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManagementPlaceholderPage;
