import Image from "next/image";
import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/brand";

/** Wordmark used in the app shell and on legal pages. */
export function BrandMark({
  className = "",
  wordmarkClassName = "font-display text-base font-bold text-foreground",
  iconSize = 28,
}: {
  className?: string;
  wordmarkClassName?: string;
  iconSize?: number;
}) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/nova/app-icon.png"
        alt=""
        width={iconSize}
        height={iconSize}
        className="rounded-lg"
      />
      <span className={wordmarkClassName}>{PRODUCT_NAME}</span>
    </Link>
  );
}
