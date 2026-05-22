'use client';

import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

const FAQ_ITEMS = [
  {
    q: 'Who can access the Epicare platform?',
    a: 'Access is restricted to verified healthcare professionals, hospital administrators, public health officials, and authorized institutional decision-makers. All accounts must be approved by a system administrator.',
  },
  {
    q: 'How do I request a new account?',
    a: 'Contact your institutional administrator or send a request to access@epicare.gov.eg with your full name, institution, job title, and official email address. Account requests are reviewed within 2–5 business days.',
  },
  {
    q: 'I forgot my password. What should I do?',
    a: 'Use the "Forgot Password" link on the login page. A password reset link will be sent to your registered institutional email. If you no longer have access to that email, contact support directly.',
  },
  {
    q: 'The map or dashboard is not loading correctly.',
    a: 'Ensure you are using a modern browser (Chrome 110+, Firefox 110+, Edge 110+, or Safari 16+). Disable any VPN or content blockers that may interfere with map tile requests. If the issue persists, describe it in detail to our support team.',
  },
  {
    q: 'Can I export data for use in external tools?',
    a: 'Authorized users can export reports via the Report Builder in PDF or Excel format. Bulk API extraction or automated data harvesting is not permitted without a formal data-sharing agreement.',
  },
  {
    q: 'Are the AI forecasts clinically accurate?',
    a: 'AI-generated forecasts are statistical models intended for epidemiological monitoring and research. They should not be used as the sole basis for clinical or emergency decisions. Always consult qualified medical professionals and official health directives.',
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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

      {/* Hero */}
      <div className="bg-gradient-to-b from-blue-600 to-blue-700 dark:from-blue-900/60 dark:to-[#0B1120] pt-16 pb-20 text-center text-white px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 border border-blue-400/30 text-blue-100 text-xs font-semibold uppercase tracking-wider mb-6">
          Help & Support
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">How can we help?</h1>
        <p className="text-blue-100 text-lg max-w-xl mx-auto">
          Reach out to the Epicare platform support team or browse the frequently asked questions below.
        </p>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16">

        {/* Contact Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {/* Email Support */}
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">General Support</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Platform issues, account questions, and general inquiries.
            </p>
            <a href="mailto:support@epicare.gov.eg" className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline">
              support@epicare.gov.eg
            </a>
          </div>

          {/* Technical Issues */}
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Technical Issues</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Bugs, data discrepancies, API access, or performance problems.
            </p>
            <a href="mailto:tech@epicare.gov.eg" className="text-purple-600 dark:text-purple-400 text-sm font-semibold hover:underline">
              tech@epicare.gov.eg
            </a>
          </div>

          {/* Data & Privacy */}
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Data & Privacy</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Privacy requests, data access, or compliance concerns.
            </p>
            <a href="mailto:privacy@epicare.gov.eg" className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold hover:underline">
              privacy@epicare.gov.eg
            </a>
          </div>
        </div>

        {/* Response time notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 flex items-start gap-3 mb-16">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Response time:</strong> Support requests are typically addressed within 1–3 business days. For urgent operational issues affecting active public health surveillance, include <em>"URGENT"</em> in your subject line.
          </p>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item, idx) => (
              <details
                key={idx}
                className="group bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between p-5 cursor-pointer select-none font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors list-none">
                  <span>{item.q}</span>
                  <svg className="w-5 h-5 text-slate-400 flex-shrink-0 ml-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-slate-600 dark:text-slate-400 text-sm leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-4">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <span>&copy; {new Date().getFullYear()} Epicare — National Health Intelligence Platform</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-blue-500 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-blue-500 transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-blue-500 transition-colors font-medium text-blue-500">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
