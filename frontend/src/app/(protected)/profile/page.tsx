"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { CheckCircle, UploadCloud, Eye, EyeOff } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Select, SelectOption } from "@/components/ui/Select";
import SwitchButton from "@/components/ui/SwitchButton";
import { toast } from "@/utils/toastUtils";
import { useSession } from "next-auth/react";
import { ENV } from "@/config/env";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { E2EEKeyManager } from "@/lib/crypto/keyManager";
import { ProfileEncryption } from "@/lib/crypto/profileEncryption";

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <Card className="mb-8">
    <Card.Header>
      <Card.Title>{title}</Card.Title>
    </Card.Header>
    <Card.Content>{children}</Card.Content>
  </Card>
);

export default function ProfilePage() {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [altEmail, setAltEmail] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [canEditRole, setCanEditRole] = useState(true);

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  const [receiveEmailNotif, setReceiveEmailNotif] = useState(true);
  const [receiveInAppNotif, setReceiveInAppNotif] = useState(true);

  const [profileVisibility, setProfileVisibility] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Toggle visibility states for password fields
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    update: updateSession,
  } = useSession();

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${ENV.API_URL}/auth/profile`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch profile");
        const apiRes = await res.json();
        const user = apiRes.data?.user;
        if (!user) throw new Error("Invalid response");
        
        setName(user.name || "");
        setUsername(user.username || "");
        setBio(user.bio || "");
        
        // Try to decrypt encrypted fields if master key is available
        const masterKey = await E2EEKeyManager.getMasterKeyFromSession();
        if (masterKey && user.encryptedFields) {
          try {
            const decrypted = await ProfileEncryption.decryptProfileData(
              user.encryptedFields,
              masterKey
            );
            
            // Use decrypted values if available, otherwise fallback to plaintext
            setPrimaryEmail(decrypted.primaryEmail || user.email || "");
            setAltEmail(decrypted.alternateEmail || user.alternateEmail || "");
            setPhone(decrypted.phone || user.phone || "");
            setDepartment(decrypted.department || user.department || "");
            // Bio is already set above, but decrypt if available
            if (decrypted.bio) {
              setBio(decrypted.bio);
            }
          } catch (decryptError) {
            console.error("Failed to decrypt profile fields:", decryptError);
            // Fallback to plaintext values
            setPrimaryEmail(user.email || "");
            setAltEmail(user.alternateEmail || "");
            setPhone(user.phone || "");
            setDepartment(user.department || "");
          }
        } else {
          // No encryption or no master key - use plaintext
          setPrimaryEmail(user.email || "");
          setAltEmail(user.alternateEmail || "");
          setPhone(user.phone || "");
          setDepartment(user.department || "");
        }
        
        if (user.avatarUrl) {
          setAvatar(user.avatarUrl);
        } else {
          setAvatar(null);
        }
        const fetchedRole = user.role?.displayName || "";
        setRole(fetchedRole);
        if (fetchedRole.toLowerCase() === "user") {
          setCanEditRole(false);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const body: any = {
        name,
        username,
        bio,
        phone,
        department,
        alternateEmail: altEmail,
      };

      // Try to encrypt sensitive fields if master key is available
      const masterKey = await E2EEKeyManager.getMasterKeyFromSession();
      
      if (masterKey) {
        try {
          const encrypted = await ProfileEncryption.encryptProfileData(
            {
              primaryEmail,
              alternateEmail: altEmail,
              phone,
              department,
              bio,
            },
            masterKey
          );

          // Add encrypted fields to request body
          if (encrypted.primaryEmail) {
            body.encryptedEmail = encrypted.primaryEmail.encrypted;
            body.encryptedEmailIV = encrypted.primaryEmail.iv;
          }
          if (encrypted.alternateEmail) {
            body.encryptedAltEmail = encrypted.alternateEmail.encrypted;
            body.encryptedAltEmailIV = encrypted.alternateEmail.iv;
          }
          if (encrypted.phone) {
            body.encryptedPhone = encrypted.phone.encrypted;
            body.encryptedPhoneIV = encrypted.phone.iv;
          }
          if (encrypted.department) {
            body.encryptedDepartment = encrypted.department.encrypted;
            body.encryptedDeptIV = encrypted.department.iv;
          }
          if (encrypted.bio) {
            body.encryptedBio = encrypted.bio.encrypted;
            body.encryptedBioIV = encrypted.bio.iv;
          }
          
        } catch (encryptError) {
          toast.error("Failed to encrypt sensitive data");
          setIsSaving(false);
          return;
        }
      }

      const res = await fetch(`${ENV.API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Update failed");
      }

      const respJson = await res.json();
      if (respJson.success) {
        // refresh session data with new username/name
        await updateSession({ name, username });
        toast.success("Profile updated successfully");
      } else {
        throw new Error(respJson.error?.message || "Update failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  /** Change password */
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch(`${ENV.API_URL}/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          oldPassword: currentPassword,
          newPassword: newPassword,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Password update failed");
      }

      toast.success("Password updated successfully");
      // Clear fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const languageOptions: SelectOption[] = [
    { value: "en", label: "English" },
    { value: "tr", label: "Türkçe" },
  ];
  const timezoneOptions: SelectOption[] = [
    { value: "UTC", label: "UTC" },
    { value: "Europe/Istanbul", label: "Europe/Istanbul" },
    { value: "America/New_York", label: "America/New_York" },
  ];

  /** Handlers */
  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append("avatar", file);

    setIsSaving(true);
    try {
      const res = await fetch(`${ENV.API_URL}/auth/profile/avatar`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Avatar upload failed");
      }

      const { data } = await res.json();
      const newAvatarUrl = data.avatarUrl;

      setAvatar(newAvatarUrl);
      await updateSession({ avatar: newAvatarUrl });

      toast.success("Avatar updated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload avatar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 max-h-[calc(100vh-102px)] overflow-y-scroll px-4">
      {/* Personal Information */}
      <Section title="Personal Information">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Avatar upload */}
          <div className="flex-shrink-0 flex flex-col items-center gap-3">
            <input
              id="avatar-input"
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <label htmlFor="avatar-input" className="cursor-pointer">
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-background-secondary border border-border">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt="Avatar preview"
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-foreground-secondary text-sm">
                    <UploadCloud className="w-6 h-6" />
                    Upload
                  </div>
                )}
              </div>
            </label>
            {avatar && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRemoveModal(true)}
              >
                Remove Avatar
              </Button>
            )}
          </div>

          {/* Editable fields */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
            />
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
            <Input
              label="Primary Email"
              value={primaryEmail}
              onChange={(e) => setPrimaryEmail(e.target.value)}
              fullWidth
            />
            <Input
              label="Alternate Email"
              placeholder="Add alternate email"
              value={altEmail}
              onChange={(e) => setAltEmail(e.target.value)}
              fullWidth
            />
            <Input
              label="Phone (optional)"
              placeholder="+1 555 555-1234"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
            />
            <Input
              label="Role / Position"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              fullWidth
              disabled={!canEditRole}
            />
            <Input
              label="Department / Team"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              fullWidth
              autoComplete="new-password"
              spellCheck={false}
            />
            <div className="col-span-full">
              <label className="block text-sm font-medium mb-2 text-foreground">
                Bio / About Me
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded-md border border-border bg-background-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue"
              />
            </div>
          </div>
        </div>
        {/* Save button */}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveProfile} loading={isSaving} disabled={isSaving || isLoading}>
            Save Changes
          </Button>
        </div>
      </Section>

      {/* Security Settings */}
      <Section title="Security Settings">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Password Change */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Change Password</h4>
            <Input
              label="Current Password"
              type={showCurrentPassword ? "text" : "password"}
              fullWidth
              autoComplete="new-password"
              spellCheck={false}
              name="current-password-field"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="text-muted-foreground hover:text-foreground flex items-center justify-center p-0 border-0 bg-transparent"
                >
                  {showCurrentPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              }
            />
            <Input 
              label="New Password" 
              type={showNewPassword ? "text" : "password"}
              fullWidth 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="text-muted-foreground hover:text-foreground flex items-center justify-center p-0 border-0 bg-transparent"
                >
                  {showNewPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              }
            />
            <Input 
              label="Confirm Password" 
              type={showConfirmPassword ? "text" : "password"}
              fullWidth 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-muted-foreground hover:text-foreground flex items-center justify-center p-0 border-0 bg-transparent"
                >
                  {showConfirmPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              }
            />
            <Button size="sm" onClick={handleChangePassword} loading={isChangingPassword} disabled={isChangingPassword}>
              Update Password
            </Button>
          </div>

          {/* Two-factor authentication */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">
              Two-Factor Authentication
            </h4>
            <SwitchButton
              checked={twoFAEnabled}
              onChange={setTwoFAEnabled}
              title={twoFAEnabled ? "Enabled" : "Disabled"}
            />
            {twoFAEnabled && (
              <div className="border border-dashed border-border rounded-md p-4 text-center text-sm text-foreground-secondary">
                {/* Placeholder for QR code */}
                <p className="mb-2">
                  Scan this QR code with your authenticator app.
                </p>
                <div className="w-28 h-28 mx-auto bg-background-tertiary" />
              </div>
            )}
          </div>

          {/* Active Sessions */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="font-medium text-foreground">Active Sessions</h4>
            <div className="border border-border rounded-md divide-y divide-border">
              {[
                {
                  device: "Chrome on macOS",
                  ip: "192.168.1.10",
                  current: true,
                },
                { device: "Safari on iOS", ip: "172.20.10.2" },
              ].map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-4 py-2 bg-background hover:bg-background-secondary"
                >
                  <div className="flex flex-col text-sm">
                    <span>{s.device}</span>
                    <span className="text-foreground-secondary">{s.ip}</span>
                  </div>
                  {s.current ? (
                    <span className="flex items-center gap-1 text-green text-sm">
                      <CheckCircle className="w-4 h-4" /> Current
                    </span>
                  ) : (
                    <Button size="sm" variant="ghost">
                      Sign Out
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Preferences */}
      <Section title="Preferences">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-foreground">
              Language
            </label>
            <Select
              options={languageOptions}
              value={language}
              onChange={setLanguage}
              aria-label="Language selector"
            />
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-foreground">
              Timezone
            </label>
            <Select
              options={timezoneOptions}
              value={timezone}
              onChange={setTimezone}
              aria-label="Timezone selector"
            />
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">
              Notification Preferences
            </h4>
            <SwitchButton
              checked={receiveEmailNotif}
              onChange={setReceiveEmailNotif}
              title="Email Notifications"
            />
            <SwitchButton
              checked={receiveInAppNotif}
              onChange={setReceiveInAppNotif}
              title="In-app Notifications"
            />
          </div>
        </div>
      </Section>

      {/* Usage Statistics */}
      <Section title="Usage Statistics">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <Statistic label="Account Created" value="Jan 10, 2024" />
          <Statistic label="Last Login" value="Oct 03, 2025 09:12" />
          <Statistic label="Uploaded Documents" value="152" />
          <Statistic label="Favorite Documents" value="24" />
          <Statistic label="Shared Documents" value="12" />
          <Statistic label="Total Searches" value="310" />
          <Statistic label="Custom Models" value="3" />
        </div>
      </Section>

      {/* Advanced Settings */}
      <Section title="Advanced Settings">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Button variant="secondary">Export My Data</Button>
          <Button variant="error">Delete Account</Button>
          <SwitchButton
            checked={profileVisibility}
            onChange={setProfileVisibility}
            title="Profile Visibility"
          />
        </div>
      </Section>

      {/* Remove avatar confirmation */}
      <ConfirmationModal
        isOpen={showRemoveModal}
        onClose={() => showRemoveModal && !isRemoving && setShowRemoveModal(false)}
        onConfirm={async () => {
          setIsRemoving(true);
          try {
            const res = await fetch(`${ENV.API_URL}/auth/profile/avatar`, {
              method: "DELETE",
              credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to delete avatar");
            setAvatar(null);
            await updateSession({ avatar: null });
            toast.success("Avatar removed");
            setShowRemoveModal(false);
          } catch (err) {
            console.error(err);
            toast.error("Failed to remove avatar");
          } finally {
            setIsRemoving(false);
          }
        }}
        title="Remove Avatar"
        message="Are you sure you want to remove your avatar? This action cannot be undone."
        confirmText="Remove"
        variant="danger"
        isLoading={isRemoving}
      />
    </div>
  );
}

/** Utility component for key-value stat display */
const Statistic: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="border border-border rounded-md p-4">
    <p className="text-sm text-foreground-secondary mb-1">{label}</p>
    <p className="text-lg font-medium text-foreground">{value}</p>
  </div>
);
