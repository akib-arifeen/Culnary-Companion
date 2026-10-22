export interface Recipe {
  id: string
  title: string
  image: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  cuisine: string
  prepTime: number // in minutes
  cookTime: number // in minutes
  servings: number
  description: string
  ingredients: Ingredient[]
  steps: CookingStep[]
  isFavorite?: boolean
  isInProgress?: boolean
  currentStep?: number
}

export interface Ingredient {
  name: string
  amount: string
  unit?: string
}

export interface CookingStep {
  stepNumber: number
  instruction: string
  duration?: number // in minutes
}

/** Numbers the steps 1..n so the data below stays readable. Duration (minutes) is optional. */
function numbered(items: ReadonlyArray<readonly [string, number?]>): CookingStep[] {
  return items.map(([instruction, duration], index) => ({
    stepNumber: index + 1,
    instruction,
    ...(duration !== undefined ? { duration } : {}),
  }))
}

// Photos live in public/recipes (credits in public/recipes/CREDITS.md).
// Each ingredient name is short and never contains another name from the same recipe,
// so a spoken "milk" or "garlic" can only mean one line.
export const recipes: Recipe[] = [
  {
    id: '1',
    title: 'Creamy Chicken Curry',
    image: '/recipes/chicken-curry.webp',
    difficulty: 'Medium',
    cuisine: 'Indian',
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    description:
      'Tender chicken simmered in a mild, coconut-rich curry sauce and spooned over fluffy rice. A comforting weeknight dinner.',
    ingredients: [
      { name: 'Chicken thigh', amount: '600', unit: 'g' },
      { name: 'Onion', amount: '1', unit: 'large' },
      { name: 'Garlic', amount: '3', unit: 'cloves' },
      { name: 'Ginger', amount: '1', unit: 'tbsp' },
      { name: 'Curry powder', amount: '2', unit: 'tbsp' },
      { name: 'Coconut milk', amount: '400', unit: 'ml' },
      { name: 'Tomato paste', amount: '2', unit: 'tbsp' },
      { name: 'Rice', amount: '300', unit: 'g' },
      { name: 'Cilantro', amount: '1/4', unit: 'cup' },
      { name: 'Oil', amount: '2', unit: 'tbsp' },
    ],
    steps: numbered([
      ['Cut the chicken into bite-sized cubes and season them with a good pinch of salt.'],
      ['Cook the rice following the packet instructions while you make the sauce.', 15],
      ['Warm the oil in a deep pan over medium heat and cook the chopped onion until golden.', 6],
      ['Stir in the garlic, ginger and curry powder and cook until the kitchen smells fragrant.', 1],
      ['Add the chicken and tomato paste, then turn the pieces until they are browned all over.', 5],
      ['Pour in the coconut milk, bring to a gentle simmer and cook until the chicken is tender.', 15],
      ['Taste and adjust the salt, then serve over the rice with chopped cilantro.'],
    ]),
  },
  {
    id: '2',
    title: 'Avocado Toast with Soft Egg',
    image: '/recipes/avocado-toast.webp',
    difficulty: 'Easy',
    cuisine: 'American',
    prepTime: 5,
    cookTime: 6,
    servings: 2,
    description:
      'Seeded toast piled with lemony mashed avocado and a jammy soft-boiled egg. Ready in about ten minutes.',
    ingredients: [
      { name: 'Eggs', amount: '2' },
      { name: 'Bread', amount: '2', unit: 'slices' },
      { name: 'Avocado', amount: '1', unit: 'ripe' },
      { name: 'Lemon', amount: '1/2' },
      { name: 'Chili flakes', amount: '1', unit: 'pinch' },
      { name: 'Salt', amount: '1', unit: 'pinch' },
    ],
    steps: numbered([
      ['Bring a small pot of water to a boil, lower in the eggs and cook them for a jammy yolk.', 6],
      ['While the eggs cook, toast the bread until crisp and golden.', 3],
      ['Scoop the avocado into a bowl and mash it with a squeeze of lemon and a pinch of salt.'],
      ['Cool the eggs under cold running water, then peel and halve them.', 1],
      ['Spread the avocado on the toast, top with the eggs and finish with chili flakes.'],
    ]),
  },
  {
    id: '3',
    title: 'Pan-Seared Salmon with Cucumber Salsa',
    image: '/recipes/seared-salmon.webp',
    difficulty: 'Medium',
    cuisine: 'European',
    prepTime: 15,
    cookTime: 12,
    servings: 2,
    description:
      'Crisp-skinned salmon on wilted spinach, topped with a cool cucumber and tomato salsa that cuts through the richness.',
    ingredients: [
      { name: 'Salmon fillets', amount: '2', unit: 'skin-on' },
      { name: 'Spinach', amount: '200', unit: 'g' },
      { name: 'Cucumber', amount: '1/2' },
      { name: 'Tomato', amount: '1', unit: 'medium' },
      { name: 'Lemon', amount: '1' },
      { name: 'Olive oil', amount: '3', unit: 'tbsp' },
      { name: 'Garlic', amount: '1', unit: 'clove' },
      { name: 'Salt', amount: '1', unit: 'tsp' },
    ],
    steps: numbered([
      ['Dice the cucumber and tomato and toss with lemon juice, a spoonful of olive oil and a pinch of salt.'],
      ['Pat the salmon dry with paper towels and season both sides with salt.'],
      ['Heat two tablespoons of olive oil in a nonstick pan over medium-high heat until it shimmers.'],
      ['Lay the salmon in skin side down and press gently. Cook without moving it until the skin is crisp.', 5],
      ['Flip the fillets and cook just until the centre turns opaque.', 3],
      ['Move the salmon to plates, then wilt the spinach with the sliced garlic in the same pan.', 2],
      ['Serve the salmon on the spinach and spoon the cucumber salsa over the top.'],
    ]),
  },
  {
    id: '4',
    title: 'Vegetable Egg Fried Rice',
    image: '/recipes/fried-rice.webp',
    difficulty: 'Easy',
    cuisine: 'Chinese',
    prepTime: 10,
    cookTime: 10,
    servings: 2,
    description:
      'A fast wok dinner that turns leftover rice into something special, with scrambled egg, peas, carrot and spring onion.',
    ingredients: [
      { name: 'Cooked rice', amount: '3', unit: 'cups' },
      { name: 'Eggs', amount: '2' },
      { name: 'Peas', amount: '1/2', unit: 'cup' },
      { name: 'Carrot', amount: '1' },
      { name: 'Spring onions', amount: '3' },
      { name: 'Garlic', amount: '2', unit: 'cloves' },
      { name: 'Soy sauce', amount: '2', unit: 'tbsp' },
      { name: 'Oil', amount: '2', unit: 'tbsp' },
    ],
    steps: numbered([
      ['Dice the carrot small and slice the spring onions, keeping the white and green parts apart.'],
      ['Heat half the oil in a wok over high heat, scramble the beaten eggs until just set, then tip them out.', 2],
      ['Add the rest of the oil, then the carrot, peas, garlic and onion whites. Stir-fry until bright.', 3],
      ['Add the cooked rice and break up any clumps, frying until it starts to crackle.', 3],
      ['Return the eggs, splash in the soy sauce and toss everything together.', 1],
      ['Scatter the green spring onion over the top and serve hot.'],
    ]),
  },
  {
    id: '5',
    title: 'Margherita Pizza',
    image: '/recipes/margherita-pizza.webp',
    difficulty: 'Hard',
    cuisine: 'Italian',
    prepTime: 75,
    cookTime: 12,
    servings: 2,
    description:
      'Homemade dough with a blistered crust, bright tomato sauce, melting mozzarella and fresh basil. Most of the prep time is the dough rising.',
    ingredients: [
      { name: 'Flour', amount: '300', unit: 'g' },
      { name: 'Yeast', amount: '1', unit: 'tsp' },
      { name: 'Water', amount: '200', unit: 'ml' },
      { name: 'Salt', amount: '1', unit: 'tsp' },
      { name: 'Olive oil', amount: '2', unit: 'tbsp' },
      { name: 'Crushed tomatoes', amount: '200', unit: 'g' },
      { name: 'Mozzarella', amount: '150', unit: 'g' },
      { name: 'Basil', amount: '1', unit: 'handful' },
    ],
    steps: numbered([
      ['Mix the flour, yeast, half the salt, water and a spoonful of olive oil, then knead until smooth and springy.', 8],
      ['Cover the dough and leave it somewhere warm until it has doubled in size.', 60],
      ['Heat the oven to its highest setting with a baking tray inside.', 15],
      ['Stir the rest of the salt into the crushed tomatoes and tear the mozzarella into pieces.'],
      ['Stretch the dough into a thin round on a floured surface and spread the tomatoes over it, leaving a border.'],
      ['Dot with mozzarella, slide onto the hot tray and bake until the crust is blistered and the cheese bubbles.', 10],
      ['Top with torn basil and a drizzle of olive oil, then slice and serve.'],
    ]),
  },
  {
    id: '6',
    title: 'Shrimp Pad Thai',
    image: '/recipes/pad-thai.webp',
    difficulty: 'Medium',
    cuisine: 'Thai',
    prepTime: 20,
    cookTime: 10,
    servings: 2,
    description:
      'Springy rice noodles tossed with shrimp, egg and a sweet-sour tamarind sauce, finished with crunchy peanuts and lime.',
    ingredients: [
      { name: 'Rice noodles', amount: '200', unit: 'g' },
      { name: 'Shrimp', amount: '250', unit: 'g' },
      { name: 'Eggs', amount: '2' },
      { name: 'Bean sprouts', amount: '1', unit: 'cup' },
      { name: 'Garlic', amount: '2', unit: 'cloves' },
      { name: 'Tamarind paste', amount: '2', unit: 'tbsp' },
      { name: 'Fish sauce', amount: '2', unit: 'tbsp' },
      { name: 'Sugar', amount: '1', unit: 'tbsp' },
      { name: 'Peanuts', amount: '1/4', unit: 'cup' },
      { name: 'Lime', amount: '1' },
      { name: 'Oil', amount: '2', unit: 'tbsp' },
    ],
    steps: numbered([
      ['Soak the rice noodles in hot tap water until pliable but still firm, then drain them well.', 10],
      ['Stir the tamarind paste, fish sauce and sugar together in a small bowl to make the sauce.'],
      ['Heat the oil in a wok over high heat and stir-fry the garlic and shrimp until the shrimp turn pink.', 3],
      ['Push everything to one side, scramble the eggs in the gap, then add the noodles and sauce.', 2],
      ['Toss until the noodles soak up the sauce and turn glossy.', 2],
      ['Fold in the bean sprouts, then serve with crushed peanuts and a lime wedge.'],
    ]),
  },
  {
    id: '7',
    title: 'Penne with Meat Sauce',
    image: '/recipes/penne-meat-sauce.webp',
    difficulty: 'Easy',
    cuisine: 'Italian',
    prepTime: 10,
    cookTime: 30,
    servings: 4,
    description:
      'A slow-bubbling tomato and beef sauce clinging to penne. Simple pantry cooking that tastes like it took all afternoon.',
    ingredients: [
      { name: 'Penne', amount: '400', unit: 'g' },
      { name: 'Ground beef', amount: '400', unit: 'g' },
      { name: 'Onion', amount: '1' },
      { name: 'Garlic', amount: '2', unit: 'cloves' },
      { name: 'Crushed tomatoes', amount: '400', unit: 'g' },
      { name: 'Olive oil', amount: '2', unit: 'tbsp' },
      { name: 'Parmesan', amount: '40', unit: 'g' },
      { name: 'Salt', amount: '1', unit: 'tsp' },
      { name: 'Black pepper', amount: '1/2', unit: 'tsp' },
    ],
    steps: numbered([
      ['Heat the olive oil in a wide pan over medium heat and soften the chopped onion.', 5],
      ['Add the garlic and ground beef, breaking the meat up, and cook until no pink remains.', 8],
      ['Stir in the crushed tomatoes, salt and pepper, then simmer gently until the sauce thickens.', 20],
      ['Meanwhile, boil the penne in well-salted water until just tender.', 11],
      ['Drain the pasta, keeping a splash of the water, and toss it through the sauce.'],
      ['Serve with grated parmesan and a little extra pepper.'],
    ]),
  },
  {
    id: '8',
    title: 'Chocolate Chip Cookies',
    image: '/recipes/chocolate-chip-cookies.webp',
    difficulty: 'Easy',
    cuisine: 'American',
    prepTime: 15,
    cookTime: 12,
    servings: 12,
    description:
      'Chewy cookies with crisp edges and big pockets of melted chocolate. Chilling the dough keeps them thick.',
    ingredients: [
      { name: 'Butter', amount: '115', unit: 'g' },
      { name: 'Brown sugar', amount: '150', unit: 'g' },
      { name: 'Egg', amount: '1' },
      { name: 'Vanilla', amount: '1', unit: 'tsp' },
      { name: 'Flour', amount: '190', unit: 'g' },
      { name: 'Baking soda', amount: '1/2', unit: 'tsp' },
      { name: 'Salt', amount: '1/2', unit: 'tsp' },
      { name: 'Chocolate chunks', amount: '170', unit: 'g' },
    ],
    steps: numbered([
      ['Heat the oven to 175C (350F) and line a baking tray with parchment paper.', 10],
      ['Beat the soft butter and brown sugar until pale and fluffy, then beat in the egg and vanilla.'],
      ['Stir in the flour, baking soda and salt until just combined, then fold in the chocolate chunks.'],
      ['Chill the dough so the cookies hold their shape in the oven.', 15],
      ['Scoop golf-ball sized mounds onto the tray, well spaced, and bake until the edges are golden.', 12],
      ['Let the cookies firm up on the tray before moving them to a rack.', 5],
    ]),
  },
]

export const getRecipeById = (id: string): Recipe | undefined => {
  return recipes.find((recipe) => recipe.id === id)
}
