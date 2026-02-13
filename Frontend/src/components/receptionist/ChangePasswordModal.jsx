import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const ChangePasswordModal = ({ open, onOpenChange, onSubmit }) => {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  /* Reset when modal closes */
  useEffect(() => {
    if (!open) {
      setOldPass("");
      setNewPass("");
      setError("");
      setSaving(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!oldPass || !newPass) {
      setError("All fields are required");
      return;
    }

    if (newPass.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    if (oldPass === newPass) {
      setError("New password must be different from old password");
      return;
    }

    setError("");
    setSaving(true);

    try {
      // ✅ FIX: match store signature
      await onSubmit({
        currentPassword: oldPass,
        newPassword: newPass,
      });

      onOpenChange(false);
    } catch (e) {
      setError(e?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>

        <Input
          type="password"
          placeholder="Current Password"
          value={oldPass}
          onChange={(e) => setOldPass(e.target.value)}
          disabled={saving}
        />

        <Input
          type="password"
          placeholder="New Password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          disabled={saving}
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button
          className="bg-[#2ec4b6] hover:bg-[#26a699]"
          onClick={handleSubmit}
          disabled={!oldPass || !newPass || saving}
        >
          {saving ? "Updating..." : "Update Password"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordModal;