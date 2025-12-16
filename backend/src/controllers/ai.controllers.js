import { generateContent } from "../config/gemini.js";
import Application from "../models/application.model.js";
import Job from "../models/job.model.js";

const fallbackSkillsExtraction = (text) => {
  const skillCategories = {
    languages: [
      "JavaScript",
      "TypeScript",
      "Python",
      "Java",
      "C++",
      "C#",
      "PHP",
      "Ruby",
      "Go",
      "Rust",
      "Swift",
      "Kotlin",
      "Scala",
      "MATLAB",
      "SQL",
      "Dart",
      "C",
    ],
    frontend: [
      "React",
      "Vue.js",
      "Vue",
      "Angular",
      "Next.js",
      "Nuxt.js",
      "Svelte",
      "HTML",
      "CSS",
      "SCSS",
      "SASS",
      "Tailwind CSS",
      "Bootstrap",
      "jQuery",
      "Redux",
      "Zustand",
      "MobX",
      "Styled Components",
      "Material-UI",
      "Chakra UI",
    ],
    backend: [
      "Node.js",
      "Express.js",
      "Express",
      "Django",
      "Flask",
      "Spring Boot",
      "Spring",
      "Laravel",
      "Rails",
      "ASP.NET",
      "FastAPI",
      "Nest.js",
      "Koa.js",
      "Fastify",
      "Gin",
      "Echo",
      "Fiber",
    ],
    databases: [
      "MongoDB",
      "PostgreSQL",
      "MySQL",
      "Redis",
      "Elasticsearch",
      "SQLite",
      "Oracle",
      "Firebase",
      "Supabase",
      "DynamoDB",
      "Cassandra",
      "MariaDB",
    ],
    cloud: [
      "AWS",
      "Google Cloud",
      "GCP",
      "Azure",
      "Docker",
      "Kubernetes",
      "Jenkins",
      "Terraform",
      "Ansible",
      "Serverless",
      "Lambda",
      "CloudFormation",
    ],
    tools: [
      "Git",
      "GitHub",
      "GitLab",
      "Linux",
      "Ubuntu",
      "Nginx",
      "Apache",
      "Postman",
      "Jest",
      "Cypress",
      "Selenium",
      "Webpack",
      "Vite",
      "Parcel",
    ],
    concepts: [
      "REST API",
      "GraphQL",
      "WebSocket",
      "Microservices",
      "JWT",
      "OAuth",
      "Authentication",
      "Authorization",
      "AI",
      "Machine Learning",
      "Blockchain",
      "DevOps",
      "CI/CD",
      "Agile",
      "Scrum",
      "TDD",
      "Clean Architecture",
    ],
    mobile: ["React Native", "Flutter", "iOS", "Android", "Xamarin", "Ionic"],
    services: [
      "ImageKit",
      "Cloudinary",
      "Stripe",
      "PayPal",
      "Twilio",
      "SendGrid",
    ],
    testing: [
    "manual testing", "automation testing",
    "selenium", "cypress", "playwright",
    "postman", "swagger", "jmeter",
    "regression testing", "unit testing",
    "jest", "mocha", "chai"
  ],
  management: [
    "product management", "scrum", "agile",
    "jira", "confluence", "project management",
    "business analysis", "process mapping",
    "stakeholder management", "wireframing",
    "roadmapping", "market research"
  ],blockchain: [
    "solidity", "web3js", "ethersjs",
    "smart contracts", "hardhat", "truffle",
    "ethereum", "polygon", "defi",
    "nfts", "token standards", "gas optimization"
  ],
  cybersecurity: [
    "penetration testing", "siem", "firewalls",
    "network security", "vulnerability assessment",
    "ethical hacking", "owasp", "iso 27001",
    "incident response", "malware analysis",
    "identity access management"
  ],
   ai: [
    "huggingface", "langchain", "rag", "vector databases",
    "pinecone", "weaviate", "chroma db",
    "fine-tuning", "prompt engineering",
    "ai model evaluation", "onnx", "model optimization"
  ],
  data_science: [
    "python", "numpy", "pandas", "matplotlib", "seaborn",
    "scikit-learn", "statistics", "hypothesis testing",
    "machine learning", "deep learning",
    "pytorch", "tensorflow", "keras",
    "nlp", "computer vision",
    "llm", "transformers",
    "forecasting", "regression", "classification"
  ],
   data_engineering: [
    "sql", "nosql", "etl", "data pipelines",
    "airflow", "bigquery", "databricks",
    "apache spark", "kafka", "hadoop",
    "data warehousing", "data modeling",
    "snowflake", "redshift", "powerbi"
  ],
  };

  const extractedSkills = new Set();
  const textLower = text.toLowerCase();
  const allSkills = Object.values(skillCategories).flat();
  allSkills.forEach((skill) => {
    const skillLower = skill.toLowerCase();
    if (textLower.includes(skillLower)) {
      extractedSkills.add(skill);
    }
  });
  return Array.from(extractedSkills).slice(0, 15);
};

const extractSkills = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text is required",
      });
    }

    let extractedData = {};
    let aiResponse = null;

    try {
      const prompt = `You are an expert resume parser. Extract the following information from the text. If a field cannot be extracted, return null for that field.

Return the results as a JSON object with the following keys:

- name: Candidate's full name (string)
- email: Candidate's email address (string)
- phone: Candidate's phone number (string)
- total_experience_years: Total years of work experience (number)
- skills: List of skills (array of strings, max 15)
- education: List of educational qualifications (array of strings)
- gender: Gender of the candidate (string, or null if not inferable)
- resume_confidence: A score (number, 0-1) representing the resume quality
- parsed_summary: A short summary of the candidate's experience (string)

IMPORTANT RULES:
1.  Skills should be returned as an array of strings.
2.  Return ONLY a valid JSON object.

TEXT TO ANALYZE:
"${text}"

EXPECTED OUTPUT FORMAT (example):
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "123-456-7890",
  "total_experience_years": 5,
  "skills": ["JavaScript", "React", "Node.js"],
  "education": ["Bachelor's in Computer Science"],
  "gender": "male",
  "resume_confidence": 0.8,
  "parsed_summary": "Experienced software engineer..."
}

YOUR RESPONSE:`;

      aiResponse = await generateContent(prompt);
      console.log("📥 Raw AI Response:", aiResponse);

      let parsedData;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No valid JSON object found in AI response");
        }
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }

      // Validate parsedData
      if (typeof parsedData !== 'object' || parsedData === null) {
        throw new Error("Parsed result is not a JSON object");
      }

      // Extract individual fields
      const { name, email, phone, total_experience_years, skills, education, gender, resume_confidence, parsed_summary } = parsedData;

      // Assign extracted values
      extractedData = {
        name: name || null,
        email: email || null,
        phone: phone || null,
        total_experience_years: total_experience_years || null,
        skills: Array.isArray(skills) ? skills.slice(0, 15) : [],
        education: Array.isArray(education) ? education : [],
        gender: gender || null,
        resume_confidence: resume_confidence !== undefined ? resume_confidence : null,
        parsed_summary: parsed_summary || null,
      };

      res.json({
        success: true,
        data: extractedData,
      });
    } catch (aiError) {
      console.error("AI extraction failed:", aiError);
      res.status(500).json({
        success: false,
        message: `Failed to extract resume features: ${aiError.message}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to extract skills: ${error.message}`,
    });
  }
};

const calculateJobMatch = async (req, res) => {
  try {
    const { jobId } = req.params;
    const user = req.user;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (!user.parsedResume) {
      return res.status(400).json({
        success: false,
        message:
          "Please upload and parse your resume at '/api/auth/profile/parse-resume' to calculate job match.",
      });
    }

    const evaluation = evaluateCandidate(job, user.parsedResume);

    res.json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    console.error("Calculate job match error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const evaluateCandidate = (job, parsedResume) => {
  // 1. Hard Filters
  let hardFail = false;
  const hardFilterReasons = [];

  if (job.hardConstraints?.minYears && parsedResume.total_experience_years < job.hardConstraints.minYears) {
    hardFail = true;
    hardFilterReasons.push(`Minimum experience required: ${job.hardConstraints.minYears} years`);
  }

  // Optional gender constraint (admin-enabled)
  if (job.hardConstraints?.gender && parsedResume.gender !== job.hardConstraints.gender) {
    hardFail = true;
    hardFilterReasons.push(`Gender preference: ${job.hardConstraints.gender}`);
  }

  if (hardFail) {
    return {
      decision: { status: "reject", reason: hardFilterReasons.join(", "), final_score: 0 },
      parsed_features: parsedResume,
      contributions: {},
      percent_contribution: {},
      notes: "Candidate rejected due to hard filter constraints.",
    };
  }

  // 2. Soft Scoring Features
  const requiredSkills = job.skills || [];
  const matchingSkills = parsedResume.skills.filter((skill) =>
    requiredSkills.some((jobSkill) =>
      jobSkill.toLowerCase().includes(skill.toLowerCase())
    )
  );
  const skill_match = requiredSkills.length > 0 ? matchingSkills.length / requiredSkills.length : 1;

  const ideal_experience = job.ideal_experience || 5; // Default ideal experience
  const experience_std_dev = 2; // Standard deviation for experience
  const exp_score = Math.exp(-Math.pow(parsedResume.total_experience_years - ideal_experience, 2) / (2 * Math.pow(experience_std_dev, 2)));

  const preferred_education = job.preferred_education || "Bachelor's";
  let education_match = 0.5;
  if (parsedResume.education.includes(preferred_education)) {
    education_match = 1;
  } else if (parsedResume.education.length > 0) {
    education_match = 0.8; // Higher education
  }

  const resume_confidence = parsedResume.resume_confidence || 0.7; // Default resume confidence

  // 3. Weighted Scoring Formula
  const final_score = 0.45 * skill_match + 0.25 * exp_score + 0.15 * education_match + 0.15 * resume_confidence;

  // 4. SHAP-like Explanation
  const skill_match_contribution = 0.45 * skill_match;
  const exp_score_contribution = 0.25 * exp_score;
  const education_match_contribution = 0.15 * education_match;
  const resume_confidence_contribution = 0.15 * resume_confidence;

  const total_contribution = Math.abs(skill_match_contribution) + Math.abs(exp_score_contribution) + Math.abs(education_match_contribution) + Math.abs(resume_confidence_contribution);

  const skill_match_percent = Math.abs(skill_match_contribution) / total_contribution * 100;
  const exp_score_percent = Math.abs(exp_score_contribution) / total_contribution * 100;
  const education_match_percent = Math.abs(education_match_contribution) / total_contribution * 100;
  const resume_confidence_percent = Math.abs(resume_confidence_contribution) / total_contribution * 100;

  // 5. Final Decision
  let decisionStatus = "reject";
  let decisionReason = "Candidate does not meet the required qualifications.";
  if (final_score >= 0.75) {
    decisionStatus = "shortlist";
    decisionReason = "Candidate is a strong match for the job.";
  } else if (final_score >= 0.5) {
    decisionStatus = "manual_review";
    decisionReason = "Candidate requires manual review.";
  }

  // 6. JSON Structure
  const result = {
    decision: {
      status: decisionStatus,
      reason: decisionReason,
      final_score: final_score,
    },
    parsed_features: parsedResume,
    contributions: {
      skill_match: skill_match_contribution,
      exp_score: exp_score_contribution,
      education_match: education_match_contribution,
      resume_confidence: resume_confidence_contribution,
    },
    percent_contribution: {
      skill_match: skill_match_percent,
      exp_score: exp_score_percent,
      education_match: education_match_percent,
      resume_confidence: resume_confidence_percent,
    },
    notes: `Skill Match: ${skill_match_percent.toFixed(1)}%, Experience: ${exp_score_percent.toFixed(1)}%, Education: ${education_match_percent.toFixed(1)}%, Resume Confidence: ${resume_confidence_percent.toFixed(1)}%`,
  };

  return result;
};

const testAI = async (req, res) => {
  try {
    const testPrompt =
      'Return exactly this JSON array: ["JavaScript", "React", "Node.js"]';
    const response = await generateContent(testPrompt);

    res.json({
      success: true,
      data: {
        prompt: testPrompt,
        response: response,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getJobRecommendations = async (req, res) => {
  try {
    const user = req.user;
    const userSkills = user.skills || user.parsedResume?.skills || [];

    if (userSkills.length === 0) {
      return res.json({
        success: true,
        data: {
          recommendations: [],
          message:
            "Add skills or upload a resume to get personalized recommendations",
        },
      });
    }

    const appliedJobIds = await Application.find({
      applicantId: user._id,
    })
      .select("jobId")
      .lean();

    const appliedJobIdsArray = appliedJobIds.map((app) => app.jobId.toString());

    const jobs = await Job.find({
      isActive: true,
      skills: { $in: userSkills },
      postedBy: { $ne: user._id },
      _id: { $nin: appliedJobIdsArray },
    })
      .populate("postedBy", "name email profileImage")
      .limit(10)
      .sort({ createdAt: -1 });

    // Use the parsedResume if available for better recommendations
    const profileText = user.parsedResume
      ? JSON.stringify(user.parsedResume)
      : `Skills: ${JSON.stringify(userSkills)}, Bio: ${user.bio}`;

    const recommendations = await Promise.all(
      jobs.map(async (job) => {
        try {
          const prompt = `Rate job match (0-100): Job "${
            job.title
          }" with skills ${JSON.stringify(
            job.skills
          )} for candidate profile: ${profileText}. Return only number.`;
          const response = await generateContent(prompt);
          const matchScore = parseInt(response.match(/\d+/)?.[0] || "50");

          return {
            job,
            matchScore: Math.min(Math.max(matchScore, 0), 100),
          };
        } catch (error) {
          // Fallback logic
          const jobSkills = job.skills || [];
          const matchingSkills = userSkills.filter((skill) =>
            jobSkills.some((jobSkill) =>
              jobSkill.toLowerCase().includes(skill.toLowerCase())
            )
          );
          const fallbackScore =
            jobSkills.length > 0
              ? Math.round((matchingSkills.length / jobSkills.length) * 80) + 20
              : 50;
          return {
            job,
            matchScore: Math.min(fallbackScore, 100),
          };
        }
      })
    );

    const sortedRecommendations = recommendations
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    res.json({
      success: true,
      data: { recommendations: sortedRecommendations },
    });
  } catch (error) {
    console.error("Get recommendations error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getCareerSuggestions = async (req, res) => {
  try {
    const user = req.user;
    const userSkills = user.skills || user.parsedResume?.skills || [];
    const userBio = user.bio || "";

    if (userSkills.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add skills or upload a resume to get career suggestions.",
      });
    }

    let suggestions = {
      jobTitles: [],
      skillsToLearn: [],
      careerPath: "Continue developing your skills and gaining experience.",
    };

    try {
      const prompt = `Based on skills ${JSON.stringify(
        userSkills
      )} and bio "${userBio}", suggest career path as JSON:
{
  "jobTitles": ["3-5 relevant job titles"],
  "skillsToLearn": ["3-5 skills to learn next"],
  "careerPath": "brief career advice"
}`;

      const response = await generateContent(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found");
      }
    } catch (aiError) {
      console.warn("AI career suggestions failed:", aiError.message);
      // Fallback
      suggestions = {
        jobTitles: [
          "Software Developer",
          "Full Stack Developer",
          "Technical Lead",
        ],
        skillsToLearn: ["Cloud Computing", "DevOps", "System Design"],
        careerPath: `Based on your skills in ${userSkills
          .slice(0, 3)
          .join(", ")}, focus on cloud technologies and system architecture.`,
      };
    }

    res.json({
      success: true,
      data: { suggestions },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const optimizeJobDescription = async (req, res) => {
  try {
    const { description, title, jobType } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        message: "Job description is required",
      });
    }

    let optimizedDescription = description;

    try {
      const prompt = `Optimize this job description. Make it more engaging and professional while keeping the same meaning:

Title: ${title || "Job Title"}
Type: ${jobType || "full-time"}
Description: "${description}"

Return only the improved description, no extra formatting:`;

      optimizedDescription = await generateContent(prompt);
      optimizedDescription = optimizedDescription.trim();
    } catch (aiError) {
      console.warn("AI optimization failed:", aiError.message);
    }

    res.json({
      success: true,
      data: { optimizedDescription },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const generateInterviewQuestions = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    let questions = [];

    try {
      const prompt = `Generate 5-7 interview questions for ${
        job.title
      } position requiring ${JSON.stringify(
        job.skills
      )}. Return as JSON array: ["question1", "question2", ...]`;

      const response = await generateContent(prompt);
      const jsonMatch = response.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON array found");
      }
    } catch (aiError) {
      console.warn("AI question generation failed:", aiError.message);

      questions = [
        `Tell me about your experience with ${
          job.skills?.[0] || "the required technologies"
        }.`,
        "Describe a challenging project you've worked on recently.",
        "How do you approach debugging complex issues?",
        "What interests you about this role?",
      ];
    }

    res.json({
      success: true,
      data: { questions },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  extractSkills,
  calculateJobMatch,
  getJobRecommendations,
  getCareerSuggestions,
  optimizeJobDescription,
  generateInterviewQuestions,
  testAI,
};
