import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { labApi } from "@/lib/labApi";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Award,
  Edit2,
  Save,
  X,
  Info,
} from "lucide-react";

export default function LabProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState(null);
  const [editedProfile, setEditedProfile] = useState(null);

  const shapeProfile = (data) => ({
    name: data?.name || "",
    email: data?.email || "",
    phone: data?.phone || "",
    specialization: data?.specialization || "",
    experience: data?.experience || "",
    address: data?.address || "",
    bio: data?.bio || "",
    certifications: Array.isArray(data?.certifications) ? data.certifications : [],
    joinDate: data?.joinDate || "",
    workingHours: data?.workingHours || "",
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await labApi.getMe();
        if (!alive) return;

        const shaped = shapeProfile(res.data);
        setProfile(shaped);
        setEditedProfile(shaped);
      } catch (e) {
        setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile(profile);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      const res = await labApi.updateMe({ ...editedProfile });
      const shaped = shapeProfile(res.data);

      setProfile(shaped);
      setEditedProfile(shaped);
      setIsEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handleChange = (field, value) => {
    setEditedProfile((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="text-white text-center">Loading profile...</div>;
  if (!profile) return <div className="text-white text-center">No profile found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {error ? <p className="text-red-200 text-sm text-center">{error}</p> : null}

      {/* Header */}
      <div className="relative mb-4 pb-12 md:pb-0">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Lab Profile</h1>
          <p className="text-white/80 mt-1">Manage your professional information</p>
        </div>

        <div className="absolute top-20 md:top-10 right-0">
          {!isEditing ? (
            <Button
              onClick={handleEdit}
              className="bg-white text-[#2ec4b6] hover:bg-gray-100 text-sm md:text-base px-3 py-2 md:px-4 md:py-2"
            >
              <Edit2 size={14} className="mr-1 md:mr-2 md:w-4 md:h-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="space-x-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-white text-[#2ec4b6] hover:bg-gray-100 text-sm md:text-base px-3 py-2 md:px-4 md:py-2"
              >
                <Save size={14} className="mr-1 md:mr-2 md:w-4 md:h-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white/10 text-sm md:text-base px-3 py-2 md:px-4 md:py-2"
              >
                <X size={14} className="mr-1 md:mr-2 md:w-4 md:h-4" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Profile Card */}
      <Card className="bg-white/95 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <User className="text-[#2ec4b6]" />
            Personal Information
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="space-y-2 text-left">
              <Label className="flex items-center gap-2 text-gray-700">
                <User size={16} className="text-[#2ec4b6]" />
                Full Name
              </Label>
              {isEditing ? (
                <Input
                  value={editedProfile.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="border-gray-300"
                />
              ) : (
                <p className="text-lg font-medium text-gray-900 pl-6">{profile.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2 text-left">
              <Label className="flex items-center gap-2 text-gray-700">
                <Mail size={16} className="text-[#2ec4b6]" />
                Email
              </Label>
              {isEditing ? (
                <Input
                  type="email"
                  value={editedProfile.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="border-gray-300"
                />
              ) : (
                <p className="text-lg font-medium text-gray-900 pl-6">{profile.email}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2 text-left">
              <Label className="flex items-center gap-2 text-gray-700">
                <Phone size={16} className="text-[#2ec4b6]" />
                Phone
              </Label>
              {isEditing ? (
                <Input
                  value={editedProfile.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="border-gray-300"
                />
              ) : (
                <p className="text-lg font-medium text-gray-900 pl-6">{profile.phone}</p>
              )}
            </div>

            {/* Specialization */}
            <div className="space-y-2 text-left">
              <Label className="flex items-center gap-2 text-gray-700">
                <Award size={16} className="text-[#2ec4b6]" />
                Specialization
              </Label>
              {isEditing ? (
                <Input
                  value={editedProfile.specialization}
                  onChange={(e) => handleChange("specialization", e.target.value)}
                  className="border-gray-300"
                />
              ) : (
                <p className="text-lg font-medium text-gray-900 pl-6">{profile.specialization}</p>
              )}
            </div>

            {/* Experience */}
            <div className="space-y-2 text-left">
              <Label className="flex items-center gap-2 text-gray-700">
                <Calendar size={16} className="text-[#2ec4b6]" />
                Experience
              </Label>
              {isEditing ? (
                <Input
                  value={editedProfile.experience}
                  onChange={(e) => handleChange("experience", e.target.value)}
                  className="border-gray-300"
                />
              ) : (
                <p className="text-lg font-medium text-gray-900 pl-6">{profile.experience}</p>
              )}
            </div>

            {/* Working Hours */}
            <div className="space-y-2 text-left">
              <Label className="flex items-center gap-2 text-gray-700">
                <Clock size={16} className="text-[#2ec4b6]" />
                Working Hours
              </Label>
              {isEditing ? (
                <Input
                  value={editedProfile.workingHours}
                  onChange={(e) => handleChange("workingHours", e.target.value)}
                  className="border-gray-300"
                />
              ) : (
                <p className="text-lg font-medium text-gray-900 pl-6">{profile.workingHours}</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-2 md:col-span-2 text-left">
              <Label className="flex items-center gap-2 text-gray-700">
                <MapPin size={16} className="text-[#2ec4b6]" />
                Address
              </Label>
              {isEditing ? (
                <Input
                  value={editedProfile.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="border-gray-300"
                />
              ) : (
                <p className="text-lg font-medium text-gray-900 pl-6">{profile.address}</p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2 md:col-span-2 text-left">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-[#2ec4b6]" />
                <Label className="text-gray-500">Bio</Label>
              </div>

              {isEditing ? (
                <Textarea
                  value={editedProfile.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  rows={4}
                  className="border-gray-300"
                />
              ) : (
                <p className="text-gray-700 leading-relaxed pl-6">{profile.bio}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certifications Card */}
      <Card className="bg-white/95 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Award className="text-[#2ec4b6]" />
            Certifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(profile.certifications || []).map((cert, index) => (
              <Badge key={index} className="bg-[#2ec4b6] text-white px-4 py-2 text-sm">
                {cert}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Work Stats (still static – make derived later from cases if you want) */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-white/95 backdrop-blur">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#2ec4b6]">156</p>
              <p className="text-gray-600 mt-1">Completed Samples</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#2ec4b6]">98%</p>
              <p className="text-gray-600 mt-1">Approval Rate</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#2ec4b6]">{profile.joinDate}</p>
              <p className="text-gray-600 mt-1">Member Since</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}