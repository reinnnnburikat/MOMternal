import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/supabase";
import ZAI from "z-ai-web-dev-sdk";
import {
  MATERNAL_AI_SYSTEM_PROMPT,
  buildUserPrompt,
  type AIResponse,
} from "@/lib/ai-prompts";

/**
 * POST /api/consultations/[id]/ai-suggest
 *
 * Enhanced AI Intervention Recommendation System (GOD MODE).
 * Sends assessment data to z-ai-web-dev-sdk (server-side only) to generate
 * NIC nursing interventions using comprehensive maternal health domain knowledge.
 * Stores result as JSON string in aiSuggestions.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch consultation with patient clinical data (NOT identity data)
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

    // Build clinical assessment payload (NO patient-identifiable data — DPA compliant)
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

    const userPrompt = buildUserPrompt(assessmentData);

    // Call z-ai-web-dev-sdk on server side
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content: MATERNAL_AI_SYSTEM_PROMPT,
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

    let aiSuggestions: AIResponse;
    try {
      aiSuggestions = JSON.parse(cleaned) as AIResponse;
    } catch {
      aiSuggestions = {
        interventions: [],
        priorityIntervention: "",
        priorityCode: 0,
        rationale: "",
        preventionLevel: "secondary",
        riskIndicators: [],
        nursingConsiderations: [],
        referralNeeded: false,
        referralReason: "",
        followUpSchedule: "",
        rawResponse: rawContent,
      } as unknown as AIResponse;
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
