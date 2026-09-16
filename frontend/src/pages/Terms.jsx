import { Link } from "react-router-dom";

function Section({ id, title, children }) {
  return (
    <section id={id} style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 19, marginBottom: 10 }}>{title}</h2>
      <div style={{ color: "var(--text-secondary)", fontSize: 14.5, lineHeight: 1.75 }}>{children}</div>
    </section>
  );
}

export default function Terms() {
  return (
    <div className="page container" style={{ maxWidth: 760, margin: "0 auto" }}>
      <div className="page-header">
        <span className="eyebrow">Legal</span>
        <h1>Terms & Conditions and Registration Agreement</h1>
        <p>
          By creating a Campus Code account, you agree to the terms below. Please read them,
          especially the sections on public visibility and automatic account deletion.
        </p>
      </div>

      <Section title="1. Introduction and acceptance">
        <p>
          Campus Code ("the Platform," "we," "us") is a competitive coding leaderboard built for
          students of Silicon University, operated by the SWITCH club. By creating an account,
          you agree to these Terms & Conditions in full. If you do not agree, do not register for
          or use the Platform.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p>Registration is limited to individuals who:</p>
        <ul>
          <li>Are currently enrolled students of Silicon University, and</li>
          <li>
            Have access to a valid <code>@silicon.ac.in</code> email address, which is used to
            verify eligibility via a one-time passcode (OTP) sent to that address.
          </li>
        </ul>
        <p>
          Attempting to register with an email address that is not genuinely yours, or that is
          not a valid Silicon University student address, is a violation of these terms.
        </p>
      </Section>

      <Section title="3. Account registration and accuracy of information">
        <p>When completing your profile, you agree to provide accurate information, including:</p>
        <ul>
          <li>Your full name</li>
          <li>Your SIC ID (student ID)</li>
          <li>Your current year of study</li>
          <li>A WhatsApp number</li>
          <li>Your LeetCode username</li>
        </ul>
        <p>
          <strong>The following fields are locked once set and cannot be changed by you after
          registration:</strong> your email address, your SIC ID, and your LeetCode username
          (locked to prevent leaderboard manipulation — contact an admin if it needs correcting).
        </p>
      </Section>

      <Section title="4. What data we collect">
        <table className="leaderboard-table" style={{ marginBottom: 0 }}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Collected when</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Email address</td>
              <td>Registration</td>
              <td>Login (OTP), identity verification</td>
            </tr>
            <tr>
              <td>Name, SIC ID, year, WhatsApp number</td>
              <td>Onboarding</td>
              <td>Profile, leaderboard filtering, contact</td>
            </tr>
            <tr>
              <td>LeetCode username</td>
              <td>Onboarding</td>
              <td>Fetching your public LeetCode statistics</td>
            </tr>
            <tr>
              <td>LeetCode solve counts, points, global rank</td>
              <td>Automatically, on a schedule</td>
              <td>Leaderboard ranking</td>
            </tr>
            <tr>
              <td>Profile picture (optional)</td>
              <td>Whenever you choose to upload one</td>
              <td>Display on your profile and the leaderboard</td>
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: 16 }}>
          We do not collect passwords — login uses a one-time code emailed to you, not a stored
          password.
        </p>
      </Section>

      <Section title="5. How your data is used">
        <p>Your data is used to operate your account, rank you on the leaderboards, display your
        public profile, automatically sync your LeetCode statistics, and contact you if necessary
        about your account. We do not sell your data, and we do not use it for advertising.</p>
      </Section>

      <Section title="6. What is publicly visible">
        <p><strong>The following about you is publicly visible to anyone who visits the Platform,
        including people without an account:</strong> your name, SIC ID, year of study, LeetCode
        username (and a link to your public LeetCode profile), LeetCode solve counts/points/rank,
        and your profile picture if you've uploaded one.</p>
        <p><strong>Never displayed publicly:</strong> your email address and your WhatsApp number.</p>
        <p>By registering, you consent to this public display for as long as your account remains
        active.</p>
      </Section>

      <Section title="7. Third-party services">
        <p>Operating the Platform requires sharing limited data with:</p>
        <ul>
          <li><strong>LeetCode</strong> — your username is used to query your publicly available solve statistics (unofficial integration; see Section 12).</li>
          <li><strong>Cloudinary</strong> — stores your profile picture, if uploaded.</li>
          <li><strong>Brevo</strong> — delivers your one-time login codes.</li>
          <li><strong>MongoDB Atlas / Render</strong> — hosts the Platform's database and backend.</li>
        </ul>
      </Section>

      <Section title="8. Accuracy of LeetCode data">
        <p>
          Statistics are fetched automatically on a recurring schedule via an unofficial method,
          since LeetCode does not provide an official public API for this data. Displayed stats
          may lag behind your real activity, and syncing may occasionally fail without notice. We
          do not guarantee continuous accuracy or availability of this data.
        </p>
      </Section>

      <Section title="9. Acceptable use">
        <p>You agree not to impersonate another student, provide a LeetCode username that isn't
        genuinely yours, attempt to access another student's account or admin functionality
        without authorization, interfere with the Platform's infrastructure, or use the Platform
        for anything other than tracking and comparing coding progress among Silicon University
        students. Violations may result in suspension or permanent removal of your account.</p>
      </Section>

      <Section title="10. Data retention and automatic account deletion">
        <p style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          This section describes an automated process that permanently deletes account data.
          Please read it carefully.
        </p>
        <p>
          Your year of study advances automatically over time (or may be corrected manually).{" "}
          <strong>
            Approximately one year after your account reaches Year 4, your account — including
            your profile, LeetCode statistics history, profile picture, and all associated data —
            is automatically and permanently deleted. This deletion is irreversible.
          </strong>
        </p>
        <p>
          If you believe your year of study is incorrect, or want your account removed sooner,
          contact an administrator (Section 11). This automatic deletion exists both as a
          data-minimization practice and to keep the Platform's costs sustainable on free-tier
          infrastructure.
        </p>
      </Section>

      <Section title="11. Contact and data requests">
        <p>
          For questions about these terms, to report an error in your year or LeetCode username,
          to request early deletion of your account, or to report a violation by another user,
          contact an admin via the details on the{" "}
          <Link to="/about" style={{ color: "var(--accent)", fontWeight: 600 }}>
            About page
          </Link>
          .
        </p>
      </Section>

      <Section title="12. Disclaimers">
        <ul>
          <li>
            <strong>No official affiliation with LeetCode.</strong> "LeetCode" is a trademark of
            LeetCode LLC. Campus Code is an independent, unofficial tool, not endorsed by or
            affiliated with LeetCode.
          </li>
          <li><strong>Service provided "as is,"</strong> without warranties of availability, uptime, or fitness for a particular purpose.</li>
          <li><strong>No liability for indirect damages</strong> arising from use of, or inability to use, the Platform, to the fullest extent permitted by law.</li>
        </ul>
      </Section>

      <Section title="13. Changes to these terms">
        <p>
          These terms may be updated from time to time. Continued use of the Platform after
          changes are posted constitutes acceptance of the revised terms.
        </p>
      </Section>

      <Section title="14. Governing law">
        <p>These terms are governed by the laws of India.</p>
      </Section>

      <div style={{ textAlign: "center", marginTop: 40 }}>
        <Link to="/" className="btn btn-primary">
          Back to Campus Code
        </Link>
      </div>
    </div>
  );
}
