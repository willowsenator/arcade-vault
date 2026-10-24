export type RampPoint = { value: number; time: number };
export type RecordedTone = {
  freq: number;
  type: OscillatorType;
  start: number;
  stop: number;
  gain: RampPoint[];
  sweepTo?: RampPoint;
  stopped: boolean;
};

/** A recording Web Audio context driven by an explicit audio clock. */
export function fakeAudio(options: { state?: AudioContextState; resumable?: boolean } = {}) {
  const tones: RecordedTone[] = [];
  let resumeCalls = 0;
  const context = {
    currentTime: 0,
    state: options.state ?? "running",
    destination: {},
    resume() {
      resumeCalls++;
      if (options.resumable !== false) context.state = "running";
      return Promise.resolve();
    },
    createGain() {
      const points: RampPoint[] = [];
      return {
        points,
        gain: {
          setValueAtTime(value: number, time: number) { points.push({ value, time }); },
          linearRampToValueAtTime(value: number, time: number) { points.push({ value, time }); },
        },
        connect() {},
        disconnect() {},
      };
    },
    createOscillator() {
      const tone: RecordedTone = { freq: 0, type: "sine", start: 0, stop: 0, gain: [], stopped: false };
      return {
        get type() { return tone.type; },
        set type(value: OscillatorType) { tone.type = value; },
        frequency: {
          setValueAtTime(value: number) { tone.freq = value; },
          linearRampToValueAtTime(value: number, time: number) { tone.sweepTo = { value, time }; },
        },
        connect(gain: { points: RampPoint[] }) { tone.gain = gain.points; },
        disconnect() {},
        start(time: number) { tone.start = time; tones.push(tone); },
        stop(time?: number) {
          if (time === undefined) tone.stopped = true;
          else tone.stop = time;
        },
      };
    },
  };
  return {
    createContext: () => context as unknown as AudioContext,
    tones,
    get resumeCalls() { return resumeCalls; },
    advance(seconds: number) { context.currentTime += seconds; },
  };
}
