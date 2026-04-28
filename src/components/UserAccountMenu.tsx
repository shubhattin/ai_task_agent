"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { LogOut } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverTrigger,
} from "@/components/ui/popover";

function initialsFrom(name: string | null, email: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email?.trim()) {
    return email[0]!.toUpperCase();
  }
  return "?";
}

type UserAccountMenuProps = {
  /** Where the popover opens (use `right` when the trigger sits on the left sidebar). */
  popoverSide?: "top" | "right" | "bottom" | "left";
  popoverAlign?: "start" | "center" | "end";
};

export function UserAccountMenu({
  popoverSide = "bottom",
  popoverAlign = "end",
}: UserAccountMenuProps) {
  const profile = useQuery(api.viewer.getProfile);
  const { signOut } = useAuthActions();

  const name = profile?.name ?? null;
  const email = profile?.email ?? null;
  const picture = profile?.picture ?? null;
  const title = name || (email ? "Signed in" : "Account");
  const primaryLine = profile === undefined ? "…" : name || email || "Account";
  const secondaryLine = profile === undefined ? "" : name && email ? email : "";

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className="group flex w-full min-w-0 max-w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left outline-none ring-offset-background hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Account menu: profile and sign out"
      >
        <Avatar size="sm" className="size-9 shrink-0 cursor-pointer">
          {picture ? (
            <AvatarImage src={picture} alt={name || email || "Account"} />
          ) : null}
          <AvatarFallback className="text-xs font-medium">
            {profile === undefined ? "…" : initialsFrom(name, email)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">
            {primaryLine}
          </p>
          {secondaryLine ? (
            <p className="truncate text-[10px] text-muted-foreground">
              {secondaryLine}
            </p>
          ) : null}
        </div>
      </PopoverTrigger>
      <PopoverContent
        side={popoverSide}
        align={popoverAlign}
        sideOffset={6}
        className="w-72"
      >
        <PopoverHeader>
          <PopoverTitle className="truncate max-w-full">{title}</PopoverTitle>
          {email ? (
            <PopoverDescription className="text-xs break-all">
              {email}
            </PopoverDescription>
          ) : null}
        </PopoverHeader>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-center gap-2"
          onClick={() => void signOut()}
        >
          <LogOut className="size-3.5" />
          Sign out
        </Button>
      </PopoverContent>
    </Popover>
  );
}
