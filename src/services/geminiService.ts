import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

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
  jobDescription?: string
): Promise<ATSResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const genAI = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  const parts: any[] = [];

  if (resumeSource.pdfBase64) {
    parts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: resumeSource.pdfBase64,
      },
    });
    parts.push({
      text: "Analyze the attached resume PDF based on the STEM principles provided in your system instructions.",
    });
  } else if (resumeSource.text) {
    parts.push({
      text: `RESUME CONTENT:\n${resumeSource.text}`,
    });
  } else {
    throw new Error("No resume content provided");
  }

  if (jobDescription) {
    parts.push({
      text: `JOB DESCRIPTION:\n${jobDescription}`,
    });
  } else {
    parts.push({
      text: "NO JOB DESCRIPTION PROVIDED. Evaluate resume independently.",
    });
  }

  const response = await genAI.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      temperature: 0,
      seed: 42,
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  return JSON.parse(text) as ATSResult;
}
