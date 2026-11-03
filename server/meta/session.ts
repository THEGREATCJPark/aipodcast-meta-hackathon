import { ZodError } from "zod";
import { reviewResearch, ResearchReviewSchema, ReviewResponseError } from "./research-review.js";
import type { ResearchResult } from "./research.js";
import { research, ResearchResultSchema } from "./research.js";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { Settings } from "../../shared/settings.js";
import type { EngineEvents, LiveEngine } from "../engines/types.js";
import { MetaAsr, type AsrCallbacks } from "./asr-realtime.js";
import { decide, validateDecision, type Decision, type Utterance } from "./director.js";
import { TurnManager } from "./turn-manager.js";
import { synthesize } from "../speech/tts.js";

export interface MetaOptions { key: string; ttsKey: string; asr: string; director: string; tts: string; voice: string; researchEnabled?: boolean }
type AsrTransport = Pick<MetaAsr, "connect" | "append" | "close">;
export interface MetaServices {
  createAsr?: (key: string, model: string, offsetMs: number, callbacks: AsrCallbacks) => AsrTransport;
  research?: typeof research;
  reviewResearch?: typeof reviewResearch;
  decide: typeof decide;
  synthesize: typeof synthesize;
}
/** Only classifications and schema coordinates leave this boundary; never provider messages/payloads. */
export function safeResearchFailure(error: unknown): Record<string, unknown> {
  if (error instanceof ReviewResponseError) return error.diagnostic;
  if (error instanceof ZodError) return { category: "invalid_response", issues: error.issues.slice(0, 12).map(issue => ({ code: issue.code, path: issue.path.map(part => typeof part === "number" ? part : /^(id|status|output|content|type|role|text|annotations|url|title|start_index|end_index|responseId|sources|results|searchCallIds|requestedAt|completedAt|kind|startIndex|endIndex|snippet)$/.test(String(part)) ? String(part) : "[field]") })) };
  if (error instanceof Error) {
    if (error.name === "TimeoutError") return { category: "timeout" };
    if (error.name === "AbortError") return { category: "aborted" };
    if (error instanceof SyntaxError) return { category: "invalid_json" };
    const http = /^Meta research(?: review)? HTTP ([1-5][0-9]{2})$/.exec(error.message);
    if (http) return { category: "http_error", httpStatus: Number(http[1]) };
    const known: Record<string, string> = {
      "Meta did not complete a web search": "search_not_completed",
      "Model source link was not returned by completed search": "unverified_source_link",
      "Citation span is outside answer": "invalid_citation_span",
      "Research response too large": "response_size_limit",
      "Missing research response": "empty_response",
      "Malformed research source link": "malformed_source_link",
      "Research source count limit exceeded": "source_count_limit",
      "Stale research review": "stale_review",
      "Invalid research speech": "invalid_speech",
    };
    if (known[error.message]) return { category: known[error.message] };
    const transportCodes = new Set(["ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT", "UND_ERR_SOCKET", "CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "DEPTH_ZERO_SELF_SIGNED_CERT"]);
    let cause: unknown = error;
    // Bounded cause walk: arbitrary provider codes and all raw error details remain private.
    for (let depth = 0; depth < 4 && cause && typeof cause === "object"; depth++) {
      const current = cause as { code?: unknown; cause?: unknown };
      if (typeof current.code === "string" && transportCodes.has(current.code)) return { category: "transport_error", code: current.code };
      cause = current.cause;
    }
  }
  return { category: "provider_error" };
}
interface ResearchJob { id:string; query:string; sourceIds:string[]; requestUtterances:Utterance[]; controller:AbortController; result:ResearchResult|null; startedAt:number; expiresAt:number; timer:NodeJS.Timeout; generation:number; revision:number }
export class MetaSession extends EventEmitter<EngineEvents> implements LiveEngine {
  readonly id = "meta" as const;
  isReady = false;
  readonly turns = new TurnManager();
  readonly models: Omit<MetaOptions, "key" | "ttsKey">;
  state: "listening" | "thinking" | "waiting" | "speaking" | "held" | "error" = "listening";
  readonly runId = randomUUID();
  private seenUtterances = new Set<string>();
  private limited = false;
  private streams = new Map<string, AsrTransport>();
  private failedAsr = new Set<string>();
  private unavailableAsr = new Set<string>();
  private retriedAsr = new Set<string>();
  private utterances: Utterance[] = [];
  private startedAt = 0;
  private calls = 0;
  private researchCalls = 0;
  private researchJob: ResearchJob | null = null;
  private reviewingResearch = false;
  private reviewPending = false;
  private reviewCalls = 0;
  private researchedRequests = new Set<string>();
  private busy = false;
  // A search classification grants no speech permission. Continued conversation may
  // outlive this snapshot; the eventual answer still requires a fresh review ticket.
  private classificationController: AbortController | null = null;
  private classifiedUtterances = new Set<string>();
  private pending = false;
  private pendingHandoff: { generation: number; revision: number } | null = null;
  private deadline: NodeJS.Timeout | undefined;
  constructor(private options: MetaOptions, private services: MetaServices = { decide, synthesize, research }) {
    super(); this.models = { asr: options.asr, director: options.director, tts: options.tts, voice: options.voice };
  }
  async connect(): Promise<void> {
    if (this.isReady || this.turns.closed) throw new Error("Create a fresh MetaSession for each run");
    this.isReady = true; this.startedAt = Date.now();
    this.deadline = setTimeout(() => { this.limited = true; this.hold("provider-limit"); for (const stream of this.streams.values()) stream.close(); this.emit("error", "15 minute provider limit reached; recording continues until Stop", "session_limit"); }, 15 * 60 * 1000);
    this.emit("started", this.runId);
    this.emit("info", "Meta handoff mode: live account access unverified until provider response; OpenAI TTS only renders Meta text.");
  }
  appendAudio(_pcm: Int16Array): void { /* mixed PCM deliberately not sent to Meta */ }
  appendParticipant(identity: string, pcm: Int16Array): void {
    if (!this.isReady || this.limited || Date.now() - this.startedAt >= 15 * 60 * 1000) return;
    let stream = this.streams.get(identity);
    if (!stream) {
      if (this.streams.size >= 4) return;
      const callbacks: AsrCallbacks = {
        complete: (id, text, startMs, endMs) => { if (this.isReady && this.streams.get(identity) === stream && !this.failedAsr.has(identity)) this.acceptUtterance({ id, identity, text, startMs, endMs }); },
        failed: message => this.asrFailed(identity, stream!, message),
      };
      stream = this.services.createAsr?.(this.options.key, this.options.asr, Date.now() - this.startedAt, callbacks)
        ?? new MetaAsr(this.options.key, this.options.asr, Date.now() - this.startedAt, callbacks);
      this.streams.set(identity, stream); this.unavailableAsr.add(identity);
      void stream.connect().then(() => {
        if (!this.isReady || this.streams.get(identity) !== stream || this.failedAsr.has(identity)) return;
        this.unavailableAsr.delete(identity);
        this.evidence("asr-connected", { identity, recovered: this.retriedAsr.has(identity), audioGapPossible: this.retriedAsr.has(identity) });
        if (this.pending && !this.unavailableAsr.size && !this.turns.held) { this.pending = false; void this.evaluate(false); }
      }).catch(() => this.asrFailed(identity, stream!, "Meta ASR unavailable; recording continues"));
      // Buffer at most two seconds while connecting, then send at real-time pace.
      this.emit("info", `ASR connection starting for ${identity}; up to 2 seconds buffered during handshake; overflow stops ASR, original recording retained`);
    }
    stream.append(pcm);
  }
  private asrFailed(identity: string, stream: AsrTransport, message: string): void {
    if (!this.isReady || this.streams.get(identity) !== stream || this.failedAsr.has(identity)) return;
    this.failedAsr.add(identity); this.unavailableAsr.add(identity); stream.close();
    this.hold("asr-failure");
    this.evidence("asr-gap-start", { identity, retryAvailable: !this.retriedAsr.has(identity) });
    this.emit("error", `${message}. ${this.retriedAsr.has(identity) ? "Retry exhausted; restart the session." : "Resume allows one reconnect attempt."}`, "meta_asr");
  }
  participantLeft(identity: string): void { this.failedAsr.delete(identity); this.unavailableAsr.delete(identity); this.streams.get(identity)?.close(); this.streams.delete(identity); this.turns.human(identity, false); this.cancel("participant disconnected"); }
  humanSpeaking(identity: string, speaking: boolean): void {
    if (!this.isReady) return;
    this.turns.human(identity, speaking);
    if (speaking) {
      this.emit("interrupted");
      if (!this.turns.held) this.state = "listening";
      this.evidence("automatic-interruption", { identity, listenerStopMeasured: false });
    } else if (!this.turns.speakers.size && this.researchJob && !this.turns.held) {
      void this.reviewJob();
    } else if (!this.turns.speakers.size && this.pending && !this.turns.held) {
      this.pending = false;
      void this.evaluate(false);
    }
  }
  private evidence(stage: string, data: Record<string, unknown> = {}): void {
    this.emit("evidence", { runId: this.runId, stage, at: Date.now(), generation: this.turns.generation, contextRevision: this.turns.revision, ...data });
  }
  acceptUtterance(u: Utterance): void {
    if (!this.isReady || this.seenUtterances.has(u.id) || !u.text.trim()) return;
    if (this.seenUtterances.size >= 5000) { this.limited = true; this.hold("provider-limit"); this.emit("error", "Transcript limit reached; recording continues", "transcript_limit"); return; }
    this.seenUtterances.add(u.id);
    this.turns.changed(); this.emit("interrupted");
    this.utterances = [...this.utterances, u].sort((a,b) => a.startMs - b.startMs).slice(-30);
    this.emit("inputTranscript", { delta: u.text, startMs: u.startMs, endMs: u.endMs, identity: u.identity, utteranceId: u.id });
    if (this.researchJob) void this.reviewJob();
    else void this.evaluate(false);
  }
  private cancelClassification(): void {
    this.classificationController?.abort(); this.classificationController = null;
    for (const u of this.utterances) this.classifiedUtterances.add(u.id);
  }
  cancel(reason: string): void { this.cancelClassification(); this.pendingHandoff = null; this.turns.invalidate(); this.emit("interrupted"); this.emit("info", `Cancelled: ${reason}`); }
  hold(reason = "manual-hold"): void { this.cancelClassification(); this.cancelResearch(reason); this.pendingHandoff = null; this.pending = false; this.turns.hold(); this.evidence(reason); this.state = "held"; this.emit("interrupted"); }
  resume(): void {
    if (!this.isReady || this.limited) return;
    if ([...this.failedAsr].some(identity => this.retriedAsr.has(identity))) { this.emit("info", "ASR reconnect attempt exhausted; restart session to resume transcription."); return; }
    for (const identity of this.failedAsr) {
      this.retriedAsr.add(identity); this.streams.delete(identity);
      this.evidence("asr-reconnect-authorized", { identity, maxRetries: 1 });
    }
    this.cancelClassification(); this.failedAsr.clear(); this.pendingHandoff = null;
    this.turns.resume(); this.state = "listening"; this.emit("interrupted"); this.evidence("resume-listening");
  }
  instruct(_content: string): void { /* MC uses explicit hold/resume methods; text is never control authority */ }
  think(_content: string): void { /* Speaker identity comes from tracks, not prompts. */ }
  speakNow(_instruction: string): void {
    if (this.failedAsr.size) { this.emit("info", "Handoff blocked: use Resume for the bounded ASR reconnect attempt."); return; }
    this.resume(); void this.evaluate(true);
  }
  applyLiveSettings(settings: Settings): string | null {
    if (Boolean(this.options.researchEnabled) === settings.researchEnabled) return null;
    this.options = { ...this.options, researchEnabled: settings.researchEnabled };
    this.cancelResearch("Research permission changed");
    this.pending = false; this.cancel("Research permission changed");
    this.evidence("research-permission", { enabled: settings.researchEnabled });
    return "Research permission updated; pending output cancelled";
  }
  async evaluate(handoff: boolean): Promise<void> {
    if (!this.isReady || this.limited || this.turns.held || !this.utterances.length) return;
    if (this.researchJob) { await this.reviewJob(); return; }
    if (this.unavailableAsr.size) { if (!handoff) this.pending = true; else this.emit("info", "Handoff blocked while transcription is unavailable."); return; }
    if (this.busy) {
      if (!handoff) this.pending = true;
      else if (!this.turns.speakers.size) {
        this.pendingHandoff = { generation: this.turns.generation, revision: this.turns.revision };
        this.evidence("handoff-queued", { waitsForCurrentCancellation: true });
      }
      return;
    }
    const backgroundClassification = !handoff && Boolean(this.options.researchEnabled);
    if (this.turns.speakers.size && !backgroundClassification) { if (!handoff) this.pending = true; else this.emit("info", "Human speaking: handoff was not queued. Handoff again after the floor is clear."); return; }
    const context = this.utterances.slice();
    const lookupRequestCandidates = backgroundClassification ? context.filter(u => !this.classifiedUtterances.has(u.id)).map(u => u.id) : undefined;
    if (lookupRequestCandidates && !lookupRequestCandidates.length) { this.pending = false; return; }
    if (this.calls >= 60) { this.limited = true; this.hold("provider-limit"); this.emit("error", "60 director call cap reached; recording continues", "call_limit"); return; }
    this.calls++; this.pending = false;
    const classification = backgroundClassification ? new AbortController() : null;
    if (classification) this.classificationController = classification;
    this.busy = true;
    const ticket = classification ? { generation: this.turns.generation, revision: this.turns.revision, signal: classification.signal } : this.turns.begin();
    for (const id of lookupRequestCandidates ?? []) this.classifiedUtterances.add(id);
    this.state = "thinking"; this.evidence("director-request", { handoff, backgroundClassification, lookupRequestCandidates, call: this.calls, model: this.options.director });
    let phase: "director" | "tts" = "director";
    try {
      const d: Decision = await this.services.decide(this.options.key, this.options.director, context, ticket.revision, handoff, ticket.signal, lookupRequestCandidates);
      if (classification ? ticket.signal.aborted || !this.isReady || this.turns.held || !this.options.researchEnabled : !this.turns.permits(ticket)) return;
      validateDecision(d, context, ticket.revision, lookupRequestCandidates);
      this.emit("decision", d);
      this.evidence("director-complete", { action: d.action, sourceUtteranceIds: d.sourceUtteranceIds, handoff, backgroundClassification, requestContextRevision: ticket.revision });
      this.state = "waiting";
      let speakText = d.speakText;
      if (d.action === "LOOKUP") {
        const requestId = lookupRequestCandidates?.filter(id => d.sourceUtteranceIds.includes(id)).at(-1) ?? context.at(-1)!.id;
        if (!this.options.researchEnabled) { this.evidence("research-blocked", { reason: "Research is disabled in local settings" }); return; }
        if (this.researchedRequests.has(requestId) || this.researchCalls >= 8) { this.evidence("research-blocked", { reason: "Request already attempted or 8-call session cap reached" }); return; }
        this.researchedRequests.add(requestId); this.researchCalls++;
        this.startResearch(d, context, ticket);
        return;
      } else if (d.action === "WAIT" || !handoff) return;
      if (!this.turns.permits(ticket)) return;
      phase = "tts";
      await this.speak(speakText, ticket);
    } catch {
      if (!ticket.signal.aborted) { this.evidence("provider-failure", { phase, provider: phase === "tts" ? "OpenAI" : "Meta", generation: ticket.generation, contextRevision: ticket.revision, disposition: "WAIT", recordingPreserved: true }); this.state = "error"; this.emit("error", "Meta/TTS request failed or timed out; WAIT, recording continues, no fallback", "provider_failure"); }
    } finally {
      if (this.classificationController === classification) this.classificationController = null;
      this.busy = false;
      if (this.state === "thinking") this.state = this.turns.held ? "held" : "listening";
      const handoff = this.pendingHandoff; this.pendingHandoff = null;
      if (handoff && this.turns.permits(handoff)) { this.pending = false; void this.evaluate(true); }
      else if (this.pending) { this.pending = false; void this.evaluate(false); }
    }
  }
  private cancelResearch(reason:string):void {
    const job=this.researchJob;if(!job)return;
    this.researchJob=null;this.reviewPending=false;clearTimeout(job.timer);job.controller.abort();
    this.evidence("research-cancelled",{jobId:job.id,reason,generation:job.generation,contextRevision:job.revision,elapsedMs:Date.now()-job.startedAt});
  }
  private startResearch(d:Decision, context:Utterance[], ticket:{generation:number;revision:number}):void {
    const startedAt=Date.now();const job:ResearchJob={id:randomUUID(),query:d.query!,sourceIds:d.sourceUtteranceIds,requestUtterances:context.filter(u=>d.sourceUtteranceIds.includes(u.id)),controller:new AbortController(),result:null,startedAt,expiresAt:startedAt+60000,timer:setTimeout(()=>{if(this.researchJob===job)this.cancelResearch("60-second TTL expired");},60000),generation:ticket.generation,revision:ticket.revision};
    this.researchJob=job;
    this.evidence("research-request",{jobId:job.id,query:job.query,sourceUtteranceIds:job.sourceIds,model:this.options.director,call:this.researchCalls,expiresAt:job.expiresAt});
    void (async()=>{
      try {
        const result=ResearchResultSchema.parse(await(this.services.research??research)(this.options.key,this.options.director,job.query,context,job.controller.signal));
        if(this.researchJob!==job||job.controller.signal.aborted)return;
        job.result=result;
        this.evidence("research-complete",{jobId:job.id,query:job.query,...result,elapsedMs:result.completedAt-result.requestedAt,provider:"Meta",model:this.options.director,delivery:"pending-fresh-context-review"});
        await this.reviewJob();
      }catch(error: unknown){
        if(this.researchJob!==job||job.controller.signal.aborted)return;
        this.evidence("research-failed",{jobId:job.id,elapsedMs:Date.now()-startedAt,disposition:"WAIT",provider:"Meta", failure: safeResearchFailure(error)});
        this.cancelResearch("research-failure");this.state="error";this.emit("error","Meta research failed; recording continues, no fallback","research_failure");
      }
    })();
  }
  private async reviewJob():Promise<void> {
    const job=this.researchJob;
    if(!job||!this.isReady||this.turns.held||!this.options.researchEnabled)return;
    if(this.reviewingResearch){this.reviewPending=true;return;}
    if(this.reviewCalls>=60){this.cancelResearch("60 review-call cap reached");return;}
    if(Date.now()>=job.expiresAt){this.cancelResearch("60-second TTL expired");return;}
    this.reviewCalls++;this.reviewingResearch=true;this.reviewPending=false;
    const revision=this.turns.revision;
    const reviewedResult=job.result;
    this.evidence("research-review-request",{jobId:job.id,call:this.reviewCalls,resultReady:reviewedResult!==null,humansSpeaking:this.turns.speakers.size>0});
    try{
      const verdict=ResearchReviewSchema.parse(await(this.services.reviewResearch??reviewResearch)(this.options.key,this.options.director,{query:job.query,requestUtteranceIds:job.sourceIds,requestUtterances:job.requestUtterances,resultSources:reviewedResult?.sources.map(({title,url})=>({title,url}))??[],resultText:reviewedResult?.text??null,utterances:this.utterances.slice(),contextRevision:revision,humansSpeaking:this.turns.speakers.size>0},job.controller.signal));
      if(this.researchJob!==job||job.controller.signal.aborted)return;
      if(Date.now()>=job.expiresAt){this.cancelResearch("60-second TTL expired during review");return;}
      if(revision!==this.turns.revision||verdict.contextRevision!==revision){this.reviewPending=true;return;}
      this.evidence("research-review",{jobId:job.id,...verdict,resultReady:job.result!==null});
      if(verdict.action==="CANCEL"||verdict.action==="DISCARD"){this.cancelResearch(`Meta ${verdict.action}: ${verdict.reason}`);return;}
      if(verdict.action==="DELIVER"&&(!reviewedResult||reviewedResult!==job.result)){this.reviewPending=job.result!==null;return;}
      if(verdict.action!=="DELIVER"||!job.result||this.turns.speakers.size||this.unavailableAsr.size||this.busy)return;
      const ticket=this.turns.begin();if(!this.turns.permits(ticket))return;
      // Consume exactly once. Subsequent human interruption cancels TTS, never replays this result.
      const text=verdict.speakText!;this.researchJob=null;clearTimeout(job.timer);this.busy=true;
      this.evidence("research-release",{jobId:job.id,reviewedRevision:revision});
      try{await this.speak(text,ticket);}catch{if(!ticket.signal.aborted){this.evidence("provider-failure",{phase:"tts",provider:"OpenAI",generation:ticket.generation,contextRevision:ticket.revision,disposition:"WAIT",recordingPreserved:true});this.state="error";this.emit("error","OpenAI TTS failed; recording continues","tts_failure");}}
      finally{this.busy=false;const handoff=this.pendingHandoff;this.pendingHandoff=null;if(handoff&&this.turns.permits(handoff)){this.pending=false;void this.evaluate(true);}else if(this.pending){this.pending=false;void this.evaluate(false);}}
    }catch(error: unknown){
      if(this.researchJob===job&&!job.controller.signal.aborted){this.evidence("research-review-failed",{jobId:job.id,disposition:"WAIT",failure:safeResearchFailure(error)});this.state="waiting";}
    }finally{
      this.reviewingResearch=false;
      if(this.reviewPending&&this.researchJob){this.reviewPending=false;void this.reviewJob();}
    }
  }
  private async speak(text:string,ticket:{generation:number;revision:number;signal:AbortSignal}):Promise<void>{
    this.evidence("tts-request",{provider:"OpenAI",model:this.options.tts,characters:text.length,text});
    const pcm=await this.services.synthesize(this.options.ttsKey,this.options.tts,this.options.voice,text,ticket.signal);
    if(!this.turns.permits(ticket))return;
    if(!pcm.length||pcm.length>24000*30)throw new Error("Invalid TTS duration");
    this.emit("generatedAudio",pcm,ticket.generation);this.evidence("tts-generated",{samples:pcm.length,file:`tts-generated-${ticket.generation}.wav`});this.state="speaking";
    for(let offset=0;offset<pcm.length;offset+=4800){if(!this.turns.permits(ticket))return;this.emit("audio",pcm.slice(offset,offset+4800));}
    this.emit("info","TTS queued; actual sent PCM saved separately in mc.wav. Listener receipt unmeasured.");this.emit("turnEnd");
  }
  async close(): Promise<void> { this.cancelClassification(); this.cancelResearch("session-close"); this.pendingHandoff = null; this.pending = false; this.evidence("session-close"); this.isReady = false; this.turns.close(); clearTimeout(this.deadline); for (const stream of this.streams.values()) stream.close(); this.streams.clear(); this.emit("interrupted"); }
}
