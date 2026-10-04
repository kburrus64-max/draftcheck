// SlopScore engine: deterministic detector for AI-writing patterns ("AI slop").
// Pattern taxonomy adapted from blader/humanizer (MIT) and petergyang/no-ai-slop (MIT), which both
// draw on Wikipedia's "Signs of AI writing". Regexes and scoring are original. Runs in browser and Node.

const W = { strong: 3, medium: 2, weak: 1 };

// [id, category, strength, label, hint, regexes[]]
const RULES = [
  ["fake_profound_end", "Staging", "strong", "Fake-profound ending", "End on the last concrete fact.", [
    /\b(?:the future (?:isn'?t coming|is (?:already )?here|is now|belongs to)|isn'?t the future[,.;]\s*it'?s|in a world where|the question isn'?t (?:if|whether)|the only question is|the choice is yours|the rest is history|exciting times (?:lie )?ahead|the future looks bright)\b/gi,
  ]],
  ["not_x_but_y", "Staging", "strong", "Not X, but Y", "Say the point directly. Keep a contrast only if someone actually believes the negative half.", [
    /\b(?:it'?s|it is|this is|this isn'?t|that'?s|that is)\s+not\s+(?:just\s+|only\s+|merely\s+|about\s+|simply\s+)?[^.;!?\n]{1,60}?[,;:—–]\s*(?:it'?s|it is|this is|that'?s|but)\b/gi,
    /\bnot\s+(?:just|only|merely|simply)\s+(?:about\s+)?[^.;!?\n]{1,60}?,?\s+but\s+(?:also\s+)?/gi,
    /\b(?:isn'?t|is not|wasn'?t|was not|doesn'?t|does not|aren'?t|are not)\s+(?:about\s+|just\s+)?[^.!?\n]{1,50}[.!?]\s+(?:It|This|That|They)(?:'s|'re| is| are| was| means)\b/g,
    /\bless\s+(?:about|a)\s+[^.!?\n]{1,40}\s+and\s+more\s+(?:about|a)\b/gi,
  ]],
  ["one_line_closer", "Staging", "strong", "Dramatic closer", "Cut closers that restate the paragraph. End on a fact.", [
    /\b(?:let that sink in|read that again|that'?s the (?:real )?(?:win|point|magic|secret|difference|whole thing)|that distinction matters|and that changes everything|this changes everything|and that'?s the point|that'?s it\. that'?s the)\b/gi,
    /(?:^|[.!?]\s+)(?:Every\.\s+Single\.\s+\w+\.)/g,
  ]],
  ["fragment_row", "Staging", "strong", "Row of dramatic fragments", "Merge fragments into one sentence with a specific claim.", []],
  ["deep_saying", "Staging", "strong", "Sounds-deep saying", "Replace the aphorism with the specific claim.", [
    /\b(?:the real question is|at its core|what really matters|the heart of the matter|the deeper (?:issue|truth)|fundamentally,|in reality,|is the new (?:oil|currency|black))\b/gi,
    /\bis(?:n'?t| not)\s+a\s+\w+[,;]?\s+(?:it'?s|but)\s+a\s+(?:mirror|lens|window|mindset|journey|conversation)\b/gi,
  ]],
  ["faux_insight", "Staging", "strong", "Faux-insight setup", "Drop the setup and state the insight.", [
    /\b(?:what (?:nobody|no one) (?:tells you|talks about)|the part (?:everyone|nobody|most people) miss(?:es)?|most people don'?t (?:realize|know)|here'?s what most people|nobody talks about|the secret (?:nobody|no one))\b/gi,
  ]],
  ["run_up", "Staging", "strong", "Staged run-up", "Remove the announcement and make the point.", [
    /\b(?:let'?s dive (?:in|into|deeper)|let'?s explore|let'?s break (?:it|this|that) down|here'?s what you need to know|without further ado|here'?s the thing|the thing is,|let'?s be honest|real talk|buckle up|in today'?s (?:fast-paced|digital|ever-changing|rapidly evolving)\b[^.]{0,30}|in the ever-evolving)\b/gi,
    /(?:^|[.!?]\s+)(?:Honestly\?|Look,|The kicker\?|The result\?|The catch\?|The answer\?)/gm,
  ]],
  ["colon_reveal", "Staging", "medium", "Colon reveal", "Write the sentence normally instead of staging a reveal.", [
    /\b(?:the (?:best|worst|real|wild|crazy|scary) part|the kicker|the catch|the twist|the truth|the result|the secret|the lesson|the takeaway|the bottom line|the irony|the problem|my take)\s*:\s/gi,
  ]],
  ["strawman", "Staging", "strong", "Arguing with no one", "Remove defenses against objections nobody raised.", [
    /\b(?:don'?t get me wrong|to be clear,|i'?m not saying|this is not to say|this isn'?t to say|you might think|one might be tempted|it would be easy to (?:just )?|some might say|a tempting approach would be)\b/gi,
  ]],
  ["hedging", "Rhythm", "medium", "Hedging opener", "Delete the throat-clearing and state the claim; keep a qualifier only where the doubt is real.", [
    /\b(?:it(?:'?s| is) (?:important|worth|crucial|essential) to (?:note|remember|mention|understand|consider|keep in mind) that|it should be noted that|it is (?:important|worth) (?:noting|mentioning) that|generally speaking,|could potentially|may potentially|might potentially|to some extent,|in many ways,|arguably,)/gi,
  ]],
  ["triad", "Rhythm", "weak", "Forced triad", "Check each item adds a distinct idea; vary the structure.", [
    /\b\w+(?:\s\w+)?,\s\w+(?:\s\w+)?,\s(?:and|or)\s\w+(?:\s\w+)?\b(?=[.!?,;])/g,
  ]],
  ["dash", "Rhythm", "weak", "Em dash", "Choose a period, comma, colon or parentheses instead.", [/\s?—\s?|\s–\s|\s--\s/g]],
  ["inflated_significance", "Inflation", "strong", "Inflated significance", "Keep the fact, drop the claim that it marks a turning point.", [
    /\b(?:stands as a testament|a testament to|marks? a (?:pivotal|significant|major|crucial) (?:moment|milestone|shift|turning point)|plays? a (?:key|crucial|pivotal|vital|significant) role|setting the stage for|paving the way for|indelible mark|lasting legacy|enduring legacy|reflects a broader|underscores (?:the|its) importance|a new era (?:of|for)|redefin(?:e|es|ing) what(?:'s| is) possible)\b/gi,
  ]],
  ["ing_rider", "Inflation", "medium", "Shallow -ing rider", "Cut the -ing tail unless it states a supported fact.", [
    /,\s(?:highlighting|underscoring|emphasizing|showcasing|reflecting|symbolizing|fostering|cultivating|ensuring|contributing to|solidifying|cementing|demonstrating)\s/gi,
  ]],
  ["sales_language", "Inflation", "medium", "Sales language", "Say what the thing is.", [
    /\b(?:nestled|in the heart of|breathtaking|must-visit|stunning|rich (?:cultural )?heritage|renowned|diverse array|a wide array|world-class|state-of-the-art|unforgettable|unlock(?:ing)? new possibilities)\b/gi,
  ]],
  ["borrowed_authority", "Inflation", "medium", "Borrowed authority", "Name the source and what it said, or cut the claim.", [
    /\b(?:experts (?:agree|argue|believe|say|suggest)|studies (?:show|suggest|have shown)|research (?:shows|suggests)|industry (?:reports|experts)|many (?:experts|observers) (?:believe|say)|it is widely (?:believed|accepted))\b/gi,
  ]],
  ["copula_avoidance", "Inflation", "weak", "Avoiding is/has", "Use is, are, has.", [
    /\b(?:serves as|stands as|functions as|acts as a testament|boasts (?:a|an|over|more))\b/gi,
  ]],
  ["ai_vocab", "Inflation", "medium", "Overused AI word", "Use a plainer word, or cut it.", [
    /\b(?:delve[sd]?|delving|tapestry|testament|pivotal|intricate|intricacies|meticulous(?:ly)?|showcas(?:e|es|ed|ing)|underscor(?:e|es|ed|ing)|bolster(?:s|ed|ing)?|garner(?:s|ed|ing)?|interplay|vibrant|enduring|crucial|seamless(?:ly)?|game[- ]changer|revolutioniz(?:e|es|ed|ing)|unlock(?:s|ing)? the (?:power|potential|full)|harness(?:es|ing)? the power|elevate your|empower(?:s|ing)?|leverag(?:e|es|ed|ing)|realm|embark(?:s|ed|ing)?|navigat(?:e|ing) the (?:complexities|landscape|world)|ever-evolving|cutting-edge|unparalleled|transformative|synergy|holistic|paradigm shift|deep dive|landscape of|robust and scalable|supercharge|fast-paced world|moreover|furthermore|streamlin(?:e|es|ed|ing)|enhanc(?:e|es|ed|ing) (?:productivity|efficiency|the|your|user)|well-positioned|it is (?:clear|evident|worth noting) that|transform(?:s|ing)? the way|new opportunities|embrac(?:e|es|ing) (?:the|change|ai|innovation)|thrive in)\b/gi,
  ]],
  ["bold_labels", "Formatting", "medium", "Bold label lists", "Turn labeled bullets into prose when labels add nothing.", [/^\s*(?:[-*•]|\d+\.)\s+\*\*[^*\n]{1,40}:?\*\*:?/gm]],
  ["emoji_bullets", "Formatting", "medium", "Emoji/arrow decoration", "Remove decorative emojis and arrows.", [/^[\s#>*-]*(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\uFE0F?|→|👉)/gmu]],
  ["chatbot_residue", "Leftovers", "strong", "Chatbot residue", "Delete the wrapper; keep the content.", [
    /\b(?:i hope this helps|great question|certainly!|of course!|absolutely!|you'?re absolutely right|let me know if you(?:'d| would)? (?:like|want|need)|would you like me to|want me to|feel free to (?:reach out|ask|let me know)|happy to help|as an ai(?: language model)?|i'?d be happy to|here(?:'s| is) (?:a|an|the) (?:revised|updated|improved|polished) version)\b/gi,
  ]],
  ["knowledge_limit", "Leftovers", "strong", "Knowledge-limit disclaimer", "State what the source does not show, or cut it.", [
    /\b(?:as of my (?:last|knowledge)|up to my last (?:training|update)|my knowledge cutoff|while specific details (?:are|about)|based on (?:the )?available information|not widely (?:documented|disclosed)|maintains a low profile)\b/gi,
  ]],
];

const SENT_SPLIT = /[^.!?\n]+[.!?]+|[^.!?\n]+$/g;

export function analyze(text, opts = {}) {
  text = String(text || "");
  const maxLen = opts.maxLength || 200000;
  if (text.length > maxLen) text = text.slice(0, maxLen);
  if (opts.ignoreQuoted) {
    // blank out quoted passages (examples, testimonials) while keeping offsets stable
    text = text.replace(/"[^"\n]{1,240}"|\u201c[^\u201d\n]{1,240}\u201d/g, (m) => m[0] + " ".repeat(m.length - 2) + m[m.length - 1]);
  }
  const words = (text.match(/\b[\w'’-]+\b/g) || []).length;
  const matches = [];
  const occupied = [];
  const overlaps = (s, e) => occupied.some(([a, b]) => s < b && e > a);
  for (const [id, category, strength, label, hint, regs] of RULES) {
    for (const re of regs) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        let s = m.index, e = m.index + m[0].length;
        // trim leading punctuation/space from highlight
        while (s < e && /[\s.!?]/.test(text[s])) s++;
        if (id !== "dash" && overlaps(s, e)) continue;
        occupied.push([s, e]);
        matches.push({ id, category, strength, label, hint, start: s, end: e, text: text.slice(s, e) });
      }
    }
  }
  // fragment rows: 3+ consecutive sentences of <= 4 words
  const sents = [];
  let mm; SENT_SPLIT.lastIndex = 0;
  while ((mm = SENT_SPLIT.exec(text))) { const t = mm[0]; const lead = t.length - t.trimStart().length; const tt = t.trim(); const structural = !/[.!?]$/.test(tt) || !/[A-Za-z]{3,}/.test(tt) || /^(\d+[.)]|[-*#>|•])/.test(tt) || /^\d+[.)]?$/.test(tt) || /\*\*|:\s|\|/.test(tt); sents.push({ s: mm.index + lead, e: mm.index + t.length, w: structural ? 0 : (t.match(/\b[\w'’-]+\b/g) || []).length }); }
  // a blank line between two sentences starts a new block (website sections, headings, buttons)
  for (let k = 1; k < sents.length; k++) sents[k].gapBlank = /\n\s*\n/.test(text.slice(sents[k - 1].e, sents[k].s));
  const frag = (x) => x.w > 0 && x.w <= 4;
  const fr = RULES.find(r => r[0] === "fragment_row");
  const pushRow = (i, j) => matches.push({ id: fr[0], category: fr[1], strength: fr[2], label: fr[3], hint: fr[4], start: sents[i].s, end: sents[j - 1].e, text: text.slice(sents[i].s, sents[j - 1].e) });
  for (let i = 0; i + 2 < sents.length; i++) {
    // same paragraph: 3+ fragments in a row ("Fast. Simple. Free.")
    let j = i; while (j < sents.length && frag(sents[j]) && (j === i || !sents[j].gapBlank)) j++;
    if (j - i >= 3) { pushRow(i, j); i = j - 1; continue; }
    // one-line-per-paragraph style: 4+ blocks that are each a single fragment ending in a period
    const solo = (k) => frag(sents[k]) && /\.$/.test(text.slice(sents[k].s, sents[k].e).trim()) && (k === 0 || sents[k].gapBlank) && (k + 1 >= sents.length || sents[k + 1].gapBlank);
    j = i; while (j < sents.length && solo(j)) j++;
    if (j - i >= 4) { pushRow(i, j); i = j - 1; }
  }
  matches.sort((a, b) => a.start - b.start);

  // scoring: weak tells only count when other tells exist; dashes count by rate
  const strongMedium = matches.filter(m => m.strength !== "weak").length;
  let points = 0;
  const dashCount = matches.filter(m => m.id === "dash").length;
  const triads = matches.filter(m => m.id === "triad").length;
  for (const m of matches) {
    if (m.id === "dash") continue;
    if (m.id === "triad") continue;
    if (m.strength === "weak" && strongMedium === 0) continue;
    points += W[m.strength];
  }
  const per100 = Math.max(words, 100) / 100;
  const dashRate = dashCount / per100;
  if (strongMedium ? dashRate > 0.5 : dashRate >= 2) points += Math.min(6, dashRate * 1.5) * per100 * (strongMedium ? 1 : 0.5);
  if (triads >= 2) points += Math.min(4, triads) * (strongMedium ? 1 : 0.5);
  const density = points / per100;
  const score = Math.round(100 * (1 - Math.exp(-density / 5)));
  const label = score >= 70 ? "Pure slop" : score >= 45 ? "Sloppy" : score >= 20 ? "A little sloppy" : "Reads human";
  const byCategory = {}, byPattern = {};
  for (const m of matches) { byCategory[m.category] = (byCategory[m.category] || 0) + 1; byPattern[m.id] = byPattern[m.id] || { label: m.label, count: 0, hint: m.hint, strength: m.strength }; byPattern[m.id].count++; }
  return { score, label, words, tell_count: matches.length, density: Math.round(density * 100) / 100, by_category: byCategory, by_pattern: byPattern, matches };
}

export const PATTERNS = RULES.map(([id, category, strength, label, hint]) => ({ id, category, strength, label, hint }));
