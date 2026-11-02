import type { LogEntry, StudioStatus } from '../../shared/events';
import { researchSummary } from './research-summary';

export function JudgeSummary({ logs, status }: { logs: LogEntry[]; status: StudioStatus }) {
  const r = researchSummary(logs);
  const turns = logs.filter(e=>e.kind==='human').slice(-5);
  const synthetic = turns.some(e=>e.speaker?.toLowerCase().includes('synthetic')) || status.participants.some(p=>p.name.toLowerCase().includes('synthetic'));
  return <section className="judge-summary" aria-label="Conversation and research summary">
    <div className="judge-disclosure">{synthetic ? 'Synthetic input · actual provider session · not a human trial' : 'Live input labels are shown per speaker · human acceptance not established'}<span>Meta research and decisions · OpenAI TTS · LiveKit audio</span></div>
    <div className="judge-columns">
      <section className="judge-conversation" aria-label="Current conversation">
        <h2>The conversation continues</h2>
        <div className="speaker-status">{status.participants.filter(p=>p.speaking).map(p=><span key={p.identity}>{p.name} · speaking</span>)}{!status.participants.some(p=>p.speaking) && <span>No speech currently detected</span>}</div>
        <ol>{turns.map(e=><li key={e.id}><strong>{e.speaker ?? String(e.meta?.identity ?? 'Speaker')}</strong><p>{e.text}</p></li>)}</ol>
        {!turns.length && <p className="muted">A short request can refer to the conversation. Research runs only when enabled and explicitly requested.</p>}
      </section>
      <section className="judge-research" aria-label="Requested reference">
        <h2>Research producer</h2><p className="research-status" role="status">{r.state}</p>
        <h3>{typeof r.request?.meta?.query === 'string' ? r.request.meta.query : 'What would you like checked?'}</h3>
        {!r.request && r.decision && <p>{r.decision}</p>}
        {typeof r.reason === 'string' && <p className="muted">{r.reason}</p>}
        {r.answer ? <blockquote className="judge-answer">{r.answer}</blockquote> : r.result && <p className="muted">Source result available. A short spoken answer awaits Meta's current-context review.</p>}
        {r.result && <details><summary>Full research result</summary><p>{String(r.result.meta?.text ?? '')}</p></details>}
        <ul className="source-cards">{r.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer"><strong>{s.title}</strong><span>{new URL(s.url).hostname} ↗</span></a></li>)}</ul>
        <p className="judge-limit">Source links support inspection, not guaranteed accuracy. Server audio is not listener receipt; receiver confirmation is unavailable here.</p>
      </section>
    </div>
  </section>;
}
