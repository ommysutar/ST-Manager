import {
  BarChart3,
  Calendar,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  Mic2,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  comingSoon?: boolean;
}

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "New Inquiry",
    href: "/inquiries/new",
    icon: ClipboardList,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: Calendar,
  },
  {
    label: "Sessions",
    href: "/sessions",
    icon: Mic2,
  },
  {
    label: "Billing",
    href: "/billing",
    icon: Receipt,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];
