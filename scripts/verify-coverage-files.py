"""Independent algorithms reading the real attachment bytes, not generator keys."""
import csv,io,json,sys

def verify(row):
    task,p=row['task'],row['proof']
    content=task['resources'][0]['content']
    kind=p['kind']
    if kind=='adjacent-file':
        a=list(map(int,content.split()))
        assert len(a)==2400 and all(-9999<=x<=9999 for x in a)
        result=[]
        for i in range(len(a)-1):
            x,y=a[i:i+2]
            ok=((x%11==0 or y%11==0) and (x+y)*len(a)>sum(a)) if p['variant']==0 else ((x%9==0) != (y%9==0)) and x+y<0
            if ok:result.append(x+y)
        answer=f"{len(result)} {max(result) if p['variant']==0 else min(result)}"
    elif kind=='process-file':
        rows=list(csv.DictReader(io.StringIO(content),delimiter='\t'))
        assert len(rows)==30
        pending={int(r['ID']):(int(r['duration_ms']),[] if r['dependencies']=='0' else list(map(int,r['dependencies'].split(';')))) for r in rows}
        assert len(pending)==30 and all(d>0 for d,_ in pending.values())
        completed=set();running={};ms=0;counts={}
        while pending or running:
            ready=[i for i,(_,deps)in pending.items() if all(d in completed for d in deps)]
            for i in ready:running[i]=pending.pop(i)[0]
            assert running,'Cycle or missing predecessor'
            ms+=1;counts[ms]=len(running)
            for i in list(running):
                running[i]-=1
                if not running[i]:del running[i];completed.add(i)
        answer=str(counts.get(p['ms'],0))
    elif kind=='expression-file':
        s=content.strip();assert len(s)==7000 and set(s)<=set('0123456789-*')
        best=0
        # Each starting point: consume tokens by a hand-written state machine.
        # Never use the JavaScript regular expression or trust its claimed length.
        for start in range(len(s)):
            i=start
            while i<len(s) and s[i].isdigit():
                if s[i]=='0':i+=1
                else:
                    while i<len(s) and s[i].isdigit():i+=1
                best=max(best,i-start)
                if i>=len(s) or s[i]not in '-*':break
                i+=1
        answer=str(best)
    else:raise ValueError(kind)
    assert answer==task['answerDisplay'],(task['id'],answer,task['answerDisplay'])
    assert task['answerRule']['value']==answer
    return {'id':task['id'],'method':'independent-python-file-parser-and-algorithm','answer':answer}

if __name__=='__main__':
    rows=[json.loads(line) for line in sys.stdin if line.strip()]
    print(json.dumps({'verified':len(rows),'records':[verify(row) for row in rows]},ensure_ascii=False))
