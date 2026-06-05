const CLOSE_DETAIL_SECTIONS_PARAM = "sections"
const CLOSE_DETAIL_SECTIONS_VALUE = "closed"

export function getCaseDetailHrefWithClosedSections(caseId: number) {
    return `/${caseId}?${CLOSE_DETAIL_SECTIONS_PARAM}=${CLOSE_DETAIL_SECTIONS_VALUE}`
}

export function shouldCloseCaseDetailSections(searchParams: { get: (name: string) => string | null }) {
    return searchParams.get(CLOSE_DETAIL_SECTIONS_PARAM) === CLOSE_DETAIL_SECTIONS_VALUE
}
