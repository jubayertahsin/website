/* ---------------------------------------------------------------------------
 * SplitText — staggered type with no JavaScript at all.
 *
 * This is a SERVER component, which is the interesting part. The usual approach
 * measures the element on the client, splits its text into spans after mount, and
 * animates each span with its own tween. That approach has three costs a
 * portfolio can ill afford: the text is briefly unsplit and then reflows, the
 * work happens on the main thread during the most contended moment of page load,
 * and forty tweens now exist where one style write would do.
 *
 * Here the split happens during the server render, so the spans are in the HTML
 * that arrives. Each cell carries its index as `--i` and the total as `--n`, and
 * globals.css computes the per-cell delay arithmetically from the shared `--e`:
 *
 *   --t: clamp(0, (--e * (1 + stagger) - (--i / --n) * stagger) * 1.6, 1)
 *
 * So the entire headline animates from ONE custom property written by the parent
 * scene. There is no per-character JavaScript anywhere in this build.
 *
 * Accessibility: a screen reader given a hundred separate one-character spans
 * pronounces them separately, which is unusable. So the wrapper carries the
 * whole string as `aria-label` and the cells are hidden from the accessibility
 * tree. The text is still in the DOM for crawlers, which concatenate inline
 * elements, and still selectable word by word because `word` mode keeps words
 * whole and `char` mode wraps each word in a nowrap group.
 * ------------------------------------------------------------------------- */

import { vars, cx } from "@/lib/css";

type Tag = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div" | "strong";

export interface SplitTextProps {
  /** A string for char and word modes; an array of lines for line mode. */
  text: string | readonly string[];
  by?: "char" | "word" | "line";
  as?: Tag;
  className?: string;
  /**
   * Set when a section points at its own heading with aria-labelledby, which is
   * how a <section> gets an accessible name without repeating the title in an
   * aria-label that can then drift out of sync with the visible text.
   */
  id?: string;
  /**
   * How much of the animation is spent staggering rather than moving. 0 means
   * every cell moves together; 1 means the last cell starts as the first
   * finishes. Above about 0.7 a long headline reads as a wave and stops feeling
   * like one piece of type.
   */
  stagger?: number;
}

export default function SplitText({
  text,
  by = "word",
  as = "span",
  className,
  id,
  stagger = 0.55,
}: SplitTextProps) {
  const Tag = as;
  const plain = Array.isArray(text) ? (text as readonly string[]).join(" ") : (text as string);

  if (by === "line") {
    const lines = Array.isArray(text) ? (text as readonly string[]) : [text as string];
    return (
      <Tag
        className={cx(className)}
        data-split="lines"
        id={id}
        style={vars({ "--n": lines.length, "--stagger": stagger })}
        aria-label={plain}
      >
        {lines.map((line, i) => (
          <span key={i} className="ln" style={vars({ "--i": i })} aria-hidden="true">
            {line}
          </span>
        ))}
      </Tag>
    );
  }

  const words = plain.split(/(\s+)/).filter((w) => w.length > 0);

  if (by === "word") {
    // Whitespace runs are kept as their own non-cell children, so the spacing is
    // real text rather than a margin. A margin between words breaks text-wrap and
    // makes justified or balanced wrapping impossible.
    const cells = words.filter((w) => !/^\s+$/.test(w));
    let index = -1;
    return (
      <Tag
        className={cx(className)}
        data-split="words"
        id={id}
        style={vars({ "--n": cells.length, "--stagger": stagger })}
        aria-label={plain}
      >
        {words.map((w, i) => {
          if (/^\s+$/.test(w)) return <span key={i} aria-hidden="true">{w}</span>;
          index += 1;
          return (
            <span key={i} className="c" style={vars({ "--i": index })} aria-hidden="true">
              {w}
            </span>
          );
        })}
      </Tag>
    );
  }

  // char mode
  const total = plain.replace(/\s+/g, "").length;
  let ci = -1;
  return (
    <Tag
      className={cx(className)}
      data-split="chars"
      id={id}
      style={vars({ "--n": total, "--stagger": stagger })}
      aria-label={plain}
    >
      {words.map((w, i) => {
        if (/^\s+$/.test(w)) return <span key={i} aria-hidden="true">{w}</span>;
        return (
          // The nowrap group is what stops a word breaking mid-air when each of
          // its letters is its own inline-block.
          <span key={i} className="w" aria-hidden="true">
            {Array.from(w).map((ch, k) => {
              ci += 1;
              return (
                <span key={k} className="c" style={vars({ "--i": ci })}>
                  {ch}
                </span>
              );
            })}
          </span>
        );
      })}
    </Tag>
  );
}
