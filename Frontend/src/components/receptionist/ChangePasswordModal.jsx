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

  /* Reset when modal closes */
  useEffect(() => {
    if (!open) {
      setOldPass("");
      setNewPass("");
      setError("");
    }
  }, [open]);

  const handleSubmit = () => {
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
    onSubmit(oldPass, newPass);
    onOpenChange(false);
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
        />

        <Input
          type="password"
          placeholder="New Password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
        />

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <Button
          className="bg-[#2ec4b6]"
          onClick={handleSubmit}
          disabled={!oldPass || !newPass}
        >
          Update Password
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordModal;