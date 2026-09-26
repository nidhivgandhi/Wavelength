// Hardcoded, deterministic emergency detection.
//
// This runs BEFORE any model call and is the ONLY thing that ever sets
// `emergency: true` in a response — the model is never asked to make this
// judgment and its output is never trusted for it, even implicitly. That's
// intentional: a fast/small model is not reliable enough for this call, and
// the failure mode we want is "flags something that isn't actually urgent"
// (annoying), never "misses something that is" because a model's confidence
// wavered under an unusual phrasing.
//
// This is deliberately a blunt instrument. Keyword/pattern matching will
// have false negatives on emergencies phrased in ways not covered here —
// that's a known, acknowledged limitation, not an oversight. Extend this
// list as new phrasing patterns are found in testing, rather than trying to
// make it "smart."

const EMERGENCY_PATTERNS = [
  // Cardiac / respiratory
  /chest pain/i,
  /crushing (chest|pressure)/i,
  /can'?t breathe/i,
  /difficulty breathing/i,
  /shortness of breath/i,
  /gasping for air/i,
  /turning blue/i,
  /lips? (turning|are|is) blue/i,

  // Neuro / stroke (FAST signs)
  /face (is |looks )?droop/i,
  /slurred speech/i,
  /sudden (numbness|weakness)/i,
  /can'?t (move|feel) (my |one )?(arm|leg|side|face)/i,
  /sudden (severe )?headache/i,
  /worst headache of my life/i,
  /sudden (loss of |blurry )?vision/i,
  /seizure/i,
  /convulsing/i,
  /unresponsive/i,
  /unconscious/i,
  /passed out/i,
  /fainted/i,

  // OB/GYN-specific emergencies
  /soaking (a |through a |one )?pad (an|every) hour/i,
  /heavy (vaginal )?bleeding/i,
  /bleeding through (a |my )?(pad|tampon|clothes)/i,
  /severe (pelvic|abdominal) pain/i,
  /sudden (severe )?abdominal pain/i,
  /baby('s| is)? not moving/i,
  /no fetal movement/i,
  /water(’|')?s? broke/i,
  /think i'?m (having a )?miscarriage/i,
  /ectopic/i,
  /severe swelling.*(face|hands)/i,

  // Allergic / anaphylaxis
  /throat (is |feels )?closing/i,
  /swelling of (the |my )?(throat|tongue|face)/i,
  /anaphyla/i,
  /can'?t swallow/i,

  // Mental health crisis
  /suicid/i,
  /kill(ing)? myself/i,
  /want(ing)? to die/i,
  /end(ing)?\s+(it all|my (own )?life)/i,
  /don'?t want to (live|be here)( anymore)?/i,
  /no reason to (live|go on)/i,
  /thoughts? of (suicide|dying|self[- ]?harm)/i,
  /hurt(ing)? myself/i,
  /self[- ]?harm/i,

  // Generic self-reported urgency
  /call (911|an ambulance)/i,
  /need (an )?ambulance/i,
  /this is an emergency/i,
  /going to (the )?(er|emergency room)/i,
];

export function checkEmergency(text) {
  if (typeof text !== 'string' || !text.trim()) return false;
  return EMERGENCY_PATTERNS.some((pattern) => pattern.test(text));
}

export const EMERGENCY_MESSAGE =
  'This may be a medical emergency. Please call 911 (or your local emergency number) or go to the nearest emergency room now — do not wait for an online response.';
