import type { LogEntry, StudioStatus } from '../../shared/events';
import { researchSummary } from './research-summary';

export function JudgeSummary({ logs, status }: { logs: LogEntry[]; status: StudioStatus }) {
  const r = researchSummary(logs);
  const turns = logs.filter(e=>e.kind==='human').slice(-5);
  const synthetic = turns.some(e=>e.speaker?.toLowerCase().includes('synthetic')) || status.participants.some(p=>p.name.toLowerCase().includes('synthetic'));
  const recordedProvider = [...logs].reverse().find(e => e.meta?.stage === 'tts-request')?.meta?.provider;
  const speechProvider = typeof recordedProvider === 'string' ? recordedProvider : status.ttsProvider === 'gemini' ? 'Gemini' : 'OpenAI';
  return <section className="judge-summary" aria-label="Conversation and research summary">
    <div className="judge-disclosure">{synthetic ? 'Synthetic voices · Actual Meta session' : status.sessionActive ? 'Live session' : 'Ready to record'}<span>Meta research & decisions · {speechProvider} speech · LiveKit audio</span></div>
    <div className="judge-columns">
      <section className="judge-conversation" aria-label="Current conversation">
        <div className="panel-heading"><span className="section-index">01 / On the floor</span><h2>Conversation</h2></div>
        <div className="speaker-status">{status.participants.filter(p=>p.speaking).map(p=><span key={p.identity}>{p.name} · speaking</span>)}{!status.participants.some(p=>p.speaking) && <span>Listening for the next speaker</span>}</div>
        <ol>{turns.map(e=><li key={e.id}><div className="turn-heading"><strong>{e.speaker ?? String(e.meta?.identity ?? 'Speaker')}</strong><time>{new Date(e.at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</time></div><p>{e.text}</p></li>)}</ol>
        {!turns.length && <div className="desk-empty"><span className="empty-rule" /><h3>The floor is yours.</h3><p>Connect a microphone and start a session.<br />Your conversation will appear here.</p><small>Need a reference? Ask the co-host to check it.</small></div>}
      </section>
      <section className="judge-research" aria-label="Requested reference">
        <div className="panel-heading"><span className="section-index">02 / At the desk</span><h2>Research</h2></div><p className="research-status" role="status">{r.state}</p>
        <h3>{typeof r.request?.meta?.query === 'string' ? r.request.meta.query : 'Ready when you need a reference.'}</h3>
        {!r.request && <p className="research-intro">Ask a question in the conversation. When research is enabled, the producer checks the source and waits for room to speak.</p>}
        {!r.request && r.decision && <p>{r.decision}</p>}
        {r.answer ? <blockquote className="judge-answer">{r.answer}</blockquote> : r.result && <p className="muted">Source result available. A short spoken answer awaits Meta's current-context review.</p>}
        {(r.result || typeof r.reason === 'string') && <details><summary>Research result and decision details</summary>{typeof r.reason === 'string' && <p>{r.reason}</p>}<p>{String(r.result?.meta?.text ?? '')}</p></details>}
        {r.sources.length > 0 && <div className="source-label">SOURCES / {String(r.sources.length).padStart(2, "0")}</div>}
        <ul className="source-cards">{r.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer"><strong>{s.title}</strong><span>{new URL(s.url).hostname} ↗</span></a></li>)}</ul>
        <p className="judge-limit">Open a source to check the reference before quoting it.</p>
      </section>
    </div>
  </section>;
}
