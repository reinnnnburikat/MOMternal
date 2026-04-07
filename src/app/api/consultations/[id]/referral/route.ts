import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/consultations/[id]/referral
 * Generates a structured referral summary from consultation data,
 * stores it in referralSummary, and returns the generated text.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const consultation = await db.consultation.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            name: true,
            patientId: true,
            dateOfBirth: true,
            gravidity: true,
            parity: true,
            aog: true,
            bloodType: true,
            riskLevel: true,
            barangay: true,
          },
        },
      },
    });

    if (!consultation) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    const patient = consultation.patient;

    // Parse selected interventions if available
    let selectedInterventionsText = "None selected";
    if (consultation.selectedInterventions) {
      try {
        const interventions = JSON.parse(consultation.selectedInterventions);
        if (Array.isArray(interventions)) {
          selectedInterventionsText = interventions
            .map((intv: { name?: string; description?: string }, i: number) =>
              `${i + 1}. ${intv.name || "Unnamed"}${intv.description ? ": " + intv.description : ""}`
            )
            .join("\n   ");
        }
      } catch {
        selectedInterventionsText = consultation.selectedInterventions;
      }
    }

    // Parse AI suggestions for rationale
    let aiRationale = "";
    if (consultation.aiSuggestions) {
      try {
        const parsed = JSON.parse(consultation.aiSuggestions);
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
      consultation.riskLevel === "high"
        ? "HIGH RISK"
        : consultation.riskLevel === "moderate"
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
      `Patient ID: ${patient.patientId}`,
      `Name: ${patient.name}`,
      `Date of Birth: ${patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "N/A"}`,
      `Barangay: ${patient.barangay || "N/A"}`,
      "",
      "OBSTETRICAL HISTORY",
      "-".repeat(40),
      `Gravidity: ${patient.gravidity}`,
      `Parity: ${patient.parity}`,
      `Age of Gestation: ${patient.aog || "Not calculated"}`,
      `Blood Type: ${patient.bloodType || "Unknown"}`,
      `Risk Level: ${riskLabel}`,
      "",
      "CLINICAL ASSESSMENT",
      "-".repeat(40),
      `Subjective Symptoms: ${consultation.subjectiveSymptoms || "None reported"}`,
      `Objective Vitals: ${consultation.objectiveVitals || "Not recorded"}`,
      `Fetal Heart Rate: ${consultation.fetalHeartRate || "Not measured"}`,
      `Fundal Height: ${consultation.fundalHeight || "Not measured"}`,
      `Allergies: ${consultation.allergies || "None reported"}`,
      `Current Medications: ${consultation.medications || "None"}`,
      "",
      "FINDINGS",
      "-".repeat(40),
      `Physical Exam: ${consultation.physicalExam || "Not documented"}`,
      `Lab Results: ${consultation.labResults || "No results available"}`,
      `Notes: ${consultation.notes || "None"}`,
      "",
      "DIAGNOSIS",
      "-".repeat(40),
      `ICD-10 Diagnosis: ${consultation.icd10Diagnosis || "None assigned"}`,
      `NANDA Diagnosis: ${consultation.nandaDiagnosis || "None assigned"}`,
      "",
      "AI-ASSISTED INTERVENTIONS",
      "-".repeat(40),
      `Selected Interventions:`,
      `   ${selectedInterventionsText}`,
      aiRationale ? `Rationale: ${aiRationale}` : "",
      "",
      "EVALUATION",
      "-".repeat(40),
      `Evaluation Status: ${consultation.evaluationStatus || "Not yet evaluated"}`,
      `Evaluation Notes: ${consultation.evaluationNotes || "None"}`,
      "",
      "=".repeat(60),
      `Consultation No: ${consultation.consultationNo}`,
      `Consultation Date: ${new Date(consultation.consultationDate).toLocaleString()}`,
      `Referral Generated: ${new Date().toLocaleString()}`,
      "=".repeat(60),
    ]
      .filter(Boolean)
      .join("\n");

    // Store the referral summary
    const updated = await db.consultation.update({
      where: { id },
      data: {
        referralSummary,
        referralStatus: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      referralSummary,
      consultation: {
        id: updated.id,
        consultationNo: updated.consultationNo,
        referralStatus: updated.referralStatus,
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
