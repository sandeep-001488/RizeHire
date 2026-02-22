/**
 * Enhanced Job Matching Algorithm with ML-inspired scoring
 * Calculates sophisticated match scores based on multiple factors
 */

/**
 * Calculate TF-IDF inspired skill similarity
 * @param {Array} candidateSkills - Candidate's skills
 * @param {Array} jobSkills - Job's required skills
 * @returns {Object} Skill match details
 */
function calculateSkillMatch(candidateSkills, jobSkills) {
  if (!jobSkills || jobSkills.length === 0) {
    return { score: 50, matchingSkills: [], missingSkills: [], matchPercentage: 0 };
  }

  if (!candidateSkills || candidateSkills.length === 0) {
    return { score: 0, matchingSkills: [], missingSkills: jobSkills, matchPercentage: 0 };
  }

  // Normalize skills to lowercase for comparison
  const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase().trim());
  const normalizedJobSkills = jobSkills.map(s => s.toLowerCase().trim());

  // Find exact matches only (no substring matching to avoid false positives)
  const matchingSkills = [];
  const missingSkills = [];

  normalizedJobSkills.forEach(jobSkill => {
    // Check for exact match
    const hasExactMatch = normalizedCandidateSkills.some(cs => cs === jobSkill);

    // Check for reasonable partial match (both must be multi-word skills)
    // Only allow if the candidate skill is a clear superset (e.g., "react.js" contains "react")
    const hasReasonablePartialMatch = normalizedCandidateSkills.some(cs => {
      // Only consider partial match if one skill is clearly a variant of the other
      // e.g., "javascript" matches "js", "react" matches "reactjs", "node.js" matches "node"
      const csWords = cs.split(/[\s\.\-_]+/);
      const jobWords = jobSkill.split(/[\s\.\-_]+/);

      // Check if they share a significant word (at least 4 characters)
      return csWords.some(cw => jobWords.some(jw =>
        cw.length >= 4 && jw.length >= 4 && (cw === jw || cw.includes(jw) || jw.includes(cw))
      ));
    });

    if (hasExactMatch || hasReasonablePartialMatch) {
      matchingSkills.push(jobSkill);
    } else {
      missingSkills.push(jobSkill);
    }
  });

  // Calculate match percentage
  const matchPercentage = Math.round((matchingSkills.length / normalizedJobSkills.length) * 100);

  // Skill score with bonus for having extra relevant skills
  const baseScore = matchPercentage;
  const extraSkillsBonus = Math.min(candidateSkills.length - matchingSkills.length, 5) * 2; // Max +10
  const score = Math.min(baseScore + extraSkillsBonus, 100);

  return {
    score,
    matchingSkills: matchingSkills.map(s =>
      jobSkills.find(js => js.toLowerCase() === s)
    ),
    missingSkills: missingSkills.map(s =>
      jobSkills.find(js => js.toLowerCase() === s)
    ),
    matchPercentage,
  };
}

/**
 * Calculate experience match score
 * @param {Number} candidateYears - Candidate's years of experience
 * @param {Number} requiredYears - Job's required years
 * @param {String} experienceLevel - Job's experience level (entry, mid, senior)
 * @returns {Object} Experience match details
 */
function calculateExperienceMatch(candidateYears, requiredYears, experienceLevel) {
  candidateYears = candidateYears || 0;
  requiredYears = requiredYears || 0;

  // Define experience level ranges
  const levelRanges = {
    'entry': { min: 0, max: 2, ideal: 1 },
    'junior': { min: 1, max: 3, ideal: 2 },
    'mid': { min: 2, max: 5, ideal: 3.5 },
    'senior': { min: 5, max: 10, ideal: 7 },
    'lead': { min: 8, max: 15, ideal: 10 },
  };

  const level = (experienceLevel || 'mid').toLowerCase();
  const range = levelRanges[level] || levelRanges['mid'];

  let score = 0;
  let explanation = '';

  // Perfect match
  if (candidateYears >= range.min && candidateYears <= range.max) {
    const distanceFromIdeal = Math.abs(candidateYears - range.ideal);
    score = 100 - (distanceFromIdeal * 5); // Lose 5 points per year from ideal
    score = Math.max(score, 80); // Minimum 80 if within range
    explanation = `Perfect fit! Your ${candidateYears} years matches the ${level} level.`;
  }
  // Slightly over-qualified
  else if (candidateYears > range.max && candidateYears <= range.max + 3) {
    score = 70;
    explanation = `Slightly over-qualified. Great fit with room for growth.`;
  }
  // Over-qualified
  else if (candidateYears > range.max + 3) {
    score = 50;
    explanation = `Over-qualified. You may find this role less challenging.`;
  }
  // Slightly under-qualified
  else if (candidateYears < range.min && candidateYears >= range.min - 1) {
    score = 60;
    explanation = `Close match. With strong skills, you could succeed here.`;
  }
  // Under-qualified
  else {
    score = 30;
    explanation = `This role requires more experience. Consider entry-level positions.`;
  }

  return { score, explanation, candidateYears, requiredYears, level };
}

/**
 * Calculate location match score with relocation preferences
 * @param {String} candidateLocation - Candidate's location
 * @param {Object} jobLocation - Job's location {city, country}
 * @param {String} workMode - Job's work mode (remote, hybrid, onsite)
 * @param {Object} preferences - Candidate's relocation preferences
 * @returns {Object} Location match details
 */
function calculateLocationMatch(candidateLocation, jobLocation, workMode, preferences = {}) {
  // Remote jobs are always a match
  if (workMode && workMode.toLowerCase() === 'remote') {
    return {
      score: 100,
      explanation: 'Remote position - location flexible',
      requiresRelocation: false,
    };
  }

  if (!candidateLocation || !jobLocation) {
    return {
      score: 50,
      explanation: 'Location preference not specified',
      requiresRelocation: false,
    };
  }

  // Extract relocation preferences (default to willing for backward compatibility)
  const willingToRelocate = preferences?.willingToRelocate ?? true;
  const relocationType = preferences?.relocationType || 'within-country';

  // Ensure candidateLocation is a string
  const candidateLower = String(candidateLocation || '').toLowerCase();
  const jobCity = String(jobLocation.city || '').toLowerCase();
  const jobCountry = String(jobLocation.country || '').toLowerCase();

  // Exact city match
  if (candidateLower.includes(jobCity) && jobCity) {
    return {
      score: 100,
      explanation: `Same city - ${jobLocation.city}`,
      requiresRelocation: false,
    };
  }

  // Check if same country
  const isSameCountry = candidateLower.includes(jobCountry) && jobCountry;

  // SAME COUNTRY, DIFFERENT CITY
  if (isSameCountry) {
    // Willing to relocate within country → Minimal penalty
    if (willingToRelocate && (relocationType === 'within-country' || relocationType === 'international')) {
      return {
        score: 95,
        explanation: `Willing to relocate within ${jobLocation.country}`,
        requiresRelocation: true,
        relocationCity: jobLocation.city,
        relocationCountry: jobLocation.country,
      };
    }

    // NOT willing to relocate → Moderate penalty
    return {
      score: 50,
      explanation: `Different city, relocation required`,
      requiresRelocation: true,
      relocationCity: jobLocation.city,
      relocationCountry: jobLocation.country,
    };
  }

  // DIFFERENT COUNTRY (International)
  const isDifferentCountry = !isSameCountry;

  if (isDifferentCountry) {
    // Willing to relocate internationally → Still penalty (visa)
    if (willingToRelocate && relocationType === 'international') {
      return {
        score: 45,
        explanation: `International relocation (${jobLocation.country}), visa required`,
        requiresRelocation: true,
        relocationCity: jobLocation.city,
        relocationCountry: jobLocation.country,
        requiresVisa: true,
      };
    }

    // NOT willing → Large penalty
    return {
      score: 20,
      explanation: `International relocation required`,
      requiresRelocation: true,
      relocationCity: jobLocation.city,
      relocationCountry: jobLocation.country,
      requiresVisa: true,
    };
  }

  // Fallback
  return {
    score: 50,
    explanation: 'Location compatibility unclear',
    requiresRelocation: false,
  };
}

/**
 * Calculate salary match score
 * @param {Number} candidateMin - Candidate's minimum salary expectation
 * @param {Number} candidateMax - Candidate's maximum salary expectation
 * @param {Object} jobBudget - Job's budget {min, max}
 * @returns {Object} Salary match details
 */
function calculateSalaryMatch(candidateMin, candidateMax, jobBudget) {
  if (!jobBudget || (!jobBudget.min && !jobBudget.max)) {
    return { score: 50, explanation: 'Salary not disclosed' };
  }

  if (!candidateMin && !candidateMax) {
    return { score: 50, explanation: 'No salary expectation specified' };
  }

  const jobMin = jobBudget.min || 0;
  const jobMax = jobBudget.max || jobBudget.min || 0;
  const candidateDesired = candidateMax || candidateMin || 0;

  // Job offers more than candidate expects
  if (jobMin >= candidateDesired) {
    return { score: 100, explanation: 'Salary exceeds your expectations' };
  }

  // Job's max meets candidate's min
  if (jobMax >= candidateMin) {
    return { score: 80, explanation: 'Salary within your expected range' };
  }

  // Job offers less but close
  if (jobMax >= candidateMin * 0.8) {
    return { score: 60, explanation: 'Salary slightly below expectations' };
  }

  // Job offers significantly less
  return { score: 30, explanation: 'Salary below your expectations' };
}

/**
 * Calculate overall job match score with weighted factors
 * @param {Object} candidate - Candidate profile
 * @param {Object} job - Job details
 * @returns {Object} Comprehensive match score and explanation
 */
export function calculateJobMatch(candidate, job) {
  // Safely extract candidate info with defaults
  const candidateSkills = candidate?.skills || candidate?.parsedResume?.skills || [];
  const candidateYears = candidate?.parsedResume?.yearsOfExperience || candidate?.yearsOfExperience || 0;
  const candidateLocation = candidate?.location || candidate?.parsedResume?.location || '';
  const preferences = candidate?.preferences || {}; // Relocation preferences

  // Safely extract job requirements with defaults
  const jobSkills = job?.skills || job?.required_skills || [];
  const requiredYears = job?.hardConstraints?.minYears || job?.ideal_experience || 0;
  const experienceLevel = job?.experienceLevel || 'mid';
  const jobLocation = job?.location || {};
  const workMode = job?.workMode || '';
  const jobBudget = job?.budget || {};

  // Calculate individual scores
  const skillMatch = calculateSkillMatch(candidateSkills, jobSkills);
  const experienceMatch = calculateExperienceMatch(candidateYears, requiredYears, experienceLevel);
  const locationMatch = calculateLocationMatch(candidateLocation, jobLocation, workMode, preferences);
  const salaryMatch = calculateSalaryMatch(null, null, jobBudget); // Candidate salary not in profile yet

  // Weighted scoring (skills are most important)
  const weights = {
    skills: 0.50,      // 50% - Most important
    experience: 0.35,  // 35% - Very important (increased from 30%)
    location: 0.10,    // 10% - Less important (reduced from 15%, since within-country relocation is common)
    salary: 0.05,      // 5% - Less weight (often negotiable)
  };

  const overallScore = Math.round(
    (skillMatch.score * weights.skills) +
    (experienceMatch.score * weights.experience) +
    (locationMatch.score * weights.location) +
    (salaryMatch.score * weights.salary)
  );

  // Generate match category
  let matchCategory = '';
  let matchBadge = '';
  if (overallScore >= 80) {
    matchCategory = 'Excellent Match';
    matchBadge = 'best-match';
  } else if (overallScore >= 60) {
    matchCategory = 'Good Match';
    matchBadge = 'good-match';
  } else if (overallScore >= 40) {
    matchCategory = 'Fair Match';
    matchBadge = 'fair-match';
  } else {
    matchCategory = 'Needs Development';
    matchBadge = 'low-match';
  }

  // Generate "Why This Job" explanation
  const whyThisJob = [];

  if (skillMatch.matchPercentage >= 70) {
    whyThisJob.push(`Strong skill match (${skillMatch.matchPercentage}%) - you have ${skillMatch.matchingSkills.length} of ${jobSkills.length} required skills`);
  } else if (skillMatch.matchPercentage >= 40) {
    whyThisJob.push(`Moderate skill match (${skillMatch.matchPercentage}%) - good foundation with room to grow`);
  } else {
    whyThisJob.push(`Develop ${skillMatch.missingSkills.slice(0, 3).join(', ')} to improve your fit`);
  }

  if (experienceMatch.score >= 80) {
    whyThisJob.push(experienceMatch.explanation);
  }

  if (locationMatch.score >= 70) {
    whyThisJob.push(locationMatch.explanation);
  }

  return {
    overallScore,
    matchCategory,
    matchBadge,
    breakdown: {
      skills: {
        score: skillMatch.score,
        matchingSkills: skillMatch.matchingSkills,
        missingSkills: skillMatch.missingSkills,
        matchPercentage: skillMatch.matchPercentage,
      },
      experience: {
        score: experienceMatch.score,
        explanation: experienceMatch.explanation,
        candidateYears,
        requiredYears,
      },
      location: {
        score: locationMatch.score,
        explanation: locationMatch.explanation,
      },
      salary: {
        score: salaryMatch.score,
        explanation: salaryMatch.explanation,
      },
    },
    whyThisJob: whyThisJob.join(' • '),
    recommendation: overallScore >= 60
      ? 'We recommend applying to this position!'
      : overallScore >= 40
        ? 'Consider applying if you\'re willing to learn the missing skills.'
        : 'Focus on positions that better match your current skill set.',
  };
}

/**
 * Rank jobs by relevance to candidate
 * @param {Array} jobs - Array of job objects
 * @param {Object} candidate - Candidate profile
 * @returns {Array} Sorted jobs with match scores
 */
export function rankJobsByRelevance(jobs, candidate) {
  if (!jobs || jobs.length === 0) return [];

  // Calculate match for each job
  const jobsWithScores = jobs.map(job => {
    const match = calculateJobMatch(candidate, job);
    return {
      ...job,
      matchScore: match.overallScore,
      matchCategory: match.matchCategory,
      matchBadge: match.matchBadge,
      matchBreakdown: match.breakdown,
      whyThisJob: match.whyThisJob,
      recommendation: match.recommendation,
    };
  });

  // Sort by match score (highest first)
  return jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Get top N recommended jobs for a candidate
 * @param {Array} jobs - Array of job objects
 * @param {Object} candidate - Candidate profile
 * @param {Number} limit - Number of recommendations (default 5)
 * @returns {Array} Top recommended jobs
 */
export function getTopRecommendations(jobs, candidate, limit = 5) {
  const rankedJobs = rankJobsByRelevance(jobs, candidate);
  return rankedJobs.slice(0, limit);
}
