/**
 * Convert Role B's analysis response into frontend display data.
 *
 * This adapter does not determine fraud or verify evidence.
 */
export function toAnalysisView(result) {
    if (!result || typeof result !== "object") {
        throw new Error("Invalid analysis response");
    }

    const evidence = result.evidence ?? {};
    const findings = result.findings ?? {};

    return {
        scenarioId: result.scenario_id ?? null,

        // Risk assessment
        risk: result.risk ?? "inconclusive",
        riskScore: result.risk_score ?? 0,

        // Evidence availability
        evidenceStatus: result.evidence_status ?? "missing",
        evidenceCompleteness: evidence.completeness ?? 0,
        presentEvidence: evidence.present ?? [],
        missingEvidence: evidence.missing ?? [],
        optionalEvidence: evidence.conditional_present ?? [],

        // Analysis explanation
        summary: result.explanation ?? "",
        assessment: result.risk ?? "inconclusive",

        // Findings and recommendations
        findings: findings.items ?? [],
        recommendation: findings.suggested_action ?? "",

        // Merchant response
        draftResponse: result.draft_response ?? null,

        // Safety controls
        needsReview: result.needs_review ?? true,
        humanApprovalRequired: result.human_approval_required ?? true,
        scoreCaveat: result.score_caveat ?? "",
    };
}