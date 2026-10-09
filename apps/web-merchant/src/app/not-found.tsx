import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

/** Friendly 404 so a mistyped URL still offers a way forward. */
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center bg-canvas px-5 py-16">
      <section className="w-full max-w-md rounded-card bg-surface p-6 text-center shadow-e1">
        <h1 className="text-xl font-extrabold tracking-tight">
          Page not found
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          That page doesn&apos;t exist. Let&apos;s get you back to your
          workspace.
        </p>
        <Link href="/" className={buttonClasses({ className: "mt-5" })}>
          Go to my workspace
        </Link>
      </section>
    </main>
  );
}
