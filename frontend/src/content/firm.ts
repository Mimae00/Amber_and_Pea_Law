/**
 * SAMPLE CONTENT. Amber & Pea Law is a fictional firm; these details are invented.
 */
export const firm = {
  name: 'Amber & Pea Law',
  tagline: 'Personal injury and family law, explained in plain language.',
  phoneDisplay: '(555) 010-0142',
  phoneHref: 'tel:+15550100142',
  email: 'hello@amberpealaw.example',
  address: {
    street: '100 Example Avenue, Suite 400',
    city: 'Springfield',
    region: 'EX',
    postalCode: '00000',
  },
  hours: [
    { days: 'Monday – Friday', time: '9:00 AM – 5:00 PM' },
    { days: 'Saturday – Sunday', time: 'Closed (chat assistant available)' },
  ],
  disclaimer: 'Attorney advertising. Past results do not guarantee future outcomes.',
} as const;

export const whyChooseUs = [
  {
    title: 'Free first consultation',
    body: 'Talk through your situation at no cost and get a clear picture of your options before you decide anything.',
  },
  {
    title: 'Plain-language updates',
    body: 'We explain each step without jargon and return calls and emails within one business day.',
  },
  {
    title: 'Transparent fees',
    body: 'Injury matters are typically handled on contingency. Family law fees are explained in writing up front.',
  },
  {
    title: 'Two practices, one team',
    body: 'Injury and family matters often overlap. Our attorneys work together when your case needs both.',
  },
] as const;
