"use client";

import { useEffect, useRef, useState } from "react";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

/* ================================================================== *
 * Message delivery semantics over an unreliable network.
 *  • at-most-once  : fire-and-forget, no retry → can LOSE messages.
 *  • at-least-once : retry until acked → never lost, but can DUPLICATE.
 *  • exactly-once  : at-least-once + dedup on message id → one effect.
 * Two failure scenarios drive the point: a lost ack vs a lost message.
 * ================================================================== */

type Mode = "at-most" | "at-least" | "exactly";
type Scenario = "ack-lost" | "msg-lost";

const MODES: { k: Mode; label: string }[] = [
  { k: "at-most", label: "At-most-once" },
  { k: "at-least", label: "At-least-once" },
  { k: "exactly", label: "Exactly-once" },
];

interface Step { stage: "producer" | "network" | "consumer"; text: string; kind: "info" | "ok" | "bad" | "warn" }

function build(mode: Mode, scenario: Scenario): { steps: Step[]; processed: number; verdict: { tone: "ok" | "bad"; text: string } } {
  const S: Step[] = [];
  const P = (text: string, kind: Step["kind"] = "info") => S.push({ stage: "producer", text, kind });
  const N = (text: string, kind: Step["kind"] = "info") => S.push({ stage: "network", text, kind });
  const C = (text: string, kind: Step["kind"] = "info") => S.push({ stage: "consumer", text, kind });

  if (mode === "at-most") {
    P("Producer sends msg#42 — fire-and-forget, no wait for ack");
    if (scenario === "msg-lost") {
      N("✕ message dropped in the network", "bad");
      C("Consumer: nothing arrives", "bad");
      return { steps: S, processed: 0, verdict: { tone: "bad", text: "LOST — at-most-once never retries, so a dropped message is gone forever." } };
    }
    N("→ message delivered", "ok");
    C("Consumer processes msg#42  (effect count: 1)", "ok");
    N("✕ ack lost — but at-most-once didn't wait for it anyway", "warn");
    return { steps: S, processed: 1, verdict: { tone: "ok", text: "Delivered once here — but only by luck. At-most-once trades safety for speed; on a lost message it would be gone." } };
  }

  if (mode === "at-least") {
    P("Producer sends msg#42 and waits for an ack");
    if (scenario === "msg-lost") {
      N("✕ message dropped", "bad");
      P("no ack within timeout → RESEND msg#42", "warn");
      N("→ delivered", "ok");
      C("Consumer processes msg#42  (effect count: 1)", "ok");
      N("→ ack delivered", "ok");
      return { steps: S, processed: 1, verdict: { tone: "ok", text: "Recovered — retrying guarantees the message is not lost. That's the whole point of at-least-once." } };
    }
    N("→ delivered", "ok");
    C("Consumer processes msg#42  (effect count: 1)", "ok");
    N("✕ ack lost on the way back", "bad");
    P("no ack within timeout → RESEND msg#42", "warn");
    N("→ delivered again", "warn");
    C("Consumer processes msg#42 AGAIN  (effect count: 2)", "bad");
    N("→ ack delivered", "ok");
    return { steps: S, processed: 2, verdict: { tone: "bad", text: "DUPLICATE — the lost ack triggered a resend and the consumer processed it twice. At-least-once needs idempotent consumers." } };
  }

  // exactly-once = at-least-once delivery + dedup by message id
  P("Producer sends msg#42 (id used for dedup) and waits for an ack");
  if (scenario === "msg-lost") {
    N("✕ message dropped", "bad");
    P("no ack → RESEND msg#42", "warn");
    N("→ delivered", "ok");
    C("id 42 not seen before → process  (effect count: 1)", "ok");
    N("→ ack delivered", "ok");
    return { steps: S, processed: 1, verdict: { tone: "ok", text: "Exactly once — retried so nothing is lost, and the id was new so it ran once." } };
  }
  N("→ delivered", "ok");
  C("id 42 not seen before → process  (effect count: 1)", "ok");
  N("✕ ack lost", "bad");
  P("no ack → RESEND msg#42", "warn");
  N("→ delivered again", "warn");
  C("id 42 ALREADY seen → skip (dedup)  (effect count: 1)", "ok");
  N("→ ack delivered", "ok");
  return { steps: S, processed: 1, verdict: { tone: "ok", text: "Exactly once — the resend arrived, but dedup on the message id dropped the duplicate. One effect." } };
}

const TOUR: TourStep[] = [
  { title: "Delivery semantics", body: "Networks lose messages and acks. How you handle that decides whether a message can be lost, duplicated, or processed exactly once." },
  { target: "[data-tour='ds-mode']", title: "Pick a guarantee", body: "At-most-once (no retry), at-least-once (retry), or exactly-once (retry + dedup)." },
  { target: "[data-tour='ds-scenario']", title: "Choose what fails", body: "A lost ack (classic duplicate trigger) or a lost message (classic loss trigger)." },
  { target: "[data-tour='ds-run']", title: "Run it", body: "Watch the producer, network, and consumer — and count how many times the message actually took effect." },
];

export function DeliverySemanticsViz() {
  const [mode, setMode] = useState<Mode>("at-least");
  const [scenario, setScenario] = useState<Scenario>("ack-lost");
  const [steps, setSteps] = useState<Step[]>([]);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<{ processed: number; verdict: { tone: "ok" | "bad"; text: string } } | null>(null);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const clear = () => {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => () => clear(), []);

  const reset = () => {
    clear();
    setSteps([]);
    setTick(0);
    setResult(null);
    setPlaying(false);
  };

  const run = () => {
    clear();
    const { steps: s, processed, verdict } = build(mode, scenario);
    setSteps(s);
    setTick(0);
    setResult(null);
    setPlaying(true);
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      setTick(i);
      if (i >= s.length) {
        clear();
        setResult({ processed, verdict });
        setPlaying(false);
      }
    }, 900);
  };

  const shown = steps.slice(0, tick);
  const cur = shown[shown.length - 1];
  const stageOn = (st: Step["stage"]) => cur?.stage === st;

  return (
    <div className="not-prose rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5" data-tour="ds-mode">
          {MODES.map((m) => (
            <button key={m.k} type="button" onClick={() => { setMode(m.k); reset(); }} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${mode === m.k ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:text-white"}`}>{m.label}</button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5" data-tour="ds-scenario">
          {([["ack-lost", "Ack lost"], ["msg-lost", "Message lost"]] as [Scenario, string][]).map(([k, label]) => (
            <button key={k} type="button" onClick={() => { setScenario(k); reset(); }} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${scenario === k ? "bg-fuchsia-500 text-slate-950" : "text-slate-300 hover:text-white"}`}>{label}</button>
          ))}
        </div>
        <button type="button" onClick={run} disabled={playing} data-tour="ds-run" className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50">Run</button>
        <button type="button" onClick={reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700">Reset</button>
      </div>

      {/* pipeline */}
      <div className="mb-3 flex items-center justify-center gap-2">
        <Box title="Producer" on={stageOn("producer")} tone="sky" />
        <span className="text-slate-600">→</span>
        <Box title="Network" on={stageOn("network")} tone="amber" />
        <span className="text-slate-600">→</span>
        <Box title="Consumer" on={stageOn("consumer")} tone="emerald" />
      </div>

      {/* log */}
      <div className="min-h-[120px] space-y-1">
        {shown.length === 0 ? (
          <p className="text-xs text-slate-600">Pick a guarantee and a failure, then Run to see if the message is lost, duplicated, or delivered exactly once.</p>
        ) : (
          shown.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px]">
              <span className={`shrink-0 font-mono text-[10px] font-bold uppercase ${s.stage === "producer" ? "text-sky-300" : s.stage === "network" ? "text-amber-300" : "text-emerald-300"}`}>{s.stage.slice(0, 4)}</span>
              <span className={s.kind === "bad" ? "text-red-300" : s.kind === "ok" ? "text-emerald-300" : s.kind === "warn" ? "text-amber-300" : "text-slate-300"}>{s.text}</span>
            </div>
          ))
        )}
      </div>

      {result ? (
        <div className={`mt-2 rounded-lg border px-3 py-2 text-sm ${result.verdict.tone === "ok" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/50 bg-red-500/10 text-red-300"}`}>
          <span className="font-semibold">Effect count: {result.processed}</span> — {result.verdict.text}
        </div>
      ) : null}

      <GuidedTour tourId="delivery-semantics" steps={TOUR} autoStart={false} />
    </div>
  );
}

function Box({ title, on, tone }: { title: string; on: boolean; tone: "sky" | "amber" | "emerald" }) {
  const active = tone === "sky" ? "border-sky-400 bg-sky-500/15 text-sky-200" : tone === "amber" ? "border-amber-400 bg-amber-500/15 text-amber-200" : "border-emerald-400 bg-emerald-500/15 text-emerald-200";
  return <div className={`w-24 rounded-lg border px-2 py-2 text-center text-xs font-semibold ${on ? active : "border-slate-700 bg-slate-900 text-slate-400"}`}>{title}</div>;
}
