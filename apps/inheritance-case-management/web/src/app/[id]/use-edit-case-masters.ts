import { useEffect, useState } from "react"
import type { Assignee, HeirPerson, Referrer, RelatedPartyPerson } from "@/types/shared"
import { getAssignees } from "@/lib/api/assignees"
import { getReferrers } from "@/lib/api/referrers"
import { getHeirPersons } from "@/lib/api/heir-persons"
import { getRelatedPartyPersons } from "@/lib/api/related-party-persons"

const MASTER_LOAD_RETRY_DELAY_MS = 500

async function loadWithRetry<T>(load: () => Promise<T>): Promise<T> {
    try {
        return await load()
    } catch {
        await new Promise(resolve => setTimeout(resolve, MASTER_LOAD_RETRY_DELAY_MS))
        return load()
    }
}

export function useEditCaseMasters() {
    const [assignees, setAssignees] = useState<Assignee[]>([])
    const [referrers, setReferrers] = useState<Referrer[]>([])
    const [heirPersons, setHeirPersons] = useState<HeirPerson[]>([])
    const [relatedPartyPersons, setRelatedPartyPersons] = useState<RelatedPartyPerson[]>([])

    useEffect(() => {
        let cancelled = false

        const loadMasters = async () => {
            try {
                const [as, rs, hps, rpps] = await Promise.all([
                    loadWithRetry(getAssignees),
                    loadWithRetry(getReferrers),
                    loadWithRetry(getHeirPersons),
                    loadWithRetry(getRelatedPartyPersons),
                ])
                if (cancelled) return
                setAssignees(as)
                setReferrers(rs)
                setHeirPersons(hps)
                setRelatedPartyPersons(rpps)
            } catch (e) {
                if (!cancelled) console.error("Failed to load masters", e)
            }
        }
        void loadMasters()
        return () => { cancelled = true }
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
