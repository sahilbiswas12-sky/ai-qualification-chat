This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Server-Side Tool Contract

### `scoreProjectQualification`

Scores a proposed software project using the information collected during the qualification conversation. The tool executes only on the server through the `/api/chat` route.

**Definition file**

`src/lib/tools/score-project-qualification.ts`

**Input schema**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `projectName` | `string` | Yes | Name or short title of the project |
| `problem` | `string` | Yes | Specific problem the project will solve |
| `targetUsers` | `string` | Yes | Primary users of the project |
| `coreFeatures` | `string[]` | Yes | One to eight important MVP features |
| `technology` | `string` | No | Proposed development technology |
| `timeline` | `string` | No | Expected development timeline |
| `budget` | `string` | No | Available budget or resource constraints |

**Return shape**

```ts
interface ProjectQualificationResult {
  projectName: string;
  totalScore: number;
  readinessLevel:
    | "Needs clarification"
    | "Promising"
    | "Ready to plan";
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

## Interactive 3D Project Readiness Orb

### What I built

I built an interactive 3D Project Readiness Orb for the AI Project
Qualification Assistant. The experience visualizes three project-readiness
states: Needs Work, Almost Ready and Ready to Build.

Users can:

- Drag the scene to rotate it
- Scroll or pinch to zoom
- Tap the orb to trigger an energy pulse
- Change the qualification score
- Change the orb's color, material and animation state

The experience was built with React Three Fiber, Three.js and Drei. The geometry
is generated directly in code, so the page does not need to download a large
external 3D model.

Route:

`/3d-experience`

### Responsible loading and mobile support

The 3D canvas is dynamically imported and rendered only in the browser. A
static readiness preview is provided when reduced motion is enabled or when a
low-power device is detected.

To reduce rendering cost, the scene uses:

- Code-generated geometry instead of a large GLB model
- A limited number of particles
- A capped device pixel ratio
- A restricted zoom distance
- Touch-compatible orbit controls
- A static fallback for reduced-motion and low-power contexts

### FE-10 performance note

I tested the production build using Chrome Lighthouse with an iPhone 12 Pro
mobile simulation.

Results from the `/3d-experience` route:

- Performance: 77
- Accessibility: 95
- Best Practices: 100
- SEO: 100
- First Contentful Paint: 0.8 seconds
- Largest Contentful Paint: 2.3 seconds
- Observed mobile-simulation frame rate: approximately 144 FPS
- Observed desktop frame rate: approximately 123.9 FPS

The scene remained responsive while rotating, zooming and changing readiness
states. The Three.js dependencies increase the JavaScript required by this
route, so the canvas is lazy-loaded and kept separate from the main application
experience.

These measurements were taken locally and may vary depending on the device,
browser and deployed environment.

### What I would add with more time

With more time, I would connect the orb directly to the qualification tool's
real score, add more accessible descriptions for each visual state, reduce the
initial Three.js JavaScript cost further and test the experience on additional
physical mobile devices.