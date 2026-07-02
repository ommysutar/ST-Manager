import { Building2, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  {
    label: "Studios",
    href: "/studios",
    icon: Building2,
  },
];
