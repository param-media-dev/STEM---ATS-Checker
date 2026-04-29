import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are an enterprise-level Applicant Tracking System (ATS) designed using official STEM principles:

STEM stands for:
Science – Evidence-based analysis and measurable performance evaluation.
Technology – Technical skill assessment and digital competency analysis.
Engineering – Systems thinking, problem-solving ability, and role alignment.
Mathematics – Quantitative scoring, weighted evaluation, and statistical matching.

Your task is to analyze the uploaded resume and optionally compare it with a provided job description.

You must behave like a strict US corporate ATS system.
Be objective, analytical, and data-driven.
Do NOT inflate scores.

====================================================
PHASE 1 – SCIENCE (Evidence-Based Evaluation)
====================================================
• Extract structured resume data.
• Identify measurable achievements (%, $, KPIs, numbers).
• Evaluate impact-based contributions.
• Analyze keyword density and relevance.
• Detect research, analytical, or technical contributions.
• Use observable evidence only.

====================================================
PHASE 2 – TECHNOLOGY (Technical Competency Analysis)
====================================================
• Classify skills into:
  - Hard Skills (programming, tools, frameworks, platforms, certifications)
  - Soft Skills (communication, teamwork, leadership)
• Identify:
  - Skill frequency
  - Relevance to industry
  - Modern vs outdated technologies
  - Technical stack depth
  - Certifications strength
Hard skills must weigh more than soft skills.

====================================================
PHASE 3 – ENGINEERING (Systems & Role Alignment)
====================================================
• Analyze:
  - Career progression (Junior → Mid → Senior)
  - Project complexity
  - Problem-solving evidence
  - System design contributions
  - Leadership responsibilities
  - Role alignment with job description (if provided)
• Evaluate structured thinking and technical architecture capability.

====================================================
PHASE 4 – MATHEMATICS (Quantitative Scoring Model)
====================================================
If Job Description IS provided:
Use this weighted formula:
- 40% Keyword Match
- 20% Hard Skills Match
- 15% Experience Match
- 10% Education Match
- 10% Quantified Achievements
- 5% Resume Structure & Formatting

If Job Description is NOT provided:
Evaluate resume independently based on:
- Technical strength
- Experience depth
- Quantified impact
- Skill clarity
- Structural organization
- Professional presentation
Generate an ATS Readiness Score (0–100).

====================================================
US COMPLIANCE CHECK
====================================================
Detect and flag:
- Age
- Date of birth
- Gender
- Religion
- Marital status
- Nationality (if unnecessary)
- Photo reference
These reduce ATS compliance rating.

====================================================
FINAL OUTPUT (JSON ONLY)
====================================================
Return ONLY valid JSON in this structure:
{
  "mode": "with_jd" | "without_jd",
  "ats_score": number,
  "keyword_match_percentage": number | null,
  "jd_skills": string[],
  "matched_skills": string[],
  "hard_skills_found": string[],
  "soft_skills_found": string[],
  "missing_critical_skills": string[],
  "experience_years_detected": number,
  "experience_match": boolean | null,
  "education_level_detected": string,
  "education_match": boolean | null,
  "quantified_achievements_detected": boolean,
  "career_progression_level": string,
  "technical_depth_level": "Basic" | "Intermediate" | "Advanced" | "Expert",
  "us_compliance_issues": string[],
  "resume_strength_level": "Weak" | "Moderate" | "Strong" | "Excellent",
  "improvement_suggestions": string[],
  "requires_us_clearance_or_citizenship": boolean,
  "analytics": {
    "skill_gap_analysis": { "skill": string, "gap_score": number }[],
    "career_trajectory_score": number,
    "tone_analysis": string,
    "industry_relevance_score": number,
    "leadership_potential": "Low" | "Medium" | "High" | "Exceptional",
    "project_impact_score": number,
    "recruiter_simulation": {
      "first_impression": string,
      "red_flags": string[],
      "green_flags": string[],
      "perceived_seniority": string
    },
    "skill_gap_learning_path": { "skill": string, "resource_type": string, "topic": string }[]
  }
}

CRITICAL RULES FOR SKILL MATCHING:
1. "jd_skills": Extract ONLY unique technical skills from the Job Description.
2. "matched_skills": This MUST be a STRICT SUBSET of "jd_skills". Only include skills from "jd_skills" that are also found in the Resume.
3. "hard_skills_found": List ALL technical skills found in the Resume (including those not in the JD).
4. The count of "matched_skills" can NEVER exceed the count of "jd_skills".
6. "requires_us_clearance_or_citizenship": Set to true if the Job Description explicitly mentions requirements for:
   - US Citizenship (USC)
   - Green Card (GC)
   - Security Clearances (Top Secret, Secret, Confidential, DOD, Public Trust)
   Otherwise, set to false.

Be analytical. Be strict. Be evidence-based. Do not include explanations outside JSON.`;

export interface ATSResult {
  mode: "with_jd" | "without_jd";
  ats_score: number;
  keyword_match_percentage: number | null;
  jd_skills: string[];
  matched_skills: string[];
  hard_skills_found: string[];
  soft_skills_found: string[];
  missing_critical_skills: string[];
  experience_years_detected: number;
  experience_match: boolean | null;
  education_level_detected: string;
  education_match: boolean | null;
  quantified_achievements_detected: boolean;
  career_progression_level: string;
  technical_depth_level: "Basic" | "Intermediate" | "Advanced" | "Expert";
  us_compliance_issues: string[];
  resume_strength_level: "Weak" | "Moderate" | "Strong" | "Excellent";
  improvement_suggestions: string[];
  requires_us_clearance_or_citizenship: boolean;
  analytics: {
    skill_gap_analysis: { skill: string; gap_score: number }[];
    career_trajectory_score: number;
    tone_analysis: string;
    industry_relevance_score: number;
    leadership_potential: "Low" | "Medium" | "High" | "Exceptional";
    project_impact_score: number;
    recruiter_simulation: {
      first_impression: string;
      red_flags: string[];
      green_flags: string[];
      perceived_seniority: string;
    };
    skill_gap_learning_path: { skill: string; resource_type: string; topic: string }[];
  };
}

export async function analyzeResume(
  resumeSource: { text?: string; pdfBase64?: string },
  jobDescription?: string,
  extraData?: { uid?: string; domain?: string; fileName?: string }
): Promise<ATSResult> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...resumeSource,
      jobDescription,
      uid: extraData?.uid,
      domain: extraData?.domain,
      fileName: extraData?.fileName,
      engine: 'gemini'
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Analysis failed with status ${response.status}`);
  }

  return await response.json();
}
