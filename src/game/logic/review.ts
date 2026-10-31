// What a customer thinks of the ride when they get out: stars, a tip for a good one, and a
// line in Malayalam (with the English) that matches what went wrong. Pure and seeded.
// The Malayalam wording is invented everyday speech; please have a native speaker check it.
export const SPEED_LIMIT_MS = 40 / 3.6; // the 40 km/h on the signs
export const TIP_FIVE = 20;
export const TIP_FOUR = 10;
const SLOW_FACTOR = 1.6; // a ride this many times the target time is called slow
const SCRAPES_NOTICED = 3;

export const isSpeeding = (speed: number): boolean => Math.abs(speed) > SPEED_LIMIT_MS;

export type RideStats = {
  accidents: number;
  redLights: number;
  wrongTurns: number;
  harsh: number; // scrapes against the kerb
  speedingS: number; // seconds over the limit
  elapsedS: number;
  targetS: number;
};

export type Reason = "good" | "accident" | "speeding" | "signal" | "turn" | "scrape" | "slow";
export type Mood = "happy" | "pleased" | "annoyed" | "angry" | "furious";
export type Review = { stars: 1 | 2 | 3 | 4 | 5; tip: number; ml: string; en: string; chips: string[]; worst: Reason; mood: Mood; pitch: number };
type Line = { ml: string; en: string };

const GOOD: Line[] = [
  { ml: "നന്ദി! വളരെ സുഖമുള്ള യാത്ര, സുരക്ഷിതമായി എത്തി.", en: "Thank you! A lovely, safe ride." },
  { ml: "കൊള്ളാം ചേട്ടാ, നല്ല ഡ്രൈവിംഗ്. ഇനിയും വരാം!", en: "Well done, brother, lovely driving. I'll ride with you again!" },
  { ml: "ഒരു പരാതിയുമില്ല, അഞ്ച് സ്റ്റാർ!", en: "No complaints at all, five stars!" },
  { ml: "സമയത്തിന് എത്തിച്ചതിന് നന്ദി, ദൈവം അനുഗ്രഹിക്കട്ടെ!", en: "Thanks for getting me there on time, God bless!" },
];

const MILD: Record<Exclude<Reason, "good" | "accident">, Line[]> = {
  speeding: [
    { ml: "ഇത്തിരി വേഗത കൂടുതലായിരുന്നു ചേട്ടാ.", en: "A little too fast, brother." },
    { ml: "കുറച്ച് പതുക്കെ പോകാമായിരുന്നു, പക്ഷേ കുഴപ്പമില്ല.", en: "You could have gone a bit slower, but it's fine." },
  ],
  signal: [
    { ml: "ചുവപ്പ് ലൈറ്റ് ശ്രദ്ധിക്കണം കേട്ടോ.", en: "Please watch the red light." },
    { ml: "സിഗ്നൽ ഒന്ന് നോക്കണേ, പിന്നെ നല്ല യാത്രയായിരുന്നു.", en: "Do watch the signal; otherwise a good ride." },
  ],
  turn: [
    { ml: "ആ തിരിവ് അനുവദനീയമല്ലായിരുന്നു കേട്ടോ.", en: "That turn wasn't allowed, you know." },
    { ml: "ബോർഡ് നോക്കി തിരിയണം, എന്നാലും കുഴപ്പമില്ല.", en: "Do look at the signs before turning, but never mind." },
  ],
  scrape: [
    { ml: "വണ്ടി ഇടയ്ക്ക് കല്ലിൽ ഉരസി, സൂക്ഷിക്കണം.", en: "The vehicle scraped the kerb now and then, be careful." },
    { ml: "ഇത്തിരി കൂടി ശ്രദ്ധിച്ച് ഓടിക്കൂ.", en: "Drive with a little more care." },
  ],
  slow: [
    { ml: "കുറച്ച് വൈകി, എങ്കിലും സുരക്ഷിതമായി എത്തി.", en: "A bit late, but I arrived safely." },
    { ml: "കുറച്ച് വേഗത്തിൽ പോകാമായിരുന്നു.", en: "You could have gone a bit quicker." },
  ],
};

const HARSH: Record<Exclude<Reason, "good">, Line[]> = {
  accident: [
    { ml: "അയ്യോ! അപകടമുണ്ടാക്കിയല്ലോ, ഇങ്ങനെയാണോ ഓടിക്കുന്നത്?", en: "Oh no! You caused an accident, is this how you drive?" },
    { ml: "പേടിച്ചുപോയി! ഇനി ഈ വണ്ടിയിൽ കയറില്ല!", en: "I got so scared! I'll never ride in this vehicle again!" },
    { ml: "ഇടിച്ചിട്ടല്ലേ ഓടിക്കുന്നത്, ലൈസൻസ് എവിടെ?", en: "You drive by crashing into things, where is your licence?" },
  ],
  speeding: [
    { ml: "എന്തൊരു വേഗതയാണിത്! ഞാൻ പേടിച്ചു വിറച്ചു!", en: "What a speed! I'm trembling with fear!" },
    { ml: "പതുക്കെ പോടോ, ജീവനിൽ കൊതിയുണ്ട്!", en: "Go slowly, I love my life!" },
    { ml: "റേസിംഗ് ട്രാക്കാണെന്ന് കരുതിയോ?", en: "Did you think this was a racing track?" },
  ],
  signal: [
    { ml: "ചുവപ്പ് ലൈറ്റിൽ നിർത്താറില്ലേ? ഇതെന്ത് ഡ്രൈവിംഗ്!", en: "Don't you stop at red lights? What kind of driving is this!" },
    { ml: "സിഗ്നൽ ചുവപ്പായിരുന്നു, കണ്ണ് കാണില്ലേ!", en: "The signal was red, can't you see!" },
    { ml: "നിയമം പാലിക്കാത്ത ഡ്രൈവർ, ഞാൻ പരാതി കൊടുക്കും!", en: "A driver who doesn't follow the rules, I'll complain!" },
  ],
  turn: [
    { ml: "നിയമം തെറ്റിച്ച് തിരിച്ചല്ലോ, പോലീസ് പിടിക്കും!", en: "You turned against the rules, the police will catch you!" },
    { ml: "അവിടെ തിരിയാൻ പറ്റില്ലെന്ന് അറിയില്ലേ?", en: "Don't you know you can't turn there?" },
    { ml: "ഇതെന്ത് ഡ്രൈവിംഗാണ്, ബോർഡ് കണ്ടില്ലേ?", en: "What driving is this, didn't you see the sign?" },
  ],
  scrape: [
    { ml: "വണ്ടി മുഴുവൻ ഇടിച്ചും ഉരസിയും, ഇങ്ങനെയാണോ?", en: "The vehicle kept banging and scraping, is that how it's done?" },
    { ml: "കല്ലിൽ ഇടിച്ച് ഇടിച്ച് എന്റെ നടുവൊടിഞ്ഞു!", en: "You hit the kerb so many times, my back is broken!" },
  ],
  slow: [
    { ml: "ഇത്ര പതുക്കെയോ? ഞാൻ നടന്നിരുന്നെങ്കിൽ നേരത്തെ എത്തിയേനെ!", en: "So slow? I would have got there sooner on foot!" },
    { ml: "എത്ര നേരമായി! ഇതൊരു ആമയാണോ?", en: "How long has it been! Is this a tortoise?" },
  ],
};

function mix(seed: number, salt: number): number {
  let h = Math.imul((seed | 0) ^ salt, 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
const pick = <T,>(list: T[], seed: number, salt: number): T => list[Math.floor(mix(seed, salt) * list.length)];

const MOODS: Mood[] = ["furious", "angry", "annoyed", "pleased", "happy"]; // by stars 1..5
const PITCH: Record<Mood, number> = { happy: 1.05, pleased: 1.0, annoyed: 1.0, angry: 1.1, furious: 1.18 };

export function reviewRide(s: RideStats, seed: number): Review {
  const speedingPenalty = s.speedingS < 3 ? 0 : s.speedingS < 20 ? 1 : 2;
  const slow = s.elapsedS > s.targetS * SLOW_FACTOR;
  const scrapes = s.harsh >= SCRAPES_NOTICED;
  const penalty = 2 * s.accidents + s.redLights + s.wrongTurns + speedingPenalty + (scrapes ? 1 : 0) + (slow ? 1 : 0);
  const stars = Math.max(1, Math.min(5, 5 - penalty)) as Review["stars"];

  const worst: Reason =
    s.accidents > 0 ? "accident"
    : speedingPenalty === 2 ? "speeding"
    : s.redLights > 0 ? "signal"
    : s.wrongTurns > 0 ? "turn"
    : speedingPenalty === 1 ? "speeding"
    : scrapes ? "scrape"
    : slow ? "slow"
    : "good";

  const chips: string[] = [];
  if (s.accidents) chips.push(`Accident ×${s.accidents}`);
  if (s.redLights) chips.push(`Red light ×${s.redLights}`);
  if (s.wrongTurns) chips.push(`Wrong turn ×${s.wrongTurns}`);
  if (speedingPenalty) chips.push(`Over the limit ${Math.round(s.speedingS)} s`);
  if (scrapes) chips.push(`Kerb scrapes ×${s.harsh}`);
  if (slow) chips.push("Slow ride");

  const mood = MOODS[stars - 1];
  const line: Line = worst === "good" ? pick(GOOD, seed, 0x11) : stars >= 4 && worst !== "accident" ? pick(MILD[worst], seed, 0x22) : pick(HARSH[worst], seed, 0x33);
  return { stars, tip: stars === 5 ? TIP_FIVE : stars === 4 ? TIP_FOUR : 0, ml: line.ml, en: line.en, chips, worst, mood, pitch: PITCH[mood] };
}
