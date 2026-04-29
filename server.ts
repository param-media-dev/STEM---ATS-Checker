import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import crypto from "crypto-js";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import path from "path";
import admin from "firebase-admin";

dotenv.config();

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;
try {
  admin.initializeApp({
    projectId: "gen-lang-client-0103663216"
  });
  db = admin.firestore();
} catch (err) {
  console.error("Firebase admin init failed:", err);
}

const app = express();
const PORT = 3000;

// Shared System Instruction
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

// Multer for PDF uploads
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json({ limit: '50mb' }));

// External API Config
const EXTERNAL_API_BASE = "https://test-wp.param.club/wp-json/file-api/v1";

// Helper to save analysis to External API
async function saveToExternalApi(data: any) {
  try {
    const response = await fetch(`${EXTERNAL_API_BASE}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: data.fileName || `Analysis_${Date.now()}`,
        content: JSON.stringify({
          resumeText: data.resumeText,
          jobDescription: data.jobDescription,
          result: data.result,
          domain: data.domain,
          uid: data.uid
        }),
        status: 'publish' // Assuming WP format or adjusting to match your API expectations
      })
    });
    
    if (!response.ok) {
      console.error("External API upload failed:", await response.text());
    } else {
      console.log("Successfully saved to external API");
    }
  } catch (err) {
    console.error("Failed to call external API:", err);
  }
}

// Admin API to delete history from External Source
app.delete("/api/admin/history/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${EXTERNAL_API_BASE}/delete/${id}`, {
      method: "DELETE"
    });
    if (!response.ok) throw new Error("Failed to delete from external API");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin API to fetch history from External Source
app.get("/api/admin/history", async (req, res) => {
  try {
    const response = await fetch(`${EXTERNAL_API_BASE}/files`);
    if (!response.ok) throw new Error("Failed to fetch from external API");
    const data = await response.json();
    
    // Map external data format to dashboard format if necessary
    const history = (Array.isArray(data) ? data : []).map((item: any) => {
      let content = {};
      try {
        content = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
      } catch (e) {}
      
      return {
        id: item.id,
        createdAt: item.date || new Date().toISOString(),
        fileName: item.title?.rendered || item.title || "Unknown",
        ...(typeof content === 'object' ? content : {})
      };
    });
    
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API Routes
app.post("/api/analyze", upload.single("resume"), async (req, res) => {
  try {
    const { text, pdfBase64, jobDescription, engine = "gemini", userApiKey, uid, domain, fileName } = req.body;
    let resumeContent = "";
    let resumeBuffer: Buffer | null = null;

    if (req.file) {
      resumeBuffer = req.file.buffer;
    } else if (pdfBase64) {
      resumeBuffer = Buffer.from(pdfBase64, 'base64');
    }

    if (resumeBuffer) {
      const pdfParser = typeof pdf === 'function' ? pdf : pdf.default;
      const pdfData = await pdfParser(resumeBuffer);
      resumeContent = pdfData.text;
    } else if (text) {
      resumeContent = text;
    } else {
      return res.status(400).json({ error: "No resume content provided. Please upload a PDF." });
    }

    let result: any = null;

    if (engine === "openai") {
      const apiKey = userApiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");

      const openai = new OpenAI({ apiKey });
      const prompt = `
        ${SYSTEM_INSTRUCTION}
        
        RESUME CONTENT:
        ${resumeContent}
        
        ${jobDescription ? `JOB DESCRIPTION:\n${jobDescription}` : "NO JOB DESCRIPTION PROVIDED. Evaluate resume independently."}
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      });

      const resultText = completion.choices[0].message.content;
      if (!resultText) throw new Error("No response from OpenAI");
      result = JSON.parse(resultText);
      result.engine = "openai";
    } else if (engine === "claude") {
      const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");

      const anthropic = new Anthropic({ apiKey });
      const prompt = `
        ${SYSTEM_INSTRUCTION}
        
        RESUME CONTENT:
        ${resumeContent}
        
        ${jobDescription ? `JOB DESCRIPTION:\n${jobDescription}` : "NO JOB DESCRIPTION PROVIDED. Evaluate resume independently."}
        
        IMPORTANT: Return ONLY valid JSON.
      `;

      const msg = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        system: SYSTEM_INSTRUCTION,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      });

      const resultText = msg.content[0].type === 'text' ? msg.content[0].text : '';
      if (!resultText) throw new Error("No response from Claude");
      
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      const cleanedJson = jsonMatch ? jsonMatch[0] : resultText;
      
      result = JSON.parse(cleanedJson);
      result.engine = "claude";
    } else {
      // Gemini Path
      const apiKey = userApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");

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
      result = JSON.parse(resultText);
      result.engine = "gemini";
    }

    // Save to External API automatically as "One API" call
    if (uid) {
      await saveToExternalApi({
        uid,
        domain,
        resumeText: resumeContent,
        jobDescription: jobDescription || "",
        fileName: fileName || "",
        result
      });
    }

    result.resumeText = resumeContent;
    result.jobDescription = jobDescription || "";
    return res.json(result);
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
