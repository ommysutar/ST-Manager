import {
  BarChart3,
  Building2,
  Calendar,
  LayoutDashboard,
  Mic2,
  Receipt,
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
    label: "Studios",
    href: "/studios",
    icon: Building2,
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
    disabled: true,
    comingSoon: true,
  },
  {
    label: "Sessions",
    href: "/sessions",
    icon: Mic2,
    disabled: true,
    comingSoon: true,
  },
  {
    label: "Billing",
    href: "/billing",
    icon: Receipt,
    disabled: true,
    comingSoon: true,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    disabled: true,
    comingSoon: true,
  },
];
