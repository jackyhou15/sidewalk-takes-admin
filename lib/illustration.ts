import sanitizeHtml from "sanitize-html";
// Model output is untrusted. Keep only static SVG drawing primitives.
export function sanitizeIllustration(input: string): string {
  if (input.length > 100_000) throw new Error("Illustration is too large.");
  const svg = sanitizeHtml(input.replace(/```(?:svg|xml)?|```/g, "").trim(), {
    allowedTags: [
      "svg",
      "g",
      "path",
      "rect",
      "circle",
      "ellipse",
      "polygon",
      "polyline",
      "line",
    ],
    allowedAttributes: {
      svg: ["xmlns", "viewBox", "width", "height"],
      "*": [
        "fill",
        "stroke",
        "stroke-width",
        "stroke-linecap",
        "stroke-linejoin",
        "opacity",
        "transform",
        "d",
        "x",
        "y",
        "x1",
        "x2",
        "y1",
        "y2",
        "cx",
        "cy",
        "r",
        "rx",
        "ry",
        "width",
        "height",
        "points",
      ],
    },
    disallowedTagsMode: "completelyDiscard",
    parser: { lowerCaseTags: false, lowerCaseAttributeNames: false },
    exclusiveFilter: (frame) =>
      Object.values(frame.attribs).some(
        (value) =>
          /url\s*\(|javascript:|data:|https?:/i.test(value) &&
          value !== "http://www.w3.org/2000/svg",
      ),
    transformTags: {
      svg: (_tagName, attribs) => ({
        tagName: "svg",
        attribs: {
          ...attribs,
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: "0 0 800 600",
          width: "800",
          height: "600",
        },
      }),
    },
  });
  if (
    !/^<svg\b/.test(svg) ||
    !svg.endsWith("</svg>") ||
    !/<(?:path|rect|circle|ellipse|polygon)\b/.test(svg)
  ) {
    throw new Error("The model did not return a valid illustration.");
  }
  return svg;
}
