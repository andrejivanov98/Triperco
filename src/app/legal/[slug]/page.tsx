import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/landing/SiteFooter'
import { Heading } from '@/components/ui/Heading'
import { LEGAL_DOCUMENTS, legalDocument } from '@/lib/legal/documents'

export function generateStaticParams() {
  return LEGAL_DOCUMENTS.map((doc) => ({ slug: doc.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = legalDocument(slug)
  return doc ? { title: `${doc.title} · Triperco`, description: doc.summary } : {}
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = legalDocument(slug)
  if (!doc) notFound()

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl px-6 py-14">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Legal</p>
        <Heading level={1} className="mt-2 text-4xl text-deep">
          {doc.title}
        </Heading>
        <p className="mt-3 text-sm font-medium text-muted">{doc.summary}</p>
        <p className="mt-1 text-xs font-medium text-muted">Last updated {doc.updated}</p>

        <div className="mt-10 flex flex-col gap-9">
          {doc.sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-3">
              <Heading level={2} className="text-xl text-ink">
                {section.heading}
              </Heading>
              {section.body.map((paragraph, i) => (
                <p key={i} className="text-[15px] font-medium leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
