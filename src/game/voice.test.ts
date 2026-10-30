// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useGame } from "./state/store";
import { cancelSpeech, pickVoice, speakLine } from "./voice";

type FakeVoice = { lang: string; name: string };
const spoken: { text: string; lang: string; voice: FakeVoice | null; pitch: number }[] = [];
let cancelled = 0;
let voices: FakeVoice[] = [];

class FakeUtterance {
  text: string;
  lang = "";
  voice: FakeVoice | null = null;
  pitch = 1;
  rate = 1;
  volume = 1;
  constructor(text: string) {
    this.text = text;
  }
}

beforeEach(() => {
  spoken.length = 0;
  cancelled = 0;
  voices = [];
  useGame.setState({ muted: false });
  (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance = FakeUtterance;
  (window as unknown as Record<string, unknown>).speechSynthesis = {
    getVoices: () => voices,
    speak: (u: FakeUtterance) => spoken.push({ text: u.text, lang: u.lang, voice: u.voice, pitch: u.pitch }),
    cancel: () => {
      cancelled++;
    },
  };
});
afterEach(() => {
  delete (window as unknown as Record<string, unknown>).speechSynthesis;
});

const line = { ml: "അയ്യോ!", en: "Oh my God!" };

describe("pickVoice", () => {
  const v = (lang: string, name = lang): SpeechSynthesisVoice => ({ lang, name }) as SpeechSynthesisVoice;
  it("prefers a Malayalam voice", () => {
    expect(pickVoice([v("en-US"), v("ml-IN", "Midhun")], "ml")?.name).toBe("Midhun");
  });
  it("accepts the underscore form some systems use", () => {
    expect(pickVoice([v("en-US"), v("ml_IN", "Sobhana")], "ml")?.name).toBe("Sobhana");
  });
  it("finds nothing when there is no such language", () => {
    expect(pickVoice([v("en-US"), v("hi-IN")], "ml")).toBeNull();
    expect(pickVoice([], "ml")).toBeNull();
  });
});

describe("speakLine", () => {
  it("says the Malayalam shout in a Malayalam voice when the device has one", () => {
    voices = [{ lang: "en-IN", name: "Ravi" }, { lang: "ml-IN", name: "Midhun" }];
    speakLine(line);
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toMatchObject({ text: "അയ്യോ!", lang: "ml-IN" });
    expect(spoken[0].voice?.name).toBe("Midhun");
  });

  it("still asks for Malayalam while voices are loading", () => {
    voices = [];
    speakLine(line);
    expect(spoken[0]).toMatchObject({ text: "അയ്യോ!", lang: "ml-IN" });
  });

  it("falls back to the English shout when voices exist but none are Malayalam", () => {
    voices = [{ lang: "en-IN", name: "Ravi" }];
    speakLine(line);
    expect(spoken[0]).toMatchObject({ text: "Oh my God!", lang: "en-IN" });
  });

  it("varies the pitch between people", () => {
    speakLine(line, 1.3);
    expect(spoken[0].pitch).toBeCloseTo(1.3);
  });

  it("cuts off the previous shout instead of queueing them", () => {
    speakLine(line);
    speakLine(line);
    expect(cancelled).toBe(2);
  });

  it("is silent when the sound button has muted the game", () => {
    useGame.setState({ muted: true });
    speakLine(line);
    expect(spoken).toHaveLength(0);
  });

  it("does nothing, without throwing, on a browser with no speech support", () => {
    delete (window as unknown as Record<string, unknown>).speechSynthesis;
    expect(() => speakLine(line)).not.toThrow();
    expect(() => cancelSpeech()).not.toThrow();
  });

  it("can be cancelled", () => {
    cancelSpeech();
    expect(cancelled).toBe(1);
  });
});
