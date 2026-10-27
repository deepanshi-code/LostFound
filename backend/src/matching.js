// Simple, explainable matching between a lost item and found items (or vice versa).
// Score = keyword overlap in title/description + bonuses for same location and close dates.
// Deliberately not ML: it is transparent, needs no training data, and is easy to evaluate.

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'my', 'is', 'it', 'with',
  'near', 'found', 'lost', 'i', 'was', 'for', 'from', 'this', 'that', 'some', 'one',
]);

export function tokenize(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
  );
}

function daysBetween(a, b) {
  return Math.abs(new Date(a) - new Date(b)) / 86_400_000;
}

export function scoreMatch(item, candidate) {
  const a = tokenize(`${item.title} ${item.description}`);
  const b = tokenize(`${candidate.title} ${candidate.description}`);
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  const union = a.size + b.size - shared;
  const keyword = union ? shared / union : 0; // Jaccard similarity, 0..1

  const sameLocation =
    tokenize(item.location).size > 0 &&
    [...tokenize(item.location)].some((w) => tokenize(candidate.location).has(w));

  const days = daysBetween(item.date_occurred, candidate.date_occurred);
  const dateBonus = days <= 2 ? 0.15 : days <= 7 ? 0.05 : 0;

  return keyword * 0.7 + (sameLocation ? 0.15 : 0) + dateBonus;
}

// Candidates must already be filtered to: opposite type, same category, status open.
export function findMatches(item, candidates, limit = 5, minScore = 0.1) {
  return candidates
    .map((c) => ({ ...c, match_score: Math.round(scoreMatch(item, c) * 100) / 100 }))
    .filter((c) => c.match_score >= minScore)
    .sort((x, y) => y.match_score - x.match_score)
    .slice(0, limit);
}
