import React from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-5xl flex flex-col items-center text-center">
        {/* TOP TEXT */}
        <div className="space-y-4 mb-10">
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-gray-900">
            <span className="text-[#2ec4b6]">404</span>{" "}
            <span className="font-semibold text-gray-600">
              Oops — we lost this page.
            </span>
          </h1>

          <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto">
            The link might be broken, or the page may have been moved. Let’s get
            you back to something useful.
          </p>

          {/* BUTTONS */}
          <div className="pt-2 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              Go Back
            </button>

            <button
              onClick={() => navigate("/login")}
              className="px-6 py-2.5 rounded-xl border border-[#2ec4b6] bg-white text-[#2ec4b6] font-semibold hover:bg-[#e8fbf9] transition"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* VISUAL CARD */}
        <div className="w-full rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-white to-[#f0fffd] p-6 sm:p-10">
            <div className="flex flex-col items-center gap-6">
              {/* Inline SVG illustration */}
              <svg
                viewBox="0 0 900 380"
                className="w-full max-w-3xl"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* background */}
                <defs>
                  <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e9fffb" />
                  </linearGradient>
                </defs>

                <rect x="0" y="0" width="900" height="380" fill="url(#bg)" />

                {/* shadow */}
                <ellipse
                  cx="450"
                  cy="320"
                  rx="260"
                  ry="28"
                  fill="#000"
                  opacity="0.06"
                />

                {/* cable */}
                <path
                  d="M120 255 C 260 140, 430 140, 560 255 S 780 350, 820 220"
                  fill="none"
                  stroke="#7aa7b2"
                  strokeWidth="10"
                  strokeLinecap="round"
                />

                {/* left plug */}
                <rect
                  x="60"
                  y="230"
                  width="70"
                  height="55"
                  rx="12"
                  fill="#111827"
                />
                <rect
                  x="130"
                  y="247"
                  width="18"
                  height="22"
                  rx="6"
                  fill="#111827"
                />

                {/* right socket */}
                <rect
                  x="760"
                  y="190"
                  width="110"
                  height="80"
                  rx="16"
                  fill="#ffffff"
                  stroke="#cbd5e1"
                  strokeWidth="3"
                />
                <circle cx="852" cy="205" r="6" fill="#ef4444" />
                <rect
                  x="795"
                  y="218"
                  width="65"
                  height="35"
                  rx="10"
                  fill="#f1f5f9"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                />
                <circle cx="820" cy="236" r="5" fill="#94a3b8" />
                <circle cx="840" cy="236" r="5" fill="#94a3b8" />

                {/* characters */}
                {/* left */}
                <circle
                  cx="310"
                  cy="190"
                  r="34"
                  fill="#ffffff"
                  stroke="#d1d5db"
                  strokeWidth="3"
                />
                <circle cx="300" cy="185" r="5" fill="#111827" />
                <circle cx="320" cy="185" r="5" fill="#111827" />
                <path
                  d="M298 202 Q310 214 322 202"
                  stroke="#111827"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
                <circle
                  cx="310"
                  cy="255"
                  r="55"
                  fill="#ffffff"
                  stroke="#d1d5db"
                  strokeWidth="3"
                />
                <circle
                  cx="310"
                  cy="255"
                  r="22"
                  fill="#d9fff7"
                  stroke="#a7f3d0"
                  strokeWidth="3"
                />
                <path
                  d="M265 250 Q230 245 190 240"
                  stroke="#cbd5e1"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <circle cx="265" cy="250" r="10" fill="#cbd5e1" />

                {/* right */}
                <circle
                  cx="590"
                  cy="190"
                  r="34"
                  fill="#ffffff"
                  stroke="#d1d5db"
                  strokeWidth="3"
                />
                <circle cx="580" cy="185" r="5" fill="#111827" />
                <circle cx="600" cy="185" r="5" fill="#111827" />
                <path
                  d="M584 206 Q590 198 596 206"
                  stroke="#111827"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
                <circle
                  cx="590"
                  cy="255"
                  r="55"
                  fill="#ffffff"
                  stroke="#d1d5db"
                  strokeWidth="3"
                />
                <circle
                  cx="590"
                  cy="255"
                  r="22"
                  fill="#e0f2fe"
                  stroke="#93c5fd"
                  strokeWidth="3"
                />
                <path
                  d="M635 250 Q690 238 740 228"
                  stroke="#cbd5e1"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <circle cx="635" cy="250" r="10" fill="#cbd5e1" />

                {/* speech bubble */}
                <path
                  d="M430 80
                     Q450 55 490 70
                     Q520 82 520 112
                     Q520 145 485 150
                     L465 150
                     L448 165
                     L452 148
                     Q420 140 420 112
                     Q420 92 430 80"
                  fill="#ffffff"
                  stroke="#cbd5e1"
                  strokeWidth="3"
                />
                <text
                  x="470"
                  y="110"
                  textAnchor="middle"
                  fontSize="28"
                  fontWeight="800"
                  fill="#111827"
                >
                  404
                </text>
                <text
                  x="470"
                  y="135"
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="600"
                  fill="#64748b"
                >
                  unplugged
                </text>
              </svg>

              <p className="text-gray-500 text-sm text-center">
                We’ll get the power back — meanwhile, choose where to go next.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;