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
 * Enhanced AI Intervention Recommendation System.
 * Sends assessment data to z-ai-web-dev-sdk (server-side only) to generate
 * NIC nursing interventions using comprehensive maternal health domain knowledge.
 * Stores result as JSON string in aiSuggestions.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check for X-Token in incoming request headers (may be injected by gateway)
    const xToken = request.headers.get("x-token");

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
    // If X-Token is available from the gateway, we create a local config override
    let zai;
    if (xToken) {
      // Create SDK with token from gateway by writing a temporary project-level config
      const fs = await import("fs/promises");
      const path = await import("path");
      const os = await import("os");
      const configPath = path.join(process.cwd(), ".z-ai-config");
      const homeConfigPath = path.join(os.homedir(), ".z-ai-config");
      const etcConfigPath = "/etc/.z-ai-config";

      let baseConfig: Record<string, string> = {};
      for (const p of [configPath, homeConfigPath, etcConfigPath]) {
        try {
          const raw = await fs.readFile(p, "utf-8");
          const parsed = JSON.parse(raw);
          if (parsed.baseUrl && parsed.apiKey) {
            baseConfig = parsed;
            break;
          }
        } catch {}
      }

      // Write project-level config with token (highest priority)
      const fullConfig = { ...baseConfig, token: xToken };
      await fs.writeFile(configPath, JSON.stringify(fullConfig, null, 2));
      zai = await ZAI.create();
      // Clean up the project-level config after use
      try { await fs.unlink(configPath); } catch {}
    } else {
      // No X-Token available — try the SDK as-is
      // This may fail if the config doesn't include a token
      zai = await ZAI.create();
    }

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
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
  } catch (error: unknown) {
    console.error("Error generating AI suggestions:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    // Provide specific error info for auth failures
    if (message.includes("401") || message.includes("X-Token") || message.includes("missing")) {
      return NextResponse.json(
        { error: "AI service authentication failed. The AI intervention feature requires a valid service token. Please ensure the AI SDK token is configured in the system.", details: message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate AI suggestions", details: message },
      { status: 500 }
    );
  }
}
