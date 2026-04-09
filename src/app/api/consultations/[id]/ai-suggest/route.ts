import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/supabase";
import {
  MATERNAL_AI_SYSTEM_PROMPT,
  buildUserPrompt,
  type AIResponse,
} from "@/lib/ai-prompts";
import { generateFallbackSuggestions } from "@/lib/ai-fallback";

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
              p.risk_level AS patient_risk_level,
              p.barangay AS patient_barangay
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
        gravidity: consultation.gravidity as number | null | undefined,
        parity: consultation.parity as number | null | undefined,
        aog: consultation.aog as string | null | undefined,
        bloodType: consultation.blood_type as string | null | undefined,
        riskLevel: consultation.patient_risk_level as string | null | undefined,
        barangay: consultation.patient_barangay as string | null | undefined,
      },
    };

    let aiSuggestions: AIResponse;
    let usedFallback = false;

    // Try AI service first using dynamic import (requires X-Token from gateway)
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();

      // Read X-Token from incoming request headers (injected by outer gateway)
      const gatewayToken = request.headers.get("x-token");
      if (gatewayToken) {
        (zai as any).config.token = gatewayToken;
      }

      const userPrompt = buildUserPrompt(assessmentData);

      const completion = await zai.chat.completions.create({
        messages: [
          { role: "system", content: MATERNAL_AI_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        thinking: { type: "disabled" },
      });

      const rawContent = completion.choices?.[0]?.message?.content;

      if (!rawContent || rawContent.trim().length === 0) {
        throw new Error("Empty AI response");
      }

      let cleaned = rawContent.trim();
      if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
      else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
      if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.trim();

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
    } catch (aiError: unknown) {
      // AI service unavailable - use intelligent evidence-based fallback
      console.warn("AI service unavailable, using evidence-based fallback:", aiError instanceof Error ? aiError.message : "Unknown error");
      aiSuggestions = generateFallbackSuggestions(assessmentData);
      usedFallback = true;
    }

    const aiSuggestionsJson = JSON.stringify(aiSuggestions);
    const updated = await queryOne(
      `UPDATE consultation SET ai_suggestions = $1, updated_at = now() WHERE id = $2 RETURNING id, step_completed, patient_id, nurse_id`,
      [aiSuggestionsJson, id]
    );

    // Fire-and-forget audit log for AI suggestion generation
    if (updated?.patient_id && updated?.nurse_id) {
      query(
        `INSERT INTO audit_log (nurse_id, action, entity, entity_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [updated.nurse_id, "ai_suggest", "consultation", id, JSON.stringify({ usedFallback, riskLevel: aiSuggestions.riskClassification })]
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      aiSuggestions,
      usedFallback,
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
