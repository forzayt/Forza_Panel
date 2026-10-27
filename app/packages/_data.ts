// Curated list of popular packages for the stacks ForzaPanel runs on.
// Purely informational for now — the page shows the install command and
// copies it to the clipboard. No installs are executed from the browser.

export interface PackageItem {
  name: string;
  description: string;
  install: string;
  tags: string[];
}

export interface PackageGroup {
  id: string;
  label: string;
  runtime: string;
  description: string;
  icon: string;
  accent: string;
  packages: PackageItem[];
}

export const PACKAGE_GROUPS: PackageGroup[] = [
  {
    id: "node",
    label: "Node.js",
    runtime: "npm",
    description: "Server-side JavaScript and tooling",
    icon: "N",
    accent: "bg-emerald-500/10 text-emerald-500",
    packages: [
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
    runtime: "pip",
    description: "Scripts, web services and data tooling",
    icon: "Py",
    accent: "bg-sky-500/10 text-sky-500",
    packages: [
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
    runtime: "composer",
    description: "Libraries pulled in with Composer",
    icon: "P",
    accent: "bg-violet-500/10 text-violet-500",
    packages: [
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
  {
    id: "databases",
    label: "MySQL & Databases",
    runtime: "apt",
    description: "SQL and key-value servers",
    icon: "DB",
    accent: "bg-orange-500/10 text-orange-400",
    packages: [
      {
        name: "mysql-server",
        description: "Oracle MySQL 8 server.",
        install: "sudo apt install mysql-server",
        tags: ["sql", "server"],
      },
      {
        name: "mariadb-server",
        description: "Drop-in MySQL replacement.",
        install: "sudo apt install mariadb-server",
        tags: ["sql", "server"],
      },
      {
        name: "postgresql",
        description: "Advanced open-source SQL server.",
        install: "sudo apt install postgresql",
        tags: ["sql", "server"],
      },
      {
        name: "redis-server",
        description: "In-memory cache and key-value store.",
        install: "sudo apt install redis-server",
        tags: ["cache", "nosql"],
      },
      {
        name: "mongodb-community",
        description: "Document database for JSON-shaped data.",
        install: "sudo apt install mongodb-community",
        tags: ["nosql"],
      },
      {
        name: "sqlite3",
        description: "Embedded, file-based SQL engine.",
        install: "sudo apt install sqlite3",
        tags: ["sql", "embedded"],
      },
      {
        name: "phpmyadmin",
        description: "Web UI for managing MySQL and MariaDB.",
        install: "sudo apt install phpmyadmin",
        tags: ["sql", "ui"],
      },
    ],
  },
  {
    id: "system",
    label: "System tools",
    runtime: "apt",
    description: "Utilities for running game servers",
    icon: "S",
    accent: "bg-cyan-500/10 text-cyan-400",
    packages: [
      {
        name: "git",
        description: "Version control for templates and configs.",
        install: "sudo apt install git",
        tags: ["dev"],
      },
      {
        name: "curl",
        description: "HTTP client for scripts and API checks.",
        install: "sudo apt install curl",
        tags: ["network"],
      },
      {
        name: "nginx",
        description: "Reverse proxy and static web server.",
        install: "sudo apt install nginx",
        tags: ["web", "proxy"],
      },
      {
        name: "docker.io",
        description: "Container runtime for isolated services.",
        install: "sudo apt install docker.io",
        tags: ["containers"],
      },
      {
        name: "screen",
        description: "Detachable terminal sessions for game servers.",
        install: "sudo apt install screen",
        tags: ["terminal"],
      },
      {
        name: "ufw",
        description: "Simple host firewall.",
        install: "sudo apt install ufw",
        tags: ["security"],
      },
      {
        name: "ffmpeg",
        description: "Audio and video transcoding suite.",
        install: "sudo apt install ffmpeg",
        tags: ["media"],
      },
    ],
  },
];

export const TOTAL_PACKAGES = PACKAGE_GROUPS.reduce(
  (sum, group) => sum + group.packages.length,
  0,
);
