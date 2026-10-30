import { describe, expect, it } from "vitest";
import { personFor, type Kind, type PersonSpec } from "./people";

const HEX = /^#[0-9a-f]{6}$/i;
const ids = Array.from({ length: 600 }, (_, i) => `p${i + 1}`);
const all = ids.map((id) => personFor(id));
const byKind = (k: Kind) => all.filter((p) => p.kind === k);

describe("personFor", () => {
  it("always gives the same person for the same passenger", () => {
    expect(personFor("p42")).toEqual(personFor("p42"));
  });

  it("produces a mix of every kind of person", () => {
    const kinds = new Set(all.map((p) => p.kind));
    for (const k of ["boy", "girl", "man", "woman", "elderMan", "elderWoman"] as Kind[]) {
      expect(kinds.has(k)).toBe(true);
    }
    // a bus load is mostly adults, with children and elders a minority
    expect(byKind("man").length + byKind("woman").length).toBeGreaterThan(all.length * 0.4);
  });

  it("gives every person valid colours and a believable height", () => {
    for (const p of all) {
      for (const c of [p.skin, p.hairColor, p.top, p.bottom, p.footwearColor]) expect(c).toMatch(HEX);
      expect(p.scale).toBeGreaterThan(0.6);
      expect(p.scale).toBeLessThan(1.1);
    }
  });

  it("dresses boys in a t-shirt, pants and shoes", () => {
    for (const p of byKind("boy")) {
      expect(p.outfit).toBe("tshirt-pants");
      expect(p.bottomKind).toBe("trousers");
      expect(p.footwear).toBe("shoes");
      expect(p.scale).toBeLessThan(0.9);
    }
  });

  it("dresses ordinary girls in a frock", () => {
    for (const p of byKind("girl")) {
      expect(p.outfit).toBe("frock");
      expect(p.bottomKind).toBe("skirt");
    }
  });

  it("dresses men either casually or formally", () => {
    const outfits = new Set(byKind("man").map((p) => p.outfit));
    expect(outfits).toEqual(new Set(["casual", "formal"]));
    for (const p of byKind("man")) {
      if (p.outfit === "formal") {
        expect(p.extras).toContain("tie");
        expect(p.bottomKind).toBe("trousers");
        expect(p.footwear).toBe("shoes");
      } else {
        expect(p.extras).not.toContain("tie");
      }
    }
  });

  it("dresses old men in a short white lungi and slippers", () => {
    expect(byKind("elderMan").length).toBeGreaterThan(0);
    for (const p of byKind("elderMan")) {
      expect(p.outfit).toBe("mundu");
      expect(p.bottomKind).toBe("lungi");
      expect(p.bottom.toLowerCase()).toBe("#f5f2ea");
      expect(p.footwear).toBe("slippers");
      expect(p.hairColor.toLowerCase()).toBe("#d8d8d8"); // grey hair
    }
  });

  it("dresses women in churidhar, sari or a formal suit", () => {
    const outfits = new Set(byKind("woman").map((p) => p.outfit));
    expect(outfits).toEqual(new Set(["churidhar", "sari", "formal-suit"]));
    const of = (o: PersonSpec["outfit"]) => byKind("woman").filter((p) => p.outfit === o);
    for (const p of of("churidhar")) {
      expect(p.bottomKind).toBe("leggings");
      expect(p.extras).toContain("dupatta");
    }
    for (const p of of("sari")) {
      expect(p.bottomKind).toBe("sari");
      expect(p.extras).toContain("pallu");
    }
    for (const p of of("formal-suit")) {
      expect(p.extras).toContain("blazer");
      expect(p.footwear).toBe("heels");
    }
  });

  it("dresses old women in a plain white sari with a gold border", () => {
    expect(byKind("elderWoman").length).toBeGreaterThan(0);
    for (const p of byKind("elderWoman")) {
      expect(p.outfit).toBe("white-sari");
      expect(p.bottomKind).toBe("sari");
      expect(p.bottom.toLowerCase()).toBe("#f5f2ea");
      expect(p.extras).toEqual(expect.arrayContaining(["pallu", "goldBorder"]));
      expect(p.hairColor.toLowerCase()).toBe("#d8d8d8");
    }
  });
});
