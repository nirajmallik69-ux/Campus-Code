import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ShieldCheck, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Input from "../components/Input";
import Button from "../components/Button";
import OtpInput from "../components/OtpInput";
import { friendlyErrorMessage, isValidSiliconEmail } from "../lib/utils";

const RESEND_COOLDOWN = 60;

export default function Auth() {
  const { sendOtp, verifyOtp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState("email"); // "email" | "otp"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setEmailError("");

    if (!isValidSiliconEmail(email)) {
      setEmailError("Use your Silicon University email (yourname@silicon.ac.in).");
      return;
    }

    setSending(true);
    try {
      await sendOtp(email.trim().toLowerCase());
      toast.success("OTP sent successfully");
      setStep("otp");
      setOtp("");
      setOtpError("");
      startCooldown();
    } catch (err) {
      // The backend returns the same generic message shape whether
      // or not the email is registered - we simply surface it as-is,
      // which keeps account enumeration from leaking through here.
      setEmailError(friendlyErrorMessage(err, "Unable to send OTP right now."));
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setOtpError("");

    if (!/^\d{6}$/.test(otp)) {
      setOtpError("Enter the 6-digit code sent to your email.");
      return;
    }

    setVerifying(true);
    try {
      const data = await verifyOtp(email, otp);
      toast.success("Signed in successfully");
      const complete = Boolean(data?.user?.sicId);
      navigate(complete ? "/dashboard" : "/onboarding", { replace: true });
    } catch (err) {
      setOtpError(friendlyErrorMessage(err, "That code didn't work."));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        {step === "email" ? (
          <>
            <h1>Student Login</h1>
            <p className="auth-subtitle">Sign in with your Silicon University email to view your rank.</p>

            <form onSubmit={handleSendOtp}>
              <Input
                label="Email address"
                name="email"
                type="email"
                placeholder="yourname@silicon.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={emailError}
                hint={!emailError ? "Use your Silicon University email" : undefined}
                autoFocus
                autoComplete="email"
              />
              <Button type="submit" variant="primary" className="btn-block" loading={sending}>
                <Mail size={16} /> Send OTP
              </Button>
            </form>
          </>
        ) : (
          <>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginBottom: 14, marginLeft: -10 }}
              onClick={() => setStep("email")}
            >
              <ArrowLeft size={15} /> Back
            </button>
            <h1>Enter verification code</h1>
            <p className="auth-subtitle">
              We sent a 6-digit code to <strong>{email}</strong>. It expires in 5 minutes.
            </p>

            <form onSubmit={handleVerifyOtp}>
              <OtpInput value={otp} onChange={setOtp} disabled={verifying} error={otpError} />
              <Button type="submit" variant="primary" className="btn-block" loading={verifying} style={{ marginTop: 8 }}>
                <ShieldCheck size={16} /> Verify OTP
              </Button>
            </form>

            <div className="auth-meta">
              <span>Didn't get a code?</span>
              <button onClick={handleSendOtp} disabled={cooldown > 0 || sending}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
