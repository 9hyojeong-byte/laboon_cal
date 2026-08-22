// The event's author name is embedded as the first "/"-separated segment of
// the auto-generated title (see buildAutoTitle in EventForm.tsx), e.g.
// "철수/딥스/1부". Attendee list order coming back from the DB is not
// guaranteed stable, so the title -- not array position -- is the source of
// truth for who created the event.
export function getAuthorNameFromTitle(
  title: string | null | undefined,
  location: string | null | undefined
): string | null {
  if (!title) return null;
  const firstSegment = title.split('/')[0]?.trim();
  if (!firstSegment) return null;
  // buildAutoTitle omits the author segment entirely when no author name was
  // entered, so the title starts with the location instead -- that's not an
  // author name.
  if (location && firstSegment === location) return null;
  return firstSegment;
}
