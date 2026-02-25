import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import crypto from "crypto-js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();
const PORT = 3000;

// Gemini Setup
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
    "project_impact_score": number
  }
}

Be analytical. Be strict. Be evidence-based. Do not include explanations outside JSON.`;

// Multer for PDF uploads
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json({ limit: '50mb' }));

// API Routes
app.post("/api/analyze", upload.single("resume"), async (req, res) => {
  try {
    const { text, jobDescription } = req.body;
    let resumeContent = "";
    let resumeBuffer: Buffer | null = null;

    if (req.file) {
      resumeBuffer = req.file.buffer;
      const pdfParser = typeof pdf === 'function' ? pdf : pdf.default;
      const pdfData = await pdfParser(resumeBuffer);
      resumeContent = pdfData.text;
    } else if (text) {
      resumeContent = text;
    } else {
      return res.status(400).json({ error: "No resume content provided" });
    }

    // Hash the resume content to ensure uniqueness
    // We use the raw text for hashing to be consistent
    const hash = crypto.SHA256(resumeContent).toString();

    // Call Gemini
    const userApiKey = req.body.userApiKey;
    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set. Please set it in the Secrets panel.");
    
    if (apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("Invalid API Key: You are still using the placeholder 'MY_GEMINI_API_KEY'. Please update it in the Secrets panel.");
    }

    console.log(`Analyzing resume... (Using API Key starting with: ${apiKey.substring(0, 4)}...)`);

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";

    const parts: any[] = [];
    if (resumeBuffer) {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: resumeBuffer.toString("base64"),
        },
      });
      parts.push({
        text: "Analyze the attached resume PDF based on the STEM principles provided in your system instructions.",
      });
    } else {
      parts.push({ text: `RESUME CONTENT:\n${resumeContent}` });
    }

    if (jobDescription) {
      parts.push({ text: `JOB DESCRIPTION:\n${jobDescription}` });
    } else {
      parts.push({ text: "NO JOB DESCRIPTION PROVIDED. Evaluate resume independently." });
    }

    const aiResponse = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0,
      },
    });

    const resultText = aiResponse.text;
    if (!resultText) throw new Error("No response from AI");

    const result = JSON.parse(resultText);

    res.json(result);
  } catch (err: any) {
    console.error("Analysis error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
