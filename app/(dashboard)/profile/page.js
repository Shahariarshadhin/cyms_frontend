"use client";
import { useEffect, useState } from "react";
import { Save, KeyRound, User as UserIcon } from "lucide-react";
import api from "@/lib/api";
import RoleBadge from "@/components/RoleBadge";
import { getUser, saveSession } from "@/lib/auth";

export default function ProfilePage() {
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get("/auth/me");
      setProfile({ name: data.user.name, email: data.user.email, role: data.user.role });
    };
    load();
  }, []);

  const submitProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSaved(false);
    setSavingProfile(true);
    try {
      const { data } = await api.put("/auth/profile", { name: profile.name, email: profile.email });
      // keep the locally cached session in sync (name shown in Topbar, etc.)
      const token = localStorage.getItem("cybms_token");
      saveSession(token, { ...getUser(), name: data.user.name, email: data.user.email });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      setProfileError(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSaved(false);

    if (pwForm.newPassword.length < 6) return setPwError("New password must be at least 6 characters");
    if (pwForm.newPassword !== pwForm.confirmPassword) return setPwError("New passwords do not match");

    setSavingPw(true);
    try {
      await api.put("/auth/password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err) {
      setPwError(err?.response?.data?.message || "Failed to change password");
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-2xl">
      {/* Profile info */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
            <UserIcon size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900">My Profile</h3>
            {profile.role && <RoleBadge role={profile.role} />}
          </div>
        </div>

        <form onSubmit={submitProfile} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input w-full" required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input w-full" required value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </div>

          {profileError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{profileError}</p>}
          {profileSaved && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">Profile updated successfully.</p>}

          <button className="btn-primary flex items-center gap-2 justify-center w-full sm:w-auto" disabled={savingProfile}>
            <Save size={16} /> {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-slate-400 shrink-0" />
          <h3 className="font-semibold text-slate-900">Change Password</h3>
        </div>

        <form onSubmit={submitPassword} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password" className="input w-full" required
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">New Password</label>
              <input
                type="password" className="input w-full" required minLength={6}
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password" className="input w-full" required minLength={6}
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          {pwError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{pwError}</p>}
          {pwSaved && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">Password changed successfully.</p>}

          <button className="btn-primary flex items-center gap-2 justify-center w-full sm:w-auto" disabled={savingPw}>
            <KeyRound size={16} /> {savingPw ? "Updating..." : "Change Password"}
          </button>

          <p className="text-xs text-slate-400">
            Forgot your current password? Ask your Super Admin to reset it for you from Users &amp; Roles.
          </p>
        </form>
      </div>
    </div>
  );
}