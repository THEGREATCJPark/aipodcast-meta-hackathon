import type { LogEntry } from '../../shared/events.js';

/** A read-only projection of recorded events. Never advances on a timer. */
export function researchSummary(logs: LogEntry[]) {
  const request = logs.findLast(e => e.meta?.stage === 'research-request');
  const job = request?.meta?.jobId;
  const events = request ? logs.slice(logs.indexOf(request)) : [];
  const own = events.filter(e => e.meta?.jobId === job);
  const latest = (stage: string) => own.findLast(e => e.meta?.stage === stage);
  const result = latest('research-complete');
  const review = latest('research-review');
  const release = latest('research-release');
  const audio = release ? events.find(e => e.meta?.stage === 'server-first-audio-accepted' && e.meta?.generation === release.meta?.generation) : undefined;
  const tts = release ? events.find(e => e.meta?.stage === 'tts-generated' && e.meta?.generation === release.meta?.generation) : undefined;
  const failure = latest('research-failed') ?? latest('research-review-failed');
  const cancelled = latest('research-cancelled');
  const stopped = release ? events.find(e => e.at >= release.at && ['manual-hold','automatic-interruption','session-close'].includes(String(e.meta?.stage))) : undefined;
  const ttsFailure = release ? events.find(e => e.meta?.stage === 'provider-failure' && e.meta?.generation === release.meta?.generation) : undefined;
  let state = 'No pending request';
  if (request) state = 'Searching';
  if (result) state = 'Result ready · checking context';
  if (review?.meta?.action === 'WAIT') state = result ? 'Waiting · Meta chose WAIT' : 'Searching · Meta chose WAIT';
  if (review?.meta?.action === 'DELIVER' && !release) state = 'Waiting · application speech gate';
  if (release) state = 'Released · preparing speech';
  if (tts) state = 'Speech generated · not yet confirmed sent';
  if (audio) state = 'Delivered to server transport';
  if (failure || ttsFailure) state = 'Failed · recording retained';
  if (cancelled && !failure) state = 'Cancelled';
  if (stopped) state = stopped.meta?.stage === 'manual-hold' ? 'Stopped · manual HOLD' : stopped.meta?.stage === 'session-close' ? 'Session ended' : 'Output interrupted · speech detected';
  const sources = (Array.isArray(result?.meta?.sources) ? result.meta.sources : []).flatMap(raw => {
    if (!raw || typeof raw !== 'object') return [];
    const s = raw as Record<string, unknown>;
    try {
      const url = new URL(String(s.url));
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return [];
      return [{ url: url.href, title: typeof s.title === 'string' ? s.title : url.hostname }];
    } catch { return []; }
  }).filter((s,i,a) => a.findIndex(x=>x.url===s.url)===i);
  const decision = logs.findLast(e => e.meta?.stage === 'director-complete');
  return { state, request, result, review, sources,
    answer: review?.meta?.action === 'DELIVER' && typeof review.meta.speakText === 'string' ? review.meta.speakText : null,
    decision: decision?.meta?.action === 'WAIT' ? 'Meta chose WAIT' : decision && decision.meta?.handoff === false && decision.meta.action !== 'LOOKUP' ? `Meta proposed ${decision.meta?.action} · application requires Handoff` : null,
    reason: cancelled?.meta?.reason ?? review?.meta?.reason,
  };
}
