import React from 'react';
import type { Policy, FamilyMember, EvaluationOverride } from '@/types';
import { ClipboardList } from 'lucide-react';
import BeneficiaryCoverageSection from '@/components/BeneficiaryCoverageSection';
import InsuranceTypeOverview from '@/components/InsuranceTypeOverview';
import PolicyAnalysisCard from '@/components/PolicyAnalysisCard';
import PrintPageNumber from '@/components/PrintPageNumber';

interface PolicyAnalysisSectionProps {
  caseId: string;
  policies: Policy[];
  currentAge: number;
  familyMembers: FamilyMember[];
  onUpdateNote: (policyId: string, note: string) => void;
  onUpdateEvaluations: (policyId: string, overrides: EvaluationOverride[]) => void;
  printBeneficiaryPage: number;
  printOverviewPage: number;
  printFirstPolicyPage: number;
  printTotalPages: number;
}

const PolicyAnalysisSection: React.FC<PolicyAnalysisSectionProps> = ({
  caseId,
  policies,
  currentAge,
  familyMembers,
  onUpdateNote,
  onUpdateEvaluations,
  printBeneficiaryPage,
  printOverviewPage,
  printFirstPolicyPage,
  printTotalPages,
}) => {
  if (policies.length === 0) return null;

  const hasBeneficiaryPage = policies.some(policy => policy.deathBenefitDisease > 0);
  const calculateAge = (birthDate: string): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };
  const getPolicyCurrentAge = (policy: Policy) => {
    const insured = familyMembers.find(member => member.id === policy.insuredId);
    return calculateAge(insured?.birthDate ?? '') ?? currentAge;
  };

  return (
    <div className="analysis-section">
      {hasBeneficiaryPage && (
        <div className="beneficiary-print-page">
          <BeneficiaryCoverageSection
            policies={policies}
            familyMembers={familyMembers}
            currentAge={currentAge}
          />
          <PrintPageNumber currentPage={printBeneficiaryPage} totalPages={printTotalPages} />
        </div>
      )}

      <div className="type-overview-print-page">
        <InsuranceTypeOverview caseId={caseId} policies={policies} currentAge={currentAge} />
        <PrintPageNumber currentPage={printOverviewPage} totalPages={printTotalPages} />
      </div>

      <div className="individual-analysis">
        <h3 className="analysis-section-title">
          <ClipboardList size={20} />
          個々の保険の分析
        </h3>

        <div className="analysis-cards-list">
          {policies.map((policy, index) => (
            <div key={policy.id} className="analysis-card-page">
              <PolicyAnalysisCard
                policy={policy}
                currentAge={getPolicyCurrentAge(policy)}
                familyMembers={familyMembers}
                onUpdateNote={onUpdateNote}
                onUpdateEvaluations={onUpdateEvaluations}
              />
              <PrintPageNumber currentPage={printFirstPolicyPage + index} totalPages={printTotalPages} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PolicyAnalysisSection;
