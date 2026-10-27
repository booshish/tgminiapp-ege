import assert from "node:assert/strict";
// Independent checks consume proof data AND verify the public prompt/key.
// Factual flags below require targeted source review; they are not expert certification.
export function verifyGenerated(entry){
  const p=entry.proof;assert.ok(p&&entry.prompt&&entry.answer&&entry.explanation);
  const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${entry.subtype}: ${a} != ${b}`);
  const x=Number(entry.answer);
  switch(p.kind){
    case "humidity":{
      assert.ok(entry.prompt.includes(String(p.actual))&&entry.prompt.includes(String(p.saturated)));
      assert.ok(p.actual>=0&&p.actual<=p.saturated);
      // Inverse rounding interval, not the generator's Math.round expression.
      const raw=100*p.actual;assert.ok(raw>=(x-.5)*p.saturated&&raw<(x+.5)*p.saturated);break;
    }
    case "population-balance":close(p.start+p.births-p.deaths+x,p.end);assert.ok(entry.prompt.includes(String(p.start))&&entry.prompt.includes(String(p.end)));break;
    case "reserve-years":close(x*p.production,p.reserves*1000);assert.ok(entry.prompt.includes("млрд т")&&entry.prompt.includes("млн т"));break;
    case "time-zones":{
      const departUTC=new Date(Date.UTC(2026,0,1,p.departure-p.originOffset));
      const arrival=new Date(departUTC.getTime()+(p.duration+p.destinationOffset)*3600000);assert.equal(x,arrival.getUTCHours());break;
    }
    case "chromosomes":{
      const homologousPairs=Array.from({length:p.diploid/2},(_,i)=>[i*2,i*2+1]);
      assert.equal(x,p.process==="gamete"?homologousPairs.map(([a])=>a).length:homologousPairs.flat().length);break;
    }
    case "cross":{
      const outcomes=[...p.parentA].flatMap(a=>[...p.parentB].map(b=>[a,b].sort().join("")));
      const accepted=outcomes.filter(g=>p.target==="recessive"?g==="aa":g==="Aa").length;
      assert.equal(x,100*accepted/outcomes.length);break;
    }
    case "taxonomy":{
      const order=[...entry.answer].map(d=>p.items[Number(d)-1]);assert.equal(new Set(entry.answer).size,p.items.length);
      for(let i=1;i<order.length;i++)assert.ok(order[i-1].rank<order[i].rank);break;
    }
    case "protocol":{
      const permutations=xs=>xs.length?xs.flatMap((x,i)=>permutations([...xs.slice(0,i),...xs.slice(i+1)]).map(t=>[x,...t])):[[]];
      const valid=permutations(Array.from({length:p.size},(_,i)=>i+1)).filter(order=>p.edges.every(([a,b])=>order.indexOf(a)<order.indexOf(b)));
      assert.equal(valid.length,1);assert.equal(entry.answer,valid[0].join(""));break;
    }
    case "facts-selection":assert.equal(entry.answer,p.facts.flatMap((yes,i)=>yes?[i+1]:[]).join(""));assert.ok(p.source?.startsWith("https://"));break;
    case "climate-table":{
      const amplitude=p.july.map((v,i)=>v-p.january[i]);
      const truth=[p.january[0]<p.january[1]&&p.january[1]<p.january[2],amplitude[0]<amplitude[1]&&amplitude[1]<amplitude[2],new Set(p.july).size===1,p.january[0]<p.january[1]&&p.january[1]<p.january[2]];
      assert.equal(truth.filter(Boolean).length,1);assert.equal(entry.answer,String(truth.indexOf(true)+1));break;
    }
    default:throw Error(`Unverified generator kind: ${p.kind}`);
  }
  return true;
}
