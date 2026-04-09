/**
 * ICD-10 Maternal/Pregnancy Codes Reference Data
 * Focused on O-series (pregnancy, childbirth, puerperium) and related codes.
 * Each code has a unique reference for searchable dropdown.
 */

export interface Icd10Code {
  /** ICD-10 code (e.g., "O14.1") */
  code: string;
  /** Official ICD-10 description */
  name: string;
  /** Expanded description for context */
  description: string;
  /** Category for quick filtering */
  category: 'hypertensive' | 'diabetes' | 'anemia' | 'hemorrhage' | 'infection' | 'labor' | 'fetal' | 'other';
}

export const ICD10_MATERNAL_CODES: Icd10Code[] = [
  // ── HYPERTENSIVE DISORDERS ───────────────────────────────────────
  { code: 'O10', name: 'Pre-existing hypertension complicating pregnancy, childbirth and the puerperium', description: 'Chronic hypertension present before pregnancy', category: 'hypertensive' },
  { code: 'O10.0', name: 'Pre-existing hypertension complicating pregnancy', description: 'Chronic hypertension affecting pregnancy management', category: 'hypertensive' },
  { code: 'O10.1', name: 'Pre-existing hypertension complicating childbirth', description: 'Chronic hypertension during labor and delivery', category: 'hypertensive' },
  { code: 'O10.2', name: 'Pre-existing hypertension complicating the puerperium', description: 'Chronic hypertension postpartum period', category: 'hypertensive' },
  { code: 'O10.3', name: 'Pre-existing hypertension with superimposed proteinuria', description: 'Chronic hypertension with new-onset proteinuria', category: 'hypertensive' },
  { code: 'O10.4', name: 'Pre-existing hypertension with superimposed proteinuria, complicating pregnancy', description: 'Superimposed preeclampsia on chronic HTN during pregnancy', category: 'hypertensive' },
  { code: 'O10.9', name: 'Pre-existing hypertension complicating pregnancy, unspecified', description: 'Chronic HTN in pregnancy not otherwise specified', category: 'hypertensive' },
  { code: 'O11', name: 'Pre-existing hypertension with superimposed proteinuria', description: 'Superimposed preeclampsia on chronic hypertension', category: 'hypertensive' },
  { code: 'O12', name: 'Pregnancy-induced hypertension (gestational HTN)', description: 'New-onset hypertension after 20 weeks without proteinuria', category: 'hypertensive' },
  { code: 'O12.0', name: 'Gestational edema', description: 'Edema in pregnancy due to hypertensive effect', category: 'hypertensive' },
  { code: 'O12.1', name: 'Gestational proteinuria', description: 'New-onset proteinuria without hypertension', category: 'hypertensive' },
  { code: 'O13', name: 'Gestational hypertension without significant proteinuria', description: 'PIH without proteinuria — mild form', category: 'hypertensive' },
  { code: 'O14', name: 'Pre-eclampsia', description: 'Pregnancy-induced hypertension with proteinuria', category: 'hypertensive' },
  { code: 'O14.0', name: 'Mild to moderate pre-eclampsia', description: 'PIH with proteinuria, BP 140/90-159/109', category: 'hypertensive' },
  { code: 'O14.1', name: 'Severe pre-eclampsia', description: 'PIH with proteinuria, BP ≥160/110, end-organ involvement', category: 'hypertensive' },
  { code: 'O14.2', name: 'HELLP syndrome', description: 'Hemolysis, Elevated Liver enzymes, Low Platelets', category: 'hypertensive' },
  { code: 'O14.9', name: 'Pre-eclampsia, unspecified', description: 'Preeclampsia not otherwise specified', category: 'hypertensive' },
  { code: 'O15', name: 'Eclampsia', description: 'Preeclampsia with seizures — obstetric emergency', category: 'hypertensive' },
  { code: 'O15.0', name: 'Eclampsia in pregnancy', description: 'Eclamptic seizures during pregnancy', category: 'hypertensive' },
  { code: 'O15.1', name: 'Eclampsia in labor', description: 'Eclamptic seizures during labor', category: 'hypertensive' },
  { code: 'O15.2', name: 'Eclampsia in the puerperium', description: 'Eclamptic seizures postpartum', category: 'hypertensive' },
  { code: 'O15.9', name: 'Eclampsia, unspecified', description: 'Eclampsia not otherwise specified', category: 'hypertensive' },
  { code: 'O16', name: 'Unspecified maternal hypertension', description: 'Maternal hypertension not classified elsewhere', category: 'hypertensive' },

  // ── DIABETES IN PREGNANCY ────────────────────────────────────────
  { code: 'O24', name: 'Diabetes mellitus in pregnancy', description: 'Pre-existing or gestational diabetes complicating pregnancy', category: 'diabetes' },
  { code: 'O24.0', name: 'Pre-existing Type 1 diabetes mellitus, complicating pregnancy', description: 'Insulin-dependent DM present before pregnancy', category: 'diabetes' },
  { code: 'O24.1', name: 'Pre-existing Type 2 diabetes mellitus, complicating pregnancy', description: 'Non-insulin-dependent DM present before pregnancy', category: 'diabetes' },
  { code: 'O24.3', name: 'Gestational diabetes mellitus', description: 'Diabetes first diagnosed in pregnancy (24-28 weeks screening)', category: 'diabetes' },
  { code: 'O24.4', name: 'Gestational diabetes mellitus, on insulin', description: 'GDM requiring insulin therapy for glycemic control', category: 'diabetes' },
  { code: 'O24.9', name: 'Unspecified diabetes mellitus in pregnancy', description: 'DM in pregnancy not otherwise specified', category: 'diabetes' },

  // ── ANEMIA ───────────────────────────────────────────────────────
  { code: 'O99.0', name: 'Anemia complicating pregnancy, childbirth and the puerperium', description: 'Maternal anemia affecting pregnancy outcome', category: 'anemia' },
  { code: 'D50', name: 'Iron deficiency anemia', description: 'Iron-deficiency anemia — most common in pregnancy', category: 'anemia' },
  { code: 'D50.0', name: 'Iron deficiency anemia secondary to blood loss (chronic)', description: 'IDA from chronic blood loss including menorrhagia', category: 'anemia' },
  { code: 'D50.1', name: 'Iron deficiency anemia of pregnancy', description: 'Pregnancy-related iron deficiency anemia', category: 'anemia' },
  { code: 'D50.9', name: 'Iron deficiency anemia, unspecified', description: 'Iron deficiency anemia not otherwise specified', category: 'anemia' },
  { code: 'D64.9', name: 'Anemia, unspecified', description: 'Anemia of undetermined cause', category: 'anemia' },
  { code: 'O99.0', name: 'Anemia complicating pregnancy', description: 'Anemia as a complication of pregnancy, childbirth, or puerperium', category: 'anemia' },

  // ── HEMORRHAGE ───────────────────────────────────────────────────
  { code: 'O20', name: 'Early pregnancy hemorrhage', description: 'Bleeding in first trimester including threatened abortion', category: 'hemorrhage' },
  { code: 'O20.0', name: 'Threatened abortion', description: 'Vaginal bleeding with closed cervix in early pregnancy', category: 'hemorrhage' },
  { code: 'O20.8', name: 'Other early pregnancy hemorrhage', description: 'Other specified bleeding in first trimester', category: 'hemorrhage' },
  { code: 'O20.9', name: 'Early pregnancy hemorrhage, unspecified', description: 'Unspecified first-trimester bleeding', category: 'hemorrhage' },
  { code: 'O44', name: 'Placenta previa', description: 'Abnormally implanted placenta over or near the cervical os', category: 'hemorrhage' },
  { code: 'O44.0', name: 'Placenta previa, unspecified', description: 'Placenta previa type not specified', category: 'hemorrhage' },
  { code: 'O44.1', name: 'Low-lying placenta', description: 'Placenta implanted in lower uterine segment near but not covering os', category: 'hemorrhage' },
  { code: 'O44.4', name: 'Placenta previa, complete', description: 'Placenta completely covers the cervical os', category: 'hemorrhage' },
  { code: 'O45', name: 'Placental abruption', description: 'Premature separation of normally implanted placenta', category: 'hemorrhage' },
  { code: 'O45.0', name: 'Placental abruption, unspecified', description: 'Abruptio placentae not otherwise specified', category: 'hemorrhage' },
  { code: 'O45.8', name: 'Other placental abruption', description: 'Other specified forms of placental separation', category: 'hemorrhage' },
  { code: 'O45.9', name: 'Placental abruption, unspecified', description: 'Abruptio placentae NOS', category: 'hemorrhage' },
  { code: 'O46', name: 'Antepartum hemorrhage', description: 'Bleeding from 20 weeks gestation to before onset of labor', category: 'hemorrhage' },
  { code: 'O46.0', name: 'Antepartum hemorrhage with placenta previa', description: 'APH associated with placenta previa', category: 'hemorrhage' },
  { code: 'O46.8', name: 'Other antepartum hemorrhage', description: 'Other specified APH', category: 'hemorrhage' },
  { code: 'O46.9', name: 'Antepartum hemorrhage, unspecified', description: 'APH not otherwise specified', category: 'hemorrhage' },
  { code: 'O67', name: 'Labor and delivery complicated by hemorrhage', description: 'Intrapartum bleeding requiring management', category: 'hemorrhage' },
  { code: 'O67.0', name: 'Labor and delivery complicated by intrapartum hemorrhage', description: 'Bleeding during labor from non-placental cause', category: 'hemorrhage' },
  { code: 'O67.8', name: 'Labor and delivery complicated by other hemorrhage', description: 'Other specified hemorrhage during labor', category: 'hemorrhage' },
  { code: 'O72', name: 'Postpartum hemorrhage', description: 'Excessive bleeding after delivery (>500mL vaginal, >1000mL cesarean)', category: 'hemorrhage' },
  { code: 'O72.0', name: 'Third-stage hemorrhage', description: 'PPH during or after placental delivery', category: 'hemorrhage' },
  { code: 'O72.1', name: 'Immediate postpartum hemorrhage', description: 'PPH within 24 hours of delivery', category: 'hemorrhage' },
  { code: 'O72.2', name: 'Delayed and secondary postpartum hemorrhage', description: 'PPH occurring 24 hours to 6 weeks postpartum', category: 'hemorrhage' },

  // ── INFECTION ────────────────────────────────────────────────────
  { code: 'O23', name: 'Urinary tract infections in pregnancy', description: 'UTI complicating pregnancy requiring treatment', category: 'infection' },
  { code: 'O23.0', name: 'Kidney infection in pregnancy', description: 'Pyelonephritis in pregnancy', category: 'infection' },
  { code: 'O23.1', name: 'Bladder infection in pregnancy', description: 'Cystitis in pregnancy', category: 'infection' },
  { code: 'O23.2', name: 'Unspecified urinary tract infection in pregnancy', description: 'UTI in pregnancy not otherwise specified', category: 'infection' },
  { code: 'O23.4', name: 'Vaginal infection in pregnancy', description: 'Vaginitis complicating pregnancy', category: 'infection' },
  { code: 'O23.5', name: 'Other genitourinary tract infections in pregnancy', description: 'Other GU infections during pregnancy', category: 'infection' },
  { code: 'O98', name: 'Other maternal infectious and parasitic diseases', description: 'Maternal infections classified elsewhere but complicating pregnancy', category: 'infection' },
  { code: 'O98.0', name: 'Tuberculosis complicating pregnancy', description: 'Active TB in pregnancy', category: 'infection' },
  { code: 'O98.1', name: 'Syphilis complicating pregnancy', description: 'Maternal syphilis requiring treatment and fetal monitoring', category: 'infection' },
  { code: 'O98.2', name: 'Gonorrhea complicating pregnancy', description: 'Maternal gonorrhea', category: 'infection' },
  { code: 'O98.3', name: 'Other sexually transmitted infections complicating pregnancy', description: 'STIs including HIV, chlamydia, hepatitis B', category: 'infection' },
  { code: 'O98.6', name: 'Lyme disease complicating pregnancy', description: 'Maternal Lyme disease', category: 'infection' },
  { code: 'O98.8', name: 'Other specified maternal infectious diseases', description: 'Other maternal infections complicating pregnancy', category: 'infection' },
  { code: 'B34', name: 'Viral infection, unspecified', description: 'Unspecified viral illness', category: 'infection' },
  { code: 'B37', name: 'Candidiasis', description: 'Yeast infection (common in pregnancy)', category: 'infection' },
  { code: 'B37.3', name: 'Candidal vulvovaginitis', description: 'Vaginal yeast infection', category: 'infection' },

  // ── COMPLICATIONS OF LABOR ───────────────────────────────────────
  { code: 'O60', name: 'Preterm labor and delivery', description: 'Onset of labor before 37 completed weeks', category: 'labor' },
  { code: 'O60.0', name: 'Preterm labor with preterm delivery', description: 'Spontaneous preterm birth', category: 'labor' },
  { code: 'O60.1', name: 'Preterm labor with term delivery', description: 'Preterm labor that was successfully stopped', category: 'labor' },
  { code: 'O62', name: 'Abnormalities of forces of labor', description: 'Dysfunctional labor patterns', category: 'labor' },
  { code: 'O62.0', name: 'Primary inadequate contractions', description: 'Hypotonic uterine dysfunction from onset', category: 'labor' },
  { code: 'O62.1', name: 'Secondary inadequate contractions', description: 'Hypotonic dysfunction after active labor established', category: 'labor' },
  { code: 'O62.2', name: 'Hypertonic, incoordinate, and prolonged contractions', description: 'Hyperactive uterine dysfunction', category: 'labor' },
  { code: 'O64', name: 'Obstruction due to malposition and malpresentation of fetus', description: 'Abnormal fetal position causing obstruction', category: 'labor' },
  { code: 'O64.0', name: 'Obstruction due to incomplete rotation of fetal head', description: 'Persistent occiput posterior', category: 'labor' },
  { code: 'O64.1', name: 'Obstruction due to brow presentation', description: 'Brow presentation causing obstruction', category: 'labor' },
  { code: 'O64.2', name: 'Obstruction due to face presentation', description: 'Face presentation causing obstruction', category: 'labor' },
  { code: 'O64.3', name: 'Obstruction due to unstable lie', description: 'Transverse or oblique lie', category: 'labor' },
  { code: 'O64.4', name: 'Obstruction due to high head at onset of labor', description: 'Unengaged fetal head at labor onset', category: 'labor' },
  { code: 'O68', name: 'Labor and delivery complicated by fetal stress', description: 'Signs of fetal compromise during labor', category: 'labor' },
  { code: 'O68.0', name: 'Labor and delivery complicated by fetal heart rate abnormalities', description: 'Non-reassuring fetal heart rate tracing', category: 'labor' },
  { code: 'O68.1', name: 'Labor and delivery complicated by meconium in amniotic fluid', description: 'Meconium-stained amniotic fluid', category: 'labor' },
  { code: 'O68.3', name: 'Labor and delivery complicated by abnormal biochem. findings', description: 'Abnormal fetal scalp pH or lactate', category: 'labor' },
  { code: 'O68.8', name: 'Labor and delivery complicated by other fetal stress', description: 'Other signs of fetal compromise during labor', category: 'labor' },
  { code: 'O70', name: 'Perineal laceration during delivery', description: 'Tears of perineum during childbirth', category: 'labor' },
  { code: 'O70.0', name: 'First-degree perineal laceration', description: 'Perineal tear involving skin only', category: 'labor' },
  { code: 'O70.1', name: 'Second-degree perineal laceration', description: 'Perineal tear involving perineal muscles', category: 'labor' },
  { code: 'O70.2', name: 'Third-degree perineal laceration', description: 'Perineal tear involving anal sphincter', category: 'labor' },
  { code: 'O70.3', name: 'Fourth-degree perineal laceration', description: 'Perineal tear involving rectal mucosa', category: 'labor' },
  { code: 'O71', name: 'Other obstetric trauma', description: 'Trauma during labor and delivery', category: 'labor' },
  { code: 'O71.0', name: 'Cervical laceration during delivery', description: 'Tear of cervix during childbirth', category: 'labor' },
  { code: 'O71.1', name: 'Vaginal vault laceration during delivery', description: 'High vaginal tear', category: 'labor' },
  { code: 'O71.2', name: 'Vulval and perineal hematoma during delivery', description: 'Hematoma formation during delivery', category: 'labor' },
  { code: 'O71.4', name: 'Rupture of uterus', description: 'Uterine rupture — obstetric emergency', category: 'labor' },
  { code: 'O71.5', name: 'Inversion of uterus', description: 'Uterine inversion — obstetric emergency', category: 'labor' },
  { code: 'O75', name: 'Other complications of labor and delivery', description: 'Other specified complications of labor', category: 'labor' },
  { code: 'O75.0', name: 'Maternal hypotension syndrome', description: 'Hypotension during labor (supine hypotension)', category: 'labor' },
  { code: 'O75.1', name: 'Postpartum hemorrhage, NOS', description: 'Postpartum hemorrhage not otherwise specified', category: 'labor' },
  { code: 'O75.2', name: 'Labor and delivery complicated by cord around neck', description: 'Nuchal cord complicating delivery', category: 'labor' },
  { code: 'O75.3', name: 'Labor and delivery complicated by other cord complications', description: 'Cord prolapse, cord compression', category: 'labor' },
  { code: 'O75.4', name: 'Operative delivery complicated by other complications', description: 'Complications of assisted/instrumental delivery', category: 'labor' },
  { code: 'O75.8', name: 'Other specified complications of labor and delivery', description: 'Other specified labor complications', category: 'labor' },

  // ── FETAL COMPLICATIONS ──────────────────────────────────────────
  { code: 'O36', name: 'Maternal care for known or suspected fetal problem', description: 'Fetal complications requiring maternal management', category: 'fetal' },
  { code: 'O36.0', name: 'Maternal care for suspected central nervous system malformation in fetus', description: 'Suspected fetal CNS anomaly', category: 'fetal' },
  { code: 'O36.2', name: 'Maternal care for suspected chromosomal abnormality in fetus', description: 'Suspected fetal chromosomal disorder', category: 'fetal' },
  { code: 'O36.3', name: 'Maternal care for suspected growth retardation in fetus', description: 'Suspected fetal growth restriction (IUGR)', category: 'fetal' },
  { code: 'O36.4', name: 'Maternal care for suspected excessive fetal growth', description: 'Suspected fetal macrosomia', category: 'fetal' },
  { code: 'O36.5', name: 'Maternal care for known/suspected fetal anemia', description: 'Fetal anemia requiring monitoring', category: 'fetal' },
  { code: 'O36.8', name: 'Maternal care for other specified fetal problems', description: 'Other fetal complications', category: 'fetal' },
  { code: 'O36.9', name: 'Maternal care for suspected fetal problem, unspecified', description: 'Suspected fetal problem NOS', category: 'fetal' },
  { code: 'O40', name: 'Polyhydramnios', description: 'Excessive amniotic fluid', category: 'fetal' },
  { code: 'O41', name: 'Oligohydramnios', description: 'Decreased amniotic fluid', category: 'fetal' },
  { code: 'O41.0', name: 'Oligohydramnios, first trimester', description: 'Reduced amniotic fluid in first trimester', category: 'fetal' },
  { code: 'O41.1', name: 'Oligohydramnios, second trimester', description: 'Reduced amniotic fluid in second trimester', category: 'fetal' },
  { code: 'O41.2', name: 'Oligohydramnios, third trimester', description: 'Reduced amniotic fluid in third trimester', category: 'fetal' },
  { code: 'O42', name: 'Premature rupture of membranes', description: 'ROM before onset of labor', category: 'fetal' },
  { code: 'O42.0', name: 'Premature rupture of membranes, onset of labor within 24 hours', description: 'PPROM with imminent labor', category: 'fetal' },
  { code: 'O42.1', name: 'Premature rupture of membranes, onset of labor after 24 hours', description: 'PROM with delayed labor onset', category: 'fetal' },
  { code: 'O42.2', name: 'Premature rupture of membranes, labor not started', description: 'PROM requiring induction planning', category: 'fetal' },

  // ── OTHER COMPLICATIONS ──────────────────────────────────────────
  { code: 'O21', name: 'Excessive vomiting in pregnancy', description: 'Hyperemesis gravidarum', category: 'other' },
  { code: 'O21.0', name: 'Mild hyperemesis gravidarum', description: 'Mild nausea and vomiting requiring management', category: 'other' },
  { code: 'O21.1', name: 'Hyperemesis gravidarum with metabolic disturbance', description: 'Severe hyperemesis with metabolic complications', category: 'other' },
  { code: 'O21.9', name: 'Excessive vomiting in pregnancy, unspecified', description: 'Hyperemesis not otherwise specified', category: 'other' },
  { code: 'O26', name: 'Pregnancy-related conditions, unspecified', description: 'Other pregnancy-related conditions', category: 'other' },
  { code: 'O26.0', name: 'Excessive weight gain in pregnancy', description: 'Weight gain exceeding recommended guidelines', category: 'other' },
  { code: 'O26.1', name: 'Insufficient weight gain in pregnancy', description: 'Weight gain below recommended guidelines', category: 'other' },
  { code: 'O26.2', name: 'Pregnancy care of woman with suspected abnormal uterine size', description: 'Uterine size not consistent with gestational age', category: 'other' },
  { code: 'O26.4', name: 'Pruritus gravidarum', description: 'Itching in pregnancy (cholestasis workup)', category: 'other' },
  { code: 'O26.6', name: 'Liver disorders in pregnancy', description: 'Pregnancy-related liver conditions', category: 'other' },
  { code: 'O26.7', name: 'Pelvic joint pain in pregnancy', description: 'Symphysis pubis dysfunction, pelvic girdle pain', category: 'other' },
  { code: 'O26.8', name: 'Other specified pregnancy-related conditions', description: 'Other specified conditions', category: 'other' },
  { code: 'O30', name: 'Multiple gestation', description: 'Pregnancy with two or more fetuses', category: 'other' },
  { code: 'O30.0', name: 'Twin pregnancy', description: 'Dichorionic/monochorionic twin gestation', category: 'other' },
  { code: 'O30.1', name: 'Triplet pregnancy', description: 'Triplet gestation', category: 'other' },
  { code: 'O30.2', name: 'Quadruplet pregnancy', description: 'Quadruplet gestation', category: 'other' },
  { code: 'O99', name: 'Other maternal diseases classifiable elsewhere but complicating pregnancy', description: 'Pre-existing conditions complicating pregnancy', category: 'other' },
  { code: 'O99.1', name: 'Other diseases of the blood and blood-forming organs', description: 'Hematologic disorders complicating pregnancy', category: 'other' },
  { code: 'O99.2', name: 'Endocrine, nutritional and metabolic diseases', description: 'Endocrine/metabolic conditions in pregnancy', category: 'other' },
  { code: 'O99.3', name: 'Mental disorders and diseases of the nervous system', description: 'Psychiatric/neurologic conditions in pregnancy', category: 'other' },
  { code: 'O99.5', name: 'Diseases of the musculoskeletal system', description: 'MSK conditions complicating pregnancy', category: 'other' },
  { code: 'O99.8', name: 'Other specified diseases and conditions', description: 'Other conditions complicating pregnancy', category: 'other' },
  { code: 'Z34', name: 'Encounter for supervision of normal pregnancy', description: 'Routine ANC visit for uncomplicated pregnancy', category: 'other' },
  { code: 'Z34.0', name: 'Supervision of first normal pregnancy', description: 'ANC for primigravida', category: 'other' },
  { code: 'Z34.8', name: 'Supervision of other normal pregnancy', description: 'ANC for multigravida', category: 'other' },
  { code: 'Z34.9', name: 'Supervision of normal pregnancy, unspecified', description: 'ANC supervision NOS', category: 'other' },
];

/** Search ICD-10 codes by code prefix or keyword */
export function searchIcd10Codes(query: string): Icd10Code[] {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim().toLowerCase();
  return ICD10_MATERNAL_CODES.filter((c) => {
    // Match by code (first digits, full code)
    if (c.code.toLowerCase().startsWith(q)) return true;
    // Match by code anywhere
    if (c.code.includes(q)) return true;
    // Match by name
    if (c.name.toLowerCase().includes(q)) return true;
    // Match by description
    if (c.description.toLowerCase().includes(q)) return true;
    // Match by category
    if (c.category.includes(q)) return true;
    return false;
  }).slice(0, 20); // Limit results
}
