import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Step-to-field mapping: determines which step a field belongs to
const STEP_FIELD_MAP: Record<string, number> = {
  // Step 1: SOAP Subjective
  subjectiveSymptoms: 1,
  // Step 2: SOAP Objective
  objectiveVitals: 2,
  fetalHeartRate: 2,
  fundalHeight: 2,
  allergies: 2,
  medications: 2,
  // Step 3: Findings
  physicalExam: 3,
  labResults: 3,
  notes: 3,
  // Step 4: Diagnosis
  icd10Diagnosis: 4,
  nandaDiagnosis: 4,
  // Step 5: Risk
  riskLevel: 5,
  // Step 6: AI
  aiSuggestions: 6,
  selectedInterventions: 6,
  // Step 7: Evaluation & Referral
  evaluationStatus: 7,
  evaluationNotes: 7,
  referralSummary: 7,
  referralStatus: 7,
};

/**
 * GET /api/consultations/[id]
 * Returns consultation with patient name
 */
export async function GET(
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
            id: true,
            patientId: true,
            name: true,
            dateOfBirth: true,
            bloodType: true,
            gravidity: true,
            parity: true,
            aog: true,
            riskLevel: true,
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

    return NextResponse.json(consultation);
  } catch (error) {
    console.error("Error fetching consultation:", error);
    return NextResponse.json(
      { error: "Failed to fetch consultation" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/consultations/[id]
 * Updates consultation fields (partial update).
 * Automatically advances stepCompleted based on fields provided.
 * When stepCompleted reaches 7, sets status to "completed".
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check consultation exists
    const existing = await db.consultation.findUnique({
      where: { id },
      select: { id: true, stepCompleted: true, status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    // Build update data from allowed fields only
    const allowedFields = [
      "subjectiveSymptoms",
      "objectiveVitals",
      "fetalHeartRate",
      "fundalHeight",
      "allergies",
      "medications",
      "physicalExam",
      "labResults",
      "notes",
      "icd10Diagnosis",
      "nandaDiagnosis",
      "riskLevel",
      "aiSuggestions",
      "selectedInterventions",
      "evaluationStatus",
      "evaluationNotes",
      "referralSummary",
      "referralStatus",
    ] as const;

    const updateData: Record<string, unknown> = {};

    let maxStep = existing.stepCompleted;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updateData as Record<string, unknown>)[field] = body[field];
        const fieldStep = STEP_FIELD_MAP[field];
        if (fieldStep !== undefined && fieldStep > maxStep) {
          maxStep = fieldStep;
        }
      }
    }

    // If no updatable fields were provided, return early
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    // Advance stepCompleted
    updateData.stepCompleted = maxStep;

    // When step 7 is completed, set status to "completed"
    if (maxStep >= 7) {
      updateData.status = "completed";
    }

    const updated = await db.consultation.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            patientId: true,
            name: true,
            dateOfBirth: true,
            bloodType: true,
            gravidity: true,
            parity: true,
            aog: true,
            riskLevel: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating consultation:", error);
    return NextResponse.json(
      { error: "Failed to update consultation" },
      { status: 500 }
    );
  }
}
