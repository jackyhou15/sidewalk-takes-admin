export type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "boolean" | "select" | "email";
  required?: boolean;
  max?: number;
  min?: number;
  step?: string;
  options?: { value: string; label: string }[];
  reference?: string;
  help?: string;
  default?: string | number | boolean;
};
export type Resource = {
  table: string;
  title: string;
  singular: string;
  description: string;
  mode: "read" | "crud";
  fields: Field[];
  columns: string[];
  label: string;
  note?: string;
};
const enabled: Field = {
  key: "enabled",
  label: "Enabled",
  type: "boolean",
  default: true,
};
const notes: Field = {
  key: "notes",
  label: "Notes",
  type: "textarea",
  max: 2000,
};
const styles = [
  { value: "dry", label: "Dry" },
  { value: "chaotic", label: "Chaotic" },
  { value: "wholesome", label: "Wholesome" },
];
const signupNote =
  "Both lists empty or disabled = open Google signup. Adding an enabled domain or email restricts NEW accounts to either list. Existing users keep access. These lists never grant administrator access.";
export const resources: Record<string, Resource> = {
  "prompt-chains": {
    table: "prompt_chains",
    title: "Prompt chains",
    singular: "Prompt chain",
    description:
      "The actual instruction sequences used by the caption maker. Choose their traffic shares in Prompt chain mix.",
    mode: "read",
    label: "name",
    columns: ["name", "description", "model_id"],
    fields: [],
  },
  "prompt-chain-steps": {
    table: "prompt_chain_steps",
    title: "Prompt chain steps",
    singular: "Prompt chain step",
    description:
      "Ordered caption and optional illustration instructions. The selected chain is compiled into one structured model call.",
    mode: "read",
    label: "name",
    columns: ["name", "chain_id", "position", "kind"],
    fields: [],
  },
  terms: {
    table: "terms",
    title: "Terms",
    singular: "Term",
    description:
      "Give the AI shared vocabulary and context. Enabled definitions are included in new generation prompts.",
    mode: "crud",
    label: "term",
    columns: ["term", "definition", "enabled"],
    fields: [
      { key: "term", label: "Term", required: true, max: 100 },
      {
        key: "definition",
        label: "Definition",
        type: "textarea",
        required: true,
        max: 2000,
      },
      enabled,
    ],
  },
  examples: {
    table: "ai_generation_examples",
    title: "AI generation examples",
    singular: "AI generation example",
    description:
      "Curate examples for the model. Up to three enabled examples matching the selected vibe are included in each new prompt.",
    mode: "crud",
    label: "title",
    columns: ["title", "style", "caption", "enabled"],
    fields: [
      { key: "title", label: "Title", required: true, max: 100 },
      {
        key: "scene",
        label: "NYC scene",
        type: "textarea",
        required: true,
        min: 10,
        max: 300,
      },
      {
        key: "style",
        label: "Vibe",
        type: "select",
        options: styles,
        required: true,
      },
      {
        key: "caption",
        label: "AI-generated caption",
        type: "textarea",
        required: true,
        max: 500,
      },
      {
        key: "prompt",
        label: "Original AI prompt",
        type: "textarea",
        required: true,
        max: 20000,
      },
      enabled,
    ],
  },
  models: {
    table: "llm_models",
    title: "LLM models",
    singular: "LLM model",
    description:
      "Model catalog and generation settings. Models used by a prompt chain cannot be deleted.",
    mode: "crud",
    label: "name",
    columns: ["name", "model_key", "provider_id", "enabled"],
    fields: [
      { key: "name", label: "Display name", required: true, max: 100 },
      {
        key: "provider_id",
        label: "Provider",
        type: "select",
        reference: "llm_providers",
        required: true,
      },
      {
        key: "model_key",
        label: "Gemini model ID",
        required: true,
        max: 100,
        help: "Use a model available to this project’s Gemini API key. Credentials stay in Vercel.",
      },
      {
        key: "temperature",
        label: "Temperature",
        type: "number",
        min: 0,
        max: 2,
        step: "0.1",
        default: 0.9,
        required: true,
      },
      enabled,
      notes,
    ],
  },
  providers: {
    table: "llm_providers",
    title: "LLM providers",
    singular: "LLM provider",
    description:
      "Manage provider metadata. The installed runtime adapter is Google Gemini. No API credentials are stored here.",
    mode: "crud",
    label: "name",
    columns: ["name", "adapter", "enabled", "notes"],
    fields: [
      { key: "name", label: "Provider name", required: true, max: 100 },
      {
        key: "adapter",
        label: "Runtime adapter",
        type: "select",
        options: [{ value: "gemini", label: "Google Gemini" }],
        required: true,
      },
      enabled,
      notes,
    ],
  },
  requests: {
    table: "generation_requests",
    title: "Generation requests",
    singular: "Generation request",
    description:
      "Real requests from both apps, including failures and un-published admin drafts. Instrumentation begins with Week 7; old takes do not have invented logs.",
    mode: "read",
    label: "scene",
    columns: ["scene", "source", "style", "status", "duration_ms"],
    fields: [],
  },
  responses: {
    table: "llm_responses",
    title: "LLM responses",
    singular: "LLM response",
    description:
      "Inspect the exact compiled prompt, model response, token counts and latency. Links connect every response to its request.",
    mode: "read",
    label: "model_key",
    columns: [
      "model_key",
      "request_id",
      "status",
      "duration_ms",
      "total_tokens",
    ],
    fields: [],
  },
  domains: {
    table: "allowed_signup_domains",
    title: "Allowed signup domains",
    singular: "Allowed signup domain",
    description: "Control which organizations can create new accounts.",
    note: signupNote,
    mode: "crud",
    label: "domain",
    columns: ["domain", "enabled", "notes"],
    fields: [
      {
        key: "domain",
        label: "Domain",
        required: true,
        max: 253,
        help: "Domain only, such as columbia.edu. No @, URL, spaces or wildcards.",
      },
      enabled,
      notes,
    ],
  },
  emails: {
    table: "whitelisted_emails",
    title: "Whitelisted email addresses",
    singular: "Whitelisted email address",
    description: "Allow individual addresses in addition to the domain list.",
    note: signupNote,
    mode: "crud",
    label: "email",
    columns: ["email", "enabled", "notes"],
    fields: [
      {
        key: "email",
        label: "Email address",
        type: "email",
        required: true,
        max: 254,
      },
      enabled,
      notes,
    ],
  },
};
export type Row = Record<string, unknown> & { id: string };
export function resourceFor(slug: string) {
  return Object.prototype.hasOwnProperty.call(resources, slug)
    ? resources[slug]
    : undefined;
}
export const fieldLabels: Record<string, string> = {
  created_at: "Created",
  updated_at: "Updated",
  chain_id: "Prompt chain",
  model_id: "Model",
  provider_id: "Provider",
  request_id: "Request",
  user_id: "User",
  created_by: "Creator",
  with_image: "Illustration requested",
  model_key: "Model ID",
  duration_ms: "Duration",
  input_tokens: "Input tokens",
  output_tokens: "Output tokens",
  total_tokens: "Total tokens",
  generation_id: "Published take",
  response_text: "Model response",
  chain_name: "Chain at request time",
  finished_at: "Finished",
  alt_text: "Accessible image description",
};
export function labelFor(key: string) {
  return (
    fieldLabels[key] ??
    key.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())
  );
}
