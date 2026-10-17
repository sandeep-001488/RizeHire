/**
 * TF-IDF text matching (Tier 3 of the recommendation pipeline).
 *
 * Pure JavaScript, no dependencies. Mirrors scikit-learn's TfidfVectorizer
 * defaults closely enough to explain in an interview:
 *   tf        = raw term count in the document
 *   idf       = ln((1 + N) / (1 + df)) + 1          (smooth_idf=True)
 *   weight    = tf * idf, then L2-normalised          (norm='l2')
 *   similarity = cosine(resume_vector, job_vector)
 *
 * Gemini (Tier 1) and the BERT cross-encoder (Tier 2) capture meaning;
 * TF-IDF captures lexical overlap weighted by how rare each term is across
 * the job corpus, so a term like "kubernetes" counts more than "engineer".
 */

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have",
  "in", "is", "it", "its", "of", "on", "or", "that", "the", "this", "to", "was",
  "were", "will", "with", "you", "your", "we", "our", "they", "their", "but",
  "not", "can", "if", "than", "then", "there", "these", "those", "into", "about",
  "who", "which", "what", "when", "where", "how", "all", "any", "each", "more",
  "most", "other", "some", "such", "no", "nor", "only", "own", "same", "so",
  "too", "very", "just", "also", "both", "per", "via", "etc",
]);

/**
 * Lowercase, split on whitespace/punctuation while keeping characters that are
 * meaningful inside tech tokens ("c++", "c#", "node.js", ".net"), strip
 * stopwords and 1-char tokens.
 */
export function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, "")) // trim stray dots ("node.js." -> "node.js")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export class TfidfVectorizer {
  constructor() {
    this.idf = new Map();
    this.docCount = 0;
  }

  fit(documents) {
    const df = new Map();
    this.docCount = documents.length;

    for (const doc of documents) {
      for (const term of new Set(tokenize(doc))) {
        df.set(term, (df.get(term) || 0) + 1);
      }
    }

    this.idf = new Map();
    for (const [term, count] of df) {
      this.idf.set(term, Math.log((1 + this.docCount) / (1 + count)) + 1);
    }
    return this;
  }

  /** Returns a sparse Map<term, l2-normalised tf-idf weight>. */
  transform(document) {
    const tf = new Map();
    for (const term of tokenize(document)) {
      if (!this.idf.has(term)) continue; // out-of-vocabulary terms carry no signal
      tf.set(term, (tf.get(term) || 0) + 1);
    }

    let norm = 0;
    const vector = new Map();
    for (const [term, count] of tf) {
      const w = count * this.idf.get(term);
      vector.set(term, w);
      norm += w * w;
    }

    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (const [term, w] of vector) vector.set(term, w / norm);
    }
    return vector;
  }
}

export function cosineSimilarity(a, b) {
  if (!a?.size || !b?.size) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, w] of small) {
    const other = large.get(term);
    if (other) dot += w * other;
  }
  // Vectors are already L2-normalised, so dot product == cosine.
  return Math.max(0, Math.min(1, dot));
}

export function buildCandidateText(user = {}) {
  const parsedResume = user.parsedResume || {};
  const skills = [
    ...(parsedResume.skills || []),
    ...(parsedResume.technicalSkills || []),
    ...(user.skills || []),
  ];

  return [
    parsedResume.parsed_summary || "",
    skills.length ? `Skills: ${[...new Set(skills)].join(", ")}` : "",
    parsedResume.yearsOfExperience ? `Experience: ${parsedResume.yearsOfExperience} years` : "",
    parsedResume.education?.length ? `Education: ${parsedResume.education.join(", ")}` : "",
    user.bio || "",
  ]
    .filter(Boolean)
    .join(". ");
}

export function buildJobText(job = {}) {
  return [
    job.title || "",
    job.category || "",
    (job.skills || []).join(", "),
    job.description || "",
  ]
    .filter(Boolean)
    .join(". ");
}

/**
 * Fit TF-IDF over the job corpus (+ the candidate text so resume-only terms
 * still get an idf) and score every job against the candidate.
 *
 * @returns {Map<string, number>} jobId -> similarity on a 0-100 scale
 */
export function rankJobsByTfidf(candidateText, jobs = []) {
  const scores = new Map();
  if (!jobs.length) return scores;

  const jobTexts = jobs.map(buildJobText);
  const candidateTokens = tokenize(candidateText);

  if (candidateTokens.length === 0) {
    for (const job of jobs) scores.set(String(job._id), 0);
    return scores;
  }

  const vectorizer = new TfidfVectorizer().fit([...jobTexts, candidateText]);
  const candidateVector = vectorizer.transform(candidateText);

  jobs.forEach((job, i) => {
    const sim = cosineSimilarity(candidateVector, vectorizer.transform(jobTexts[i]));
    scores.set(String(job._id), Math.round(sim * 100));
  });

  return scores;
}

export default {
  tokenize,
  TfidfVectorizer,
  cosineSimilarity,
  buildCandidateText,
  buildJobText,
  rankJobsByTfidf,
};
