# Sharanam Civil Consultancy – Combined Landing Page

Built by combining the user's uploaded Sharanam Premium Landing and Sharanam Redesign projects.

- Base: Premium landing page layout, header, services, hero carousel, FAQ, blogs, contact.
- Testimonials and light editorial footer: adapted from Sharanam Redesign.
- Hero interaction: arrow buttons, mouse-wheel and touch swipe; slide numbers / progress removed.
- About: 4-image carousel with auto cycle, thumbnails and accessible arrows.
- Favicon: created from the supplied original Sharanam icon.

Open index.html in a browser. Online images and Google Fonts require an internet connection.

**Before launch:** Add authentic team details, company/project photography, valid certificates, approved testimonials, real blog posts and confirmed social links. The form uses mailto and does not submit to a server.

## Redesign update (Nov 2026)

- Redesigned: Our Services, Why Choose Sharanam Civil Consultancy, Major Sectors, Testimonials, FAQ.
- About paragraphs: key phrases in bold, the rest in regular weight.
- One shared button across the site: `.motion-btn` (the blog section's "Explore Insights" button).
- Unchanged: header, hero, Methodology, Team, Credentials, blog, footer.
- New CSS is at the end of `assets/css/style.css`; new JS at the end of `assets/js/main.js`.

## v5 update (Nov 2026)

- Testimonials replaced with the stacked-sheets design (`.ts4`).
- Every section has the same vertical padding: 60px top/bottom (52px tablet, 44px mobile). Change `--section-y` in `style.css` to adjust all at once.
- New shared button `.sc-btn` used everywhere (Services, Why Choose, FAQ, Blog). All CSS for these is at the end of `assets/css/style.css`.

## v6 update (Nov 2026)

- Section subtitles now have icons (`.kicker--icon`): helmet (Services), shield (Why Choose), buildings (Sectors), speech bubble (Testimonials), question mark (FAQ), book (Blog).
- Shared button redesigned as `.sb` ("Site Pour"): charcoal pill with an orange disc that floods the button on hover, plus a dashed marking ring. Used in Services, Why Choose, FAQ and Blog.

## 3D construction story hero (refined)

The hero is a scroll-driven 3D story (`<section class="story" id="home">`). There are no counters, dots, progress bars or percentages: the building itself shows the progress.

**Scenes.** There are six resting points; each scroll gesture moves exactly one, forward or back.

| Stop | Scene | Text |
|---|---|---|
| 1 | Incomplete frame, rebar, scaffolding, idle crane, materials | Every Great Structure Begins With a Vision. |
| 2 | Work on hold: crew waiting under the rest shelter, overcast light | Without the Right Management, Progress Slows Down. |
| 3 | Sharanam team at the blueprint table, orange planning overlay, site gets busy | Expert Supervision Changes Everything. |
| 4 | The same building rises: frame, slabs, walls, windows, finishes, then landscaping | From Planning to Progress. |
| 5 | Completed building, camera pulls back, warmer light | (no text, the building speaks) |
| 6 | Sharanam project manager walks in, turns to camera and folds his arms; low street-level hero shot | From Vision to Completion. Managed With Confidence. + "Explore Our Services" |

After the last scene the final frame holds for half a screen, then the page scrolls normally into About.

**Files**
- `assets/js/hero-3d.js` holds the scene, camera, lighting, scroll and snapping.
- `assets/js/hero-engineer.js` is the project manager: a jointed rig (hips, spine, chest, neck, head, shoulders, elbows, wrists, knees, ankles), animated only through joint rotations, with a scroll-synced walk, turn, arm-fold and breathing.
- `assets/js/sharanam-brand.js` holds the original `sharanam-icon.png` and `logo.png` embedded as data URIs. They are used on the helmet front (symbol) and the vest chest (full logo). Embedding them keeps them working when `index.html` is opened straight from disk.
- `assets/js/vendor/` holds Three.js r149, a UMD build of the GLTFLoader, GSAP 3 and ScrollTrigger.

**Using a professional rigged character (recommended for a photoreal look)**

The built-in character is a clean, architectural-model style figure built in code. It is not a photoreal human. For a realistic Indian civil engineer:
1. Get a licensed rigged `.glb` made by a 3D artist or a marketplace: a white helmet, hi-vis vest, site boots and the Sharanam logo baked into the textures, with a **walk** clip and a **fold arms** clip.
2. Save it as `assets/models/sharanam-pm.glb`.
3. In `index.html`, uncomment `window.SHARANAM_PM_MODEL = 'assets/models/sharanam-pm.glb';`.

The model is scaled to 1.76 m automatically. Clips are matched by name (`/walk/i`, `/fold|cross|arms/i`, `/idle/i`) and scrubbed by scroll. If the file fails to load, the built-in character stays. GLB loading needs the site to be served over http(s), not opened as a file.

**Tuning**
- Camera per stop: the `KEYS` array (mobile has its own final shot).
- Light: the `ATM` array.
- Where the manager stops: `PM_SPOT` and `PM_FROM`.
- Arm-fold pose: `FOLD` in `hero-engineer.js`.
- Story length: `--story-scenes` in CSS.
- Reduced motion: no idle drift or breathing, and quick snaps. Without WebGL: a static background, and the text still follows scroll.
