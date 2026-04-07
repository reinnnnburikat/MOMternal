import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/supabase";
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

    // Fetch consultation with patient clinical data (not identity)
    const consultation = await queryOne(
      `SELECT c.*,
              p.gravidity AS patient_gravidity, p.parity AS patient_parity,
              p.aog AS patient_aog, p.blood_type AS patient_blood_type,
              p.risk_level AS patient_risk_level
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

    // Build clinical assessment payload (NO patient-identifiable data)
    const assessmentData = {
      subjectiveSymptoms: consultation.subjective_symptoms,
      objectiveVitals: consultation.objective_vitals,
      fetalHeartRate: consultation.fetal_heart_rate,
      fundalHeight: consultation.fundal_height,
      allergies: consultation.allergies,
      medications: consultation.medications,
      physicalExam: consultation.physical_exam,
      labResults: consultation.lab_results,
      notes: consultation.notes,
      icd10Diagnosis: consultation.icd10_diagnosis,
      nandaDiagnosis: consultation.nanda_diagnosis,
      clinicalContext: {
        gravidity: consultation.patient_gravidity,
        parity: consultation.patient_parity,
        aog: consultation.patient_aog,
        bloodType: consultation.patient_blood_type,
        riskLevel: consultation.patient_risk_level,
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

    const updated = await queryOne(
      `UPDATE consultation SET ai_suggestions = $1, updated_at = now() WHERE id = $2 RETURNING id, step_completed`,
      [aiSuggestionsJson, id]
    );

    return NextResponse.json({
      success: true,
      aiSuggestions,
      consultation: {
        id: updated!.id,
        stepCompleted: updated!.step_completed,
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
