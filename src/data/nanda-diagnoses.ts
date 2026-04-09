/**
 * NANDA-I Nursing Diagnosis Reference Data for Maternal/Prenatal Care
 * Organized by 13 NANDA-I domains with search and domain filtering.
 */

export interface NandaDiagnosis {
  /** Unique NANDA-I reference code (e.g., "00132") */
  code: string;
  /** Official NANDA-I diagnosis label */
  name: string;
  /** NANDA-I domain number */
  domain: number;
  /** NANDA-I domain name */
  domainName: string;
  /** Brief definition */
  definition: string;
  /** Diagnostic category for quick filtering */
  category: 'physiological' | 'psychosocial' | 'knowledge' | 'safety';
}

export interface NandaDomain {
  number: number;
  name: string;
}

export const NANDA_DOMAINS: NandaDomain[] = [
  { number: 1, name: 'Health Promotion' },
  { number: 2, name: 'Nutrition' },
  { number: 3, name: 'Elimination and Exchange' },
  { number: 4, name: 'Activity/Rest' },
  { number: 5, name: 'Perception/Cognition' },
  { number: 6, name: 'Self-Perception' },
  { number: 7, name: 'Role Relationships' },
  { number: 8, name: 'Sexuality' },
  { number: 9, name: 'Coping/Stress Tolerance' },
  { number: 10, name: 'Life Principles' },
  { number: 11, name: 'Safety/Protection' },
  { number: 12, name: 'Comfort' },
  { number: 13, name: 'Growth and Development' },
];

export const NANDA_DIAGNOSES: NandaDiagnosis[] = [
  // ── Domain 1: Health Promotion ────────────────────────────────────
  {
    code: '00246',
    name: 'Readiness for Enhanced Health Management',
    domain: 1,
    domainName: 'Health Promotion',
    definition: 'A pattern of regulating and integrating into daily living a therapeutic regimen for treatment of illness and its sequelae that is sufficient for meeting health-related goals and can be strengthened',
    category: 'knowledge',
  },
  {
    code: '00276',
    name: 'Ineffective Health Self-Management',
    domain: 1,
    domainName: 'Health Promotion',
    definition: 'Pattern of regulating and integrating into daily living a therapeutic regimen for the treatment of illness and its sequelae that is unsatisfactory for meeting specific health goals',
    category: 'knowledge',
  },
  {
    code: '00162',
    name: 'Readiness for Enhanced Health Behavior',
    domain: 1,
    domainName: 'Health Promotion',
    definition: 'A pattern of regulating and integrating into daily living a program for treatment of illness and the sequelae of illness that is sufficient for meeting health-related goals and can be strengthened',
    category: 'knowledge',
  },

  // ── Domain 2: Nutrition ──────────────────────────────────────────
  {
    code: '00001',
    name: 'Imbalanced Nutrition: More Than Body Requirements',
    domain: 2,
    domainName: 'Nutrition',
    definition: 'Intake of nutrients that exceeds metabolic needs',
    category: 'physiological',
  },
  {
    code: '00002',
    name: 'Imbalanced Nutrition: Less Than Body Requirements',
    domain: 2,
    domainName: 'Nutrition',
    definition: 'Intake of nutrients insufficient to meet metabolic needs',
    category: 'physiological',
  },
  {
    code: '00003',
    name: 'Risk for Imbalanced Nutrition',
    domain: 2,
    domainName: 'Nutrition',
    definition: 'At risk for intake of nutrients that exceeds or fails to meet metabolic needs',
    category: 'physiological',
  },
  {
    code: '00179',
    name: 'Risk for Unstable Blood Glucose Level',
    domain: 2,
    domainName: 'Nutrition',
    definition: 'Susceptible to variation in blood glucose/sugar levels from the normal range that may compromise health',
    category: 'physiological',
  },
  {
    code: '00134',
    name: 'Nausea',
    domain: 2,
    domainName: 'Nutrition',
    definition: 'A subjective, unpleasant, wavelike sensation in the back of the throat, epigastrium, or abdomen that may lead to the urge or need to vomit',
    category: 'physiological',
  },
  {
    code: '00196',
    name: 'Dysfunctional Gastrointestinal Motility',
    domain: 2,
    domainName: 'Nutrition',
    definition: 'Increased, decreased, ineffective, or disorganized peristalsis',
    category: 'physiological',
  },
  {
    code: '00197',
    name: 'Risk for Dysfunctional Gastrointestinal Motility',
    domain: 2,
    domainName: 'Nutrition',
    definition: 'At risk for increased, decreased, ineffective, or disorganized peristalsis',
    category: 'physiological',
  },

  // ── Domain 3: Elimination and Exchange ────────────────────────────
  {
    code: '00011',
    name: 'Constipation',
    domain: 3,
    domainName: 'Elimination and Exchange',
    definition: 'Decrease in normal frequency of defecation accompanied by difficult or incomplete passage of stool and/or passage of excessively hard, dry stool',
    category: 'physiological',
  },
  {
    code: '00012',
    name: 'Diarrhea',
    domain: 3,
    domainName: 'Elimination and Exchange',
    definition: 'Passage of three or more loose, liquid, or unformed stools in a 24-hour period',
    category: 'physiological',
  },
  {
    code: '00015',
    name: 'Risk for Constipation',
    domain: 3,
    domainName: 'Elimination and Exchange',
    definition: 'At risk for a decrease in normal frequency of defecation accompanied by difficult or incomplete passage of stool and/or passage of excessively hard, dry stool',
    category: 'physiological',
  },
  {
    code: '00016',
    name: 'Impaired Urinary Elimination',
    domain: 3,
    domainName: 'Elimination and Exchange',
    definition: 'Dysfunction in urine elimination',
    category: 'physiological',
  },
  {
    code: '00020',
    name: 'Urinary Retention',
    domain: 3,
    domainName: 'Elimination and Exchange',
    definition: 'Incomplete emptying of the bladder',
    category: 'physiological',
  },
  {
    code: '00023',
    name: 'Functional Urinary Incontinence',
    domain: 3,
    domainName: 'Elimination and Exchange',
    definition: 'Inability of usually continent person to reach toilet in time to avoid unintentional loss of urine',
    category: 'physiological',
  },
  {
    code: '00024',
    name: 'Stress Urinary Incontinence',
    domain: 3,
    domainName: 'Elimination and Exchange',
    definition: 'Sudden leakage of urine with activities that increase intra-abdominal pressure',
    category: 'physiological',
  },
  {
    code: '00025',
    name: 'Urge Urinary Incontinence',
    domain: 3,
    domainName: 'Elimination and Exchange',
    definition: 'Involuntary passage of urine occurring soon after a strong sense of urgency to void',
    category: 'physiological',
  },
  {
    code: '00026',
    name: 'Excess Fluid Volume',
    domain: 3,
    domainName: 'Elimination and Exchange',
    definition: 'Increased isotonic fluid retention',
    category: 'physiological',
  },
  {
    code: '00027',
    name: 'Deficient Fluid Volume',
    domain: 3,
    domainName: 'Elimination and Exchange',
    definition: 'Decreased intravascular, interstitial, and/or intracellular fluid',
    category: 'physiological',
  },
  {
    code: '00028',
    name: 'Risk for Deficient Fluid Volume',
    domain: 3,
    domainName: 'Elimination and Exchange',
    definition: 'At risk for experiencing vascular, cellular, or intracellular dehydration',
    category: 'physiological',
  },
  {
    code: '00030',
    name: 'Impaired Gas Exchange',
    domain: 3,
    domainName: 'Elimination and Exchange',
    definition: 'Excess or deficit in oxygenation and/or carbon dioxide elimination at the alveolar-capillary membrane',
    category: 'physiological',
  },
  {
    code: '00029',
    name: 'Decreased Cardiac Output',
    domain: 3,
    domainName: 'Elimination and Exchange',
    definition: 'Inadequate blood pumped by the heart to meet metabolic demands of the body',
    category: 'physiological',
  },

  // ── Domain 4: Activity/Rest ──────────────────────────────────────
  {
    code: '00085',
    name: 'Impaired Physical Mobility',
    domain: 4,
    domainName: 'Activity/Rest',
    definition: 'Limitation in independent, purposeful physical movement of the body or one or more extremities',
    category: 'physiological',
  },
  {
    code: '00092',
    name: 'Activity Intolerance',
    domain: 4,
    domainName: 'Activity/Rest',
    definition: 'Insufficient physiological or psychological energy to endure or complete required or desired daily activities',
    category: 'physiological',
  },
  {
    code: '00093',
    name: 'Fatigue',
    domain: 4,
    domainName: 'Activity/Rest',
    definition: 'An overwhelming sustained sense of exhaustion and decreased capacity for physical and mental work',
    category: 'physiological',
  },
  {
    code: '00095',
    name: 'Insomnia',
    domain: 4,
    domainName: 'Activity/Rest',
    definition: 'A disruption in the amount and quality of sleep that impairs functioning',
    category: 'physiological',
  },
  {
    code: '00198',
    name: 'Disturbed Sleep Pattern',
    domain: 4,
    domainName: 'Activity/Rest',
    definition: 'Time-limited disruption of sleep (natural, periodic suspension of consciousness) amount and quality',
    category: 'physiological',
  },
  {
    code: '00108',
    name: 'Self-Care Deficit: Bathing',
    domain: 4,
    domainName: 'Activity/Rest',
    definition: 'Impaired ability to perform or complete bathing activities for oneself',
    category: 'physiological',
  },
  {
    code: '00109',
    name: 'Self-Care Deficit: Dressing',
    domain: 4,
    domainName: 'Activity/Rest',
    definition: 'Impaired ability to perform or complete dressing activities for oneself',
    category: 'physiological',
  },
  {
    code: '00110',
    name: 'Self-Care Deficit: Feeding',
    domain: 4,
    domainName: 'Activity/Rest',
    definition: 'Impaired ability to perform or complete feeding activities for oneself',
    category: 'physiological',
  },
  {
    code: '00182',
    name: 'Risk for Activity Intolerance',
    domain: 4,
    domainName: 'Activity/Rest',
    definition: 'At risk for experiencing insufficient physiological or psychological energy to endure or complete required or desired daily activities',
    category: 'physiological',
  },

  // ── Domain 5: Perception/Cognition ────────────────────────────────
  {
    code: '00126',
    name: 'Deficient Knowledge',
    domain: 5,
    domainName: 'Perception/Cognition',
    definition: 'Absence or deficiency of cognitive information related to a specific topic (prenatal care, breastfeeding, newborn care)',
    category: 'knowledge',
  },
  {
    code: '00128',
    name: 'Acute Confusion',
    domain: 5,
    domainName: 'Perception/Cognition',
    definition: 'Reversible disturbances of consciousness, attention, cognition, and perception that develop over a short period (eclampsia, anesthesia)',
    category: 'physiological',
  },
  {
    code: '00127',
    name: 'Impaired Sensory Perception',
    domain: 5,
    domainName: 'Perception/Cognition',
    definition: 'Change in the amount or patterning of incoming stimuli accompanied by a diminished, exaggerated, distorted, or impaired response to such stimuli',
    category: 'physiological',
  },

  // ── Domain 6: Self-Perception ─────────────────────────────────────
  {
    code: '00118',
    name: 'Disturbed Body Image',
    domain: 6,
    domainName: 'Self-Perception',
    definition: 'Confusion in mental picture of one\'s physical self',
    category: 'psychosocial',
  },
  {
    code: '00119',
    name: 'Chronic Low Self-Esteem',
    domain: 6,
    domainName: 'Self-Perception',
    definition: 'A long-standing negative self-evaluation/feelings about self or self-capabilities',
    category: 'psychosocial',
  },
  {
    code: '00120',
    name: 'Situational Low Self-Esteem',
    domain: 6,
    domainName: 'Self-Perception',
    definition: 'Negative self-evaluation/feelings about self or self-capabilities in response to a situational event',
    category: 'psychosocial',
  },
  {
    code: '00121',
    name: 'Readiness for Enhanced Self-Concept',
    domain: 6,
    domainName: 'Self-Perception',
    definition: 'A pattern of perceptions or ideas about self that is sufficient for well-being and can be strengthened',
    category: 'psychosocial',
  },

  // ── Domain 7: Role Relationships ──────────────────────────────────
  {
    code: '00061',
    name: 'Caregiver Role Strain',
    domain: 7,
    domainName: 'Role Relationships',
    definition: 'Difficulty in performing caregiver role and associated behaviors',
    category: 'psychosocial',
  },
  {
    code: '00062',
    name: 'Risk for Caregiver Role Strain',
    domain: 7,
    domainName: 'Role Relationships',
    definition: 'At risk for difficulty in performing caregiver role and associated behaviors',
    category: 'psychosocial',
  },
  {
    code: '00063',
    name: 'Interrupted Family Processes',
    domain: 7,
    domainName: 'Role Relationships',
    definition: 'Psychosocial, spiritual, and physiological functions of the family unit are chronically disorganized, which leads to conflict, denial of problems, resistance to change, ineffective problem-solving, and a series of crises',
    category: 'psychosocial',
  },
  {
    code: '00060',
    name: 'Dysfunctional Family Processes',
    domain: 7,
    domainName: 'Role Relationships',
    definition: 'Psychosocial, spiritual, and physiological functions of the family unit are chronically disorganized',
    category: 'psychosocial',
  },

  // ── Domain 8: Sexuality ──────────────────────────────────────────
  {
    code: '00059',
    name: 'Sexual Dysfunction',
    domain: 8,
    domainName: 'Sexuality',
    definition: 'Change in sexual function during the sexual response phases that is viewed as unsatisfying, unrewarding, or inadequate (postpartum)',
    category: 'psychosocial',
  },
  {
    code: '00065',
    name: 'Ineffective Sexuality Pattern',
    domain: 8,
    domainName: 'Sexuality',
    definition: 'Expressions of concern regarding own sexuality',
    category: 'psychosocial',
  },
  {
    code: '00207',
    name: 'Readiness for Enhanced Childbearing Process',
    domain: 8,
    domainName: 'Sexuality',
    definition: 'A pattern of preparing for, maintaining, and concluding a pregnancy that is sufficient to meet the physical, psychological, and social needs of mother and fetus and can be strengthened',
    category: 'physiological',
  },
  {
    code: '00208',
    name: 'Risk for Disturbed Maternal-Fetal Dyad',
    domain: 8,
    domainName: 'Sexuality',
    definition: 'At risk for disruption of the symbiotic mother-fetal relationship as a result of comorbid or pregnancy-related conditions',
    category: 'safety',
  },
  {
    code: '00209',
    name: 'Impaired Parenting',
    domain: 8,
    domainName: 'Sexuality',
    definition: 'Inability of the primary caretaker to create an environment that promotes the optimum growth and development of the child',
    category: 'psychosocial',
  },
  {
    code: '00210',
    name: 'Risk for Impaired Parenting',
    domain: 8,
    domainName: 'Sexuality',
    definition: 'At risk for inability of the primary caretaker to create an environment that promotes the optimum growth and development of the child',
    category: 'psychosocial',
  },
  {
    code: '00211',
    name: 'Readiness for Enhanced Parenting',
    domain: 8,
    domainName: 'Sexuality',
    definition: 'A pattern of providing an environment for children that is sufficient to nurture growth and development and can be strengthened',
    category: 'psychosocial',
  },
  {
    code: '00212',
    name: 'Ineffective Childbearing Process',
    domain: 8,
    domainName: 'Sexuality',
    definition: 'A pattern of preparing for, maintaining, and concluding a pregnancy that is unsatisfactory to meet the physical, psychological, and social needs of mother and fetus',
    category: 'physiological',
  },
  {
    code: '00213',
    name: 'Risk for Ineffective Childbearing Process',
    domain: 8,
    domainName: 'Sexuality',
    definition: 'At risk for a pattern of preparing for, maintaining, and concluding a pregnancy that is unsatisfactory to meet the physical, psychological, and social needs of mother and fetus',
    category: 'physiological',
  },

  // ── Domain 9: Coping/Stress Tolerance ────────────────────────────
  {
    code: '00069',
    name: 'Ineffective Coping',
    domain: 9,
    domainName: 'Coping/Stress Tolerance',
    definition: 'Inability to form a valid appraisal of the stressors, inadequate choices of practiced responses, and/or inability to use available resources',
    category: 'psychosocial',
  },
  {
    code: '00146',
    name: 'Anxiety',
    domain: 9,
    domainName: 'Coping/Stress Tolerance',
    definition: 'Vague uneasy feeling of discomfort or dread accompanied by an autonomic response',
    category: 'psychosocial',
  },
  {
    code: '00147',
    name: 'Fear',
    domain: 9,
    domainName: 'Coping/Stress Tolerance',
    definition: 'Response to perceived threat that is consciously recognized as a danger',
    category: 'psychosocial',
  },
  {
    code: '00136',
    name: 'Grieving',
    domain: 9,
    domainName: 'Coping/Stress Tolerance',
    definition: 'A normal complex process that includes emotional, physical, and spiritual responses by which individuals incorporate an actual, anticipated, or perceived loss (fetal loss)',
    category: 'psychosocial',
  },
  {
    code: '00137',
    name: 'Complicated Grieving',
    domain: 9,
    domainName: 'Coping/Stress Tolerance',
    definition: 'A disorder that occurs after the death of a significant other, in which the experience of distress accompanying bereavement fails to follow normative expectations and manifests in functional impairment',
    category: 'psychosocial',
  },
  {
    code: '00150',
    name: 'Risk for Suicide',
    domain: 9,
    domainName: 'Coping/Stress Tolerance',
    definition: 'Susceptible to self-inflicted, life-threatening injury, which may compromise health',
    category: 'safety',
  },

  // ── Domain 10: Life Principles ───────────────────────────────────
  {
    code: '00175',
    name: 'Spiritual Distress',
    domain: 10,
    domainName: 'Life Principles',
    definition: 'Impaired ability to experience and integrate meaning and purpose in life through connectedness with self, others, art, music, literature, nature, and/or a power greater than oneself',
    category: 'psychosocial',
  },
  {
    code: '00172',
    name: 'Risk for Spiritual Distress',
    domain: 10,
    domainName: 'Life Principles',
    definition: 'At risk for an impaired ability to experience and integrate meaning and purpose in life',
    category: 'psychosocial',
  },
  {
    code: '00171',
    name: 'Readiness for Enhanced Spiritual Well-Being',
    domain: 10,
    domainName: 'Life Principles',
    definition: 'A pattern of experiencing and integrating meaning and purpose in life through connectedness with self, others, art, music, literature, nature, and/or a power greater than oneself that is sufficient for well-being and can be strengthened',
    category: 'psychosocial',
  },

  // ── Domain 11: Safety/Protection ──────────────────────────────────
  {
    code: '00004',
    name: 'Risk for Infection',
    domain: 11,
    domainName: 'Safety/Protection',
    definition: 'Susceptible to invasion and multiplication of pathogenic organisms, which may compromise health',
    category: 'safety',
  },
  {
    code: '00035',
    name: 'Risk for Injury',
    domain: 11,
    domainName: 'Safety/Protection',
    definition: 'Susceptible to physical injury due to environmental conditions interacting with the individual\'s adaptive and defensive resources',
    category: 'safety',
  },
  {
    code: '00038',
    name: 'Risk for Trauma',
    domain: 11,
    domainName: 'Safety/Protection',
    definition: 'Susceptible to accidental tissue injury (wound, burn, fracture)',
    category: 'safety',
  },
  {
    code: '00043',
    name: 'Ineffective Protection',
    domain: 11,
    domainName: 'Safety/Protection',
    definition: 'Decreased ability to guard self from internal or external threats such as illness or injury',
    category: 'safety',
  },
  {
    code: '00044',
    name: 'Impaired Tissue Integrity',
    domain: 11,
    domainName: 'Safety/Protection',
    definition: 'Damage to mucous membrane, corneal, integumentary, or subcutaneous tissues',
    category: 'safety',
  },
  {
    code: '00046',
    name: 'Impaired Skin Integrity',
    domain: 11,
    domainName: 'Safety/Protection',
    definition: 'Altered epidermis and/or dermis',
    category: 'safety',
  },
  {
    code: '00047',
    name: 'Risk for Impaired Skin Integrity',
    domain: 11,
    domainName: 'Safety/Protection',
    definition: 'At risk for skin being adversely altered',
    category: 'safety',
  },
  {
    code: '00048',
    name: 'Risk for Falls',
    domain: 11,
    domainName: 'Safety/Protection',
    definition: 'Susceptible to increased falling, which may cause physical harm',
    category: 'safety',
  },

  // ── Domain 12: Comfort ───────────────────────────────────────────
  {
    code: '00132',
    name: 'Acute Pain',
    domain: 12,
    domainName: 'Comfort',
    definition: 'Unpleasant sensory and emotional experience arising from actual or potential tissue damage or described in terms of such damage; sudden or slow onset of any intensity from mild to severe with an anticipated or predictable end and a duration of less than 6 months',
    category: 'physiological',
  },
  {
    code: '00133',
    name: 'Chronic Pain',
    domain: 12,
    domainName: 'Comfort',
    definition: 'Unpleasant sensory and emotional experience arising from actual or potential tissue damage or described in terms of such damage; sudden or slow onset of any intensity from mild to severe, constant or recurring, without an anticipated or predictable end and a duration of greater than 6 months',
    category: 'physiological',
  },
  {
    code: '00214',
    name: 'Impaired Comfort',
    domain: 12,
    domainName: 'Comfort',
    definition: 'Perceived lack of ease, relief, and transcendence in physical, psychospiritual, environmental, and social dimensions',
    category: 'physiological',
  },

  // ── Domain 13: Growth and Development ────────────────────────────
  {
    code: '00112',
    name: 'Delayed Growth and Development',
    domain: 13,
    domainName: 'Growth and Development',
    definition: 'Deviations from age-specific norms in growth and development that may affect health status',
    category: 'physiological',
  },
  {
    code: '00113',
    name: 'Risk for Delayed Development',
    domain: 13,
    domainName: 'Growth and Development',
    definition: 'At risk for delays in reaching age-appropriate developmental milestones',
    category: 'physiological',
  },
];

/** Search NANDA diagnoses by code prefix, keyword, or domain */
export function searchNandaDiagnoses(query: string): NandaDiagnosis[] {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim().toLowerCase();
  return NANDA_DIAGNOSES.filter((d) => {
    if (d.code.toLowerCase().startsWith(q)) return true;
    if (d.code.includes(q)) return true;
    if (d.name.toLowerCase().includes(q)) return true;
    if (d.category.includes(q)) return true;
    if (d.domainName.toLowerCase().includes(q)) return true;
    if (String(d.domain) === q) return true;
    return false;
  }).slice(0, 20);
}
