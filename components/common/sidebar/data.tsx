import type { ReactNode } from "react";
import {
  AlphabetIcon,
  CalendarIcon,
  ChatIcon,
  HomeIcon,
  InvoiceIcon,
  LetterIcon,
  PieChartIcon,
  TableIcon,
  TaskIcon,
  UserIcon,
  Widget4Icon,
} from "./icon";

interface NavSubItem {
  title: string;
  url?: string;
}

interface NavItem {
  title: string;
  url?: string;
  icon?: ReactNode;
  items: NavSubItem[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_DATA: NavSection[] = [
  {
    label: "SERVER",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: <HomeIcon />,
        items: [],
      },
      {
        title: "Servers",
        url: "/servers",
        icon: <TableIcon />,
        items: [],
      },
      {
        title: "Databases",
        url: "/databases/mysql",
        icon: <InvoiceIcon />,
        items: [],
      },
      {
        title: "Containers",
        url: "#containers",
        icon: <Widget4Icon />,
        items: [],
      },
      {
        title: "Files",
        url: "/files",
        icon: <AlphabetIcon />,
        items: [],
      },
      {
        title: "Terminal",
        url: "#terminal",
        icon: <ChatIcon />,
        items: [],
      },
      {
        title: "Backups",
        url: "#backups",
        icon: <CalendarIcon />,
        items: [],
      },
      {
        title: "Network",
        url: "#network",
        icon: <PieChartIcon />,
        items: [],
      },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      {
        title: "Processes",
        url: "/system/processes",
        icon: <TaskIcon />,
        items: [],
      },
      {
        title: "Mail",
        url: "#mail",
        icon: <LetterIcon />,
        items: [],
      },
      {
        title: "Profile",
        url: "#profile",
        icon: <UserIcon />,
        items: [],
      },
    ],
  },
];
