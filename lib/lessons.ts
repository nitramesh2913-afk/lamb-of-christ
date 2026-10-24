// Scripture text: King James Version (public domain), verified against a public-domain source.
// Commentary below is AI-assisted SAMPLE content, shown separately from Scripture and
// should be reviewed by a qualified person before release.
export type Level = "beginner" | "intermediate" | "indepth";

export interface QuizQ { q: string; options: string[]; answer: number; why: string }

export interface Lesson {
  book: string; chapter: number; title: string;
  ref: string; translation: "KJV";
  verses: { n: number; text: string }[];
  explanation: Record<Level, string>;
  context: string;
  keyIdeas: string[];
  teaches: string;
  reflection: string[];
  meditation: string;
  prayer: string;
  quiz: QuizQ[];
}

export const LESSONS: Lesson[] = [
  {
    book: "genesis", chapter: 1, title: "In the Beginning", ref: "Genesis 1:1–5", translation: "KJV",
    verses: [
      { n: 1, text: "In the beginning God created the heaven and the earth." },
      { n: 2, text: "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters." },
      { n: 3, text: "And God said, Let there be light: and there was light." },
      { n: 4, text: "And God saw the light, that it was good: and God divided the light from the darkness." },
      { n: 5, text: "And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day." },
    ],
    explanation: {
      beginner: "The Bible opens by saying that God is the one who made everything. Before anything else existed, God was there. On the first day God speaks, and light appears. God sees that the light is good.",
      intermediate: "Genesis 1 presents God as the sovereign Creator who brings order out of a formless, dark world simply by speaking. Light comes first, and God both calls it good and separates it from darkness, naming Day and Night. The passage sets a pattern of speaking, making, seeing and naming that repeats through the chapter.",
      indepth: "The passage moves from an opening statement (v.1) to a description of an unformed earth (v.2) and then to the first act of ordering (vv.3–5). The repeated pattern of divine speech followed by fulfilment, then evaluation ('it was good') and naming, frames creation as purposeful rather than accidental. Readers differ on how the days of Genesis 1 should be understood; this lesson focuses on what the text itself says about God and creation.",
    },
    context: "Genesis is the first of the five books traditionally attributed to Moses. It begins the story that the rest of the Bible continues. Chapter 1 is written in a structured, almost poetic style.",
    keyIdeas: ["God as Creator", "Light and darkness", "God's word has power", "Creation is called good"],
    teaches: "The text presents God as the source of everything that exists, acting with purpose and with authority through his word, and it describes what he made as good.",
    reflection: ["What does it mean to you that the Bible begins with God, not with people?", "Where in your life do you long for light or order?", "What is one thing around you today that you can receive as good?"],
    meditation: "Read verse 3 slowly three times. On each reading, pause after a different word. Sit in silence for one minute.",
    prayer: "God, thank you for being there from the beginning. Help me to see what is good in the day ahead and to trust you with what feels unformed. Amen.",
    quiz: [
      { q: "According to Genesis 1:1, who created the heaven and the earth?", options: ["Angels", "God", "Moses"], answer: 1, why: "Verse 1 states it directly: God created the heaven and the earth." },
      { q: "What did God make on the first day, according to verse 3?", options: ["Light", "The sea", "Animals"], answer: 0, why: "Verse 3: God said, Let there be light, and there was light." },
      { q: "What did God call the light?", options: ["Night", "Day", "Morning star"], answer: 1, why: "Verse 5: God called the light Day and the darkness Night." },
    ],
  },
  {
    book: "psalms", chapter: 23, title: "The Lord Is My Shepherd", ref: "Psalm 23:1–3", translation: "KJV",
    verses: [
      { n: 1, text: "The LORD is my shepherd; I shall not want." },
      { n: 2, text: "He maketh me to lie down in green pastures: he leadeth me beside the still waters." },
      { n: 3, text: "He restoreth my soul: he leadeth me in the paths of righteousness for his name’s sake." },
    ],
    explanation: {
      beginner: "This psalm compares God to a shepherd who cares for his sheep. A good shepherd provides food and rest and leads the way. The writer says that because God is his shepherd, he has what he needs.",
      intermediate: "Psalm 23 uses the image of a shepherd to describe God's care. The first verse states the main idea of trust and sufficiency, and verses 2–3 give pictures of rest, provision, restoration and guidance.",
      indepth: "The psalm is attributed to David, who had been a shepherd. The shepherd metaphor is used across the Old Testament for God and for leaders of his people. The verbs in these verses (maketh, leadeth, restoreth) all have God as the subject, which highlights the psalm's emphasis on God's initiative and care. This lesson covers only the opening three verses.",
    },
    context: "Psalms is a collection of prayers and songs used in worship. Many are attributed to David. Psalm 23 is among the best known.",
    keyIdeas: ["God as shepherd", "Provision and rest", "Restoration", "Guidance"],
    teaches: "The passage presents God as one who provides, gives rest, restores and guides, and invites trust.",
    reflection: ["What does it mean to you to ‘not want’?", "When have you most needed rest or restoration?", "Where do you want guidance right now?"],
    meditation: "Breathe slowly. On each breath in, think ‘The LORD is my shepherd.’ On each breath out, let go of one worry.",
    prayer: "Lord, lead me today. Give me rest where I am tired and direction where I am unsure. Amen.",
    quiz: [
      { q: "What image does Psalm 23:1 use for God?", options: ["A king", "A shepherd", "A rock"], answer: 1, why: "Verse 1: The LORD is my shepherd." },
      { q: "According to verse 2, where does the shepherd make the writer lie down?", options: ["Green pastures", "A mountain top", "A desert"], answer: 0, why: "Verse 2: He maketh me to lie down in green pastures." },
    ],
  },
  {
    book: "proverbs", chapter: 3, title: "Trust and Direction", ref: "Proverbs 3:5–6", translation: "KJV",
    verses: [
      { n: 5, text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding." },
      { n: 6, text: "In all thy ways acknowledge him, and he shall direct thy paths." },
    ],
    explanation: {
      beginner: "These two verses invite us to trust God fully, not only to rely on what we think. If we include God in everything we do, the verse says he will guide our path.",
      intermediate: "Proverbs 3:5–6 pairs a call to wholehearted trust with a warning against leaning only on our own understanding. Verse 6 links acknowledging God in every area of life with receiving direction.",
      indepth: "Proverbs is wisdom literature, offering general principles for living well rather than guarantees for every circumstance. The verses use the Hebrew idea of the heart as the centre of thought and will. Readers should take the promise of direction in the context of the book's wider teaching about wisdom.",
    },
    context: "Proverbs collects short sayings of wisdom for everyday life, many attributed to Solomon.",
    keyIdeas: ["Trust", "Humility about our own understanding", "Acknowledging God in daily choices", "Guidance"],
    teaches: "The passage teaches dependence on God in decisions and invites us to bring every part of life before him.",
    reflection: ["What decision are you facing where you could invite God in?", "What does ‘leaning on your own understanding’ look like for you?", "How can you acknowledge God in one ordinary task today?"],
    meditation: "Name one decision on your mind. Hold it open-handed for one minute while repeating verse 5.",
    prayer: "God, I bring this choice to you. Teach me to trust and to listen. Amen.",
    quiz: [
      { q: "What does Proverbs 3:5 say not to lean on?", options: ["Our own understanding", "Our friends", "Our possessions"], answer: 0, why: "Verse 5: lean not unto thine own understanding." },
      { q: "What does verse 6 say God will do when we acknowledge him?", options: ["Make us rich", "Direct our paths", "Remove all trouble"], answer: 1, why: "Verse 6: he shall direct thy paths. The verse does not promise the absence of trouble." },
    ],
  },
];

export const lessonId = (book: string, chapter: number) => `${book}-${chapter}`;
export const getLesson = (book: string, chapter: number) =>
  LESSONS.find((l) => l.book === book && l.chapter === chapter);
export const lessonsForBook = (book: string) => LESSONS.filter((l) => l.book === book);
