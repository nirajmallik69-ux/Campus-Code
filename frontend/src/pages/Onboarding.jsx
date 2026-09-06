import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Input from "../components/Input";
import LockedField from "../components/LockedField";
import Button from "../components/Button";
import { friendlyErrorMessage } from "../lib/utils";

const STEPS = ["Your Identity", "Your Coding Profile", "Finish"];

export default function Onboarding() {
  const { user, completeProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");

  const [form, setForm] = useState({
    name: "",
    sicId: "",
    year: "",
    whatsappNumber: "",
    leetcodeUsername: ""
  });

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validateStep1 = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = "Name must be at least 2 characters long.";
    if (!form.sicId.trim()) next.sicId = "SIC ID is required.";
    if (!["1", "2", "3", "4"].includes(String(form.year))) next.year = "Choose your year.";
    if (form.whatsappNumber.trim().length < 10) next.whatsappNumber = "Enter a valid WhatsApp number.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep2 = () => {
    const next = {};
    if (!form.leetcodeUsername.trim()) next.leetcodeUsername = "LeetCode username is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    setApiError("");
    if (step === 0 && !validateStep1()) return;
    if (step === 1 && !validateStep2()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    setApiError("");
    try {
      await completeProfile({
        name: form.name.trim(),
        sicId: form.sicId.trim(),
        year: Number(form.year),
        whatsappNumber: form.whatsappNumber.trim(),
        leetcodeUsername: form.leetcodeUsername.trim()
      });
      toast.success("Profile created successfully");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setApiError(friendlyErrorMessage(err, "Unable to complete your profile right now."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page container">
      <div className="onboarding-shell">
        <div className="page-header" style={{ textAlign: "center" }}>
          <span className="eyebrow" style={{ justifyContent: "center" }}>
            Welcome to Campus Code
          </span>
          <h1>Let's set up your profile</h1>
        </div>

        <div className="steps-track">
          {STEPS.map((label, i) => (
            <div key={label} style={{ display: "contents" }}>
              <div className={`step-dot ${i < step ? "done" : ""} ${i === step ? "active" : ""}`}>
                {i < step ? <Check size={16} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`step-line ${i < step ? "done" : ""}`} />}
            </div>
          ))}
        </div>

        <div className="card card-padded">
          {apiError && <div className="alert alert-error">{apiError}</div>}

          <span className="step-label">Step {step + 1}</span>
          <h2 className="step-heading">{STEPS[step]}</h2>

          {step === 0 && (
            <>
              <Input label="Full name" placeholder="Your full name" value={form.name} onChange={update("name")} error={errors.name} />
              <Input label="SIC ID" placeholder="e.g. 23CSE045" value={form.sicId} onChange={update("sicId")} error={errors.sicId} hint="This cannot be changed after saving." />
              <div className="field">
                <label htmlFor="year">Year</label>
                <select id="year" className="input" value={form.year} onChange={update("year")}>
                  <option value="">Select year</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
                {errors.year && <span className="field-error">{errors.year}</span>}
              </div>
              <Input
                label="WhatsApp number"
                placeholder="e.g. 9876543210"
                value={form.whatsappNumber}
                onChange={update("whatsappNumber")}
                error={errors.whatsappNumber}
              />
            </>
          )}

          {step === 1 && (
            <>
              <LockedField label="Email" value={user?.email} />
              <Input
                label="LeetCode username"
                placeholder="e.g. aarav_codes"
                value={form.leetcodeUsername}
                onChange={update("leetcodeUsername")}
                error={errors.leetcodeUsername}
                hint="We'll use this to sync your solved problems and points."
              />
            </>
          )}

          {step === 2 && (
            <div>
              <div className="summary-row">
                <span>Name</span>
                <span>{form.name}</span>
              </div>
              <div className="summary-row">
                <span>Email</span>
                <span>{user?.email}</span>
              </div>
              <div className="summary-row">
                <span>SIC ID</span>
                <span>{form.sicId}</span>
              </div>
              <div className="summary-row">
                <span>Year</span>
                <span>Year {form.year}</span>
              </div>
              <div className="summary-row">
                <span>WhatsApp</span>
                <span>{form.whatsappNumber}</span>
              </div>
              <div className="summary-row">
                <span>LeetCode username</span>
                <span>{form.leetcodeUsername}</span>
              </div>
            </div>
          )}

          <div className="form-actions">
            {step > 0 ? (
              <Button variant="ghost" onClick={goBack} disabled={submitting}>
                <ChevronLeft size={16} /> Back
              </Button>
            ) : (
              <span />
            )}

            {step < STEPS.length - 1 ? (
              <Button variant="primary" onClick={goNext}>
                Continue <ChevronRight size={16} />
              </Button>
            ) : (
              <Button variant="primary" onClick={handleSubmit} loading={submitting}>
                Complete Profile
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
