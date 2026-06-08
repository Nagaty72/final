'use client';

import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function TermsPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100/60 dark:bg-purple-900/30 border border-purple-200/50 dark:border-purple-800/50 text-purple-700 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider mb-6">
            Legal
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">Terms of Use</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Last updated: May 2026 &nbsp;·&nbsp; Please read carefully before using the platform.
          </p>
        </div>

        {/* Body */}
        <div className="space-y-10 text-slate-700 dark:text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1. Platform Purpose</h2>
            <p>
              Epicare is a national public health intelligence platform operated for <strong>educational, research, and epidemiological surveillance</strong> purposes. It is intended exclusively for use by authorized healthcare professionals, public health officials, hospital administrators, and institutional decision-makers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2. Research & Educational Disclaimer</h2>
            <p className="mb-3">
              All data, visualizations, forecasts, and AI-generated insights published on this platform are provided for <strong>informational and research purposes only</strong>. They do not replace professional medical judgment, clinical guidance, or official government health directives.
            </p>
            <p>
              Users must not rely solely on platform outputs for clinical decision-making, patient triage, or emergency response planning without corroboration from qualified medical personnel and official sources.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">3. Authorized Access</h2>
            <p className="mb-3">
              Access to Epicare is granted exclusively to verified individuals whose credentials have been approved by a platform administrator. Unauthorized access, credential sharing, or attempts to circumvent access controls are strictly prohibited.
            </p>
            <p>
              Each account is personal and non-transferable. Users are responsible for all activity that occurs under their credentials.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">4. Usage Limitations</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
              <li>Users may not extract, copy, or republish platform data without explicit written authorization.</li>
              <li>Automated scraping, bulk data harvesting, or API abuse is prohibited.</li>
              <li>The platform must not be used to process personally identifiable patient data outside the approved anonymization workflows.</li>
              <li>Any use that violates applicable national or international health data regulations is strictly forbidden.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">5. Intellectual Property</h2>
            <p>
              All platform interfaces, branding, source code, analytical models, and documentation are the intellectual property of the operating authority. No license to reproduce, distribute, or commercialize any platform asset is granted to users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">6. Limitation of Liability</h2>
            <p>
              The platform is provided &quot;as is.&quot; The operating authority makes no warranty — express or implied — regarding the accuracy, completeness, or fitness for purpose of any data or forecast. To the fullest extent permitted by law, we disclaim liability for decisions made based on platform outputs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">7. Amendments</h2>
            <p>
              These terms may be updated periodically. Continued use of the platform following notification of changes constitutes acceptance of the revised terms. Significant changes will be communicated via the platform&apos;s administrative notification system.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">8. Governing Law</h2>
            <p>
              These terms are governed by applicable Egyptian law. Any disputes arising from platform use shall be subject to the exclusive jurisdiction of competent courts in the Arab Republic of Egypt.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">9. Contact</h2>
            <p>
              For legal inquiries, contact{' '}
              <a href="mailto:legal@epicare.gov.eg" className="text-blue-600 dark:text-blue-400 hover:underline">legal@epicare.gov.eg</a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <span>&copy; {new Date().getFullYear()} Epicare — National Health Intelligence Platform</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-blue-500 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-blue-500 transition-colors font-medium text-blue-500">Terms</Link>
            <Link href="/support" className="hover:text-blue-500 transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
