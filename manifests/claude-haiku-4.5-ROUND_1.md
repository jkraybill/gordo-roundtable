# Panel Findings: GenAI Prompt Optimization for Breed & Speed

## Consent & Scope

I accept this task under the stated terms. These findings reflect my analysis of your prompt engineering problem; they are inputs to your deliberation, not prescriptions.

---

## 1. Critique of Existing Prompts

### v1_basic
**Strength:** Concrete, hexadecimal specificity.  
**Weaknesses:**
- Hex colors are *precise but affectively inert*. `#1A1A3A` conveys wavelength, not mood.
- "Dramatic horse silhouette" is generic; doesn't differentiate from a dozen other games.
- No emotional throughline. "Prestigious, inviting, arcade excitement" is a list, not a coherent aesthetic demand.
- Missing the *stakes*—no language about competition, tension, or adrenaline.

### v2_semantic_colors
**Strength:** Better. "Championship gold," "trophy luster" work because they anchor color to *feeling* and *material reality*.  
**Weaknesses:**
- "CRT arcade monitor with subtle phosphor glow" was likely the trigger for SNK logos and bezels. GenAI interprets "as if displayed on" as "generate the display hardware context."
- Still static. Horses aren't *doing* anything.
- "Prestigious, inviting, classic arcade excitement" — "classic" reads as *nostalgic*, not *visceral*.

### v3_narrative
**Strength:** Evocative, scene-setting, rich sensory detail.  
**Weaknesses:**
- "Walking up to an arcade cabinet" + "screen glows" = GenAI generates the cabinet. Narrative framing backfired.
- "Majestic horse silhouette... noble and spirited" — again, *static virtue*, not *dynamic tension*.
- "Pulses in that familiar arcade cyan" — good, but isolated detail, not woven into the energy.

---

## 2. Language Driving Wrong Outputs

**CRT/cabinet triggers:**
- "as if displayed on"
- "arcade cabinet," "arcade monitor"
- "screen glows," "phosphor"
- "arcade game screenshot"

These cue *meta-context* (hardware, display device) rather than *artwork content*.

**SNK/branding triggers:**
- Brand-name comparisons ("like King of Fighters") → models add logos as visual proof
- "1995 NEO-GEO aesthetic" → activates dataset memory of actual SNK assets

**Static/noble-but-boring triggers:**
- "Majestic," "noble," "prestigious," "spirited" (without action)
- "Silhouette" (implies stillness)
- "Inviting" (passive)

---

## 3. Reframing for Excitement & Stakes

Your references already encode this. Study them:
- **retired-next.png**: The horse *has value*. Stat bars, food icons, breeding data—this is *economic stakes*, not just appearance.
- **in-race.png**: Crowd, dirt spray, jockey colors, position tracker—*social stakes* (spectacle) + *competitive stakes* (winning/losing).

**Better emotion anchors:**

| Avoid | Use Instead | Why |
|-------|-------------|-----|
| "Prestigious" | "Championship stakes," "high purse," "on the line" | Action + consequence |
| "Majestic" | "Coiled muscle," "ready to explode," "straining" | Kinetic energy |
| "Luxurious" | "Prize money," "trophy finish," "elite circuit" | Economic/status tension |
| "Inviting" | "You're in this race," "the crowd is roaring," "your horse" | Player agency |

**Language that worked in your v2:**
- "Championship gold — the color of a real trophy" ✓ (ties color to stake)
- "Trophy luster, not mustard yellow" ✓ (specificity + comparison)

---

## 4. Recommended Prompt Structure

**Hybrid: Semantic + Narrative, with structural guardrails.**

```
[PRODUCTION ARTWORK FRAME]
Create production artwork for a game screen: "Breed & Speed" 
(NOT a screenshot, NOT a cabinet display, NOT a monitor — flat game art)

[AESTHETIC ANCHOR]
1990s Japanese arcade prestige meets horse racing stakes.
Think Derby Owner's Club interior detail + King of Fighters intensity.
Rich, textured, dramatic — not clean, not flat design, not modern UI.

[EMOTIONAL CORE — Choose Title or In-Race]

FOR TITLE/BREEDING SCREEN:
This is where high-stakes breeders and owners gather to assess bloodlines.
Your horse is a *championship prospect*. The gold trim, the stat readouts, 
the careful portraiture — everything signals *serious money* and *serious breeding*.
Tension: Will this horse deliver?

FOR RACE SCREEN:
The crowd is *roaring*. Dirt is flying. Your horse is *straining* for the finish line.
This is the moment that matters — purse money, prestige, your horse's legacy, all on these seconds.
Every jockey's colors, every horse's muscle, every grain of track dust matters.
The energy is *overwhelming*.

[VISUAL SPECIFICS]

Colors (tie to material reality, not hex):
- Background: Deep indigo like a twilight track, not pure black
- Gold: Burnished trophy gold — warm, lustrous, real metal
- Accents: Arcade cyan (CRT monitor phosphor green-blue)
- Earth: Worn leather brown, dirt, genuine racing track texture

Composition [for title]: Checkered flag border top. Large "BREED & SPEED" logo center, 
flanked by horse-head laurel emblems. Below: Horse portrait or silhouette, 
nobility + readiness. Bottom: "PRESS START" in arcade style.

Composition [for race]: Behind-horse camera angle. Multiple horses *straining*. 
Crowd in bleachers behind. Dirt track texture realistic. HUD elements: 
position strip, speed/stamina bars. Race field visible in background.

Details (these make it feel *real*):
- Stat bars: segmented, colorful, readable (NOT modern health bars)
- Horse portraits: painterly, warm lighting, nobility + spirit
- Food icons: small, charming, recognizable
- Jockey silks: bright, popping colors against darker background
- Crowd: varied, energized, cheering

[ANTI-PATTERNS]
AVOID: CRT bezels, cabinet frames, monitor bezels, SNK logos, 
flat design, minimalism, photorealism, modern/iOS style, generic 90s aesthetic.

[RESOLUTION]
1280×896 pixels (10:7 aspect ratio), landscape.

[TONE]
High stakes. Prestigious. *Thrilling*. You want to bet on this horse. 
You want to *be* in that cockpit. This is championship racing.
```

---

## 5. img2img Strategy

**Approach: Controlled Fidelity Blending**

1. **Use both references as composite inputs:**
   - Feed retired-next.png + in-race.png together in early diffusion steps
   - Models will extract *style coherence* without copying literally

2. **Denoising strength guidance:**
   - **0.65–0.75** for title/UI-heavy screens: Keep reference layout/chrome, regenerate horses
   - **0.55–0.65** for race screens: Keep composition/energy, refresh details
   - **Higher (0.8+)** only for minor refinement passes

3. **Composite strategy (more reliable):**
   - Generate content in isolation (horses, backgrounds, crowds)
   - Layer static UI chrome (gold borders, stat bars, flags) programmatically
   - Blend at 85–95% opacity to preserve texture
   - *Why:* UI consistency guaranteed; content freshness preserved

4. **Iteration loop:**
   - Generate 4–6 variants per prompt
   - Score on: (a) consistency with references, (b) excitement/energy, (c) detail richness
   - Refine prompt based on *which variants scored highest*, not on single-image feedback

---

## 6. Model Recommendations

**Caveat:** I don't have real-time benchmarking, but based on known strengths:

| Model | Strength | Weakness | Verdict |
|-------|----------|----------|---------|
| Gemini 3.1 Flash | Speed, detail consistency | Can overindex on "arcade cabinet" framing (your experience) | **Use with strict anti-pattern language** |
| Claude (vision) | Semantic coherence, emotional tone | Slower, may need longer prompts | **Good for reference analysis + prompt refinement** |
| Midjourney | Style control, reference blending | Expensive, less controllable | **Test if budget allows; strong on img2img** |
| DALL-E 3 | Instruction-following | Less stylistic nuance | **Acceptable, not optimal** |
| Flux (open) | Detail, texture, speed | Less established arcade game training | **Worth benchmarking once accessible** |

**My recommendation:** Start with **Gemini 3.1 Flash** (you know it works) + **revised prompts with strict guardrails against cabinet framing**. If results still regress, pivot to **Midjourney** for one test batch with your best prompt + both reference images as img2img seeds.

---

## 7. Consistency Strategy Across 20+ Screens

**Three-tier approach:**

### Tier 1: Fixed Assets (Programmatic)
- Gold trim/borders (vector or pre-rendered)
- "BREED & SPEED" logo (locked)
- Checkered flag strips
- Stat bar templates
- HUD elements (position tracker, timers)

**Output:** Consistency = 100%. Done once, never regenerate.

### Tier 2: Style Reference (Semantic Consistency)
For every new screen, include in prompt:
```
CONSISTENCY ANCHOR:
This screen is part of "Breed & Speed," an integrated game UI suite.
Other screens in this suite feature: [list 2–3 key visuals from generated screens you're happy with]
Match their visual language: color palette, detail density, texture, lighting, emotional tone.
```

**Output:** Models anchor to prior successful outputs, not random internet noise.

### Tier 3: Palette Lock (Strict)
```
COLOR LOCK (do not deviate):
- Background: Indigo #2A2A4A (±5% hue drift maximum)
- Gold: Trophy gold #D4A017 (±3% saturation)
- Cyan: Arcade cyan #00D4D4 (exact)
- Brown: Worn leather #6B4423 (±8% hue drift)
```

Provide hex or RGB, and say: *"Do not substitute or vary these colors."*

**Output:** Frame-to-frame color fidelity.

### Monitoring: Diversity vs. Coherence
After 8 generated screens:
1. Extract dominant colors, compare to lock.
2. Score visual diversity (horses, crowds, compositions should vary).
3. Score emotional coherence (all feel like "high-stakes racing").
4. If coherence drifts, regenerate with stricter Tier 2 anchor.

---

## 8. Revised v4 Prompt (Synthesis)

```
[PRODUCTION ARTWORK — FLAT GAME SCREEN]

Create game screen artwork for "Breed & Speed," a 1990s Japanese arcade horse racing game.
This is production art for the game itself — not a screenshot of a cabinet, not a display mockup.
Flat artwork, 1280×896 pixels, landscape (10:7 aspect ratio).

[CHOOSE YOUR SCENE]

SCENE A — BREEDING/SELECTION SCREEN:
Your horse is a *championship prospect*. Serious money, serious breeding, championship stakes.
The interior is prestigious: burnished gold trim, deep indigo like twilight on the track,
warm overhead lighting on the horses' coats. Every detail — stat bars, food icons, 
horse portraiture — signals *this horse matters*. Tension: Will it deliver?

SCENE B — RACE SCREEN:
The crowd is *roaring*. Dirt is *flying*. Your horse is *straining* for the finish line.
This is the moment. Purse money, prestige, your bloodline's legacy. All on these seconds.
Jockey silks in bright, contrasting colors. Multiple horses *muscled and straining*.
Behind-horse camera angle. Overwhelming energy. Championship racing at its peak.

[VISUAL LANGUAGE]

Aesthetic: 1990s Japanese arcade prestige interior (think: high-end betting lounge, 
not game center). Rich textures, painterly detail, warm lighting, deep color.

Color Palette (strict):
- Background: Deep indigo, twilight on the track (not pure black)
- Gold: Burnished trophy gold, real lustrous metal — warm, never mustard yellow
- Cyan: Arcade cyan (CRT phosphor, that distinctive glow)
- Brown: Worn leather, dirt, genuine racing texture

Details:
- Stat bars: Segmented (not smooth), colorful, readable, game-like
- Horse portraits: Painterly, warm lighting, nobility + readiness (not stoic)
- Food icons: Small, charming, recognizable (game asset quality)
- Jockey silks: Bright, popping colors
- Crowds: Energized, varied, cheering
- Track texture: Dirt, real, not abstract

Composition [SCENE A]:
- Top edge: Blue-and-black checkered racing flag strip
- Center: Large "BREED & SPEED" logo in gold serif, flanked by horse-head laurel emblems
- Below logo: Horse portrait (painterly, spirited), OR silhouette (ready to explode)
- Bottom: "PRESS START" in arcade cyan, pulsing/arcade style
- Total: Prestigious, inviting, high-stakes breeding drama

Composition [SCENE B]:
- Behind-horse angle: Multiple horses racing, muscles straining, dirt spray
- Background: Packed grandstands, roaring crowd, cheering faces
- Track: Realistic dirt texture, genuine racing surface
- HUD: Position tracker bottom, speed/stamina bars, race timer
- Jockey colors: Bright, distinct, visible
- Total: Overwhelming energy, high stakes, you're in the race, this matters

[ANTI-PATTERNS — CRITICAL]
AVOID: CRT bezels, monitor frames, cabinet bezels, arcade cabinet context, SNK logos,
flat design, minimalism, modern UI, iOS style, photorealism, generic 1990s aesthetic.

[TONE]
Prestigious. Thrilling. High stakes. Championship-level racing.
You want to bet on this horse. You want to *be* in that cockpit.
This is not nostalgia — this is *intensity*.
```

---

## 9. Key Uncertainties & Open Questions

1. **Your reference images' provenance:** Are they hand-painted, AI-generated, or hybrid? If AI, knowing the model/prompt would accelerate reverse-engineering. If hand-painted, understanding the artist's intent (lighting, palette philosophy) would sharpen semantic anchoring.

2. **Model-specific quirks:** I don't have empirical data on how Gemini 3.1 Flash vs. competitors interpret "production artwork" vs. "game screen." One focused A/B test (same prompt, 5 iterations per model) would resolve this.

3. **Composite layer fidelity:** Programmatically overlaying UI chrome on generated content is reliable, but the blend quality depends on your rendering pipeline. Is opacity blending sufficient, or do you need alpha-channel sophistication?

4. **Training data cutoff effects:** GenAI models' casino/gambling training may resist or exaggerate "high stakes" language. Testing with neutral alternatives ("purse money," "championship points") vs. hot language ("betting," "adrenaline") would show where the safety filter engages.

5. **Consistency at scale:** Will a 3-tier system work for 20+ screens, or does model drift require re-anchoring every 5 screens? Only generation + measurement will tell.

---

## 10. Summary Recommendations (Priority Order)

1. **Kill hardware framing immediately.** Remove all "CRT," "cabinet," "display," "screen glow" language. Replace with "production artwork," "game screen," "flat art."

2. **Add emotional stakes.** Use "championship," "purse," "straining," "roaring," "crowd," "high stakes." Test these vs. your current palette.

3. **Revise to v4 hybrid prompt** (above). Test Gemini 3.1 Flash with this first.

4. **Implement composite strategy:** Lock UI chrome programmatically
