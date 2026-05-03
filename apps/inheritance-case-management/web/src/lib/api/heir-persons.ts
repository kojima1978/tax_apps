import { apiClient } from './client';

export { getHeirPersons, createHeirPerson, updateHeirPerson, deleteHeirPerson } from './masters';

export interface RelatedCase {
  id: number;
  deceasedName: string;
  deceasedNameKana: string;
  dateOfDeath: string;
  status: string;
  handlingStatus: string;
  acceptanceStatus: string;
  fiscalYear: number;
  relationship: string;
}

export function getHeirPersonRelatedCases(personId: number): Promise<RelatedCase[]> {
  return apiClient<RelatedCase[]>(`/heir-persons/${personId}/cases/`);
}
