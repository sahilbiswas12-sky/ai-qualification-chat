import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import QualificationToolCard, {
  type QualificationToolPart,
} from "./QualificationToolCard";

const validInput = {
  projectName: "TaskFlow AI",
  problem: "Users need a simple way to organize daily tasks.",
  targetUsers: "Students and professionals",
  coreFeatures: ["Create tasks", "Filter tasks", "Track progress"],
  technology: "React",
  timeline: "Four weeks",
  budget: "Free tools",
};

describe("QualificationToolCard", () => {
  it("shows the pending state while tool input is streaming", () => {
    const part: QualificationToolPart = {
      type: "tool-scoreProjectQualification",
      state: "input-streaming",
      input: {},
    };

    render(<QualificationToolCard part={part} />);

    expect(
      screen.getByText("Preparing assessment"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Reading project information…"),
    ).toBeInTheDocument();
  });

  it("shows validated project input before scoring", () => {
    const part: QualificationToolPart = {
      type: "tool-scoreProjectQualification",
      state: "input-available",
      input: validInput,
    };

    render(<QualificationToolCard part={part} />);

    expect(
      screen.getByText("Input validated"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("TaskFlow AI"),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Scoring 3 core features for Students and professionals/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows an accessible alert when scoring fails", () => {
    const part: QualificationToolPart = {
      type: "tool-scoreProjectQualification",
      state: "output-error",
      input: validInput,
      errorText: "The qualification service is unavailable.",
    };

    render(<QualificationToolCard part={part} />);

    const alert = screen.getByRole("alert");

    expect(alert).toHaveTextContent("Assessment failed");
    expect(alert).toHaveTextContent(
      "The qualification service is unavailable.",
    );
  });

  it("renders the completed score using accessible progress bars", () => {
    const part: QualificationToolPart = {
      type: "tool-scoreProjectQualification",
      state: "output-available",
      input: validInput,
      output: {
        projectName: "TaskFlow AI",
        totalScore: 82,
        readinessLevel: "Ready to plan",
        categoryScores: {
          problemClarity: 20,
          audienceClarity: 21,
          scopeClarity: 19,
          deliveryClarity: 22,
        },
        strengths: ["The target users are identifiable."],
        risks: ["The timeline needs additional detail."],
        recommendation:
          "Create the MVP backlog and begin implementation planning.",
      },
    };

    render(<QualificationToolCard part={part} />);

    expect(
      screen.getByRole("region", {
        name: "TaskFlow AI qualification result",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("82 out of 100"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("progressbar", {
        name: "Problem clarity",
      }),
    ).toHaveAttribute("aria-valuenow", "20");

    expect(
      screen.getByRole("progressbar", {
        name: "Audience clarity",
      }),
    ).toHaveAttribute("aria-valuenow", "21");

    expect(
      screen.getByText("The target users are identifiable."),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Create the MVP backlog and begin implementation planning.",
      ),
    ).toBeInTheDocument();
  });
});