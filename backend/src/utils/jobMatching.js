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

    if (level === 'entry' && candidateYears === 0) {
      explanation = `Perfect for entry-level candidates`;
    } else if (candidateYears === 0) {
      explanation = `Entry-level opportunity`;
    } else {
      explanation = `${candidateYears} years - great fit for ${level} role`;
    }
  }
  // Slightly over-qualified
  else if (candidateYears > range.max && candidateYears <= range.max + 3) {
    score = 70;
    explanation = `Senior candidate for ${level} role`;
  }
  // Over-qualified
  else if (candidateYears > range.max + 3) {
    score = 50;
    explanation = `Highly experienced for this ${level} position`;
  }
  // Slightly under-qualified
  else if (candidateYears < range.min && candidateYears >= range.min - 1) {
    score = 60;
    explanation = `Quick learner can succeed in ${level} role`;
  }
  // Under-qualified
  else {
    score = 30;
    explanation = `${level.charAt(0).toUpperCase() + level.slice(1)} role - build more experience`;
  }

  return { score, explanation, candidateYears, requiredYears, level };
}

/**
 * Calculate location match score with relocation preferences
 * Simplified scoring:
 * - Remote: 100 (location irrelevant)
 * - Same city (any mode): 100
 * - Hybrid/Onsite + Different city + Willing to relocate: 100
 * - Hybrid + Different city + Not willing: 70
 * - Onsite + Different city + Not willing: 40
 * - No location provided: 20
 *
 * @param {String} candidateLocation - Candidate's location
 * @param {Object} jobLocation - Job's location {city, country}
 * @param {String} workMode - Job's work mode (remote, hybrid, onsite)
 * @param {Boolean} willingToRelocate - User's relocation choice (true/false/null)
 * @returns {Object} Location match details
 */
function calculateLocationMatch(candidateLocation, jobLocation, workMode, willingToRelocate = null) {
  // Rule 1: Remote jobs → location irrelevant
  if (workMode && workMode.toLowerCase() === 'remote') {
    return {
      score: 100,
      explanation: 'Remote position - location flexible',
      requiresRelocation: false,
    };
  }

  // Rule 2: No candidate location provided
  if (!candidateLocation || !jobLocation) {
    return {
      score: 20,
      explanation: 'Please add your location for better recommendations',
      requiresRelocation: false,
    };
  }

  // Normalize for comparison (case-insensitive)
  const candidateLower = String(candidateLocation || '').toLowerCase().trim();
  const jobCity = String(jobLocation.city || '').toLowerCase().trim();

  // Rule 3: Same city (exact match)
  if (jobCity && candidateLower.includes(jobCity)) {
    return {
      score: 100,
      explanation: `Same city - ${jobLocation.city}`,
      requiresRelocation: false,
    };
  }

  // Rule 4: Different city - check relocation preference
  // Both Hybrid and Onsite ask relocation question if different city

  // 4a: User willing to relocate
  if (willingToRelocate === true) {
    return {
      score: 100,
      explanation: `Different city - willing to relocate`,
      requiresRelocation: true,
      relocationCity: jobLocation.city,
      relocationCountry: jobLocation.country,
    };
  }

  // 4b: User NOT willing to relocate
  if (willingToRelocate === false) {
    // Hybrid: score 70, Onsite: score 40
    const score = workMode?.toLowerCase() === 'hybrid' ? 70 : 40;
    return {
      score,
      explanation: `Different city - not willing to relocate`,
      requiresRelocation: true,
      relocationCity: jobLocation.city,
      relocationCountry: jobLocation.country,
      userNotWilling: true,
    };
  }

  // 4c: User hasn't answered relocation question yet (null)
  // Default to lower score until they answer
  const defaultScore = workMode?.toLowerCase() === 'hybrid' ? 40 : 20;
  return {
    score: defaultScore,
    explanation: 'Location mismatch - relocation preference unknown',
    requiresRelocation: true,
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
 * @param {Boolean} willingToRelocate - User's relocation choice (for applications)
 * @returns {Object} Comprehensive match score and explanation
 */
export function calculateJobMatch(candidate, job, willingToRelocate = null) {
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
  // Pass willingToRelocate from application (if set), otherwise use default null
  const locationMatch = calculateLocationMatch(
    candidateLocation,
    jobLocation,
    workMode,
    willingToRelocate
  );
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

  // Skills explanation
  if (skillMatch.matchPercentage >= 70) {
    const topSkills = skillMatch.matchingSkills.slice(0, 3).join(', ');
    whyThisJob.push(`Strong match: ${topSkills}${skillMatch.matchingSkills.length > 3 ? ` +${skillMatch.matchingSkills.length - 3} more` : ''}`);
  } else if (skillMatch.matchPercentage >= 50) {
    const topSkills = skillMatch.matchingSkills.slice(0, 2).join(', ');
    whyThisJob.push(`${skillMatch.matchingSkills.length} matching skills: ${topSkills}`);
  } else if (skillMatch.matchPercentage >= 30) {
    whyThisJob.push(`Entry opportunity: ${skillMatch.matchingSkills.length} skills match`);
  } else {
    const skillsNeeded = skillMatch.missingSkills.slice(0, 2).join(', ');
    whyThisJob.push(`Growth opportunity: Learn ${skillsNeeded}`);
  }

  // Experience explanation - only add if score is notable
  if (experienceMatch.score >= 80) {
    whyThisJob.push(`Excellent experience fit`);
  } else if (experienceMatch.score >= 60 && experienceMatch.score < 80) {
    whyThisJob.push(`Good experience level`);
  }

  // Location - only mention if perfect or remote
  if (locationMatch.score === 100) {
    if (job.workMode === 'remote') {
      whyThisJob.push(`Remote work`);
    } else {
      whyThisJob.push(`Perfect location`);
    }
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
