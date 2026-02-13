import { useEffect, useState } from "react";
import Wavify from "react-wavify";

import { useReceptionistStore } from "@/store/receptionistStore";

import ProfileHeader from "@/components/receptionist/ProfileHeader";
import ProfileDetails from "@/components/receptionist/ProfileDetails";
import ChangePasswordModal from "@/components/receptionist/ChangePasswordModal";
import { Button } from "@/components/ui/button";

const Profile = () => {
  const {
    profile,
    fetchProfile,
    updateProfile,
    changePassword,
    loading,
    error,
  } = useReceptionistStore();

  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  useEffect(() => {
    if (typeof fetchProfile === "function") fetchProfile();
  }, [fetchProfile]);

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
          <p className="text-gray-500">Manage your account details</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl bg-white p-3 text-sm text-gray-600">
          Loading profile...
        </div>
      ) : null}

      <ProfileHeader profile={profile} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ✅ keep your component, but pass updateProfile so it can save if it supports it */}
        <ProfileDetails profile={profile} onSave={updateProfile} />
      </div>

      <Button variant="outline" onClick={() => setIsPasswordOpen(true)}>
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