import type { Metadata } from "next";
import { Playground } from "@/sim/ui/Playground";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Build a system-design architecture from components — services, caches, queues, load balancers, databases — send real traffic through it, and watch latency, throughput, and errors respond. Inject failures, add pods, and auto-scale.",
};

export default function PlaygroundPage() {
  return (
    <main className="mx-auto flex h-[calc(100dvh-3.25rem)] w-full max-w-[1500px] flex-col px-3 py-2">
      <div className="min-h-0 flex-1">
        <Playground />
      </div>
    </main>
  );
}
