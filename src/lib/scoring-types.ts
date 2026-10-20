/** A versioned local scoring policy; project configuration is not an official verification. */
export type XPScoringRule = {
  status: "verified" | "project-config";
  ruleId: string;
  examVersionId: string;
  examYear: number;
  subjectId: string;
  examType: string;
  examNumber: number;
  level: string | null;
  part: 1 | 2;
  answerFormat: "short" | "extended";
  maxPrimaryScore: number;
  /** Link to the official materials, not a claim that this environment read them. */
  sourceUrl: string;
  verifiedAt?: string;
};
