// Generates lib/prayer/passages.generated.ts.
// Scripture text is copied programmatically from a public-domain King James Version JSON
// (https://github.com/aruljohn/Bible-kjv) so it is never typed or paraphrased by hand.
// Everything else here (emotions, keywords, `plain`, `why`) is AI-assisted editorial content,
// shown to users as such, and should be reviewed by a qualified person before release.
// Usage: node scripts/build-kjv-passages.mjs   (needs network access to raw.githubusercontent.com)
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = "https://raw.githubusercontent.com/aruljohn/Bible-kjv/master/";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "prayer", "passages.generated.ts");

// [id, file, display book, chapter, from, to, emotions, keywords, plain paraphrase, why it is relevant]
const SPEC = [
  ["phil-4-6-7", "Philippians", "Philippians", 4, 6, 7, ["anxious"], "worry worried anxiety stress fear pray peace overwhelmed nervous",
    "Instead of being anxious, bring every need to God in prayer with thanks, and God's peace will guard your heart and mind.",
    "It speaks directly to worry: it invites you to bring each concern to God, and it promises God's peace rather than the removal of every problem."],
  ["1pet-5-7", "1Peter", "1 Peter", 5, 7, 7, ["anxious"], "worry anxiety care burden stress cast",
    "You can hand your worries over to God because he cares about you.",
    "It gives a simple action for anxious moments, handing your cares to God, and gives the reason: he cares for you."],
  ["matt-6-34", "Matthew", "Matthew", 6, 34, 34, ["anxious"], "tomorrow future worry anxiety uncertain plan",
    "Don't borrow tomorrow's worries; each day has enough trouble of its own.",
    "It gently releases you from carrying the whole future today, which may help if your mind keeps running ahead."],
  ["isa-41-10", "Isaiah", "Isaiah", 41, 10, 10, ["anxious", "lonely"], "afraid fear scared alone strength help dismayed",
    "Do not be afraid, God says: he is with you, strengthens you and helps you.",
    "It answers fear with God's presence and help. It was spoken to God's people in a hard season, and offers comfort rather than a guaranteed result."],
  ["ps-94-19", "Psalms", "Psalm", 94, 19, 19, ["anxious"], "anxious thoughts worry mind comfort restless racing",
    "When many worries filled my mind, God's comfort brought me joy.",
    "It names the experience of a crowded, anxious mind and says God's comfort can reach it."],
  ["john-14-27", "John", "John", 14, 27, 27, ["anxious"], "peace troubled afraid heart calm anxious",
    "Jesus leaves his peace with his followers, a peace unlike the world's, and tells them not to let their hearts be troubled or afraid.",
    "In a troubled moment it offers Christ's peace as a gift to receive, not something you must produce yourself."],
  ["isa-26-3", "Isaiah", "Isaiah", 26, 3, 3, ["anxious"], "peace mind trust steady calm anxious thoughts",
    "God keeps in perfect peace those whose minds stay on him because they trust him.",
    "It connects steady peace with turning your attention and trust toward God."],
  ["ps-55-22", "Psalms", "Psalm", 55, 22, 22, ["anxious", "sad"], "burden burdens heavy weight sustain worry load",
    "Give your burden to the Lord and he will sustain you; he will not let the righteous be shaken.",
    "It invites you to set a heavy load down with God and says he will hold you up."],
  ["ps-62-8", "Psalms", "Psalm", 62, 8, 8, ["anxious", "sad"], "trust pour heart refuge honest prayer overwhelmed",
    "Trust God at all times and pour out your heart to him, for he is a refuge.",
    "It gives permission to be completely honest with God in prayer, which fits a request about something heavy."],
  ["ps-34-18", "Psalms", "Psalm", 34, 18, 18, ["sad"], "brokenhearted broken heart grief crushed sorrow hurt pain depressed",
    "The Lord is close to the brokenhearted and rescues those whose spirits are crushed.",
    "It says God is near to people in sorrow, which matters when pain makes God feel far away."],
  ["ps-147-3", "Psalms", "Psalm", 147, 3, 3, ["sad"], "heal healing wounds hurt brokenhearted pain betrayal sorrow",
    "God heals the brokenhearted and bandages their wounds.",
    "It describes God as tender toward emotional wounds."],
  ["matt-5-4", "Matthew", "Matthew", 5, 4, 4, ["sad"], "mourn mourning grief loss death comfort funeral passed away",
    "Those who mourn are blessed, because they will be comforted.",
    "Jesus speaks of comfort for people who grieve, treating grief as something God notices."],
  ["rev-21-4", "Revelation", "Revelation", 21, 4, 4, ["sad", "hopeful"], "tears death grief loss pain mourning heaven sorrow",
    "In the Bible's picture of the future, God wipes away every tear, and death, sorrow and pain come to an end.",
    "It offers hope for grief by pointing to God's promised future, without explaining away present pain."],
  ["ps-30-5", "Psalms", "Psalm", 30, 5, 5, ["sad", "hopeful"], "weeping night morning joy sorrow season hard time",
    "Sorrow may last for a night, but joy comes in the morning.",
    "It describes grief as a season and expresses hope that it will not be the last word."],
  ["ps-23-1-3", "Psalms", "Psalm", 23, 1, 3, ["anxious", "confused"], "shepherd rest provide need restore guide tired lead",
    "The Lord is like a shepherd who provides, gives rest and restores the soul.",
    "It pictures God's care as that of a shepherd who provides for and restores his sheep."],
  ["ps-23-4", "Psalms", "Psalm", 23, 4, 4, ["anxious", "sad", "lonely"], "valley death shadow fear comfort presence illness diagnosis hospital dying",
    "Even in the darkest valley the writer is not afraid, because God is with him.",
    "It is about God's presence in the hardest places, which suits fear, illness or loss."],
  ["ps-46-1-2", "Psalms", "Psalm", 46, 1, 2, ["anxious"], "refuge strength trouble help fear crisis storm chaos",
    "God is a refuge and strength and a very present help in trouble, so we need not fear.",
    "It describes God as a steady refuge when things around you feel unstable."],
  ["ps-27-1", "Psalms", "Psalm", 27, 1, 1, ["anxious"], "fear afraid light salvation strength danger scared",
    "The Lord is my light and salvation, so whom should I fear?",
    "It meets fear with confidence in who God is."],
  ["matt-11-28-30", "Matthew", "Matthew", 11, 28, 30, ["sad", "anxious"], "tired weary exhausted burden rest burnout heavy overwhelmed",
    "Jesus invites weary and burdened people to come to him for rest.",
    "It is a direct invitation to tired people, so it fits exhaustion and overload."],
  ["ps-107-1", "Psalms", "Psalm", 107, 1, 1, ["grateful"], "thank thanks thankful grateful goodness mercy blessing",
    "Give thanks to the Lord, because he is good and his mercy lasts forever.",
    "A short, simple call to thanksgiving grounded in God's goodness."],
  ["1thess-5-16-18", "1Thessalonians", "1 Thessalonians", 5, 16, 18, ["grateful"], "rejoice pray thanks thankful grateful joy always",
    "Rejoice, pray continually and give thanks in every circumstance.",
    "It ties prayer and gratitude together as an ongoing habit."],
  ["ps-100-4-5", "Psalms", "Psalm", 100, 4, 5, ["grateful"], "thanksgiving praise gratitude gratefully goodness mercy truth",
    "Come before God with thanks and praise, for he is good and faithful to every generation.",
    "It invites you to move toward God with thanks, which suits a grateful heart."],
  ["ps-103-2", "Psalms", "Psalm", 103, 2, 2, ["grateful"], "bless remember benefits blessings thankful gratitude forget",
    "Praise the Lord, and do not forget all the good he has done for you.",
    "It encourages remembering God's kindness, which is the heart of gratitude."],
  ["ps-118-24", "Psalms", "Psalm", 118, 24, 24, ["grateful", "hopeful"], "today day rejoice glad joy new morning celebrate",
    "This day belongs to the Lord, so let us rejoice and be glad in it.",
    "A simple verse for receiving the present day with gladness."],
  ["deut-31-6", "Deuteronomy", "Deuteronomy", 31, 6, 6, ["lonely", "anxious"], "strong courage fear alone forsake left abandoned with you",
    "Be strong and courageous, for the Lord goes with you and will not leave or abandon you.",
    "It was spoken to Israel facing a hard future, and it stresses that God's presence goes with his people."],
  ["ps-68-6", "Psalms", "Psalm", 68, 6, 6, ["lonely"], "lonely alone solitary family isolated friendless belonging prison lonely",
    "God places lonely people into families.",
    "It names loneliness and says God cares about belonging, which may also encourage reaching out to others."],
  ["ps-139-7-10", "Psalms", "Psalm", 139, 7, 10, ["lonely", "distant"], "presence everywhere far away alone hide distant dark present",
    "There is nowhere you can go where God is not present and holding you.",
    "It speaks to the feeling that God is far away by saying he is present even where you cannot sense him."],
  ["rom-8-38-39", "Romans", "Romans", 8, 38, 39, ["lonely", "distant"], "love separate nothing unloved abandoned doubt worth death life",
    "Nothing, whether life or death, can separate believers from God's love in Christ.",
    "It addresses the fear of being cut off from God's love."],
  ["prov-3-5-6", "Proverbs", "Proverbs", 3, 5, 6, ["confused"], "trust decision decisions direction choice lost understanding path future career",
    "Trust God fully, don't rely only on your own understanding, and he will guide your path.",
    "It is a classic verse for decisions, inviting trust and attention to God. It does not promise a particular outcome."],
  ["james-1-5", "James", "James", 1, 5, 5, ["confused"], "wisdom ask confused uncertain decision unsure advice answer",
    "If you lack wisdom, ask God, who gives generously without scolding.",
    "It tells you that it is fine to ask God for wisdom and that he is generous."],
  ["ps-119-105", "Psalms", "Psalm", 119, 105, 105, ["confused"], "lamp light path guidance direction lost dark way",
    "God's word is like a lamp that lights the next steps on the path.",
    "It describes Scripture as light for the next step, not the whole road."],
  ["isa-30-21", "Isaiah", "Isaiah", 30, 21, 21, ["confused"], "guidance direction turn voice way path lost choice",
    "God's people are promised guidance as they walk: \"This is the way.\"",
    "It speaks of God guiding people who are unsure which way to turn."],
  ["ps-32-8", "Psalms", "Psalm", 32, 8, 8, ["confused"], "instruct teach guide eye direction counsel wisdom",
    "God promises to instruct and counsel the one who is seeking direction.",
    "It portrays God as a caring guide for someone who needs direction."],
  ["rom-15-13", "Romans", "Romans", 15, 13, 13, ["hopeful"], "hope joy peace believing spirit overflow trust",
    "May the God of hope fill you with joy and peace as you trust him.",
    "It is a blessing for hope, naming God as its source."],
  ["jer-29-11", "Jeremiah", "Jeremiah", 29, 11, 11, ["hopeful", "confused"], "plans future hope expected end purpose waiting",
    "God told his exiled people he had plans for their welfare and a future with hope.",
    "It was written to Israel in exile, not as a personal guarantee, so it is offered as a sign of God's good intentions toward his people and not a promise about any specific outcome."],
  ["isa-40-31", "Isaiah", "Isaiah", 40, 31, 31, ["hopeful", "sad"], "wait renew strength tired weary eagles faint exhausted",
    "Those who wait on the Lord find their strength renewed.",
    "It speaks of renewed strength for people who are tired and waiting."],
  ["lam-3-22-23", "Lamentations", "Lamentations", 3, 22, 23, ["hopeful", "sad"], "mercies new morning faithful compassion fail grief faithfulness",
    "God's mercies never run out; they are new every morning, and his faithfulness is great.",
    "It was written in the middle of grief and still affirms God's faithfulness, so it can sit alongside sadness."],
  ["rom-8-28", "Romans", "Romans", 8, 28, 28, ["hopeful"], "good purpose hardship suffering trouble together called love",
    "For those who love God, he works in all things for good.",
    "It expresses trust that God is at work even in hardship. It does not say that hard things are themselves good."],
  ["ps-31-24", "Psalms", "Psalm", 31, 24, 24, ["hopeful"], "courage strength hope wait heart strengthen",
    "Be courageous, all who hope in the Lord, and he will strengthen your heart.",
    "It encourages people who are hoping and waiting."],
  ["ps-130-5", "Psalms", "Psalm", 130, 5, 5, ["hopeful"], "wait waiting hope word patience soul",
    "I wait for the Lord, and in his word I hope.",
    "It voices patient waiting, which suits seasons where nothing seems to change."],
  ["james-4-8", "James", "James", 4, 8, 8, ["distant"], "draw near close distance far away cold dry faith",
    "Draw near to God and he will draw near to you.",
    "It offers a small step toward God as an answer to distance. The verse goes on to a call to repentance; the opening promise is the part this note highlights."],
  ["jer-29-13", "Jeremiah", "Jeremiah", 29, 13, 13, ["distant"], "seek search heart find doubt distance seeking",
    "You will find God when you seek him with all your heart.",
    "It encourages honest seeking and says that seeking is not wasted."],
  ["ps-51-10-12", "Psalms", "Psalm", 51, 10, 12, ["distant"], "clean heart renew spirit restore guilt shame sin forgive joy",
    "A prayer for a clean heart, a renewed spirit, and the restored joy of being close to God.",
    "It is an honest prayer for renewal after failure, and it models how to ask."],
  ["1john-1-9", "1John", "1 John", 1, 9, 9, ["distant"], "forgive forgiveness confess guilt sin shame cleanse",
    "If we confess our sins, God is faithful and just to forgive and cleanse us.",
    "It speaks to guilt by pointing to God's faithfulness to forgive."],
  ["ps-42-1-2", "Psalms", "Psalm", 42, 1, 2, ["distant", "sad"], "thirst longing soul pant dry seeking God absent",
    "The writer longs for God like a deer longing for water.",
    "It gives words to longing for God, which fits someone who feels spiritually dry."],
  ["heb-4-16", "Hebrews", "Hebrews", 4, 16, 16, ["distant", "anxious"], "grace mercy help throne boldly need pray approach",
    "You can come to God with confidence to receive mercy and help when you need it.",
    "It invites you to approach God in need rather than waiting until you feel ready."],
  ["2cor-12-9", "2Corinthians", "2 Corinthians", 12, 9, 9, ["sad", "anxious"], "weak weakness struggle strength grace enough limit illness failing",
    "God's grace is enough, and his power shows up in human weakness.",
    "It speaks to feeling inadequate or limited."],
  ["ps-73-26", "Psalms", "Psalm", 73, 26, 26, ["sad"], "health illness sick flesh heart fails strength portion body pain",
    "Even when my body and heart fail, God is my strength.",
    "It acknowledges physical or emotional failing and points to God as strength."],
  ["josh-1-9", "Joshua", "Joshua", 1, 9, 9, ["anxious", "hopeful"], "courage strong new change start move job exam afraid begin",
    "Be strong and courageous, do not be afraid, for the Lord your God is with you wherever you go.",
    "It was said to Joshua at the start of a daunting task. It fits new beginnings and change."],
  ["ps-121-1-2", "Psalms", "Psalm", 121, 1, 2, ["anxious", "confused"], "help need look hills maker heaven earth",
    "My help comes from the Lord, who made heaven and earth.",
    "It points to God as the source of help when you are looking for it."],
  ["matt-6-26", "Matthew", "Matthew", 6, 26, 26, ["anxious"], "money finances job provision food bills need worth birds provide",
    "God feeds the birds, and you are worth more than they are.",
    "It invites trust in God's care for daily needs. It does not promise any particular financial outcome."],
  ["rom-12-18", "Romans", "Romans", 12, 18, 18, ["anxious"], "peace conflict argument family relationship peaceably fight quarrel",
    "As far as it depends on you, live at peace with everyone.",
    "It is practical guidance for strained relationships, and it acknowledges that you can only do your part."],
  ["eph-4-32", "Ephesians", "Ephesians", 4, 32, 32, ["sad"], "forgive forgiveness kind hurt betrayal bitterness anger resentment",
    "Be kind and tender-hearted, forgiving one another as God in Christ forgave you.",
    "It addresses forgiveness after being hurt, grounding it in the forgiveness God has shown."],
];

const cache = new Map();
async function book(file) {
  if (!cache.has(file)) {
    const r = await fetch(`${SRC}${file}.json`);
    if (!r.ok) throw new Error(`Could not fetch ${file}: ${r.status}`);
    cache.set(file, await r.json());
  }
  return cache.get(file);
}

const out = [];
const ids = new Set();
for (const [id, file, name, chapter, from, to, emotions, keywords, plain, why] of SPEC) {
  if (ids.has(id)) throw new Error(`duplicate id ${id}`);
  ids.add(id);
  const b = await book(file);
  const ch = b.chapters.find((c) => c.chapter === String(chapter));
  if (!ch) throw new Error(`${id}: chapter missing`);
  const verses = [];
  for (let v = from; v <= to; v++) {
    const found = ch.verses.find((x) => x.verse === String(v));
    if (!found) throw new Error(`${id}: verse ${v} missing`);
    verses.push({ n: v, text: found.text.replace(/^#\s*/, "").trim() });
  }
  out.push({
    id, book: name, chapter, from, to,
    ref: `${name} ${chapter}:${from}${to !== from ? "–" + to : ""}`,
    translation: "KJV", verses, emotions, keywords: keywords.split(" "), plain, why,
  });
}

const header = `// GENERATED by scripts/build-kjv-passages.mjs — do not edit by hand.
// Scripture text: King James Version (public domain), copied programmatically from
// https://github.com/aruljohn/Bible-kjv. The fields plain/why/emotions/keywords are AI-assisted
// editorial content and should be reviewed by a qualified person before release.
import type { Passage } from "./types";

export const PASSAGES: Passage[] = `;
writeFileSync(OUT, header + JSON.stringify(out, null, 2) + ";\n");
console.log(`Wrote ${out.length} passages to ${OUT}`);
