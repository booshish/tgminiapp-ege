/** Authorship declarations are not a third-party licence audit or a QA certificate. */
export type ContentProvenance = {
  source_type: "original";
  license: null;
  permission: "created-for-project";
  author: string;
  source_url: null;
  creation_method: "existing-project-author-declaration" | "original-deterministic-family" | "original-individual-task" | "original-explanation";
  rights_status: "project-authorship-declared";
};

export function originalProvenance(creation_method: ContentProvenance["creation_method"]): ContentProvenance {
  return {
    source_type: "original", license: null, permission: "created-for-project",
    author: "Точка · авторские материалы проекта", source_url: null,
    creation_method, rights_status: "project-authorship-declared",
  };
}
