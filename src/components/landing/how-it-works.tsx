"use client";

import { motion } from "motion/react";

const STEPS = [
  {
    n: "01",
    title: "Take the 7-minute scan",
    body: "Answer 21 questions across the 7 business layers. No signup needed to start.",
  },
  {
    n: "02",
    title: "Get your scored report",
    body: "Instant Business Health Score, your stage, and your top 3 priority bottlenecks — explained in plain English.",
  },
  {
    n: "03",
    title: "See your roadmap",
    body: "A personalised 60-day focus plan, prioritised by what moves revenue fastest for you.",
  },
  {
    n: "04",
    title: "Pick the right program",
    body: "Matched to your stage: the ₹99 X-Ray sprint, the ₹9,999 Acceleration Engine, or the ₹49,999 CEO Command Centre.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-16 max-w-2xl">
          <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
            — How it works
          </div>
          <h2 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            From confusion to a clear plan,{" "}
            <span className="text-brand-gradient">in four steps.</span>
          </h2>
        </div>

        <ol className="grid gap-px overflow-hidden rounded-2xl bg-border md:grid-cols-2">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-background p-8"
            >
              <div className="font-display text-5xl leading-none text-brand-gradient">{s.n}</div>
              <div className="mt-6">
                <div className="text-lg font-semibold tracking-tight">{s.title}</div>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
