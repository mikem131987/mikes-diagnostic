# Mike's Diagnostic Hardware - Complete Setup Guide

Complete configuration guide to launch your commercial subscription-based product.

## Project Structure

```
MikeDiagnostic/
├── app/                    # Electron Desktop Application
│   └── src/
│       └── services/
│           └── LicenseManager.ts
├── backend/               # Node.js Subscription API
│   ├── src/
│   │   └── server.ts     # Main API server
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── website/              # Landing Page
    ├── index.html
    ├── styles.css
    └── script.js
```

## Part 1: Backend API Setup (Node.js + Stripe)

### Step 1: Install Dependencies
```bash
cd MikeDiagnostic/backend
npm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
PORT=3001
NODE_ENV=development
```

### Step 3: Get Stripe Keys
1. Go to https://stripe.com
2. Create free account
3. Go to Dashboard → Developers → API Keys
4. Copy Secret Key to `.env` as `STRIPE_SECRET_KEY`
5. Copy Publishable Key as `STRIPE_PUBLISHABLE_KEY`

### Step 4: Create Stripe Products
In Stripe Dashboard:

1. **Create Products**
   - Go to Products
   - Create 3 NEW products:
     - Name: "Starter" → Price: $29/month (recurring)
     - Name: "Professional" → Price: $79/month (recurring)
     - Name: "Enterprise" → Price: $199/month (recurring)

2. **Get Price IDs**
   - For each product, go to Pricing
   - Copy the Price ID (starts with `price_`)

3. **Add to .env**
   ```
   STRIPE_STARTER_PRICE=price_xxxxx
   STRIPE_PROFESSIONAL_PRICE=price_xxxxx
   STRIPE_ENTERPRISE_PRICE=price_xxxxx
   ```

### Step 5: Test API
```bash
npm run dev
```

Visit: http://localhost:3001/api/health

Should return:
```json
{
  "status": "ok",
  "service": "Mike's Diagnostic Hardware API",
  "version": "1.0.0",
  "timestamp": "2024-02-12T..."
}
```

### Step 6: Setup Stripe Webhook (Production)
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint:
   - URL: `https://your-production-domain.com/api/subscriptions/webhook`
   - Events: Select all subscription + payment events
3. Copy Signing Secret to `.env` as `STRIPE_WEBHOOK_SECRET`

---

## Part 2: Landing Page Setup

### Step 1: Configure API URL
Edit `website/script.js` line 3:
```javascript
const API_URL = 'http://localhost:3001'; // Local dev
// Change to production URL later:
// const API_URL = 'https://api.mikesdiagnostic.com';
```

### Step 2: Test Locally
```bash
# Option 1: Use Python
cd MikeDiagnostic/website
python -m http.server 8000

# Option 2: Use Node
npx http-server

# Option 3: VS Code Live Server extension
```

Visit: http://localhost:8000

### Step 3: Test Trial Sign-up
1. Click "Start Free Trial"
2. Enter email
3. Should redirect to Stripe checkout

---

## Part 3: Electron App License Integration

### Step 1: Install License Manager
Copy `LicenseManager.ts` to your Electron app:
```
app/src/services/LicenseManager.ts
```

### Step 2: Add API URL Config
In your Electron app's environment:
```typescript
process.env.API_URL = 'http://localhost:3001'; // Dev
// or
process.env.API_URL = 'https://api.mikesdiagnostic.com'; // Production
```

### Step 3: Implement License Check
In your app initialization:
```typescript
import { licenseManager } from './services/LicenseManager';

// On app startup
async function checkLicense() {
    const license = await licenseManager.validateLicense();
    
    if (!license) {
        // Show activation window
        showLicenseActivation();
    } else {
        // Load features based on tier
        loadTierFeatures(license.tier);
    }
}

// When user enters license key
async function activateKey(key: string, email: string) {
    const success = await licenseManager.activateLicense(key, email);
    if (success) {
        console.log('License activated!');
        reloadFeatures();
    }
}

// Gate features
function canUseAdvancedDiagnostics() {
    return licenseManager.isFeatureAvailable('advancedDiagnostics');
}
```

### Step 4: Update package.json
Add dependency:
```json
{
  "dependencies": {
    "axios": "^1.6.0"
  }
}
```

---

## Part 4: Deployment

### Deploy Backend

#### Option A: Heroku (easiest)
```bash
cd MikeDiagnostic/backend

# Login to Heroku
heroku login

# Create app
heroku create mikes-diagnostic-api

# Set environment variables
heroku config:set STRIPE_SECRET_KEY=sk_live_xxxxx
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Your API will be at:
# https://mikes-diagnostic-api.herokuapp.com
```

#### Option B: AWS Lambda
```bash
# Requires AWS account and serverless framework
npm install -g serverless
serverless plugin install -n serverless-http
serverless deploy
```

#### Option C: DigitalOcean/VPS
```bash
# On your VPS:
git clone <your-repo>
cd MikeDiagnostic/backend
npm install
npm run build
npm start

# Use PM2 for process management:
npm install -g pm2
pm2 start dist/server.js --name "mikes-diagnostic-api"
pm2 startup
pm2 save
```

### Deploy Landing Page

#### Option A: GitHub Pages (Free)
```bash
cd MikeDiagnostic/website
echo "const API_URL = 'https://your-api-domain.com';" > api-config.js
# Push to GitHub repo
git push origin main
# Enable Pages in repo settings
```

Access at: `https://yourusername.github.io/mikes-diagnostic`

#### Option B: Netlify (Free)
```bash
npm install -g netlify-cli
cd MikeDiagnostic/website
netlify deploy
```

#### Option C: Vercel (Free)
```bash
npm install -g vercel
cd MikeDiagnostic/website
vercel
```

---

## Part 5: Update URLs in Production

Once deployed, update these files:

### 1. website/script.js
```javascript
const API_URL = 'https://your-api-domain.com';
```

### 2. Electron app env
```typescript
process.env.API_URL = 'https://your-api-domain.com';
```

### 3. Stripe Webhook URL
```
https://your-api-domain.com/api/subscriptions/webhook
```

### 4. Stripe Redirect URLs
```
Success: https://your-website.com/success
Cancel: https://your-website.com/
```

---

## Part 6: Test Full Flow

### Complete Workflow Test
1. **User visits landing page**
   - https://your-website.com

2. **User clicks "Start Free Trial"**
   - Enters email
   - Redirected to Stripe checkout

3. **User enters test card**
   - Number: `4242 4242 4242 4242`
   - Expiry: any future date
   - CVC: any 3 digits
   - Click Subscribe

4. **Webhook fires**
   - Backend creates license key
   - License saved in database

5. **User receives email**
   - Contains license key: `MK-XXXX-XXXX-XXXX-XXXX`

6. **User enters license in app**
   - App validates with backend
   - Features unlocked based on tier

---

## Part 7: Monitoring & Support

### API Monitoring
- Setup error logging: Sentry, LogRocket, or Rollbar
- Monitor Stripe webhooks in dashboard
- Set up uptime monitoring: UptimeRobot

### Database Backups
```bash
# Weekly backups
pg_dump mikes_diagnostic > backup-$(date +%Y%m%d).sql
```

### Scaling
- Add Redis caching for license validation
- Use CDN for landing page
- Load balance backend API with multiple instances

---

## Part 8: Security Checklist

- [ ] Use HTTPS for all URLs
- [ ] Enable Stripe's advanced fraud tools
- [ ] Implement rate limiting on API
- [ ] Add CORS restrictions
- [ ] Encrypt license keys in app storage
- [ ] Implement JWT token validation
- [ ] Add API authentication
- [ ] Monitor for suspicious activity
- [ ] Regular security audits
- [ ] PCI compliance checklist

---

## Part 9: Marketing & Launch

### Pre-Launch
1. Create social media accounts
2. Write launch announcement
3. Prepare email to mechanics
4. Create YouTube demo video

### Launch Day
1. Post on r/Justrolledintotheshop
2. Share in mechanic Facebook groups
3. Email initial users
4. Announce on social media

### Post-Launch
1. Collect testimonials
2. Monitor support emails
3. Fix bugs quickly
4. Plan feature updates

---

## Quick Reference Commands

### Development
```bash
# Backend
cd backend && npm run dev

# Website
cd website && python -m http.server 8000

# Test API
curl http://localhost:3001/api/health
```

### Deployment
```bash
# Build backend
npm run build

# Deploy to Heroku
git push heroku main

# Deploy website
netlify deploy
```

### Database
```bash
# Backup
pg_dump mikes_diagnostic > backup.sql

# Restore
psql -d mikes_diagnostic < backup.sql
```

---

## Support & Help

**Common Issues:**

1. **Stripe connection fails**
   - Verify keys in .env
   - Check Stripe account status
   - Ensure webhook URL is correct

2. **License validation fails**
   - Check API is running
   - Verify backend URL in app
   - Check webhook execution in Stripe dashboard

3. **Cannot checkout**
   - Clear browser cache
   - Test with incognito window
   - Verify Stripe test mode enabled
   - Check firewall/proxy settings

---

## Next Steps

1. ✅ Set up Stripe account
2. ✅ Create pricing in Stripe
3. ✅ Deploy backend API
4. ✅ Deploy landing page
5. ✅ Integrate license validation in app
6. ✅ Test full checkout flow
7. ✅ Beta test with 10-20 users
8. ✅ Launch to public

---

## Timeline to Revenue

- **Week 1-2:** Setup & deployment
- **Week 3-4:** Beta testing
- **Week 5-6:** Bug fixes & refinements
- **Week 7-8:** Launch & marketing
- **Month 2+:** Iterate based on feedback

**Estimated time to first sale:** 4-6 weeks
**Estimated revenue potential:** $5K-20K in first month at scale

---

**Good luck with Mike's Diagnostic Hardware! 🚀**
