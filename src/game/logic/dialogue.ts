import type { Request } from "./requests";
import type { Line } from "./speech";

// What the customer says at the pickup, in Malayalam with an English gloss.
// Chosen from the request's id so the same ride always sounds the same. The
// wording is invented, everyday Kerala speech; a native speaker should check it.
export type Dialogue = { name: string; ml: string; en: string; bubble: Line };

type Template = { ml: (place: string) => string; en: (place: string) => string };

const TEMPLATES: Template[] = [
  { ml: (p) => `ചേട്ടാ, ${p}-ലേക്ക് പോകണം.`, en: (p) => `Chetta, I need to go to ${p}.` },
  { ml: (p) => `${p} വരെ ഒന്ന് കൊണ്ടുപോകാമോ?`, en: (p) => `Can you take me up to ${p}?` },
  { ml: (p) => `നമസ്കാരം, ${p}-ലേക്ക് പോണം, വേഗം വേണം.`, en: (p) => `Namaskaram, I want to go to ${p}, quickly please.` },
  { ml: (p) => `${p}-ലേക്ക് പോകാനാണ്, വരുമോ?`, en: (p) => `I am going to ${p}, will you come?` },
];

const GROUP: Record<2 | 3, { ml: string; en: string }> = {
  2: { ml: "ഞങ്ങൾ രണ്ടുപേർ ഉണ്ട്. ", en: "There are two of us. " },
  3: { ml: "ഞങ്ങൾ മൂന്നുപേർ ഉണ്ട്. ", en: "There are three of us. " },
};

// a small, stable number from the request id
function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function dialogueFor(request: Request): Dialogue {
  const t = TEMPLATES[hash(request.id) % TEMPLATES.length];
  const group = request.group > 1 ? GROUP[request.group as 2 | 3] : { ml: "", en: "" };
  const { ml: place, name } = request.drop;
  return {
    name: request.customer,
    ml: group.ml + t.ml(place),
    en: group.en + t.en(name),
    bubble: { ml: `${place}-ലേക്ക്`, en: `To ${name}` },
  };
}
