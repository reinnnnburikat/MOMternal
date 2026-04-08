import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/supabase";
import {
  MATERNAL_AI_SYSTEM_PROMPT,
  buildUserPrompt,
  type AIResponse,
} from "@/lib/ai-prompts";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const consultation = await queryOne(
      `SELECT c.*,
              p.id AS patient_db_id,
              p.gravidity AS patient_gravidity, p.parity AS patient_parity,
              p.aog AS patient_aog, p.blood_type AS patient_blood_type,
              p.risk_level AS patient_risk_level
       FROM consultation c
       JOIN patient p ON c.patient_id = p.id
       WHERE c.id = $1`,
      [id]
    );

    if (!consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    const assessmentData = {
      subjectiveSymptoms: consultation.subjective_symptoms as string | null | undefined,
      objectiveVitals: consultation.objective_vitals as string | null | undefined,
      fetalHeartRate: consultation.fetal_heart_rate as string | number | null | undefined,
      fundalHeight: consultation.fundal_height as string | null | undefined,
      allergies: consultation.allergies as string | null | undefined,
      medications: consultation.medications as string | null | undefined,
      physicalExam: consultation.physical_exam as string | null | undefined,
      labResults: consultation.lab_results as string | null | undefined,
      notes: consultation.notes as string | null | undefined,
      icd10Diagnosis: consultation.icd10_diagnosis as string | null | undefined,
      nandaDiagnosis: consultation.nanda_diagnosis as string | null | undefined,
      clinicalContext: {
        gravidity: consultation.patient_gravidity as number | null | undefined,
        parity: consultation.patient_parity as number | null | undefined,
        aog: consultation.patient_aog as string | null | undefined,
        bloodType: consultation.patient_blood_type as string | null | undefined,
        riskLevel: consultation.patient_risk_level as string | null | undefined,
      },
    };

    const userPrompt = buildUserPrompt(assessmentData);
    const zai = await ZAI.create();

    // Override with gateway-provided X-Token if available (it's the real service token)
    const gatewayToken = request.headers.get("X-Token");
    if (gatewayToken) {
      (zai as unknown as { config: Record<string, string> }).config.token = gatewayToken;
    }

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: MATERNAL_AI_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const rawContent = completion.choices?.[0]?.message?.content;

    if (!rawContent || rawContent.trim().length === 0) {
      return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });
    }

    let cleaned = rawContent.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
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

    const aiSuggestionsJson = JSON.stringify(aiSuggestions);
    const updated = await queryOne(
      `UPDATE consultation SET ai_suggestions = $1, updated_at = now() WHERE id = $2 RETURNING id, step_completed`,
      [aiSuggestionsJson, id]
    );

    return NextResponse.json({
      success: true,
      aiSuggestions,
      consultation: { id: updated!.id, stepCompleted: updated!.step_completed },
    });
  } catch (error: unknown) {
    console.error("AI suggest error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate AI suggestions. Please try again.", details: message },
      { status: 500 }
    );
  }
}
