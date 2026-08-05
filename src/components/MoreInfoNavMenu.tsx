"use client";

import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MORE_INFO_LINKS } from "@/lib/info-nav";

/** Desktop "More Info" dropdown for numismatic resources and legal pages. */
export function MoreInfoNavMenu() {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto gap-1 px-0 py-0 text-sm font-medium text-muted-foreground hover:bg-transparent hover:text-foreground data-popup-open:text-foreground"
          />
        }
      >
        More Info
        <ChevronDownIcon className="size-3.5 opacity-70" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuGroup>
          {MORE_INFO_LINKS.map(({ href, label, icon: Icon }) => (
            <DropdownMenuItem key={href} onClick={() => router.push(href)}>
              <Icon />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
