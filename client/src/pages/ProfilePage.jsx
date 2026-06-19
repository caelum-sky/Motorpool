// src/pages/ProfilePage.jsx
// Self-service profile editing — every signed-in user can update their own
// name, office/department, profile photo, email, and password. None of
// these touch other users' records; that stays admin-only on the Users page.

import { useState, useRef } from "react";
import { useAuth }          from "../context/AuthContext";
import { usersApi }         from "../utils/api";
import { Card, Button, Input } from "../components/ui";
import { Camera, Mail, Lock, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user, userProfile, refreshProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [name,             setName]             = useState(userProfile?.name || "");
  const [officeDepartment, setOfficeDepartment] = useState(userProfile?.officeDepartment || "");
  const [savingProfile,    setSavingProfile]    = useState(false);
  const [uploadingPhoto,   setUploadingPhoto]   = useState(false);

  const [newEmail,        setNewEmail]        = useState(userProfile?.email || "");
  const [savingEmail,     setSavingEmail]     = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword,  setSavingPassword]  = useState(false);

  const initials = (userProfile?.name || user?.email || "U")[0].toUpperCase();

  const handlePhotoPick = () => fileInputRef.current?.click();

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const photoURL = await usersApi.uploadPhoto(user.uid, file);
      await usersApi.updateProfile(user.uid, { photoURL });
      await refreshProfile();
      toast.success("Profile photo updated.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name cannot be empty.");
    setSavingProfile(true);
    try {
      await usersApi.updateProfile(user.uid, { name: name.trim(), officeDepartment });
      await refreshProfile();
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail === userProfile?.email) return;
    const password = window.prompt("For security, please re-enter your current password to change your email:");
    if (!password) return;

    setSavingEmail(true);
    try {
      await usersApi.reauthenticate(password);
      await usersApi.updateOwnEmail(user.uid, newEmail.trim());
      await refreshProfile();
      toast.success("Email updated. You may need to sign in again next time.");
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        toast.error("Incorrect password — email was not changed.");
      } else {
        toast.error(err.message);
      }
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) return toast.error("Enter your current password.");
    if (newPassword.length < 6) return toast.error("New password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return toast.error("New passwords don't match.");

    setSavingPassword(true);
    try {
      await usersApi.reauthenticate(currentPassword);
      await usersApi.updateOwnPassword(newPassword);
      toast.success("Password updated.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        toast.error("Current password is incorrect.");
      } else {
        toast.error(err.message);
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500">Manage your account details and photo.</p>
      </div>

      {/* Photo + basic info */}
      <Card className="p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-buksu-maroon text-white flex items-center justify-center text-2xl font-bold overflow-hidden">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover" />
              ) : initials}
            </div>
            <button
              onClick={handlePhotoPick}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-white border border-gray-300 shadow hover:bg-gray-50 transition"
            >
              {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" /> : <Camera className="w-3.5 h-3.5 text-gray-600" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{userProfile?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{userProfile?.role} · {userProfile?.officeDepartment || "PPMU"}</p>
            <button onClick={handlePhotoPick} disabled={uploadingPhoto} className="text-xs text-buksu-maroon font-medium hover:underline mt-1">
              {uploadingPhoto ? "Uploading…" : "Change photo"}
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3">
          <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Office / Department" value={officeDepartment} onChange={e => setOfficeDepartment(e.target.value)} />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Email */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" /> Email Address
        </h2>
        <form onSubmit={handleSaveEmail} className="space-y-3">
          <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          <p className="text-xs text-gray-400">Changing your email will ask you to confirm your current password.</p>
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" disabled={savingEmail || newEmail === userProfile?.email}>
              {savingEmail ? "Updating…" : "Update Email"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Password */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-400" /> Change Password
        </h2>
        <form onSubmit={handleSavePassword} className="space-y-3">
          <Input label="Current Password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" />
            <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" disabled={savingPassword}>
              {savingPassword ? "Updating…" : "Update Password"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}