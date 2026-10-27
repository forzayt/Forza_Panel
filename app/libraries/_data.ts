// Popular stacks you can run on a ForzaPanel host.
// Flat list only — no individual libraries or install commands.

export type LibraryCategory = "Language" | "Runtime" | "Database";

export interface LibraryItem {
  name: string;
  description: string;
  category: LibraryCategory;
  icon: string;
  accent: string;
}

export const LIBRARIES: LibraryItem[] = [
  {
    name: "Node.js",
    description: "JavaScript runtime for panels, APIs and bots.",
    category: "Runtime",
    icon: "N",
    accent: "bg-emerald-500/10 text-emerald-500",
  },
  {
    name: "Python",
    description: "General-purpose language for scripts and services.",
    category: "Language",
    icon: "Py",
    accent: "bg-sky-500/10 text-sky-500",
  },
  {
    name: "Java",
    description: "JVM runtime — required by many game servers.",
    category: "Runtime",
    icon: "J",
    accent: "bg-orange-500/10 text-orange-400",
  },
  {
    name: "PHP",
    description: "Server-side scripting for web apps and panels.",
    category: "Language",
    icon: "P",
    accent: "bg-violet-500/10 text-violet-500",
  },
  {
    name: "Go",
    description: "Compiled language for small, fast services.",
    category: "Language",
    icon: "Go",
    accent: "bg-cyan-500/10 text-cyan-400",
  },
  {
    name: "Rust",
    description: "Systems language for performance-critical tools.",
    category: "Language",
    icon: "R",
    accent: "bg-rose-500/10 text-rose-400",
  },
  {
    name: "Ruby",
    description: "Ruby and Rails for quick web backends.",
    category: "Language",
    icon: "Rb",
    accent: "bg-red-500/10 text-red-400",
  },
  {
    name: ".NET",
    description: "C# runtime for ASP.NET services and tools.",
    category: "Runtime",
    icon: ".N",
    accent: "bg-indigo-500/10 text-indigo-400",
  },
  {
    name: "MySQL",
    description: "Relational database used by most game panels.",
    category: "Database",
    icon: "My",
    accent: "bg-amber-500/10 text-amber-500",
  },
  {
    name: "MariaDB",
    description: "Drop-in MySQL replacement.",
    category: "Database",
    icon: "Ma",
    accent: "bg-teal-500/10 text-teal-400",
  },
  {
    name: "PostgreSQL",
    description: "Advanced open-source relational database.",
    category: "Database",
    icon: "Pg",
    accent: "bg-blue-500/10 text-blue-400",
  },
  {
    name: "MongoDB",
    description: "Document database for JSON-shaped data.",
    category: "Database",
    icon: "Mo",
    accent: "bg-lime-500/10 text-lime-500",
  },
  {
    name: "Redis",
    description: "In-memory cache, queues and key-value store.",
    category: "Database",
    icon: "Re",
    accent: "bg-pink-500/10 text-pink-400",
  },
  {
    name: "SQLite",
    description: "Embedded, file-based SQL engine.",
    category: "Database",
    icon: "Sq",
    accent: "bg-slate-500/10 text-slate-400",
  },
];

export const LIBRARY_CATEGORIES: LibraryCategory[] = ["Language", "Runtime", "Database"];
