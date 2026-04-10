/**
 * Step-level validation for the 7-step consultation wizard.
 *
 * Each step returns a user-friendly error string if validation fails,
 * or null if the step is valid and the user may proceed.
 */

export function validateStep(
  step: number,
  data: Record<string, unknown>,
): string | null {
  switch (step) {
    case 0: {
      // Assessment — type of visit and chief complaint required
      if (!data.typeOfVisit || !(data.typeOfVisit as string).trim())
        return 'Please select a Type of Visit';
      if (
        !data.chiefComplaint ||
        !(data.chiefComplaint as string).trim()
      )
        return 'Please enter the Chief Complaint';
      return null;
    }
    case 1: {
      // Health History — optional, no validation
      return null;
    }
    case 2: {
      // Additional Findings — optional
      return null;
    }
    case 3: {
      // Diagnosis — at least one NANDA diagnosis must be selected
      const count = data.selectedNandaCodesCount as number | undefined;
      if (!count || count === 0)
        return 'Please select at least one NANDA-I Nursing Diagnosis';
      return null;
    }
    case 4: {
      // AI Summary — AI suggestions must have been generated (or there was an error we allow through)
      if (!data.aiSuggestions && !data.aiError)
        return 'Please generate the AI Summary';
      return null;
    }
    case 5: {
      // Care Plan — at least one intervention should be selected
      const interventions = data.selectedInterventions as
        | Array<unknown>
        | undefined;
      if (!interventions || interventions.length === 0)
        return 'Please select at least one intervention';
      return null;
    }
    case 6: {
      // Referral — referral priority should be selected
      if (!data.referralPriority)
        return 'Please select a referral priority';
      return null;
    }
    default:
      return null;
  }
}
