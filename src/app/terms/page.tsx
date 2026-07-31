import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms and conditions governing your use of Simcademy.",
  alternates: { canonical: "/terms" },
};

function Clause({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-100">{n}. {title}</h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14">
      <h1 className="text-3xl font-bold tracking-tight text-slate-50">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: July 2026</p>

      <p className="mt-6 text-[15px] leading-relaxed text-slate-300">
        These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to and use of Simcademy (the
        &ldquo;Service&rdquo;). By using the Service you agree to these Terms. If you do not agree, please do not use the
        Service.
      </p>

      <Clause n={1} title="The Service">
        <p>
          Simcademy is an educational platform providing interactive simulations and explanations of system-design and
          software-engineering concepts. It is provided for learning and informational purposes only.
        </p>
      </Clause>

      <Clause n={2} title="Educational use — no warranty of accuracy">
        <p>
          We work hard to keep our content and simulations accurate, but they are simplified models intended to teach.
          They are <strong>not</strong> a substitute for professional engineering judgment, official documentation, or
          production benchmarks. Do not rely on the Service for architecture, financial, legal, or operational decisions
          without independent verification. The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo;
          without warranties of any kind, express or implied.
        </p>
      </Clause>

      <Clause n={3} title="Acceptable use">
        <p>You agree not to misuse the Service, including by attempting to disrupt or compromise it, scraping it at a scale that degrades performance for others, or using it for any unlawful purpose.</p>
      </Clause>

      <Clause n={4} title="Intellectual property">
        <p>
          The Service, including its content, visualizations, and simulations, is owned by Simcademy and protected by
          applicable laws. You may use and share the material for personal, non-commercial learning with attribution.
          Third-party names and trademarks (e.g. Kafka, PostgreSQL, MongoDB) belong to their respective owners and are
          used for identification and educational purposes only.
        </p>
      </Clause>

      <Clause n={5} title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, Simcademy and its contributors shall not be liable for any indirect,
          incidental, or consequential damages arising from your use of, or inability to use, the Service.
        </p>
      </Clause>

      <Clause n={6} title="Changes">
        <p>We may update these Terms from time to time. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.</p>
      </Clause>

      <Clause n={7} title="Contact">
        <p>Questions about these Terms? Email us at <a href="mailto:hello@simcademy.app" className="text-sky-400 hover:text-sky-300">hello@simcademy.app</a>.</p>
      </Clause>
    </main>
  );
}
