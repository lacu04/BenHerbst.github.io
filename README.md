# Benjamin Herbst, portfolio

A static site (plain HTML, CSS, and JavaScript, no build step) built from the resume.

## Publish on GitHub Pages

1. Create a new repository on GitHub. For a root address like `https://USERNAME.github.io`, name it exactly `USERNAME.github.io`. Any other name works too and publishes at `https://USERNAME.github.io/REPO-NAME/`.
2. Upload everything in this folder to the repository's `main` branch, keeping `index.html` at the top level.
3. In the repository, open Settings > Pages. Under "Build and deployment", set Source to "Deploy from a branch", choose `main` and `/ (root)`, and save.
4. Wait a minute or two. The site address appears at the top of the Pages settings.

## Add project photos

Every project has a photo slot. Drop a file into `images/` using the name shown in the placeholder and it replaces the placeholder automatically:

- `images/robotic-finger.jpg`
- `images/telescope-tracking.jpg`
- `images/soda-can-robot.jpg`
- `images/weather-alert.jpg`
- `images/morse-trainer.jpg`
- `images/mechanical-hand.jpg`

Photos display at a 4:3 ratio and are cropped to fit, so landscape shots work best. Keep each file under about 500 KB so the page loads quickly.

## Update the resume PDF

Replace `Ben_Herbst_Resume.pdf` with the new file, keeping the same name. Both download links point to it.

## Edit the content

All text lives in `index.html`. Colors and fonts are the variables at the top of `css/style.css`. The tracking demo in the header is `js/main.js`; change `PEAK_AZ` and `PEAK_EL` there to reshape the simulated pass.
