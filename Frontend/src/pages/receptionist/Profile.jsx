import { useState } from "react";
import Wavify from "react-wavify";

import { useProfileStore } from "@/store/profileStore";

import ProfileHeader from "@/components/receptionist/ProfileHeader";
import ProfileDetails from "@/components/receptionist/ProfileDetails";
import ChangePasswordModal from "@/components/receptionist/ChangePasswordModal";
import { Button } from "@/components/ui/button";

const Profile = () => {
  const {
    profile,
    stats,
    updateProfile,
    changePassword,
  } = useProfileStore();

  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white">
        <Wavify
          fill="#2ec4b6"
          paused={false}
          options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
        <div className="relative z-10 p-6">
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-gray-500">
            Manage your account details
          </p>
        </div>
      </div>

      <ProfileHeader profile={profile} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProfileDetails profile={profile} />
      </div>

      <Button
        variant="outline"
        onClick={() => setIsPasswordOpen(true)}
      >
        Change Password
      </Button>

      <ChangePasswordModal
        open={isPasswordOpen}
        onOpenChange={setIsPasswordOpen}
        onSubmit={changePassword}
      />
    </div>
  );
};

export default Profile;