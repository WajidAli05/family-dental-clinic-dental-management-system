import { Card, CardContent } from "@/components/ui/card";

const ProfileDetails = ({ profile }) => {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6 space-y-3">
        <Detail label="Phone" value={profile.phone} />
        <Detail label="Address" value={profile.address} />
        <Detail label="Joined On" value={profile.joinedOn} />
      </CardContent>
    </Card>
  );
};

const Detail = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default ProfileDetails;