import { useEffect, useMemo } from "react";
import Wavify from "react-wavify";

import { useDentistStore } from "@/store/dentistStore";
import DentistProfileCard from "@/components/dentist/DentistProfileCard";
import ChangePasswordCard from "@/components/dentist/ChangePasswordCard";

const DentistProfile = () => {
  const { dentists, fetchMe } = useDentistStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const loggedInDentist = useMemo(() => dentists?.[0] || null, [dentists]);

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500">
          Manage your professional information and security
        </p>

        <Wavify
          fill="#2ec4b6"
          paused={false}
          options={{ height: 20, amplitude: 30, speed: 0.15, points: 3 }}
          className="absolute bottom-0 left-0 w-full opacity-20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DentistProfileCard dentist={loggedInDentist} />
        <ChangePasswordCard />
      </div>
    </div>
  );
};

export default DentistProfile;