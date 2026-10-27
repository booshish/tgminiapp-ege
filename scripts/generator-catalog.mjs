/** Capability records for EXISTING factories, not a second generation engine.
 * READY is computed by the audit, never inferred from five published seeds.
 */
const capability=(model,number,subtype,file,exportName,verifier,method,options={})=>({
  id:`${model}:${number}:${subtype}`,model,number,subtype,
  implementation:{file,export:exportName,kind:"parameterized-original-template"},
  verification:{file:verifier,method,independent:true},
  difficulty:["foundation"],resourcesProvided:true,
  limits:["Only the validated parameter domain; not every subtype at this exam number"],
  ...options,
});
const remaining="scripts/remaining-generators.mjs",rv="scripts/verify-remaining-generators.mjs";
const science="scripts/release-science-stage-a.mjs";
const human="scripts/humanities-originals.mjs";
export const generatorCapabilities=[
  capability("oge-geography",13,"relative-humidity",remaining,"humidity",rv,"inverse-rounding-interval"),
  ...["oge","ege"].map(exam=>capability(`${exam}-geography`,exam==="oge"?24:16,"population-balance",remaining,"migration",rv,"inverse-population-balance")),
  capability("ege-geography",15,"reserve-production-ratio",remaining,"resourceYears",rv,"unit-conversion-and-inverse-product"),
  capability("ege-geography",14,"time-zone-conversion",remaining,"localTime",rv,"UTC-calendar-cross-check",{resourcesProvided:false,limits:["Mandatory original time-zone map is missing; never publish a text substitute"]}),
  ...["gamete","daughter-mitosis"].map(type=>capability("ege-biology",3,type,remaining,"chromosomes",rv,"homologous-pair-enumeration")),
  ...["recessive","heterozygote"].map(type=>capability("ege-biology",4,`monohybrid-${type}`,remaining,"cross",rv,"gamete-product-enumeration")),
  ...["oge","ege"].map(exam=>capability(`${exam}-biology`,exam==="oge"?3:12,"taxonomic-rank-order",remaining,"taxonomy",rv,"rank-order-check",{requiresEditorialReview:true,limits:["Caller-supplied labels and ranks require factual review; algorithm alone cannot validate new taxa"]})),
  ...["oge","ege"].flatMap(exam=>[
    capability(`${exam}-history`,1,"events-to-years",human,"historicalMatching",human,"reference-facts-and-independent-matching",{requiresEditorialReview:true,limits:["Eight reviewed facts only; distractor selection needs editorial review"]}),
    capability(`${exam}-history`,2,"chronology-russia",human,"chronology",human,"independent-chronological-order",{requiresEditorialReview:true,limits:["Finite reviewed Russian-history facts; full EGE Russia/world format not covered"]}),
  ]),
  capability("oge-social-studies",9,"limited-budget-choice",human,"affordableBasket",human,"repeated-subtraction-and-single-feasible-choice"),
  ...["oge","ege"].map(exam=>capability(`${exam}-social-studies`,exam==="oge"?14:6,"short-run-fixed-variable-costs",human,"costMatching",human,"reference-concepts-and-category-check",{requiresEditorialReview:true,limits:["Only existing examples; shuffling them is not a new diverse content bank"]})),
  capability("ege-social-studies",7,"budget-constraint-judgments",human,"economicJudgments",human,"independent-budget-identity",{requiresEditorialReview:true,limits:["One fixed judgment structure; new claims need factual and ambiguity review"]}),
  capability("oge-physics",9,"ohm-current",science,"ohmTemplate",science,"independent-U-equals-I-times-R"),
  capability("oge-chemistry",19,"carbonate-element-mass",science,"carbonateTemplate",science,"atomic-mass-fraction-and-inverse-balance"),
  capability("ege-chemistry",26,"dilute-solution-mixture",science,"solutionTemplate",science,"independent-solute-conservation",{difficulty:["standard"]}),
  capability("oge-physics",6,"uniform-speed",science,"speedTemplate",science,"independent-distance-substitution",{newThisStage:true}),
  capability("oge-physics",7,"density-SI-conversion",science,"densityTemplate",science,"independent-mass-reconstruction",{newThisStage:true}),
  capability("oge-physics",8,"water-heating-no-phase-change",science,"heatTemplate",science,"inverse-temperature-and-energy-check",{newThisStage:true,difficulty:["standard"]}),
  capability("oge-physics",10,"DC-power",science,"powerTemplate",science,"inverse-voltage-and-units",{newThisStage:true}),
  capability("ege-chemistry",27,"stoichiometric-heat",science,"thermochemistryTemplate",science,"inverse-stoichiometric-mass-and-balanced-reaction",{newThisStage:true,difficulty:["standard"]}),
  capability("ege-chemistry",28,"gas-from-impure-metal",science,"gasYieldTemplate",science,"inverse-purity-balance-and-balanced-reaction",{newThisStage:true,difficulty:["standard"]}),
  capability("oge-informatics",1,"fixed-width-information-volume","scripts/original-informatics-pilot.mjs","informationVolumeTemplate","scripts/check-generator-controls.mjs","independent-byte-accumulation-and-parsed-statement",{newThisStage:true}),
  capability("oge-informatics",10,"positional-value-conversion","scripts/original-informatics-pilot.mjs","radixValueTemplate","scripts/check-generator-controls.mjs","independent-place-value-expansion",{newThisStage:true}),
  capability("ege-informatics",14,"power-minus-offset-digit-count","scripts/original-informatics-pilot.mjs","radixDigitCountTemplate","scripts/check-generator-controls.mjs","BigInt-radix-conversion-versus-two-digit-closed-form",{newThisStage:true,difficulty:["standard"]}),
];

const domains={
  humidity:{actual:{min:0,max:30,unit:"g/m3"},saturated:{min:.1,max:40,unit:"g/m3"},temperature:{min:-30,max:40,unit:"C"},constraints:["actual <= saturated", "saturation within 3% of the temperature model", "integer-percent rounding"]},
  migration:{population:{min:1000,max:1e7,integer:true},birthsAndDeaths:{min:0,max:1e6,integer:true},constraints:["annual change, births and deaths each below 20% of initial population", "no boundary changes"]},
  resourceYears:{reserves:{min:.1,max:1000,unit:"billion-tonnes"},production:{min:.1,max:1000,unit:"million-tonnes/year"},constraints:["integer duration <= 10000 years"]},
  localTime:{hour:{min:0,max:23,integer:true},duration:{min:1,max:12,integer:true},offset:{min:2,max:12,integer:true},constraints:["map prerequisite remains BLOCKED"]},
  chromosomes:{diploid:{min:4,max:80,integer:true},constraints:["even chromosome count", "only normal meiosis or completed mitosis; no aneuploidy"]},
  cross:{parentA:["AA","Aa","aa"],parentB:["AA","Aa","aa"],target:["recessive","heterozygote"],constraints:["one autosomal locus, complete dominance, random fertilization, equal viability"]},
  taxonomy:{ranks:{min:0,max:6,integer:true},items:{min:5,max:7},constraints:["unique ranks", "rank labels need independent factual review"]},
  historicalMatching:{constraints:["only IDs in historicalFacts", "three distinct dated events", "unique years and reviewed distractors"]},
  chronology:{eventCount:{min:3,max:4},constraints:["only historicalFacts", "distinct event years", "Russian-only subtype, not full mixed EGE chronology"]},
  affordableBasket:{budget:{min:1,max:20000,integer:true},constraints:["two positive integer prices", "four distinct baskets", "exactly one affordable basket"]},
  costMatching:{constraints:["five fixed reviewed examples per exam", "permutations 0..4 only", "one-month contracts fixed", "not scalable merely by shuffling"]},
  economicJudgments:{constraints:["positive integer budget and prices", "budget divisible by both prices", "only existing reviewed judgments"]},
  ohmTemplate:{voltage:{min:1,max:240,unit:"V"},resistance:{min:.1,max:1e6,unit:"ohm"},current:{min:.0001,max:20,unit:"A"},constraints:["at most four exact decimal places"]},
  carbonateTemplate:{mass:{min:1,max:10000,integer:true,unit:"mg"},constraints:["pure anhydrous CaCO3; given atomic masses 40,12,16"]},
  solutionTemplate:{mass:{min:1,max:10000,unit:"g"},fraction:{min:0,max:20,unit:"percent"},constraints:["aqueous NaCl at 20 C", "no loss, reaction or crystallization", "short exact decimal key"]},
  speedTemplate:{distance:{min:1,max:10000,unit:"m"},time:{min:1,max:3600,unit:"s"},speed:{min:.1,max:50,unit:"m/s"},constraints:["uniform straight motion", "short exact decimal key"]},
  densityTemplate:{volume:{min:1,max:1000,unit:"cm3"},density:[2700,7800,8900],constraints:["homogeneous solid metal", "density in kg/m3", "short exact decimal mass"]},
  heatTemplate:{mass:{min:.1,max:5,unit:"kg"},start:{min:5,max:75,unit:"C"},end:{min:10,max:90,unit:"C"},constraints:["end > start", "liquid water with c=4200, no phase transition or heat loss"]},
  powerTemplate:{voltage:{min:3,max:48,unit:"V"},current:{min:.05,max:5,unit:"A"},constraints:["DC current", "short exact decimal key"]},
  thermochemistryTemplate:{oxygenMass:{min:1,max:640,unit:"g"},constraints:["given 572 kJ per mole O2", "liquid water product", "excess hydrogen", "theoretical calculation only"]},
  gasYieldTemplate:{sampleMass:{min:.5,max:100,unit:"g"},impurityPercent:{min:0,max:50},constraints:["inert nonreacting impurities", "excess HCl", "given molar volume 22.4 L/mol", "short exact decimal key"]},
  informationVolumeTemplate:{symbols:{min:1,max:1000000,integer:true},bits:[8,16,32],constraints:["fixed-width symbols", "no headers or compression"]},
  radixValueTemplate:{radix:{min:2,max:16,integer:true},digits:{minLength:1,maxLength:8},constraints:["uppercase valid digits", "no leading zeros", "value <= 1e9"]},
  radixDigitCountTemplate:{base:{min:2,max:16,integer:true},exponent:{min:3,max:30,integer:true},offset:{min:1,maxExclusive:"base squared",integer:true},constraints:["two-digit tail decomposition", "BigInt independent verification"]},
};
for(const c of generatorCapabilities)c.parameterDomain=domains[c.implementation.export];

/** Fixed banks are inventoried as finite editorial families, not scalable APIs. */
export const finiteFactoryInventory=[
  {file:"src/lib/content/oge-bank.ts",exports:["ogeTasks","ogeGeneratorCases"],model:"oge-math",kind:"finite-original-math-bank",verifier:"scripts/test-oge-bank.mjs"},
  {file:"src/lib/content/ege-bank.ts",exports:["egeTasks","egeGeneratorCases"],model:"ege-math-profile",kind:"finite-original-math-bank",verifier:"scripts/test-ege-bank.mjs"},
  {file:"src/lib/content/base-bank.ts",exports:["baseTasks","baseGeneratorCases"],model:"ege-math-base",kind:"finite-parameter-families",verifier:"scripts/test-base-bank.mjs"},
  {file:"src/lib/content/challenge-bank.ts",exports:["challengeTasks","challengeGeneratorCases"],kind:"finite-original-math-bank",verifier:"scripts/test-challenge-bank.mjs"},
  {file:"src/lib/content/informatics-bank.ts",exports:["informaticsTasks"],models:["oge-informatics","ege-informatics"],kind:"finite-original-seeds",verifier:"scripts/test-subject-expansion.mjs"},
  {file:"src/lib/content/physics-bank.ts",exports:["physicsTasks"],model:"ege-physics",kind:"finite-original-seeds",verifier:"scripts/test-multi-subject.mjs"},
  {file:"src/lib/content/russian-bank.ts",exports:["russianTasks"],models:["oge-russian","ege-russian"],kind:"finite-editorial-language-seeds",verifier:"docs/russian-content-review.json"},
  {file:"src/lib/content/russian-pack2.ts",exports:["russianPack2"],models:["oge-russian","ege-russian"],kind:"finite-editorial-language-seeds",verifier:"scripts/russian-pack2-review.mjs"},
  {file:"src/lib/content/russian-pack3.ts",exports:["russianPack3"],models:["oge-russian","ege-russian"],kind:"finite-editorial-language-seeds",verifier:"scripts/russian-pack3-review.mjs"},
  {file:"src/lib/content/russian-pack4.ts",exports:["russianPack4"],models:["oge-russian","ege-russian"],kind:"finite-editorial-language-seeds",verifier:"scripts/russian-pack4-review.mjs"},
  {file:"scripts/original-informatics-pilot.mjs",exports:["entries"],model:"oge-informatics",kind:"finite-reviewed-pilot",verifier:"scripts/release-task-pilot.mjs"},
  {file:"scripts/multi-subject-originals.mjs",exports:["rows"],kind:"finite-reviewed-multi-subject-pilot",verifier:"scripts/test-multi-subject.mjs"},
  {file:"scripts/language-originals.mjs",exports:["buildLanguagePilot"],kind:"finite-editorial-language-seeds",verifier:"scripts/test-remaining-pilot.mjs"},
  {file:"scripts/remaining-generators.mjs",exports:["numericPilot"],kind:"finite-mixed-pilot",verifier:"scripts/verify-remaining-generators.mjs"},
];
