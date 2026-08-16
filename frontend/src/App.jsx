import { useState, useEffect, useRef, useCallback } from "react";

// ═══ CONFIG ═══
const API_BASE = "http://localhost:8000/api";

// ═══ DATA ═══
const COPY_PASSAGES = [
  "The rapid advancement of technology in the modern world has transformed the way people communicate, work, and interact with their environment. From the early days of personal computing to the current era of artificial intelligence and machine learning, each decade has brought innovations that reshape human capabilities and redefine what is possible.",
  "Scientific research proceeds through a cycle of observation, hypothesis formation, experimentation, and analysis. The scientific method provides a structured framework for investigating natural phenomena and building reliable knowledge about the world. While individual experiments may yield ambiguous results, the cumulative effect of inquiry expands understanding."
];
const FREE_PROMPTS = [
  "Describe a memorable experience from the past year. What happened, how did it make you feel, and what did you learn from it? Write at least 60 words.",
  "What is something you feel strongly about? Explain your position and why you think it matters. Write at least 60 words."
];
const TRAITS = ["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Neuroticism"];
const TRAIT_ICONS = { Openness: "🎨", Conscientiousness: "📋", Extraversion: "⚡", Agreeableness: "🤝", Neuroticism: "🌊" };
const TRAIT_COLORS = { Openness: "#8B5CF6", Conscientiousness: "#10B981", Extraversion: "#F59E0B", Agreeableness: "#3B82F6", Neuroticism: "#EF4444" };

const HIGH_DESC = {
  Openness: "You show a strong inclination toward creative thinking, intellectual curiosity, and appreciation for novel experiences. You embrace unconventional ideas and enjoy diverse perspectives.",
  Conscientiousness: "You demonstrate strong organizational skills, disciplined work habits, and a methodical approach. You value precision and follow through on commitments reliably.",
  Extraversion: "You display high energy in social situations, communicate assertively, and draw motivation from interaction. Your typing suggests an active, engaged cognitive style.",
  Agreeableness: "You tend toward cooperation, empathy, and considerate interaction. Your patterns suggest a harmonious and accommodating interpersonal style.",
  Neuroticism: "You show heightened sensitivity to emotional stimuli and careful self-monitoring. This reflects depth of emotional processing and awareness of internal states."
};
const LOW_DESC = {
  Openness: "You prefer practical, concrete approaches and value established methods. Your thinking style tends toward the conventional and pragmatic.",
  Conscientiousness: "You maintain a flexible, spontaneous approach. While adaptable, you may benefit from more structured planning in certain contexts.",
  Extraversion: "You tend toward reflective, measured engagement. Your typing suggests a contemplative cognitive style favouring depth over speed.",
  Agreeableness: "You maintain an independent, direct interpersonal style. You are comfortable with constructive challenge and honest exchange.",
  Neuroticism: "You demonstrate emotional stability and calm under pressure. Your typing patterns suggest consistent self-regulation and low reactivity."
};

// ═══ EMOTION DATA ═══
const EMOTIONS = ["Happy", "Calm", "Sad", "Angry", "Anxious", "Neutral"];
const EMOTION_ICONS = { Happy:"😊", Calm:"😌", Sad:"😔", Angry:"😤", Anxious:"😰", Neutral:"😐" };
const EMOTION_COLORS = { Happy:"#F59E0B", Calm:"#10B981", Sad:"#3B82F6", Angry:"#EF4444", Anxious:"#8B5CF6", Neutral:"#94a3b8" };
const EMOTION_VALENCE = { Happy:1, Calm:0.6, Sad:-0.8, Angry:-0.9, Anxious:-0.5, Neutral:0 };
const EMOTION_AROUSAL = { Happy:0.7, Calm:-0.6, Sad:-0.5, Angry:0.9, Anxious:0.8, Neutral:0 };
const EMOTION_DESC = {
  Happy: "Your keystroke rhythm is fluid and upbeat — shorter inter-key intervals, minimal corrections, and a consistent pace. These patterns align strongly with a positive, high-energy affective state.",
  Calm: "Steady dwell times, low burstiness, and minimal error rate paint the picture of a relaxed, low-arousal typing session. Your patterns suggest a composed and content emotional baseline.",
  Sad: "Elongated pauses, slower pace, and reduced typing momentum characterise this profile. These dynamics are associated with lower-energy, introspective emotional states.",
  Angry: "Elevated keystroke pressure indicators, rapid burst sequences, and high correction frequency are hallmarks of high-arousal negative affect. Your typing patterns carry signatures of frustration or anger.",
  Anxious: "Highly irregular inter-key timing, frequent mid-word pauses, and elevated backspace activity suggest a cognitively loaded, high-vigilance state consistent with anxiety.",
  Neutral: "Your timing metrics sit comfortably in the middle range across all dimensions — no dominant positive or negative signals. This balanced profile reflects a stable, task-focused emotional state."
};

// ═══ API HELPERS ═══
async function apiPost(endpoint, data) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
  });
  return res.json();
}
async function apiGet(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  return res.json();
}

// ═══ GLOBAL STYLES ═══
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #04080F; --bg2: #080F1C; --bg3: #0C1628;
      --card: rgba(255,255,255,0.03); --card-hover: rgba(255,255,255,0.06);
      --border: rgba(255,255,255,0.07); --border-hover: rgba(245,158,11,0.4);
      --amber: #F59E0B; --amber-light: #FCD34D; --amber-dim: rgba(245,158,11,0.15);
      --blue: #3B82F6; --purple: #8B5CF6; --green: #10B981; --red: #EF4444;
      --text: #F1F5F9; --text-muted: rgba(241,245,249,0.55); --text-faint: rgba(241,245,249,0.3);
      --font-display: 'Syne', sans-serif; --font-body: 'DM Sans', sans-serif; --font-mono: 'DM Mono', monospace;
    }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--text); font-family: var(--font-body); }
    @keyframes float-up { 0%{opacity:0;transform:translateY(40px)} 100%{opacity:1;transform:translateY(0)} }
    @keyframes fade-in { from{opacity:0} to{opacity:1} }
    @keyframes orb-drift { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-40px) scale(1.05)} 66%{transform:translate(-20px,20px) scale(0.97)} }
    @keyframes orb-drift-2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-40px,30px) scale(1.08)} 66%{transform:translate(20px,-25px) scale(0.95)} }
    @keyframes spin { to{transform:rotate(360deg)} }
    @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
    @keyframes bar-grow { from{width:0%} }
    @keyframes tick-bounce { 0%{transform:scale(0)} 60%{transform:scale(1.25)} 100%{transform:scale(1)} }
    @keyframes slide-down { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes grid-fade { from{opacity:0} to{opacity:1} }
    .nav-link { color:var(--text-muted); text-decoration:none; font-size:14px; font-weight:500; letter-spacing:0.02em; transition:color 0.2s; cursor:pointer; }
    .nav-link:hover { color:var(--text); }
    .btn-primary { display:inline-flex; align-items:center; gap:8px; padding:14px 32px; font-family:var(--font-display); font-size:15px; font-weight:600; color:#000; background:linear-gradient(135deg,var(--amber),var(--amber-light)); border:none; border-radius:12px; cursor:pointer; transition:transform 0.2s,box-shadow 0.2s,opacity 0.2s; box-shadow:0 4px 24px rgba(245,158,11,0.35); letter-spacing:0.01em; }
    .btn-primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 36px rgba(245,158,11,0.5); }
    .btn-primary:active:not(:disabled) { transform:translateY(0); }
    .btn-primary:disabled { opacity:0.4; cursor:not-allowed; box-shadow:none; background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.3); }
    .btn-ghost { display:inline-flex; align-items:center; gap:8px; padding:13px 28px; font-family:var(--font-display); font-size:15px; font-weight:600; color:var(--text); background:transparent; border:1px solid var(--border); border-radius:12px; cursor:pointer; transition:border-color 0.2s,background 0.2s,transform 0.2s; }
    .btn-ghost:hover { border-color:var(--border-hover); background:var(--amber-dim); transform:translateY(-1px); }
    .card { background:var(--card); border:1px solid var(--border); border-radius:16px; transition:background 0.2s,border-color 0.25s,transform 0.25s,box-shadow 0.25s; }
    .card:hover { background:var(--card-hover); border-color:rgba(245,158,11,0.2); transform:translateY(-3px); box-shadow:0 16px 48px rgba(0,0,0,0.4),0 0 0 1px rgba(245,158,11,0.08); }
    .tag { display:inline-flex; align-items:center; padding:5px 12px; font-family:var(--font-mono); font-size:11px; font-weight:500; color:var(--amber); background:var(--amber-dim); border:1px solid rgba(245,158,11,0.2); border-radius:20px; letter-spacing:0.05em; }
    .gradient-text { background:linear-gradient(135deg,var(--amber) 0%,var(--amber-light) 50%,#fff 100%); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:shimmer 4s linear infinite; }
    .feature-card { padding:32px 28px; border-radius:20px; border:1px solid var(--border); background:var(--card); transition:border-color 0.3s,transform 0.3s,box-shadow 0.3s,background 0.3s; position:relative; overflow:hidden; }
    .feature-card::before { content:''; position:absolute; inset:0; background:radial-gradient(circle at top left,var(--glow-color,rgba(245,158,11,0.06)),transparent 60%); opacity:0; transition:opacity 0.3s; }
    .feature-card:hover { border-color:var(--glow-border,rgba(245,158,11,0.3)); transform:translateY(-5px); box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 0 1px var(--glow-border,rgba(245,158,11,0.1)); }
    .feature-card:hover::before { opacity:1; }
    .textarea-styled { width:100%; min-height:180px; padding:18px 22px; font-size:16px; line-height:1.75; color:var(--text); font-family:var(--font-body); background:rgba(0,0,0,0.35); border:1px solid var(--border); border-radius:14px; resize:vertical; outline:none; transition:border-color 0.2s,box-shadow 0.2s; }
    .textarea-styled:focus { border-color:rgba(245,158,11,0.5); box-shadow:0 0 0 3px rgba(245,158,11,0.08); }
    .accordion-item { border:1px solid var(--border); border-radius:14px; overflow:hidden; margin-bottom:10px; transition:border-color 0.2s; }
    .accordion-item:hover { border-color:rgba(245,158,11,0.2); }
    .accordion-header { padding:18px 22px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:background 0.2s; }
    .accordion-header:hover { background:rgba(255,255,255,0.03); }
    .stat-chip { padding:12px 16px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; text-align:center; transition:border-color 0.2s,background 0.2s; }
    .stat-chip:hover { border-color:rgba(245,158,11,0.25); background:rgba(245,158,11,0.05); }
    .processing-step { display:flex; align-items:center; gap:14px; padding:14px 18px; border-radius:12px; border:1px solid transparent; transition:all 0.4s; margin-bottom:10px; }
    .processing-step.active { background:rgba(245,158,11,0.08); border-color:rgba(245,158,11,0.2); }
    .processing-step.done { background:rgba(16,185,129,0.06); border-color:rgba(16,185,129,0.2); }
    @media(max-width:768px) { .hero-grid,.features-grid,.steps-grid,.footer-grid { grid-template-columns:1fr !important; } .traits-grid { grid-template-columns:repeat(2,1fr) !important; } }
  `}</style>
);

// ═══ NAVBAR ═══
function Navbar({ backendStatus, onLogoClick }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const statusColor = backendStatus === "connected" ? "#10B981" : backendStatus === "checking" ? "#F59E0B" : "#EF4444";
  const statusLabel = backendStatus === "connected" ? "API Live" : backendStatus === "checking" ? "Connecting" : "Offline";
  return (
    <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, padding:"0 40px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between", background:scrolled?"rgba(4,8,15,0.92)":"transparent", backdropFilter:scrolled?"blur(20px)":"none", borderBottom:scrolled?"1px solid var(--border)":"1px solid transparent", transition:"all 0.3s" }}>
      <div onClick={onLogoClick} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
        <div style={{ width:34, height:34, borderRadius:9, background:"linear-gradient(135deg,#F59E0B,#FCD34D)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:"0 4px 16px rgba(245,158,11,0.35)" }}>🧠</div>
        <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:17, letterSpacing:"-0.02em" }}>Key<span style={{ color:"var(--amber)" }}>Persona</span></span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:32 }}>
        <a href="#features" className="nav-link">Features</a>
        <a href="#how-it-works" className="nav-link">How It Works</a>
        <a href="#science" className="nav-link">Science</a>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 14px", background:`${statusColor}12`, border:`1px solid ${statusColor}30`, borderRadius:24, fontSize:12, fontFamily:"var(--font-mono)", fontWeight:500, color:statusColor }}>
        <span style={{ width:7, height:7, borderRadius:"50%", background:statusColor, boxShadow:backendStatus==="connected"?`0 0 8px ${statusColor}`:"none", display:"inline-block" }} />
        {statusLabel}
      </div>
    </nav>
  );
}

// ═══ FOOTER ═══
function Footer() {
  return (
    <footer style={{ borderTop:"1px solid var(--border)", background:"var(--bg)", padding:"64px 48px 40px" }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        <div className="footer-grid" style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:48, marginBottom:48 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#F59E0B,#FCD34D)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🧠</div>
              <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:18 }}>Key<span style={{ color:"var(--amber)" }}>Persona</span></span>
            </div>
            <p style={{ fontSize:14, color:"var(--text-muted)", lineHeight:1.75, maxWidth:280 }}>AI-powered personality profiling through the science of how you type. Non-invasive, privacy-preserving, and grounded in peer-reviewed research.</p>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>{["XGBoost","SHAP","Django"].map(t=><span key={t} className="tag">{t}</span>)}</div>
          </div>
          {[{ title:"Technology", links:["XGBoost Models","SHAP Explainability","Keystroke Features","Django REST API"] }, { title:"Science", links:["Big Five OCEAN","Keystroke Dynamics","Feature Extraction","Model Accuracy"] }, { title:"Project", links:["Architecture","Open Source","Privacy Policy","Research Basis"] }].map(col=>(
            <div key={col.title}>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:600, fontSize:13, color:"var(--text-muted)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:16 }}>{col.title}</div>
              {col.links.map(link=>(
                <div key={link} style={{ fontSize:14, color:"var(--text-faint)", marginBottom:10, cursor:"pointer", transition:"color 0.2s" }} onMouseEnter={e=>e.target.style.color="var(--text)"} onMouseLeave={e=>e.target.style.color="var(--text-faint)"}>{link}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop:"1px solid var(--border)", paddingTop:24, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <span style={{ fontSize:13, color:"var(--text-faint)", fontFamily:"var(--font-mono)" }}>© 2025 KeyPersona · Built with XGBoost + SHAP · Big Five Model</span>
          <span style={{ fontSize:12, color:"var(--text-faint)" }}>Educational & Research Purposes · 78–86% CV Accuracy</span>
        </div>
      </div>
    </footer>
  );
}

// ═══ WELCOME PAGE ═══
function WelcomePage({ onStart, backendStatus }) {
  const features = [
    { icon:"⚡", title:"XGBoost ML Engine", desc:"5 independent XGBoost classifiers, each with 200 trees at depth 6, trained to predict individual Big Five traits with up to 86% accuracy.", color:"#F59E0B", glow:"rgba(245,158,11,0.08)", border:"rgba(245,158,11,0.25)" },
    { icon:"🔬", title:"SHAP Explainability", desc:"TreeExplainer computes exact Shapley values for every prediction, revealing precisely which keystroke features drove each personality score.", color:"#8B5CF6", glow:"rgba(139,92,246,0.08)", border:"rgba(139,92,246,0.25)" },
    { icon:"⌨️", title:"22 Timing Features", desc:"Dwell time distributions, flight intervals, typing speed, burstiness, rhythm regularity, correction rates — all from sub-millisecond timestamps.", color:"#3B82F6", glow:"rgba(59,130,246,0.08)", border:"rgba(59,130,246,0.25)" },
    { icon:"🔒", title:"Privacy-First Design", desc:"Zero text content is stored or transmitted. Only anonymous keystroke timing patterns are sent to the API — your words stay entirely private.", color:"#10B981", glow:"rgba(16,185,129,0.08)", border:"rgba(16,185,129,0.25)" },
    { icon:"💡", title:"Emotion Detection", desc:"A dedicated XGBoost emotion classifier maps your keystroke dynamics onto the Russell Circumplex — detecting Happy, Calm, Sad, Angry, Anxious, or Neutral states from valence and arousal signatures.", color:"#EC4899", glow:"rgba(236,72,153,0.08)", border:"rgba(236,72,153,0.25)", wide:true },
  ];
  const steps = [
    { num:"01", title:"Complete 4 Typing Tasks", desc:"Two copy-typing passages and two free-writing prompts. Type naturally — the system captures only the timing, not the text." },
    { num:"02", title:"ML Feature Extraction", desc:"Your Django backend extracts 22 statistical keystroke features in real time using NumPy and SciPy analysis pipelines." },
    { num:"03", title:"Personality Prediction", desc:"XGBoost models classify each Big Five trait. SHAP TreeExplainer generates per-feature attribution scores for full transparency." },
  ];
  const modelStats = [
    { trait:"Openness", acc:"78.7%", f1:"0.787" },
    { trait:"Conscientiousness", acc:"81.0%", f1:"0.810" },
    { trait:"Extraversion", acc:"86.4%", f1:"0.749" },
    { trait:"Agreeableness", acc:"78.3%", f1:"0.782" },
    { trait:"Neuroticism", acc:"80.6%", f1:"0.749" },
  ];
  return (
    <div style={{ background:"var(--bg)", minHeight:"100vh", overflowX:"hidden" }}>

      {/* HERO */}
      <section style={{ position:"relative", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", paddingTop:64 }}>
        <div style={{ position:"absolute", top:"15%", left:"8%", width:560, height:560, borderRadius:"50%", background:"radial-gradient(circle,rgba(245,158,11,0.12) 0%,transparent 65%)", animation:"orb-drift 12s ease-in-out infinite", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"10%", right:"5%", width:480, height:480, borderRadius:"50%", background:"radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 65%)", animation:"orb-drift-2 15s ease-in-out infinite", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:"40%", right:"20%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 65%)", animation:"orb-drift 18s ease-in-out infinite reverse", pointerEvents:"none" }} />
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.055) 1px,transparent 1px)", backgroundSize:"36px 36px", maskImage:"radial-gradient(ellipse 80% 80% at 50% 50%,black,transparent)", WebkitMaskImage:"radial-gradient(ellipse 80% 80% at 50% 50%,black,transparent)", animation:"grid-fade 1.5s ease forwards", pointerEvents:"none" }} />

        <div style={{ position:"relative", zIndex:2, maxWidth:820, textAlign:"center", padding:"0 24px" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"8px 18px", background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:24, marginBottom:32, animation:"float-up 0.6s ease forwards", opacity:0 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--amber)", boxShadow:"0 0 8px var(--amber)", display:"inline-block" }} />
            <span style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--amber)", letterSpacing:"0.06em" }}>AI PERSONALITY + EMOTION ASSESSMENT · BIG FIVE OCEAN MODEL</span>
          </div>
          <h1 style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"clamp(44px,7vw,80px)", lineHeight:1.05, letterSpacing:"-0.04em", marginBottom:24, animation:"float-up 0.7s 0.1s ease forwards", opacity:0 }}>
            <span className="gradient-text">Your Typing</span><br /><span style={{ color:"var(--text)" }}>Reveals Your Mind</span>
          </h1>
          <p style={{ fontSize:"clamp(16px,2vw,20px)", color:"var(--text-muted)", lineHeight:1.75, maxWidth:620, margin:"0 auto 12px", animation:"float-up 0.7s 0.2s ease forwards", opacity:0 }}>
            Complete 4 short typing tasks. Our XGBoost models analyse keystroke timing to predict your <strong style={{ color:"var(--amber)", fontWeight:600 }}>Big Five personality traits</strong> and <strong style={{ color:"#8B5CF6", fontWeight:600 }}>real-time emotional state</strong> — with full SHAP explainability.
          </p>
          <p style={{ fontSize:14, color:"var(--text-faint)", marginBottom:48, animation:"float-up 0.7s 0.25s ease forwards", opacity:0 }}>No text is stored · Only timing patterns are analysed · 74–86% model accuracy</p>
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap", animation:"float-up 0.7s 0.35s ease forwards", opacity:0 }}>
            <button className="btn-primary" onClick={onStart} disabled={backendStatus !== "connected"}>Begin Assessment →</button>
            <a href="#how-it-works"><button className="btn-ghost">How It Works</button></a>
          </div>
          <div style={{ marginTop:32, display:"flex", justifyContent:"center", animation:"float-up 0.7s 0.4s ease forwards", opacity:0 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"8px 18px", borderRadius:24, background:backendStatus==="connected"?"rgba(16,185,129,0.08)":"rgba(239,68,68,0.08)", border:`1px solid ${backendStatus==="connected"?"rgba(16,185,129,0.25)":"rgba(239,68,68,0.25)"}`, fontSize:13, fontFamily:"var(--font-mono)", color:backendStatus==="connected"?"#10B981":backendStatus==="checking"?"var(--amber)":"#EF4444" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:"currentColor", display:"inline-block" }} />
              {backendStatus==="connected"?"✓ Django backend connected on :8000":backendStatus==="checking"?"⟳ Connecting to backend...":"✗ Backend offline — run: python manage.py runserver 8000"}
            </div>
          </div>
          <div style={{ display:"flex", gap:48, justifyContent:"center", marginTop:56, flexWrap:"wrap", animation:"float-up 0.7s 0.5s ease forwards", opacity:0 }}>
            {[["5+","ML Models"],["22","Features"],["86%","Peak Accuracy"],["6","Emotions Tracked"],["2,400","Training Samples"]].map(([val,label])=>(
              <div key={label} style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:700, color:"var(--amber)", lineHeight:1 }}>{val}</div>
                <div style={{ fontSize:12, color:"var(--text-faint)", marginTop:4, letterSpacing:"0.04em", textTransform:"uppercase" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding:"100px 48px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:64 }}>
          <div className="tag" style={{ marginBottom:16 }}>CORE TECHNOLOGY</div>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(28px,4vw,42px)", fontWeight:700, letterSpacing:"-0.03em", color:"var(--text)", lineHeight:1.1 }}>Built on real ML research</h2>
          <p style={{ fontSize:16, color:"var(--text-muted)", marginTop:14, maxWidth:500, margin:"14px auto 0" }}>Every component grounded in peer-reviewed keystroke dynamics and personality psychology literature.</p>
        </div>
        <div className="features-grid" style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:20 }}>
          {features.map(f=>(
            <div key={f.title} className="feature-card" style={{ "--glow-color":f.glow, "--glow-border":f.border, gridColumn:f.wide?"1 / -1":"auto" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap: f.wide ? 24 : 0, flexDirection: f.wide ? "row" : "column" }}>
                <div style={{ width:48, height:48, borderRadius:12, marginBottom: f.wide ? 0 : 20, flexShrink:0, background:`${f.color}18`, border:`1px solid ${f.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{f.icon}</div>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:700, color:"var(--text)", letterSpacing:"-0.01em", margin:0 }}>{f.title}</h3>
                    {f.wide && <span style={{ padding:"3px 10px", borderRadius:20, background:"rgba(236,72,153,0.12)", border:"1px solid rgba(236,72,153,0.25)", fontSize:10, fontFamily:"var(--font-mono)", color:"#EC4899", letterSpacing:"0.05em" }}>NEW</span>}
                  </div>
                  <p style={{ fontSize:14, color:"var(--text-muted)", lineHeight:1.75, margin:0 }}>{f.desc}</p>
                  {f.wide && (
                    <div style={{ display:"flex", gap:8, marginTop:16, flexWrap:"wrap" }}>
                      {EMOTIONS.map(e=>(
                        <span key={e} style={{ padding:"4px 12px", borderRadius:20, background:`${EMOTION_COLORS[e]}14`, border:`1px solid ${EMOTION_COLORS[e]}30`, fontSize:12, color:EMOTION_COLORS[e], fontFamily:"var(--font-mono)" }}>{EMOTION_ICONS[e]} {e}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding:"80px 48px", background:"var(--bg2)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:64 }}>
            <div className="tag" style={{ marginBottom:16 }}>PROCESS</div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(28px,4vw,42px)", fontWeight:700, letterSpacing:"-0.03em" }}>Three steps to your profile</h2>
          </div>
          <div className="steps-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }}>
            {steps.map((step,i)=>(
              <div key={step.num} style={{ position:"relative", padding:"0 24px" }}>
                {i<2 && <div style={{ position:"absolute", top:24, left:"calc(50% + 30px)", right:"-50%", height:1, background:"linear-gradient(90deg,var(--border),transparent)", zIndex:0 }} />}
                <div style={{ width:52, height:52, borderRadius:14, marginBottom:24, position:"relative", zIndex:1, background:"linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05))", border:"1px solid rgba(245,158,11,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-mono)", fontSize:14, fontWeight:500, color:"var(--amber)" }}>{step.num}</div>
                <h3 style={{ fontFamily:"var(--font-display)", fontSize:17, fontWeight:700, color:"var(--text)", marginBottom:10 }}>{step.title}</h3>
                <p style={{ fontSize:14, color:"var(--text-muted)", lineHeight:1.75 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCIENCE */}
      <section id="science" style={{ padding:"100px 48px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:64, alignItems:"center" }}>
          <div>
            <div className="tag" style={{ marginBottom:16 }}>VALIDATED PERFORMANCE</div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(26px,3.5vw,38px)", fontWeight:700, letterSpacing:"-0.03em", lineHeight:1.15, marginBottom:20 }}>5-fold cross-validated model accuracy</h2>
            <p style={{ fontSize:15, color:"var(--text-muted)", lineHeight:1.8, marginBottom:28 }}>Each XGBoost classifier was evaluated using stratified 5-fold cross-validation on 2,400 synthetic samples generated from empirically-grounded trait–feature correlations drawn from published keystroke dynamics literature.</p>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {["Buker & Vinciarelli (2021)","Khan et al. (2015)","SHAP · Lundberg (2017)"].map(ref=><span key={ref} className="tag" style={{ fontSize:10 }}>{ref}</span>)}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {modelStats.map(s=>(
              <div key={s.trait} className="card" style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:16 }}>
                <span style={{ fontSize:18 }}>{TRAIT_ICONS[s.trait]}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontFamily:"var(--font-display)", fontSize:14, fontWeight:600 }}>{s.trait}</span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:13, color:"var(--amber)", fontWeight:500 }}>{s.acc}</span>
                  </div>
                  <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:4, width:s.acc, background:`linear-gradient(90deg,${TRAIT_COLORS[s.trait]},${TRAIT_COLORS[s.trait]}88)`, animation:"bar-grow 1.4s cubic-bezier(0.4,0,0.2,1) forwards" }} />
                  </div>
                </div>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--text-faint)" }}>F1 {s.f1}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRAITS SHOWCASE */}
      <section style={{ padding:"80px 48px", background:"var(--bg2)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <div className="tag" style={{ marginBottom:16 }}>WHAT YOU'LL DISCOVER</div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(26px,4vw,38px)", fontWeight:700, letterSpacing:"-0.03em" }}>Big Five OCEAN Traits + Emotional State</h2>
            <p style={{ fontSize:14, color:"var(--text-muted)", marginTop:12 }}>Personality dimensions are persistent. Emotions are in-the-moment. We detect both.</p>
          </div>
          <div className="traits-grid" style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14, marginBottom:20 }}>
            {TRAITS.map(t=>(
              <div key={t} className="card" style={{ padding:"24px 20px", textAlign:"center" }}>
                <div style={{ width:52, height:52, borderRadius:14, margin:"0 auto 14px", background:`${TRAIT_COLORS[t]}18`, border:`1px solid ${TRAIT_COLORS[t]}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{TRAIT_ICONS[t]}</div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:13, fontWeight:700, color:"var(--text)", marginBottom:6 }}>{t}</div>
                <div style={{ fontSize:11, color:"var(--text-faint)", letterSpacing:"0.04em" }}>{t[0]}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:14 }}>
            {EMOTIONS.map(e=>(
              <div key={e} className="card" style={{ padding:"20px 14px", textAlign:"center" }}>
                <div style={{ width:46, height:46, borderRadius:14, margin:"0 auto 12px", background:`${EMOTION_COLORS[e]}18`, border:`1px solid ${EMOTION_COLORS[e]}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{EMOTION_ICONS[e]}</div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:12, fontWeight:700, color:"var(--text)", marginBottom:4 }}>{e}</div>
                <div style={{ fontSize:10, color:"var(--text-faint)", letterSpacing:"0.04em" }}>Emotion</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:"120px 48px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:600, height:400, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(245,158,11,0.08) 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"relative", zIndex:1 }}>
          <div className="tag" style={{ marginBottom:24 }}>READY TO DISCOVER?</div>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(32px,5vw,56px)", fontWeight:800, letterSpacing:"-0.04em", lineHeight:1.05, marginBottom:24 }}>
            <span className="gradient-text">Start your</span><br />personality analysis
          </h2>
          <p style={{ fontSize:17, color:"var(--text-muted)", maxWidth:480, margin:"0 auto 40px", lineHeight:1.75 }}>Takes about 5 minutes. Complete 4 typing tasks and receive a detailed SHAP-explained Big Five profile plus your real-time emotional state.</p>
          <button className="btn-primary" onClick={onStart} disabled={backendStatus!=="connected"} style={{ fontSize:17, padding:"18px 48px" }}>Begin Assessment →</button>
          <p style={{ fontSize:13, color:"var(--text-faint)", marginTop:20 }}>No account required · Privacy-preserving · Educational use</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// ═══ TYPING TASK ═══
function TypingTask({ taskType, passage, prompt, taskNumber, totalTasks, onComplete }) {
  const [text, setText] = useState("");
  const [events, setEvents] = useState([]);
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(null);
  useEffect(() => { if (started) { const iv = setInterval(()=>setElapsed(Math.floor((performance.now()-startTimeRef.current)/1000)),1000); return ()=>clearInterval(iv); } }, [started]);
  const handleKey = useCallback((e)=>{ if(!started){setStarted(true);startTimeRef.current=performance.now();} if(e.type==="keydown"&&e.repeat)return; setEvents(prev=>[...prev,{event_type:e.type,key:e.key,code:e.code,timestamp:performance.now(),is_repeat:e.repeat||false}]); },[started]);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const canSubmit = taskType==="copy"?wordCount>=15:wordCount>=40;
  const progress = taskType==="copy"?Math.min(wordCount/15,1):Math.min(wordCount/40,1);
  const taskIcons = ["📝","📄","✍️","💬"];
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column", fontFamily:"var(--font-body)" }}>
      <div style={{ padding:"16px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid var(--border)", background:"rgba(4,8,15,0.8)", backdropFilter:"blur(20px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg,#F59E0B,#FCD34D)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>🧠</div>
          <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:15 }}>Key<span style={{ color:"var(--amber)" }}>Persona</span></span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {Array.from({length:totalTasks},(_,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:i+1<taskNumber?"var(--green)":i+1===taskNumber?"var(--amber)":"var(--border)", border:`2px solid ${i+1<taskNumber?"var(--green)":i+1===taskNumber?"var(--amber)":"transparent"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:i+1<=taskNumber?"#000":"var(--text-faint)", transition:"all 0.3s", boxShadow:i+1===taskNumber?"0 0 12px rgba(245,158,11,0.5)":"none" }}>{i+1<taskNumber?"✓":i+1}</div>
              {i<totalTasks-1&&<div style={{ width:24, height:1, background:i+1<taskNumber?"var(--green)":"var(--border)" }} />}
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:16, alignItems:"center" }}>
          <span style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--text-faint)" }}>{events.length} events</span>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:13, color:started?"var(--amber)":"var(--text-faint)", padding:"4px 12px", background:started?"rgba(245,158,11,0.1)":"transparent", border:`1px solid ${started?"rgba(245,158,11,0.2)":"transparent"}`, borderRadius:8, transition:"all 0.3s" }}>{`${Math.floor(elapsed/60).toString().padStart(2,"0")}:${(elapsed%60).toString().padStart(2,"0")}`}</div>
        </div>
      </div>
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px" }}>
        <div style={{ maxWidth:780, width:"100%", animation:"slide-down 0.4s ease forwards" }}>
          <div style={{ marginBottom:28 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
              <span style={{ width:40, height:40, borderRadius:11, background:"var(--amber-dim)", border:"1px solid rgba(245,158,11,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{taskIcons[taskNumber-1]}</span>
              <div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--amber)", letterSpacing:"0.06em", marginBottom:2 }}>TASK {taskNumber} OF {totalTasks} · {taskType==="copy"?"COPY TYPING":"FREE COMPOSITION"}</div>
                <h2 style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700, color:"var(--text)", letterSpacing:"-0.01em" }}>{taskType==="copy"?"Reproduce the passage below":"Respond to the prompt"}</h2>
              </div>
            </div>
          </div>
          {taskType==="copy"&&<div style={{ padding:"22px 26px", marginBottom:20, background:"rgba(255,255,255,0.02)", borderRadius:14, borderLeft:"3px solid var(--amber)", border:"1px solid rgba(245,158,11,0.15)" }}><div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--amber)", marginBottom:10, letterSpacing:"0.06em" }}>PASSAGE TO COPY</div><p style={{ fontSize:15, color:"rgba(241,245,249,0.8)", lineHeight:1.85, fontFamily:"Georgia,serif" }}>{passage}</p></div>}
          {taskType==="free"&&<div style={{ padding:"18px 22px", marginBottom:20, background:"rgba(59,130,246,0.06)", borderRadius:14, border:"1px solid rgba(59,130,246,0.2)" }}><div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"#3B82F6", marginBottom:8, letterSpacing:"0.06em" }}>WRITING PROMPT</div><p style={{ fontSize:15, color:"var(--text-muted)", lineHeight:1.75 }}>{prompt}</p></div>}
          <textarea className="textarea-styled" value={text} onChange={e=>setText(e.target.value)} onKeyDown={handleKey} onKeyUp={handleKey} placeholder={taskType==="copy"?"Start typing the passage above...":"Start writing your response..."} autoFocus />
          <div style={{ marginTop:14, marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:13, color:canSubmit?"var(--green)":"var(--text-faint)", fontFamily:"var(--font-mono)", transition:"color 0.3s" }}>{wordCount} / {taskType==="copy"?15:40} words {canSubmit&&"✓"}</span>
              <span style={{ fontSize:13, color:"var(--text-faint)", fontFamily:"var(--font-mono)" }}>{events.length} keystrokes captured</span>
            </div>
            <div style={{ height:3, background:"var(--border)", borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:3, width:`${progress*100}%`, background:canSubmit?"linear-gradient(90deg,var(--green),#34D399)":"linear-gradient(90deg,var(--amber),var(--amber-light))", transition:"width 0.3s,background 0.3s" }} />
            </div>
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button className="btn-primary" onClick={()=>onComplete(events)} disabled={!canSubmit}>{taskNumber<totalTasks?"Next Task →":"Analyse My Typing →"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ PROCESSING PAGE ═══
function ProcessingPage({ status }) {
  const [step, setStep] = useState(0);
  const steps = [
    { label:"Sending keystroke data to server", icon:"📡" },
    { label:"Extracting 22 timing features", icon:"⚙️" },
    { label:"Running XGBoost personality models", icon:"🤖" },
    { label:"Running emotion classifier", icon:"💡" },
    { label:"Computing SHAP explanations", icon:"🔬" },
    { label:"Generating your full profile", icon:"✨" },
  ];
  useEffect(()=>{ const iv=setInterval(()=>setStep(s=>Math.min(s+1,steps.length-1)),900); return()=>clearInterval(iv); },[]);
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-body)" }}>
      <div style={{ textAlign:"center", maxWidth:520, padding:"0 24px" }}>
        <div style={{ position:"relative", width:80, height:80, margin:"0 auto 40px" }}>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"2px solid var(--border)" }} />
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"2px solid transparent", borderTopColor:"var(--amber)", animation:"spin 0.9s linear infinite" }} />
          <div style={{ position:"absolute", inset:8, borderRadius:"50%", border:"2px solid transparent", borderTopColor:"rgba(245,158,11,0.4)", animation:"spin 1.4s linear infinite reverse" }} />
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>🧠</div>
        </div>
        <h2 style={{ fontFamily:"var(--font-display)", fontSize:26, fontWeight:700, color:"var(--text)", marginBottom:8, letterSpacing:"-0.02em" }}>Analyzing Your Typing Patterns</h2>
        <p style={{ fontSize:14, color:"var(--text-muted)", marginBottom:40 }}>Personality + emotion models are processing your keystroke dynamics</p>
        <div style={{ textAlign:"left" }}>
          {steps.map((s,i)=>(
            <div key={i} className={`processing-step ${i<step?"done":i===step?"active":""}`} style={{ opacity:i<=step?1:0.3, transition:"opacity 0.5s,background 0.4s,border-color 0.4s" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:i<step?14:18, background:i<step?"rgba(16,185,129,0.2)":i===step?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.05)", border:`1px solid ${i<step?"rgba(16,185,129,0.4)":i===step?"rgba(245,158,11,0.35)":"var(--border)"}`, animation:i<step?"tick-bounce 0.4s ease":"none" }}>
                {i<step?"✓":s.icon}
              </div>
              <span style={{ fontSize:14, color:i<=step?"var(--text)":"var(--text-faint)", fontWeight:i===step?500:400 }}>{s.label}</span>
            </div>
          ))}
        </div>
        {status&&<p style={{ fontSize:12, color:"var(--amber)", marginTop:24, fontFamily:"var(--font-mono)" }}>{status}</p>}
      </div>
    </div>
  );
}

// ═══ EMOTION SECTION (used inside ResultsPage) ═══
function EmotionSection({ emotions }) {
  const [barWidths, setBarWidths] = useState({});
  const [visible, setVisible] = useState(false);

  // Graceful fallback when backend doesn't yet return emotion data
  const data = emotions || {
    dominant_emotion: null,
    valence: null,
    arousal: null,
    scores: null,
    model_accuracy: null,
  };

  useEffect(() => {
    setTimeout(() => {
      setVisible(true);
      if (data.scores) {
        const w = {};
        EMOTIONS.forEach(e => { w[e] = data.scores[e] ?? 0; });
        setBarWidths(w);
      }
    }, 400);
  }, [data]);

  const dominant = data.dominant_emotion;
  const dominantColor = dominant ? EMOTION_COLORS[dominant] : "#F59E0B";
  const dominantIcon = dominant ? EMOTION_ICONS[dominant] : "🔍";

  // Circumplex dot position: valence → x, arousal → y
  const valenceNorm = data.valence != null ? (data.valence / 100) : null; // 0–1
  const arousalNorm = data.arousal != null ? (data.arousal / 100) : null;
  const dotX = valenceNorm != null ? 40 + valenceNorm * 120 : null;
  const dotY = arousalNorm != null ? 140 - arousalNorm * 120 : null;

  return (
    <div style={{ background:"#fff", borderRadius:20, padding:"36px 32px", boxShadow:"0 8px 40px rgba(0,0,0,0.08)", marginBottom:20, animation:visible?"float-up 0.5s ease forwards":"none", opacity:visible?1:0 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:19, fontWeight:700, color:"#0f172a", letterSpacing:"-0.01em", margin:0 }}>Emotional State Analysis</h2>
          <p style={{ fontSize:13, color:"#94a3b8", marginTop:4 }}>Inferred from keystroke dynamics via Russell Circumplex Model</p>
        </div>
        {data.model_accuracy && (
          <span style={{ padding:"5px 14px", borderRadius:20, background:"rgba(236,72,153,0.08)", border:"1px solid rgba(236,72,153,0.2)", fontSize:12, fontFamily:"var(--font-mono)", color:"#EC4899" }}>
            {data.model_accuracy} accuracy
          </span>
        )}
      </div>

      {!dominant ? (
        /* ── Placeholder when backend hasn't returned emotions yet ── */
        <div style={{ padding:"40px 24px", textAlign:"center", borderRadius:16, border:"2px dashed #e2e8f0", background:"#f8fafc" }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🔧</div>
          <p style={{ fontFamily:"var(--font-display)", fontSize:15, fontWeight:600, color:"#64748b", marginBottom:6 }}>Emotion model coming soon</p>
          <p style={{ fontSize:13, color:"#94a3b8", lineHeight:1.7 }}>
            The backend emotion endpoint hasn't returned data yet.<br />
            Add <code style={{ background:"#f1f5f9", padding:"2px 6px", borderRadius:4, fontSize:12 }}>emotions</code> to your <code style={{ background:"#f1f5f9", padding:"2px 6px", borderRadius:4, fontSize:12 }}>/predict/</code> response to enable this section.
          </p>
          <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:20, flexWrap:"wrap" }}>
            {EMOTIONS.map(e=>(
              <span key={e} style={{ padding:"5px 14px", borderRadius:20, background:`${EMOTION_COLORS[e]}10`, border:`1px solid ${EMOTION_COLORS[e]}25`, fontSize:12, color:EMOTION_COLORS[e], opacity:0.6 }}>
                {EMOTION_ICONS[e]} {e}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ── Dominant emotion hero ── */}
          <div style={{ display:"flex", gap:20, marginBottom:28, flexWrap:"wrap" }}>
            <div style={{ flex:"0 0 auto", padding:"28px 32px", borderRadius:16, background:`${dominantColor}0d`, border:`1.5px solid ${dominantColor}30`, textAlign:"center", minWidth:160 }}>
              <div style={{ fontSize:48, marginBottom:10 }}>{dominantIcon}</div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:800, color:dominantColor, marginBottom:4 }}>{dominant}</div>
              <div style={{ fontSize:11, color:"#94a3b8", fontFamily:"var(--font-mono)", letterSpacing:"0.05em" }}>DOMINANT EMOTION</div>
            </div>

            {/* ── Valence / Arousal bars ── */}
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:16, justifyContent:"center", minWidth:200 }}>
              {/* Valence */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"#475569", display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:16 }}>💛</span> Valence
                  </span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:13, color:"#D97706", fontWeight:600 }}>{data.valence}%</span>
                </div>
                <div style={{ position:"relative", height:10, background:"linear-gradient(90deg,#EF4444,#e2e8f0 50%,#10B981)", borderRadius:10 }}>
                  <div style={{ position:"absolute", top:"50%", left:`${data.valence}%`, transform:"translate(-50%,-50%)", width:16, height:16, borderRadius:"50%", background:"#fff", border:"2px solid #D97706", boxShadow:"0 2px 8px rgba(0,0,0,0.15)", transition:"left 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                  <span style={{ fontSize:10, color:"#94a3b8" }}>Negative</span>
                  <span style={{ fontSize:10, color:"#94a3b8" }}>Positive</span>
                </div>
              </div>
              {/* Arousal */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"#475569", display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:16 }}>⚡</span> Arousal
                  </span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:13, color:"#D97706", fontWeight:600 }}>{data.arousal}%</span>
                </div>
                <div style={{ position:"relative", height:10, background:"linear-gradient(90deg,#3B82F6,#e2e8f0 50%,#EF4444)", borderRadius:10 }}>
                  <div style={{ position:"absolute", top:"50%", left:`${data.arousal}%`, transform:"translate(-50%,-50%)", width:16, height:16, borderRadius:"50%", background:"#fff", border:"2px solid #D97706", boxShadow:"0 2px 8px rgba(0,0,0,0.15)", transition:"left 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                  <span style={{ fontSize:10, color:"#94a3b8" }}>Low</span>
                  <span style={{ fontSize:10, color:"#94a3b8" }}>High</span>
                </div>
              </div>
              {/* Circumplex mini-map */}
              {dotX != null && (
                <div style={{ marginTop:4 }}>
                  <div style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"#D97706", fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:8 }}>Circumplex Position</div>
                  <svg width="200" height="160" viewBox="0 0 200 160" style={{ display:"block", overflow:"visible" }}>
                    {/* Axes */}
                    <line x1="40" y1="80" x2="160" y2="80" stroke="#e2e8f0" strokeWidth="1" />
                    <line x1="100" y1="20" x2="100" y2="140" stroke="#e2e8f0" strokeWidth="1" />
                    {/* Quadrant labels */}
                    <text x="44" y="32" fontSize="8" fill="#94a3b8">High Arousal</text>
                    <text x="44" y="148" fontSize="8" fill="#94a3b8">Low Arousal</text>
                    <text x="42" y="92" fontSize="8" fill="#94a3b8">Neg</text>
                    <text x="148" y="92" fontSize="8" fill="#94a3b8">Pos</text>
                    {/* Emotion dots */}
                    {EMOTIONS.map(e => {
                      const ex = 40 + ((EMOTION_VALENCE[e] + 1) / 2) * 120;
                      const ey = 140 - ((EMOTION_AROUSAL[e] + 1) / 2) * 120;
                      return (
                        <g key={e}>
                          <circle cx={ex} cy={ey} r="5" fill={`${EMOTION_COLORS[e]}30`} stroke={`${EMOTION_COLORS[e]}60`} strokeWidth="1" />
                          <text x={ex + 7} y={ey + 4} fontSize="7" fill={EMOTION_COLORS[e]}>{e}</text>
                        </g>
                      );
                    })}
                    {/* User dot */}
                    <circle cx={dotX} cy={dotY} r="7" fill={dominantColor} opacity="0.9" />
                    <circle cx={dotX} cy={dotY} r="12" fill="none" stroke={dominantColor} strokeWidth="1.5" opacity="0.4" />
                    <text x={dotX + 10} y={dotY - 8} fontSize="9" fill={dominantColor} fontWeight="bold">You</text>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* ── Emotion score bars ── */}
          {data.scores && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontFamily:"var(--font-mono)", fontWeight:600, color:"#D97706", marginBottom:14, letterSpacing:"0.06em", textTransform:"uppercase" }}>Emotion Probability Distribution</div>
              {EMOTIONS.map(e => (
                <div key={e} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:"#1e293b", display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ width:24, height:24, borderRadius:6, background:`${EMOTION_COLORS[e]}15`, border:`1px solid ${EMOTION_COLORS[e]}30`, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>{EMOTION_ICONS[e]}</span>
                      {e}
                      {e === dominant && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:10, background:`${dominantColor}15`, color:dominantColor, fontWeight:700 }}>DOMINANT</span>}
                    </span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:13, color:"#D97706", fontWeight:700 }}>{data.scores[e]}%</span>
                  </div>
                  <div style={{ height:7, background:"#f1f5f9", borderRadius:7, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${barWidths[e]||0}%`, background:`linear-gradient(90deg,${EMOTION_COLORS[e]},${EMOTION_COLORS[e]}99)`, borderRadius:7, transition:"width 1.4s cubic-bezier(0.4,0,0.2,1)", boxShadow:`0 0 10px ${EMOTION_COLORS[e]}35` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Emotion description ── */}
          <div style={{ padding:"18px 22px", borderRadius:14, background:`${dominantColor}08`, border:`1px solid ${dominantColor}20`, borderLeft:`3px solid ${dominantColor}` }}>
            <div style={{ fontSize:11, fontFamily:"var(--font-mono)", fontWeight:600, color:dominantColor, marginBottom:8, letterSpacing:"0.06em", textTransform:"uppercase" }}>Interpretation · {dominant}</div>
            <p style={{ fontSize:14, color:"#475569", lineHeight:1.8, margin:0 }}>{EMOTION_DESC[dominant]}</p>
          </div>
        </>
      )}
    </div>
  );
}

// ═══ RESULTS PAGE ═══
function ResultsPage({ data, onRestart }) {
  const [expanded, setExpanded] = useState(null);
  const { predictions, explanations, features, model_info, events_analyzed, emotions } = data;
  const [barWidths, setBarWidths] = useState({});
  const [visible, setVisible] = useState(false);
  useEffect(()=>{ setTimeout(()=>{ setVisible(true); const w={}; TRAITS.forEach(t=>w[t]=predictions[t].score); setBarWidths(w); },200); },[predictions]);
  const featureStats = features ? [
    { label:"Typing Speed", value:`${Math.round(features.typing_speed)} CPM`, sub:"chars/min" },
    { label:"Dwell Time", value:`${Math.round(features.dw_mean)} ms`, sub:"avg key hold" },
    { label:"Flight Time", value:`${Math.round(features.fl_mean)} ms`, sub:"avg between keys" },
    { label:"Speed Var.", value:`${(features.speed_variability*100).toFixed(1)}%`, sub:"variability" },
    { label:"Correction", value:`${(features.backspace_rate*100).toFixed(1)}%`, sub:"backspace rate" },
    { label:"Rhythm", value:`${(features.rhythm_regularity*100).toFixed(0)}%`, sub:"regularity" },
    { label:"Key Diversity", value:`H=${features.key_diversity.toFixed(2)}`, sub:"entropy" },
    { label:"Burstiness", value:features.burstiness.toFixed(3), sub:"burst index" },
    { label:"Long Pauses", value:`${(features.long_pause_freq*100).toFixed(1)}%`, sub:"pause freq" },
  ] : [];
  return (
    <div style={{ background:"#f8fafc", minHeight:"100vh", fontFamily:"var(--font-body)" }}>
      <div style={{ background:"linear-gradient(135deg,var(--bg) 0%,var(--bg3) 100%)", padding:"80px 24px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:500, height:400, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(245,158,11,0.12) 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🧠</div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:32, fontWeight:800, color:"var(--amber)", marginBottom:8, letterSpacing:"-0.03em" }}>Your Personality Profile</h1>
          <p style={{ fontSize:15, color:"rgba(241,245,249,0.55)" }}>Predicted from {events_analyzed} keystroke events · XGBoost + SHAP · Emotion Circumplex</p>
          <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:20, flexWrap:"wrap" }}>
            {model_info&&Object.entries(model_info).slice(0,3).map(([t,m])=>(
              <span key={t} style={{ padding:"5px 12px", borderRadius:20, background:"rgba(245,158,11,0.12)", border:"1px solid rgba(245,158,11,0.2)", fontSize:12, fontFamily:"var(--font-mono)", color:"var(--amber)" }}>{t}: {(m.accuracy*100).toFixed(0)}% acc</span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ maxWidth:720, margin:"-40px auto 0", padding:"0 20px 60px" }}>
        {/* Scores */}
        <div style={{ background:"#fff", borderRadius:20, padding:"36px 32px", boxShadow:"0 8px 40px rgba(0,0,0,0.08)", marginBottom:20, animation:visible?"float-up 0.5s ease forwards":"none", opacity:visible?1:0 }}>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:19, fontWeight:700, color:"#0f172a", marginBottom:28, letterSpacing:"-0.01em" }}>Big Five Scores</h2>
          {TRAITS.map(t=>(
            <div key={t} style={{ marginBottom:22 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontFamily:"var(--font-display)", fontSize:15, fontWeight:600, color:"#1e293b", display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ width:28, height:28, borderRadius:7, background:`${TRAIT_COLORS[t]}15`, border:`1px solid ${TRAIT_COLORS[t]}30`, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>{TRAIT_ICONS[t]}</span>
                  {t}
                </span>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:600, background:predictions[t].label==="High"?"#10B98115":"#94a3b815", color:predictions[t].label==="High"?"#10B981":"#94a3b8" }}>{predictions[t].label}</span>
                  <span style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:800, color:"#D97706", minWidth:44, textAlign:"right" }}>{predictions[t].score}</span>
                </div>
              </div>
              <div style={{ height:8, background:"#f1f5f9", borderRadius:8, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${barWidths[t]||0}%`, background:`linear-gradient(90deg,${TRAIT_COLORS[t]},${TRAIT_COLORS[t]}99)`, borderRadius:8, transition:"width 1.4s cubic-bezier(0.4,0,0.2,1)", boxShadow:`0 0 12px ${TRAIT_COLORS[t]}40` }} />
              </div>
            </div>
          ))}
        </div>
        {/* Emotion Analysis */}
        <EmotionSection emotions={emotions} />
        {/* SHAP */}
        <div style={{ background:"#fff", borderRadius:20, padding:"36px 32px", boxShadow:"0 8px 40px rgba(0,0,0,0.08)", marginBottom:20 }}>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:19, fontWeight:700, color:"#0f172a", marginBottom:6, letterSpacing:"-0.01em" }}>SHAP Explainability Analysis</h2>
          <p style={{ fontSize:13, color:"#94a3b8", marginBottom:24 }}>Tap each trait to see which keystroke features drove the prediction</p>
          {TRAITS.map(t=>(
            <div key={t} className="accordion-item">
              <div className="accordion-header" onClick={()=>setExpanded(expanded===t?null:t)}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:42, height:42, borderRadius:11, background:`${TRAIT_COLORS[t]}12`, border:`1px solid ${TRAIT_COLORS[t]}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{TRAIT_ICONS[t]}</div>
                  <div>
                    <div style={{ fontFamily:"var(--font-display)", fontSize:15, fontWeight:600, color:"#1e293b" }}>{t}</div>
                    <div style={{ fontSize:12, color:"#94a3b8" }}>Score: {predictions[t].score}% · Confidence: {predictions[t].confidence}%</div>
                  </div>
                </div>
                <span style={{ fontSize:12, color:"#94a3b8", transform:expanded===t?"rotate(180deg)":"none", transition:"transform 0.3s", display:"inline-block" }}>▼</span>
              </div>
              {expanded===t&&explanations[t]&&(
                <div style={{ padding:"0 22px 22px", animation:"slide-down 0.25s ease" }}>
                  <p style={{ fontSize:14, color:"#475569", lineHeight:1.8, marginBottom:18, paddingTop:4 }}>{predictions[t].score>=50?HIGH_DESC[t]:LOW_DESC[t]}</p>
                  <div style={{ fontSize:11, fontFamily:"var(--font-mono)", fontWeight:600, color:"#D97706", marginBottom:12, letterSpacing:"0.06em", textTransform:"uppercase" }}>Top SHAP Feature Contributions</div>
                  {explanations[t].slice(0,4).map((exp,i)=>(
                    <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:10, padding:"12px 16px", borderRadius:10, background:exp.direction==="positive"?"rgba(16,185,129,0.05)":"rgba(239,68,68,0.05)", border:`1px solid ${exp.direction==="positive"?"rgba(16,185,129,0.2)":"rgba(239,68,68,0.2)"}`, borderLeft:`3px solid ${exp.direction==="positive"?"#10B981":"#EF4444"}` }}>
                      <span style={{ fontSize:14, color:exp.direction==="positive"?"#10B981":"#EF4444", flexShrink:0, fontWeight:700 }}>{exp.direction==="positive"?"↑":"↓"}</span>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:"#1e293b" }}>{exp.feature_display}: <span style={{ color:"#64748b", fontWeight:400 }}>{exp.value}</span><span style={{ color:exp.direction==="positive"?"#10B981":"#EF4444", fontSize:11, marginLeft:8, fontFamily:"var(--font-mono)" }}>SHAP: {exp.shap_value>0?"+":""}{exp.shap_value.toFixed(3)}</span></div>
                        <div style={{ fontSize:12, color:"#64748b", marginTop:3, lineHeight:1.6 }}>{exp.explanation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Features */}
        <div style={{ background:"#fff", borderRadius:20, padding:"36px 32px", boxShadow:"0 8px 40px rgba(0,0,0,0.08)", marginBottom:20 }}>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:19, fontWeight:700, color:"#0f172a", marginBottom:20, letterSpacing:"-0.01em" }}>Extracted Feature Values</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            {featureStats.map((s,i)=>(
              <div key={i} className="stat-chip">
                <div style={{ fontFamily:"var(--font-display)", fontSize:17, fontWeight:700, color:"#D97706" }}>{s.value}</div>
                <div style={{ fontSize:11, color:"#64748b", marginTop:2, fontWeight:500 }}>{s.label}</div>
                <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Disclaimer */}
        <div style={{ background:"#fffbeb", borderRadius:14, padding:"20px 24px", marginBottom:28, border:"1px solid #fde68a" }}>
          <p style={{ fontSize:12, color:"#92400e", lineHeight:1.75, margin:0 }}>
            <strong>Research Note:</strong> Predictions generated by XGBoost classifiers trained on 2,400 synthetic samples (800 participants × 3 sessions) with SHAP TreeExplainer. Accuracy: 78–86% (5-fold CV). Results are probabilistic ML estimates for educational and research purposes — not clinical assessments.
          </p>
        </div>
        <div style={{ textAlign:"center" }}>
          <button className="btn-ghost" onClick={onRestart} style={{ borderColor:"#cbd5e1", color:"#475569" }}>↺ Take Assessment Again</button>
        </div>
      </div>
    </div>
  );
}

// ═══ MAIN APP ═══
export default function App() {
  const [stage, setStage] = useState("welcome");
  const [sessionId, setSessionId] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [results, setResults] = useState(null);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [processStatus, setProcessStatus] = useState("");

  useEffect(()=>{ apiGet("/health/").then(d=>setBackendStatus(d.status==="healthy"?"connected":"offline")).catch(()=>setBackendStatus("offline")); },[]);

  const handleStart = async () => {
    try { const res=await apiPost("/session/",{user_agent:navigator.userAgent}); setSessionId(res.session_id); setStage("copy1"); }
    catch(e) { alert("Failed to create session. Is the Django server running on port 8000?"); }
  };

  const handleTaskComplete = async (taskEvents) => {
    const taskMap={copy1:"copy_1",copy2:"copy_2",free1:"free_1",free2:"free_2"};
    const nextMap={copy1:"copy2",copy2:"free1",free1:"free2",free2:"processing"};
    setAllEvents(prev=>[...prev,...taskEvents]);
    try { await apiPost("/keystrokes/",{session_id:sessionId,task_id:taskMap[stage],events:taskEvents}); }
    catch(e) { console.error("Failed to submit keystrokes:",e); }
    setStage(nextMap[stage]);
  };

  useEffect(()=>{
    if(stage!=="processing"||!sessionId)return;
    const run=async()=>{
      setProcessStatus("Sending data to ML pipeline...");
      await new Promise(r=>setTimeout(r,2000));
      try {
        setProcessStatus("Running XGBoost + SHAP inference...");
        const result=await apiPost("/predict/",{session_id:sessionId});
        if(result.error){setProcessStatus(`Error: ${result.error}`);return;}
        setResults(result);
        await new Promise(r=>setTimeout(r,1500));
        setStage("results");
      } catch(e) { setProcessStatus(`API Error: ${e.message}`); }
    };
    run();
  },[stage,sessionId]);

  const handleRestart=()=>{ setStage("welcome"); setSessionId(null); setAllEvents([]); setResults(null); setProcessStatus(""); };

  return (
    <>
      <GlobalStyles />
      {stage==="welcome"&&<Navbar backendStatus={backendStatus} onLogoClick={()=>{}} />}
      {stage==="welcome"&&<WelcomePage onStart={handleStart} backendStatus={backendStatus} />}
      {stage==="copy1"&&<TypingTask taskType="copy" passage={COPY_PASSAGES[0]} taskNumber={1} totalTasks={4} onComplete={handleTaskComplete} />}
      {stage==="copy2"&&<TypingTask taskType="copy" passage={COPY_PASSAGES[1]} taskNumber={2} totalTasks={4} onComplete={handleTaskComplete} />}
      {stage==="free1"&&<TypingTask taskType="free" prompt={FREE_PROMPTS[0]} taskNumber={3} totalTasks={4} onComplete={handleTaskComplete} />}
      {stage==="free2"&&<TypingTask taskType="free" prompt={FREE_PROMPTS[1]} taskNumber={4} totalTasks={4} onComplete={handleTaskComplete} />}
      {stage==="processing"&&<ProcessingPage status={processStatus} />}
      {stage==="results"&&results&&<ResultsPage data={results} onRestart={handleRestart} />}
      {stage==="processing"&&!results&&stage!=="results"&&<ProcessingPage status={processStatus} />}
    </>
  );
}