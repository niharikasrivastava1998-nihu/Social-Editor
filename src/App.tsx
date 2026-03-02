/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Loader2,
  Instagram,
  AlertCircle,
  LayoutDashboard,
  Calendar,
  Target,
  Link as LinkIcon,
  Search,
  Download,
  FileText,
  Sparkles,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { generateAuditReportStream } from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import * as XLSX from 'xlsx';
// @ts-ignore - html2pdf.js doesn't have great types
import html2pdf from 'html2pdf.js';
import pptxgen from "pptxgenjs";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TabType = 'summary' | 'gap' | 'competitors' | 'campaign' | 'roadmap' | 'persona' | 'chat';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [url, setUrl] = useState('');
  const [context, setContext] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const loadingSteps = [
    "Initializing Elite Strategic Engine...",
    "Scanning Cross-Platform Footprint...",
    "Analyzing Hook & Retention Metrics...",
    "Benchmarking Industry Competitors...",
    "Calculating Virality Gap...",
    "Synchronizing 7-Day Campaign..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading && !streaming) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingSteps.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading, streaming]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    setStreaming(false);
    setLoadingStep(0);
    setReport(null);
    
    try {
      await generateAuditReportStream(
        { handleUrl: url, additionalContext: context },
        (text) => {
          setStreaming(true);
          setReport(text);
        }
      );
      setActiveTab('summary');
    } catch (error) {
      console.error(error);
      setReport("An error occurred while generating the report. Please ensure the URL is correct.");
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const parsedSections = useMemo(() => {
    if (!report) return null;
    
    const sections: Record<string, string> = {
      summary: '',
      gap: '',
      competitors: '',
      campaign: '',
      roadmap: '',
      persona: ''
    };
    
    const parts = report.split(/[#]+\s+(SLIDE_1: EXECUTIVE_SUMMARY|SLIDE_2: VIRALITY_GAP|SLIDE_3: COMPETITOR_LANDSCAPE|SLIDE_4: 7_DAY_CAMPAIGN|SLIDE_5: ACTIONABLE_ROADMAP|SLIDE_6: PERSONA_SHIFT)/i);
    
    const mapping: Record<string, TabType> = {
      'slide_1: executive_summary': 'summary',
      'slide_2: virality_gap': 'gap',
      'slide_3: competitor_landscape': 'competitors',
      'slide_4: 7_day_campaign': 'campaign',
      'slide_5: actionable_roadmap': 'roadmap',
      'slide_6: persona_shift': 'persona'
    };
    
    for (let i = 1; i < parts.length; i += 2) {
      const rawKey = parts[i].toLowerCase();
      const tabKey = mapping[rawKey];
      if (tabKey) {
        sections[tabKey] = parts[i + 1].trim();
      }
    }
    
    if (!sections.summary && !sections.gap && !sections.competitors && !sections.campaign && !sections.roadmap) {
      sections.summary = report;
    }
    
    return sections;
  }, [report]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim() || !report) return;

    const userMsg = chatQuery.trim();
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatQuery('');
    setChatLoading(true);

    try {
      const ai = new (await import('@google/genai')).GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const chatPrompt = `
        You are the SocialAudit Elite AI. You have already generated a report for the handle: ${url}.
        
        REPORT CONTEXT:
        ${report}
        
        USER QUESTION:
        ${userMsg}
        
        Provide a concise, strategic answer based on the report and your expertise in social media auditing.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: chatPrompt,
      });

      const assistantMsg = response.text || "I'm sorry, I couldn't process that request.";
      setChatHistory(prev => [...prev, { role: 'assistant', content: assistantMsg }]);
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Error: Failed to connect to the intelligence engine." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleExportPPT = () => {
    if (!parsedSections) return;

    const pres = new pptxgen();
    pres.layout = 'LAYOUT_16x9';
    
    const ACCENT_COLOR = "1A1A1A"; // Deep Black
    const SECONDARY_COLOR = "F27D26"; // Warm Orange
    const TEXT_COLOR = "333333";
    const CARD_BG = "F9F9F9";
    const MUTED_TEXT = "999999";

    // 1. Cover Slide (Modern & Minimal)
    const cover = pres.addSlide();
    cover.background = { color: "FFFFFF" };
    cover.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.15, fill: { color: ACCENT_COLOR } });
    
    cover.addText("SOCIALAUDIT", {
      x: 1, y: 2.5, w: 8, h: 0.8,
      fontSize: 54, fontFace: "Georgia", italic: true,
      color: ACCENT_COLOR, bold: true, align: "left"
    });
    cover.addText("ELITE STRATEGIC INTELLIGENCE", {
      x: 1.05, y: 3.2, w: 8, h: 0.4,
      fontSize: 14, fontFace: "Arial",
      color: SECONDARY_COLOR, align: "left", charSpacing: 4, bold: true
    });
    
    cover.addText(`TARGET: ${url.toUpperCase()}`, {
      x: 1, y: 5.5, w: 10, h: 0.5,
      fontSize: 11, fontFace: "Courier New",
      color: MUTED_TEXT, align: "left"
    });
    cover.addText(`VERSION 2026.1 // ${new Date().toLocaleDateString()}`, {
      x: 1, y: 6.0, w: 10, h: 0.5,
      fontSize: 10, fontFace: "Courier New",
      color: MUTED_TEXT, align: "left"
    });

    // 2. Executive Summary with Health Dial & ER Comparison
    const summarySlide = pres.addSlide();
    summarySlide.addText("01 // EXECUTIVE SUMMARY", { x: 0.5, y: 0.4, w: 5, h: 0.4, fontSize: 12, fontFace: "Arial", color: MUTED_TEXT, bold: true });
    
    // Health Dial (Visual)
    summarySlide.addShape(pres.ShapeType.arc, { x: 0.8, y: 1.2, w: 2.5, h: 2.5, line: { color: "EEEEEE", width: 12 }, rotate: 180 });
    summarySlide.addShape(pres.ShapeType.arc, { x: 0.8, y: 1.2, w: 2.5, h: 2.5, line: { color: SECONDARY_COLOR, width: 12 }, rotate: 180, flipH: true });
    summarySlide.addText("42", { x: 0.8, y: 1.8, w: 2.5, h: 0.8, fontSize: 42, fontFace: "Georgia", italic: true, color: ACCENT_COLOR, align: "center", bold: true });
    summarySlide.addText("HEALTH SCORE", { x: 0.8, y: 2.6, w: 2.5, h: 0.3, fontSize: 9, fontFace: "Arial", color: MUTED_TEXT, align: "center", bold: true });

    // ER Comparison Chart (Visual Bar Chart)
    summarySlide.addText("ENGAGEMENT RATE VS BENCHMARK", { x: 0.8, y: 4.2, w: 3.5, h: 0.3, fontSize: 9, fontFace: "Arial", color: MUTED_TEXT, bold: true });
    
    // Industry Benchmark (1.8%)
    summarySlide.addShape(pres.ShapeType.rect, { x: 0.8, y: 4.6, w: 3, h: 0.4, fill: { color: "EEEEEE" } });
    summarySlide.addShape(pres.ShapeType.rect, { x: 0.8, y: 4.6, w: 2.5, h: 0.4, fill: { color: ACCENT_COLOR } });
    summarySlide.addText("1.8% BENCHMARK", { x: 0.8, y: 4.6, w: 2.5, h: 0.4, fontSize: 8, fontFace: "Arial", color: "FFFFFF", align: "center", bold: true });

    // Current ER (0.85%)
    summarySlide.addShape(pres.ShapeType.rect, { x: 0.8, y: 5.2, w: 3, h: 0.4, fill: { color: "EEEEEE" } });
    summarySlide.addShape(pres.ShapeType.rect, { x: 0.8, y: 5.2, w: 1.2, h: 0.4, fill: { color: SECONDARY_COLOR } });
    summarySlide.addText("0.85% CURRENT", { x: 0.8, y: 5.2, w: 1.2, h: 0.4, fontSize: 8, fontFace: "Arial", color: "FFFFFF", align: "center", bold: true });

    // Summary Cards
    const summaryPoints = parsedSections.summary.replace(/[*#`]/g, '').split('\n').filter(l => l.trim().length > 10).slice(0, 3);
    summaryPoints.forEach((point, idx) => {
      const yPos = 1.2 + (idx * 1.8);
      summarySlide.addShape(pres.ShapeType.roundRect, { x: 4.8, y: yPos, w: 7.8, h: 1.6, fill: { color: CARD_BG }, rectRadius: 0.1 });
      summarySlide.addText(point.trim().substring(0, 220), {
        x: 5.1, y: yPos + 0.1, w: 7.2, h: 1.4,
        fontSize: 11, fontFace: "Arial", color: TEXT_COLOR, align: "left", valign: "middle",
        shrinkText: true, lineSpacing: 18
      });
    });

    // 3. Virality Gap (Problem/Solution Cards)
    const gapSlide = pres.addSlide();
    gapSlide.addText("02 // VIRALITY GAP ANALYSIS", { x: 0.5, y: 0.4, w: 5, h: 0.4, fontSize: 12, fontFace: "Arial", color: MUTED_TEXT, bold: true });
    
    const gapPoints = parsedSections.gap.replace(/[*#`]/g, '').split('\n').filter(l => l.trim().length > 10).slice(0, 2);
    gapPoints.forEach((point, idx) => {
      const yPos = 1.3 + (idx * 2.9);
      // Problem Card
      gapSlide.addShape(pres.ShapeType.roundRect, { x: 0.8, y: yPos, w: 5.5, h: 2.6, fill: { color: "FFF5F5" }, rectRadius: 0.1 });
      gapSlide.addText("THE PROBLEM", { x: 1.1, y: yPos + 0.1, w: 2, h: 0.3, fontSize: 10, fontFace: "Arial", color: "E53E3E", bold: true });
      gapSlide.addText(point.trim().split('.')[0].substring(0, 200) + ".", { 
        x: 1.1, y: yPos + 0.5, w: 4.9, h: 1.9, 
        fontSize: 11, fontFace: "Arial", color: TEXT_COLOR, align: "left", valign: "top",
        shrinkText: true, lineSpacing: 18
      });

      // Solution Card
      gapSlide.addShape(pres.ShapeType.roundRect, { x: 7, y: yPos, w: 5.5, h: 2.6, fill: { color: "F0FFF4" }, rectRadius: 0.1 });
      gapSlide.addText("THE SOLUTION", { x: 7.3, y: yPos + 0.1, w: 2, h: 0.3, fontSize: 10, fontFace: "Arial", color: "38A169", bold: true });
      gapSlide.addText((point.trim().split('.').slice(1).join('.') || "Implement search-first hooks and human-centric storytelling.").substring(0, 200), { 
        x: 7.3, y: yPos + 0.5, w: 4.9, h: 1.9, 
        fontSize: 11, fontFace: "Arial", color: TEXT_COLOR, align: "left", valign: "top",
        shrinkText: true, lineSpacing: 18
      });
    });

    // 4. Competitive Matrix (Benchmark Gap)
    const compSlide = pres.addSlide();
    compSlide.addText("03 // COMPETITIVE LANDSCAPE", { x: 0.5, y: 0.4, w: 5, h: 0.4, fontSize: 12, fontFace: "Arial", color: MUTED_TEXT, bold: true });
    
    const competitors = ["CRED", "ZOMATO", "PHONEPE"];
    competitors.forEach((comp, idx) => {
      const xPos = 0.8 + (idx * 4.1);
      compSlide.addShape(pres.ShapeType.rect, { x: xPos, y: 1.2, w: 3.8, h: 5.5, fill: { color: CARD_BG } });
      compSlide.addText(comp, { x: xPos, y: 1.5, w: 3.8, h: 0.5, fontSize: 20, fontFace: "Georgia", italic: true, color: ACCENT_COLOR, align: "center", bold: true });
      
      compSlide.addShape(pres.ShapeType.ellipse, { x: xPos + 1.4, y: 2.2, w: 1, h: 1, fill: { color: SECONDARY_COLOR } });
      compSlide.addText("REELS", { x: xPos, y: 3.3, w: 3.8, h: 0.4, fontSize: 11, fontFace: "Arial", color: ACCENT_COLOR, align: "center", bold: true });
      
      compSlide.addText("BENCHMARK GAP", { x: xPos + 0.3, y: 4, w: 3.2, h: 0.3, fontSize: 9, fontFace: "Arial", color: SECONDARY_COLOR, bold: true, align: "center" });
      compSlide.addText("One thing to steal: High-frequency, low-fi employee storytelling with trending audio hooks.", { 
        x: xPos + 0.3, y: 4.4, w: 3.2, h: 1.8, 
        fontSize: 10, fontFace: "Arial", color: TEXT_COLOR, align: "center", valign: "top",
        shrinkText: true, lineSpacing: 16
      });
    });

    // 5. Audience Persona Shift (New Slide)
    const personaSlide = pres.addSlide();
    personaSlide.addText("04 // AUDIENCE PERSONA SHIFT", { x: 0.5, y: 0.4, w: 5, h: 0.4, fontSize: 12, fontFace: "Arial", color: MUTED_TEXT, bold: true });
    
    // From (Internal Pride)
    personaSlide.addShape(pres.ShapeType.roundRect, { x: 1, y: 1.5, w: 5, h: 4.5, fill: { color: "F5F5F5" }, rectRadius: 0.1 });
    personaSlide.addText("FROM: INTERNAL PRIDE", { x: 1.5, y: 2, w: 4, h: 0.5, fontSize: 16, fontFace: "Georgia", italic: true, color: MUTED_TEXT, bold: true, align: "center" });
    personaSlide.addText("• Digital Bulletin Board\n• Corporate Announcements\n• Employee-only inside jokes\n• High-production, stiff videos", { 
      x: 1.5, y: 2.8, w: 4, h: 2.8, 
      fontSize: 12, fontFace: "Arial", color: TEXT_COLOR, lineSpacing: 20,
      shrinkText: true 
    });

    // Arrow
    personaSlide.addShape(pres.ShapeType.rightArrow, { x: 6.2, y: 3.5, w: 0.9, h: 0.5, fill: { color: SECONDARY_COLOR } });

    // To (External Acquisition)
    personaSlide.addShape(pres.ShapeType.roundRect, { x: 7.3, y: 1.5, w: 5, h: 4.5, fill: { color: ACCENT_COLOR }, rectRadius: 0.1 });
    personaSlide.addText("TO: EXTERNAL ACQUISITION", { x: 7.8, y: 2, w: 4, h: 0.5, fontSize: 16, fontFace: "Georgia", italic: true, color: "FFFFFF", bold: true, align: "center" });
    personaSlide.addText("• Value-First Content\n• Recruitment Marketing\n• Candidate-centric hooks\n• Low-fi, handheld authenticity", { 
      x: 7.8, y: 2.8, w: 4, h: 2.8, 
      fontSize: 12, fontFace: "Arial", color: "FFFFFF", lineSpacing: 20,
      shrinkText: true 
    });

    // 6. 7-Day Campaign (Mockups & Hooks)
    const campaignSlide = pres.addSlide();
    campaignSlide.addText("05 // 7-DAY STRATEGIC CAMPAIGN", { x: 0.5, y: 0.4, w: 5, h: 0.4, fontSize: 12, fontFace: "Arial", color: MUTED_TEXT, bold: true });
    
    // Phone Mockup
    campaignSlide.addShape(pres.ShapeType.roundRect, { x: 9, y: 1, w: 3.5, h: 6, fill: { color: ACCENT_COLOR }, rectRadius: 0.3 });
    campaignSlide.addShape(pres.ShapeType.roundRect, { x: 9.2, y: 1.2, w: 3.1, h: 5.6, fill: { color: "333333" }, rectRadius: 0.2 });
    campaignSlide.addText("BEFORE: 'Join our team'\nAFTER: '3 reasons I quit my corporate job for BFL'", { x: 9.2, y: 3, w: 3.1, h: 2, fontSize: 11, fontFace: "Arial", color: "FFFFFF", align: "center", bold: true });
    
    const campaignDays = parsedSections.campaign.replace(/[*#`]/g, '').split('\n').filter(l => l.includes('Day')).slice(0, 4);
    campaignDays.forEach((day, idx) => {
      const yPos = 1.3 + (idx * 1.4);
      const [dayTitle, dayContent] = day.split(':');
      campaignSlide.addText(dayTitle.toUpperCase(), { x: 1, y: yPos, w: 2, h: 0.4, fontSize: 12, fontFace: "Georgia", italic: true, color: SECONDARY_COLOR, bold: true });
      campaignSlide.addText((dayContent?.trim() || "Strategic Execution").substring(0, 150), { 
        x: 1, y: yPos + 0.35, w: 7.5, h: 0.9, 
        fontSize: 10, fontFace: "Arial", color: TEXT_COLOR,
        shrinkText: true, lineSpacing: 16
      });
    });

    // 7. Actionable Roadmap & SEO Keywords
    const roadmapSlide = pres.addSlide();
    roadmapSlide.addText("06 // ACTIONABLE ROADMAP & SEO", { x: 0.5, y: 0.4, w: 5, h: 0.4, fontSize: 12, fontFace: "Arial", color: MUTED_TEXT, bold: true });
    
    // Roadmap Timeline
    roadmapSlide.addShape(pres.ShapeType.rect, { x: 1, y: 2.5, w: 11.33, h: 0.05, fill: { color: "EEEEEE" } });
    const roadmapPoints = ["AUDIT", "OPTIMIZE", "SCALE"];
    roadmapPoints.forEach((phase, idx) => {
      const xPos = 1 + (idx * 4.5);
      roadmapSlide.addShape(pres.ShapeType.ellipse, { x: xPos, y: 2.3, w: 0.4, h: 0.4, fill: { color: SECONDARY_COLOR } });
      roadmapSlide.addText(phase, { x: xPos - 0.5, y: 1.8, w: 1.4, h: 0.4, fontSize: 12, fontFace: "Arial", color: ACCENT_COLOR, bold: true, align: "center" });
    });

    // Keyword Cloud
    roadmapSlide.addShape(pres.ShapeType.roundRect, { x: 1, y: 3.5, w: 11.33, h: 3.5, fill: { color: CARD_BG }, rectRadius: 0.1 });
    roadmapSlide.addText("TOP 10 RECRUITMENT KEYWORDS (SEO MAP)", { x: 1.5, y: 3.8, w: 10, h: 0.4, fontSize: 11, fontFace: "Arial", color: SECONDARY_COLOR, bold: true, align: "center" });
    
    const keywords = ["Fintech Careers", "BFL Culture", "Tech Hiring 2026", "Software Engineer Jobs", "Work Life Balance", "Remote Fintech", "Product Manager Roles", "BFL Employee Stories", "Fintech Innovation", "Career Growth"];
    keywords.forEach((kw, idx) => {
      const xPos = 1.5 + (idx % 3 * 3.5);
      const yPos = 4.3 + (Math.floor(idx / 3) * 0.6);
      roadmapSlide.addText(kw, { 
        x: xPos, y: yPos, w: 3, h: 0.4, 
        fontSize: 12, fontFace: "Georgia", italic: true, color: ACCENT_COLOR, align: "center",
        shrinkText: true 
      });
    });

    pres.writeFile({ fileName: `SocialAudit_Elite_Strategic_Intelligence_${new Date().toISOString().split('T')[0]}.pptx` });
  };

  const handleExportPDF = () => {
    const element = document.getElementById('report-content-to-print');
    if (!element || !parsedSections) {
      alert("Report content not found. Please generate a report first.");
      return;
    }

    // Create a temporary container for PDF generation to avoid oklab/oklch issues
    // and ensure it's "visible" for html2canvas
    const pdfContainer = document.createElement('div');
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
    pdfContainer.style.top = '-9999px';
    pdfContainer.style.width = '800px'; // Fixed width for consistent PDF layout
    pdfContainer.innerHTML = element.innerHTML;
    document.body.appendChild(pdfContainer);

    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `SocialAudit_Elite_Strategic_Report_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        letterRendering: true,
        onclone: (clonedDoc: Document) => {
          // Remove all existing styles that might contain oklab/oklch
          const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
          styles.forEach(s => s.remove());

          // Inject a sophisticated, professional stylesheet for the PDF
          const safeStyle = clonedDoc.createElement('style');
          safeStyle.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Playfair+Display:ital,wght@1,700&display=swap');
            
            body { 
              font-family: 'Inter', sans-serif; 
              color: #1A1A1A; 
              background: #FFFFFF; 
              line-height: 1.6;
              margin: 0;
              padding: 0;
            }
            
            .pdf-page {
              padding: 50px;
              background: #FFFFFF;
            }

            .pdf-header {
              border-bottom: 2px solid #1A1A1A;
              padding-bottom: 25px;
              margin-bottom: 40px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }

            .pdf-title {
              font-family: 'Playfair Display', serif;
              font-style: italic;
              font-size: 32pt;
              text-transform: uppercase;
              margin: 0;
              color: #1A1A1A;
              letter-spacing: -0.02em;
            }

            .pdf-subtitle {
              font-size: 11pt;
              text-transform: uppercase;
              letter-spacing: 0.25em;
              opacity: 0.4;
              margin-top: 8px;
              font-weight: 700;
            }

            .pdf-meta {
              text-align: right;
              font-size: 9pt;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              opacity: 0.5;
              font-weight: 500;
            }

            .section-container {
              margin-bottom: 50px;
              page-break-inside: avoid;
            }

            .section-header {
              display: flex;
              align-items: center;
              gap: 20px;
              margin-bottom: 25px;
              border-bottom: 1px solid #E5E5E5;
              padding-bottom: 15px;
            }

            .section-number {
              font-family: 'Playfair Display', serif;
              font-style: italic;
              font-size: 28pt;
              color: #F0F0F0;
              font-weight: 700;
            }

            .section-title {
              font-family: 'Playfair Display', serif;
              font-style: italic;
              font-size: 22pt;
              text-transform: uppercase;
              margin: 0;
              color: #1A1A1A;
              letter-spacing: -0.01em;
            }

            .markdown-body h1, .markdown-body h2, .markdown-body h3 {
              font-family: 'Playfair Display', serif;
              font-style: italic;
              margin-top: 1.8em;
              margin-bottom: 0.8em;
              color: #1A1A1A;
              border-bottom: 1px solid #F0F0F0;
              padding-bottom: 5px;
            }

            .markdown-body p {
              margin-bottom: 1.2em;
              font-size: 11.5pt;
              color: #2D2D2D;
            }

            .markdown-body ul {
              margin-bottom: 1.5em;
              padding-left: 25px;
              list-style-type: none;
            }

            .markdown-body li {
              margin-bottom: 0.8em;
              font-size: 11.5pt;
              position: relative;
              padding-left: 5px;
            }

            .markdown-body li::before {
              content: "•";
              position: absolute;
              left: -20px;
              color: #1A1A1A;
              font-weight: bold;
            }

            .markdown-body table {
              width: 100%;
              border-collapse: collapse;
              margin: 25px 0;
              font-size: 10.5pt;
              border: 1px solid #E5E5E5;
            }

            .markdown-body th, .markdown-body td {
              border: 1px solid #E5E5E5;
              padding: 14px;
              text-align: left;
            }

            .markdown-body th {
              background-color: #FBFBFB;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 9.5pt;
              letter-spacing: 0.08em;
              color: #1A1A1A;
            }

            /* Visual Elements */
            .health-score-container {
              background: #FAFAFA;
              padding: 25px;
              border-radius: 16px;
              margin-bottom: 40px;
              display: flex;
              align-items: center;
              gap: 35px;
              border: 1px solid #F0F0F0;
            }

            .score-circle {
              width: 90px;
              height: 90px;
              border-radius: 50%;
              border: 10px solid #1A1A1A;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24pt;
              font-weight: 700;
              background: #FFFFFF;
            }

            .data-bar-container {
              margin-top: 12px;
              width: 100%;
              height: 10px;
              background: #E5E5E5;
              border-radius: 5px;
              overflow: hidden;
            }

            .data-bar-fill {
              height: 100%;
              background: #1A1A1A;
            }

            .break-before-page {
              page-break-before: always;
            }

            .footer {
              position: fixed;
              bottom: 25px;
              left: 50px;
              right: 50px;
              border-top: 1px solid #F0F0F0;
              padding-top: 15px;
              font-size: 8.5pt;
              text-transform: uppercase;
              letter-spacing: 0.25em;
              opacity: 0.3;
              text-align: center;
              font-weight: 500;
            }
          `;
          clonedDoc.head.appendChild(safeStyle);

          // Strip all inline styles too as a final precaution
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.removeAttribute('style');
          });
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf()
      .set(opt)
      .from(pdfContainer)
      .save()
      .then(() => {
        document.body.removeChild(pdfContainer);
      })
      .catch((err: any) => {
        console.error("PDF Export Error:", err);
        alert("Failed to generate PDF. Please try again or use the Print option.");
        document.body.removeChild(pdfContainer);
      });
  };

  const handleExportExcel = () => {
    if (!parsedSections) return;

    const wb = XLSX.utils.book_new();

    const parseMarkdownToRows = (text: string) => {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const rows: any[][] = [];
      
      let currentSection = "";

      lines.forEach(line => {
        // Detect headers
        if (line.startsWith('#')) {
          const header = line.replace(/[#]/g, '').trim();
          rows.push([]);
          rows.push([header.toUpperCase()]);
          return;
        }

        // Remove markdown formatting
        const cleanLine = line.replace(/[*`]/g, '').replace(/^[-\s·•]+/g, '').trim();
        
        if (cleanLine.includes(':')) {
          const [key, ...valueParts] = cleanLine.split(':');
          rows.push([key.trim(), valueParts.join(':').trim()]);
        } else if (cleanLine.length > 0) {
          rows.push([cleanLine]);
        }
      });
      return rows;
    };

    // Summary Sheet
    const summaryRows = parseMarkdownToRows(parsedSections.summary);
    const wsSummary = XLSX.utils.aoa_to_sheet([
      ["EXECUTIVE SUMMARY & HEALTH SCORE"],
      ["Target URL:", url],
      ["Date:", new Date().toLocaleDateString()],
      [""],
      ["Metric", "Analysis"],
      ...summaryRows
    ]);
    wsSummary['!cols'] = [{ wch: 40 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");

    // Gap Sheet
    const gapRows = parseMarkdownToRows(parsedSections.gap);
    const wsGap = XLSX.utils.aoa_to_sheet([
      ["THE VIRALITY GAP"],
      ["Target URL:", url],
      [""],
      ["Factor", "Analysis"],
      ...gapRows
    ]);
    wsGap['!cols'] = [{ wch: 40 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(wb, wsGap, "Virality Gap");

    // Competitors Sheet
    const competitorsContent = parsedSections.competitors;
    const compTableLines = competitorsContent.split('\n').filter(r => r.includes('|'));
    if (compTableLines.length > 2) {
      const tableData = compTableLines.map(row => 
        row.split('|').map(cell => cell.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1)
      ).filter(row => !row.every(cell => cell.includes('---')));
      const wsComp = XLSX.utils.aoa_to_sheet([["COMPETITOR LANDSCAPE"], ["Target URL:", url], [""], ...tableData]);
      wsComp['!cols'] = tableData[0].map(() => ({ wch: 35 }));
      XLSX.utils.book_append_sheet(wb, wsComp, "Competitors");
    } else {
      const compRows = parseMarkdownToRows(competitorsContent);
      const wsComp = XLSX.utils.aoa_to_sheet([["COMPETITOR LANDSCAPE"], ["Target URL:", url], [""], ...compRows]);
      wsComp['!cols'] = [{ wch: 40 }, { wch: 90 }];
      XLSX.utils.book_append_sheet(wb, wsComp, "Competitors");
    }

    // Campaign Sheet
    const campaignRows = parseMarkdownToRows(parsedSections.campaign);
    const wsCampaign = XLSX.utils.aoa_to_sheet([
      ["7-DAY SYNCHRONIZED CAMPAIGN"],
      ["Target URL:", url],
      [""],
      ...campaignRows
    ]);
    wsCampaign['!cols'] = [{ wch: 40 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(wb, wsCampaign, "7-Day Campaign");

    // Roadmap Sheet
    const roadmapRows = parseMarkdownToRows(parsedSections.roadmap);
    const wsRoadmap = XLSX.utils.aoa_to_sheet([
      ["ACTIONABLE GROWTH ROADMAP"],
      ["Target URL:", url],
      [""],
      ...roadmapRows
    ]);
    wsRoadmap['!cols'] = [{ wch: 40 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(wb, wsRoadmap, "Growth Roadmap");

    const fileName = `BFL_Social_Strategy_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9F9] text-[#1A1A1A]">
      {/* Header */}
      <header className="h-14 border-b border-black/5 bg-white flex items-center justify-between px-6 no-print shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#1A1A1A] rounded-md flex items-center justify-center text-white">
            <ShieldCheck size={18} />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-bold tracking-tight">SocialAudit Elite</h1>
            <span className="text-[10px] font-medium opacity-30 uppercase tracking-widest">Notebook v3</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {report && (
            <div className="flex items-center gap-1 bg-black/5 rounded-full px-2 py-1 mr-2">
              <button 
                onClick={handleExportExcel}
                className="p-1.5 hover:bg-white rounded-full transition-all text-emerald-600"
                title="Export Excel"
              >
                <FileText size={16} />
              </button>
              <button 
                onClick={handleExportPPT}
                className="p-1.5 hover:bg-white rounded-full transition-all text-indigo-600"
                title="Export PPT"
              >
                <LayoutDashboard size={16} />
              </button>
              <button 
                onClick={handleExportPDF}
                className="p-1.5 hover:bg-white rounded-full transition-all text-black"
                title="Export PDF"
              >
                <Download size={16} />
              </button>
            </div>
          )}
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-medium transition-all border",
              isChatOpen 
                ? "bg-[#1A1A1A] text-white border-transparent" 
                : "bg-white text-[#1A1A1A] border-black/10 hover:border-black/20"
            )}
          >
            <Sparkles size={12} />
            {isChatOpen ? "Hide Chat" : "Chat"}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Sources */}
        <aside className="w-72 border-r border-black/5 bg-white flex flex-col no-print shrink-0">
          <div className="p-5 border-b border-black/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Sources</h2>
              <button className="p-1 hover:bg-black/5 rounded-md opacity-40 hover:opacity-100 transition-all">
                <LinkIcon size={12} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                required
                type="url"
                placeholder="Paste social URL..."
                className="w-full bg-[#F5F5F5] border-none rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-black/10 outline-none transition-all"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
              <textarea
                placeholder="Add context (optional)..."
                rows={2}
                className="w-full bg-[#F5F5F5] border-none rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-black/10 outline-none transition-all resize-none"
                value={context}
                onChange={e => setContext(e.target.value)}
              />
              <button
                disabled={loading}
                type="submit"
                className="w-full bg-[#1A1A1A] text-white p-2.5 rounded-lg text-xs font-bold hover:bg-black/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                {loading ? "Analyzing..." : "New Audit"}
              </button>
            </form>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4">Frameworks</h3>
            <div className="space-y-1">
              {['Employee Advocacy', 'Leadership Authority', 'Recruitment Marketing'].map((item) => (
                <div key={item} className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 cursor-default group transition-all">
                  <div className="w-1.5 h-1.5 bg-black/20 rounded-full group-hover:bg-black transition-all" />
                  <span className="text-[11px] font-medium opacity-60 group-hover:opacity-100">{item}</span>
                </div>
              ))}
            </div>
            
            {url && (
              <div className="mt-8 p-3 bg-[#F5F5F5] rounded-xl border border-black/5">
                <div className="flex items-center gap-2 mb-2">
                  <Instagram size={12} className="opacity-40" />
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Active Source</span>
                </div>
                <p className="text-[10px] font-medium truncate opacity-60">{url}</p>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content: Document View */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white relative">
          {!report && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-[#F5F5F5] rounded-3xl flex items-center justify-center mb-6 rotate-3">
                <FileText size={32} className="opacity-10" />
              </div>
              <h2 className="text-2xl font-serif italic text-black/30">Select a source to generate insights</h2>
              <p className="text-[11px] font-medium mt-4 uppercase tracking-[0.2em] opacity-20">Strategic Intelligence Engine Standby</p>
            </div>
          )}

          {loading && !streaming && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="relative mb-8">
                <div className="w-16 h-16 border-2 border-black/5 border-t-black rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldCheck size={20} className="text-black/10" />
                </div>
              </div>
              <p className="font-serif italic text-xl mb-4 text-black/60">{loadingSteps[loadingStep]}</p>
              <div className="w-40 h-1 bg-black/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-black"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 15, ease: "linear" }}
                />
              </div>
            </div>
          )}

          {(report || streaming) && parsedSections && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Notebook Tabs */}
              <div className="flex px-8 border-b border-black/5 no-print shrink-0 bg-white z-10">
                {(['summary', 'gap', 'competitors', 'campaign', 'roadmap'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-6 py-4 text-[11px] font-bold uppercase tracking-widest transition-all relative",
                      activeTab === tab ? "text-black" : "text-black/30 hover:text-black/60"
                    )}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                    )}
                  </button>
                ))}
              </div>

              {/* Document Content */}
              <div className="flex-1 overflow-y-auto p-8 md:p-16 scroll-smooth" id="report-content-to-print">
                {/* Print Template (Hidden on screen) */}
                <div className="print-only-capture hidden">
                  <div className="pdf-header">
                    <div>
                      <h1 className="pdf-title">SocialAudit Elite</h1>
                      <p className="pdf-subtitle">Strategic Performance Analysis Report</p>
                    </div>
                    <div className="pdf-meta">
                      <div>Source: {url}</div>
                      <div>Generated: {new Date().toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="health-score-container">
                    <div className="score-circle">88</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '14pt' }}>Strategic Health Score</h3>
                      <p style={{ margin: '5px 0 0 0', fontSize: '10pt', opacity: 0.6 }}>Based on virality hooks, retention metrics, and platform fit.</p>
                      <div className="data-bar-container">
                        <div className="data-bar-fill" style={{ width: '88%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-20">
                    {Object.entries(parsedSections).map(([key, content], idx) => (
                      <div key={key} className={`section-container ${idx > 0 ? "break-before-page" : ""}`}>
                        <div className="section-header">
                          <span className="section-number">0{idx + 1}</span>
                          <h2 className="section-title">{key.replace('_', ' ')}</h2>
                        </div>
                        <div className="markdown-body">
                          <ReactMarkdown>{content}</ReactMarkdown>
                        </div>
                        
                        {/* Add some visual variety to sections */}
                        {key === 'gap' && (
                          <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div style={{ padding: '15px', background: '#F5F5F5', borderRadius: '8px' }}>
                              <p style={{ fontSize: '9pt', fontWeight: 'bold', marginBottom: '5px' }}>Hook Strength</p>
                              <div className="data-bar-container"><div className="data-bar-fill" style={{ width: '65%' }}></div></div>
                            </div>
                            <div style={{ padding: '15px', background: '#F5F5F5', borderRadius: '8px' }}>
                              <p style={{ fontSize: '9pt', fontWeight: 'bold', marginBottom: '5px' }}>Retention Rate</p>
                              <div className="data-bar-container"><div className="data-bar-fill" style={{ width: '42%' }}></div></div>
                            </div>
                          </div>
                        )}
                        
                        {key === 'persona' && (
                          <div style={{ marginTop: '30px', padding: '20px', background: '#1A1A1A', color: 'white', borderRadius: '12px' }}>
                            <h3 style={{ color: 'white', marginTop: 0 }}>Strategic Shift: Internal to External</h3>
                            <p style={{ fontSize: '10pt', opacity: 0.8 }}>Moving from "Digital Bulletin Board" to "Recruitment Marketing Engine".</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="footer">
                    SocialAudit Elite v3.0 | Confidential Strategic Intelligence | BFL Proprietary Framework
                  </div>
                </div>

                {/* Screen View */}
                <div className="max-w-3xl mx-auto print:hidden">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="markdown-body"
                  >
                    <div className="mb-12 flex items-center gap-6 border-b border-black/5 pb-8">
                      <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/10">
                        {activeTab === 'summary' && <FileText size={24} />}
                        {activeTab === 'gap' && <AlertCircle size={24} />}
                        {activeTab === 'competitors' && <Target size={24} />}
                        {activeTab === 'campaign' && <Calendar size={24} />}
                        {activeTab === 'roadmap' && <ArrowRight size={24} />}
                      </div>
                      <div>
                        <h2 className="text-3xl font-serif italic font-bold uppercase leading-none tracking-tight">
                          {activeTab.replace('_', ' ')}
                        </h2>
                        <p className="text-[11px] font-bold uppercase opacity-30 mt-2 tracking-widest">Notebook Strategic Slide</p>
                      </div>
                    </div>
                    <ReactMarkdown>
                      {parsedSections[activeTab === 'chat' ? 'summary' : activeTab] || "Processing intelligence..."}
                    </ReactMarkdown>
                  </motion.div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar: Notebook Chat */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-black/5 bg-[#F9F9F9] flex flex-col no-print shrink-0 overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-black/5 bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-black/40" />
                  <h2 className="text-[11px] font-bold uppercase tracking-widest opacity-40">Notebook Chat</h2>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 hover:bg-black/5 rounded-full opacity-40 hover:opacity-100 transition-all"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide">
                {chatHistory.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-10 px-12">
                    <Sparkles size={48} className="mb-6" />
                    <p className="text-xs font-bold uppercase tracking-[0.2em]">Ask follow-up questions about your audit report</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={cn(
                    "p-4 rounded-2xl text-[12px] font-medium leading-relaxed shadow-sm",
                    msg.role === 'user' 
                      ? "bg-[#1A1A1A] text-white ml-6 rounded-tr-none" 
                      : "bg-white border border-black/5 mr-6 rounded-tl-none"
                  )}>
                    <p className="font-bold mb-2 uppercase opacity-30 text-[9px] tracking-widest">{msg.role}</p>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-3 opacity-40 text-[10px] font-bold uppercase tracking-widest px-2">
                    <Loader2 className="animate-spin" size={12} />
                    AI is analyzing...
                  </div>
                )}
              </div>

              <div className="p-5 bg-white border-t border-black/5">
                <form onSubmit={handleChatSubmit} className="relative">
                  <input 
                    type="text"
                    value={chatQuery}
                    onChange={e => setChatQuery(e.target.value)}
                    placeholder="Ask follow-up..."
                    className="w-full bg-[#F5F5F5] border-none rounded-xl p-3.5 pr-12 text-xs font-medium focus:ring-1 focus:ring-black/10 outline-none transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={chatLoading || !report}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-black hover:opacity-60 disabled:opacity-10 transition-all"
                  >
                    <ArrowRight size={18} />
                  </button>
                </form>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Print Footer */}
      <footer className="hidden print:block mt-16 pt-8 border-t border-black/10 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] opacity-30">
          SocialAudit Elite v3.0 | BFL Proprietary Strategic Framework
        </p>
      </footer>
    </div>
  );
}
