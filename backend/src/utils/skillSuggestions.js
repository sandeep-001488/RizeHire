import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function getSuggestedSkills(jobTitle, category, description = "") {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Failed to extract JSON from AI response:", text);
      return getFallbackSkills(category);
    }

    const skills = JSON.parse(jsonMatch[0]);

    const cleanedSkills = skills
      .filter((skill) => typeof skill === "string" && skill.trim().length > 0)
      .map((skill) => skill.trim())
      .slice(0, 15);

    return cleanedSkills.length > 0 ? cleanedSkills : getFallbackSkills(category);
  } catch (error) {
    console.error("Error getting skill suggestions from AI:", error);
    return getFallbackSkills(category);
  }
}

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

export async function getHistoricalSkills(jobTitle, category) {
  return [];
}

export async function getSmartSkillSuggestions(jobTitle, category, description = "") {
  try {
    const historicalSkills = await getHistoricalSkills(jobTitle, category);

    if (historicalSkills.length >= 5) {
      return historicalSkills;
    }

    const aiSkills = await getSuggestedSkills(jobTitle, category, description);

    const allSkills = [...new Set([...historicalSkills, ...aiSkills])];

    return allSkills.slice(0, 15);
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
