# Sharanam Civil Consultancy — Integrated Pages

This build is based directly on the supplied `sharanam-civil(6).zip`. The supplied landing-page structure and existing Three.js/GSAP construction story have been retained.

## Pages

- `index.html` — original landing page and 3D sequence; header/footer and links updated.
- `about.html` — About, Mission/Vision/Values, authentic supplied team portraits, capabilities, CTA.
- `ourServices.html` — services plus pre/during/post construction stages.
- `projects.html` — exactly three demo portfolio entries with category filters.
- `project-detail.html?project=skypark` — project detail and fullscreen image gallery.
- `project-detail.html?project=industrial-campus` — demo project detail.
- `project-detail.html?project=interior-studio` — demo project detail.
- `team.html`, `certificate.html`, `company-profile.html`, `blog.html`, `blog-Detail.html`, `contact.html`, `thank-you.html`.

The separate Picture Gallery page has intentionally **not** been created. Project images are displayed in the respective project-detail pages instead.

## Source files

- **Only one stylesheet:** `assets/css/style.css`. All new inner-page styles are appended at the bottom of the original style file.
- New shared interactivity: `assets/js/inner-pages.js`.
- Project details: `assets/js/project-data.js`.
- Blog card demo data: `assets/js/blog-data.js`.
- Three locally stored sample project card photos, cropped from the user-provided website screenshot: `assets/images/projects/*-demo.jpg`. These are lower-resolution screenshot extracts, **not** authentic project photo assets.
- Existing `assets/js/hero-3d.js`, `assets/js/hero-engineer.js`, `assets/js/sharanam-brand.js`, and local libraries remain available unchanged.

## Project images and data

The projects menu provides three categories and three demo projects. Update `assets/js/project-data.js` with approved names, clients, specifications, cover images, and each project's `gallery` array. Additional slider photographs are illustrative Unsplash images and require replacement before production. No separate gallery listing is needed.

## Form, CAPTCHA, and the Thank You page

The contact form includes required fields, a 10-digit numeric phone input, a simple visual arithmetic CAPTCHA, and a hidden honeypot field. The arithmetic challenge is client-side only; **it is not secure bot protection.**

**Default behavior without a backend:** after validation, the website opens the visitor's default email application with an enquiry draft. It does *not* claim to have sent any mail. The Thank You page describes the handoff honestly.

**Configure real delivery:** add this *before* `assets/js/inner-pages.js` on `contact.html`:

```html
<script>window.SHARANAM_FORM_ENDPOINT = 'https://your-verified-form-api.example/submit';</script>
```

Implement the endpoint to accept POST `FormData`, validate the form and CAPTCHA **on the server** (prefer Cloudflare Turnstile or hCaptcha with a verified server-side token), send the email, rate-limit requests, and return `2xx` only on real acceptance. Successful submissions then redirect to `thank-you.html?status=sent`. Do not leave the fake example endpoint in production.

## WhatsApp

The floating WhatsApp button opens `https://wa.me/918460065272` with a prefilled introduction, using the number in your existing footer. Update `assets/js/inner-pages.js` if the business number changes. The link uses `target=_blank`.

## Hosting

This is a static HTML/CSS/JavaScript project. The demo uses external Unsplash image URLs and Google Fonts; the homepage already depended on those. For fully offline operation, replace them with approved local images and local fonts. Serve the directory using VS Code Live Server or `python -m http.server 8000`.

## Testing and limitations

All local HTML/CSS/JS/image paths, HTML page non-emptiness, source-file preservation, and JavaScript syntax have been checked. Browser navigation in the sandbox was blocked by administrative restrictions; full visual/interaction QA still needs to be performed in Chrome/Firefox across desktop and mobile sizes.

No `.git` folder is included in the delivery ZIP.
