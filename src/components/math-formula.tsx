import katex from "katex";

type MathFormulaProps = {
  latex: string;
  block?: boolean;
};

/** KaTeX включает доступный MathML; визуальная HTML-копия скрыта от скринридера. */
export function MathFormula({ latex, block = true }: MathFormulaProps) {
  const Tag = block ? "div" : "span";
  const html = katex.renderToString(latex, {
    displayMode: block,
    output: "htmlAndMathml",
    trust: false,
    throwOnError: false,
  });

  return (
    <Tag
      className={block ? "math-block formula" : "math-inline"}
      tabIndex={block ? 0 : undefined}
      role={block ? "group" : undefined}
      aria-label={block ? "Математическая формула" : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
