import Link from "next/link";
import PageShell from "./components/PageShell";

export default function NotFound() {
  return (
    <PageShell view="other">
      <div className="surface-card rounded-container px-4 py-10 text-center">
        <p className="text-h2 font-bold">찾는 화면이 없어요</p>
        <Link href="/" className="focus-ring link-shortcut mt-3">
          홈으로
        </Link>
      </div>
    </PageShell>
  );
}
