import express from "express";
import Job from "../models/job.model.js";

const router = express.Router();

// Random deadline generator
function randomDeadline() {
  const start = new Date("2025-12-28");
  const end = new Date("2026-01-20");
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

router.post("/seed-jobs", async (req, res) => {
  try {
    // Utility to randomly choose postedBy
const postedByList = ["693dcc0bcfc73927e1e0a75f", "693e401929b23cc4921bbb68"];
const pickPoster = () => postedByList[Math.floor(Math.random() * postedByList.length)];

const sampleJobs = [

  // 1️⃣ Full Stack Developer – Zoho
  {
    title: "Full Stack Developer (Java + React)",
    company: {
      name: "Zoho Corporation",
      website: "https://www.zoho.com",
      description:
        "Zoho is a global SaaS leader providing cloud software for businesses across CRM, finance, HR, and IT. With a strong engineering culture, Zoho focuses on robust backend systems, secure architectures, and seamless user experiences.",
    },
    description:
      "Zoho is seeking a Full Stack Developer proficient in Java, Spring Boot, and React. You will build scalable enterprise-grade modules, integrate third-party APIs, and optimize relational database performance. You will work with cross-functional teams and contribute to design discussions, architecture improvements, and production deployments.",
    postedBy: pickPoster(),
    skills: ["Java", "Spring Boot", "React", "MySQL"],
    jobType: "full-time",
    workMode: "onsite",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India" },
    budget: { min: 60000, max: 120000, currency: "INR", period: "monthly" },
    experienceLevel: "mid",
    hardConstraints: { gender: null, minYears: 2 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandeepsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["fullstack", "java", "react"],
    ideal_experience: 2,
    preferred_education: "Bachelor's",
    required_skills: ["Java"],
  },

  // 2️⃣ Frontend Developer – Razorpay
  {
    title: "Frontend Developer (React/Next.js)",
    company: {
      name: "Razorpay",
      website: "https://razorpay.com",
      description:
        "Razorpay is India's leading fintech platform offering payment gateways, banking solutions, payroll, and financial automation services.",
    },
    description:
      "As a Frontend Developer at Razorpay, you will build highly responsive dashboards, payment workflows, and internal management systems. You must have strong knowledge of React, TypeScript, performance optimization, and UI engineering practices.",
    postedBy: pickPoster(),
    skills: ["React", "Next.js", "TypeScript", "CSS"],
    jobType: "full-time",
    workMode: "hybrid",
    location: { city: "Bangalore", state: "Karnataka", country: "India" },
    budget: { min: 90000, max: 150000, currency: "INR", period: "monthly" },
    experienceLevel: "mid",
    hardConstraints: { gender: null, minYears: 2 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandeepsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["frontend", "react", "payments"],
    ideal_experience: 3,
    preferred_education: "Bachelor's",
    required_skills: ["React"],
  },

  // 3️⃣ Java Backend Developer – Infosys
  {
    title: "Java Backend Developer",
    company: {
      name: "Infosys",
      website: "https://infosys.com",
      description:
        "Infosys is a global IT service and consulting giant providing enterprise-grade solutions across finance, healthcare, retail, and telecom.",
    },
    description:
      "Infosys is seeking a Java Backend Developer to work on microservices, API development, distributed systems, and enterprise workflows. Strong understanding of Spring Boot, REST, SQL/NoSQL databases, and CI/CD is required.",
    postedBy: pickPoster(),
    skills: ["Java", "Spring Boot", "Microservices", "SQL"],
    jobType: "full-time",
    workMode: "onsite",
    location: { city: "Pune", state: "Maharashtra", country: "India" },
    budget: { min: 70000, max: 130000, currency: "INR", period: "monthly" },
    experienceLevel: "mid",
    hardConstraints: { gender: null, minYears: 2 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandeepsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["backend", "java", "spring"],
    ideal_experience: 2,
    preferred_education: "Bachelor's",
    required_skills: ["Java"],
  },

  // 4️⃣ Mobile App Developer – Swiggy
  {
    title: "Mobile App Developer (React Native)",
    company: {
      name: "Swiggy",
      website: "https://careers.swiggy.com",
      description:
        "Swiggy is India's largest on-demand delivery platform offering hyperlocal logistics, food delivery, Instamart groceries, and restaurant solutions.",
    },
    description:
      "Swiggy seeks a React Native Developer to build fast, optimized, and scalable mobile app features. You will collaborate with product teams, integrate new APIs, and ensure app stability across Android and iOS platforms.",
    postedBy: pickPoster(),
    skills: ["React Native", "JavaScript", "Redux"],
    jobType: "full-time",
    workMode: "hybrid",
    location: { city: "Hyderabad", state: "Telangana", country: "India" },
    budget: { min: 80000, max: 140000, currency: "INR", period: "monthly" },
    experienceLevel: "mid",
    hardConstraints: { gender: null, minYears: 2 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandeepsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["mobile", "reactnative"],
    ideal_experience: 2,
    preferred_education: "Bachelor's",
    required_skills: ["React Native"],
  },

  // 5️⃣ Data Scientist – CRED
  {
    title: "Data Scientist",
    company: {
      name: "CRED",
      website: "https://cred.club",
      description:
        "CRED is a premium fintech platform offering reward-based credit repayment, financial insights, and intelligent credit behavior analytics.",
    },
    description:
      "CRED is hiring a Data Scientist to develop predictive models, customer segmentation logic, fraud detection algorithms, and data insights that improve financial user behavior analytics.",
    postedBy: pickPoster(),
    skills: ["Python", "Machine Learning", "SQL", "Statistics"],
    jobType: "full-time",
    workMode: "onsite",
    location: { city: "Bangalore", state: "Karnataka", country: "India" },
    budget: { min: 150000, max: 250000, currency: "INR", period: "monthly" },
    experienceLevel: "senior",
    hardConstraints: { gender: null, minYears: 3 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandeepsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["data", "ml", "python"],
    ideal_experience: 4,
    preferred_education: "Master's",
    required_skills: ["Python"],
  },

  // 6️⃣ Cybersecurity Analyst – Deloitte
  {
    title: "Cybersecurity Analyst",
    company: {
      name: "Deloitte",
      website: "https://www2.deloitte.com",
      description:
        "Deloitte is a global consulting leader providing security, auditing, risk assessment, and enterprise cybersecurity solutions.",
    },
    description:
      "Deloitte seeks a Cybersecurity Analyst to perform vulnerability assessments, SOC monitoring, intrusion detection, compliance analysis, and incident reporting.",
    postedBy: pickPoster(),
    skills: ["Cybersecurity", "SIEM", "Networking", "Risk Assessment"],
    jobType: "full-time",
    workMode: "onsite",
    location: { city: "Gurgaon", state: "Haryana", country: "India" },
    budget: { min: 70000, max: 150000, currency: "INR", period: "monthly" },
    experienceLevel: "mid",
    hardConstraints: { gender: null, minYears: 2 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandeepsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["cybersecurity", "deloitte"],
    ideal_experience: 2,
    preferred_education: "Bachelor's",
    required_skills: ["Cybersecurity"],
  },

  // 7️⃣ DevOps Engineer – TCS
  {
    title: "DevOps Engineer",
    company: {
      name: "TCS",
      website: "https://www.tcs.com",
      description:
        "TCS is a top global IT services company providing cloud engineering, digital transformation, and enterprise system integration.",
    },
    description:
      "TCS is hiring a DevOps Engineer to build CI/CD pipelines, automate deployments, manage cloud infrastructure, and ensure production-level reliability.",
    postedBy: pickPoster(),
    skills: ["AWS", "Docker", "Kubernetes", "Jenkins"],
    jobType: "full-time",
    workMode: "onsite",
    location: { city: "Mumbai", state: "Maharashtra", country: "India" },
    budget: { min: 70000, max: 120000, currency: "INR", period: "monthly" },
    experienceLevel: "mid",
    hardConstraints: { gender: null, minYears: 2 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandeepsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["devops", "cloud"],
    ideal_experience: 3,
    preferred_education: "Bachelor's",
    required_skills: ["AWS"],
  },

  // 8️⃣ AI/ML Engineer – NVIDIA
  {
    title: "AI/ML Engineer",
    company: {
      name: "NVIDIA",
      website: "https://nvidia.com",
      description:
        "NVIDIA is a world leader in GPU computing, AI research, deep learning frameworks, and accelerated computing infrastructure.",
    },
    description:
      "NVIDIA seeks an AI/ML Engineer to work on LLM optimization, GPU model acceleration, computer vision, and high-performance training pipelines.",
    postedBy: pickPoster(),
    skills: ["Python", "PyTorch", "TensorFlow", "CUDA"],
    jobType: "full-time",
    workMode: "onsite",
    location: { city: "Bangalore", state: "Karnataka", country: "India" },
    budget: { min: 200000, max: 350000, currency: "INR", period: "monthly" },
    experienceLevel: "senior",
    hardConstraints: { gender: null, minYears: 3 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandeepsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["ai", "gpu", "pytorch"],
    ideal_experience: 4,
    preferred_education: "Master's",
    required_skills: ["PyTorch"],
  },

  // 9️⃣ UI/UX Designer – Freshworks
  {
    title: "UI/UX Designer",
    company: {
      name: "Freshworks",
      website: "https://freshworks.com",
      description:
        "Freshworks builds intuitive cloud-based CRM, customer support, and sales automation tools used by businesses globally.",
    },
    description:
      "Freshworks seeks a UI/UX Designer to craft engaging dashboards, workflows, and user journeys. You will collaborate with PMs, developers, and design researchers.",
    postedBy: pickPoster(),
    skills: ["Figma", "Wireframing", "Prototyping"],
    jobType: "full-time",
    workMode: "hybrid",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India" },
    budget: { min: 50000, max: 90000, currency: "INR", period: "monthly" },
    experienceLevel: "junior",
    hardConstraints: { gender: null, minYears: 1 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandeepsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["uiux", "design"],
    ideal_experience: 1,
    preferred_education: "Bachelor's",
    required_skills: ["Figma"],
  },

  // 1️⃣0️⃣ Data Engineer – Accenture
  {
    title: "Data Engineer",
    company: {
      name: "Accenture",
      website: "https://accenture.com",
      description:
        "Accenture is a global professional services company specializing in IT, consulting, cloud migration, and data modernization.",
    },
    description:
      "As a Data Engineer at Accenture, you will design data pipelines, optimize ETL workflows, and work with large-scale analytical databases.",
    postedBy: pickPoster(),
    skills: ["SQL", "Python", "ETL", "Azure"],
    jobType: "full-time",
    workMode: "hybrid",
    location: { city: "Hyderabad", state: "Telangana", country: "India" },
    budget: { min: 80000, max: 160000, currency: "INR", period: "monthly" },
    experienceLevel: "mid",
    hardConstraints: { gender: null, minYears: 2 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandeepsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["data", "etl", "azure"],
    ideal_experience: 2,
    preferred_education: "Bachelor's",
    required_skills: ["SQL"],
  },

  // 1️⃣1️⃣ QA Automation Engineer – Cognizant
  {
    title: "QA Automation Engineer",
    company: {
      name: "Cognizant",
      website: "https://cognizant.com",
      description:
        "Cognizant is a multinational IT services company providing digital transformation, QA automation, and enterprise testing solutions.",
    },
    description:
      "Cognizant seeks an Automation Engineer skilled in Selenium, Cypress, API testing, and writing reusable testing frameworks.",
    postedBy: pickPoster(),
    skills: ["Selenium", "Cypress", "API Testing"],
    jobType: "full-time",
    workMode: "onsite",
    location: { city: "Pune", state: "Maharashtra", country: "India" },
    budget: { min: 50000, max: 100000, currency: "INR", period: "monthly" },
    experienceLevel: "mid",
    hardConstraints: { gender: null, minYears: 1 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandeepsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["qa", "automation"],
    ideal_experience: 2,
    preferred_education: "Bachelor's",
    required_skills: ["Selenium"],
  },

  // 1️⃣2️⃣ Systems Engineer – Wipro
  {
    title: "Systems Engineer",
    company: {
      name: "Wipro",
      website: "https://wipro.com",
      description:
        "Wipro is a large IT services provider specializing in enterprise engineering, cloud IT systems, and global support operations.",
    },
    description:
      "Wipro seeks a Systems Engineer to manage Windows/Linux servers, automate configuration scripts, and maintain enterprise IT systems.",
    postedBy: pickPoster(),
    skills: ["Linux", "Shell Scripting", "Networking"],
    jobType: "full-time",
    workMode: "onsite",
    location: { city: "Bangalore", state: "Karnataka", country: "India" },
    budget: { min: 40000, max: 80000, currency: "INR", period: "monthly" },
    experienceLevel: "entry",
    hardConstraints: { gender: null, minYears: 0 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandeepsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["systems", "linux"],
    ideal_experience: 1,
    preferred_education: "Bachelor's",
    required_skills: ["Linux"],
  },

  // 1️⃣3️⃣ Marketing Associate – Byju’s
  {
    title: "Marketing Associate",
    company: {
      name: "Byju's",
      website: "https://byjus.com",
      description:
        "Byju’s is a leading ed-tech platform offering interactive learning programs for students across India.",
    },
    description:
      "Byju’s seeks a Marketing Associate skilled in campaign execution, analytics, engagement strategies, and lead funnel tracking.",
    postedBy: pickPoster(),
    skills: ["Marketing", "SEO", "Analytics"],
    jobType: "full-time",
    workMode: "hybrid",
    location: { city: "Bangalore", state: "Karnataka", country: "India" },
    budget: { min: 40000, max: 90000, currency: "INR", period: "monthly" },
    experienceLevel: "entry",
    hardConstraints: { gender: null, minYears: 0 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandееpsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["marketing", "seo"],
    ideal_experience: 1,
    preferred_education: "Bachelor's",
    required_skills: ["Marketing"],
  },

  // 1️⃣4️⃣ Blockchain Developer – Polygon
  {
    title: "Blockchain Developer",
    company: {
      name: "Polygon",
      website: "https://polygon.technology",
      description:
        "Polygon is a leading Layer-2 scaling platform enabling fast, low-cost blockchain transactions and decentralized applications.",
    },
    description:
      "Polygon seeks a Blockchain Developer to build smart contracts, optimize gas usage, work with Solidity, and develop decentralized applications.",
    postedBy: pickPoster(),
    skills: ["Solidity", "Web3", "Ethers.js"],
    jobType: "full-time",
    workMode: "remote",
    location: { city: "Remote", state: "", country: "India" },
    budget: { min: 120000, max: 200000, currency: "INR", period: "monthly" },
    experienceLevel: "mid",
    hardConstraints: { gender: null, minYears: 1 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandееpsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["blockchain", "solidity"],
    ideal_experience: 2,
    preferred_education: "Bachelor's",
    required_skills: ["Solidity"],
  },

  // 1️⃣5️⃣ Technical Support Engineer – HCL
  {
    title: "Technical Support Engineer",
    company: {
      name: "HCL Technologies",
      website: "https://hcltech.com",
      description:
        "HCL provides digital engineering, infrastructure support, cloud services, and enterprise IT management solutions.",
    },
    description:
      "HCL seeks a Support Engineer to assist clients with product issues, handle ticketing, troubleshoot systems, and escalate complex cases.",
    postedBy: pickPoster(),
    skills: ["Technical Support", "Troubleshooting", "Ticketing"],
    jobType: "full-time",
    workMode: "onsite",
    location: { city: "Noida", state: "Uttar Pradesh", country: "India" },
    budget: { min: 35000, max: 70000, currency: "INR", period: "monthly" },
    experienceLevel: "entry",
    hardConstraints: { gender: null, minYears: 0 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandееpsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["support", "techsupport"],
    ideal_experience: 1,
    preferred_education: "Bachelor's",
    required_skills: ["Troubleshooting"],
  },

  // 1️⃣6️⃣ Full Stack Engineer – Flipkart
  {
    title: "Full Stack Engineer",
    company: {
      name: "Flipkart",
      website: "https://flipkartcareers.com",
      description:
        "Flipkart is India's biggest e-commerce platform, operating at massive scale with millions of daily users.",
    },
    description:
      "As a Full Stack Engineer, you will build e-commerce workflows, enhance ordering systems, manage large DB structures, and optimize warehouse APIs.",
    postedBy: pickPoster(),
    skills: ["Node.js", "React", "MySQL", "Redis"],
    jobType: "full-time",
    workMode: "onsite",
    location: { city: "Bangalore", state: "Karnataka", country: "India" },
    budget: { min: 90000, max: 160000, currency: "INR", period: "monthly" },
    experienceLevel: "mid",
    hardConstraints: { gender: null, minYears: 2 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandееpsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["fullstack", "ecommerce"],
    ideal_experience: 3,
    preferred_education: "Bachelor's",
    required_skills: ["Node.js"],
  },

  // 1️⃣7️⃣ Cloud Engineer – AWS India
  {
    title: "Cloud Engineer",
    company: {
      name: "AWS India",
      website: "https://aws.amazon.com",
      description:
        "AWS India provides cloud computing services, serverless architectures, and enterprise cloud transformation support.",
    },
    description:
      "AWS India seeks a Cloud Engineer familiar with IAM, VPC, EC2, S3, Lambda, and Infrastructure-as-Code tools like Terraform.",
    postedBy: pickPoster(),
    skills: ["AWS", "Terraform", "Linux"],
    jobType: "full-time",
    workMode: "hybrid",
    location: { city: "Gurgaon", state: "Haryana", country: "India" },
    budget: { min: 130000, max: 200000, currency: "INR", period: "monthly" },
    experienceLevel: "senior",
    hardConstraints: { gender: null, minYears: 4 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandееpsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["cloud", "aws", "terraform"],
    ideal_experience: 5,
    preferred_education: "Bachelor's",
    required_skills: ["AWS"],
  },

  // 1️⃣8️⃣ Business Analyst – EY
  {
    title: "Business Analyst",
    company: {
      name: "EY (Ernst & Young)",
      website: "https://ey.com",
      description:
        "EY is a global consulting firm offering services in financial analysis, risk advisory, and digital strategy planning.",
    },
    description:
      "EY is hiring a Business Analyst to gather requirements, build process intelligence, analyze KPIs, and collaborate with product teams.",
    postedBy: pickPoster(),
    skills: ["Business Analysis", "SQL", "Documentation"],
    jobType: "full-time",
    workMode: "hybrid",
    location: { city: "Mumbai", state: "Maharashtra", country: "India" },
    budget: { min: 70000, max: 130000, currency: "INR", period: "monthly" },
    experienceLevel: "mid",
    hardConstraints: { gender: null, minYears: 2 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandееpsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["business", "analysis"],
    ideal_experience: 2,
    preferred_education: "Bachelor's",
    required_skills: ["Business Analysis"],
  },

  // 1️⃣9️⃣ Junior Web Developer – Tech Mahindra
  {
    title: "Junior Web Developer",
    company: {
      name: "Tech Mahindra",
      website: "https://techmahindra.com",
      description:
        "Tech Mahindra provides IT solutions, cloud engineering, software development, and enterprise digital modernization.",
    },
    description:
      "Tech Mahindra seeks a Junior Web Developer with strong HTML, CSS, JavaScript fundamentals and basic understanding of React.",
    postedBy: pickPoster(),
    skills: ["HTML", "CSS", "JavaScript", "React"],
    jobType: "full-time",
    workMode: "onsite",
    location: { city: "Noida", state: "Uttar Pradesh", country: "India" },
    budget: { min: 30000, max: 60000, currency: "INR", period: "monthly" },
    experienceLevel: "entry",
    hardConstraints: { gender: null, minYears: 0 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandееpsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["frontend", "junior"],
    ideal_experience: 1,
    preferred_education: "Bachelor's",
    required_skills: ["JavaScript"],
  },

  // 2️⃣0️⃣ ERP Consultant – SAP
  {
    title: "ERP Consultant (SAP Functional)",
    company: {
      name: "SAP",
      website: "https://sap.com",
      description:
        "SAP is a global leader in ERP software powering millions of enterprises worldwide across finance, operations, and logistics.",
    },
    description:
      "SAP seeks a Functional Consultant to implement ERP modules, configure workflows, perform UAT, and support enterprise clients.",
    postedBy: pickPoster(),
    skills: ["SAP", "ERP", "Business Analysis"],
    jobType: "full-time",
    workMode: "hybrid",
    location: { city: "Gurgaon", state: "Haryana", country: "India" },
    budget: { min: 100000, max: 180000, currency: "INR", period: "monthly" },
    experienceLevel: "mid",
    hardConstraints: { gender: null, minYears: 2 },
    applicationUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    applicationEmail: "sandееpsanu1230@gmail.com",
    applicationDeadline: randomDeadline(),
    isActive: true,
    views: 0,
    tags: ["erp", "sap"],
    ideal_experience: 3,
    preferred_education: "Bachelor's",
    required_skills: ["SAP"],
  }

];

    // Insert all jobs
    await Job.insertMany(sampleJobs);

    return res.json({ success: true, inserted: sampleJobs.length });

  } catch (error) {
    console.error("Seed error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
