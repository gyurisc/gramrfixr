import Link from "next/link";

export default function Header() {
  return (
    <header className="flex w-full items-center justify-between">
      <Link href="/" className="flex space-x-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
          GramrFixr
        </h1>
      </Link>
    </header>
  );
}
