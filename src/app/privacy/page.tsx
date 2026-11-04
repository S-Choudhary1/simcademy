import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Simcademy handles your data — the short version: we keep it minimal.",
  alternates: { canonical: "/privacy" },
};

function Clause({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-100">{n}. {title}</h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14">
      <h1 className="text-3xl font-bold tracking-tight text-slate-50">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: July 2026</p>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-[15px] leading-relaxed text-slate-300">
        <strong className="text-slate-100">The short version:</strong>{" "}Simcademy is a learning site. You don&rsquo;t need
        an account to use it, we don&rsquo;t sell your data, and the simulations run in your browser.
      </div>

      <Clause n={1} title="Information we collect">
        <p>
          You can use Simcademy without creating an account or providing personal information. If you email us, we
          receive whatever you include in that message. We may collect anonymous, aggregated usage analytics (such as
          which pages are visited) to improve the Service; this does not identify you personally.
        </p>
      </Clause>

      <Clause n={2} title="Your browser stores your progress">
        <p>
          Some features — such as remembering that you&rsquo;ve seen a tour, or your current playground design — use your
          browser&rsquo;s <strong>local storage</strong>. This stays on your device and is not sent to us. You can clear
          it at any time through your browser settings.
        </p>
      </Clause>

      <Clause n={3} title="Cookies & tracking">
        <p>We keep tracking to a minimum. Any analytics we use are configured to avoid collecting personally identifiable information, and we do not use advertising trackers.</p>
      </Clause>

      <Clause n={4} title="Third-party services">
        <p>The Service may be hosted and served through third-party infrastructure providers, who process technical data (such as your IP address) as needed to deliver the site securely. These providers act as processors on our behalf.</p>
      </Clause>

      <Clause n={5} title="Your rights">
        <p>You may request information about, or deletion of, any personal data we hold about you (for most visitors, that&rsquo;s simply nothing). Contact us to make a request.</p>
      </Clause>

      <Clause n={6} title="Changes">
        <p>We may update this policy over time. The &ldquo;last updated&rdquo; date above reflects the latest revision.</p>
      </Clause>

      <Clause n={7} title="Contact">
        <p>Privacy questions? Email <a href="mailto:hello@simcademy.app" className="text-sky-400 hover:text-sky-300">hello@simcademy.app</a>.</p>
      </Clause>
    </main>
  );
}
