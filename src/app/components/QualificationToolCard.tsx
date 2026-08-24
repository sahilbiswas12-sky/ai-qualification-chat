import type {
  ProjectQualificationInput,
  ProjectQualificationResult,
} from "@/lib/tools/score-project-qualification";

type QualificationToolPart =
  | {
      type: "tool-scoreProjectQualification";
      state: "input-streaming";
      input?: Partial<ProjectQualificationInput>;
    }
  | {
      type: "tool-scoreProjectQualification";
      state: "input-available";
      input: ProjectQualificationInput;
    }
  | {
      type: "tool-scoreProjectQualification";
      state: "output-available";
      input: ProjectQualificationInput;
      output: ProjectQualificationResult;
    }
  | {
      type: "tool-scoreProjectQualification";
      state: "output-error";
      input?: ProjectQualificationInput;
      errorText: string;
    };

interface QualificationToolCardProps {
  part: QualificationToolPart;
}

function ScoreBar({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  const percentage = Math.min(100, Math.max(0, score * 4));

  return (
    <div className="score-row">
      <div>
        <span>{label}</span>
        <strong>{score}/25</strong>
      </div>

      <div
        className="score-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={25}
        aria-valuenow={score}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export default function QualificationToolCard({
  part,
}: QualificationToolCardProps) {
  if (part.state === "input-streaming") {
    return (
      <section
        className="tool-card tool-input-streaming"
        aria-live="polite"
      >
        <div className="tool-spinner" aria-hidden="true" />

        <div>
          <span className="tool-state-label">
            Preparing assessment
          </span>

          <strong>Reading project information…</strong>

          <p>
            The AI is assembling the details required by the
            qualification tool.
          </p>
        </div>
      </section>
    );
  }

  if (part.state === "input-available") {
    return (
      <section
        className="tool-card tool-input-available"
        aria-live="polite"
      >
        <span className="tool-state-icon" aria-hidden="true">
          ✓
        </span>

        <div>
          <span className="tool-state-label">
            Input validated
          </span>

          <strong>
            {part.input.projectName || "Project assessment"}
          </strong>

          <p>
            Scoring {part.input.coreFeatures?.length ?? 0} core
            features for{" "}
            {part.input.targetUsers || "the target users"}.
          </p>
        </div>
      </section>
    );
  }

  if (part.state === "output-error") {
    return (
      <section
        className="tool-card tool-output-error"
        role="alert"
      >
        <span className="tool-state-icon" aria-hidden="true">
          !
        </span>

        <div>
          <span className="tool-state-label">
            Assessment failed
          </span>

          <strong>The project could not be scored</strong>

          <p>
            {part.errorText ||
              "The qualification tool encountered an unexpected error."}
          </p>

          <small>
            Review the project information and ask the assistant to
            try again.
          </small>
        </div>
      </section>
    );
  }

  const result = part.output;

  return (
    <section
      className="tool-result-card"
      aria-label={`${result.projectName} qualification result`}
    >
      <header>
        <div>
          <span className="tool-state-label">
            Qualification complete
          </span>

          <h3>{result.projectName}</h3>

          <p>{result.readinessLevel}</p>
        </div>

        <div
          className="total-score"
          aria-label={`${result.totalScore} out of 100`}
        >
          <strong>{result.totalScore}</strong>
          <span>/100</span>
        </div>
      </header>

      <div className="score-grid">
        <ScoreBar
          label="Problem clarity"
          score={result.categoryScores.problemClarity}
        />

        <ScoreBar
          label="Audience clarity"
          score={result.categoryScores.audienceClarity}
        />

        <ScoreBar
          label="Scope clarity"
          score={result.categoryScores.scopeClarity}
        />

        <ScoreBar
          label="Delivery clarity"
          score={result.categoryScores.deliveryClarity}
        />
      </div>

      <div className="tool-findings">
        <div className="strength-list">
          <h4>Strengths</h4>

          {result.strengths.length > 0 ? (
            <ul>
              {result.strengths.map((strength) => (
                <li key={strength}>{strength}</li>
              ))}
            </ul>
          ) : (
            <p>No confirmed strengths yet.</p>
          )}
        </div>

        <div className="risk-list">
          <h4>Risks</h4>

          {result.risks.length > 0 ? (
            <ul>
              {result.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          ) : (
            <p>No important risks were identified.</p>
          )}
        </div>
      </div>

      <footer>
        <span>Recommended next step</span>
        <p>{result.recommendation}</p>
      </footer>
    </section>
  );
}

export type { QualificationToolPart };