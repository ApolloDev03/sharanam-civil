# v31 contact and breadcrumb refinements

- Replaced CAPTCHA with white, high-contrast Security Check panel (retains `captchaQuestion`, `captchaAnswer`, `captchaRefresh` IDs used by existing JavaScript).
- All contact form fields use consistent heights, visible labels and responsive grid.
- Added max length to name (50), email (50), message (500). Phone number still restricted to 10 digits.
- Made inner-page breadcrumb grey rather than white faded; removed checker patterns.
- All styling remains in `assets/css/style.css`.
- Existing contact form still uses mailto fallback without an email backend.
