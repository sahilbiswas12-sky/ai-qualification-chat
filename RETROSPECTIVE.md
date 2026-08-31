# FL-10 Retrospective — From an Idea to a Verified AI Product

If I could speak to the person I was in Week 1, I would say: do not measure progress only by how many features you can build. Measure it by whether another person can understand, run, test and trust what you create.

At the beginning of this track, I wanted to improve my ability to build full-stack web applications with AI tools. I already had experience with HTML, CSS, JavaScript, React and project development, but my workflow was mostly focused on making features work. I did not consistently begin with a clear problem statement, define success criteria, document limitations or create evidence that someone else could verify.

My main capstone became the AI Project Qualification Assistant. It helps students, developers and small teams turn an early project idea into a structured qualification assessment. The assistant asks focused questions about the problem, target users, features, technology, timeline and budget. When enough information is available, it generates a structured readiness score with strengths, risks and a recommended next step.

The project changed significantly while I built it. It started as a basic streaming AI chat interface. I then added a server-side qualification tool, a visual score card, error and recovery states, rate limiting, automated tests, an interactive 3D readiness experience and production documentation. The most important change, however, was not the number of features. It was the way I made decisions.

For example, I chose to keep the Google API key and qualification tool on the server. This protected private configuration and made the structured scoring result more predictable and testable. I also separated the 3D experience from the primary chat route so that its larger JavaScript requirements would not affect the initial chat experience. These decisions taught me to consider security, performance and maintainability alongside visual presentation.

The project also forced me to become more systematic when things failed. I encountered missing environment variables, model errors, hydration problems, interrupted streams, rate limits, deployment failures and test failures. Earlier, I might have changed several parts of the code at once and hoped the error disappeared. During this track, I learned to read terminal output carefully, isolate one likely cause, make a smaller change and verify the result.

Testing changed how I define “finished.” I created component tests for the chat interface and qualification score card, plus a Playwright end-to-end test for the complete user flow. Nine component tests and one end-to-end test passed. I also performed five manual v2 evaluations covering a complete project, an incomplete idea, a simulated rate limit, a prompt-injection attempt and an out-of-scope request. All five recorded cases passed, but I learned to describe these results honestly: AI output is probabilistic, so successful recorded evaluations do not guarantee identical responses forever.

I also learned that documenting limitations increases credibility. The application currently uses an in-memory rate limiter, which is not shared across serverless instances. It also does not persist conversations, and its qualification score is guidance rather than a guaranteed estimate. Earlier, I might have avoided mentioning these points. Now I understand that explaining a limitation—and what I would do next—shows ownership of the work.

The three most transferable things I learned are:

First, define the problem and evidence before building. A clear audience, goal and success condition prevent unnecessary features and make evaluation possible.

Second, treat AI output as a draft that requires human judgment. I used ChatGPT for planning, debugging, test suggestions and documentation, but I checked the generated work through terminal output, automated tests, manual evaluations and production builds. AI made the process faster, while verification remained my responsibility.

Third, ship in small, testable steps. Git branches, pull requests, automated checks and incremental deployments made failures easier to understand and changes easier to review.

What changed most is my working posture. I no longer see deployment as the final step after development. Documentation, accessibility, testing, failure handling, mobile checks, performance and honest limitations are all parts of building the product.

Next, I would replace the in-memory limiter with a shared Redis-backed service, add optional conversation persistence with clear user consent, expand browser testing and connect the 3D readiness visualization directly to the qualification result. I would also continue using this project as public proof in job applications and interviews.

In Week 1, I wanted to learn how to build with AI. By the end, I learned how to direct AI, verify its work, explain my decisions and take responsibility for what I shipped.
