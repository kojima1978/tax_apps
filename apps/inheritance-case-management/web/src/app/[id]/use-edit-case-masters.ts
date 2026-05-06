import { useEffect, useState } from "react"
import type { Assignee, HeirPerson, Referrer, RelatedPartyPerson } from "@/types/shared"
import { getAssignees } from "@/lib/api/assignees"
import { getReferrers } from "@/lib/api/referrers"
import { getHeirPersons } from "@/lib/api/heir-persons"
import { getRelatedPartyPersons } from "@/lib/api/related-party-persons"

export function useEditCaseMasters() {
    const [assignees, setAssignees] = useState<Assignee[]>([])
    const [referrers, setReferrers] = useState<Referrer[]>([])
    const [heirPersons, setHeirPersons] = useState<HeirPerson[]>([])
    const [relatedPartyPersons, setRelatedPartyPersons] = useState<RelatedPartyPerson[]>([])

    useEffect(() => {
        const loadMasters = async () => {
            try {
                const [as, rs, hps, rpps] = await Promise.all([
                    getAssignees(),
                    getReferrers(),
                    getHeirPersons(),
                    getRelatedPartyPersons(),
                ])
                setAssignees(as)
                setReferrers(rs)
                setHeirPersons(hps)
                setRelatedPartyPersons(rpps)
            } catch (e) {
                console.error("Failed to load masters", e)
            }
        }
        loadMasters()
    }, [])

    return {
        assignees,
        referrers,
        heirPersons,
        relatedPartyPersons,
        setHeirPersons,
        setRelatedPartyPersons,
    }
}
