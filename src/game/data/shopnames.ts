// Invented shop names for the signboards, in Malayalam with the English beneath.
// Placeholders: the owner of the project should review and replace them.
export type ShopName = { ml: string; en: string };

export const SHOP_NAMES: ShopName[] = [
  { ml: "ശ്രീ ലക്ഷ്മി ടെക്സ്റ്റൈൽസ്", en: "Sree Lakshmi Textiles" },
  { ml: "മാതാ മെഡിക്കൽസ്", en: "Matha Medicals" },
  { ml: "നാടൻ ബേക്കറി", en: "Nadan Bakery" },
  { ml: "കേരള സ്റ്റോഴ്സ്", en: "Kerala Stores" },
  { ml: "അമ്മ ഹോട്ടൽ", en: "Amma Hotel" },
  { ml: "ഗോൾഡൻ ജ്വല്ലറി", en: "Golden Jewellery" },
  { ml: "ഫ്രഷ് പച്ചക്കറി", en: "Fresh Vegetables" },
  { ml: "ജയ ഫാൻസി", en: "Jaya Fancy" },
  { ml: "സ്വാദ് ഹോട്ടൽ", en: "Swad Hotel" },
  { ml: "ഹരിത ബുക്സ്", en: "Haritha Books" },
];

export function shopNameFor(seed: number): ShopName {
  return SHOP_NAMES[Math.abs(Math.trunc(seed)) % SHOP_NAMES.length];
}
