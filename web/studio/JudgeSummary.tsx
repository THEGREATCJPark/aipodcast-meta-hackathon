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
        <div className="panel-heading"><span className="section-index">01 / ON THE FLOOR</span><h2>Conversation</h2></div>
        <div className="speaker-status">{status.participants.filter(p=>p.speaking).map(p=><span key={p.identity}>{p.name} · speaking</span>)}{!status.participants.some(p=>p.speaking) && <span>No speech currently detected</span>}</div>
        <ol>{turns.map(e=><li key={e.id}><div className="turn-heading"><strong>{e.speaker ?? String(e.meta?.identity ?? 'Speaker')}</strong><time>{new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></div><p>{e.text}</p></li>)}</ol>
        {!turns.length && <div className="desk-empty"><span className="empty-rule" /><h3>The floor is yours.</h3><p>Connect a microphone and start a session.<br />Your conversation will appear here.</p><small>Need a reference? Ask the co-host to check it.</small></div>}
      </section>
      <section className="judge-research" aria-label="Requested reference">
        <div className="panel-heading"><span className="section-index">02 / AT THE DESK</span><h2>Research producer</h2></div><p className="research-status" role="status">{r.state}</p>
        <h3>{typeof r.request?.meta?.query === 'string' ? r.request.meta.query : 'Ready when you need a reference.'}</h3>
        {!r.request && <p className="research-intro">Ask a question in the conversation. When research is enabled, the producer checks the source and waits for room to speak.</p>}
        {!r.request && r.decision && <p>{r.decision}</p>}
        {r.answer ? <blockquote className="judge-answer">{r.answer}</blockquote> : r.result && <p className="muted">Source result available. A short spoken answer awaits Meta's current-context review.</p>}
        {(r.result || typeof r.reason === 'string') && <details><summary>Research result and decision details</summary>{typeof r.reason === 'string' && <p>{r.reason}</p>}<p>{String(r.result?.meta?.text ?? '')}</p></details>}
        {r.sources.length > 0 && <div className="source-label">SOURCES / {String(r.sources.length).padStart(2, "0")}</div>}
        <ul className="source-cards">{r.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer"><strong>{s.title}</strong><span>{new URL(s.url).hostname} ↗</span></a></li>)}</ul>
        <p className="judge-limit">Source links support inspection, not guaranteed accuracy. Server audio is not listener receipt; receiver confirmation is unavailable here.</p>
      </section>
    </div>
  </section>;
}
