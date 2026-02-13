// Mike's Diagnostic Hardware - Landing Page Script

const API_URL = 'https://mikes-diagnostic-backend-production.up.railway.app'; // Production API

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// CTA Button Handlers
const trialButtons = document.querySelectorAll('.btn-primary');
trialButtons.forEach(btn => {
    if (btn.textContent.includes('Start Free Trial') || btn.textContent.includes('Free Trial')) {
        btn.addEventListener('click', handleTrialClick);
    }
});

async function handleTrialClick(e) {
    e.preventDefault();

    // Show modal or redirect to checkout
    showTrialModal();
}

function showTrialModal() {
    const email = prompt('Enter your email to start your free trial:');

    if (!email || !isValidEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }

    // Show tier selection
    const tier = getSelectedTier();
    if (!tier) {
        alert('Please select a pricing tier first');
        return;
    }

    // Redirect to checkout or show loading
    createCheckoutSession(email, tier);
}

function getSelectedTier() {
    // This would be populated based on which button was clicked
    // For now, redirect to pricing
    return prompt('Enter tier (starter, professional, enterprise):');
}

async function createCheckoutSession(email, tier) {
    try {
        const response = await fetch(`${API_URL}/api/subscriptions/create-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                tier,
                returnUrl: window.location.origin,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to create session');
        }

        const data = await response.json();

        // Redirect to Stripe checkout
        if (data.url) {
            window.location.href = data.url;
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Failed to start trial. Please try again.');
    }
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Load pricing data from API
async function loadPricingData() {
    try {
        const response = await fetch(`${API_URL}/api/tiers`);
        const data = await response.json();
        console.log('Pricing tiers loaded:', data);
        // You could use this to dynamically update pricing cards
    } catch (error) {
        console.error('Failed to load pricing:', error);
    }
}

// Validate license key form (if added)
async function validateLicense() {
    const licenseKey = prompt('Enter your license key:');

    if (!licenseKey) return;

    try {
        const response = await fetch(`${API_URL}/api/licenses/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ licenseKey }),
        });

        const data = await response.json();

        if (data.valid) {
            alert(`✓ License valid!\nTier: ${data.tier}\nStatus: ${data.status}`);
        } else {
            alert('✗ License not found or invalid');
        }
    } catch (error) {
        console.error('Validation error:', error);
        alert('Failed to validate license');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Mike\'s Diagnostic Hardware - Landing Page Loaded');

    // Load pricing data
    loadPricingData();

    // Add specific button handlers for each tier
    setupTierButtons();
});

function setupTierButtons() {
    const buttons = document.querySelectorAll('.pricing-card .btn-primary');

    buttons.forEach((btn, index) => {
        const tiers = ['starter', 'professional', 'enterprise'];
        const tier = tiers[Math.floor(index / 2)]; // Approximate tier

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            startTrialForTier(tier);
        });
    });
}

function startTrialForTier(tier) {
    const email = prompt('Enter your email to start your free trial:');

    if (!email || !isValidEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }

    createCheckoutSession(email, tier);
}

// Add analytics tracking
function trackEvent(eventName, data = {}) {
    console.log(`Event: ${eventName}`, data);

    // You can integrate with analytics services here
    // Example: Google Analytics, Mixpanel, etc.
}

// Track when users view pricing
const pricingSection = document.getElementById('pricing');
if (pricingSection) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                trackEvent('view_pricing_section');
                observer.unobserve(entry.target);
            }
        });
    });
    observer.observe(pricingSection);
}

// Feature suggestions based on user tier
function suggestFeatures(tier) {
    const features = {
        starter: [
            'Good for starting out',
            'Basic diagnostics for common issues',
            'Perfect for solo mechanics'
        ],
        professional: [
            'Most popular choice',
            'Real-time monitoring',
            'Great for small shops'
        ],
        enterprise: [
            'For larger operations',
            'API access',
            'Dedicated support'
        ]
    };

    return features[tier] || [];
}

console.log('Script loaded successfully');
