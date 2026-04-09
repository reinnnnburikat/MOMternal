/**
 * NIC (Nursing Interventions Classification) Reference Data for Maternal/Prenatal Care
 * Each intervention is linked to NANDA domains it serves.
 * Structured for searchable dropdown with code prefix matching.
 */

import { NANDA_DOMAINS } from './nanda-diagnoses';

export interface NicIntervention {
  /** Unique NIC reference code (e.g., "5510") */
  code: string;
  /** Official NIC intervention label */
  name: string;
  /** Category for quick filtering */
  category: 'Physiological' | 'Psychosocial' | 'Safety' | 'Educational';
  /** Brief description of the intervention */
  description: string;
  /** NANDA domain numbers this intervention addresses (can belong to multiple) */
  nandaDomains: number[];
  /** Related NOC outcome codes */
  relatedNoc: string[];
  /** Typical NANDA diagnosis codes this intervention addresses */
  relatedNanda: string[];
}

export const NIC_INTERVENTIONS: NicIntervention[] = [
  // ── Domain 1: Health Promotion ────────────────────────────────────
  {
    code: '5510',
    name: 'Health Education',
    category: 'Educational',
    description: 'Developing and providing instruction and learning experiences to facilitate voluntary adaptation of behavior conducive to health in individuals, families, groups, or communities',
    relatedNoc: ['1601', '1813', '2004'],
    relatedNanda: ['00246', '00276', '00162'],
    nandaDomains: [1, 5, 9],
  },
  {
    code: '5602',
    name: 'Teaching: Disease Process',
    category: 'Educational',
    description: 'Assisting the patient to understand information about a specific disease process and its management',
    relatedNoc: ['1813', '1601'],
    relatedNanda: ['00246', '00276', '00126'],
    nandaDomains: [1, 2, 5],
  },
  {
    code: '4480',
    name: 'Facilitation of Learning',
    category: 'Educational',
    description: 'Assisting patients to use cognitive and affective information to achieve health-related learning outcomes',
    relatedNoc: ['1813', '1601', '2004'],
    relatedNanda: ['00246', '00162', '00126'],
    nandaDomains: [1, 5],
  },

  // ── Domain 2: Nutrition ──────────────────────────────────────────
  {
    code: '1100',
    name: 'Nutrition Management',
    category: 'Physiological',
    description: 'Assisting with or providing a balanced dietary intake of foods and fluids',
    relatedNoc: ['1004', '1008', '1612'],
    relatedNanda: ['00001', '00002', '00003', '00179'],
    nandaDomains: [2],
  },
  {
    code: '5246',
    name: 'Nutritional Counseling',
    category: 'Educational',
    description: 'Use of an interactive helping process focusing on the need for diet modification',
    relatedNoc: ['1004', '1008', '1612'],
    relatedNanda: ['00001', '00002', '00003', '00179'],
    nandaDomains: [2],
  },
  {
    code: '1050',
    name: 'Feeding',
    category: 'Physiological',
    description: 'Providing or assisting with nutritive intake',
    relatedNoc: ['1004', '1008'],
    relatedNanda: ['00002', '00110'],
    nandaDomains: [2, 4],
  },
  {
    code: '2120',
    name: 'Hyperglycemia Management',
    category: 'Physiological',
    description: 'Preventing and treating elevated blood glucose levels',
    relatedNoc: ['1617', '1004'],
    relatedNanda: ['00179', '00003'],
    nandaDomains: [2],
  },
  {
    code: '1450',
    name: 'Nausea Management',
    category: 'Physiological',
    description: 'Prevention and alleviation of nausea',
    relatedNoc: ['1004', '0602'],
    relatedNanda: ['00134', '00196'],
    nandaDomains: [2, 12],
  },

  // ── Domain 3: Elimination and Exchange ────────────────────────────
  {
    code: '0430',
    name: 'Bowel Management',
    category: 'Physiological',
    description: 'Establishment and maintenance of a regular pattern of bowel elimination',
    relatedNoc: ['0501', '0602'],
    relatedNanda: ['00011', '00012', '00015', '00196'],
    nandaDomains: [2, 3],
  },
  {
    code: '0590',
    name: 'Urinary Elimination Management',
    category: 'Physiological',
    description: 'Maintenance of an optimal urinary elimination pattern',
    relatedNoc: ['0502', '0601'],
    relatedNanda: ['00016', '00020', '00023', '00024', '00025'],
    nandaDomains: [3],
  },
  {
    code: '4120',
    name: 'Fluid Management',
    category: 'Physiological',
    description: 'Promotion of fluid balance and prevention of complications resulting from abnormal or undesired fluid levels',
    relatedNoc: ['0601', '0602'],
    relatedNanda: ['00026', '00027', '00028'],
    nandaDomains: [3, 11],
  },
  {
    code: '4130',
    name: 'Fluid Monitoring',
    category: 'Physiological',
    description: 'Collection and analysis of patient data to regulate fluid balance',
    relatedNoc: ['0601', '0602'],
    relatedNanda: ['00026', '00027', '00028', '00029'],
    nandaDomains: [3],
  },
  {
    code: '4180',
    name: 'Hypovolemia Management',
    category: 'Physiological',
    description: 'Reduction in extracellular and/or intracellular fluid volume and prevention of complications in a patient at risk for or already experiencing fluid volume deficit',
    relatedNoc: ['0601', '0602'],
    relatedNanda: ['00027', '00028'],
    nandaDomains: [3],
  },

  // ── Domain 4: Activity/Rest ──────────────────────────────────────
  {
    code: '0221',
    name: 'Exercise Therapy: Ambulation',
    category: 'Physiological',
    description: 'Assisting the patient to walk independently or with assistance to maintain or restore body system functions during and after pregnancy',
    relatedNoc: ['0208', '0212', '0005'],
    relatedNanda: ['00085', '00092', '00182'],
    nandaDomains: [4],
  },
  {
    code: '0180',
    name: 'Energy Management',
    category: 'Physiological',
    description: 'Regulating energy expenditure to prevent fatigue and optimize function',
    relatedNoc: ['0005', '0004'],
    relatedNanda: ['00093', '00092', '00182'],
    nandaDomains: [4],
  },
  {
    code: '1800',
    name: 'Self-Care Assistance',
    category: 'Physiological',
    description: 'Assisting another person to perform activities of daily living',
    relatedNoc: ['0208', '0212'],
    relatedNanda: ['00108', '00109', '00110', '00085'],
    nandaDomains: [4],
  },
  {
    code: '1850',
    name: 'Sleep Enhancement',
    category: 'Physiological',
    description: 'Facilitating regular sleep/wake cycles',
    relatedNoc: ['0004', '0005'],
    relatedNanda: ['00095', '00198', '00093'],
    nandaDomains: [4, 12],
  },

  // ── Domain 5: Perception/Cognition ────────────────────────────────
  {
    code: '4820',
    name: 'Orientation Therapy',
    category: 'Psychosocial',
    description: 'Rehabilitating a person who has disorientation to the environment',
    relatedNoc: ['0912', '0900'],
    relatedNanda: ['00128', '00127'],
    nandaDomains: [5],
  },

  // ── Domain 6: Self-Perception ─────────────────────────────────────
  {
    code: '5400',
    name: 'Self-Esteem Enhancement',
    category: 'Psychosocial',
    description: 'Assisting a patient to increase his or her personal judgment of self-worth',
    relatedNoc: ['1205', '1200'],
    relatedNanda: ['00118', '00119', '00120', '00121'],
    nandaDomains: [6],
  },
  {
    code: '5220',
    name: 'Body Image Enhancement',
    category: 'Psychosocial',
    description: 'Improving a patient\'s consciousness and understanding of his or her physical body',
    relatedNoc: ['1200', '1205'],
    relatedNanda: ['00118', '00119', '00120', '00121'],
    nandaDomains: [6],
  },
  {
    code: '5440',
    name: 'Counseling',
    category: 'Psychosocial',
    description: 'Use of an interactive helping process focusing on the needs, problems, or feelings of the patient and significant others related to body image and self-concept',
    relatedNoc: ['1205', '1302'],
    relatedNanda: ['00118', '00119', '00120', '00121'],
    nandaDomains: [6, 9],
  },

  // ── Domain 7: Role Relationships ──────────────────────────────────
  {
    code: '7040',
    name: 'Caregiver Support',
    category: 'Psychosocial',
    description: 'Providing the necessary information, advocacy, and support to facilitate primary caregiver efforts',
    relatedNoc: ['2204', '2602'],
    relatedNanda: ['00061', '00062'],
    nandaDomains: [7],
  },
  {
    code: '7110',
    name: 'Family Support',
    category: 'Psychosocial',
    description: 'Promoting family values, interests, and goals',
    relatedNoc: ['2600', '2602'],
    relatedNanda: ['00063', '00060', '00061'],
    nandaDomains: [7],
  },
  {
    code: '7140',
    name: 'Family Involvement Promotion',
    category: 'Psychosocial',
    description: 'Facilitating family participation in the emotional and physical care of a patient',
    relatedNoc: ['2600', '2602'],
    relatedNanda: ['00063', '00060'],
    nandaDomains: [7],
  },

  // ── Domain 8: Sexuality ──────────────────────────────────────────
  {
    code: '5248',
    name: 'Sexual Counseling',
    category: 'Psychosocial',
    description: 'Use of an interactive helping process focusing on the need to make adjustments to sexual practice or sexual lifestyle',
    relatedNoc: ['2002', '2003'],
    relatedNanda: ['00059', '00065'],
    nandaDomains: [8],
  },
  {
    code: '5244',
    name: 'Prenatal Care',
    category: 'Physiological',
    description: 'Monitoring and management of the patient during pregnancy and the interconceptional period to prevent complications and promote optimal maternal and fetal health',
    relatedNoc: ['1909', '2003'],
    relatedNanda: ['00207', '00212', '00213', '00208'],
    nandaDomains: [8],
  },
  {
    code: '6880',
    name: 'Newborn Care',
    category: 'Physiological',
    description: 'Management of the neonate to ensure optimal health and development during the transition to extrauterine life',
    relatedNoc: ['1909', '2003'],
    relatedNanda: ['00209', '00210', '00211', '00208'],
    nandaDomains: [8],
  },

  // ── Domain 9: Coping/Stress Tolerance ────────────────────────────
  {
    code: '5820',
    name: 'Anxiety Reduction',
    category: 'Psychosocial',
    description: 'Minimizing apprehension, dread, foreboding, or uneasiness related to an unidentified source of anticipated danger',
    relatedNoc: ['1211', '1302'],
    relatedNanda: ['00146', '00147', '00069'],
    nandaDomains: [9],
  },
  {
    code: '5230',
    name: 'Coping Enhancement',
    category: 'Psychosocial',
    description: 'Assisting a patient to adapt to perceived stressors, changes, or threats that interfere with meeting life demands and roles',
    relatedNoc: ['1211', '1302', '1402'],
    relatedNanda: ['00069', '00146', '00147', '00136'],
    nandaDomains: [9],
  },
  {
    code: '5270',
    name: 'Emotional Support',
    category: 'Psychosocial',
    description: 'Providing reassurance, acceptance, and encouragement during times of stress',
    relatedNoc: ['1211', '1302', '1402'],
    relatedNanda: ['00146', '00147', '00069', '00136'],
    nandaDomains: [9, 12],
  },

  // ── Domain 10: Life Principles ───────────────────────────────────
  {
    code: '5420',
    name: 'Spiritual Support',
    category: 'Psychosocial',
    description: 'Strengthening a patient\'s belief in a transcendent being, force, or creative energy that is beyond the self',
    relatedNoc: ['1209'],
    relatedNanda: ['00175', '00172', '00171'],
    nandaDomains: [10],
  },
  {
    code: '5310',
    name: 'Hope Instillation',
    category: 'Psychosocial',
    description: 'Enhancing the belief in one\'s own capacity to initiate and carry out actions to achieve goals',
    relatedNoc: ['1209', '1201'],
    relatedNanda: ['00175', '00171'],
    nandaDomains: [10],
  },

  // ── Domain 11: Safety/Protection ──────────────────────────────────
  {
    code: '6540',
    name: 'Infection Control',
    category: 'Safety',
    description: 'Minimizing the acquisition and transmission of infectious agents',
    relatedNoc: ['1924', '0703'],
    relatedNanda: ['00004'],
    nandaDomains: [11],
  },
  {
    code: '6550',
    name: 'Infection Protection',
    category: 'Safety',
    description: 'Prevention and early detection of infection in a patient at risk',
    relatedNoc: ['1924', '0703'],
    relatedNanda: ['00004', '00043'],
    nandaDomains: [11],
  },
  {
    code: '3660',
    name: 'Wound Care',
    category: 'Physiological',
    description: 'Prevention of wound complications and promotion of wound healing',
    relatedNoc: ['1101'],
    relatedNanda: ['00044', '00046'],
    nandaDomains: [11],
  },
  {
    code: '3590',
    name: 'Skin Surveillance',
    category: 'Safety',
    description: 'Collection and analysis of patient data to maintain skin and mucous membrane integrity',
    relatedNoc: ['1101'],
    relatedNanda: ['00046', '00047'],
    nandaDomains: [11],
  },
  {
    code: '6490',
    name: 'Fall Prevention',
    category: 'Safety',
    description: 'Instituting special precautions with patient at risk for injury from falling',
    relatedNoc: ['1902'],
    relatedNanda: ['00048', '00035'],
    nandaDomains: [11],
  },
  {
    code: '6486',
    name: 'Environmental Management: Safety',
    category: 'Safety',
    description: 'Monitoring and influencing the safety of the physical environment for patients and staff',
    relatedNoc: ['1902'],
    relatedNanda: ['00035', '00038', '00048'],
    nandaDomains: [11],
  },
  {
    code: '6610',
    name: 'Risk Identification',
    category: 'Safety',
    description: 'Analysis of potential risk factors, determination of health risks, and prioritization of risk reduction strategies',
    relatedNoc: ['1902'],
    relatedNanda: ['00004', '00035', '00038', '00048'],
    nandaDomains: [11],
  },

  // ── Domain 12: Comfort ───────────────────────────────────────────
  {
    code: '1400',
    name: 'Pain Management',
    category: 'Physiological',
    description: 'Alleviation of pain or a reduction in pain to a level of comfort that is acceptable to the patient',
    relatedNoc: ['2102', '1605'],
    relatedNanda: ['00132', '00133', '00214'],
    nandaDomains: [12],
  },
  {
    code: '2210',
    name: 'Analgesic Administration',
    category: 'Physiological',
    description: 'Administration of analgesic and adjunct medications and monitoring patient response to them',
    relatedNoc: ['2102', '1605'],
    relatedNanda: ['00132', '00133'],
    nandaDomains: [12],
  },

  // ── Domain 13: Growth and Development ────────────────────────────
  {
    code: '8274',
    name: 'Developmental Enhancement',
    category: 'Educational',
    description: 'Structuring the environment and providing care to facilitate appropriate sensorimotor, cognitive, and psychosocial development in children',
    relatedNoc: ['0906', '0802'],
    relatedNanda: ['00112', '00113'],
    nandaDomains: [13],
  },
  {
    code: '5240',
    name: 'Developmental Support',
    category: 'Educational',
    description: 'Providing parenting support, education, and anticipatory guidance to promote optimal growth and development',
    relatedNoc: ['0906', '0802'],
    relatedNanda: ['00112', '00113'],
    nandaDomains: [13],
  },
];

/** Search NIC interventions by code prefix, keyword, or domain */
export function searchNicInterventions(query: string): NicIntervention[] {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim().toLowerCase();
  return NIC_INTERVENTIONS.filter((i) => {
    if (i.code.toLowerCase().startsWith(q)) return true;
    if (i.code.includes(q)) return true;
    if (i.name.toLowerCase().includes(q)) return true;
    if (i.category.toLowerCase().includes(q)) return true;
    // Search by domain name
    const domainNames = i.nandaDomains.map(d => NANDA_DOMAINS[d - 1]?.name).filter(Boolean);
    if (domainNames.some(n => n.toLowerCase().includes(q))) return true;
    if (String(i.nandaDomains).includes(q)) return true;
    return false;
  }).slice(0, 20);
}

/** Filter NIC interventions by NANDA domain number */
export function getNicByDomain(domain: number): NicIntervention[] {
  return NIC_INTERVENTIONS.filter((i) => i.nandaDomains.includes(domain));
}

