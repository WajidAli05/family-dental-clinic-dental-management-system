import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

const ChangePasswordCard = () => {
  const [current, setCurrent] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleChangePassword = () => {
    if (!current || !newPassword || !confirm) {
      alert("Please fill all fields");
      return;
    }

    if (newPassword !== confirm) {
      alert("Passwords do not match");
      return;
    }

    // 🔐 Backend integration later
    alert("Password changed successfully");

    setCurrent("");
    setNewPassword("");
    setConfirm("");
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#2ec4b61a]">
            <Lock className="w-5 h-5 text-[#2ec4b6]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Change Password
          </h3>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Current Password</Label>
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>

          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div>
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={handleChangePassword}
          className="bg-[#2ec4b6] hover:bg-[#26a699]"
        >
          Update Password
        </Button>
      </CardContent>
    </Card>
  );
};

export default ChangePasswordCard;