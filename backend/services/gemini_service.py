import os
import json
import google.generativeai as genai
from data.violations_db import get_risk_codes, get_violation_by_code, NYC_VIOLATIONS

genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))


async def generate_violation_report(
    cuisine_type: str,
    borough: str,
    seating_capacity: int,
    equipment: list,
    last_grade: str,
) -> list:
    """
    Use Gemini to generate a personalized violation risk report
    based on the restaurant's profile and NYC DOH data.
    """
    # Get top risk codes for this cuisine from our database
    risk_codes = get_risk_codes(cuisine_type)
    top_violations = []
    for code in risk_codes:
        v = get_violation_by_code(code)
        if v:
            top_violations.append(f"Code {v['code']}: {v['title']} (Severity: {v['severity']}, Max points: {v['max_points']})")

    violations_context = "\n".join(top_violations)

    equipment_str = ", ".join(equipment) if equipment else "standard kitchen equipment"

    prompt = f"""You are a NYC Department of Health restaurant inspector with 20 years of experience.

A restaurant has the following profile:
- Cuisine type: {cuisine_type}
- Borough: {borough}
- Seating capacity: {seating_capacity} seats
- Equipment: {equipment_str}
- Last DOH grade: {last_grade if last_grade else 'Unknown/First inspection'}

Based on NYC DOH public data, the top violation risks for {cuisine_type} restaurants in {borough} are:
{violations_context}

Generate exactly 5 personalized violation risks for this specific restaurant.
Consider their cuisine type, equipment, and seating capacity in your analysis.

Return ONLY valid JSON (no markdown, no backticks, no preamble):
{{
  "risks": [
    {{
      "rank": 1,
      "violation_code": "04C",
      "title": "Short title (max 8 words)",
      "description": "Clear description of the risk specific to this restaurant type (2 sentences max)",
      "severity": "critical",
      "estimated_fine": "$200 - $2,000",
      "probability": "high",
      "fix_steps": [
        "Specific actionable step 1",
        "Specific actionable step 2",
        "Specific actionable step 3"
      ],
      "check_frequency": "daily"
    }}
  ]
}}

Rules:
- severity must be "critical" or "general"
- probability must be "high", "medium", or "low"
- check_frequency must be "daily", "weekly", or "monthly"
- fix_steps must have exactly 3 specific, actionable steps
- Make it specific to {cuisine_type} cuisine and {borough} context
- Rank 1 = highest risk"""

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        text = response.text.strip()

        # Strip any markdown code blocks if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        if text.endswith("```"):
            text = text[:-3].strip()

        data = json.loads(text)
        return data.get("risks", [])

    except json.JSONDecodeError:
        # Fallback: return pre-computed risks from our database
        return _generate_fallback_report(cuisine_type, risk_codes)
    except Exception as e:
        print(f"Gemini error: {e}")
        return _generate_fallback_report(cuisine_type, risk_codes)


def _generate_fallback_report(cuisine_type: str, risk_codes: list) -> list:
    """
    Fallback violation report if Gemini is unavailable.
    Uses pre-computed data from the violations database.
    """
    risks = []
    for i, code in enumerate(risk_codes[:5]):
        v = get_violation_by_code(code)
        if not v:
            continue
        risks.append({
            "rank": i + 1,
            "violation_code": v["code"],
            "title": v["title"],
            "description": v["description"],
            "severity": v["severity"],
            "estimated_fine": "$200 - $2,000" if v["severity"] == "critical" else "$50 - $500",
            "probability": "high" if i < 2 else "medium",
            "fix_steps": v.get("daily_checks", [v.get("fix", "Review and correct.")])[:3],
            "check_frequency": "daily",
        })
    return risks
