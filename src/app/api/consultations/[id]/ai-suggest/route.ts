import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/supabase";
import {
  MATERNAL_AI_SYSTEM_PROMPT,
  buildUserPrompt,
  type AIResponse,
} from "@/lib/ai-prompts";

/**
 * POST /api/consultations/[id]/ai-suggest
 *
 * AI Intervention Recommendation System.
 * Sends assessment data to the AI API to generate NIC nursing interventions.
 * Uses X-Token from the external gateway (injected into request headers).
 * Stores result as JSON string in aiSuggestions.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get X-Token from the incoming request headers.
    // The external gateway injects this token into all forwarded requests.
    const xToken = request.headers.get("x-token");

    if (!xToken) {
      return NextResponse.json(
        {
          error: "AI service token not available. The AI intervention requires a valid service token which should be provided by the gateway. Please try refreshing the page or contact support if the issue persists.",
          details: "x-token header missing from request",
        },
        { status: 503 }
      );
    }

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

    // Call the AI API directly using fetch (bypassing z-ai-web-dev-sdk)
    // We use the X-Token from the gateway for authentication
    const aiApiUrl = "http://172.25.136.193:8080/v1/chat/completions";

    const completion = await fetch(aiApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer Z.ai",
        "X-Z-AI-From": "Z",
        "X-Token": xToken,
      },
      body: JSON.stringify({
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
      }),
    });

    if (!completion.ok) {
      const errorBody = await completion.text();
      console.error(
        `AI API error: ${completion.status} - ${errorBody}`
      );
      return NextResponse.json(
        {
          error: `AI service returned an error (${completion.status}). Please try again.`,
          details: errorBody,
        },
        { status: 502 }
      );
    }

    const completionData = await completion.json();
    const rawContent = completionData.choices?.[0]?.message?.content;

    if (!rawContent || rawContent.trim().length === 0) {
      return NextResponse.json(
        { error: "AI returned an empty response. Please try again." },
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
  } catch (error: unknown) {
    console.error("Error generating AI suggestions:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to generate AI suggestions. Please try again.", details: message },
      { status: 500 }
    );
  }
}
