Performance and Accessibility Audit

Audit information

Project: AI Qualification Chat

Audited URL: https://ai-qualification-chat.vercel.app/

Audit date: 30 August 2026

Lighthouse configuration: Navigation mode, mobile preset, Incognito window

Accessibility tools: Lighthouse, WAVE and Windows Narrator

Lighthouse results

Category

Before

After

Delta

Performance

98

99

+1

Accessibility

100

100

0

Best Practices

100

100

0

SEO

100

100

0

Recorded performance metrics

Metric

Before

After

Delta

First Contentful Paint

1.0 s

1.0 s

0 s

Largest Contentful Paint

1.6 s

1.3 s

-0.3 s

Total Blocking Time, Cumulative Layout Shift and Speed Index were shown as passing in Lighthouse, but their exact values were not recorded in the screenshots.

Lighthouse screenshots

Before:



After:



WAVE results

Result

Before

After

Delta

Errors

0

0

0

Contrast errors

0

0

0

Alerts

4

0

-4

AIM score

9.9/10

10/10

+0.1

The four initial alerts identified text rendered at 10 pixels or smaller:

Online connection status

Your answers label

AI responses label

Message character counter

The affected font sizes were increased to 0.75rem (12 pixels). The deployed page was then re-evaluated with WAVE, resulting in zero errors, zero contrast errors and zero alerts.

WAVE screenshot



Changes made

Increased .connection-status text from 0.67rem to 0.75rem.

Increased .conversation-stats span text from 0.65rem to 0.75rem.

Increased .character-count text from 0.65rem to 0.75rem.

Confirmed that the chat message region uses aria-live="polite" for streamed output.

Confirmed that the Stop button is keyboard-reachable and announced as a button.

Keyboard-only test

The primary chat flow was tested without a mouse.

Check

Result

Starter option selectable

Pass

Message input reachable

Pass

Message can be submitted

Pass

Stop button reachable

Pass

Stop button works with the keyboard

Pass

Other buttons reachable

Pass

Visible focus indicators

Pass

Backward navigation with Shift+Tab

Pass

No keyboard trap

Pass

AI-specific accessibility test

Windows Narrator was used to test the streamed chat response.

Check

Result

Streamed output announced automatically

Pass

Announcement understandable

Pass

No excessive repeated announcements

Pass

Stop button announced correctly

Pass

Stop button keyboard-reachable

Pass

Final result

Lighthouse mobile performance: 99

Lighthouse accessibility: 100

WAVE errors: 0

WAVE contrast errors: 0

WAVE alerts: 0

Primary flow completable by keyboard alone: Yes

Streamed output announced politely: Yes

Keyboard-reachable Stop button: Yes

The audited deployment meets the rubric requirement of at least 80 for mobile performance and accessibility, exceeds the 90+ target in both categories, has zero WAVE errors and alerts, and supports the primary chat flow using only a keyboard.