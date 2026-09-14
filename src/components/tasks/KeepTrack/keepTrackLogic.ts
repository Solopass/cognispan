export interface CategoryLexicon {
  name: string;
  exemplars: string[];
}

export const CATEGORIES: CategoryLexicon[] = [
  { name: 'Animals', exemplars: ['Dog', 'Lion', 'Eagle', 'Bear', 'Shark', 'Deer'] },
  { name: 'Countries', exemplars: ['France', 'Japan', 'Brazil', 'Canada', 'Egypt', 'India'] },
  { name: 'Colors', exemplars: ['Blue', 'Red', 'Green', 'Yellow', 'Orange', 'Purple'] },
  { name: 'Metals', exemplars: ['Gold', 'Silver', 'Iron', 'Copper', 'Platinum', 'Zinc'] },
  { name: 'Professions', exemplars: ['Doctor', 'Lawyer', 'Pilot', 'Chef', 'Teacher', 'Engineer'] },
  { name: 'Fruits', exemplars: ['Apple', 'Banana', 'Mango', 'Grape', 'Peach', 'Lemon'] }
];

export interface KeepTrackWord {
  word: string;
  category: string;
  isTargetCategory: boolean;
}

export interface KeepTrackTrialData {
  targetCategories: string[];
  wordStream: KeepTrackWord[];
  expectedAnswers: Record<string, string>; // category -> final word
}

/**
 * Builds a balanced category updating word stream where each target category appears multiple times
 */
export function generateKeepTrackTrial(targetCount: number = 3, streamLength: number = 18): KeepTrackTrialData {
  // 1. Pick target categories
  const shuffledCats = [...CATEGORIES].sort(() => 0.5 - Math.random());
  const targets = shuffledCats.slice(0, targetCount).map(c => c.name);

  // 2. Build stream ensuring all targets appear multiple times (>= 2)
  const wordStream: KeepTrackWord[] = [];
  const expectedAnswers: Record<string, string> = {};
  const targetCounts: Record<string, number> = {};
  targets.forEach(t => { targetCounts[t] = 0; });

  let lastWord = '';

  for (let i = 0; i < streamLength; i++) {
    // Prioritize underrepresented target categories so updating is strictly required
    let chosenCat: CategoryLexicon;
    const underRepresentedTargets = targets.filter(t => targetCounts[t] < 2);

    if (underRepresentedTargets.length > 0 && Math.random() < 0.8) {
      const tName = underRepresentedTargets[Math.floor(Math.random() * underRepresentedTargets.length)];
      chosenCat = CATEGORIES.find(c => c.name === tName)!;
    } else if (Math.random() < 0.65) {
      const tName = targets[Math.floor(Math.random() * targets.length)];
      chosenCat = CATEGORIES.find(c => c.name === tName)!;
    } else {
      chosenCat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    }

    let word: string;
    let attempts = 0;
    do {
      word = chosenCat.exemplars[Math.floor(Math.random() * chosenCat.exemplars.length)];
      attempts++;
    } while (word === lastWord && attempts < 10);

    lastWord = word;
    const isTarget = targets.includes(chosenCat.name);

    if (isTarget) {
      expectedAnswers[chosenCat.name] = word;
      targetCounts[chosenCat.name] = (targetCounts[chosenCat.name] || 0) + 1;
    }

    wordStream.push({
      word,
      category: chosenCat.name,
      isTargetCategory: isTarget
    });
  }

  return {
    targetCategories: targets,
    wordStream,
    expectedAnswers
  };
}
