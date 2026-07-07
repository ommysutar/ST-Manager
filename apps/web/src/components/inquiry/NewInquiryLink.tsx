"use client";

import type { ComponentPropsWithoutRef } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { navigateToNewInquiry } from "@/lib/inquiry/new-inquiry";

type NewInquiryLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "href"> & {
  href?: never;
};

/** Opens a fresh inquiry wizard — never restores a previous draft or form state. */
export function NewInquiryLink({ onClick, ...props }: NewInquiryLinkProps) {
  const router = useRouter();

  return (
    <Link
      {...props}
      href="/inquiries/new"
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }

        event.preventDefault();
        navigateToNewInquiry(router.push);
      }}
    />
  );
}
