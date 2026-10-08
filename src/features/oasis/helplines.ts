// South African support lines for the Oasis. Numbers and hours were checked against each organisation's own pages

export type Helpline = {
  id: string;
  name: string;
  /** One plain line on what it's for. */
  about: string;
  /** Who it's for, in a few words. */
  audience: string;
  hours: string;
  /** As the organisation writes it, for reading. */
  number: string;
  /** A text line, where there is one. */
  sms?: {
    number: string;
    /** What to send, if the line asks for a word. */ body?: string;
    note: string;
  };
};

/** For someone in danger right now. 112 works from any mobile phone in South Africa. */
export const EMERGENCY = {
  number: "112",
  note: "Call 112 from any mobile phone.",
} as const;

/** Crisis lines first, then the rest. */
export const HELPLINES: readonly Helpline[] = [
  {
    id: "sadag-suicide",
    name: "Suicide Crisis Line",
    about:
      "For anyone having thoughts of suicide, or worried about someone who is. Run by SADAG.",
    audience: "Everyone",
    hours: "24 hours",
    number: "0800 567 567",
  },
  {
    id: "lifeline",
    name: "LifeLine South Africa",
    about: "Counselling for anyone, about anything that's weighing on you.",
    audience: "Everyone",
    hours: "24 hours",
    number: "0861 322 322",
  },
  {
    id: "gbv",
    name: "GBV Command Centre",
    about:
      "For anyone affected by gender-based violence. Social workers can send help.",
    audience: "Everyone",
    hours: "24 hours",
    number: "0800 428 428",
    sms: {
      number: "31531",
      body: "help",
      note: "Deaf, hard of hearing or with a disability: SMS “help” to 31531.",
    },
  },
  {
    id: "childline",
    name: "Childline South Africa",
    about: "For children and young people, and the adults worried about them.",
    audience: "Under 18s and parents",
    hours: "24 hours",
    number: "116",
  },
  {
    id: "substance",
    name: "Substance Abuse Line",
    about:
      "For worries about drugs or alcohol, yours or someone else's. Department of Social Development and SADAG.",
    audience: "Everyone",
    hours: "24 hours",
    number: "0800 12 13 14",
    sms: {
      number: "32312",
      note: "Or SMS 32312 and a counsellor will call you back.",
    },
  },
  {
    id: "aa",
    name: "Alcoholics Anonymous SA",
    about:
      "Volunteers who've been there, for anyone who wants help with their drinking.",
    audience: "Everyone",
    hours: "24 hours",
    number: "0861 435 722",
  },
  {
    id: "triangle",
    name: "Triangle Project",
    about: "Free, confidential support for LGBTQ+ people.",
    audience: "LGBTQ+",
    hours: "1pm to 9pm daily",
    number: "(021) 712 6699",
  },
];

/** The number as the phone app needs it: digits only. */
export const dialable = (number: string) => number.replace(/\D/g, "");

/** 0800 numbers and 116 cost nothing to call; others cost a normal call. */
export const isFree = (number: string) => {
  const digits = dialable(number);
  return digits.startsWith("0800") || digits === "116";
};

/** Read out digit by digit with pauses at the spaces, so a screen reader doesn't say "eight hundred". */
export const spokenNumber = (number: string) =>
  number
    .replace(/[()]/g, "")
    .split(/\s+/)
    .map((group) => group.split("").join(" "))
    .join(", ");
