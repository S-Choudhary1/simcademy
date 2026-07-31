"use client";

import { useCallback, useEffect, useState } from "react";
import { RequestSimEngine, type Blueprint, type ChaosKind, type SimSnapshot } from "../engine";
import type { StationConfig } from "../registry";

export interface RequestSimController {
  snapshot: SimSnapshot;
  isRunning: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  setConfig: (nodeId: string, key: keyof StationConfig, value: number) => void;
  applyChaos: (nodeId: string, kind: ChaosKind) => void;
}

/** Drives a RequestSimEngine from a rAF loop (same compiler-safe shape as useSimulation). */
export function useRequestSim(blueprint: Blueprint, opts: { seed?: number } = {}): RequestSimController {
  const [engine] = useState(
    () => new RequestSimEngine(blueprint, opts.seed ? { seed: opts.seed } : {}),
  );
  const [snapshot, setSnapshot] = useState<SimSnapshot>(() => engine.getSnapshot());
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    engine.play();
    let raf = 0;
    let last: number | null = null;
    const loop = (ts: number) => {
      if (last === null) last = ts;
      const dt = ts - last;
      last = ts;
      engine.tick(dt);
      setSnapshot(engine.getSnapshot());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      engine.pause();
    };
  }, [engine, isRunning]);

  const play = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const toggle = useCallback(() => setIsRunning((r) => !r), []);
  const reset = useCallback(() => {
    engine.reset();
    setIsRunning(false);
    setSnapshot(engine.getSnapshot());
  }, [engine]);
  const setConfig = useCallback(
    (nodeId: string, key: keyof StationConfig, value: number) => {
      engine.setConfig(nodeId, key, value);
      setSnapshot(engine.getSnapshot());
    },
    [engine],
  );
  const applyChaos = useCallback(
    (nodeId: string, kind: ChaosKind) => {
      engine.applyChaos(nodeId, kind);
      setSnapshot(engine.getSnapshot());
    },
    [engine],
  );

  return { snapshot, isRunning, play, pause, toggle, reset, setConfig, applyChaos };
}
