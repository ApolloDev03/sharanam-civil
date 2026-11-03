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
