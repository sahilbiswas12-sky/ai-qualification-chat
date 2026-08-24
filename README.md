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