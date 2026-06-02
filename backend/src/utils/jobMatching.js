function calculateSkillMatch(candidateSkills, jobSkills) {
  if (!jobSkills || jobSkills.length === 0) {
    return { score: 50, matchingSkills: [], missingSkills: [], matchPercentage: 0 };
  }

  if (!candidateSkills || candidateSkills.length === 0) {
    return { score: 0, matchingSkills: [], missingSkills: jobSkills, matchPercentage: 0 };
  }

  const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase().trim());
  const normalizedJobSkills = jobSkills.map(s => s.toLowerCase().trim());

  const matchingSkills = [];
  const missingSkills = [];

  normalizedJobSkills.forEach(jobSkill => {
    const hasExactMatch = normalizedCandidateSkills.some(cs => cs === jobSkill);

    // Partial match only when skills share a word of >=4 chars, e.g. "react.js"/"react"
    const hasReasonablePartialMatch = normalizedCandidateSkills.some(cs => {
      const csWords = cs.split(/[\s\.\-_]+/);
      const jobWords = jobSkill.split(/[\s\.\-_]+/);

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

  const matchPercentage = Math.round((matchingSkills.length / normalizedJobSkills.length) * 100);

  // Bonus for extra skills, but only if at least one required skill matched (max +10)
  const baseScore = matchPercentage;
  const extraSkillsBonus = matchingSkills.length > 0
    ? Math.min(candidateSkills.length - matchingSkills.length, 5) * 2
    : 0;
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

function calculateExperienceMatch(candidateYears, requiredYears, experienceLevel) {
  candidateYears = candidateYears || 0;
  requiredYears = requiredYears || 0;

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

  if (candidateYears >= range.min && candidateYears <= range.max) {
    const distanceFromIdeal = Math.abs(candidateYears - range.ideal);
    score = 100 - (distanceFromIdeal * 5); // -5 points per year away from ideal
    score = Math.max(score, 80); // floor of 80 while within range

    if (level === 'entry' && candidateYears === 0) {
      explanation = `Perfect for entry-level candidates`;
    } else if (candidateYears === 0) {
      explanation = `Entry-level opportunity`;
    } else {
      explanation = `${candidateYears} years - great fit for ${level} role`;
    }
  }
  else if (candidateYears > range.max && candidateYears <= range.max + 3) {
    score = 70;
    explanation = `Senior candidate for ${level} role`;
  }
  else if (candidateYears > range.max + 3) {
    score = 50;
    explanation = `Highly experienced for this ${level} position`;
  }
  else if (candidateYears < range.min && candidateYears >= range.min - 1) {
    score = 60;
    explanation = `Quick learner can succeed in ${level} role`;
  }
  else {
    score = 30;
    explanation = `${level.charAt(0).toUpperCase() + level.slice(1)} role - build more experience`;
  }

  return { score, explanation, candidateYears, requiredYears, level };
}

/**
 * Location scoring rules:
 * - Remote: 100 (location irrelevant)
 * - Same city (any mode): 100
 * - Hybrid/Onsite + different city + willing to relocate: 100
 * - Hybrid + different city + not willing: 70; Onsite: 40
 * - No location provided: 20
 * willingToRelocate is true/false/null (null = not yet answered).
 */
function calculateLocationMatch(candidateLocation, jobLocation, workMode, willingToRelocate = null) {
  if (workMode && workMode.toLowerCase() === 'remote') {
    return {
      score: 100,
      explanation: 'Remote position - location flexible',
      requiresRelocation: false,
    };
  }

  if (!candidateLocation || !jobLocation) {
    return {
      score: 20,
      explanation: 'Please add your location for better recommendations',
      requiresRelocation: false,
    };
  }

  const candidateLower = String(candidateLocation || '').toLowerCase().trim();
  const jobCity = String(jobLocation.city || '').toLowerCase().trim();

  if (jobCity && candidateLower.includes(jobCity)) {
    return {
      score: 100,
      explanation: `Same city - ${jobLocation.city}`,
      requiresRelocation: false,
    };
  }

  if (willingToRelocate === true) {
    return {
      score: 100,
      explanation: `Different city - willing to relocate`,
      requiresRelocation: true,
      relocationCity: jobLocation.city,
      relocationCountry: jobLocation.country,
    };
  }

  if (willingToRelocate === false) {
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

  // Relocation question unanswered (null): use a lower default until answered
  const defaultScore = workMode?.toLowerCase() === 'hybrid' ? 40 : 20;
  return {
    score: defaultScore,
    explanation: 'Location mismatch - relocation preference unknown',
    requiresRelocation: true,
  };
}

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

  if (jobMin >= candidateDesired) {
    return { score: 100, explanation: 'Salary exceeds your expectations' };
  }

  if (jobMax >= candidateMin) {
    return { score: 80, explanation: 'Salary within your expected range' };
  }

  if (jobMax >= candidateMin * 0.8) {
    return { score: 60, explanation: 'Salary slightly below expectations' };
  }

  return { score: 30, explanation: 'Salary below your expectations' };
}

export function calculateJobMatch(candidate, job, willingToRelocate = null) {
  const candidateSkills = candidate?.skills || candidate?.parsedResume?.skills || [];
  const candidateYears = candidate?.parsedResume?.yearsOfExperience || candidate?.yearsOfExperience || 0;
  const candidateLocation = candidate?.location || candidate?.parsedResume?.location || '';
  const preferences = candidate?.preferences || {};

  const jobSkills = job?.skills || job?.required_skills || [];
  const requiredYears = job?.hardConstraints?.minYears || job?.ideal_experience || 0;
  const experienceLevel = job?.experienceLevel || 'mid';
  const jobLocation = job?.location || {};
  const workMode = job?.workMode || '';
  const jobBudget = job?.budget || {};

  const skillMatch = calculateSkillMatch(candidateSkills, jobSkills);
  const experienceMatch = calculateExperienceMatch(candidateYears, requiredYears, experienceLevel);
  const locationMatch = calculateLocationMatch(
    candidateLocation,
    jobLocation,
    workMode,
    willingToRelocate
  );
  const salaryMatch = calculateSalaryMatch(null, null, jobBudget); // candidate salary not yet captured in profile

  // Weights must stay in sync with mlModel.js training data
  const weights = {
    skills: 0.50,      
    experience: 0.35, 
    location: 0.10,    
    salary: 0.05,      
  };

  let overallScore = Math.round(
    (skillMatch.score * weights.skills) +
    (experienceMatch.score * weights.experience) +
    (locationMatch.score * weights.location) +
    (salaryMatch.score * weights.salary)
  );

  
  if (skillMatch.score === 0) {
    overallScore = Math.min(overallScore, 20);
  } else if (skillMatch.score < 20) {
    overallScore = Math.min(overallScore, 30);
  } else if (skillMatch.score < 40) {
    overallScore = Math.min(overallScore, 40);
  }

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

  const whyThisJob = [];

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

  if (experienceMatch.score >= 80) {
    whyThisJob.push(`Excellent experience fit`);
  } else if (experienceMatch.score >= 60 && experienceMatch.score < 80) {
    whyThisJob.push(`Good experience level`);
  }

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


export function rankJobsByRelevance(jobs, candidate) {
  if (!jobs || jobs.length === 0) return [];

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

  return jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);
}

export function getTopRecommendations(jobs, candidate, limit = 5) {
  const rankedJobs = rankJobsByRelevance(jobs, candidate);
  return rankedJobs.slice(0, limit);
}
