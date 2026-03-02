import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export interface AuditRequest {
  handleUrl: string;
  additionalContext?: string;
}

export async function generateAuditReportStream(data: AuditRequest, onChunk: (text: string) => void) {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  
  const prompt = `
    Role: Elite Social Media Auditor and Strategist specializing in Employer Branding and Recruitment Marketing.
    User Context: Works in Employer Branding at BFL, 8 years experience in content marketing.
    
    Task: Analyze the social media handle (Instagram, LinkedIn, or Facebook) from this URL: ${data.handleUrl}
    
    Phase 1: Multi-Platform Analysis
    - If LinkedIn: Focus on professional authority, employee advocacy, and BFL leadership presence.
    - If Instagram: Focus on visual storytelling, Reels "virality" hooks, and office culture.
    - If Facebook: Focus on community building and regional recruitment reach.
    
    Phase 2: The "Why Not Viral?" Audit
    - Analyze hooks (first 1.5s), retention, and platform algorithm fit for 2026 trends.
    
    Phase 3: Competitor Benchmarking
    - Identify 3 direct competitors in the Fintech/Tech industry (e.g., in the context of BFL).
    - List their content pillars and winning formats.
    
    Phase 4: Output Structure (5-Slide PPT/PDF Format)
    Generate the analysis in a clear, slide-by-slide text format using these specific headers:
    
    # SLIDE_1: EXECUTIVE_SUMMARY
    - Health Score (Based on estimated ER % calculations).
    - Current Performance Overview.
    
    # SLIDE_2: VIRALITY_GAP
    - Direct answer to why views are capped.
    - Hook & Retention analysis.
    
    # SLIDE_3: COMPETITOR_LANDSCAPE
    - Comparison table of 3 rivals in Fintech/Tech.
    - Their winning hooks and formats.
    
    # SLIDE_4: 7_DAY_CAMPAIGN
    - Thematic plan for the upcoming week.
    - Synchronized strategy (Employee Advocacy, Leadership Authority, Recruitment Marketing).
    
    # SLIDE_5: ACTIONABLE_ROADMAP
    - 3 immediate changes to implement for growth.
    - Top 10 Recruitment Keywords map for SEO.
    
    # SLIDE_6: PERSONA_SHIFT
    - Audience Persona Shift: How to move from "Internal Pride" to "External Acquisition".
    - "Before & After" hook comparisons (Corporate vs. Human).
    
    Additional Context from User: ${data.additionalContext || 'None'}
    
    Ensure the tone is professional, authoritative, and data-driven.
  `;

  const response = await ai.models.generateContentStream({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      systemInstruction: `You are an Elite Social Media Auditor and Strategist specializing in Employer Branding and Recruitment Marketing. 
      Your goal is to provide high-impact, data-driven strategic intelligence. 
      Avoid generic advice. Focus on "External Acquisition" over "Internal Pride".
      Always include:
      1. A specific "Strategic Health Score" (e.g., 42/100) and "Engagement Rate" (e.g., 0.85% vs 1.8% industry benchmark).
      2. An "Audience Persona Shift" analysis.
      3. A "Benchmark Gap" (one specific thing to steal from competitors).
      4. A "Top 10 Recruitment Keywords" map for SEO.
      5. "Before & After" hook comparisons (Corporate vs. Human).`,
      tools: [{ googleSearch: {} }],
    },
  });

  let fullText = "";
  for await (const chunk of response) {
    const text = chunk.text;
    if (text) {
      fullText += text;
      onChunk(fullText);
    }
  }

  return fullText;
}
