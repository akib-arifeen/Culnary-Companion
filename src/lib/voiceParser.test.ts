import { describe, it, expect } from 'vitest'
import { matchIngredient, parseMinutes, parseVoiceCommand } from './voiceParser'
import type { Command } from './commands'

const NAMES = ['Chicken breast', 'Garlic', 'Coconut milk', 'Tomatoes', 'Fresh basil']
const parse = (text: string, names: readonly string[] = NAMES) => parseVoiceCommand(text, { ingredientNames: names })

const cases = (rows: Array<[string[], Command | null]>): Array<[string, Command | null]> =>
  rows.flatMap(([phrases, cmd]) => phrases.map((p) => [p, cmd] as [string, Command | null]))

describe('parseVoiceCommand: rule 1, timer phrases', () => {
  it.each(
    cases([
      [['pause timer', 'stop timer', 'pause the timer', 'hold timer'], { type: 'pauseTimer' }],
      [['resume timer', 'continue timer', 'resume the timer'], { type: 'resumeTimer' }],
      [['reset timer', 'restart timer', 'reset the timer', 'restart', 'reset'], { type: 'resetTimer' }],
      [['show timer', 'show timers', 'open timer', 'open timers', 'timers'], { type: 'showTab', tab: 'timers' }],
      [['pause', 'hold on'], { type: 'pauseTimer' }],
      [['resume', 'start'], { type: 'resumeTimer' }],
      [['timer', 'set a timer', 'start a timer', 'start timer', 'start the timer'], { type: 'startTimer' }],
    ]),
  )('%j', (phrase, expected) => {
    expect(parse(phrase)).toEqual(expected)
  })

  it.each([
    ['timer for 7 minutes', 7],
    ['set a timer for ten minutes', 10],
    ['5 minute timer', 5],
    ['seven minutes', 7],
    ['set timer 3', 3],
    ['half an hour', 30],
    ['90 seconds', 2],
    ['set a timer for forty five minutes', 45],
    ['timer for 30 seconds', 1],
    ['timer for 2 hours', 120],
  ])('duration phrase %j -> startTimer %i', (phrase, minutes) => {
    expect(parse(phrase)).toEqual({ type: 'startTimer', minutes })
  })

  it('startTimer without a duration carries no minutes', () => {
    const c = parse('set a timer')
    expect(c?.type).toBe('startTimer')
    expect((c as { minutes?: number }).minutes).toBeUndefined()
  })

  it.each(['five', '5', 'ten', 'seven'])('a bare number %j is not a duration', (phrase) => {
    expect(parse(phrase)).toBeNull()
  })
})

describe('parseVoiceCommand: priority-order traps', () => {
  it.each([
    ['uncheck all', { type: 'checkAll', checked: false }],
    ['check all', { type: 'checkAll', checked: true }],
    ['restart', { type: 'resetTimer' }],
    ['restarting', null],
    ['background noise', null],
    ['go back to steps', { type: 'showTab', tab: 'steps' }],
    ['back to steps', { type: 'showTab', tab: 'steps' }],
    ['stop timer', { type: 'pauseTimer' }],
    ['stop', { type: 'stopSpeaking' }],
    ['continue timer', { type: 'resumeTimer' }],
    ['continue', { type: 'next' }],
    ['start', { type: 'resumeTimer' }],
    ['five', null],
    ['next step please', { type: 'next' }],
    ['can you go back', { type: 'previous' }],
    ['go back', { type: 'previous' }],
    ['back', { type: 'previous' }],
    ['step back', { type: 'previous' }],
  ] as Array<[string, Command | null]>)('%j', (phrase, expected) => {
    expect(parse(phrase)).toEqual(expected)
  })

  it('matches whole words only: "backward", "nextdoor" and "helpful" are not commands', () => {
    expect(parse('backwards')).toBeNull()
    expect(parse('nextdoor')).toBeNull()
    expect(parse('unhelpful')).toBeNull()
  })
})

describe('parseVoiceCommand: rules 2-3, check/uncheck all', () => {
  it.each(
    cases([
      [['uncheck all', 'untick all', 'clear all', 'uncheck everything'], { type: 'checkAll', checked: false }],
      [['check all', 'tick all', 'check everything', 'got everything'], { type: 'checkAll', checked: true }],
    ]),
  )('%j', (phrase, expected) => {
    expect(parse(phrase)).toEqual(expected)
  })
})

describe('parseVoiceCommand: rule 4, check/uncheck one ingredient', () => {
  it.each([
    ['check garlic', 'garlic', true],
    ['tick garlic', 'garlic', true],
    ['got garlic', 'garlic', true],
    ['i have garlic', 'garlic', true],
    ["i've got garlic", 'garlic', true],
    ['uncheck garlic', 'garlic', false],
    ['untick garlic', 'garlic', false],
    ['remove garlic', 'garlic', false],
  ])('%j -> query %j checked %s', (phrase, query, checked) => {
    expect(parse(phrase)).toEqual({ type: 'checkIngredient', query, checked })
  })

  it.each([
    ['check the garlic', 'garlic', true],
    ['check a lemon', 'lemon', true],
    ['check an onion', 'onion', true],
    ['tick some butter', 'butter', true],
    ['uncheck the coconut milk', 'coconut milk', false],
  ])('articles are stripped: %j -> %j', (phrase, query, checked) => {
    expect(parse(phrase)).toEqual({ type: 'checkIngredient', query, checked })
  })

  // Doc rule 4: "ambiguous: core starts with "remove X" (checked false) or "got X" | "i have X" | "ive got X" (checked true):
  // returned ONLY when matchIngredient(X, ctx.ingredientNames) finds one" -> these two need Salt / Eggs in the context.
  it('ambiguous verbs with the ingredient present, articles stripped', () => {
    expect(parse('remove some salt', ['Salt'])).toEqual({ type: 'checkIngredient', query: 'salt', checked: false })
    expect(parse('i have the eggs', ['Eggs'])).toEqual({ type: 'checkIngredient', query: 'eggs', checked: true })
  })

  it('works for ingredients that are not in the recipe list', () => {
    expect(parse('check dragon fruit', [])).toEqual({ type: 'checkIngredient', query: 'dragon fruit', checked: true })
  })

  it('"check" with nothing after it is not an ingredient command', () => {
    expect(parse('check')?.type).not.toBe('checkIngredient')
    expect(parse('uncheck')?.type).not.toBe('checkIngredient')
  })

  it('"check the" (only an article) is not an ingredient command', () => {
    expect(parse('check the')?.type).not.toBe('checkIngredient')
  })
})

describe('parseVoiceCommand: rule 5, go to step N', () => {
  it.each([
    ['step 3', 3],
    ['step three', 3],
    ['go to step 4', 4],
    ['go to step two', 2],
    ['jump to step 5', 5],
    ['jump to step seven', 7],
    ['step 1', 1],
    ['step twelve', 12],
  ])('%j -> goToStep %i', (phrase, step) => {
    expect(parse(phrase)).toEqual({ type: 'goToStep', step })
  })

  it('step 0 is not valid (N >= 1)', () => {
    expect(parse('step 0')?.type).not.toBe('goToStep')
  })
})

describe('parseVoiceCommand: rule 6, tabs', () => {
  it.each(
    cases([
      [['ingredients', 'show ingredients', 'ingredient list', 'what do i need'], { type: 'showTab', tab: 'ingredients' }],
      [['steps', 'show steps', 'instructions', 'method', 'back to steps', 'go back to steps'], { type: 'showTab', tab: 'steps' }],
    ]),
  )('%j', (phrase, expected) => {
    expect(parse(phrase)).toEqual(expected)
  })
})

describe('parseVoiceCommand: rules 7-11', () => {
  it.each(
    cases([
      [['help', 'what can i say', 'commands', 'show help'], { type: 'help' }],
      [
        ['repeat', 'again', 'say again', 'say that again', 'read again', 'read it again', 'what was that', 'pardon', 'come again'],
        { type: 'repeat' },
      ],
      [['stop', 'quiet', 'be quiet', 'shush', 'stop talking', 'silence', 'enough'], { type: 'stopSpeaking' }],
      [['next', 'next step', 'continue', 'go on', 'forward', 'go forward', 'okay next', 'ok next'], { type: 'next' }],
      [['back', 'go back', 'previous', 'previous step', 'last step', 'step back'], { type: 'previous' }],
    ]),
  )('%j', (phrase, expected) => {
    expect(parse(phrase)).toEqual(expected)
  })

  it.each([
    ['okay next please', { type: 'next' }],
    ['um next step', { type: 'next' }],
    ['can you go back', { type: 'previous' }],
    ['please repeat that', { type: 'repeat' }],
    ['okay pause please', { type: 'pauseTimer' }],
    ['can you help', { type: 'help' }],
    ['um go forward', { type: 'next' }],
  ] as Array<[string, Command]>)('filler words are tolerated: %j', (phrase, expected) => {
    expect(parse(phrase)).toEqual(expected)
  })
})

describe('parseVoiceCommand: normalisation', () => {
  it.each([
    ['Next!', { type: 'next' }],
    ['NEXT', { type: 'next' }],
    ['  next  ', { type: 'next' }],
    ['Next.', { type: 'next' }],
    ['next,   step', { type: 'next' }],
    ['Go Back?', { type: 'previous' }],
    ['PAUSE THE TIMER', { type: 'pauseTimer' }],
    ['Set a timer for 7 minutes!', { type: 'startTimer', minutes: 7 }],
    ['Step Three.', { type: 'goToStep', step: 3 }],
    ["I've got everything", { type: 'checkAll', checked: true }],
  ] as Array<[string, Command]>)('%j', (phrase, expected) => {
    expect(parse(phrase)).toEqual(expected)
  })

  it.each(['', '   ', '\n\t', '!!!', '...'])('empty or punctuation-only input %j -> null', (phrase) => {
    expect(parse(phrase)).toBeNull()
  })
})

describe('parseVoiceCommand: rule 12, bare ingredient names', () => {
  it('a bare ingredient name checks that ingredient', () => {
    expect(parse('garlic')).toMatchObject({ type: 'checkIngredient', query: 'garlic' })
    expect(parse('coconut milk')).toMatchObject({ type: 'checkIngredient', query: 'coconut milk' })
    expect(parse('tomatoes')).toMatchObject({ type: 'checkIngredient', query: 'tomatoes' })
    expect(parse('chicken')).toMatchObject({ type: 'checkIngredient', query: 'chicken' })
  })

  it('a bare ingredient toggles (no checked flag)', () => {
    expect((parse('garlic') as { checked?: boolean }).checked).toBeUndefined()
  })

  it('is case- and punctuation-insensitive', () => {
    expect(parse('Garlic!')?.type).toBe('checkIngredient')
  })

  it('without ingredient names nothing matches', () => {
    expect(parse('garlic', [])).toBeNull()
  })

  it('commands win over an ingredient with the same word', () => {
    expect(parse('next', ['Next level sauce', 'Stop sign pepper'])).toEqual({ type: 'next' })
    expect(parse('stop', ['Stop sign pepper'])).toEqual({ type: 'stopSpeaking' })
  })

  it.each(['banana', 'hello there', 'what is the weather', 'purple monkey dishwasher', 'asdf'])('unknown words %j -> null', (phrase) => {
    expect(parse(phrase)).toBeNull()
  })
})

describe('parseVoiceCommand: contract amendments', () => {
  it.each([
    'cancel timer',
    'cancel the timer',
    'remove the timer',
    'remove timer',
    'delete timer',
    'delete the timer',
    'clear timer',
    'clear the timer',
    'dismiss timer',
    'dismiss the timer',
    'turn off timer',
    'turn off the timer',
    'turn the timer off',
  ])('%j -> cancelTimer', (phrase) => {
    expect(parse(phrase)).toEqual({ type: 'cancelTimer' })
  })

  it('cancelTimer wins over uncheck/clear-all and ingredient rules', () => {
    expect(parse('remove the timer', ['Timer cake'])).toEqual({ type: 'cancelTimer' })
    expect(parse('clear timer')).not.toEqual({ type: 'checkAll', checked: false })
    expect(parse('clear all')).toEqual({ type: 'checkAll', checked: false })
  })

  it.each(['just a minute', 'wait a second', 'give me an hour', 'hang on a minute', 'give me a second', 'an hour'])(
    'everyday phrase %j without "timer" is not a timer',
    (phrase) => {
      expect(parse(phrase)).toBeNull()
    },
  )

  it.each([
    ['set a timer for a minute', 1],
    ['timer for an hour', 60],
    ['timer for a minute', 1],
    ['set a timer for an hour', 60],
    ['half an hour', 30],
    ['an hour and a half', 90],
  ])('%j -> startTimer %i', (phrase, minutes) => {
    expect(parse(phrase)).toEqual({ type: 'startTimer', minutes })
  })

  it.each(['got it', 'check that', 'remove this', 'got them', 'check it', 'tick those', 'uncheck it'])(
    'pronoun-only object %j falls through to null',
    (phrase) => {
      expect(parse(phrase)).toBeNull()
    },
  )

  it.each([
    ['next steps', { type: 'next' }],
    ['previous steps', { type: 'previous' }],
    ['okay next steps', { type: 'next' }],
    ['steps', { type: 'showTab', tab: 'steps' }],
  ] as Array<[string, Command]>)('%j', (phrase, expected) => {
    expect(parse(phrase)).toEqual(expected)
  })
})

describe('parseMinutes', () => {
  it.each([
    ['7', 7],
    ['7 min', 7],
    ['7 minutes', 7],
    ['7min', 7],
    ['1 minute', 1],
    ['20 mins', 20],
    ['seven', 7],
    ['seven minutes', 7],
    ['ten', 10],
    ['twenty', 20],
    ['thirty', 30],
    ['forty', 40],
    ['forty five', 45],
    ['forty-five', 45],
    ['fifty', 50],
    ['sixty', 60],
    ['ninety', 90],
    ['a minute', 1],
    ['one minute', 1],
    ['half an hour', 30],
    ['an hour', 60],
    ['one hour', 60],
    ['an hour and a half', 90],
    ['2 hours', 120],
    ['two hours', 120],
    ['3 hours', 180],
    ['90 seconds', 2],
    ['30 seconds', 1],
    ['60 seconds', 1],
    ['61 seconds', 2],
    ['1 second', 1],
    ['180', 180],
    ['180 minutes', 180],
  ])('%j -> %i', (text, expected) => {
    expect(parseMinutes(text)).toBe(expected)
  })

  it.each([
    ['0'],
    ['0 minutes'],
    ['181'],
    ['181 minutes'],
    ['200 minutes'],
    ['4 hours'],
    [''],
    ['   '],
    ['banana'],
    ['hello world'],
    ['to'],
    ['too'],
    ['for'],
    ['for minutes'],
    ['to minutes'],
    ['minutes'],
  ])('%j -> null', (text) => {
    expect(parseMinutes(text)).toBeNull()
  })

  it('"for" and "to" are not read as four and two', () => {
    expect(parseMinutes('for minutes')).not.toBe(4)
    expect(parseMinutes('to minutes')).not.toBe(2)
    expect(parseMinutes('timer for 4 minutes')).toBe(4)
  })
})

describe('matchIngredient', () => {
  const idx = (query: string, names: string[]) => matchIngredient(query, names)

  it('matches the doc examples', () => {
    expect(idx('chicken', ['Chicken breast'])).toBe(0)
    expect(idx('tomatoes', ['Tomatoes'])).toBe(0)
    expect(idx('coconut milk', ['Coconut milk'])).toBe(0)
    expect(idx('milk', ['Coconut milk', 'Milk'])).toBe(1)
  })

  it('returns the index in the full list, not the first', () => {
    expect(idx('garlic', NAMES)).toBe(1)
    expect(idx('basil', NAMES)).toBe(4)
    expect(idx('chicken', NAMES)).toBe(0)
  })

  it('fewest extra name tokens wins, regardless of order', () => {
    expect(idx('milk', ['Milk', 'Coconut milk'])).toBe(0)
    expect(idx('milk', ['Coconut milk', 'Milk'])).toBe(1)
    expect(idx('milk', ['Sweetened condensed milk', 'Coconut milk', 'Milk'])).toBe(2)
    expect(idx('coconut milk', ['Milk', 'Coconut milk powder', 'Coconut milk'])).toBe(2)
  })

  it('ties go to the lowest index', () => {
    expect(idx('onion', ['Red onion', 'Green onion'])).toBe(0)
    expect(idx('onion', ['Green onion', 'Red onion'])).toBe(0)
    expect(idx('salt', ['Sea salt', 'Pepper', 'Rock salt'])).toBe(0)
  })

  it.each([
    ['tomato', ['Tomatoes'], 0],
    ['tomatoes', ['Tomato'], 0],
    ['egg', ['Eggs'], 0],
    ['eggs', ['Egg'], 0],
    ['cloves', ['Garlic clove'], 0],
    ['clove', ['Garlic cloves'], 0],
    ['onions', ['Red onion'], 0],
  ])('plural/singular: %j vs %j', (query, names, expected) => {
    expect(idx(query, names)).toBe(expected)
  })

  it('every query token must appear in the name', () => {
    expect(idx('chicken thigh', ['Chicken breast'])).toBeNull()
    expect(idx('coconut cream', ['Coconut milk'])).toBeNull()
    expect(idx('coconut milk', ['Milk'])).toBeNull()
  })

  it('token order in the query does not matter', () => {
    expect(idx('milk coconut', ['Coconut milk'])).toBe(0)
  })

  it('is case- and punctuation-insensitive', () => {
    expect(idx('GARLIC!', ['garlic'])).toBe(0)
    expect(idx('Chicken, Breast.', ['chicken breast'])).toBe(0)
  })

  it('stop words in the query are dropped', () => {
    expect(idx('some garlic', ['Garlic'])).toBe(0)
    expect(idx('the chicken', ['Chicken breast'])).toBe(0)
    expect(idx('a bit of garlic', ['Garlic'])).toBeNull()
  })

  it('stop words in the name are dropped too', () => {
    expect(idx('rice', ['Pinch of rice'])).toBe(0)
    expect(idx('oil', ['Salt and oil'])).toBe(0)
  })

  it('the query "my garlic" and "i have garlic" resolve to garlic', () => {
    expect(idx('my garlic', ['Garlic'])).toBe(0)
    expect(idx('i have garlic', ['Garlic'])).toBe(0)
    expect(idx('got garlic', ['Garlic'])).toBe(0)
  })

  it('no match -> null', () => {
    expect(idx('banana', NAMES)).toBeNull()
    expect(idx('garlic', [])).toBeNull()
  })

  it.each(['the', 'a', 'an', 'some', 'of', 'and', 'my', 'i', 'have', 'got', 'the a an', 'i have got', '', '   ', '!!!'])(
    'query with no remaining tokens %j -> null',
    (query) => {
      expect(idx(query, ['The', 'A', 'Garlic', 'I have a got', ''])).toBeNull()
    },
  )
})

describe('round 3: command-shaped grammar (doc "Must be null" / "Must match")', () => {
  it.each([
    'put the lid back on',
    "i'll be right back",
    'bring it back to a boil',
    'is this the last step',
    "it's next to the stove",
    'add the next ingredient',
    'is that enough salt',
    'let me taste it again',
    'can you help me find the pan',
    'what do i need to do next',
    'is the timer going',
    "i'll be back in 5 minutes",
    'give me one second',
    'set a timer for 4 hours',
    'i have a question',
    'remove the pan from the heat',
    'how long is left on the timer',
  ])('must be null: %j', (phrase) => {
    expect(parse(phrase)).toBeNull()
  })

  it.each([
    ['next', { type: 'next' }],
    ['okay next please', { type: 'next' }],
    ['um next step', { type: 'next' }],
    ['can you go back', { type: 'previous' }],
    ['go back please', { type: 'previous' }],
    ['say that again', { type: 'repeat' }],
    ['what can i say', { type: 'help' }],
    ['go to step 3', { type: 'goToStep', step: 3 }],
    ['go to the next step', { type: 'next' }],
    ['can you pause', { type: 'pauseTimer' }],
    ['stop the timer', { type: 'pauseTimer' }],
    ['cancel that timer', { type: 'cancelTimer' }],
    ['pause my timer', { type: 'pauseTimer' }],
    ['seven minutes', { type: 'startTimer', minutes: 7 }],
    ['5 minutes please', { type: 'startTimer', minutes: 5 }],
    ['set a timer for two and a half minutes', { type: 'startTimer', minutes: 3 }],
  ] as Array<[string, Command]>)('must match: %j', (phrase, expected) => {
    expect(parse(phrase)).toEqual(expected)
  })

  describe('command-shaped boundary: one stray word passes, two fail', () => {
    it.each([
      ['next one', { type: 'next' }],
      ['go back please', { type: 'previous' }],
      ['go back quickly', { type: 'previous' }],
      ['repeat that', { type: 'repeat' }],
      ['help me', { type: 'help' }],
      ['stop talking now', { type: 'stopSpeaking' }],
      ['quiet everyone', { type: 'stopSpeaking' }],
    ] as Array<[string, Command]>)('one stray word: %j', (phrase, expected) => {
      expect(parse(phrase)).toEqual(expected)
    })

    it.each([
      'next big thing',
      'go back there again',
      'quiet down everyone',
      'help me find it',
      'stop it right now',
      'repeat it for me',
      'enough of this nonsense',
    ])('two stray words: %j -> null', (phrase) => {
      expect(parse(phrase)).toBeNull()
    })

    it('applies to timer phrases too', () => {
      expect(parse('pause timer quickly')).toEqual({ type: 'pauseTimer' })
      expect(parse('could you pause the timer')).toEqual({ type: 'pauseTimer' })
      expect(parse('pause the timer for me please now')).not.toEqual({ type: 'pauseTimer' })
    })
  })

  describe('rules 8/9 ordering (M02)', () => {
    it('"stop, say that again" is command-shaped for rule 8 (3 + 1 words) -> repeat', () => {
      expect(parse('stop, say that again')).toEqual({ type: 'repeat' })
    })
    it('"stop talking" -> stopSpeaking', () => {
      expect(parse('stop talking')).toEqual({ type: 'stopSpeaking' })
    })
    it('"say that again" -> repeat, "stop" -> stopSpeaking', () => {
      expect(parse('say that again')).toEqual({ type: 'repeat' })
      expect(parse('stop')).toEqual({ type: 'stopSpeaking' })
    })
  })

  describe('leading filler "can you" (M46)', () => {
    it.each([
      ['can you pause', { type: 'pauseTimer' }],
      ['can you reset', { type: 'resetTimer' }],
      ['could you resume', { type: 'resumeTimer' }],
      ['would you repeat', { type: 'repeat' }],
      ['will you go back', { type: 'previous' }],
      ['hey next', { type: 'next' }],
      ['so just next', { type: 'next' }],
      ['uh now go on', { type: 'next' }],
    ] as Array<[string, Command]>)('%j', (phrase, expected) => {
      expect(parse(phrase)).toEqual(expected)
    })
  })

  describe('timer determiners', () => {
    it.each([
      ['cancel that timer', { type: 'cancelTimer' }],
      ['cancel this timer', { type: 'cancelTimer' }],
      ['cancel my timer', { type: 'cancelTimer' }],
      ['cancel our timer', { type: 'cancelTimer' }],
      ['pause my timer', { type: 'pauseTimer' }],
      ['pause that timer', { type: 'pauseTimer' }],
      ['resume my timer', { type: 'resumeTimer' }],
      ['reset this timer', { type: 'resetTimer' }],
      ['turn that timer off', { type: 'cancelTimer' }],
      ['turn off my timer', { type: 'cancelTimer' }],
      ['show my timers', { type: 'showTab', tab: 'timers' }],
    ] as Array<[string, Command]>)('%j', (phrase, expected) => {
      expect(parse(phrase)).toEqual(expected)
    })
  })

  describe('timers without a duration', () => {
    it.each(['timer', 'set timer', 'start timer', 'new timer', 'step timer', 'set a timer', 'start the timer'])('%j -> startTimer {}', (phrase) => {
      expect(parse(phrase)).toEqual({ type: 'startTimer' })
    })

    it.each(['is the timer going', 'how long is left on the timer', 'the timer is annoying me today'])('%j -> null', (phrase) => {
      expect(parse(phrase)).toBeNull()
    })
  })

  describe('durations', () => {
    it.each([
      ['timer for 7 minutes', 7],
      ['set a timer for ten minutes', 10],
      ['5 minute timer', 5],
      ['set timer 3', 3],
      ['set a timer for a minute', 1],
      ['set a timer for two and a half minutes', 3],
      ['timer for one and a half hours', 90],
      ['timer for 1 hour 30 minutes', 90],
      ['timer for 1 minute 30 seconds', 2],
      ['timer for 90 seconds', 2],
      ['timer for forty five minutes', 45],
      ['timer for 3 hours', 180],
    ])('with timer: %j -> %i', (phrase, minutes) => {
      expect(parse(phrase)).toEqual({ type: 'startTimer', minutes })
    })

    it.each(['timer for 4 hours', 'timer for 0 minutes', 'set a timer for 181 minutes', 'timer for 200 minutes'])(
      'out of range with timer: %j -> null (never a default-length timer)',
      (phrase) => {
        expect(parse(phrase)).toBeNull()
      },
    )

    it.each([
      ['seven minutes', 7],
      ['5 minutes please', 5],
      ['half an hour', 30],
      ['ninety seconds', 2],
      ['an hour and a half', 90],
      ['okay ten minutes', 10],
      ['one and a half hours', 90],
    ])('without timer, core is only the duration: %j -> %i', (phrase, minutes) => {
      expect(parse(phrase)).toEqual({ type: 'startTimer', minutes })
    })

    it.each([
      "i'll be back in 5 minutes",
      'wait two seconds',
      'give me one second',
      'just a minute',
      'seven minutes later',
      'leave it for seven minutes',
      'a minute',
      'an hour',
    ])('without timer, duration plus other words: %j -> null', (phrase) => {
      expect(parse(phrase)).toBeNull()
    })

    it('a bare number only counts as minutes together with "timer"', () => {
      expect(parse('set timer 3')).toEqual({ type: 'startTimer', minutes: 3 })
      expect(parse('3')).toBeNull()
      expect(parse('five')).toBeNull()
    })
  })

  describe('explicit vs ambiguous ingredient verbs', () => {
    const withGarlic = ['Garlic', 'Chicken breast']

    it.each([
      ['check basil', 'basil', true],
      ['tick basil', 'basil', true],
      ['uncheck basil', 'basil', false],
      ['untick basil', 'basil', false],
      ['check the dragon fruit', 'dragon fruit', true],
    ])('explicit verb, X not an ingredient: %j -> checkIngredient', (phrase, query, checked) => {
      expect(parse(phrase, withGarlic)).toEqual({ type: 'checkIngredient', query, checked })
    })

    it.each(['got basil', 'remove basil', 'i have basil', "i've got basil", 'ive got basil'])('ambiguous verb, X not an ingredient: %j -> null', (phrase) => {
      expect(parse(phrase, withGarlic)).toBeNull()
    })

    it.each([
      ['got garlic', true],
      ['i have garlic', true],
      ["i've got garlic", true],
      ['ive got garlic', true],
      ['remove garlic', false],
      ['got the garlic', true],
    ])('ambiguous verb, X is an ingredient: %j -> checkIngredient', (phrase, checked) => {
      expect(parse(phrase, withGarlic)).toEqual({ type: 'checkIngredient', query: 'garlic', checked })
    })

    it('pronoun-only X falls through, even for explicit verbs', () => {
      for (const p of ['check it', 'check that', 'check this', 'tick them', 'uncheck those', 'check these', 'got it', 'remove this']) {
        expect(parse(p, withGarlic), p).toBeNull()
      }
    })

    it('ambiguous verbs only count at the start of core', () => {
      expect(parse('i said i got garlic', withGarlic)).toBeNull()
    })
  })

  describe('goToStep shapes', () => {
    it.each([
      ['step 3', 3],
      ['go to step 3', 3],
      ['jump to step three', 3],
      ['show step 4', 4],
      ['step 2 please', 2],
      ['go to step 5 now', 5],
      ['okay step seven', 7],
      ['go to the step 3', 3],
    ])('%j -> goToStep %i', (phrase, step) => {
      expect(parse(phrase)).toEqual({ type: 'goToStep', step })
    })

    it.each(['step 0', 'go to step', 'step', 'i am on step 3 of the recipe', 'go to step 3 and then stir', 'what is step 3'])('%j is not goToStep', (phrase) => {
      expect(parse(phrase)?.type).not.toBe('goToStep')
    })
  })

  describe('rule 12 works on core', () => {
    it('ignores filler around a bare ingredient name', () => {
      expect(parse('okay garlic please')).toMatchObject({ type: 'checkIngredient' })
      expect(parse('um coconut milk')).toMatchObject({ type: 'checkIngredient' })
    })

    it('uses the raw trimmed transcript as the query', () => {
      expect(parse('  Garlic  ')).toEqual({ type: 'checkIngredient', query: 'Garlic' })
    })

    it('sentences that merely mention an ingredient are not matched when other words fail the lookup', () => {
      expect(parse('add the garlic to the pan', ['Garlic'])).toBeNull()
    })
  })

  describe('tabs', () => {
    it.each([
      ['show me ingredients', { type: 'showTab', tab: 'ingredients' }],
      ['show me steps', { type: 'showTab', tab: 'steps' }],
      ['ingredient list', { type: 'showTab', tab: 'ingredients' }],
      ['next steps', { type: 'next' }],
      ['previous steps', { type: 'previous' }],
    ] as Array<[string, Command]>)('%j', (phrase, expected) => {
      expect(parse(phrase)).toEqual(expected)
    })
  })

  describe('rules 10/11 phrases', () => {
    it.each([
      ['move on', { type: 'next' }],
      ['next one', { type: 'next' }],
      ['go to next step', { type: 'next' }],
      ['go back a step', { type: 'previous' }],
      ['go to previous step', { type: 'previous' }],
      ['one step back', { type: 'previous' }],
      ['go to the previous step', { type: 'previous' }],
    ] as Array<[string, Command]>)('%j', (phrase, expected) => {
      expect(parse(phrase)).toEqual(expected)
    })
  })
})
