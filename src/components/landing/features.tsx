"use client";

import { motion } from "motion/react";
import {
  Activity,
  Layers,
  Target,
  Route,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: Activity,
    title: "7-Layer Business Scan",
    body: "We x-ray your business across the 7 layers that actually move revenue — model, leads, sales, team, time, and more.",
  },
  {
    icon: Target,
    title: "Find the #1 bottleneck",
    body: "Most owners fix the wrong thing. The scan pinpoints the single constraint costing you the most right now.",
  },
  {
    icon: Layers,
    title: "Business Health Score",
    body: "A clear 0–100 score and stage (Foundation / Growth / Scale) so you know exactly where you stand.",
  },
  {
    icon: Route,
    title: "Personalised 60-day roadmap",
    body: "Not generic advice — a focus plan built from your answers, prioritised by leverage.",
  },
  {
    icon: GraduationCap,
    title: "The right next program",
    body: "From the ₹99 X-Ray to the full transformation — you're matched to exactly what fits your stage.",
  },
  {
    icon: ShieldCheck,
    title: "No fluff, no signup wall",
    body: "See your full report instantly. We earn the next step by being genuinely useful first.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative bg-secondary/40 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 max-w-2xl">
          <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
            — Why the Business X-Ray
          </div>
          <h2 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            Clarity on what to fix first.{" "}
            <span className="text-brand-gradient">In 7 minutes.</span>
          </h2>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="group relative bg-background p-8 transition-colors hover:bg-card"
            >
              <div className="mb-5 inline-flex size-9 items-center justify-center rounded-lg bg-brand-gradient text-white">
                <f.icon className="size-4" />
              </div>
              <div className="text-base font-semibold tracking-tight">{f.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
