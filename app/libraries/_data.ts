// Curated list of popular libraries for the stacks ForzaPanel runs on.
// Purely informational — the page shows the install command and copies it to
// the clipboard. No installs are executed from the browser.

export interface LibraryItem {
  name: string;
  description: string;
  install: string;
  tags: string[];
}

export interface LibraryGroup {
  id: string;
  label: string;
  registry: string;
  description: string;
  icon: string;
  accent: string;
  libraries: LibraryItem[];
}

export const LIBRARY_GROUPS: LibraryGroup[] = [
  {
    id: "node",
    label: "Node.js",
    registry: "npm",
    description: "JavaScript and TypeScript libraries",
    icon: "N",
    accent: "bg-emerald-500/10 text-emerald-500",
    libraries: [
      {
        name: "express",
        description: "Fast, unopinionated web framework for APIs and sites.",
        install: "npm i express",
        tags: ["web", "api"],
      },
      {
        name: "next",
        description: "React framework with routing, SSR and API routes.",
        install: "npm i next react react-dom",
        tags: ["web", "ssr"],
      },
      {
        name: "react",
        description: "Component library for building user interfaces.",
        install: "npm i react react-dom",
        tags: ["ui"],
      },
      {
        name: "typescript",
        description: "Typed superset of JavaScript with a compiler.",
        install: "npm i -D typescript",
        tags: ["language"],
      },
      {
        name: "axios",
        description: "Promise-based HTTP client for browsers and Node.",
        install: "npm i axios",
        tags: ["http"],
      },
      {
        name: "zod",
        description: "TypeScript-first schema validation.",
        install: "npm i zod",
        tags: ["validation"],
      },
      {
        name: "prisma",
        description: "Type-safe ORM for MySQL, Postgres and SQLite.",
        install: "npm i prisma @prisma/client",
        tags: ["database", "orm"],
      },
      {
        name: "vitest",
        description: "Fast unit test runner with a Jest-compatible API.",
        install: "npm i -D vitest",
        tags: ["testing"],
      },
    ],
  },
  {
    id: "python",
    label: "Python",
    registry: "pip",
    description: "Python libraries and frameworks",
    icon: "Py",
    accent: "bg-sky-500/10 text-sky-500",
    libraries: [
      {
        name: "requests",
        description: "Human-friendly HTTP library.",
        install: "pip install requests",
        tags: ["http"],
      },
      {
        name: "flask",
        description: "Lightweight WSGI web framework.",
        install: "pip install flask",
        tags: ["web"],
      },
      {
        name: "fastapi",
        description: "Async API framework with automatic OpenAPI docs.",
        install: "pip install fastapi uvicorn",
        tags: ["web", "api"],
      },
      {
        name: "django",
        description: "Batteries-included web framework.",
        install: "pip install django",
        tags: ["web"],
      },
      {
        name: "pandas",
        description: "Data analysis and manipulation toolkit.",
        install: "pip install pandas",
        tags: ["data"],
      },
      {
        name: "numpy",
        description: "Array and numerical computing core.",
        install: "pip install numpy",
        tags: ["data", "math"],
      },
      {
        name: "pytest",
        description: "Simple, scalable testing framework.",
        install: "pip install pytest",
        tags: ["testing"],
      },
      {
        name: "pillow",
        description: "Image processing and conversion library.",
        install: "pip install pillow",
        tags: ["media"],
      },
    ],
  },
  {
    id: "php",
    label: "PHP",
    registry: "composer",
    description: "PHP libraries pulled in with Composer",
    icon: "P",
    accent: "bg-violet-500/10 text-violet-500",
    libraries: [
      {
        name: "laravel/framework",
        description: "Full-stack PHP framework with ORM and queues.",
        install: "composer require laravel/framework",
        tags: ["web"],
      },
      {
        name: "guzzlehttp/guzzle",
        description: "HTTP client for PHP.",
        install: "composer require guzzlehttp/guzzle",
        tags: ["http"],
      },
      {
        name: "monolog/monolog",
        description: "Structured logging for PHP.",
        install: "composer require monolog/monolog",
        tags: ["logging"],
      },
      {
        name: "symfony/console",
        description: "Build CLI applications and commands.",
        install: "composer require symfony/console",
        tags: ["cli"],
      },
      {
        name: "phpmailer/phpmailer",
        description: "Email sending with SMTP support.",
        install: "composer require phpmailer/phpmailer",
        tags: ["email"],
      },
      {
        name: "stripe/stripe-php",
        description: "Stripe payments SDK.",
        install: "composer require stripe/stripe-php",
        tags: ["payments"],
      },
    ],
  },
];

export const TOTAL_LIBRARIES = LIBRARY_GROUPS.reduce(
  (sum, group) => sum + group.libraries.length,
  0,
);
