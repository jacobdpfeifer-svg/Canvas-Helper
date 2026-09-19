"""Synthetic research reference only. No app imports, private data, network or disk writes.
Run: python3 docs/research/fixtures/study_session_reference.py
This checks the revised specification, not integration with learn_loop.py.
"""
from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import math

UTC = timezone.utc
ZONE = ZoneInfo('America/Denver')

def dt(value):
    return datetime.fromisoformat(value).astimezone(UTC)

def days(t, n):
    local = t.astimezone(ZONE)
    candidate = local + timedelta(days=n)
    # Select later fold for ambiguity; normalize nonexistent wall time forward.
    candidate = candidate.replace(fold=1)
    return candidate.astimezone(UTC)

@dataclass(frozen=True)
class Item:
    due: datetime | None
    anchor: datetime | None
    gap: int = 1
    hits: int = 0
    stability: str = 'fragile'
    withdrawn: bool = False
    source: bool = True
    cooldown: datetime | None = None
    seen: frozenset = frozenset()

@dataclass(frozen=True)
class Attempt:
    id: str
    start: datetime
    end: datetime
    outcome: str = 'correct'
    mode: str = 'review'
    assistance: str = 'none'
    grade: str = 'deterministic'
    exposed: bool = False
    clock_ok: bool = True

def eligible(i, a):
    return (i.anchor is not None and i.due is not None
            and a.start >= i.due and a.start >= days(i.anchor, i.gap)
            and (a.start-i.anchor) >= timedelta(hours=12)
            and (i.cooldown is None or a.start >= i.cooldown)
            and not a.exposed and a.assistance == 'none'
            and a.mode == 'review' and a.clock_ok
            and a.grade == 'deterministic' and i.source and not i.withdrawn)

def label(i, a):
    if i.withdrawn: return 'invalidated'
    if a.outcome in {'skipped', 'interrupted', 'uncertain'} or a.grade == 'pending': return 'no_evidence'
    if not i.source or a.grade != 'deterministic': return 'unverified_response'
    if a.mode == 'learn': return 'acquisition_only'
    if a.assistance == 'unknown': return 'unknown_assistance'
    if a.exposed: return 'exposed_response'
    if a.assistance != 'none': return 'assisted_response'
    if not a.clock_ok: return 'clock_uncertain'
    if eligible(i, a):
        return 'delayed_independent_retrieval' if a.outcome == 'correct' else 'delayed_check'
    return 'baseline_response' if i.anchor is None else 'immediate_practice'

def schedule(now, gap, cutoff=None, hours=None):
    candidate = now + timedelta(hours=hours) if hours is not None else days(now, gap)
    if cutoff is not None:
        if cutoff <= now: return ('NoPreExamSlot', None)
        candidate = min(candidate, cutoff)
    assert candidate > now
    return ('NextAt', candidate)

def transition(i, a, cutoff=None, near=False):
    if a.id in i.seen: return i, 'duplicate'
    before_eligible = eligible(i, a)
    evidence = label(i, a)
    out = replace(i, seen=i.seen | {a.id})
    if i.withdrawn or not i.source: return out, evidence
    if a.outcome in {'skipped', 'interrupted', 'uncertain'}: return out, evidence
    if a.grade != 'deterministic' or not a.clock_ok: return out, evidence
    # Every assessed practice is another encounter, even when it earns no credit.
    out = replace(out, anchor=a.end)
    if i.due is None:
        result, due = schedule(a.end, 1, cutoff)
        return replace(out, due=due, gap=1), evidence
    if not before_eligible: return out, evidence
    if a.outcome == 'correct':
        gap = {1:3, 3:7, 7:14}.get(i.gap, min(21, max(1, 2*i.gap)))
        hits = i.hits + 1
        out = replace(out, hits=hits, stability='holding' if hits == 1 else 'durable', gap=gap)
        result, due = schedule(a.end, gap, cutoff)
    elif a.outcome == 'partial':
        out = replace(out, hits=max(0,i.hits-1), stability='holding' if i.stability == 'durable' else 'fragile', gap=1)
        result, due = schedule(a.end, 1, cutoff)
    else:
        out = replace(out, hits=0, stability='fragile', gap=1)
        result, due = schedule(a.end, 1, cutoff, hours=1 if near else 4)
    # None explicitly means there is no valid pre-exam slot; never a past new date.
    return replace(out, due=due), evidence

def offer(items, now, visited=frozenset(), sources=True, cram=False, exam='known'):
    if not sources: return 'MissingSource'
    live = [(key,i) for key,i in items.items() if not i.withdrawn and i.source]
    if not live: return 'NoEligibleItem'
    if cram and exam == 'unknown': return 'NeedsExamDate'
    if cram and exam == 'past': return 'NoPreExamSlot'
    fresh = [(key,i) for key,i in live if key not in visited]
    if not fresh: return 'NoEligibleItem'
    times = []
    for key,i in fresh:
        if i.due is None: times.append((now,key))
        else:
            when = max(i.due, i.cooldown or i.due)
            times.append((when,key))
    when,key = min(times)
    return 'Offer:'+key if when <= now else 'NoReviewNeeded'


def main():
    now = dt('2026-09-18T09:00-06:00')
    old = dt('2026-09-15T09:00-06:00')
    base = Item(now, old, gap=3)
    def a(id='a', **kw):
        return Attempt(id, now, now+timedelta(minutes=3), **kw)
    checks=[]
    def check(name, condition):
        assert condition, name
        checks.append(name)
    s,l=transition(base,a()); check('due correct', l=='delayed_independent_retrieval' and s.hits==1 and s.gap==7)
    early=replace(base,due=days(now,1)); s,l=transition(early,a()); check('early correct',s.hits==0 and s.due==early.due)
    exposed=replace(base,anchor=now-timedelta(minutes=1)); s,l=transition(exposed,a(exposed=True)); check('pre-attempt exposure',l=='exposed_response' and s.hits==0)
    for help_ in ['hint_1','reveal','unknown']:
        s,l=transition(base,a(assistance=help_)); check(help_,s.hits==0)
    s,l=transition(base,a(mode='learn')); check('learn mode',l=='acquisition_only' and s.hits==0)
    s,l=transition(base,a(grade='model_proposed')); check('model uncertainty',l=='unverified_response' and s.hits==0)
    s,l=transition(base,a(grade='student_self')); check('self-score',s.hits==0)
    s,l=transition(base,a(clock_ok=False)); check('clock jump',l=='clock_uncertain' and s.hits==0)
    s,l=transition(base,a()); again,l2=transition(s,a()); check('duplicate',s==again and l2=='duplicate')
    s,l=transition(replace(base,stability='durable',hits=2),a(outcome='partial')); check('due partial',s.stability=='holding' and s.gap==1)
    s,l=transition(replace(base,stability='holding',hits=1),a(outcome='incorrect'),near=True); check('due miss',s.stability=='fragile' and s.due==a().end+timedelta(hours=1))
    for outcome in ['skipped','interrupted','uncertain']:
        s,l=transition(base,a(outcome=outcome)); check(outcome,s.due==base.due and s.hits==0)
    fresh=Item(None,None); s,l=transition(fresh,a()); check('first ever',l=='baseline_response' and s.hits==0 and s.due==days(a().end,1))
    revealed=replace(base,anchor=now+timedelta(minutes=1));
    retry=Attempt('retry',days(now,3)+timedelta(minutes=10),days(now,3)+timedelta(minutes=14))
    s,l=transition(revealed,retry); check('exposure eventually clears',l=='delayed_independent_retrieval')
    check('empty source',offer({},now,sources=False)=='MissingSource')
    check('empty items',offer({},now)=='NoEligibleItem')
    check('all withdrawn',offer({'x':replace(base,withdrawn=True)},now)=='NoEligibleItem')
    check('all skipped',offer({'x':base},now,visited={'x'})=='NoEligibleItem')
    check('nothing due',offer({'x':early},now)=='NoReviewNeeded')
    check('unknown exam',offer({'x':base},now,cram=True,exam='unknown')=='NeedsExamDate')
    check('past exam',offer({'x':base},now,cram=True,exam='past')=='NoPreExamSlot')
    check('lexical tie',offer({'z':base,'a':base},now)=='Offer:a')
    for horizon in [1,3,7,15]:
        cutoff=days(now,horizon)-timedelta(hours=1)
        result,due=schedule(now,7,cutoff)
        check('horizon '+str(horizon),result=='NextAt' and now<due<=cutoff)
    check('no future slot',schedule(now,1,now)==('NoPreExamSlot',None))
    dst=dt('2026-10-31T20:05-06:00'); check('DST 73 hours',days(dst,3)-dst==timedelta(hours=73))
    resume=replace(a(),end=now+timedelta(minutes=15)); check('resume same start',eligible(base,resume))
    crossing=replace(a(),start=now-timedelta(minutes=1)); check('started early finished due',not eligible(base,crossing))
    x=math.sqrt(2*(2*9.8*1.5*.5-.2*2*9.8*math.cos(math.pi/6)*1.5)/800)
    check('physics',abs(x-.155)<0.0001)
    check('timelines',all(sum(row)==target for row,target in [([20,60,90,80,50],300),([20,150,70,40,20],300),([25,120,90,180,120,65],600),([25,240,100,150,85],600)]))
    # Pure cost arithmetic, including every dispatch; no live billing checks.
    for n in [5,10]:
        typical=n*2*7*(9000*1+1400*5)/1e6
        bounded=n*3*7*6*(8000*1+2400*5)/1e6
        check('cost '+str(n),round(typical,2)=={5:1.12,10:2.24}[n] and round(bounded,2)=={5:12.6,10:25.2}[n])
    print(f'{len(checks)} synthetic assertions passed; not product integration or learning efficacy tests.')
    print('\n'.join(checks))

if __name__ == '__main__': main()
