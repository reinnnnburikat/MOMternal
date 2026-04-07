import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

/**
 * POST /api/consultations/[id]/ai-suggest
 * Sends assessment data to z-ai-web-dev-sdk (server-side only) to generate
 * NIC nursing interventions. Stores result as JSON string in aiSuggestions.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch consultation with patient (need clinical data, not identity)
    const consultation = await db.consultation.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            gravidity: true,
            parity: true,
            aog: true,
            bloodType: true,
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

    // Build clinical assessment payload (NO patient-identifiable data)
    const assessmentData = {
      // SOAP
      subjectiveSymptoms: consultation.subjectiveSymptoms,
      objectiveVitals: consultation.objectiveVitals,
      fetalHeartRate: consultation.fetalHeartRate,
      fundalHeight: consultation.fundalHeight,
      allergies: consultation.allergies,
      medications: consultation.medications,
      // Findings
      physicalExam: consultation.physicalExam,
      labResults: consultation.labResults,
      notes: consultation.notes,
      // Diagnosis
      icd10Diagnosis: consultation.icd10Diagnosis,
      nandaDiagnosis: consultation.nandaDiagnosis,
      // Clinical context (no names, IDs, contact info)
      clinicalContext: {
        gravidity: consultation.patient.gravidity,
        parity: consultation.patient.parity,
        aog: consultation.patient.aog,
        bloodType: consultation.patient.bloodType,
        riskLevel: consultation.patient.riskLevel,
      },
    };

    const systemPrompt =
      "You are a maternal health nursing AI assistant. Given the following maternal assessment data, generate nursing interventions ONLY. Follow the NIC (Nursing Interventions Classification) framework. Do NOT diagnose or prescribe medicine. Do NOT include patient-identifiable data.";

    const userPrompt = `Based on this maternal health assessment data, generate appropriate nursing interventions.

Clinical Data:
- Subjective Symptoms: ${assessmentData.subjectiveSymptoms || "None recorded"}
- Objective Vitals: ${assessmentData.objectiveVitals || "None recorded"}
- Fetal Heart Rate: ${assessmentData.fetalHeartRate || "Not measured"}
- Fundal Height: ${assessmentData.fundalHeight || "Not measured"}
- Allergies: ${assessmentData.allergies || "None reported"}
- Current Medications: ${assessmentData.medications || "None"}
- Physical Exam: ${assessmentData.physicalExam || "None recorded"}
- Lab Results: ${assessmentData.labResults || "None recorded"}
- Notes: ${assessmentData.notes || "None"}
- ICD-10 Diagnosis: ${assessmentData.icd10Diagnosis || "None assigned"}
- NANDA Diagnosis: ${assessmentData.nandaDiagnosis || "None assigned"}
- Gravidity: ${assessmentData.clinicalContext.gravidity}
- Parity: ${assessmentData.clinicalContext.parity}
- Age of Gestation: ${assessmentData.clinicalContext.aog || "Unknown"}
- Blood Type: ${assessmentData.clinicalContext.bloodType || "Unknown"}
- Risk Level: ${assessmentData.clinicalContext.riskLevel}

Respond with valid JSON ONLY (no markdown, no explanation outside JSON) in this exact format:
{
  "interventions": [
    {
      "name": "Intervention name (NIC classification)",
      "description": "Detailed description of the intervention",
      "category": "Category name (e.g., Physiological, Psychosocial, Safety)"
    }
  ],
  "priorityIntervention": "Name of the most critical intervention",
  "rationale": "Brief rationale for the priority intervention",
  "preventionLevel": "primary | secondary | tertiary"
}`;

    // Call z-ai-web-dev-sdk on server side
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      thinking: { type: "disabled" },
    });

    const rawContent = completion.choices[0]?.message?.content;

    if (!rawContent || rawContent.trim().length === 0) {
      return NextResponse.json(
        { error: "AI returned an empty response" },
        { status: 502 }
      );
    }

    // Parse the AI response (handle possible markdown code fences)
    let cleaned = rawContent.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    let aiSuggestions;
    try {
      aiSuggestions = JSON.parse(cleaned);
    } catch {
      // If parsing fails, store the raw content wrapped in a fallback structure
      aiSuggestions = {
        interventions: [],
        priorityIntervention: "",
        rationale: "",
        preventionLevel: "secondary",
        rawResponse: rawContent,
      };
    }

    // Store as JSON string in the consultation
    const aiSuggestionsJson = JSON.stringify(aiSuggestions);

    const updated = await db.consultation.update({
      where: { id },
      data: {
        aiSuggestions: aiSuggestionsJson,
      },
    });

    return NextResponse.json({
      success: true,
      aiSuggestions,
      consultation: {
        id: updated.id,
        stepCompleted: updated.stepCompleted,
      },
    });
  } catch (error) {
    console.error("Error generating AI suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate AI suggestions" },
      { status: 500 }
    );
  }
}
