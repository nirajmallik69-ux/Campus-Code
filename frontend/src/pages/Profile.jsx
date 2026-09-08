import { useRef, useState } from "react";
import { Camera, Save } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { studentApi } from "../lib/api";
import Avatar from "../components/Avatar";
import Input from "../components/Input";
import LockedField from "../components/LockedField";
import Button from "../components/Button";
import { friendlyErrorMessage, validateProfilePicture } from "../lib/utils";

const CONTACT_ADMIN_MESSAGE =
  "This can't be changed here. Please contact an admin via the About page to make this change.";

export default function Profile() {
  const { user, updateProfile, refreshUser } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: user?.name || "",
    year: user?.year ? String(user.year) : "",
    whatsappNumber: user?.whatsappNumber || ""
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const dirty =
    form.name !== (user?.name || "") ||
    form.year !== (user?.year ? String(user.year) : "") ||
    form.whatsappNumber !== (user?.whatsappNumber || "");

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = "Name must be at least 2 characters long.";
    if (!["1", "2", "3", "4"].includes(String(form.year))) next.year = "Choose your year.";
    if (form.whatsappNumber.trim().length < 10) next.whatsappNumber = "Enter a valid WhatsApp number.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await updateProfile({
        name: form.name.trim(),
        year: Number(form.year),
        whatsappNumber: form.whatsappNumber.trim()
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(friendlyErrorMessage(err, "Unable to update your profile right now."));
    } finally {
      setSaving(false);
    }
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationError = validateProfilePicture(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploading(true);

    try {
      await studentApi.uploadProfilePicture(user.sicId, file);
      await refreshUser();
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(friendlyErrorMessage(err, "Unable to upload your profile picture right now."));
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
    }
  };

  const handleLockedFieldClick = () => toast.info(CONTACT_ADMIN_MESSAGE);

  return (
    <div className="page container" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="page-header">
        <span className="eyebrow">My Profile</span>
        <h1>Account settings</h1>
      </div>

      <div className="card card-padded">
        <div className="profile-header">
          <div className="profile-avatar-wrap">
            <Avatar src={previewUrl || user?.profilePicture} name={user?.name} size={84} />
            <button
              className="avatar-upload-btn"
              onClick={handlePickFile}
              disabled={uploading}
              aria-label="Change profile picture"
              type="button"
            >
              {uploading ? <span className="spinner" /> : <Camera size={14} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={handleFileChange}
            />
          </div>
          <div>
            <h2 style={{ fontSize: 20 }}>{user?.name}</h2>
            <p className="text-secondary" style={{ fontSize: 13.5 }}>
              JPG, PNG or WebP · up to 500 KB
            </p>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="profile-fields">
            <div className="field full">
              <LockedField label="Email" value={user?.email} onClick={handleLockedFieldClick} />
            </div>
            <div className="field full">
              <LockedField label="SIC ID" value={user?.sicId} onClick={handleLockedFieldClick} />
            </div>
            <div className="field full">
              <LockedField
                label="LeetCode username"
                value={user?.leetcodeUsername}
                onClick={handleLockedFieldClick}
              />
            </div>

            <Input label="Full name" value={form.name} onChange={update("name")} error={errors.name} />

            <div className="field">
              <label htmlFor="year">Year</label>
              <select id="year" className="input" value={form.year} onChange={update("year")}>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
              {errors.year && <span className="field-error">{errors.year}</span>}
            </div>

            <Input
              label="WhatsApp number"
              value={form.whatsappNumber}
              onChange={update("whatsappNumber")}
              error={errors.whatsappNumber}
            />
          </div>

          <Button type="submit" variant="primary" loading={saving} disabled={!dirty} style={{ marginTop: 8 }}>
            <Save size={16} /> Save changes
          </Button>
        </form>
      </div>
    </div>
  );
}
