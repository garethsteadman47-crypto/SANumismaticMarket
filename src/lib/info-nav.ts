import type { LucideIcon } from "lucide-react";
import {
  BookOpenIcon,
  Building2Icon,
  FileTextIcon,
  MailIcon,
  NewspaperIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";

export const MORE_INFO_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/info/about", label: "About Us", icon: Building2Icon },
  { href: "/info/newsletters", label: "Newsletters", icon: NewspaperIcon },
  { href: "/info/education", label: "Education & Guides", icon: BookOpenIcon },
  { href: "/info/grading", label: "Grading & Certification", icon: ShieldIcon },
  { href: "/info/terms", label: "Terms & Conditions", icon: FileTextIcon },
  { href: "/info/societies", label: "Societies & Clubs", icon: UsersIcon },
  { href: "/info/contact", label: "Contact Us", icon: MailIcon },
];
