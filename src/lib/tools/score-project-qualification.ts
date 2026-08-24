import { tool } from "ai";
import { z } from "zod";

export const projectQualificationInputSchema = z.object({
  projectName: z
    .string()
    .min(2)
    .describe("The name or short title of the proposed project"),

  problem: z
    .string()
    .min(10)
    .describe("The specific problem the project will solve"),

  targetUsers: z
    .string()
    .min(3)
    .describe("The primary users of the project"),

  coreFeatures: z
    .array(z.string().min(2))
    .min(1)
    .max(8)
    .describe("The most important features in the first version"),

  technology: z
    .string()
    .optional()
    .describe("The proposed development technology"),

  timeline: z
    .string()
    .optional()
    .describe("The expected development timeline"),

  budget: z
    .string()
    .optional()
    .describe("The available budget or resource limitations"),
});

export type ProjectQualificationInput = z.infer<
  typeof projectQualificationInputSchema
>;

export interface ProjectQualificationResult {
  projectName: string;
  totalScore: number;
  readinessLevel: "Needs clarification" | "Promising" | "Ready to plan";
  categoryScores: {
    problemClarity: number;
    audienceClarity: number;
    scopeClarity: number;
    deliveryClarity: number;
  };
  strengths: string[];
  risks: string[];
  recommendation: string;
}

function calculateTextScore(
  value: string | undefined,
  completeLength: number,
): number {
  if (!value?.trim()) {
    return 0;
  }

  return Math.min(25, Math.round((value.trim().length / completeLength) * 25));
}

export const scoreProjectQualification = tool({
  description:
    "Score a project idea after its problem, users, features, technology, timeline and resources have been discussed. Use this tool when the user asks for a score, assessment, readiness analysis or final qualification.",

  inputSchema: projectQualificationInputSchema,

  execute: async (
    input,
  ): Promise<ProjectQualificationResult> => {
    if (
      input.projectName
        .toUpperCase()
        .includes("FAIL_TOOL_TEST")
    ) {
      throw new Error(
        "The qualification service could not score this test project.",
      );
    }

    const problemClarity = calculateTextScore(input.problem, 100);
    const audienceClarity = calculateTextScore(
      input.targetUsers,
      60,
    );
    const scopeClarity = Math.min(
      25,
      input.coreFeatures.length * 5,
    );

    const deliveryDetails = [
      input.technology,
      input.timeline,
      input.budget,
    ].filter((value) => value?.trim()).length;

    const deliveryClarity = Math.round(
      (deliveryDetails / 3) * 25,
    );

    const totalScore =
      problemClarity +
      audienceClarity +
      scopeClarity +
      deliveryClarity;

    const strengths: string[] = [];
    const risks: string[] = [];

    if (problemClarity >= 18) {
      strengths.push("The project problem is clearly defined.");
    } else {
      risks.push("The problem needs a more specific explanation.");
    }

    if (audienceClarity >= 18) {
      strengths.push("The target users are identifiable.");
    } else {
      risks.push("The target audience needs more detail.");
    }

    if (
      input.coreFeatures.length >= 3 &&
      input.coreFeatures.length <= 6
    ) {
      strengths.push("The first-version feature scope is manageable.");
    } else if (input.coreFeatures.length > 6) {
      risks.push("The first version may contain too many features.");
    } else {
      risks.push("The MVP requires additional core features.");
    }

    if (deliveryClarity >= 17) {
      strengths.push("Delivery constraints have been considered.");
    } else {
      risks.push(
        "Technology, timeline or budget information is incomplete.",
      );
    }

    const readinessLevel =
      totalScore >= 75
        ? "Ready to plan"
        : totalScore >= 50
          ? "Promising"
          : "Needs clarification";

    const recommendation =
      readinessLevel === "Ready to plan"
        ? "Create the MVP backlog and begin implementation planning."
        : readinessLevel === "Promising"
          ? "Clarify the listed risks before finalizing the MVP."
          : "Continue the qualification conversation before development begins.";

    return {
      projectName: input.projectName,
      totalScore,
      readinessLevel,
      categoryScores: {
        problemClarity,
        audienceClarity,
        scopeClarity,
        deliveryClarity,
      },
      strengths,
      risks,
      recommendation,
    };
  },
});