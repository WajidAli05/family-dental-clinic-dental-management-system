import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ProfileHeader = ({ profile }) => {
  return (
    <Card className="p-6 flex items-center gap-6 rounded-2xl">
      <Avatar className="w-20 h-20">
        <AvatarFallback className="bg-[#2ec4b6] text-white text-2xl">
          {profile.name.charAt(0)}
        </AvatarFallback>
      </Avatar>

      <div>
        <h2 className="text-xl font-bold">{profile.name}</h2>
        <p className="text-gray-500">{profile.email}</p>
        <p className="text-sm text-[#2ec4b6] font-medium">
          {profile.role}
        </p>
      </div>
    </Card>
  );
};

export default ProfileHeader;