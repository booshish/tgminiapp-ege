import json,sys
from fractions import Fraction as Q
def verify(row):
 p=row['proof']; k=p['kind']
 if k=='grid-rectangle':
  v=Q(sum(p['x']<=x<=p['y'] and p['u']<=y<=p['v'] for x in range(1,11) for y in range(1,11)),100)
 elif k=='interval-union':
  v=Q(sum(p['L']<=n<=p['R'] or p['M']<=n<=p['N'] for n in range(1,101)),100)
 elif k=='without-replacement-same-colour':
  balls=[0]*p['red']+[1]*p['blue']; pairs=[(i,j) for i in range(len(balls)) for j in range(len(balls)) if i!=j]
  v=Q(sum(balls[i]==balls[j] for i,j in pairs),len(pairs))
 elif k=='series-parallel-reliability':
  v=Q(sum(a<p['p'] and (b<p['q'] or c<p['r']) for a in range(10) for b in range(10) for c in range(10)),1000)
 elif k=='three-trials-exactly-two':
  from itertools import product
  v=Q(0)
  for outcome in product([0,1],repeat=3):
   if sum(outcome)!=2:continue
   w=Q(1)
   for success,percent in zip(outcome,[p['p'],p['q'],p['r']]):w*=Q(percent if success else 100-percent,100)
   v+=w
 elif k=='mixture-concentration':
  salt=Q(p['mass1']*p['k1'],100)+Q(p['mass2']*p['k2'],100);v=100*salt/(p['mass1']+p['mass2'])
 elif k=='catch-up-distance':
  assert p['fast']>p['slow'];v=Q(p['dist'],p['fast']-p['slow']);assert p['fast']*v==p['dist']+p['slow']*v
 elif k=='deposit-with-cashflows':
  v=Q(p['S']);v+=v*Q(p['r1'],100);v+=p['top'];v-=p['withdraw'];assert v>0;v+=v*Q(p['r2'],100)
 elif k=='progressive-charge':
  assert p['gross']>p['threshold']>0
  charge=Q(p['threshold']*p['rate1'],100)+Q((p['gross']-p['threshold'])*p['rate2'],100);v=p['gross']-charge
 elif k=='fraction-combination':v=(Q(p['a'],4)+Q(p['b'],5))*p['c']-Q(p['d'],2)
 elif k=='executor-two-operations':
  v=p['start']
  for command in '121':v=v+p['addend'] if command=='1' else v*p['mult']
 elif k=='dilution-mass-fraction':
  salt=Q(p['m']*p['w'],100);v=100*salt/(p['m']+p['water']);assert 0<v<p['w']
 else:raise AssertionError(k)
 assert v==Q(row['task']['answerDisplay']),row['task']['id']
 assert row['task']['answerRule']['value']==row['task']['answerDisplay']
 return k
counts={}
for line in sys.stdin:
 r=json.loads(line);k=verify(r);counts[k]=counts.get(k,0)+1
print(json.dumps({'verified':sum(counts.values()),'families':counts,'method':'separate-Python-rational-arithmetic-enumeration-or-forward-simulation','expertReviewed':False}))
