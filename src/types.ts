import { z } from "zod";

export const ReviewerSchema = z
  .object({
    id: z.string().min(1),
    provider: z.enum(["openrouter", "ollama"]),
    model: z.string().min(1),
    reasoning_effort: z.enum(["minimal", "low", "medium", "high", "xhigh"]).optional(),
    max_tokens: z.number().int().positive().optional(),
    num_ctx: z.number().int().positive().optional(),
    role: z.string().optional(),
    system_prompt: z.string().optional(),
    system_prompt_file: z.string().optional(),
  })
  .refine((r) => !(r.system_prompt && r.system_prompt_file), {
    message: "system_prompt and system_prompt_file are mutually exclusive",
  });

export const ManifestSchema = z.object({
  record_id: z.string().min(1),
  round: z.number().int().positive().optional(),
  reviewers: z.array(ReviewerSchema).min(1),
});

export type Reviewer = z.infer<typeof ReviewerSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;

export interface ReviewerResult {
  reviewer_id: string;
  status: "ok" | "error";
  reasoning?: string;
  content?: string;
  error?: string;
  duration_ms: number;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd?: number;
  };
}
