import sys
P='/home/claude/work/shared.js'
s=open(P).read()
def rep(old,new,cnt=1):
    global s
    n=s.count(old)
    if n!=cnt: print('ANCHOR COUNT',n,'for',old[:100]);sys.exit(1)
    s=s.replace(old,new)
# the Judge carries its own weighed score and measured spread; the Historian its net lean in points (from Oct 18 on)
rep("""  if(J){add('Judge','ml',J.pHome>=0.5?'home':'away');
    if(hl!=null){const m=(J.h-J.a)+hl;if(m!==0)add('Judge','spread',m>0?'home':'away');}
    if(tl!=null){const t=J.a+J.h;if(t!==tl)add('Judge','total',t>tl?'over':'under');}}""",
"""  /* v2.45 · from Oct 18 on the Judge's call carries its own read (weighed score, measured spread) for its worldview */
  if(J){const jx=d>='2026-10-18'&&isFinite(+J.a)&&isFinite(+J.h)?{ja:+J.a,jh:+J.h,jsd:+J.sd||null}:null;add('Judge','ml',J.pHome>=0.5?'home':'away',jx);
    if(hl!=null){const m=(J.h-J.a)+hl;if(m!==0)add('Judge','spread',m>0?'home':'away',jx);}
    if(tl!=null){const t=J.a+J.h;if(t!==tl)add('Judge','total',t>tl?'over':'under',jx);}}""")
rep("""    const tlean=IDEO_P('Trends','lean',0.05);if(Math.abs(tr.dMar)>=tlean){const sd=tr.dMar>0?'home':'away';add('Trends','ml',sd);if(hl!=null)add('Trends','spread',sd);}
    if(Math.abs(tr.dTot)>=tlean&&tl!=null)add('Trends','total',tr.dTot>0?'over':'under');}catch(e){}""",
"""    /* v2.45 · from Oct 18 on each Trends call carries its net lean in points toward its side (its worldview's own read) */
    const tx=v=>d>='2026-10-18'&&isFinite(v)?{tlp:+Math.abs(v).toFixed(2)}:null;
    const tlean=IDEO_P('Trends','lean',0.05);if(Math.abs(tr.dMar)>=tlean){const sd=tr.dMar>0?'home':'away';add('Trends','ml',sd,tx(tr.dMar));if(hl!=null)add('Trends','spread',sd,tx(tr.dMar));}
    if(Math.abs(tr.dTot)>=tlean&&tl!=null)add('Trends','total',tr.dTot>0?'over':'under',tx(tr.dTot));}catch(e){}""")
open(P,'w').write(s);print('ok')
