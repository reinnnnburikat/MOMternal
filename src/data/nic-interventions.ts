/**
 * NIC (Nursing Interventions Classification) Reference Data for Maternal/Prenatal Care
 * Each intervention has a unique NIC code, name, category, and definition.
 * Structured for searchable dropdown with code prefix matching.
 */

export interface NicIntervention {
  /** Unique NIC reference code (e.g., "6680") */
  code: string;
  /** Official NIC intervention label */
  name: string;
  /** Category for quick filtering */
  category: 'Physiological' | 'Psychosocial' | 'Safety' | 'Educational';
  /** Brief description of the intervention */
  description: string;
  /** Related NOC outcome code */
  relatedNoc: string;
  /** Typical NANDA diagnoses this intervention addresses */
  relatedNanda: string[];
}

export const NIC_INTERVENTIONS: NicIntervention[] = [
  // ── PHYSIOLOGICAL INTERVENTIONS ──────────────────────────────────
  {
    code: '6680',
    name: 'Monitoring Fetal Well-Being',
    category: 'Physiological',
    description: 'Systematic assessment of fetal status including FHR, movement patterns, and non-stress testing to detect fetal compromise',
    relatedNoc: 'Fetal Status (2002)',
    relatedNanda: ['00089', '00167', '00211'],
  },
  {
    code: '6650',
    name: 'Surveillance',
    category: 'Physiological',
    description: 'Purposeful and ongoing acquisition, interpretation, and synthesis of patient data for clinical decision-making',
    relatedNoc: 'Health Status (0401)',
    relatedNanda: ['00044', '00092', '00093'],
  },
  {
    code: '4232',
    name: 'Fluid Management',
    category: 'Physiological',
    description: 'Promotion of fluid balance and prevention of complications resulting from abnormal or undesired fluid levels',
    relatedNoc: 'Fluid Balance (0601)',
    relatedNanda: ['00012', '00155', '00218'],
  },
  {
    code: '5880',
    name: 'Fluid/Electrolyte Management',
    category: 'Physiological',
    description: 'Regulation and maintenance of fluid and electrolyte balance to prevent imbalances',
    relatedNoc: 'Electrolyte & Acid/Base Balance (0800)',
    relatedNanda: ['00012', '00113'],
  },
  {
    code: '4130',
    name: 'Changing Position',
    category: 'Physiological',
    description: 'Deliberate movement of the patient or extremity to promote comfort, circulation, and optimal fetal positioning',
    relatedNoc: 'Circulation Status (0401)',
    relatedNanda: ['00028', '00044', '00084'],
  },
  {
    code: '4040',
    name: 'Exercise Promotion',
    category: 'Physiological',
    description: 'Facilitation of regular physical activity to maintain or improve fitness level appropriate for pregnancy stage',
    relatedNoc: 'Physical Activity (0202)',
    relatedNanda: ['00087', '00053'],
  },
  {
    code: '5246',
    name: 'Nutritional Counseling',
    category: 'Physiological',
    description: 'Guidance on nutritional needs during pregnancy including caloric, protein, iron, folate, and calcium requirements',
    relatedNoc: 'Nutritional Status (1004)',
    relatedNanda: ['00053', '00054', '00113'],
  },
  {
    code: '6540',
    name: 'Weight Management',
    category: 'Physiological',
    description: 'Monitoring and counseling on appropriate gestational weight gain based on pre-pregnancy BMI',
    relatedNoc: 'Nutritional Status: Food & Fluid Intake (1008)',
    relatedNanda: ['00053', '00055'],
  },
  {
    code: '1876',
    name: 'Hyperemesis Management',
    category: 'Physiological',
    description: 'Management of severe nausea and vomiting in pregnancy including hydration, nutrition, and comfort measures',
    relatedNoc: 'Comfort Status (1401)',
    relatedNanda: ['00035', '00053', '00012'],
  },
  {
    code: '6670',
    name: 'Temperature Regulation',
    category: 'Physiological',
    description: 'Monitoring and maintaining normal body temperature to prevent complications',
    relatedNoc: 'Thermoregulation (0800)',
    relatedNanda: ['00068'],
  },
  {
    code: '3390',
    name: 'Vital Signs Monitoring',
    category: 'Physiological',
    description: 'Systematic collection and analysis of vital sign data (BP, HR, temp, RR, SpO2) to detect changes in patient status',
    relatedNoc: 'Vital Signs Status (0802)',
    relatedNanda: ['00227', '00044'],
  },
  {
    code: '2920',
    name: 'Anticoagulant Administration',
    category: 'Physiological',
    description: 'Administration and monitoring of anticoagulant therapy for thromboprophylaxis in high-risk pregnancy',
    relatedNoc: 'Blood Coagulation (1900)',
    relatedNanda: ['00092'],
  },
  {
    code: '2380',
    name: 'Medication Management',
    category: 'Physiological',
    description: 'Safe administration of prescribed medications with monitoring for side effects and therapeutic response',
    relatedNoc: 'Medication Response (0907)',
    relatedNanda: ['00078'],
  },
  {
    code: '1570',
    name: 'Medication Administration',
    category: 'Physiological',
    description: 'Safe administration of medications including prenatal vitamins, iron supplements, and prescribed treatments',
    relatedNoc: 'Medication Response (0907)',
    relatedNanda: ['00078', '00126'],
  },
  {
    code: '2080',
    name: 'Nutritional Management',
    category: 'Physiological',
    description: 'Managing nutritional requirements and dietary modifications for maternal and fetal health',
    relatedNoc: 'Nutritional Status (1004)',
    relatedNanda: ['00053', '00054', '00055', '00113'],
  },
  {
    code: '3584',
    name: 'Sleep Enhancement',
    category: 'Physiological',
    description: 'Promoting quality sleep and rest patterns during pregnancy through environmental and behavioral modifications',
    relatedNoc: 'Rest (0004)',
    relatedNanda: ['00063', '00064', '00065'],
  },
  {
    code: '0180',
    name: 'Energy Management',
    category: 'Physiological',
    description: 'Managing energy conservation and activity planning to reduce fatigue during pregnancy',
    relatedNoc: 'Energy Conservation (0003)',
    relatedNanda: ['00063'],
  },
  {
    code: '0330',
    name: 'Articular Range of Motion',
    category: 'Physiological',
    description: 'Maintaining joint mobility appropriate for pregnancy to prevent stiffness and discomfort',
    relatedNoc: 'Joint Mobility (0202)',
    relatedNanda: ['00028'],
  },
  {
    code: '7140',
    name: 'Extracorporeal Therapy Regulation',
    category: 'Physiological',
    description: 'Managing IV therapy and invasive monitoring lines including fluid administration and site care',
    relatedNoc: 'Fluid Balance (0601)',
    relatedNanda: ['00012'],
  },
  {
    code: '5602',
    name: 'Teaching: Individual',
    category: 'Educational',
    description: 'Structured individual education on pregnancy topics including warning signs, self-care, and preparation for birth',
    relatedNoc: 'Knowledge: Pregnancy (1805)',
    relatedNanda: ['00162', '00125'],
  },

  // ── PSYCHOSOCIAL INTERVENTIONS ───────────────────────────────────
  {
    code: '5270',
    name: 'Emotional Support',
    category: 'Psychosocial',
    description: 'Providing psychological comfort and reassurance to reduce anxiety and fear during pregnancy',
    relatedNoc: 'Coping (1302)',
    relatedNanda: ['00146', '00073', '00069'],
  },
  {
    code: '5330',
    name: 'Active Listening',
    category: 'Psychosocial',
    description: 'Attentive listening to patient concerns and emotional expressions with therapeutic communication techniques',
    relatedNoc: 'Anxiety Level (1211)',
    relatedNanda: ['00146', '00073'],
  },
  {
    code: '5400',
    name: 'Medication Reconciliation',
    category: 'Safety',
    description: 'Reviewing all medications for safety during pregnancy to prevent adverse fetal effects',
    relatedNoc: 'Medication Response (0907)',
    relatedNanda: ['00088', '00085'],
  },
  {
    code: '5820',
    name: 'Anxiety Reduction',
    category: 'Psychosocial',
    description: 'Minimizing anxiety through techniques including deep breathing, guided imagery, and progressive relaxation',
    relatedNoc: 'Anxiety Level (1211)',
    relatedNanda: ['00146', '00073', '00069'],
  },
  {
    code: '7110',
    name: 'Family Involvement Promotion',
    category: 'Psychosocial',
    description: 'Engaging family members in care planning and support activities for maternal health',
    relatedNoc: 'Family Social Climate (0602)',
    relatedNanda: ['00100', '00165'],
  },
  {
    code: '4350',
    name: 'Behavior Modification',
    category: 'Psychosocial',
    description: 'Assisting in modifying health behaviors including smoking cessation and substance avoidance during pregnancy',
    relatedNoc: 'Health Beliefs (1702)',
    relatedNanda: ['00078', '00085'],
  },
  {
    code: '4920',
    name: 'Active Communication',
    category: 'Psychosocial',
    description: 'Facilitating clear communication between patient, family, and healthcare team members',
    relatedNoc: 'Communication (0901)',
    relatedNanda: ['00045', '00164'],
  },
  {
    code: '5100',
    name: 'Facilitation of Self-Responsibility',
    category: 'Psychosocial',
    description: 'Encouraging patient participation in self-care decisions and health management',
    relatedNoc: 'Participation in Health Care (1601)',
    relatedNanda: ['00162', '00078'],
  },
  {
    code: '4470',
    name: 'Helping Relationships',
    category: 'Psychosocial',
    description: 'Establishing therapeutic nurse-patient relationship built on trust, empathy, and professional boundaries',
    relatedNoc: 'Trust (1504)',
    relatedNanda: ['00146', '00069'],
  },
  {
    code: '4360',
    name: 'Modification of Psychomotor Activity',
    category: 'Physiological',
    description: 'Adjusting activity levels based on patient condition and gestational age requirements',
    relatedNoc: 'Endurance (0005)',
    relatedNanda: ['00063', '00084'],
  },

  // ── SAFETY INTERVENTIONS ─────────────────────────────────────────
  {
    code: '6900',
    name: 'Infection Protection',
    category: 'Safety',
    description: 'Preventing and controlling infection through aseptic techniques, hand hygiene, and environmental monitoring',
    relatedNoc: 'Immune Status (0701)',
    relatedNanda: ['00088', '00109'],
  },
  {
    code: '6610',
    name: 'Bleeding Precautions',
    category: 'Safety',
    description: 'Monitoring for and preventing hemorrhage through assessment, positioning, and early intervention protocols',
    relatedNoc: 'Blood Loss Severity (0403)',
    relatedNanda: ['00092', '00214'],
  },
  {
    code: '6920',
    name: 'Fall Prevention',
    category: 'Safety',
    description: 'Reducing fall risk especially in advanced pregnancy with balance changes and postpartum period',
    relatedNoc: 'Fall Prevention Behavior (1909)',
    relatedNanda: ['00084', '00085'],
  },
  {
    code: '6486',
    name: 'Emergency Care',
    category: 'Safety',
    description: 'Immediate life-saving interventions during obstetric emergencies including eclampsia, hemorrhage, and cord prolapse',
    relatedNoc: 'Health Status (0401)',
    relatedNanda: ['00093', '00092', '00214'],
  },
  {
    code: '6654',
    name: 'Surveillance: Late Pregnancy',
    category: 'Safety',
    description: 'Intensive monitoring in third trimester for complications including preeclampsia, preterm labor, and fetal distress',
    relatedNoc: 'Fetal Status (2002)',
    relatedNanda: ['00089', '00167', '00227'],
  },
  {
    code: '6550',
    name: 'Protection',
    category: 'Safety',
    description: 'Protecting patient from environmental hazards and injury sources during pregnancy and postpartum',
    relatedNoc: 'Safety Behavior (1901)',
    relatedNanda: ['00084', '00085', '00043'],
  },
  {
    code: '7400',
    name: 'Crisis Intervention',
    category: 'Safety',
    description: 'Providing immediate support during acute emotional or physical crises related to pregnancy complications',
    relatedNoc: 'Coping (1302)',
    relatedNanda: ['00069', '00073', '00093'],
  },
  {
    code: '4010',
    name: 'Bleeding Reduction',
    category: 'Safety',
    description: 'Interventions to reduce or stop active bleeding including fundal massage, medication administration, and vital sign monitoring',
    relatedNoc: 'Blood Loss Severity (0403)',
    relatedNanda: ['00092', '00214'],
  },
  {
    code: '6340',
    name: 'Preeclampsia/Eclampsia Management',
    category: 'Safety',
    description: 'Monitoring and managing preeclampsia including BP control, magnesium sulfate support, seizure precautions, and fetal monitoring',
    relatedNoc: 'Maternal Hemodynamic Status (0402)',
    relatedNanda: ['00089', '00149', '00227'],
  },
  {
    code: '6310',
    name: 'Decontamination',
    category: 'Safety',
    description: 'Safe management of body fluids and contamination prevention during delivery and postpartum care',
    relatedNoc: 'Immune Status (0701)',
    relatedNanda: ['00088'],
  },

  // ── EDUCATIONAL INTERVENTIONS ────────────────────────────────────
  {
    code: '5604',
    name: 'Teaching: Procedure/Treatment',
    category: 'Educational',
    description: 'Educating patient about specific procedures including ultrasound, NST, lab draws, and delivery preparation',
    relatedNoc: 'Knowledge: Treatment Procedure (1808)',
    relatedNanda: ['00162', '00073'],
  },
  {
    code: '5606',
    name: 'Teaching: Safe Sex',
    category: 'Educational',
    description: 'Education on sexual health during pregnancy and postpartum period',
    relatedNoc: 'Knowledge: Sexuality (1809)',
    relatedNanda: ['00080'],
  },
  {
    code: '5614',
    name: 'Teaching: Prescribed Activity/Exercise',
    category: 'Educational',
    description: 'Guidance on safe exercises and activity restrictions appropriate for pregnancy stage and risk level',
    relatedNoc: 'Knowledge: Illness Care (1815)',
    relatedNanda: ['00053', '00087'],
  },
  {
    code: '5616',
    name: 'Teaching: Prescribed Diet',
    category: 'Educational',
    description: 'Detailed dietary education for specific conditions including gestational diabetes, hypertension, and anemia',
    relatedNoc: 'Nutritional Status (1004)',
    relatedNanda: ['00053', '00113'],
  },
  {
    code: '5618',
    name: 'Teaching: Disease Process',
    category: 'Educational',
    description: 'Education about specific conditions (GDM, preeclampsia, anemia) and their management during pregnancy',
    relatedNoc: 'Knowledge: Illness Care (1815)',
    relatedNanda: ['00162', '00078'],
  },
  {
    code: '5620',
    name: 'Teaching: Individualized Exercise Prescription',
    category: 'Educational',
    description: 'Creating tailored exercise plans for pregnancy considering gestational age and complications',
    relatedNoc: 'Physical Activity (0202)',
    relatedNanda: ['00053', '00087'],
  },
  {
    code: '5520',
    name: 'Health Education',
    category: 'Educational',
    description: 'Community-level health education on maternal health topics including danger signs, nutrition, and birth preparedness',
    relatedNoc: 'Knowledge: Pregnancy (1805)',
    relatedNanda: ['00162', '00051'],
  },
  {
    code: '5500',
    name: 'Referral',
    category: 'Educational',
    description: 'Coordinating referrals to specialists, facilities, or community resources for maternal-fetal medicine needs',
    relatedNoc: 'Social Support (1503)',
    relatedNanda: ['00051', '00078'],
  },
  {
    code: '7370',
    name: 'Role Enhancement',
    category: 'Psychosocial',
    description: 'Supporting the patient\'s transition to motherhood role through education, modeling, and emotional support',
    relatedNoc: 'Parenting (2003)',
    relatedNanda: ['00100', '00165'],
  },
  {
    code: '8180',
    name: 'Wound Management',
    category: 'Physiological',
    description: 'Care of perineal or surgical wounds post-delivery including assessment, cleansing, and healing promotion',
    relatedNoc: 'Wound Healing: Primary Intention (1902)',
    relatedNanda: ['00046', '00151'],
  },
];

/** Search NIC interventions by code prefix or keyword */
export function searchNicInterventions(query: string): NicIntervention[] {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim().toLowerCase();
  return NIC_INTERVENTIONS.filter((i) => {
    // Match by code (first digits, full code)
    if (i.code.toLowerCase().startsWith(q)) return true;
    // Match by code anywhere
    if (i.code.includes(q)) return true;
    // Match by name
    if (i.name.toLowerCase().includes(q)) return true;
    // Match by category
    if (i.category.toLowerCase().includes(q)) return true;
    return false;
  }).slice(0, 20); // Limit results
}
