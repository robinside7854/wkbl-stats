// 용어 풀이 /glossary (메뉴에는 없고 ⓘ "자세히"·푸터에서)
import { GLOSSARY } from "@/lib/glossary";
import PageShell, { PageTitle } from "@/app/components/PageShell";

export const metadata = { title: "용어 풀이" };

export default function GlossaryPage() {
  return (
    <PageShell view="glossary">
      <PageTitle title="용어 풀이" />
      <div className="space-y-3">
        {GLOSSARY.map((e) => (
          <section key={e.key} id={e.anchor} className="surface-card scroll-mt-4 rounded-container p-4">
            <h2 className="text-h2 font-bold">{e.name}</h2>
            <p className="mt-1 text-body text-ink-2">{e.short}</p>
            {e.formula && <p className="mt-2 rounded-control bg-surface-2 px-2.5 py-2 text-sub">{e.formula}</p>}
            {e.note && <p className="mt-2 text-sub text-ink-3">{e.note}</p>}
          </section>
        ))}
      </div>
    </PageShell>
  );
}
