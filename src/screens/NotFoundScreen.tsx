import Page from '../components/Page'
import { ButtonLink, Label, Ticket } from '../components/ui/primitives'

/** Any route the app does not know: a real state, not a blank page. */
export default function NotFoundScreen() {
  return (
    <Page>
      <div className="mx-auto mt-8 max-w-xl">
        <Ticket
          header={<Label className="whitespace-nowrap text-ink">Not found</Label>}
          bodyClassName="flex flex-col items-start gap-4 p-5 sm:p-6"
        >
          <h1 className="text-title font-extrabold tracking-tight text-ink">That page isn’t on the rail</h1>
          <p className="max-w-prose text-lg text-ink-2">
            The link may be old, or the page may have moved. Every recipe in the app is one tap away.
          </p>
          <ButtonLink to="/" className="whitespace-nowrap">
            Back to recipes
          </ButtonLink>
        </Ticket>
      </div>
    </Page>
  )
}
