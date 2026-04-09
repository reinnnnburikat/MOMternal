import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/supabase";

/**
 * POST /api/consultations/[id]/referral
 * Generates a structured referral summary from consultation data,
 * stores it in referral_summary, and returns the generated text.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const consultation = await queryOne(
      `SELECT c.*,
              p.name AS patient_name, p.patient_id AS patient_patient_id,
              p.date_of_birth AS patient_date_of_birth, p.gravidity AS patient_gravidity,
              p.parity AS patient_parity, p.aog AS patient_aog, p.blood_type AS patient_blood_type,
              p.risk_level AS patient_risk_level, p.barangay AS patient_barangay
       FROM consultation c
       JOIN patient p ON c.patient_id = p.id
       WHERE c.id = $1`,
      [id]
    );

    if (!consultation) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    const p = consultation;

    // Parse selected interventions if available
    let selectedInterventionsText = "None selected";
    if (consultation.selected_interventions) {
      try {
        const interventions = JSON.parse(consultation.selected_interventions as string);
        if (Array.isArray(interventions)) {
          selectedInterventionsText = interventions
            .map((intv: { name?: string; description?: string }, i: number) =>
              `${i + 1}. ${intv.name || "Unnamed"}${intv.description ? ": " + intv.description : ""}`
            )
            .join("\n   ");
        }
      } catch {
        selectedInterventionsText = consultation.selected_interventions;
      }
    }

    // Parse AI suggestions for rationale
    let aiRationale = "";
    if (consultation.ai_suggestions) {
      try {
        const parsed = JSON.parse(consultation.ai_suggestions);
        if (parsed.rationale) {
          aiRationale = parsed.rationale;
        }
        if (parsed.preventionLevel) {
          aiRationale += ` (Prevention level: ${parsed.preventionLevel})`;
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Determine risk label
    const riskLabel =
      consultation.risk_level === "high"
        ? "HIGH RISK"
        : consultation.risk_level === "moderate"
          ? "MODERATE RISK"
          : "LOW RISK";

    // Build referral summary
    const referralSummary = [
      "=".repeat(60),
      "MATERNAL HEALTH REFERRAL SUMMARY",
      "=".repeat(60),
      "",
      "PATIENT INFORMATION",
      "-".repeat(40),
      `Patient ID: ${p.patient_patient_id}`,
      `Name: ${p.patient_name}`,
      `Date of Birth: ${p.patient_date_of_birth ? new Date(p.patient_date_of_birth).toLocaleDateString() : "N/A"}`,
      `Barangay: ${p.patient_barangay || "N/A"}`,
      "",
      "OBSTETRICAL HISTORY",
      "-".repeat(40),
      `Gravidity: ${p.patient_gravidity}`,
      `Parity: ${p.patient_parity}`,
      `Age of Gestation: ${p.patient_aog || "Not calculated"}`,
      `Blood Type: ${p.patient_blood_type || "Unknown"}`,
      `Risk Level: ${riskLabel}`,
      "",
      "CLINICAL ASSESSMENT",
      "-".repeat(40),
      `Subjective Symptoms: ${consultation.subjective_symptoms || "None reported"}`,
      `Objective Vitals: ${consultation.objective_vitals || "Not recorded"}`,
      `Fetal Heart Rate: ${consultation.fetal_heart_rate || "Not measured"}`,
      `Fundal Height: ${consultation.fundal_height || "Not measured"}`,
      `Allergies: ${consultation.allergies || "None reported"}`,
      `Current Medications: ${consultation.medications || "None"}`,
      "",
      "FINDINGS",
      "-".repeat(40),
      `Physical Exam: ${consultation.physical_exam || "Not documented"}`,
      `Lab Results: ${consultation.lab_results || "No results available"}`,
      `Notes: ${consultation.notes || "None"}`,
      "",
      "DIAGNOSIS",
      "-".repeat(40),
      `ICD-10 Diagnosis: ${consultation.icd10_diagnosis || "None assigned"}`,
      `NANDA Diagnosis: ${consultation.nanda_diagnosis || "None assigned"}`,
      "",
      "AI-ASSISTED INTERVENTIONS",
      "-".repeat(40),
      `Selected Interventions:`,
      `   ${selectedInterventionsText}`,
      aiRationale ? `Rationale: ${aiRationale}` : "",
      "",
      "EVALUATION",
      "-".repeat(40),
      `Evaluation Status: ${consultation.evaluation_status || "Not yet evaluated"}`,
      `Evaluation Notes: ${consultation.evaluation_notes || "None"}`,
      "",
      "=".repeat(60),
      `Consultation No: ${consultation.consultation_no}`,
      `Consultation Date: ${new Date(consultation.consultation_date).toLocaleString()}`,
      `Referral Generated: ${new Date().toLocaleString()}`,
      "=".repeat(60),
    ]
      .filter(Boolean)
      .join("\n");

    // Store the referral summary
    const updated = await queryOne(
      `UPDATE consultation SET referral_summary = $1, referral_status = $2, updated_at = now() WHERE id = $3 RETURNING id, consultation_no, referral_status`,
      [referralSummary, "pending", id]
    );

    return NextResponse.json({
      success: true,
      referralSummary,
      consultation: {
        id: updated!.id,
        consultationNo: updated!.consultation_no,
        referralStatus: updated!.referral_status,
      },
    });
  } catch (error) {
    console.error("Error generating referral:", error);
    return NextResponse.json(
      { error: "Failed to generate referral summary" },
      { status: 500 }
    );
  }
}
