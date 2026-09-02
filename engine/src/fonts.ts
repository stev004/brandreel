import { loadFont as loadIbmPlexMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfairDisplay } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadSourceSerif4 } from "@remotion/google-fonts/SourceSerif4";
import type { BrandKit } from "./schema";

type FontLoader = (italic: boolean) => string;

const loadPlayfair: FontLoader = (italic) =>
  loadPlayfairDisplay(italic ? "italic" : "normal", {
    weights: ["400", "500", "600", "700"],
    subsets: ["latin"],
  }).fontFamily;

const loadInterFamily: FontLoader = (italic) =>
  loadInter(italic ? "italic" : "normal", {
    weights: ["400", "500", "600", "700"],
    subsets: ["latin"],
  }).fontFamily;

const loadIbmMono: FontLoader = (italic) =>
  loadIbmPlexMono(italic ? "italic" : "normal", {
    weights: ["400", "500", "600", "700"],
    subsets: ["latin"],
  }).fontFamily;

const loadSourceSerif: FontLoader = (italic) =>
  loadSourceSerif4(italic ? "italic" : "normal", {
    weights: ["400", "600", "700"],
    subsets: ["latin"],
  }).fontFamily;

export const FONT_REGISTRY: Record<string, FontLoader> = {
  "Playfair Display": loadPlayfair,
  Inter: loadInterFamily,
  "IBM Plex Mono": loadIbmMono,
  "Source Serif 4": loadSourceSerif,
};

const FALLBACK_STACKS = {
  display: ["Georgia", "serif"],
  body: ["Arial", "sans-serif"],
  mono: ["Courier New", "monospace"],
} as const;

const withFallback = (family: string, fallback: readonly string[]): string =>
  [`"${family}"`, ...fallback].join(", ");

const resolveFamily = (family: { family: string; italic?: boolean }, role: string): string => {
  const loader = FONT_REGISTRY[family.family];
  if (!loader) {
    throw new Error(
      `Unknown ${role} font family "${family.family}". Add it to the registry in engine/src/fonts.ts.`,
    );
  }

  return loader(Boolean(family.italic));
};

export const resolveFonts = (brand: BrandKit): {
  display: string;
  displayItalic: string;
  body: string;
  mono: string;
} => {
  const displayFamily = resolveFamily(brand.fonts.display, "display");
  const displayItalicFamily = brand.fonts.display.italic
    ? displayFamily
    : resolveFamily({ family: brand.fonts.display.family, italic: true }, "display italic");

  return {
    display: withFallback(displayFamily, FALLBACK_STACKS.display),
    displayItalic: withFallback(displayItalicFamily, FALLBACK_STACKS.display),
    body: withFallback(resolveFamily(brand.fonts.body, "body"), FALLBACK_STACKS.body),
    mono: withFallback(resolveFamily(brand.fonts.mono, "mono"), FALLBACK_STACKS.mono),
  };
};
