import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, X, CheckCheck } from "lucide-react";
import { useNotificationsStore } from "@/store/notificationsStore";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
  const { t } = useTranslation();
  const { notifications, unreadCount, fetch, markRead, markAllRead } = useNotificationsStore();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Initial load + polling every 60 s
  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 60_000);
    return () => clearInterval(id);
  }, [fetch]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Bell button — prominent teal circle ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("security.notifications")}
        className={`
          relative flex items-center justify-center
          w-11 h-11 rounded-full
          bg-[#2ec4b6] hover:bg-[#26a699] active:bg-[#1f9e93]
          text-white shadow-md
          transition-colors duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2ec4b6] focus-visible:ring-offset-2
        `}
      >
        <Bell className="w-5 h-5" strokeWidth={2.2} />

        {/* Unread badge — red pill outside the top-end corner */}
        {unreadCount > 0 && (
          <span
            className="
              absolute -top-1 -end-1
              inline-flex items-center justify-center
              min-w-[18px] h-[18px] px-1
              rounded-full
              bg-red-500 text-white
              text-[10px] font-bold leading-none
              ring-2 ring-white
            "
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          className="
            absolute end-0 top-full mt-2
            w-80 bg-white border border-gray-200
            rounded-xl shadow-xl z-50 overflow-hidden
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#2ec4b6]" />
              <span className="text-sm font-semibold text-gray-800">
                {t("security.notifications")}
              </span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#2ec4b6] text-white text-[10px] font-bold leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-[#2ec4b6] hover:underline"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {t("security.markAllRead")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                {t("security.noNotifications")}
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => markRead(n._id)}
                  className={`w-full text-start px-4 py-3 hover:bg-gray-50 transition-colors ${
                    !n.read ? "bg-teal-50/40" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Unread dot */}
                    <span
                      className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${
                        !n.read ? "bg-[#2ec4b6]" : "bg-transparent"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-snug">
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug break-words">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
