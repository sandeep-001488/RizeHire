import { generateContent } from "../config/gemini.js";
import Application from "../models/application.model.js";
import Job from "../models/job.model.js";
import { applyHardRules, scoreWithAI } from "../utils/aiScreening.js";

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
      "R",
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

    let skills = [];
    let usingFallback = false;
    let aiResponse = null;

    try {
      const prompt = `You are a technical recruiter expert. Extract ONLY the technical skills, technologies, programming languages, frameworks, tools, and platforms mentioned in the following text.

IMPORTANT RULES:
1. Extract ONLY skills that are explicitly mentioned in the text
2. Use exact names as they appear (e.g., "Next.js" not "NextJS")
3. Include programming languages, frameworks, databases, cloud services, tools
4. Do NOT invent or infer skills not mentioned
5. Return ONLY a valid JSON array of strings
6. Maximum 15 skills

TEXT TO ANALYZE:
"${text}"

EXPECTED OUTPUT FORMAT (example):
["JavaScript", "React", "Node.js", "MongoDB", "Docker"]

YOUR RESPONSE:`;

      aiResponse = await generateContent(prompt);
      console.log("📥 Raw AI Response:", aiResponse);

      let jsonMatch = aiResponse.match(/\[[\s\S]*?\]/);

      if (jsonMatch) {
        skills = JSON.parse(jsonMatch[0]);
        if (Array.isArray(skills)) {
          skills = skills
            .filter(
              (skill) =>
                typeof skill === "string" &&
                skill.length > 0 &&
                skill.length < 50
            )
            .map((skill) => skill.trim())
            .slice(0, 15);
        } else {
          throw new Error("Parsed result is not an array");
        }
        if (skills.length === 0) {
          throw new Error("AI returned empty skills array");
        }
      } else {
        throw new Error("No valid JSON array found in AI response");
      }
    } catch (aiError) {
      skills = fallbackSkillsExtraction(text);
      usingFallback = true;
    }

    res.json({
      success: true,
      data: {
        skills,
        usingFallback,
      },
    });
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

    // --- NEW: Check for parsed resume ---
    if (!user.parsedResume) {
      return res.status(400).json({
        success: false,
        message:
          "Please upload and parse your resume at '/api/auth/profile/parse-resume' to calculate job match.",
      });
    }

    // 1. Check hard rules
    const hard = applyHardRules(job.hardConstraints, user.parsedResume);
    if (hard.hardFail) {
      return res.json({
        success: true,
        data: {
          matchScore: 0,
          decision: "rejected",
          reasons: hard.reasons,
          job: { id: job._id, title: job.title },
        },
      });
    }

    // 2. Get flexible AI score
    const ai = await scoreWithAI({ job, parsedResume: user.parsedResume });
    const decision = ai.score >= 60 ? "good-match" : "poor-match";

    res.json({
      success: true,
      data: {
        matchScore: ai.score,
        decision,
        reasons: ai.reasons,
        job: { id: job._id, title: job.title },
      },
    });
  } catch (error) {
    console.error("Calculate job match error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
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
