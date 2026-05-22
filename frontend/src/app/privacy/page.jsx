'use client';

import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">Epicare</span>
              <div className="text-[8px] font-semibold tracking-widest uppercase text-slate-400 leading-none">National Health Intelligence</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/" className="text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/60 dark:bg-blue-900/30 border border-blue-200/50 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            Legal
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">Privacy Policy</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Last updated: May 2026 &nbsp;·&nbsp; Effective immediately
          </p>
        </div>

        {/* Body */}
        <div className="space-y-10 text-slate-700 dark:text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1. Overview</h2>
            <p>
              Epicare — National Health Intelligence Platform is operated by a national public-health authority. This Privacy Policy describes how we collect, process, store, and protect data in connection with the use of this platform. By accessing or using Epicare, you acknowledge that you have read and understood this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2. Data We Collect</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
              <li><strong className="text-slate-800 dark:text-slate-200">Account information</strong> — Name, institutional email, and role assigned by a system administrator.</li>
              <li><strong className="text-slate-800 dark:text-slate-200">Usage telemetry</strong> — Page views, feature interactions, and session metadata used to improve the platform.</li>
              <li><strong className="text-slate-800 dark:text-slate-200">Epidemiological data</strong> — Anonymized patient records, disease case counts, and hospital statistics submitted by authorized healthcare facilities.</li>
              <li><strong className="text-slate-800 dark:text-slate-200">Technical data</strong> — IP addresses, browser type, and device identifiers for security auditing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">3. Analytics Disclaimer</h2>
            <p className="mb-3">
              All analytics, trend forecasts, and AI-generated outputs presented in this platform are derived from aggregated, de-identified datasets and are intended solely for <strong>public health intelligence and decision support</strong>. They do not constitute clinical diagnoses, treatment recommendations, or medically actionable advice.
            </p>
            <p>
              Statistical models carry inherent uncertainties. Predictions should be interpreted in conjunction with domain expertise and official epidemiological protocols.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">4. Healthcare Data Notice</h2>
            <p className="mb-3">
              Epicare processes healthcare-related data in strict compliance with applicable national health data regulations. All patient-identifiable information is:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
              <li>Anonymized or pseudonymized before ingestion into the analytics engine.</li>
              <li>Accessible only to authorized personnel with role-based access controls.</li>
              <li>Never sold, shared with third parties, or used for commercial purposes.</li>
              <li>Retained in accordance with national health records retention guidelines.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">5. Data Security</h2>
            <p>
              We employ industry-standard security measures including AES-256 encryption at rest, TLS 1.3 in transit, multi-factor authentication for administrative accounts, and continuous security auditing. Access is strictly controlled via role-based permissions enforced at both the API and database layers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">6. Your Rights</h2>
            <p>
              Authorized platform users may request access to, correction of, or deletion of their account data by contacting the platform administrator through the <Link href="/support" className="text-blue-600 dark:text-blue-400 hover:underline">Support page</Link>. Healthcare record data is managed under separate institutional data governance policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">7. Contact</h2>
            <p>
              For privacy-related inquiries, contact us at{' '}
              <a href="mailto:privacy@epicare.gov.eg" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@epicare.gov.eg</a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <span>&copy; {new Date().getFullYear()} Epicare — National Health Intelligence Platform</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-blue-500 transition-colors font-medium text-blue-500">Privacy</Link>
            <Link href="/terms" className="hover:text-blue-500 transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-blue-500 transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
