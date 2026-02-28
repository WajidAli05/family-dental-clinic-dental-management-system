// src/components/owner/settings/ChangePasswordForm.jsx
import { useState } from "react";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2ec4b6]/30";

const ChangePasswordForm = ({ onSave, loading }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });

  const submit = async () => {
    setStatus({ type: "", message: "" });

    if (!newPassword || newPassword.length < 6) {
      setStatus({ type: "error", message: "New password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirm) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    try {
      await onSave?.({ newPassword, confirmPassword: confirm });
      setStatus({ type: "success", message: "Password updated successfully." });
      setNewPassword("");
      setConfirm("");
    } catch (e) {
      setStatus({ type: "error", message: e?.message || "Failed to update password." });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
        <p className="text-sm text-gray-500">
          Set a new password for the owner account.
        </p>
      </div>

      {status.message ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            status.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : "bg-rose-50 text-rose-700 border border-rose-100"
          }`}
        >
          {status.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="New Password">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            placeholder="Enter new password"
          />
        </Field>

        <Field label="Re-enter New Password">
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
            placeholder="Re-enter new password"
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button
          disabled={!!loading}
          className="rounded-xl bg-[#2ec4b6] hover:bg-[#26a699] text-white"
          onClick={submit}
        >
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
    {children}
  </div>
);

export default ChangePasswordForm;