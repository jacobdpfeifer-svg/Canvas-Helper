# APPM1235 — Precalc study set

Agent-written worked examples and patterns (not Canvas truth). For WA3 Q20–30 quick table, see class notes in [`APPM1235.md`](APPM1235.md).

## Pattern: factoring with fractional exponents

**Rule:** When several terms share the same base with different fractional powers, factor out the **lowest** (most negative) exponent.

Use \(x^a \cdot x^b = x^{a+b}\) to find what stays inside the brackets.

**WA3 anchors:** Q28 `x^(-7/2)(1+x)²`; Q29 `x(x−12)(x−6)^(3/2)`.  
**Reference:** [Purplemath — fractional exponents](https://www.purplemath.com/modules/factfrac.htm)

---

## Worked example: derivative-style fraction (6−5x)

**Problem:** Simplify

\[
\frac{(6-5x)^{1/2} + \tfrac{3}{2}x(6-5x)^{-1/2}}{6-5x}
\]

This is the classic “simplify a derivative-style expression” problem — same factoring-with-fractional-exponents idea as Q28–Q29, just sitting on top of a fraction.

### Step 1 — Factor the numerator

Numerator terms:

\[
(6-5x)^{1/2} + \tfrac{3}{2}x(6-5x)^{-1/2}
\]

Exponents on \((6-5x)\) are \(1/2\) and \(-1/2\). Lowest power is \(-1/2\), so factor that out:

\[
(6-5x)^{-1/2}\bigl[\;?\;+\;?\;\bigr]
\]

**First blank:** \((6-5x)^{-1/2}\) times what gives \((6-5x)^{1/2}\)?

Using \(x^a \cdot x^b = x^{a+b}\): \(-\tfrac{1}{2} + ? = \tfrac{1}{2} \Rightarrow ? = 1\).

So the first blank is \((6-5x)^1 = (6-5x)\).

**Second blank:** dividing \((6-5x)^{-1/2}\) out of \(\tfrac{3}{2}x(6-5x)^{-1/2}\) leaves \(\tfrac{3}{2}x\).

Numerator becomes:

\[
(6-5x)^{-1/2}\bigl[(6-5x) + \tfrac{3}{2}x\bigr]
\]

### Step 2 — Simplify the bracket

\[
6 - 5x + \tfrac{3}{2}x = 6 - \tfrac{10}{2}x + \tfrac{3}{2}x = 6 - \tfrac{7}{2}x
\]

Clear the fraction over a common denominator:

\[
6 - \tfrac{7}{2}x = \frac{12 - 7x}{2}
\]

Whole numerator:

\[
(6-5x)^{-1/2} \cdot \frac{12 - 7x}{2}
\]

### Step 3 — Divide by the denominator \((6-5x)\)

\[
\frac{(6-5x)^{-1/2} \cdot \dfrac{12 - 7x}{2}}{6-5x}
\]

Dividing by \((6-5x) = (6-5x)^1\) subtracts \(1\) from the exponent: \(-\tfrac{1}{2} - 1 = -\tfrac{3}{2}\).

\[
= \frac{12 - 7x}{2} \cdot (6-5x)^{-3/2}
\]

### Final answer

\[
\boxed{\frac{12 - 7x}{2(6-5x)^{3/2}}}
\]

(positive exponent form: multiply top and bottom conceptually by \((6-5x)^{3/2}\) if needed)

### Why this pattern shows up

Problems like this usually come from differentiating something like \(x(6-5x)^{1/2}\) via the product rule. That’s why you see matching bases with exponents exactly **1 apart** (\(1/2\) and \(-1/2\)). Recognizing that pattern tells you which power to factor out.

**Self-check:** If you differentiate \(x(6-5x)^{1/2}\), the quotient rule / product rule should rebuild this numerator before simplification.

---

## Quick checklist (fractional-exponent simplify)

1. Spot a **common base** with exponents differing by 1 (e.g. \(1/2\) and \(-1/2\)).
2. Factor out the **smallest** exponent on that base.
3. Use \(x^a \cdot x^b = x^{a+b}\) to fill the bracket.
4. Combine like terms in the bracket.
5. If there’s a denominator, rewrite it as a power and **subtract exponents** when dividing.
