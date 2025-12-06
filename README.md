# Fidgit - Tactile Fidget Cube PWA

A Progressive Web App inspired by fidget cubes, providing tactile haptic feedback for stress relief and fidgeting.

## Features

- **6 Interactive Zones** with different textures and feedback:
  - 🔄 **Spinner** - Rotate with momentum, tick feedback every 30°
  - ↔️ **Slider** - Slide with notch feedback
  - 👆 **Click** - Satisfying button press
  - 🎛️ **Dial** - Rotatable dial with notch feedback every 15°
  - 🔘 **Toggle** - On/off switch with two-stage feedback
  - ⚽ **Roll Ball** - Trackball-like rolling surface

- **Full Screen PWA** - Installable on mobile devices
- **Haptic Feedback** - Different vibration patterns for each interaction
- **Greyscale Textured Design** - Minimalist tactile aesthetic
- **Offline Support** - Works without internet via service worker

## Installation

### As a PWA
1. Visit the deployed site on your mobile device
2. Tap "Add to Home Screen" when prompted
3. Launch from your home screen for full-screen experience

### Local Development
```bash
npm install
npm start
```

## Deployment

### Cloudflare Pages
This app is configured for Cloudflare Pages deployment:

1. Connect your GitHub repository to Cloudflare Pages
2. Set build settings:
   - Build command: (none - static files)
   - Output directory: `/`
3. Deploy!

Or use Wrangler CLI:
```bash
npx wrangler pages deploy . --project-name=fidgit
```

## Browser Support

- Chrome/Edge (full haptic support)
- Safari/iOS (limited haptic support)
- Firefox (vibration API varies)

## License

MIT License - see [LICENSE](LICENSE) for details.
