import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * AI-powered skill suggestion utility
 * Uses Gemini AI to suggest relevant skills for any job category
 * Works universally across all industries (tech, business, marketing, etc.)
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Get skill suggestions from Gemini AI based on job details
 * @param {string} jobTitle - The job title (e.g., "Digital Marketing Manager")
 * @param {string} category - Job category (e.g., "marketing", "technology")
 * @param {string} description - Optional job description for better context
 * @returns {Promise<Array<string>>} - Array of suggested skills
 */
export async function getSuggestedSkills(jobTitle, category, description = "") {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Build context-aware prompt
    const prompt = `
You are an expert HR consultant helping recruiters post job listings.

Job Title: ${jobTitle}
Category: ${category}
${description ? `Description: ${description}` : ""}

Based on this job, suggest 10-15 most relevant and specific skills that candidates should have.

IMPORTANT RULES:
1. Return ONLY a valid JSON array of skill names
2. Skills should be specific and relevant to the job
3. Include both technical and soft skills where appropriate
4. Use industry-standard terminology
5. No explanations, just the JSON array

Example format: ["Skill 1", "Skill 2", "Skill 3"]

For technology jobs: Include programming languages, frameworks, tools
For business jobs: Include management, strategy, analysis skills
For marketing jobs: Include SEO, content, social media, analytics
For finance jobs: Include accounting software, financial modeling, compliance
For healthcare jobs: Include medical procedures, certifications, patient care
For creative jobs: Include design tools, creative software, portfolio skills

Now provide the skills array:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Failed to extract JSON from AI response:", text);
      return getFallbackSkills(category);
    }

    const skills = JSON.parse(jsonMatch[0]);

    // Validate and clean skills
    const cleanedSkills = skills
      .filter((skill) => typeof skill === "string" && skill.trim().length > 0)
      .map((skill) => skill.trim())
      .slice(0, 15); // Limit to 15 skills

    return cleanedSkills.length > 0 ? cleanedSkills : getFallbackSkills(category);
  } catch (error) {
    console.error("Error getting skill suggestions from AI:", error);
    return getFallbackSkills(category);
  }
}

/**
 * Fallback skills when AI fails or for quick responses
 * Provides basic skills for each category
 */
function getFallbackSkills(category) {
  const fallbackSkills = {
    technology: [
      "JavaScript",
      "Python",
      "React",
      "Node.js",
      "SQL",
      "Git",
      "Problem Solving",
      "Agile",
      "REST APIs",
      "Cloud Computing",
    ],
    business: [
      "Strategic Planning",
      "Project Management",
      "Business Analysis",
      "Leadership",
      "Communication",
      "Excel",
      "Data Analysis",
      "Stakeholder Management",
      "Budget Management",
      "Process Improvement",
    ],
    marketing: [
      "SEO",
      "Content Marketing",
      "Social Media Marketing",
      "Google Analytics",
      "Email Marketing",
      "Copywriting",
      "Marketing Strategy",
      "Brand Management",
      "Digital Advertising",
      "Market Research",
    ],
    finance: [
      "Financial Analysis",
      "Excel",
      "Accounting",
      "Financial Modeling",
      "Budgeting",
      "QuickBooks",
      "Tax Compliance",
      "Financial Reporting",
      "Risk Management",
      "Auditing",
    ],
    healthcare: [
      "Patient Care",
      "Medical Terminology",
      "Clinical Skills",
      "EMR Systems",
      "HIPAA Compliance",
      "Medical Documentation",
      "Patient Assessment",
      "Healthcare Regulations",
      "Communication",
      "Teamwork",
    ],
    education: [
      "Curriculum Development",
      "Classroom Management",
      "Lesson Planning",
      "Student Assessment",
      "Communication",
      "Educational Technology",
      "Differentiated Instruction",
      "Mentoring",
      "Learning Management Systems",
      "Subject Matter Expertise",
    ],
    creative: [
      "Adobe Photoshop",
      "Adobe Illustrator",
      "Creativity",
      "Visual Design",
      "Typography",
      "Branding",
      "UI/UX Design",
      "Figma",
      "Color Theory",
      "Portfolio Development",
    ],
    operations: [
      "Supply Chain Management",
      "Logistics",
      "Inventory Management",
      "Process Optimization",
      "Quality Control",
      "Vendor Management",
      "Data Analysis",
      "Project Management",
      "Problem Solving",
      "ERP Systems",
    ],
    sales: [
      "Sales Strategy",
      "Lead Generation",
      "CRM Software",
      "Negotiation",
      "Client Relationship Management",
      "Communication",
      "Presentation Skills",
      "Market Analysis",
      "Cold Calling",
      "Closing Deals",
    ],
    engineering: [
      "CAD Software",
      "Technical Drawing",
      "Problem Solving",
      "Project Management",
      "Quality Assurance",
      "Manufacturing Processes",
      "Safety Standards",
      "Materials Science",
      "Testing & Validation",
      "Documentation",
    ],
    legal: [
      "Legal Research",
      "Contract Review",
      "Legal Writing",
      "Compliance",
      "Case Management",
      "Litigation",
      "Regulatory Knowledge",
      "Negotiation",
      "Attention to Detail",
      "Client Communication",
    ],
    hr: [
      "Recruitment",
      "Employee Relations",
      "HR Policies",
      "Performance Management",
      "HRIS Systems",
      "Onboarding",
      "Compensation & Benefits",
      "Conflict Resolution",
      "Training & Development",
      "Labor Law Compliance",
    ],
    other: [
      "Communication",
      "Problem Solving",
      "Teamwork",
      "Time Management",
      "Adaptability",
      "Critical Thinking",
      "Leadership",
      "Organization",
      "Attention to Detail",
      "Customer Service",
    ],
  };

  return fallbackSkills[category] || fallbackSkills.other;
}

/**
 * Get skills from historical job postings (for future implementation)
 * This will learn from your platform's data over time
 */
export async function getHistoricalSkills(jobTitle, category) {
  // TODO: Implement database query to find similar jobs
  // and extract common skills
  // For now, return empty array to indicate no historical data
  return [];
}

/**
 * Combine AI suggestions with historical data
 * This provides the best of both worlds
 */
export async function getSmartSkillSuggestions(jobTitle, category, description = "") {
  try {
    // Try to get historical skills first (faster)
    const historicalSkills = await getHistoricalSkills(jobTitle, category);

    if (historicalSkills.length >= 5) {
      // We have enough historical data, use it
      return historicalSkills;
    }

    // Not enough historical data, use AI
    const aiSkills = await getSuggestedSkills(jobTitle, category, description);

    // Merge historical and AI skills (remove duplicates)
    const allSkills = [...new Set([...historicalSkills, ...aiSkills])];

    return allSkills.slice(0, 15); // Limit to 15 skills
  } catch (error) {
    console.error("Error in smart skill suggestions:", error);
    return getFallbackSkills(category);
  }
}

export default {
  getSuggestedSkills,
  getHistoricalSkills,
  getSmartSkillSuggestions,
  getFallbackSkills,
};
