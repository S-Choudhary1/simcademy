import type { Metadata } from "next";
import { SimulatorHub } from "@/sim/ui/SimulatorHub";

export const metadata: Metadata = {
  title: "Simulator Playground",
  description:
    "One lab for every simulator: build an architecture and run real traffic through it, or open any concept's interactive visualization — CAP, saga, consistent hashing, rate limiting, and more.",
};

export default function PlaygroundPage() {
  return (
    <main className="mx-auto flex h-[calc(100dvh-3.25rem)] w-full max-w-[1500px] flex-col px-3 py-2">
      <div className="min-h-0 flex-1">
        <SimulatorHub />
      </div>
    </main>
  );
}
