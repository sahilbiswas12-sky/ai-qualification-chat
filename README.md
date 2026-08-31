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

## Interactive 3D readiness experience

The `/3d-experience` route visualizes three readiness states:

- Needs Work
- Almost Ready
- Ready to Build

Users can rotate and zoom the scene, trigger an energy pulse and change the qualification score. The geometry is generated in code instead of loading a large external model.

Performance decisions include:

- Dynamically loading the canvas in the browser
- Capping the device pixel ratio
- Limiting the particle count
- Restricting zoom distance
- Supporting touch controls
- Providing a static fallback for reduced-motion and low-power devices

A local Chrome Lighthouse audit using an iPhone 12 Pro simulation produced:

| Metric                   | Result      |
| ------------------------ | ----------- |
| Performance              | 77          |
| Accessibility            | 95          |
| Best Practices           | 100         |
| SEO                      | 100         |
| First Contentful Paint   | 0.8 seconds |
| Largest Contentful Paint | 2.3 seconds |

Results can vary by device, browser, network and deployment.

## Technical decisions

### Streaming instead of waiting for a complete response

Streaming gives the user immediate feedback and makes longer AI responses feel more responsive.

### Server-only API key

The Google API key is read only inside the server route. It is never placed in a `NEXT_PUBLIC_` variable or sent to the browser.

### Structured tool output

Qualification results are returned as structured data instead of unstructured model text. This makes the score predictable, testable and suitable for a dedicated interface component.

### One question at a time

The system prompt directs the assistant to ask one focused question at a time. This reduces cognitive load and creates a clearer discovery flow.

### Lightweight rate limiter

An in-memory limiter avoids adding another paid service to the demonstration project. The limitation is documented instead of presenting it as a fully distributed security control.

### Separate 3D route

The Three.js experience is isolated from the primary chat route so its larger JavaScript bundle does not affect the initial chat experience.

## How AI tools helped build this project

I used ChatGPT as a development partner during planning, implementation and debugging. It helped me:

- Break the assignment requirements into smaller implementation steps
- Design the streaming chat states and qualification tool contract
- Identify likely causes of API, hydration and streaming errors
- Suggest component and end-to-end test cases
- Review accessibility concerns such as error announcements and button states
- Plan production safeguards and organize this README

I did not treat generated code as automatically correct. I selected the product behavior, supplied the project requirements, applied the changes, inspected errors and verified the result by running Vitest, Playwright and the Next.js production build. When generated suggestions caused errors or did not match the installed library versions, I used the terminal output to revise them.

The final architecture and trade-offs remain my responsibility. In particular, I chose to keep the qualification tool server-side, limit conversation input before calling the model and document the limitation of the in-memory rate limiter honestly.

## Deployment

The application is deployed on Vercel.

To create another deployment:

1. Import the GitHub repository into Vercel.
2. Add `GOOGLE_GENERATIVE_AI_API_KEY` under Project Settings → Environment Variables.
3. Enable it for Production and Preview as required.
4. Deploy the selected branch.
5. Test the complete qualification flow on the generated HTTPS URL.

Commits pushed to the production branch trigger a new deployment.

## Known limitations

- The in-memory rate limiter is not shared between serverless instances.
- The application does not persist conversations.
- Qualification scores are guidance, not guaranteed project estimates.
- The 3D readiness score is not yet connected directly to the live qualification result.
- Cross-browser behavior must still be manually verified on real or hosted browsers.

## Future improvements

- Replace the in-memory limiter with a distributed Redis-backed limiter
- Persist optional conversation history with user consent
- Connect the 3D orb directly to the qualification result
- Add usage monitoring and budget alerts
- Expand automated browser coverage
- Improve the initial JavaScript cost of the 3D experience

## Author

**Sahil Biswas**

Full-stack web developer focused on building practical web applications and AI-powered user experiences.

## License

This project is intended for educational and portfolio use.
