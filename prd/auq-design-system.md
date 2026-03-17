# AUQ Design System

**Version:** 1.0  
**Last Updated:** March 2026  
**Status:** Active Specification

---

## Executive Summary

The AUQ Design System provides a comprehensive guide to building a cohesive, accessible, professional web interface for the AUQ Web Platform. Built on **modern design principles** (Linear/Vercel aesthetic), **Tailwind CSS**, and **shadcn-svelte components**, this system ensures consistency across all pages while allowing flexibility for future expansion.

**Core Brand Tagline:** "Keep your hand on the wheel"

---

## 1. Brand Identity

### Brand Promise

Users stay in control of their AI-assisted workflows without blocking, switching contexts, or missing important agent decisions.

### Brand Pillars

- **Control:** Users decide when/how/where to answer (mobile, desktop, phone)
- **Flow:** No context switching or terminal blocking
- **Simplicity:** Minimal UI, maximum clarity
- **Trust:** Open source, self-hostable, data ownership

### Brand Voice

- **Tone:** Professional, confident, approachable
- **Style:** Direct and clear, no fluff
- **Personality:** Smart, pragmatic, slightly playful

---

## 2. Color Palette

### Primary Color: Amber/Orange

The AUQ brand uses **amber-500** as the primary accent, inspired by "keeping your hand on the wheel" — warm, actionable, energetic.

```css
/* Primary Brand Color */
--primary: hsl(38 92% 50%); /* #f59e0b (amber-500) */
--primary-foreground: hsl(0 0% 100%); /* White text on amber */
```

### Light Mode (Default)

**Background:** Clean white for professional appearance  
**Foreground:** Near-black for maximum readability  
**Cards:** White with subtle shadows  
**Borders:** Light gray for hierarchy

```css
/* Light Mode */
:root {
  --background: hsl(0 0% 100%); /* #ffffff */
  --foreground: hsl(222 47% 11%); /* #1e293b (near-black) */
  --primary: hsl(38 92% 50%); /* #f59e0b (amber) */
  --primary-foreground: hsl(0 0% 100%); /* #ffffff */

  --card: hsl(0 0% 100%); /* #ffffff */
  --card-foreground: hsl(222 47% 11%); /* #1e293b */

  --muted: hsl(210 40% 96%); /* #f1f5f9 (slate-50) */
  --muted-foreground: hsl(215 16% 47%); /* #64748b (slate-500) */

  --secondary: hsl(210 40% 96%); /* #f1f5f9 (slate-50) */
  --secondary-foreground: hsl(222 47% 11%); /* #1e293b */

  --accent: hsl(210 40% 96%); /* #f1f5f9 (slate-50) */
  --accent-foreground: hsl(222 47% 11%); /* #1e293b */

  --border: hsl(214 32% 91%); /* #e2e8f0 (slate-200) */
  --input: hsl(214 32% 91%); /* #e2e8f0 */

  --ring: hsl(38 92% 50%); /* #f59e0b (amber focus) */

  --destructive: hsl(0 72% 51%); /* #ef4444 (red-500) */
  --destructive-foreground: hsl(0 0% 98%); /* #fafafa */
}
```

### Dark Mode

**Background:** Deep blue-gray for reduced eye strain  
**Foreground:** Almost white for clarity  
**Cards:** Slightly lighter than background for depth  
**Borders:** Subtle light gray for hierarchy

```css
/* Dark Mode */
.dark {
  --background: hsl(222 47% 6%); /* #0f172a (slate-950) */
  --foreground: hsl(210 40% 98%); /* #f8fafc (slate-50) */

  --card: hsl(222 47% 9%); /* #1e293b (slate-900) */
  --card-foreground: hsl(210 40% 98%); /* #f8fafc */

  --muted: hsl(217 33% 12%); /* #1e293b (slate-900) */
  --muted-foreground: hsl(215 20% 65%); /* #94a3b8 (slate-400) */

  --secondary: hsl(217 33% 17%); /* #334155 (slate-800) */
  --secondary-foreground: hsl(210 40% 98%); /* #f8fafc */

  --accent: hsl(217 33% 17%); /* #334155 (slate-800) */
  --accent-foreground: hsl(210 40% 98%); /* #f8fafc */

  --border: hsl(217 33% 17%); /* #334155 (slate-800) */
  --input: hsl(217 33% 17%); /* #334155 */

  --ring: hsl(38 92% 50%); /* #f59e0b (amber focus) */

  --destructive: hsl(0 62% 31%); /* #dc2626 (red-600) */
  --destructive-foreground: hsl(0 0% 98%); /* #fafafa */
}
```

### Semantic Colors

| Purpose      | Light Mode | Dark Mode | Hex Light | Hex Dark |
| ------------ | ---------- | --------- | --------- | -------- |
| **Success**  | Green-500  | Green-600 | #22c55e   | #16a34a  |
| **Warning**  | Amber-500  | Amber-600 | #f59e0b   | #d97706  |
| **Error**    | Red-500    | Red-600   | #ef4444   | #dc2626  |
| **Info**     | Blue-500   | Blue-600  | #3b82f6   | #2563eb  |
| **Pending**  | Blue-500   | Blue-600  | #3b82f6   | #2563eb  |
| **Answered** | Green-500  | Green-600 | #22c55e   | #16a34a  |
| **Rejected** | Amber-500  | Amber-600 | #f59e0b   | #d97706  |

---

## 3. Typography

### Font Families

```css
/* Sans Serif (UI) */
--font-sans: "Inter", system-ui, -apple-system, sans-serif;

/* Monospace (Code) */
--font-mono: "JetBrains Mono", "Fira Code", monospace;
```

**Font Loading:** Google Fonts (optimize for web)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

### Type Scale

Tailwind v4 defaults with emphasis on readability:

```css
/* Headings */
--font-size-3xl: 1.875rem; /* 30px, h1 */
--font-size-2xl: 1.5rem; /* 24px, h2 */
--font-size-xl: 1.25rem; /* 20px, h3 */
--font-size-lg: 1.125rem; /* 18px, h4/label */
--font-size-base: 1rem; /* 16px, body */
--font-size-sm: 0.875rem; /* 14px, small text */
--font-size-xs: 0.75rem; /* 12px, caption */
```

### Font Weights

```
Thin:       100  (rarely used)
ExtraLight: 200  (rarely used)
Light:      300  (secondary text)
Normal:     400  (body text, default)
Medium:     500  (buttons, small headers)
SemiBold:   600  (section headers, emphasis)
Bold:       700  (page titles, strong emphasis)
ExtraBold:  800  (rarely used)
Black:      900  (rarely used)
```

### Line Heights

```
--leading-tight:   1.25    (120%) - headers
--leading-snug:    1.375   (137.5%) - subheaders
--leading-normal:  1.5     (150%) - body text (default)
--leading-relaxed: 1.625   (162.5%) - long-form content
```

### Text Styles (Tailwind Utilities)

| Style              | Tailwind Class           | Usage                    |
| ------------------ | ------------------------ | ------------------------ |
| **Page Title**     | `text-3xl font-bold`     | `/app/inbox` title       |
| **Section Header** | `text-2xl font-semibold` | "Questions", "Analytics" |
| **Card Title**     | `text-xl font-semibold`  | Question card header     |
| **Body**           | `text-base font-normal`  | Default paragraph text   |
| **Label**          | `text-sm font-medium`    | Form labels              |
| **Caption**        | `text-xs font-normal`    | Metadata, timestamps     |
| **Code**           | `text-sm font-mono`      | API keys, code snippets  |

---

## 4. Spacing Scale

AUQ uses the **Tailwind spacing scale** (multiples of 0.25rem / 4px):

```css
0    = 0px       (no space)
1    = 0.25rem   = 4px
2    = 0.5rem    = 8px
3    = 0.75rem   = 12px
4    = 1rem      = 16px
6    = 1.5rem    = 24px
8    = 2rem      = 32px
12   = 3rem      = 48px
16   = 4rem      = 64px
20   = 5rem      = 80px
24   = 6rem      = 96px
32   = 8rem      = 128px
```

### Common Spacing Patterns

| Context                  | Pattern                  | Rationale                |
| ------------------------ | ------------------------ | ------------------------ |
| **Padding (Cards)**      | `p-4` (16px)             | Default card padding     |
| **Padding (Buttons)**    | `px-4 py-2` (16px x 8px) | Comfortable touch target |
| **Gap (Grids)**          | `gap-4` (16px)           | Space between items      |
| **Margin (Sections)**    | `mb-8` (32px)            | Vertical breathing room  |
| **Margin (Subsections)** | `mb-4` (16px)            | Hierarchy                |

### Page Layout

```
Landing Page:
├── Hero:            h-screen (full viewport height)
├── Features:        py-20 (padding top/bottom)
├── Pricing:         py-20
└── Footer:          py-12

App Pages:
├── Header:          h-16 (64px), sticky
├── Main Content:    px-8 py-6 (desktop), px-4 py-4 (mobile)
├── Sidebar:         w-64 (256px, desktop), hidden (mobile)
└── Content Area:    max-w-6xl (1152px)
```

---

## 5. Component Library

All components built from **shadcn-svelte** (copy-paste components based on bits-ui + Tailwind).

### Button

**Variants:**

- **Default:** Amber background, white text, hover darker
- **Outline:** Transparent background, amber border, hover light bg
- **Ghost:** No background/border, hover subtle bg
- **Destructive:** Red background, white text
- **Disabled:** Gray background, reduced opacity

**Sizes:**

- **sm:** `px-3 py-1.5 text-sm`
- **md:** `px-4 py-2 text-base` (default)
- **lg:** `px-6 py-3 text-lg`

**Usage Examples:**

```svelte
<!-- Primary CTA -->
<Button on:click={handleCreate}>Create API Key</Button>

<!-- Outline for secondary actions -->
<Button variant="outline">Cancel</Button>

<!-- Ghost for tertiary actions -->
<Button variant="ghost" size="sm">Learn More</Button>

<!-- Destructive for dangerous actions -->
<Button variant="destructive">Delete Workspace</Button>
```

### Card

**Structure:**

```svelte
<Card>
  <Card.Header>
    <Card.Title>Question Title</Card.Title>
    <Card.Description>Metadata or subtitle</Card.Description>
  </Card.Header>
  <Card.Content>
    Main content goes here
  </Card.Content>
  <Card.Footer>
    Actions or additional info
  </Card.Footer>
</Card>
```

**Styling:** White background (light) / slate-900 (dark), subtle shadow, padding p-6

**Usage:** Question list, settings cards, analytics cards

### Input

**Variants:**

- **Text:** Standard text input
- **Password:** Masked password input with show/hide toggle
- **Textarea:** Multi-line text input
- **Checkbox:** Single checkbox
- **Radio:** Radio button for single-select
- **Select:** Dropdown menu

**States:**

- Default, Focus (blue/amber ring), Disabled, Error (red border + message)

**Usage Examples:**

```svelte
<Input placeholder="Key name" bind:value={keyName} />
<Input type="password" placeholder="Password" bind:value={password} />
<Textarea placeholder="Message..." bind:value={text} rows={4} />
```

### Label

**Purpose:** Form field labels, always associated with input

```svelte
<Label for="email">Email Address</Label>
<Input id="email" type="email" />
```

### Badge

**Variants:**

- **Default:** Muted background
- **Primary:** Amber background
- **Secondary:** Slate background
- **Success:** Green background
- **Warning:** Amber background
- **Error:** Red background

**Usage:** Status indicators, tags, category labels

```svelte
<Badge variant="primary">Pending</Badge>
<Badge variant="success">Answered</Badge>
<Badge variant="warning">Stale</Badge>
```

### Tabs

**Structure:**

```svelte
<Tabs value="general">
  <Tabs.List>
    <Tabs.Trigger value="general">General</Tabs.Trigger>
    <Tabs.Trigger value="keys">API Keys</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="general">
    General settings content
  </Tabs.Content>
  <Tabs.Content value="keys">
    API Keys content
  </Tabs.Content>
</Tabs>
```

**Usage:** Settings page (multiple sections)

### Dialog

**Structure:**

```svelte
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <Dialog.Trigger asChild>
    <Button>Open Dialog</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Dialog Title</Dialog.Title>
      <Dialog.Description>Optional description</Dialog.Description>
    </Dialog.Header>
    Content goes here
    <Dialog.Footer>
      <Button variant="outline" on:click={() => setIsOpen(false)}>Cancel</Button>
      <Button on:click={handleConfirm}>Confirm</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog>
```

**Usage:** Confirmations, forms, key generation display

### Separator

**Purpose:** Visual divider between sections

```svelte
<Separator />  <!-- Horizontal line -->
<Separator orientation="vertical" />  <!-- Vertical line -->
```

### Avatar

**Purpose:** User profile pictures

```svelte
<Avatar>
  <Avatar.Image src={user.image} alt={user.name} />
  <Avatar.Fallback>{user.initials}</Avatar.Fallback>
</Avatar>
```

### Sheet

**Purpose:** Slide-out sidebar (mobile nav alternative)

```svelte
<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <Sheet.Trigger asChild>
    <Button variant="ghost" size="icon">☰</Button>
  </Sheet.Trigger>
  <Sheet.Content side="left">
    <!-- Mobile nav menu -->
  </Sheet.Content>
</Sheet>
```

### DropdownMenu

**Purpose:** Context menus, user actions

```svelte
<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild>
    <Button variant="ghost" size="icon">⋯</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item on:click={handleView}>View</DropdownMenu.Item>
    <DropdownMenu.Item on:click={handleCopy}>Copy</DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item variant="destructive" on:click={handleDelete}>Delete</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
```

### Table

**Purpose:** Listing data (API keys, workspaces, etc.)

```svelte
<Table>
  <Table.Header>
    <Table.Row>
      <Table.Head>Name</Table.Head>
      <Table.Head>Created</Table.Head>
      <Table.Head align="right">Actions</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {#each items as item (item.id)}
      <Table.Row>
        <Table.Cell>{item.name}</Table.Cell>
        <Table.Cell>{formatDate(item.createdAt)}</Table.Cell>
        <Table.Cell align="right">
          <!-- Actions -->
        </Table.Cell>
      </Table.Row>
    {/each}
  </Table.Body>
</Table>
```

### Tooltip

**Purpose:** Hover explanations, info icons

```svelte
<Tooltip.Root>
  <Tooltip.Trigger asChild>
    <span>?</span>
  </Tooltip.Trigger>
  <Tooltip.Content>
    This is helpful information
  </Tooltip.Content>
</Tooltip.Root>
```

### Switch

**Purpose:** Toggle settings on/off

```svelte
<Label htmlFor="notifications">Enable notifications</Label>
<Switch id="notifications" bind:checked={notificationsEnabled} />
```

### Skeleton

**Purpose:** Loading placeholders

```svelte
{#if isLoading}
  <Skeleton className="w-full h-12" />
  <Skeleton className="w-full h-12 mt-4" />
{/if}
```

---

## 6. Page Layouts & Wireframes

### 6.1 Marketing Pages

#### Landing Page (`/`)

```
┌─────────────────────────────────────────────────────┐
│                   Marketing Nav                     │
│  Logo    Home   Features   Pricing   Sign In  →     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  HERO SECTION                       │
│                                                     │
│     Keep your hand on the wheel                     │
│                                                     │
│     Questions from Claude Code → [typewriter]       │
│                                                     │
│     Answer from phone, desktop, anywhere            │
│                                                     │
│            [Get Started] [Learn More]               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              FEATURES (BENTO GRID)                  │
│                                                     │
│  ┌─────────────┬─────────────┬─────────────┐       │
│  │   Mobile    │ Async/Defer │  Analytics  │       │
│  │   ★★★      │   ★★★      │   ★★★      │       │
│  └─────────────┼─────────────┼─────────────┘       │
│  ┌─────────────┬─────────────────────────────────┐ │
│  │ Teamwork    │     Open Source & Self-Host    │ │
│  │  ★★★       │             ★★★                │ │
│  └─────────────┴─────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│         PRICING TEASER (Simple Cards)               │
│                                                     │
│   FREE              PRO                             │
│   Questions ∞      Questions ∞                      │
│   Users 1          Users ∞                          │
│   Analytics        Premium Support                  │
│                                                     │
│   [Get Started]    [Contact Sales]                  │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    FOOTER                           │
│  Logo  Links   Links   Links   Socials              │
│  © 2026 AUQ. All rights reserved.                   │
└─────────────────────────────────────────────────────┘
```

**Design Notes:**

- Hero: Full viewport height (h-screen)
- Typewriter animation: Cycles through AI tool names
- Feature cards: 3-column grid desktop, 1-column mobile
- Spacing: 80px between major sections (py-20)
- CTA buttons: Large, prominent, amber color

#### Pricing Page (`/pricing`)

```
┌─────────────────────────────────────────────────────┐
│                   Marketing Nav                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Page Title: Pricing Plans                          │
│  Subtitle: Choose the plan that fits your needs     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│         TIER CARDS (2-column desktop)               │
│                                                     │
│  ┌──────────────────┬──────────────────┐           │
│  │     FREE         │      PRO         │           │
│  │   $0/month       │   $29/month      │           │
│  │                  │                  │           │
│  │ • 50 Q/day      │ • Unlimited Q    │           │
│  │ • 1 user        │ • 10 users       │           │
│  │ • Email support │ • Priority sup   │           │
│  │ • 7-day history │ • 1-year history │           │
│  │                  │                  │           │
│  │ [Start Free]     │ [Start 14-day]   │           │
│  └──────────────────┴──────────────────┘           │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│      COMPARISON TABLE                               │
│  Feature         Free     Pro                       │
│  ─────────────────────────────────────────────────  │
│  Questions/day   50       Unlimited                 │
│  Users           1        10                        │
│  Analytics       Basic    Advanced                  │
│  Support         Email    Priority                  │
│  History          7 days   1 year                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│             FAQ SECTION                             │
│  Q: Can I upgrade anytime?                          │
│  A: Yes, upgrade at any time. You'll be prorated.   │
│  Q: Do you offer discounts for annual billing?      │
│  A: Yes, save 20% with annual billing.              │
│  Q: Is there a trial period?                        │
│  A: Yes, 14-day free trial for Pro.                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    FOOTER                           │
└─────────────────────────────────────────────────────┘
```

---

### 6.2 Auth Pages

#### Login Page (`/login`)

```
┌─────────────────────────────────────────────────────┐
│                   Marketing Nav                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                                                     │
│       ┌─────────────────────────────────┐           │
│       │       Sign in to AUQ            │           │
│       │                                 │           │
│       │ Email or password               │           │
│       │ [__________________________]     │           │
│       │                                 │           │
│       │ Password                        │           │
│       │ [__________________________]     │           │
│       │                                 │           │
│       │ [Forgot password?]              │           │
│       │                                 │           │
│       │    [Sign in with Email]         │           │
│       │                                 │           │
│       │  Or continue with:              │           │
│       │  [GitHub icon]   [Google icon]  │           │
│       │                                 │           │
│       │ Don't have account? [Sign up]   │           │
│       └─────────────────────────────────┘           │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    FOOTER                           │
└─────────────────────────────────────────────────────┘
```

**Design Notes:**

- Centered card layout (max-w-md)
- White background card on page background
- Form fields: Full width, no floating labels
- Social buttons: Full width, icon + text
- Typography: Monochrome (no colors except amber for CTA)

#### Signup Page (`/signup`)

```
┌─────────────────────────────────────────────────────┐
│                   Marketing Nav                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                                                     │
│       ┌─────────────────────────────────┐           │
│       │     Create your account          │           │
│       │                                 │           │
│       │ Email                           │           │
│       │ [__________________________]     │           │
│       │                                 │           │
│       │ Password (min 8 chars)          │           │
│       │ [__________________________]     │           │
│       │                                 │           │
│       │ Confirm Password                │           │
│       │ [__________________________]     │           │
│       │                                 │           │
│       │ ☐ I agree to the Terms         │           │
│       │                                 │           │
│       │    [Create Account]             │           │
│       │                                 │           │
│       │  Or sign up with:               │           │
│       │  [GitHub icon]   [Google icon]  │           │
│       │                                 │           │
│       │ Already have account? [Log in]  │           │
│       └─────────────────────────────────┘           │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    FOOTER                           │
└─────────────────────────────────────────────────────┘
```

---

### 6.3 App Pages

#### App Shell Layout

```
┌─────────────────────────────────────────┐
│            Top Navigation               │
│  AUQ Logo  [Breadcrumb]  User Avatar ▼  │
└─────────────────────────────────────────┘
┌──────────┬────────────────────────────┐
│          │                            │
│ Sidebar  │   Main Content Area        │
│          │                            │
│ • Inbox  │  (max-w-6xl)               │
│ • Analyt.│                            │
│ • Settgs │   Content                  │
│ • Admin  │   with padding             │
│          │                            │
│          │                            │
│ Logout   │                            │
└──────────┴────────────────────────────┘
```

**Desktop:** Sidebar always visible, width 256px (w-64)  
**Mobile:** Sidebar hidden by default, hamburger menu opens sheet overlay

#### Inbox Page (`/app/inbox`)

```
┌─────────────────────────────────────────────────────┐
│  Page Title: Questions Inbox                        │
│  [Filter: All] [Filter: Pending] [Search...]        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  QUESTION CARDS                     │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ [Pending]  Database Choice          3h ago  │   │
│  │ Should we use PostgreSQL or MongoDB?        │   │
│  │ [Answer] [View Details]                     │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ [Answered] Async vs Sync           1h ago   │   │
│  │ Should this be async or sync?               │   │
│  │ ✓ Answered: "Async"                         │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ [Pending]  Framework Choice         now     │   │
│  │ React or Vue for this component?            │   │
│  │ [Answer] [View Details]                     │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  No more questions. You're all caught up! 🎉       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Cards Layout:**

```
┌─────────────────────────────────────┐
│ [Badge]  Title                  Time │
│ Prompt text (max 2 lines)            │
│ [Action] [More Info]                 │
└─────────────────────────────────────┘
```

#### Question Detail Page (`/app/questions/{id}`)

```
┌─────────────────────────────────────────────────────┐
│  [← Back to Inbox]                                  │
│                                                     │
│  Question #1 of 3: Database Choice                  │
│  [Pending] • Asked 3 hours ago                      │
│                                                     │
│  Should we use PostgreSQL or MongoDB?               │
│  Consider: ACID compliance, scalability, cost       │
│                                                     │
│  ○ PostgreSQL (ACID, structured, mature)            │
│  ○ MongoDB (NoSQL, flexible, newer)                 │
│  ○ Other: _______________                           │
│                                                     │
│  [Not applicable / Request elaboration]             │
│                                                     │
│              [Submit Answer]                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Analytics Page (`/app/analytics`)

```
┌─────────────────────────────────────────────────────┐
│  Page Title: Analytics                              │
│  Your metrics for the last 30 days                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              STATS CARDS (4-column grid)             │
│  ┌──────────────┐ ┌──────────────┐ ...             │
│  │     347      │ │  2h 14m      │                 │
│  │  Questions   │ │  Avg Response│                 │
│  │  (30 days)   │ │  Time        │                 │
│  └──────────────┘ └──────────────┘                 │
│  ┌──────────────┐ ┌──────────────┐                 │
│  │    45%       │ │     156      │                 │
│  │  Answered    │ │  Pending     │                 │
│  │   Ratio      │ │  (Active)    │                 │
│  └──────────────┘ └──────────────┘                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│    QUESTIONS PER DAY CHART (Area Chart)             │
│                                                     │
│  350 │                                              │
│  300 │        ╱╲                                    │
│  250 │      ╱    ╲      ╱╲                          │
│  200 │    ╱        ╲  ╱    ╲                        │
│  150 │  ╱            ╲        ╲                     │
│  100 │╱                ╲        ╲╱╲                 │
│   50 │                  ╲          ╲╱╲              │
│    0 └──────────────────────────────────────        │
│      Mar 1  Mar 8  Mar 15  Mar 22  Mar 31           │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  RESPONSE TIME DISTRIBUTION (Bar Chart)             │
│                                                     │
│  160 │                                              │
│  120 │  ███           ██                            │
│   80 │  ███  ███  ███ ██                            │
│   40 │  ███  ███  ███ ██                            │
│    0 └──────────────────────────────────────        │
│      0-5m  5-15m 15-60m 1h+                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Settings Page (`/app/settings`)

```
┌─────────────────────────────────────────────────────┐
│  Page Title: Settings                               │
│                                                     │
│  [General] [API Keys] [Notifications] [Appearance] │
│                                                     │
│  GENERAL TAB (shown)                                │
│                                                     │
│  Profile Name                                       │
│  [_______________]                                  │
│                                                     │
│  Email                                              │
│  user@example.com (verified ✓)                      │
│                                                     │
│  Workspace                                          │
│  [My Workspace ▼]                                   │
│  [Rename] [Delete]                                  │
│                                                     │
│  ─────────────────────────────────────────────      │
│  Danger Zone                                        │
│  [Delete My Account] (with confirmation)            │
│                                                     │
│               [Save Changes]                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**API Keys Tab:**

```
TABLE:
┌─────────────────────────────────────────────────┐
│ Name         │ Created  │ Last Used │ Actions   │
├─────────────────────────────────────────────────┤
│ Claude Dev   │ Mar 10   │ Mar 17    │ ⋯ Revoke  │
│ Cursor Key   │ Jan 5    │ Never     │ ⋯ Revoke  │
└─────────────────────────────────────────────────┘

[Create New API Key] button
```

#### Admin Page (`/app/admin`)

```
┌─────────────────────────────────────────────────────┐
│  Page Title: Admin Dashboard                        │
│  (Visible only to workspace owners)                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│               WORKSPACES TABLE                      │
│                                                     │
│ Workspace        Users  Questions  Created          │
│ My Workspace      1        347     Mar 10           │
│ Team Project      5        892     Feb 1            │
│ Research         3        156     Jan 15            │
│                                                     │
│ [Create Workspace] button                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 7. Animation & Micro-interactions

### Typewriter Hero Animation

**Location:** Landing page hero section  
**Duration:** Infinite loop  
**Algorithm:**

1. Cycle through: "Claude Code" → "OpenClaw" → "Cursor" → "Windsurf" → "Devin" → "Open Code"
2. Type at speed: 120ms per character
3. Dwell: 2000ms after full text shown
4. Delete at speed: 60ms per character
5. Pause: 100ms before next word

**Visual:**

```
Questions from Claude Code|

Questions from OpenClaw|

Questions from Cursor|

...
```

### Transition Timings

| Element              | Duration | Easing      | Use Case                |
| -------------------- | -------- | ----------- | ----------------------- |
| Page transitions     | 300ms    | ease-in-out | Route changes           |
| Hover effects        | 150ms    | ease-out    | Button hover, card lift |
| Toast notifications  | 200ms    | ease-in     | Slide in/out            |
| Modal/Dialog         | 200ms    | ease-in-out | Open/close              |
| Loading skeleton     | N/A      | fade        | Placeholder to content  |
| SSE question arrival | 200ms    | fade        | New card appears        |
| Expand/collapse      | 200ms    | ease-in-out | Details reveal          |

### Interactive States

**Buttons:**

- **Hover:** Darker background, slight shadow
- **Active:** Even darker, no shadow
- **Focus:** 2px amber ring outline
- **Disabled:** 50% opacity, no hover effect

**Form Inputs:**

- **Default:** Light border
- **Focus:** Amber border + 2px ring
- **Error:** Red border + error message below
- **Disabled:** Gray background, no interaction

**Cards:**

- **Hover:** Subtle shadow increase
- **Active:** Amber left border (3px)

**Tables (rows):**

- **Hover:** Subtle background highlight (muted color)
- **Selection:** Checkbox highlight

---

## 8. Responsive Design

### Breakpoints (Tailwind v4)

```
sm: 640px   (mobile)
md: 768px   (tablet)
lg: 1024px  (desktop)
xl: 1280px  (large desktop)
2xl: 1536px (ultra-wide)
```

### Mobile-First Approach

Build for **mobile (375px)** first, then enhance for larger screens.

### Key Responsive Patterns

**Navigation:**

- Mobile: Hamburger menu → sheet overlay
- Desktop: Always-visible sidebar

**Cards:**

- Mobile: Full width (px-4)
- Tablet: 2-column grid (md:grid-cols-2)
- Desktop: 3+ column grid (lg:grid-cols-3)

**Typography:**

- Mobile: Text base (16px)
- Desktop: Text lg (18px) for headers

**Spacing:**

- Mobile: Tighter (px-4 py-3)
- Desktop: Generous (px-8 py-6)

### Touch Targets (Mobile)

- Minimum 44px × 44px for interactive elements
- Buttons: 48px × 48px preferred
- Padding between elements: 12px minimum

---

## 9. Dark Mode Implementation

### Strategy

**Toggle Control:**

- Button in sidebar or top-right corner
- Persistent in localStorage: `theme: 'light' | 'dark'`
- Default: `light` (per CEO requirement)

**CSS Implementation:**

```css
:root {
  --background: hsl(0 0% 100%);
  /* ... light mode variables ... */
}

html.dark {
  --background: hsl(222 47% 6%);
  /* ... dark mode variables ... */
}
```

**Svelte Implementation:**

```svelte
<script>
  let isDark = $state(false);

  $effect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  });

  onMount(() => {
    const saved = localStorage.getItem('theme');
    isDark = saved === 'dark';
  });
</script>

<Button on:click={() => isDark = !isDark}>
  {isDark ? '☀️' : '🌙'}
</Button>
```

---

## 10. Icon System

### Icon Library: Lucide Icons

**Via:** `@lucide/svelte` package

**Commonly Used Icons:**

| Icon            | Purpose            |
| --------------- | ------------------ |
| `Home`          | Inbox nav          |
| `BarChart3`     | Analytics nav      |
| `Settings`      | Settings nav       |
| `Shield`        | Admin nav          |
| `LogOut`        | Logout             |
| `Menu`          | Mobile hamburger   |
| `X`             | Close dialog       |
| `Check`         | Success/completion |
| `Clock`         | Timestamps         |
| `AlertCircle`   | Errors             |
| `Info`          | Information        |
| `Copy`          | Copy to clipboard  |
| `Trash2`        | Delete action      |
| `Eye`, `EyeOff` | Password toggle    |
| `ChevronDown`   | Dropdowns          |
| `Search`        | Search input       |
| `Bell`          | Notifications      |
| `Moon`, `Sun`   | Dark mode toggle   |

**Icon Usage:**

```svelte
<script>
  import { Home, LogOut } from 'lucide-svelte';
</script>

<Home size={24} strokeWidth={2} />
<LogOut size={20} strokeWidth={1.5} />
```

**Size Convention:**

- Navigation items: 24px
- Buttons: 20px
- Inline (text): 16px
- Large hero icons: 48px

---

## 11. Accessibility

### WCAG 2.1 AA Compliance

- **Color Contrast:** 4.5:1 for all text
- **Focus Indicators:** Always visible (2px ring)
- **Keyboard Navigation:** Tab through all elements in logical order
- **Labels:** All inputs have associated labels
- **Alt Text:** Images have descriptive alt text
- **Semantic HTML:** Proper heading hierarchy (h1, h2, h3)

### Screen Reader Testing

- [ ] All interactive elements announced properly
- [ ] Form error messages clearly announced
- [ ] Loading states clearly announced
- [ ] Live regions (SSE updates) announced with `role="status"`

### Mobile Accessibility

- [ ] Touch targets 44px minimum
- [ ] Text resizable (no fixed viewport)
- [ ] No auto-playing content
- [ ] No flashing content (no seizure risk)

---

## 12. Design Tokens Reference

Quick lookup for design token values:

```css
/* Colors */
--primary: #f59e0b
--success: #22c55e
--warning: #f59e0b
--error: #ef4444
--info: #3b82f6

/* Typography */
--font-sans: Inter
--font-mono: JetBrains Mono
--font-size-base: 16px
--leading-normal: 150%

/* Spacing */
--spacing-unit: 4px
--spacing-default: 16px (4 × unit)

/* Borders */
--radius-default: 8px
--border-width-default: 1px

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
--shadow-md: 0 4px 6px rgba(0,0,0,0.1)
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1)

/* Z-Index **
--z-base: 0
--z-dropdown: 50
--z-sticky: 20
--z-fixed: 40
--z-modal: 1000
--z-tooltip: 1100
```

---

## 13. Resources & Tooling

### Design Tools

- **Figma:** Design mockups (optional, not required)
- **Storybook:** Component showcase (future addition)

### Color Tools

- [Tailwind Color Generator](https://www.tints.dev)
- [HSL Color Picker](https://hslpicker.com)

### Accessibility Tools

- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker)
- [Lighthouse Audit](https://developers.google.com/web/tools/lighthouse)

### Font Tools

- [Google Fonts](https://fonts.google.com)
- [Font Pairing Guide](https://www.fontpairings.com)

---

## 14. Version History

| Version | Date     | Changes               |
| ------- | -------- | --------------------- |
| 1.0     | Mar 2026 | Initial design system |

---

**Last Reviewed:** March 2026  
**Next Review:** September 2026 (semi-annual)
