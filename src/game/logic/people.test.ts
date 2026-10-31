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
      for (const c of [p.skin, p.hairColor, p.top, p.bottom, p.trim, p.footwearColor]) expect(c).toMatch(HEX);
      expect(p.scale).toBeGreaterThan(0.6);
      expect(p.scale).toBeLessThan(1.1);
    }
  });

  it("dresses boys in a t-shirt or a school uniform, with trousers and shoes", () => {
    const outfits = new Set(byKind("boy").map((p) => p.outfit));
    expect(outfits).toEqual(new Set(["tshirt-pants", "school-boy"]));
    for (const p of byKind("boy")) {
      expect(p.bottomKind).toBe("trousers");
      expect(p.footwear).toBe("shoes");
      expect(p.scale).toBeLessThan(0.9);
      if (p.outfit === "school-boy") {
        expect(p.top.toLowerCase()).toBe("#f4f4f0"); // white shirt
        expect(p.extras).toContain("tie");
      }
    }
  });

  it("dresses girls in a frock or a school uniform with plaits", () => {
    const outfits = new Set(byKind("girl").map((p) => p.outfit));
    expect(outfits).toEqual(new Set(["frock", "school-girl"]));
    for (const p of byKind("girl")) {
      expect(p.bottomKind).toBe("skirt");
      if (p.outfit === "school-girl") {
        expect(p.hairStyle).toBe("plaits");
        expect(p.top.toLowerCase()).toBe("#f4f4f0");
      }
    }
  });

  it("dresses men casually, formally, or in a shirt and a bordered mundu", () => {
    const outfits = new Set(byKind("man").map((p) => p.outfit));
    expect(outfits).toEqual(new Set(["casual", "formal", "mundu-shirt"]));
    for (const p of byKind("man")) {
      if (p.outfit === "formal") {
        expect(p.extras).toContain("tie");
        expect(p.bottomKind).toBe("trousers");
        expect(p.footwear).toBe("shoes");
      } else {
        expect(p.extras).not.toContain("tie");
      }
      if (p.outfit === "mundu-shirt") {
        expect(p.bottomKind).toBe("lungi");
        expect(p.bottom.toLowerCase()).toBe("#f5f2ea");
        expect(p.footwear).toBe("slippers");
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
      expect(p.extras).toEqual(expect.arrayContaining(["pallu", "goldBorder", "bindi"]));
      // a blouse that contrasts with the sari, and a border that is neither
      expect(p.top.toLowerCase()).not.toBe(p.bottom.toLowerCase());
      expect(p.trim.toLowerCase()).not.toBe(p.bottom.toLowerCase());
      expect(p.hairStyle).toBe("bun");
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
