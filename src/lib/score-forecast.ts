/** Design contract only. There is no estimator or learner-facing forecast in this release. */
export type ForecastExamContext = {
  examVersionId: string;
  examYear: number;
  subjectId: string;
  examType: string;
  level: string | null;
};

export type ForecastEvidence = ForecastExamContext & {
  attemptId: string;
  taskId: string;
  examNumber: number;
  topicId: string;
  prototypeId: string;
  occurredAt: string;
  source: "practice" | "timed-mock";
  evaluation: "automatic" | "self-assessment" | "reviewed-by-examiner";
  firstIndependentAttempt: boolean;
  solutionSeenBeforeAttempt: boolean;
  primaryScore: number;
  maximumPrimaryScore: number;
  scoringRuleVersion: string;
  difficultyLabel: "foundation" | "standard" | "advanced";
  difficultyCalibration: "author-label-only" | "empirically-calibrated";
};

export type ForecastValidation = {
  modelVersion: string;
  examVersionId: string;
  cohortSize: number;
  holdoutSize: number;
  /** Evaluation uses independent verified exams, not the same practice events used to fit. */
  outcomeSource: "verified-exam-results";
  evaluatedAt: string;
  primaryScoreMeanAbsoluteError: number;
  intervalCoverage: number;
  nominalIntervalCoverage: number;
  subgroupChecks: { group: string; sampleSize: number; meanAbsoluteError: number; intervalCoverage: number }[];
  findings: string[];
};

export type ForecastReleaseApproval = {
  productApproval: { approvedAt: string; methodVersion: string } | null;
  officialSpecification: { examVersionId: string; sourceUrl: string; reviewedAt: string } | null;
  officialConversion: { sourceUrl: string; year: number; reviewedAt: string } | null;
  independentValidation: ForecastValidation | null;
  privacyReviewAt: string | null;
};

/** Research-only output contract: a range, never XP or an unqualified expected exam score. */
export type ForecastResearchEstimate = ForecastExamContext & {
  methodVersion: string;
  status: "research-only";
  primaryScoreInterval: { lower: number; upper: number; coverage: number };
  automaticPartEvidence: { independentUniqueTasks: number; coveredNumbers: number; observedDays: number };
  selfAssessmentPart: { includedAsUnverified: boolean; lowerBound: number; upperBound: number };
  missingNumbers: number[];
  uncertaintyReasons: string[];
  /** A test-score conversion may only be attached after an official year-specific review. */
  testScoreInterval?: { lower: number; upper: number; conversionSourceUrl: string };
};

export const scoreForecastProposal = {
  methodVersion: "proposal-2026-10-v1",
  status: "not-approved" as const,
  enabled: false as const,
  uiAvailable: false as const,
  // Starting hypotheses for a later validation study, not approved product thresholds.
  proposedMinimumEvidence: {
    independentUniqueTasks: 60,
    independentTasksPerCoveredNumber: 3,
    coveredNumberShare: 0.8,
    distinctStudyDays: 14,
    timedMockAttempts: 3,
    observationWindowDays: 90,
  },
  excludedSignals: ["xp", "win-streak", "subscription-tier", "repeated-task-checks", "solution-assisted-answers"],
  releasePrerequisites: [
    "approved-methodology",
    "verified-year-specific-exam-specification",
    "independent-outcome-validation",
    "calibrated-difficulty-labels",
    "privacy-review",
  ],
} as const;
