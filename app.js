/**
 * Fidgit - A tactile fidget cube PWA
 * Provides haptic feedback for different interactive zones
 */

// Import styles
import './styles.css';

// Import Capacitor Haptics for better PWA support
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

class FidgitApp {
    constructor() {
        this.zones = {};
        this.activeZone = null;
        this.hapticSupported = 'vibrate' in navigator;
        this.capacitorAvailable = false; // Track if Capacitor is available
        this.userActivated = false; // Track if we have user activation
        
        // Check if Capacitor is available
        this.checkCapacitorAvailability();
        
        // State for each zone
        this.state = {
            spinner: { rotation: 0, velocity: 0, lastAngle: null },
            slider: { position: 10, isDragging: false },
            click: { pressed: false },
            dial: { rotation: 0, lastAngle: null },
            toggle: { on: false },
            roll: { x: 0, y: 0, lastX: null, lastY: null }
        };

        this.init();
    }

    // Check if Capacitor is available
    async checkCapacitorAvailability() {
        try {
            // Try to check if Haptics is available
            // Capacitor is available if we can import and access the Haptics module
            this.capacitorAvailable = typeof Haptics !== 'undefined' && typeof Haptics.impact === 'function';
            if (this.capacitorAvailable) {
                console.log('Capacitor Haptics available');
            } else {
                console.log('Capacitor not available, falling back to Vibration API');
            }
        } catch (error) {
            this.capacitorAvailable = false;
            console.log('Capacitor not available, falling back to Vibration API');
        }
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Get all zones
        document.querySelectorAll('.fidgit-zone').forEach(zone => {
            const zoneType = zone.dataset.zone;
            this.zones[zoneType] = zone;
        });

        // Setup event listeners for each zone type
        this.setupSpinner();
        this.setupSlider();
        this.setupClick();
        this.setupDial();
        this.setupToggle();
        this.setupRoll();

        // Prevent default touch behaviors
        document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
        
        // Request fullscreen on double-tap (less disruptive than single tap)
        let lastTap = 0;
        const handleDoubleTap = () => {
            const now = Date.now();
            if (now - lastTap < 300) {
                this.requestFullscreen();
            }
            lastTap = now;
        };
        document.addEventListener('touchend', handleDoubleTap);

        // Register service worker
        this.registerServiceWorker();

        // Start animation loop for spinner momentum
        this.animationLoop();
    }

    // Haptic feedback patterns
    async vibrate(pattern) {
        if (!this.userActivated) return; // Require user activation for vibration
        
        // Use Capacitor Haptics if available (better PWA support)
        if (this.capacitorAvailable) {
            try {
                // Map patterns to Capacitor Haptics styles
                const patternToStyleMap = {
                    [this.hapticPatterns.tap]: ImpactStyle.Light,
                    [this.hapticPatterns.tick]: ImpactStyle.Light,
                    [this.hapticPatterns.spinTick]: ImpactStyle.Light,
                    [this.hapticPatterns.dialNotch]: ImpactStyle.Light,
                    [this.hapticPatterns.roll]: ImpactStyle.Light,
                    [this.hapticPatterns.click]: ImpactStyle.Medium,
                    [this.hapticPatterns.toggle]: ImpactStyle.Medium,
                    [this.hapticPatterns.heavy]: ImpactStyle.Heavy
                };
                
                const style = patternToStyleMap[pattern] || ImpactStyle.Medium;
                await Haptics.impact({ style });
                return; // Success, no need to fall back
            } catch (error) {
                console.debug('Capacitor Haptics failed:', error.message);
                // Fall through to legacy vibration API
            }
        }
        
        // Fall back to legacy Vibration API
        if (!this.hapticSupported) return;
        
        try {
            const result = navigator.vibrate(pattern);
            if (!result) {
                // Vibration was rejected - could be due to browser permissions,
                // device limitations, or silent/DND mode
                console.debug('Vibration rejected - check browser permissions and device settings');
            }
        } catch (error) {
            // Vibration API may not be available in some contexts (e.g., insecure origins)
            console.debug('Vibration not available:', error.message);
        }
    }

    // Mark that we have user activation for haptic feedback
    // Call this method at the start of user interactions (touch/click events)
    // to enable haptic feedback for subsequent vibration calls
    markUserActivation() {
        this.userActivated = true;
    }

    // Different haptic patterns for different interactions
    hapticPatterns = {
        // Quick tap - single short pulse
        tap: [15],
        // Click - satisfying click feel
        click: [10, 30, 20],
        // Slide tick - very short pulse for slider notches
        tick: [5],
        // Toggle - two-stage feedback
        toggle: [20, 50, 30],
        // Spin tick - rapid light pulses
        spinTick: [3],
        // Dial notch - medium pulse
        dialNotch: [12],
        // Roll - continuous light vibration
        roll: [8],
        // Heavy press
        heavy: [50]
    };

    // Spinner zone - rotates with momentum
    setupSpinner() {
        const zone = this.zones.spinner;
        if (!zone) return;

        const spinner = zone.querySelector('.spinner-element');
        let lastTouch = null;
        let lastTime = null;

        const getAngle = (touch, rect) => {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            return Math.atan2(touch.clientY - centerY, touch.clientX - centerX);
        };

        const handleStart = (e) => {
            e.preventDefault();
            this.markUserActivation(); // Mark user activation
            const touch = e.touches ? e.touches[0] : e;
            const rect = spinner.getBoundingClientRect();
            lastTouch = getAngle(touch, rect);
            lastTime = Date.now();
            this.state.spinner.velocity = 0;
            zone.classList.add('active');
            this.vibrate(this.hapticPatterns.tap);
        };

        const handleMove = (e) => {
            if (lastTouch === null) return;
            e.preventDefault();
            
            const touch = e.touches ? e.touches[0] : e;
            const rect = spinner.getBoundingClientRect();
            const currentAngle = getAngle(touch, rect);
            
            let delta = currentAngle - lastTouch;
            
            // Handle angle wraparound
            if (delta > Math.PI) delta -= 2 * Math.PI;
            if (delta < -Math.PI) delta += 2 * Math.PI;
            
            const now = Date.now();
            const dt = now - lastTime;
            
            this.state.spinner.rotation += delta * (180 / Math.PI);
            this.state.spinner.velocity = (delta * (180 / Math.PI)) / (dt || 1) * 16;
            
            spinner.style.transform = `rotate(${this.state.spinner.rotation}deg)`;
            
            // Tick feedback every 30 degrees
            const oldTicks = Math.floor((this.state.spinner.rotation - delta * (180 / Math.PI)) / 30);
            const newTicks = Math.floor(this.state.spinner.rotation / 30);
            if (oldTicks !== newTicks) {
                this.vibrate(this.hapticPatterns.spinTick);
            }
            
            lastTouch = currentAngle;
            lastTime = now;
        };

        const handleEnd = () => {
            lastTouch = null;
            zone.classList.remove('active');
        };

        spinner.addEventListener('touchstart', handleStart, { passive: false });
        spinner.addEventListener('mousedown', handleStart);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('mouseup', handleEnd);
    }

    // Slider zone - slides horizontally with notches
    setupSlider() {
        const zone = this.zones.slider;
        if (!zone) return;

        const track = zone.querySelector('.slider-track');
        const knob = zone.querySelector('.slider-knob');
        let isDragging = false;

        const updateKnob = (percent) => {
            const clamped = Math.max(10, Math.min(90, percent));
            const oldNotch = Math.round(this.state.slider.position / 10);
            const newNotch = Math.round(clamped / 10);
            
            if (oldNotch !== newNotch) {
                this.vibrate(this.hapticPatterns.tick);
            }
            
            this.state.slider.position = clamped;
            knob.style.left = `${clamped}%`;
        };

        const handleStart = (e) => {
            e.preventDefault();
            this.markUserActivation(); // Mark user activation
            isDragging = true;
            zone.classList.add('active');
            this.vibrate(this.hapticPatterns.tap);
        };

        const handleMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            const touch = e.touches ? e.touches[0] : e;
            const rect = track.getBoundingClientRect();
            const percent = ((touch.clientX - rect.left) / rect.width) * 100;
            updateKnob(percent);
        };

        const handleEnd = () => {
            if (isDragging) {
                isDragging = false;
                zone.classList.remove('active');
                // Snap to nearest notch
                const snapped = Math.round(this.state.slider.position / 10) * 10;
                updateKnob(snapped);
                this.vibrate(this.hapticPatterns.click);
            }
        };

        knob.addEventListener('touchstart', handleStart, { passive: false });
        knob.addEventListener('mousedown', handleStart);
        track.addEventListener('touchstart', (e) => {
            handleStart(e);
            handleMove(e);
        }, { passive: false });
        track.addEventListener('mousedown', (e) => {
            handleStart(e);
            handleMove(e);
        });
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('mouseup', handleEnd);
    }

    // Click zone - satisfying click button
    setupClick() {
        const zone = this.zones.click;
        if (!zone) return;

        const surface = zone.querySelector('.click-surface');

        const handleDown = (e) => {
            e.preventDefault();
            this.markUserActivation(); // Mark user activation
            surface.classList.add('pressed');
            this.state.click.pressed = true;
            this.vibrate(this.hapticPatterns.click);
        };

        const handleUp = () => {
            if (this.state.click.pressed) {
                surface.classList.remove('pressed');
                this.state.click.pressed = false;
                this.vibrate(this.hapticPatterns.tap);
            }
        };

        surface.addEventListener('touchstart', handleDown, { passive: false });
        surface.addEventListener('mousedown', handleDown);
        surface.addEventListener('touchend', handleUp);
        surface.addEventListener('mouseup', handleUp);
        surface.addEventListener('mouseleave', handleUp);
    }

    // Dial zone - rotatable dial with notches
    setupDial() {
        const zone = this.zones.dial;
        if (!zone) return;

        const dial = zone.querySelector('.dial-element');
        let lastAngle = null;

        const getAngle = (touch, rect) => {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            return Math.atan2(touch.clientY - centerY, touch.clientX - centerX);
        };

        const handleStart = (e) => {
            e.preventDefault();
            this.markUserActivation(); // Mark user activation
            const touch = e.touches ? e.touches[0] : e;
            const rect = dial.getBoundingClientRect();
            lastAngle = getAngle(touch, rect);
            zone.classList.add('active');
            this.vibrate(this.hapticPatterns.tap);
        };

        const handleMove = (e) => {
            if (lastAngle === null) return;
            e.preventDefault();
            
            const touch = e.touches ? e.touches[0] : e;
            const rect = dial.getBoundingClientRect();
            const currentAngle = getAngle(touch, rect);
            
            let delta = currentAngle - lastAngle;
            if (delta > Math.PI) delta -= 2 * Math.PI;
            if (delta < -Math.PI) delta += 2 * Math.PI;
            
            const oldRotation = this.state.dial.rotation;
            this.state.dial.rotation += delta * (180 / Math.PI);
            
            dial.style.transform = `rotate(${this.state.dial.rotation}deg)`;
            
            // Notch every 15 degrees
            const oldNotch = Math.floor(oldRotation / 15);
            const newNotch = Math.floor(this.state.dial.rotation / 15);
            if (oldNotch !== newNotch) {
                this.vibrate(this.hapticPatterns.dialNotch);
            }
            
            lastAngle = currentAngle;
        };

        const handleEnd = () => {
            lastAngle = null;
            zone.classList.remove('active');
        };

        dial.addEventListener('touchstart', handleStart, { passive: false });
        dial.addEventListener('mousedown', handleStart);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('mouseup', handleEnd);
    }

    // Toggle zone - on/off switch
    setupToggle() {
        const zone = this.zones.toggle;
        if (!zone) return;

        const toggle = zone.querySelector('.toggle-switch');

        const handleToggle = (e) => {
            e.preventDefault();
            this.markUserActivation(); // Mark user activation
            this.state.toggle.on = !this.state.toggle.on;
            toggle.classList.toggle('on', this.state.toggle.on);
            this.vibrate(this.hapticPatterns.toggle);
        };

        toggle.addEventListener('touchstart', handleToggle, { passive: false });
        toggle.addEventListener('click', handleToggle);
    }

    // Roll zone - trackball-like rolling
    setupRoll() {
        const zone = this.zones.roll;
        if (!zone) return;

        const ball = zone.querySelector('.roll-ball');
        let lastX = null;
        let lastY = null;
        let totalDistance = 0;

        const handleStart = (e) => {
            e.preventDefault();
            this.markUserActivation(); // Mark user activation
            const touch = e.touches ? e.touches[0] : e;
            lastX = touch.clientX;
            lastY = touch.clientY;
            totalDistance = 0;
            zone.classList.add('active');
            this.vibrate(this.hapticPatterns.tap);
        };

        const handleMove = (e) => {
            if (lastX === null) return;
            e.preventDefault();
            
            const touch = e.touches ? e.touches[0] : e;
            const dx = touch.clientX - lastX;
            const dy = touch.clientY - lastY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            this.state.roll.x += dx;
            this.state.roll.y += dy;
            totalDistance += distance;
            
            // Apply visual rotation based on movement
            const rotateX = -this.state.roll.y * 0.5;
            const rotateY = this.state.roll.x * 0.5;
            ball.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            
            // Vibrate every 20px of movement
            if (totalDistance > 20) {
                this.vibrate(this.hapticPatterns.roll);
                totalDistance = 0;
            }
            
            lastX = touch.clientX;
            lastY = touch.clientY;
        };

        const handleEnd = () => {
            lastX = null;
            lastY = null;
            zone.classList.remove('active');
        };

        ball.addEventListener('touchstart', handleStart, { passive: false });
        ball.addEventListener('mousedown', handleStart);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('mouseup', handleEnd);
    }

    // Animation loop for spinner momentum
    animationLoop() {
        const spinner = this.zones.spinner?.querySelector('.spinner-element');
        
        const animate = () => {
            // Apply friction to spinner
            if (Math.abs(this.state.spinner.velocity) > 0.1) {
                this.state.spinner.velocity *= 0.98;
                this.state.spinner.rotation += this.state.spinner.velocity;
                
                if (spinner) {
                    spinner.style.transform = `rotate(${this.state.spinner.rotation}deg)`;
                }
                
                // Note: Removed tick feedback during momentum as it requires user activation
                // Only tick feedback during direct interaction will work in PWA context
            } else {
                this.state.spinner.velocity = 0;
            }
            
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }

    // Request fullscreen
    requestFullscreen() {
        const elem = document.documentElement;
        
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {});
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    }

    // Register service worker for PWA
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            let updateCheckInterval;
            
            navigator.serviceWorker.register('service-worker.js')
                .then((registration) => {
                    // Check for updates periodically (every 60 seconds)
                    updateCheckInterval = setInterval(() => {
                        registration.update();
                    }, 60000);

                    // Handle service worker updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (!newWorker) return;

                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New service worker is installed and ready
                                // Show update notification to user
                                this.showUpdateNotification();
                            }
                        });
                    });
                })
                .catch(() => {
                    // Service worker registration failed
                    // Clear the interval if registration fails
                    if (updateCheckInterval) {
                        clearInterval(updateCheckInterval);
                    }
                });

            // Listen for controller change (when new SW takes control)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                // Reload the page to get the latest content
                window.location.reload();
            });
        }
    }

    // Show update notification to user
    showUpdateNotification() {
        // Check if banner already exists
        if (document.getElementById('update-banner')) {
            return; // Don't create duplicate banners
        }
        
        // Create a subtle notification banner
        const banner = document.createElement('div');
        banner.id = 'update-banner';
        banner.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #4a4a4a;
                color: #fff;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 15px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 14px;
                max-width: 90%;
            ">
                <span>New version available!</span>
                <button id="update-btn" style="
                    background: #5cb85c;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 14px;
                ">Update</button>
                <button id="dismiss-btn" style="
                    background: transparent;
                    color: #ccc;
                    border: none;
                    padding: 8px 12px;
                    cursor: pointer;
                    font-size: 14px;
                ">Later</button>
            </div>
        `;
        
        document.body.appendChild(banner);

        // Handle update button click
        document.getElementById('update-btn').addEventListener('click', () => {
            // Tell the waiting service worker to skip waiting and become active
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg && reg.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
            });
        });

        // Handle dismiss button click
        document.getElementById('dismiss-btn').addEventListener('click', () => {
            banner.remove();
        });
    }
}

// Initialize the app
const fidgitApp = new FidgitApp();
