export const captionStyles = {
  dry: {
    label: "Dry",
    description: "A deadpan observation. Small words, quiet sarcasm.",
    instruction:
      "Use understatement and deadpan irony. Sound calmly unimpressed. No exclamation marks or internet slang.",
    example: "The 1 train is once again testing our commitment to punctuality.",
  },
  chaotic: {
    label: "Chaotic",
    description: "Big reactions, playful exaggeration, very online.",
    instruction:
      "Use playful hyperbole, dramatic energy, and a little internet slang. Make the ordinary situation feel hilariously over-the-top.",
    example:
      "The 1 train ghosted me. Entering my villain era on this platform.",
  },
  wholesome: {
    label: "Wholesome",
    description: "Find the warmth. Kind, hopeful, gently funny.",
    instruction:
      "Find a warm, kind, optimistic observation. Keep the humor gentle and notice a small bright spot.",
    example: "One delayed train, three new platform friends. Not a total loss.",
  },
} as const;
export type CaptionStyle = keyof typeof captionStyles;
export function isCaptionStyle(value: string): value is CaptionStyle {
  return Object.hasOwn(captionStyles, value);
}
