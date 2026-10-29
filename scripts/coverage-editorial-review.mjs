// Separately maintained, targeted author review. NOT an external expert opinion.
// Finite answer sheet: no generated question obtains approval just by carrying flags.
export const reviewedKeys={
 chemistry:{
  'sulfur-substance':'24','iron-substance':'35','shells-magnesium':'312','shells-oxygen':'28','sulfur-oxidation':'123','nitrogen-oxidation':'321',
  'ionic-compounds':'14','nonpolar-molecules':'24','magnesium-argon':'13','potassium-calcium':'34','acid-oxide-salt':'32','base-acid':'24',
  'sodium-oxide-properties':'13','copper-oxide-properties':'35','reaction-products-a':'312','reaction-products-b':'321','reagent-pairs-a':'123','reagent-pairs-b':'312',
  'redox-reaction-selection-a':'13','redox-reaction-selection-b':'24','reaction-signs-a':'321','reaction-signs-b':'321','calcium-dissociation':'13','potassium-sulfate-dissociation':'23',
  'carbonate-net-ionic':'35','silver-net-ionic':'24','electron-process-a':'122','electron-process-b':'121','lab-safety-a':'135','lab-safety-b':'23','identify-solutions-a':'123','identify-solutions-b':'321'
 },
 biology:{'kingdom-organisms-a':'3124','kingdom-organisms-b':'4321','table-organelle':'3','table-tissue':'1','leaf-text':'2513','digestion-text':'6423','development-types':'21212','plant-groups':'12122','bacteria-judgments':'3','fungi-judgments':'2','sweating-function':'2','breathing-exercise':'3','erythrocyte-traits':'125','skeletal-muscle-traits':'136','circulation-types':'212112','nervous-parts':'121221'},
 'social-studies':{'culture-scientific-test':'2','culture-art':'3','socialization-responsibility':'4','social-role':'1','mobility-judgments':'3','education-judgments':'2','market-price-signal':'1','money-functions':'2','democracy-signs':'3','federation-sign':'1','personal-right':'3','political-right':'2','civil-situation':'4','labour-situation':'1','executive-body':'3','constitution-supremacy':'2'}
};
export const reviewReferences={
 chemistry:['https://openstax.org/books/chemistry-2e/pages/2-2-atomic-structure-and-symbolism','https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions'],
 biology:['https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells','https://openstax.org/books/biology-2e/pages/24-1-characteristics-of-fungi','https://openstax.org/books/biology-2e/pages/34-1-digestive-systems','https://openstax.org/books/biology-2e/pages/40-1-overview-of-the-circulatory-system'],
 'social-studies':['https://openstax.org/books/introduction-sociology-3e/pages/4-1-types-of-societies','http://www.constitution.ru/10003000/10003000-1.htm','http://www.constitution.ru/10003000/10003000-2.htm','http://www.constitution.ru/10003000/10003000-7.htm']
};
export const reviewNotes={
 chemistry:'Checked every option and reaction condition. Carbonate + calcium hydroxide excludes excess CO2; CuO is not treated as soluble/amphoteric; nitrate is not split into N/O ions. Reagent-pair items require BOTH reactions; alternative distinguishing reagents are explicitly considered. NH4+ + OH− needs warming. First identification item compares appearance/gas, not white precipitate shades; sufficient concentrations declared. Oxidation states and electron directions independently recomputed where numerical. This is finite editorial QA, not a general chemistry theorem prover.',
 biology:'Checked all organisms, every A/B statement and all distractors. Birds/placental mammals develop directly; frog, butterfly and perch have larval stages. Mature HUMAN erythrocytes specified; epithelial cell specified so absence of a nucleus in an erythrocyte cannot create ambiguity. Peripheral nodes/nerves distinguished from CNS; pulmonary vessels classified by circuit rather than oxygen content. Gaps refer to the four explicit letters, not sentence numbers. No image-dependent slot is replaced by a text question.',
 'social-studies':'Checked definitions, all four alternatives and A/B truth combinations. Status and role distinguished; vertical/horizontal mobility constraints explicit; regime, form of government and territorial structure not conflated. Law questions ask stable school concepts; no case-specific legal advice. Constitution facts: article15 supremacy, article20 life, article32 electoral rights, article110 executive power. External expert validation not performed.'
};
