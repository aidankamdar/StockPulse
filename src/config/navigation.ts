import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  BarChart3,
  Bot,
  Eye,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Portfolio", href: "/portfolio", icon: Briefcase },
  { title: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "AI Insights", href: "/ai", icon: Bot },
  { title: "Watchlist", href: "/watchlist", icon: Eye },
  { title: "Alerts", href: "/alerts", icon: Bell },
];

export const bottomNavItems: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings },
];
