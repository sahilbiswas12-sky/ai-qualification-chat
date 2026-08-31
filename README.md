# AI Project Qualification Assistant

An AI-powered project discovery assistant that turns an early project idea into a structured qualification assessment. It asks focused questions, streams responses in real time and generates a visual readiness score when enough information has been collected.

## Live application

- Production: https://ai-qualification-chat.vercel.app/
- Repository: https://github.com/sahilbiswas12-sky/ai-qualification-chat

## Screenshots

### Streaming chat interface

![AI Project Qualification Assistant chat interface](public/screenshots/chat-interface.png)

### Structured qualification result

![Project qualification score card](public/screenshots/qualification-score.png)

## What it does

The assistant helps a user clarify:

- The problem the project should solve
- The intended users
- The most important features
- Preferred technologies
- Expected timeline
- Budget or resource limitations

After gathering sufficient information, it can call the server-side `scoreProjectQualification` tool and display:

- An overall readiness score
- Problem, audience, scope and delivery scores
- Project strengths
- Project risks
- A recommended next step

## Usage examples

### Evaluate a complete project idea

Enter a message containing the project name, problem, target users, core features, technology, timeline and budget, then ask for a final qualification score.

```text
Please evaluate and score my project.

Project name: TaskFlow AI
Problem: Students and small teams struggle to organize tasks and track deadlines.
Target users: University students and small project teams.
Core features: Create, edit and delete tasks; priorities; due dates; search; filters; progress dashboard.
Technology: React, TypeScript and localStorage.
Timeline: Four weeks.
Budget: Free-tier services only.

Please provide the final qualification score.
```

The assistant should return a structured score card containing the overall score, readiness level, category scores, strengths, risks and recommended next step.

### Explore an incomplete idea

```text
I want to build a food delivery application. Please help me evaluate the idea.
```

When important information is missing, the assistant asks one focused clarification question at a time instead of inventing details or generating a premature score.

## Main features

- Streaming AI responses using Server-Sent Events
- Google Gemini model integration
- Structured server-side project qualification tool
- Visual qualification score card
- Accessible loading, error and retry states
- Stop-generation control
- Responsive chat interface
- Interactive 3D Project Readiness Orb
- Reduced-motion and low-power 3D fallback
- Automated component and end-to-end tests
- Production request limits and rate limiting
- Simulated failure modes for testing recovery states

## Technology

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Vercel AI SDK
- Google Gemini
- React Three Fiber
- Three.js
- Vitest
- React Testing Library
- Playwright
- Vercel

## Requirements

Before running the project, install:

- Node.js 20 or newer
- npm
- A Google AI API key

## Run locally

Clone the repository:

```bash
git clone https://github.com/sahilbiswas12-sky/ai-qualification-chat.git
```

Enter the project:

```bash
cd ai-qualification-chat
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file in the project root:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key
```

Start the development server:

```bash
npm run dev
```

Open http://localhost:3000 in a browser.

## Environment variables

| Variable                       | Required | Scope       | Description                                                                                                       |
| ------------------------------ | -------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes      | Server only | Authenticates requests to the Google Gemini API. Never expose this value in client-side code or commit it to Git. |

The application currently uses `gemini-3.6-flash`, configured in `src/lib/ai-config.ts`.

## Available commands

| Command              | Purpose                              |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Start the local development server   |
| `npm run build`      | Create an optimized production build |
| `npm start`          | Run the production build locally     |
| `npm run lint`       | Run ESLint                           |
| `npm test`           | Run Vitest component tests once      |
| `npm run test:watch` | Run Vitest in watch mode             |
| `npm run test:e2e`   | Run Playwright end-to-end tests      |

## Architecture

```mermaid
flowchart TD
    A[Chat interface] -->|POST messages| B[/api/chat]
    B --> C[Input validation and rate limit]
    C --> D[Gemini model]
    D -->|Needs more details| A
    D -->|Tool call| E[Qualification tool]
    E --> F[Structured score result]
    F --> G[Qualification score card]
```

### Request flow

1. The React chat interface sends the conversation to `/api/chat`.
2. The route checks the request rate, body size, message count and total text length.
3. Valid messages are converted into model messages.
4. Gemini streams its response through the Vercel AI SDK.
5. When the required project details are available, the model calls `scoreProjectQualification`.
6. The tool validates its input and returns structured scoring data.
7. The interface renders the result as an accessible visual score card.

## Important project files

| Path                                           | Responsibility                                                                |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/app/api/chat/route.ts`                    | Validates requests, handles test failures, calls Gemini and streams responses |
| `src/app/components/Chat.tsx`                  | Chat interface, submission, streaming, stopping, errors and retries           |
| `src/app/components/QualificationToolCard.tsx` | Renders qualification tool states and final scoring data                      |
| `src/lib/ai-config.ts`                         | Server-side model and system-prompt configuration                             |
| `src/lib/rate-limit.ts`                        | Lightweight per-client request throttling                                     |
| `src/lib/tools/score-project-qualification.ts` | Qualification tool schema, scoring and structured result                      |
| `src/app/3d-experience`                        | Interactive Project Readiness Orb experience                                  |
| `src/app/error.tsx`                            | Application error boundary                                                    |

## Production safeguards

The AI route includes the following safeguards:

| Protection          | Limit                                                |
| ------------------- | ---------------------------------------------------- |
| Request frequency   | 8 requests per client per minute                     |
| Request-body size   | 32 KB                                                |
| Conversation length | 20 messages                                          |
| Total text          | 8,000 characters                                     |
| Streaming execution | 30-second `maxDuration`                              |
| Cancellation        | Incoming request abort signal is passed to the model |

Oversized requests are rejected before the Gemini model is called, preventing trivial attempts to consume excessive tokens or API credits.

The current rate limiter is stored in the memory of an individual server instance. This is a reasonable lightweight safeguard for this demonstration project, but it is not a globally consistent distributed limit. A higher-traffic production system should use a shared service such as Vercel KV or Upstash Redis.

## Server-side tool contract

### `scoreProjectQualification`

The tool runs only on the server through `/api/chat`.

#### Input

| Field          | Type       | Required | Description                         |
| -------------- | ---------- | -------- | ----------------------------------- |
| `projectName`  | `string`   | Yes      | Project name or short title         |
| `problem`      | `string`   | Yes      | Problem the project solves          |
| `targetUsers`  | `string`   | Yes      | Primary intended users              |
| `coreFeatures` | `string[]` | Yes      | One to eight important MVP features |
| `technology`   | `string`   | No       | Proposed technology                 |
| `timeline`     | `string`   | No       | Expected delivery timeline          |
| `budget`       | `string`   | No       | Budget or resource constraints      |

#### Result

```ts
interface ProjectQualificationResult {
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
```

## Failure handling

The interface provides distinct states for:

- Waiting for the first response
- Streaming text
- Tool input streaming
- Tool input ready
- Tool result ready
- Tool execution failure
- API rate limiting
- Server failure
- Slow responses
- Interrupted streams
- Offline state
- User-requested cancellation

Development test phrases are available for manually checking recovery behavior:

| Phrase             | Simulated condition |
| ------------------ | ------------------- |
| `[test:429]`       | Rate-limit response |
| `[test:500]`       | Server failure      |
| `[test:slow]`      | Delayed response    |
| `[test:midstream]` | Interrupted stream  |

## Testing

Run component tests:

```bash
npm test
```

Current component-test result:

```text
Test Files  2 passed (2)
Tests       9 passed (9)
```

Run the end-to-end test:

```bash
npm run test:e2e
```

Create a production build:

```bash
npm run build
```

Tests cover message submission, streamed responses, accessible errors, form validation, pending states and qualification tool-card states.

## v2 evaluation results

I evaluated the deployed v2 application on 31 August 2026 using five representative scenarios. These checks supplement the automated tests and do not guarantee identical results for every model response.

| Case | Input or condition | Expected behaviour | Observed result | Status |
| --- | --- | --- | --- | --- |
| Complete project | TaskFlow AI with its problem, users, features, technology, timeline and budget | Generate a structured final assessment | Displayed an 86/100 score with the “Ready to plan” readiness level, category scores, strengths, risks and a recommendation | Pass |
| Incomplete project | A food-delivery application without sufficient project details | Ask for missing information instead of inventing it | Asked a focused clarification question before attempting to score the project | Pass |
| Rate limit | Entered `[test:429]` | Display an understandable rate-limit error | Displayed the rate-limit error and allowed the user to retry | Pass |
| Server failure | Entered `[test:500]` | Display an accessible server-error state | Displayed an error message with a retry action instead of leaving the interface stuck | Pass |
| Interrupted stream | Entered `[test:midstream]` | Handle an interrupted response without crashing | Reported the interrupted response and kept the interface usable for another attempt | Pass |

### Evaluation summary

- Manual scenarios passed: 5 of 5
- Component tests passed: 9 of 9
- Component test files passed: 2 of 2
- End-to-end tests passed: 1 of 1
- Production build: successful

The evaluation showed that the main qualification flow, clarification behaviour and recovery states work as intended. Model-generated wording and scores may still vary because the application uses a generative AI model.

## Design decisions

### Structured server-side qualification tool

I separated project scoring from the normal conversational response. Gemini gathers and interprets the project information, but the `scoreProjectQualification` tool validates the required fields and returns a predictable data structure.

This decision makes the result easier to test and allows the interface to render a consistent score card instead of trying to extract scores from unstructured model text.

### Streaming responses

The application streams responses so users can start reading without waiting for the entire model output. This improves perceived responsiveness, especially when the model needs several seconds to complete an answer.

### Accessible recovery states

Errors, pending states and tool states are shown explicitly. Users can stop generation or retry after a failure, and important errors use accessible alert semantics.

## Limitations

- AI-generated wording and qualification scores can vary between otherwise similar requests.
- The score is project-planning guidance, not a guarantee that a project will succeed.
- The assistant depends on the availability and response time of the Google Gemini API.
- The in-memory rate limiter applies separately to each server instance and is not suitable for a high-traffic distributed production system.
- Conversation history is not stored permanently, so refreshing the page can remove the current session.
- The assistant cannot independently verify whether a user’s budget, timeline or technical claims are accurate.
- The current end-to-end test uses a controlled response and does not continuously test the live Gemini service.
- The 3D experience may use additional device resources, although reduced-motion and low-power fallbacks are provided.

## Future improvements

- Store conversations and evaluation history in a database
- Replace the in-memory rate limiter with a shared service such as Upstash Redis
- Add authentication and personal project dashboards
- Add downloadable qualification reports
- Expand evaluations with a larger, repeatable dataset
- Add monitoring for model latency, errors and tool-call accuracy

## Demo video

An unlisted YouTube demonstration will be added here after recording.

The demo covers:

1. The purpose and intended users of the assistant
2. A live end-to-end project qualification
3. The structured qualification result
4. The server-side tool design decision
5. A live guardrail or recovery-state demonstration
6. One current limitation

## Author

**Sahil Biswas**

- Portfolio: https://my-portfolio-next-blue.vercel.app/
- GitHub: https://github.com/sahilbiswas12-sky
- LinkedIn: https://www.linkedin.com/in/sahil-biswas-827337287/