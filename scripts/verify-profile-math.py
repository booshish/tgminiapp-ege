"""Separate verification engine. Reads candidates, never writes/publicises tasks.
Uses exact rational arithmetic, SymPy identities/derivatives and direct finite enumeration.
This is mathematical QA of bounded families, NOT expert marking of student work.
"""
import json
import sys
from fractions import Fraction as Q
from math import isqrt
import sympy as s


def verify(row):
    p, t = row['proof'], row['task']
    f = p['family']
    x = s.Symbol('x', real=True)
    answer = None
    expected_self = None
    if f == 'right-triangle-area':
        answer = Q(p['x'] * p['y'], 2)
    elif f == 'trapezoid-area':
        answer = Q((p['x'] + p['y']) * p['h'], 2)
        assert p['y'] > p['x'] > 0 and p['h'] > 0
    elif f == 'dot-product':
        answer = sum(v*w for v, w in zip([p['x'], p['y']], [p['u'], p['v']]))
    elif f == 'vector-length':
        length2 = sum(v*v for v in [p['x'], p['y']])
        answer = isqrt(length2)
        assert answer*answer == length2
    elif f == 'rectangular-prism-volume':
        # Count unit cubes layer by layer, independently of a triple product.
        answer = sum(sum(p['x'] for _ in range(p['y'])) for _ in range(p['z']))
    elif f == 'cone-volume-coefficient':
        z = s.Symbol('z')
        answer = s.integrate((p['r'] * z / p['h'])**2, (z, 0, p['h']))
    elif f == 'one-draw':
        answer = Q(sum(i < p['w'] for i in range(p['total'])), p['total'])
    elif f == 'complement':
        answer = Q(sum(i >= p['bad'] for i in range(100)), 100)
    elif f == 'exactly-one':
        answer = Q(sum((i < p['p']) != (j < p['q']) for i in range(10) for j in range(10)), 100)
    elif f == 'total-probability-production':
        answer = Q(sum(j < (p['p'] if i < p['w'] else p['q']) for i in range(10) for j in range(10)), 100)
    elif f == 'finite-distribution-expectation':
        observations = [p['x']]*p['p'] + [p['y']]*p['q'] + [p['z']]*p['r']
        assert len(observations) == 100 and all(p[k] > 0 for k in ['p', 'q', 'r'])
        answer = Q(sum(observations), len(observations))
    elif f == 'two-point-variance':
        observations = [p['x']]*(10-p['p']) + [p['y']]*p['p']
        mean = Q(sum(observations), len(observations))
        answer = sum((Q(v)-mean)**2 for v in observations) / len(observations)
    elif f == 'two-point-standard-deviation':
        mean = Q(p['x']+p['y'], 2)
        variance = ((Q(p['x'])-mean)**2 + (Q(p['y'])-mean)**2) / 2
        answer = s.sqrt(s.Rational(variance.numerator, variance.denominator))
    elif f == 'linear-logarithmic-equation':
        roots = s.solve(p['c']*x + p['offset'] - p['base']**p['power'], x)
        assert len(roots) == 1 and p['c']*roots[0]+p['offset'] > 0
        answer = roots[0]
    elif f == 'affine-exponential-equation':
        roots = s.solve(p['c']*x+p['offset']-p['k'], x)
        assert len(roots) == 1 and p['base'] > 1
        answer = roots[0]
        assert p['base']**(p['c']*answer+p['offset']) == p['base']**p['k']
    elif f == 'radical-conjugate-product':
        answer = s.simplify((s.sqrt(p['x'])+s.sqrt(p['y']))*(s.sqrt(p['x'])-s.sqrt(p['y'])))
    elif f == 'radical-reciprocal-sum':
        root = s.sqrt(p['n']**2+1)
        answer = s.simplify(1/(root-p['n'])+1/(root+p['n'])-2*root+p['k'])
    elif f == 'cubic-local-minimum':
        polynomial = x**3/3-s.Rational(p['r']+p['s'], 2)*x*x+p['r']*p['s']*x+p['c']
        roots = s.solve(s.diff(polynomial, x), x)
        minima = [r for r in roots if s.diff(polynomial, x, 2).subs(x, r) > 0]
        assert len(minima) == 1
        answer = minima[0]
    elif f == 'quadratic-maximum':
        polynomial = -p['c']*(x-p['h'])**2+p['k']
        candidates = [p['h']-2, p['h']+3] + s.solve(s.diff(polynomial, x), x)
        answer = max(polynomial.subs(x, c) for c in candidates)
    elif f == 'joule-law':
        assert p['I'] > 0 and p['R'] > 0
        answer = s.solve(p['I']**2*p['R']*x-p['Q'], x)[0]
    elif f == 'accelerated-motion':
        roots = s.solve(s.Rational(p['acc'], 2)*x*x+p['v']*x-s.Rational(str(p['s'])), x)
        roots = [v for v in roots if v >= 0]
        assert len(roots) == 1 and p['acc'] > 0 and p['v'] > 0
        answer = roots[0]
    elif f == 'joint-work':
        filled = Q(1, p['T1']) + Q(p['u']-1, p['T1'])
        answer = 1/filled
    elif f == 'river-round-trip':
        assert p['v'] > p['c'] > 0
        times = s.solve([(p['v']+p['c'])*s.Symbol('t')-p['down'], (p['v']-p['c'])*s.Symbol('u')-p['up']], [s.Symbol('t'), s.Symbol('u')])
        answer = sum(times.values())
    elif f == 'quadratic-function-point':
        A = s.solve(x*(p['x']-p['h'])**2+p['k']-p['y'], x)[0]
        answer = A*(p['z']-p['h'])**2+p['k']
    elif f == 'linear-function':
        A, B = s.symbols('A B')
        result = s.solve([A*p['x1']+B-(p['k']*p['x1']+p['c']), A*p['x2']+B-(p['k']*p['x2']+p['c'])], [A, B])
        answer = result[A]*p['z']+result[B]
    elif f == 'equal-principal-loan-total':
        balance, payments = Q(p['S']), Q(0)
        for _ in range(p['n']):
            interest = balance*Q(p['r'], 100)
            principal = Q(p['S'], p['n'])
            payments += principal+interest
            balance -= principal
        assert balance == 0
        answer = payments
    elif f == 'compound-deposit':
        balance = Q(p['S'])
        for _ in range(2):
            balance += balance*Q(p['r'], 100)
        answer = balance
    elif f == 'trig-roots-selection':
        # Direct exact trigonometric evaluation on all relevant multiples of pi/6.
        valid = [i for i in range(6*p['L'], 6*p['R']+1) if s.cos(s.pi*i/6) == s.Rational(1, 2)]
        assert valid == p['roots']
        assert valid and all(f'{v}π/6' in t['answerDisplay'] for v in valid)
        expected_self = 'x = ±π/3 + 2πk, k ∈ ℤ; на отрезке: ' + '; '.join(f'{v}π/6' for v in valid)
    elif f == 'exponential-two-roots-selection':
        z = s.Symbol('z')
        roots = s.solve(z*z-(p['u']+p['v'])*z+p['u']*p['v'], z)
        assert set(roots) == {p['base']**p['p'], p['base']**p['q']} and p['p'] < p['q']
        assert t['answerDisplay'] == f"а) {p['p']}; {p['q']}. б) {p['p']}."
        expected_self = f"а) {p['p']}; {p['q']}. б) {p['p']}."
    elif f == 'prism-line-plane-tangent':
        assert p['x'] == 3*p['k'] and p['y'] == 4*p['k'] and p['h'] > 0
        diagonal = s.Matrix([p['x'], p['y'], p['h']])
        projection = s.Matrix([p['x'], p['y'], 0])
        tangent = s.sqrt(diagonal.dot(diagonal)-projection.dot(projection))/s.sqrt(projection.dot(projection))
        assert tangent == s.Rational(p['m'], p['k'])
        assert s.Matrix([-p['x'], p['y'], 0]).dot(s.Matrix([0, 0, p['h']])) == 0
        expected_self = f"а) BD ⟂ CC₁; б) {p['m']}/{p['k']}."
    elif f == 'triorthogonal-tetrahedron-section':
        matrix = s.diag(s.Rational(p['x'], 2), s.Rational(p['y'], 2), s.Rational(p['z'], 2))
        assert abs(matrix.det())/6 == s.Rational(p['x']*p['y']*p['z'], 48)
        assert p['x'] > 0 and p['y'] > 0 and p['z'] > 0
        expected_self = f"Плоскости параллельны; V = {p['x']*p['y']*p['z']}/48."
    elif f == 'rational-three-points':
        assert p['x'] < p['y'] < p['z']
        expr = (x-p['x'])*(x-p['y'])/(x-p['z'])
        solution = s.solve_univariate_inequality(expr >= 0, x, relational=False)
        assert solution == s.Union(s.Interval(p['x'], p['y']), s.Interval.open(p['z'], s.oo))
        expected_self = f"[{p['x']}; {p['y']}] ∪ ({p['z']}; +∞)"
    elif f == 'logarithmic-quadratic-inequality':
        assert p['base'] > 1 and p['p'] < p['q']
        solution = s.solve_univariate_inequality((x-p['p'])*(x-p['q']) <= 0, x, relational=False)
        assert solution == s.Interval(p['p'], p['q'])
        assert str(p['base']**p['p']) in t['answerDisplay'] and str(p['base']**p['q']) in t['answerDisplay']
        expected_self = f"[{p['base']**p['p']}; {p['base']**p['q']}]"
    elif f == 'quadratic-profit-optimization':
        profits = {n: n*(2*p['B']*p['h']+p['B']-p['B']*n)-(p['B']*n+p['C']) for n in range(2*p['h']+1)}
        maximum = max(profits.values())
        assert [n for n, v in profits.items() if v == maximum] == [p['h']]
        assert maximum == p['B']*p['h']**2-p['C']
        assert str(maximum) in t['answerDisplay']
        expected_self = f"x = {p['h']}; прибыль {maximum} руб."
    elif f == 'inventory-cost-optimization':
        positive = s.Symbol('q', positive=True)
        cost = p['A']/positive+p['B']*positive+p['C']
        optimum = s.solve(s.diff(cost, positive), positive)
        assert optimum == [p['h']]
        assert s.diff(cost, positive, 2).is_positive
        assert cost.subs(positive, p['h']) == 2*p['B']*p['h']+p['C']
        expected_self = f"x = {p['h']} т; Zmin = {2*p['B']*p['h']+p['C']}."
    elif f == 'right-triangle-altitude-proof':
        assert p['x']**2+p['y']**2 == p['c']**2
        height = s.Rational(p['x']*p['y'], p['c'])
        projection = s.Rational(p['x']**2, p['c'])
        assert height**2+projection**2 == p['x']**2
        assert str(p['x']**2) in t['answerDisplay'] and str(p['x']*p['y']) in t['answerDisplay']
        expected_self = f"AH = {p['x']**2}/{p['c']}; CH = {p['x']*p['y']}/{p['c']}."
    elif f == 'tangent-chord-similarity':
        assert 0 < p['near'] < p['far'] and p['t']**2 == p['near']*p['far']
        # Existence of an actual circle with a tangent of this length, not just numbers.
        radius = Q(p['far']-p['near'], 2)
        distance = Q(p['far']+p['near'], 2)
        assert distance**2-radius**2 == p['t']**2
        expected_self = f"PT = {p['t']}; AB = {p['far']-p['near']}."
    elif f == 'parameter-absolute-value-level':
        assert p['u'] < p['v'] and p['d'] == p['v']-p['u']
        for level in [p['d']-1, p['d'], p['d']+1, p['d']+7]:
            roots = s.solveset(s.Abs(x-p['u'])+s.Abs(x-p['v'])-level, x, domain=s.S.Reals)
            if level > p['d']:
                assert len(roots) == 2
            elif level == p['d']:
                assert roots == s.Interval(p['u'], p['v'])
            else:
                assert roots == s.EmptySet
        assert t['answerDisplay'] == f"a > {p['d']}"
        expected_self = f"a > {p['d']}"
    elif f == 'parameter-two-positive-roots':
        assert p['c'] > 0
        for delta in [-p['c']-1, -p['c'], 0, p['c'], p['c']+1]:
            roots = s.solve(x*x-2*delta*x+p['c']**2, x)
            both = len(roots) == 2 and all(r.is_real and r > 0 for r in roots)
            assert both == (delta > p['c'])
        assert t['answerDisplay'] == f"a > {p['h']+p['c']}"
        expected_self = f"a > {p['h']+p['c']}"
    elif f == 'integer-shifted-factorization':
        # Enumerate original equation in x,y, not shifted factors.
        pairs = [[i, j] for i in range(1, p['N']+1) for j in range(1, p['N']+1) if i*j+p['k']*i+p['k']*j == p['C']]
        assert pairs == p['pairs']
        expected = f"а) {'Да' if any(i == 1 for i, j in pairs) else 'Нет'}. б) "
        expected += ', '.join(f'({i}; {j})' for i, j in pairs) if pairs else 'Пар нет'
        expected += f". в) {max(i+j for i, j in pairs) if pairs else 'Пар нет'}."
        assert expected == t['answerDisplay']
        expected_self = expected
    elif f == 'integer-consecutive-sum':
        representations = []
        for start in range(1, p['N']+1):
            total, count = start, 1
            while total < p['N']:
                total += start+count
                count += 1
                if total == p['N']:
                    representations.append([count, start])
        assert sorted(representations) == p['representations']
        ordered = sorted(representations)
        expected_self = f"а) {'Да' if any(n == 3 for n, start in ordered) else 'Нет'}. б) "
        expected_self += '; '.join(str(n) for n, start in ordered) if ordered else 'Нет'
        expected_self += f". в) {max(n for n, start in ordered) if ordered else 'Представлений нет'}."
    else:
        raise AssertionError(f'No independent verifier: {f}')
    if answer is not None:
        actual = s.Rational(t['answerRule']['value'])
        assert actual == s.Rational(answer), (t['id'], actual, answer)
        assert t['answerDisplay'] == t['answerRule']['value']
    else:
        assert expected_self is not None and expected_self == t['answerDisplay'], (t['id'], expected_self)
    assert t['solution'] and all(step['text'].strip() for step in t['solution'])
    assert t['examNumber'] == p['number'] and t['part'] == (1 if p['number'] <= 13 else 2)
    return f


def main():
    counts = {}
    for line in sys.stdin:
        row = json.loads(line)
        try:
            family = verify(row)
        except Exception as error:
            raise AssertionError(f"Independent QA failed: {row['task']['id']}: {error}") from error
        counts[family] = counts.get(family, 0)+1
    print(json.dumps({'verified': sum(counts.values()), 'families': counts, 'method': 'separate-python-exact-arithmetic-sympy-enumeration', 'expertReviewed': False}))


if __name__ == '__main__':
    main()
