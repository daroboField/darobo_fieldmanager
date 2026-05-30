import { useState, useEffect, useRef } from "react";

// ─── Firebase Initializer ─────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { collection, serverTimestamp } from "firebase/firestore";
import { doc, addDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// ─── Survey data ──────────────────────────────────────────────────────────────
const SURVEYS = {
  chama: {
    id: "realestate",
    title: "Real Estate — Landlords",
    subtitle: "H1 & H2 Hypothesis Validation",
    icon: "🏘",
    color: "#2563EB",
    sections: [
      {
        id: "screener",
        title: "Screener & Context",
        part: "Part A",
        questions: [
          {
            id: "Q1",
            type: "single",
            required: true,
            text: "Do you own or manage rental property in Kenya?",
            swahili: "Je, unamiliki au kusimamia nyumba za kupanga Kenya?",
            options: [
              "Yes, I own and manage directly",
              "Yes, I own but use an agent",
              "I manage property on behalf of an owner",
              "No → End survey",
            ],
            endSurveyOn: ["No → End survey"],
          },
          {
            id: "Q2",
            type: "single",
            required: true,
            text: "How many rental units do you currently have tenants in?",
            swahili:
              "Una vyumba au nyumba ngapi za kupanga zenye wapangaji sasa hivi?",
            options: ["1 unit", "2–5 units", "6–10 units", "More than 10"],
          },
          {
            id: "Q3",
            type: "single",
            required: true,
            text: "What is the typical monthly rent for your units?",
            swahili:
              "Kodi ya kawaida ya kila mwezi kwa nyumba zako ni kiasi gani?",
            options: [
              "Below KSh 5,000",
              "KSh 5,000–15,000",
              "KSh 15,001–40,000",
              "Above KSh 40,000",
            ],
          },
          {
            id: "Q4",
            type: "multi",
            required: false,
            text: "When a new tenant moves in, what documents do you use?",
            swahili: "Mpangaji mpya anapoingia, unatumia nyaraka gani?",
            options: [
              "Handwritten agreement",
              "Printed tenancy agreement form",
              "Lawyer-drafted lease",
              "WhatsApp message confirming terms",
              "Verbal agreement only",
              "Nothing formal",
              "Other",
            ],
          },
        ],
      },
    ],
  },

  realestate: {
    id: "realestate",
    title: "Real Estate — Landlords",
    subtitle: "H1 & H2 Hypothesis Validation",
    icon: "🏘",
    color: "#2563EB",
    sections: [
      {
        id: "screener",
        title: "Screener & Context",
        part: "Part A",
        questions: [
          {
            id: "Q1",
            type: "single",
            required: true,
            text: "Do you own or manage rental property in Kenya?",
            swahili: "Je, unamiliki au kusimamia nyumba za kupanga Kenya?",
            options: [
              "Yes, I own and manage directly",
              "Yes, I own but use an agent",
              "I manage property on behalf of an owner",
              "No → End survey",
            ],
            endSurveyOn: ["No → End survey"],
          },
          {
            id: "Q2",
            type: "single",
            required: true,
            text: "How many rental units do you currently have tenants in?",
            swahili:
              "Una vyumba au nyumba ngapi za kupanga zenye wapangaji sasa hivi?",
            options: ["1 unit", "2–5 units", "6–10 units", "More than 10"],
          },
          {
            id: "Q3",
            type: "single",
            required: true,
            text: "What is the typical monthly rent for your units?",
            swahili:
              "Kodi ya kawaida ya kila mwezi kwa nyumba zako ni kiasi gani?",
            options: [
              "Below KSh 5,000",
              "KSh 5,000–15,000",
              "KSh 15,001–40,000",
              "Above KSh 40,000",
            ],
          },
          {
            id: "Q4",
            type: "multi",
            required: false,
            text: "When a new tenant moves in, what documents do you use?",
            swahili: "Mpangaji mpya anapoingia, unatumia nyaraka gani?",
            options: [
              "Handwritten agreement",
              "Printed tenancy agreement form",
              "Lawyer-drafted lease",
              "WhatsApp message confirming terms",
              "Verbal agreement only",
              "Nothing formal",
              "Other",
            ],
          },
        ],
      },
    ],
  },

  tenant: {
    id: "tenant",
    title: "Real Estate — Tenants",
    subtitle: "Tenant Experience Validation",
    icon: "🔑",
    color: "#0891B2",
    sections: [
      {
        id: "screener",
        title: "Screener & Context",
        part: "Part A",
        questions: [
          {
            id: "Q1",
            type: "single",
            required: true,
            text: "Do you currently rent a property in Kenya?",
            swahili: "Je, unakodisha nyumba Kenya kwa sasa?",
            options: [
              "Yes, I rent privately",
              "Yes, through an agent",
              "No → End survey",
            ],
            endSurveyOn: ["No → End survey"],
          },
          {
            id: "Q2",
            type: "single",
            required: true,
            text: "How much do you pay in monthly rent?",
            swahili: "Unalipa kodi ngapi kila mwezi?",
            options: [
              "Below KSh 5,000",
              "KSh 5,000–15,000",
              "KSh 15,001–40,000",
              "Above KSh 40,000",
            ],
          },
          {
            id: "Q3",
            type: "multi",
            required: false,
            text: "What challenges have you faced with your landlord?",
            swahili: "Umekutana na matatizo gani na mwenye nyumba?",
            options: [
              "Late repairs",
              "Unfair rent increases",
              "No written agreement",
              "Deposit disputes",
              "Eviction threats",
              "None",
              "Other",
            ],
          },
        ],
      },
    ],
  },
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
 @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap");

*,
*::before,
*::after {
  margin: 0;
  padding: 0;

  outline: none;
  list-style: none;
  box-sizing: border-box;
}

:root {
  /* Darobo Brand */
  --primary: #2167ff;
  --primary-hover: #2e65ff;
  --primary-dim: rgba(37, 99, 235, 0.08);
  --primary-mid: rgba(37, 99, 235, 0.15);
  --primary-glow: rgba(37, 99, 235, 0.25);
  --accent: #60a5fa;
  --accent-dim: rgba(96, 165, 250, 0.12);

  /* Surface */
  --bg: #eeeeee;
  --bg2: #fafafa;
  --surface: #ffffff;
  --surface2: #f7f2f2d9;
  --surface3: #f8fafc;
  --glass: rgba(255, 255, 255, 0.72);
  --glass-border: rgba(255, 255, 255, 0.9);

  /* Borders */
  --border: #e2e8f0;
  --border2: #bfdbfe;
  --border-strong: #cbd5e1;

  /* Status */
  --green: #059669;
  --green-dim: rgba(5, 150, 105, 0.09);
  --amber: #d97706;
  --amber-dim: rgba(217, 119, 6, 0.09);
  --red: #dc2626;
  --red-dim: rgba(220, 38, 38, 0.08);

  /* Text */
  --text: #0f172a;
  --text2: #475569;
  --text3: #94a3b8;

  /* Shape */
  --r: 12px;
  --r-sm: 8px;
  --r-lg: 14px;
  --r-xl: 12px;
  --r-2xl: 12px;

  /* Motion */
  --t: 160ms ease;
  --t-slow: 280ms ease;

  /* Font */
  --font: "Plus Jakarta Sans", sans-serif;
  --mono: "JetBrains Mono", monospace;
}

html,
body,
#root {
  height: 100%;
  font-size: 20px;
  font-family: var(--font);
}

.app {
  min-height: 100dvh;
  display: grid;
  background: #e9e9e9;
}

/* ── Status Bar ── */
.status-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 16px;
  background: rgb(243, 243, 243);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: rgba(0, 0, 0, 0.75);
  text-transform: uppercase;
  border-bottom: 1px soid #000000;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4ade80;
  animation: pulse-dot 2s ease-in-out infinite;
}
.status-dot.offline {
  background: #fcd34d;
  animation: none;
}
.status-dot.saving {
  background: #60a5fa;
  animation: pulse-dot 0.8s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.85);
  }
}
.status-spacer {
  flex: 1;
}
.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.12);
}

/* ── Login ── */

.login-screen {
  min-height: 100dvh;
  height: 100%;
  padding: 24px;
  position: relative;
  overflow: hidden;
}
.login-screen::before {
  content: "";
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff9ec 0%, transparent 70%);
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
}
.login-screen::after {
  content: "";
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(96, 165, 250, 0.1) 0%,
    transparent 70%
  );
  bottom: -100px;
  right: -50px;
  pointer-events: none;
}
.login-card {
  width: 100%;
  height: 100dvh;
  min-width: 260px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 0;
  box-shadow:
    0 20px 60px rgba(37, 99, 235, 0.12),
    0 4px 16px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  position: relative;
  z-index: 1;
}
.login-header {
  margin: 0 auto;
  padding: 32px 32px 28px;
  background: linear-gradient(135deg, #225bb1 0%, #2563eb 50%, #3b82f6 100%);
  position: relative;
  overflow: hidden;
}
.login-header::before {
  content: "";
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.062);
  top: -80px;
  right: -60px;
}
.login-header::after {
  content: "";
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.068);
  bottom: -40px;
  left: 20px;
}
.login-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

.logo-mark {
  width: 42px;
  height: 42px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -1px;
}
.logo-text {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #ffffff;
}
.logo-tagline {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-weight: 500;
}
.login-signin-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  position: relative;
  z-index: 1;
  margin-top: 4px;
  font-weight: 500;
}
.login-body {
  display: grid;
  margin: 0 auto;
  padding: 28px;
  max-width: 400px;
}
.field-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text2);
  letter-spacing: 0.8px;
  margin-bottom: 6px;
  display: flex;
}
.field-group {
  margin-bottom: 18px;
}

.select-field,
.input-field {
  width: 100%;
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text);
  font-family: var(--font);
  font-size: 15px;
  padding: 12px 14px;
  outline: none;
  transition:
    border-color var(--t),
    box-shadow var(--t),
    background var(--t);
  appearance: none;
  min-height: 48px;
}
.select-field:focus,
.input-field:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-dim);
  background: var(--surface);
}

.pin-wrapper {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}
.pin-dot {
  flex: 1;
  height: 56px;
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  transition: all var(--t);
  color: var(--primary);
}
.pin-dot.empty {
  color: var(--text3);
  font-size: 12px;
}
.pin-dot.active {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-dim);
  background: var(--surface);
}
.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 4px;
}
.num-btn {
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text);
  font-family: var(--font);
  font-size: 19px;
  font-weight: 600;
  padding: 14px 10px;
  cursor: pointer;
  transition: all var(--t);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 54px;
  -webkit-tap-highlight-color: transparent;
}
.num-btn:hover {
  background: var(--primary-dim);
  border-color: var(--border2);
  color: var(--primary);
}
.num-btn:active {
  transform: scale(0.94);
  background: var(--primary-mid);
}
.num-btn.del {
  font-size: 15px;
  color: var(--text2);
}

.btn-primary {
  width: 100%;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-family: var(--font);
  font-size: 16px;
  font-weight: 700;
  padding: 15px;
  cursor: pointer;
  transition: all var(--t);
  margin-top: 36px;
  letter-spacing: 0.2px;
  min-height: 52px;
  -webkit-tap-highlight-color: transparent;
}
.btn-primary:hover {
  background: var(--primary-hover);
  box-shadow: 0 6px 20px var(--primary-glow);
  transform: translateY(-1px);
}
.btn-primary:active {
  transform: scale(0.98) translateY(0);
  box-shadow: none;
}
.btn-primary:disabled {
  opacity: 1;
  color: #2167ff;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  border: 1px solid #2e8fff;
  background: #60a5fa10;
}

.error-msg {
  background: var(--red-dim);
  border: 1.5px solid rgba(220, 38, 38, 0.2);
  border-radius: var(--r-sm);
  color: var(--red);
  font-size: 13px;
  padding: 10px 14px;
  margin-top: 12px;
  text-align: center;
  font-weight: 500;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1.5px solid var(--border);
  background: var(--surface);
  position: sticky;
  top: 0;
  z-index: 20;
  box-shadow: 0 2px 16px rgba(37, 99, 235, 0.07);
}
.topbar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo-mark-sm {
  width: 34px;
  height: 34px;
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  box-shadow: 0 3px 10px rgba(37, 99, 235, 0.3);
}
.topbar-logo-text {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
}
.topbar-user {
  display: flex;
  align-items: center;
  gap: 10px;
}
.avatar {
  width: 36px;
  height: 36px;
  background: var(--primary-dim);
  border: 1.5px solid var(--border2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--primary);
  flex-shrink: 0;
}
.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.user-id {
  font-size: 11px;
  color: var(--text3);
}
.logout-btn {
  background: none;
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text2);
  font-family: var(--font);
  font-size: 12px;
  font-weight: 600;
  padding: 7px 14px;
  cursor: pointer;
  transition: all var(--t);
  min-height: 34px;
}
.logout-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-dim);
}

.home-screen {
  flex: 1;
  padding: 0 20px 32px;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}
.home-content {
  padding: 24px 0;
}

.home-greeting {
  margin-bottom: 28px;
  padding: 20px 24px;
  /*background: linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #60a5fa 100%);*/
  border-radius: var(--r-xl);
  color: #888888;
  position: relative;
  overflow: hidden;
  background: #ffffff;
}
.home-greeting::before {
  content: "";
  position: absolute;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: #cecece38;
  top: -60px;
  right: -40px;
}
.home-greeting-label {
  font-size: 11px;
  color: #a7a7a7;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  font-weight: 600;
  margin-bottom: 4px;
}
.home-greeting-name {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.4px;
  position: relative;
  z-index: 1;
}
.home-greeting-sub {
  font-size: 13px;
  color: rgba(141, 141, 141, 0.7);
  margin-top: 2px;
  position: relative;
  z-index: 1;
}
.home-stats-row {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  position: relative;
  z-index: 1;
}
.home-stat {
  background: rgba(168, 168, 168, 0.089);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(112, 112, 112, 0.2);
  border-radius: 6px;
  padding: 5px 14px;
  text-align: center;
}
.home-stat-val {
  font-size: 20px;
  font-weight: 800;
}
.home-stat-lbl {
  font-size: 9px;
  color: #494949a6;

  letter-spacing: .8px;
  font-weight: 600;
}

.section-heading {
  font-size: 12px;
  font-weight: 700;
   color: #8c9297;
  text-transform: uppercase;
  letter-spacing: 1.4px;
  margin-bottom: 14px;
}
.survey-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 520px) {
  .survey-grid {
    grid-template-columns: 1fr;
  }
}

.survey-card {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--r-xl);
  padding: 22px;
  cursor: pointer;
  transition: all var(--t-slow);
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.survey-card::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  opacity: 0;
  transition: opacity var(--t);
}
.survey-card:hover {
  border-color: var(--border2);
  box-shadow: 0 8px 30px rgba(37, 99, 235, 0.1);
  transform: translateY(-3px);
}
.survey-card:hover::after {
  opacity: 1;
}
.survey-icon {
  font-size: 28px;
  margin-bottom: 15px;
  display: inline-block;
  filter: drop-shadow(0 2px 6px rgba(37, 99, 235, 0.2));
}
.survey-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
  letter-spacing: -0.2px;
}
.survey-sub {
  font-size: 12px;
  color: var(--text2);
  margin-bottom: 14px;
  line-height: 1.5;
}
.survey-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.meta-tag {
  font-size: 10px;
  font-weight: 600;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 3px 9px;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.start-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.start-btn {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-dim);
  border: 1.5px solid rgba(37, 99, 235, 0.2);
  border-radius: var(--r-sm);
  padding: 8px 14px;
  cursor: pointer;
  transition: all var(--t);
  min-height: 36px;
}
.start-btn:hover {
  background: var(--primary-mid);
  border-color: var(--primary);
}
.q-count {
  font-size: 11px;
  color: var(--text3);
  font-weight: 500;
}

.recent-section {
  margin-top: 28px;
}
.empty-state {
  background: var(--surface);
  border: 1.5px dashed var(--border);
  border-radius: var(--r-lg);
  padding: 32px;
  text-align: center;
  color: var(--text3);
  font-size: 14px;
  line-height: 1.7;
}
.empty-state-icon {
  font-size: 36px;
  margin-bottom: 10px;
}

.interview-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
   background: var(--bg);
}
.interview-header {
  padding: 14px 20px 12px;
  border-bottom: 1.5px solid var(--border);
  background: var(--surface);
  position: sticky;
  top: 0;
  z-index: 20;
  box-shadow: 0 2px 16px rgba(37, 99, 235, 0.07);
}
.interview-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.back-btn {
  width: 40px;
  height: 40px;
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 17px;
  color: var(--text2);
  transition: all var(--t);
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
.back-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-dim);
}

.interview-survey-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.2px;
}
.interview-section-name {
  font-size: 12px;
  color: var(--text2);
  margin-top: 1px;
}
.interview-header-right {
  margin-left: auto;
  text-align: right;
}
.q-progress {
  font-size: 12px;
  color: var(--text2);
  font-weight: 600;
  font-family: var(--mono);
  background: var(--bg2);
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid var(--border);
}
.progress-bar-outer {
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}
.progress-bar-inner {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: 2px;
  transition: width 400ms ease;
}

/* Section nav pills */
.section-nav {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 12px 20px 0;
  background: var(--surface);
  scrollbar-width: none;
  border-bottom: 1.5px solid var(--border);
}
.section-nav::-webkit-scrollbar {
  display: none;
}
.section-pill {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  color: var(--text3);
  background: var(--bg);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: default;
  transition: all var(--t);
  white-space: nowrap;
}
.section-pill.active {
  background: var(--primary-dim);
  border-color: var(--primary);
  color: var(--primary);
}
.section-pill.done {
  background: var(--green-dim);
  border-color: rgba(5, 150, 105, 0.25);
  color: var(--green);
}

.interview-body {
  flex: 1;
  padding: 28px 20px;
  overflow-y: auto;
  background: var(--bg);
}

/* GPS indicator */
.gps-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  margin-bottom: 16px;
}
.gps-badge.acquiring {
  background: var(--amber-dim);
  color: var(--amber);
  border: 1px solid rgba(217, 119, 6, 0.2);
}
.gps-badge.acquired {
  background: var(--green-dim);
  color: var(--green);
  border: 1px solid rgba(5, 150, 105, 0.2);
}
.gps-badge.failed {
  background: var(--red-dim);
  color: var(--red);
  border: 1px solid rgba(220, 38, 38, 0.2);
}

/* Respondent card */
.respondent-card {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--r-xl);
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(37, 99, 235, 0.05);
}
.respondent-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}
.respondent-card-icon {
  width: 36px;
  height: 36px;
  background: var(--primary-dim);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.respondent-card-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text2);
}
.respondent-card-sub {
  font-size: 11px;
  color: var(--text3);
  margin-top: 1px;
}
.respondent-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.respondent-grid .full-width {
  grid-column: 1 / -1;
}
@media (max-width: 420px) {
  .respondent-grid {
    grid-template-columns: 1fr;
  }
}

.respondent-input {
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text);
  font-family: var(--font);
  font-size: 15px;
  padding: 11px 13px;
  outline: none;
  width: 100%;
  min-height: 48px;
  transition:
    border-color var(--t),
    box-shadow var(--t);
}
.respondent-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-dim);
  background: var(--surface);
}
.respondent-input::placeholder {
  color: var(--text3);
}

/* Question body */
.q-header {
  margin-bottom: 24px;
}
.q-number {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--text3);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--mono);
}
.core-badge {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--amber-dim);
  color: var(--amber);
  border: 1px solid rgba(217, 119, 6, 0.25);
  letter-spacing: 0.5px;
}
.q-text {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.45;
  margin-bottom: 8px;
  color: var(--text);
  letter-spacing: -0.3px;
}
.q-swahili {
  font-size: 14px;
  color: var(--text2);
  font-style: italic;
  line-height: 1.6;
  background: var(--bg2);
  padding: 8px 12px;
  border-radius: var(--r-sm);
  border-left: 3px solid var(--accent);
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.multi-hint {
  font-size: 12px;
  color: var(--text3);
  margin-bottom: 10px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}
.option-btn {
  width: 100%;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--r-lg);
  color: var(--text);
  font-family: var(--font);
  font-size: 15px;
  font-weight: 500;
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
  transition: all var(--t);
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  -webkit-tap-highlight-color: transparent;
  line-height: 1.4;
}
.option-btn:hover {
  background: var(--primary-dim);
  border-color: var(--border2);
}
.option-btn.selected {
  background: var(--primary-dim);
  border-color: var(--primary);
  color: var(--text);
}
.option-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--border-strong);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: transparent;
  transition: all var(--t);
  background: var(--bg);
}
.option-btn.selected .option-check {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  box-shadow: 0 2px 8px var(--primary-glow);
}
.option-check-sq {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid var(--border-strong);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: transparent;
  transition: all var(--t);
  background: var(--bg);
}
.option-btn.selected .option-check-sq {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.scale-wrapper {
  margin-top: 8px;
}
.scale-labels-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.scale-label-txt {
  font-size: 11px;
  color: var(--text3);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.scale-btns {
  display: flex;
  gap: 6px;
}
.scale-btn {
  flex: 1;
  height: 64px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text);
  font-family: var(--font);
  font-size: 19px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--t);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 64px;
  -webkit-tap-highlight-color: transparent;
}
.scale-btn .scale-sub {
  font-size: 8px;
  font-weight: 600;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.scale-btn:hover {
  border-color: var(--primary);
  background: var(--primary-dim);
  color: var(--primary);
}
.scale-btn.selected {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  box-shadow: 0 4px 14px var(--primary-glow);
}
.scale-btn.selected .scale-sub {
  color: rgba(255, 255, 255, 0.65);
}

.open-textarea {
  width: 100%;
  min-height: 130px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--r-lg);
  color: var(--text);
  font-family: var(--font);
  font-size: 15px;
  padding: 16px;
  outline: none;
  resize: vertical;
  transition:
    border-color var(--t),
    box-shadow var(--t);
  line-height: 1.65;
}
.open-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-dim);
}
.open-textarea::placeholder {
  color: var(--text3);
}

.notes-area {
  margin-top: 22px;
  padding: 18px;
  border-radius: var(--r-lg);
  background: linear-gradient(
    135deg,
    rgba(96, 165, 250, 0.05),
    rgba(37, 99, 235, 0.04)
  );
  border: 1.5px solid rgba(96, 165, 250, 0.2);
}
.notes-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text2);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.notes-input {
  width: 100%;
  min-height: 72px;
  background: rgba(255, 255, 255, 0.7);
  border: 1.5px solid rgba(96, 165, 250, 0.25);
  border-radius: var(--r-sm);
  color: var(--text2);
  font-family: var(--font);
  font-size: 14px;
  padding: 11px 13px;
  outline: none;
  resize: none;
  transition: border-color var(--t);
  line-height: 1.5;
}
.notes-input:focus {
  border-color: var(--primary);
}
.notes-input::placeholder {
  color: var(--text3);
}

/* Autosave indicator */
.autosave-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text3);
  font-weight: 500;
  margin-top: 10px;
  justify-content: flex-end;
}
.autosave-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--green);
  animation: pulse-dot 2s ease-in-out infinite;
}

/* Footer */
.interview-footer {
  padding: 14px 20px;
  border-top: 1.5px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 -4px 20px rgba(37, 99, 235, 0.06);
}
.nav-btn {
  height: 48px;
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text);
  font-family: var(--font);
  font-size: 14px;
  font-weight: 600;
  padding: 0 20px;
  cursor: pointer;
  transition: all var(--t);
  display: flex;
  align-items: center;
  gap: 6px;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}
.nav-btn:hover {
  border-color: var(--border2);
  background: var(--bg2);
}
.nav-btn:active {
  transform: scale(0.97);
}
.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none;
}
.nav-btn-next {
  flex: 1;
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  font-weight: 700;
  justify-content: center;
  font-size: 15px;
  box-shadow: 0 4px 14px var(--primary-glow);
}
.nav-btn-next:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
  box-shadow: 0 6px 20px var(--primary-glow);
}
.nav-btn-next:disabled {
  background: var(--primary);
  opacity: 0.4;
  box-shadow: none;
}
.nav-btn-submit {
  flex: 1;
  background: var(--green);
  border-color: var(--green);
  color: #fff;
  font-weight: 700;
  justify-content: center;
  font-size: 15px;
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
}
.nav-btn-submit:hover {
  background: #047857;
  border-color: #047857;
}

/* Validation badge */
.validation-summary {
  background: var(--red-dim);
  border: 1.5px solid rgba(220, 38, 38, 0.2);
  border-radius: var(--r-sm);
  padding: 10px 14px;
  margin: 0 20px 12px;
  font-size: 13px;
  color: var(--red);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* End screens */
.end-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  background: var(--bg);
}
.end-icon-wrap {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44px;
  margin-bottom: 24px;
}
.end-icon-wrap.success {
  background: var(--green-dim);
  border: 2px solid rgba(5, 150, 105, 0.2);
  box-shadow: 0 8px 30px rgba(5, 150, 105, 0.15);
}
.end-icon-wrap.ended {
  background: var(--amber-dim);
  border: 2px solid rgba(217, 119, 6, 0.2);
}
.end-title {
  font-size: 26px;
  font-weight: 800;
  margin-bottom: 10px;
  color: var(--text);
  letter-spacing: -0.4px;
}
.end-sub {
  font-size: 15px;
  color: var(--text2);
  max-width: 340px;
  margin: 0 auto 32px;
  line-height: 1.7;
}

/* Completion dashboard card */
.completion-dashboard {
  width: 100%;
  max-width: 340px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--r-xl);
  padding: 20px;
  margin-bottom: 20px;
  text-align: left;
}
.completion-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.completion-row:last-child {
  border-bottom: none;
}
.completion-row-label {
  color: var(--text3);
  font-weight: 500;
}
.completion-row-val {
  color: var(--text);
  font-weight: 600;
  font-family: var(--mono);
  font-size: 12px;
}

.end-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 320px;
}
.btn-secondary {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text);
  font-family: var(--font);
  font-size: 14px;
  font-weight: 600;
  padding: 13px 20px;
  cursor: pointer;
  transition: all var(--t);
  min-height: 48px;
  -webkit-tap-highlight-color: transparent;
}
.btn-secondary:hover {
  border-color: var(--border2);
  background: var(--bg2);
}

/* Toast */
.toast {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--r-lg);
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 12px 40px rgba(37, 99, 235, 0.15);
  z-index: 100;
  animation: slideUp 0.25s ease;
  white-space: nowrap;
  color: var(--text);
}
.toast.success {
  border-color: rgba(5, 150, 105, 0.35);
  color: var(--green);
}
.toast.error {
  border-color: rgba(220, 38, 38, 0.3);
  color: var(--red);
}
@keyframes slideUp {
  from {
    transform: translateX(-50%) translateY(20px);
    opacity: 0;
  }
}

`;

// ─── Preloaded interviewer credentials ────────────────────────────────────────
const INTERVIEWERS = [
  { id: "INT001", name: "Loyce Dulo", location: "Mombasa", pin: "1234" },
  { id: "INT002", name: "Ronald Otieno", location: "Nairobi", pin: "1234" },
  { id: "INT003", name: "Lucy Wafula", location: "Mombasa", pin: "1234" },
  { id: "INT004", name: "Maxwel Mwania", location: "Nairobi", pin: "1234" },
  { id: "INT005", name: "Juda Mohamed", location: "Mombasa", pin: "1234" },
  { id: "INT006", name: "Michael Kaoto", location: "Mombasa", pin: "1234" },
];

// ─── Utilities ────────────────────────────────────────────────────────────────
function generateSessionId() {
  return `resp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function flattenQuestions(survey) {
  return survey.sections.flatMap((s) => s.questions);
}
function formatCoords(gps) {
  if (!gps) return "—";
  return `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)} ±${Math.round(gps.accuracy)}m`;
}

// ─── Offline queue (localStorage) ────────────────────────────────────────────
function saveToOfflineQueue(data) {
  try {
    const queue = JSON.parse(
      localStorage.getItem("darobo_offline_queue") || "[]",
    );
    queue.push({ ...data, _queuedAt: new Date().toISOString() });
    localStorage.setItem("darobo_offline_queue", JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}
function getOfflineQueueSize() {
  try {
    return JSON.parse(localStorage.getItem("darobo_offline_queue") || "[]")
      .length;
  } catch {
    return 0;
  }
}

// ─── Status bar ───────────────────────────────────────────────────────────────
function StatusBar({ saving, gpsStatus, offlineCount }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [battery, setBattery] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const tick = setInterval(() => setTime(new Date()), 30000);
    if (navigator.getBattery) {
      navigator
        .getBattery()
        .then((b) => {
          setBattery(Math.round(b.level * 100));
          b.addEventListener("levelchange", () =>
            setBattery(Math.round(b.level * 100)),
          );
        })
        .catch(() => {});
    }
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(tick);
    };
  }, []);

  const dotClass = saving ? "saving" : online ? "" : "offline";
  const statusText = saving ? "Saving…" : online ? "Online" : "Offline";

  return (
    <div className="status-bar">
      <div className={`status-dot ${dotClass}`} />
      <span>{statusText}</span>
      {offlineCount > 0 && (
        <span className="status-item">📤 {offlineCount} queued</span>
      )}
      <span className="status-spacer" />
      <span className="status-item">
        {gpsStatus === "acquired"
          ? "📍 GPS"
          : gpsStatus === "acquiring"
            ? "🔍 GPS…"
            : "📍"}
      </span>
      {battery !== null && <span className="status-item">🔋 {battery}%</span>}
      <span className="status-item">
        {time.toLocaleTimeString("en-KE", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`toast ${type}`}>
      <span>{type === "success" ? "✓" : "⚠"}</span>
      {msg}
    </div>
  );
}

// ─── Firebase write ───────────────────────────────────────────────────────────
async function toFirebase(data) {
  await setDoc(
    doc(db, data.surveyId, data.interviewerId),
    { ...data },
    { merge: true },
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const selected = INTERVIEWERS.find((i) => i.id === selectedId);

  const handleNum = (n) => {
    if (pin.length < 4) setPin((p) => p + n);
  };
  const handleDel = () => setPin((p) => p.slice(0, -1));
  const handleLogin = () => {
    if (!selected) {
      setError("Please select your interviewer ID.");
      return;
    }
    if (pin !== selected.pin) {
      setError("Incorrect PIN. Please try again.");
      setPin("");
      return;
    }
    setError("");
    onLogin(selected);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="./src/assets/logo.svg" alt="" className="logo-mark" />
            <div>
              <div className="logo-text">DaroboCollect</div>
              <div className="logo-tagline">Field Research Platform</div>
            </div>
          </div>
          <div className="login-signin-label">Sign in to continue</div>
        </div>

        <div className="login-body">
          <div className="field-group">
            <label className="field-label">Interviewer ID</label>
            <select
              className="select-field"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setPin("");
                setError("");
              }}
            >
              <option value="">Select name…</option>
              {INTERVIEWERS.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} — {i.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Enter pin</label>
            <input
              className="input-field"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="****"
            />
          </div>

          {error && <div className="error-msg">{error}</div>}
          <button
            className="btn-primary"
            disabled={!selectedId || pin.length < 4}
            onClick={handleLogin}
          >
            Sign In →
          </button>
        </div>
      </div>
    </div>
  );
}
/*

            <>
              <label className="field-label">Enter PIN</label>
              <div className="pin-wrapper">
                {/*Array(4).fill(null).map((_, i) => (
                  <div key={i} className={`pin-dot ${i === pin.length ? "active" : ""} ${pin[i] ? "" : "empty"}`}>
                    {pin[i] ? "●" : i === pin.length ? "▌" : "·"}
                  </div>
                ))*/ /*}
              </div>

              {/*PIN  SELCTOR
                <div className="numpad">
                {[1,2,3,4,5,6,7,8,9].map((n) => (
                  <button key={n} className="num-btn" onClick={() => handleNum(String(n))}>{n}</button>
                ))}
                <button className="num-btn" style={{ visibility: "hidden" }} />
                <button className="num-btn" onClick={() => handleNum("0")}>0</button>
                <button className="num-btn del" onClick={handleDel}>⌫</button>
              </div>
                
            </>
*/

// ─── Home screen ──────────────────────────────────────────────────────────────
function HomeScreen({ interviewer, onStartSurvey, sessions, onLogout }) {
  const offlineCount = getOfflineQueueSize();

  return (
    <>
      <StatusBar saving={false} gpsStatus="ready" offlineCount={offlineCount} />
      <div className="topbar">
        <div className="topbar-logo">
          <img src="./src/assets/logo.svg" alt="" className="logo-mark-sm" />
          <span className="topbar-logo-text">DaroboCollect</span>
        </div>
        <div className="topbar-user">
          <div style={{ textAlign: "right" }}>
            <div className="user-name">{interviewer.name}</div>
            <div className="user-id">
              {interviewer.id} · {interviewer.location}
            </div>
          </div>
          <div className="avatar">
            {interviewer.name
              .split(" ")
              .map((w) => w[0])
              .join("")}
          </div>
          <button className="logout-btn" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>

      <div className="home-screen">
        <div className="home-content">
          <div className="home-greeting">
            <div className="home-greeting-label">Welcome back</div>
            <div className="home-greeting-name">{interviewer.name}</div>
            <div className="home-greeting-sub">
              {interviewer.location} · {interviewer.id}
            </div>
            <div className="home-stats-row">
              <div className="home-stat">
                <div className="home-stat-val">{sessions.length}</div>
                <div className="home-stat-lbl">Today</div>
              </div>
              <div className="home-stat">
                <div className="home-stat-val">
                  {sessions.filter((s) => s.submitted).length}
                </div>
                <div className="home-stat-lbl">Submitted</div>
              </div>
              {offlineCount > 0 && (
                <div className="home-stat">
                  <div className="home-stat-val">{offlineCount}</div>
                  <div className="home-stat-lbl">Queued</div>
                </div>
              )}
            </div>
          </div>

          <div className="section-heading">Choose questionnaire</div>
          <div className="survey-grid">
            {Object.entries(SURVEYS).map(([key, s]) => {
              const totalQ = s.sections.reduce(
                (acc, sec) => acc + sec.questions.length,
                0,
              );
              const todaySessions = sessions.filter(
                (x) => x.surveyId === s.id,
              ).length;
              return (
                <div key={key} className="survey-card">
                  <div className="survey-icon">{s.icon}</div>
                  <div className="survey-title">{s.title}</div>
                  <div className="survey-sub">{s.subtitle}</div>
                  <div className="survey-meta">
                    <span className="meta-tag">
                      {s.sections.length} sections
                    </span>
                    <span className="meta-tag">{totalQ} questions</span>
                    <span className="meta-tag">15–18 min</span>
                  </div>
                  <div className="start-row">
                    <div className="q-count">
                      {todaySessions} sessions today
                    </div>
                    <button
                      className="start-btn"
                      onClick={() => onStartSurvey(key)}
                    >
                      Start →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="recent-section">
            <div className="section-heading">Recent sessions</div>
            {sessions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                No sessions recorded yet today.
                <br />
                Start an interview above to begin.
              </div>
            ) : (
              <div>
                {[...sessions]
                  .reverse()
                  .slice(0, 5)
                  .map((s) => (
                    <div key={s.sessionId} className="session-item">
                      <div>
                        <div className="session-item-name">
                          {s.respondentName || "Anonymous respondent"}
                        </div>
                        <div className="session-item-meta">
                          {SURVEYS[s.surveyId]?.title} ·{" "}
                          {new Date(s.startedAt).toLocaleTimeString()}
                          {s.gps &&
                            ` · 📍 ${s.gps.lat.toFixed(4)}, ${s.gps.lng.toFixed(4)}`}
                        </div>
                      </div>
                      <span
                        className={`status-badge ${s.submitted ? "submitted" : "in-progress"}`}
                      >
                        {s.submitted ? "Submitted" : "In progress"}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Interview screen ─────────────────────────────────────────────────────────
function InterviewScreen({ survey, interviewer, onBack, onSessionComplete }) {
  const questions = flattenQuestions(survey);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState({});
  const [respondent, setRespondent] = useState({
    name: "",
    phone: "",
    town: "",
    location: "",
  });
  const [ended, setEnded] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [gps, setGps] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("idle");
  const [autoSaveTs, setAutoSaveTs] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const startedAt = useRef(new Date().toISOString());
  const sessionId = useRef(generateSessionId());
  const bodyRef = useRef(null);

  // GPS on mount
  useEffect(() => {
    setGpsStatus("acquiring");
    if (!navigator.geolocation) {
      setGpsStatus("failed");
      return;
    }
    const watchId = navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsStatus("acquired");
      },
      () => setGpsStatus("failed"),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
    return () => {};
  }, []);

  const q = questions[qIdx];
  const progress = ((qIdx + 1) / questions.length) * 100;
  const currentSection = survey.sections.find((s) =>
    s.questions.some((qq) => qq.id === q?.id),
  );
  const sectionIndex = survey.sections.indexOf(currentSection);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const answer = answers[q?.id];
  const setAnswer = (val) => setAnswers((prev) => ({ ...prev, [q.id]: val }));
  const toggleMulti = (option) => {
    const cur = answers[q.id] || [];
    setAnswers((prev) => ({
      ...prev,
      [q.id]: cur.includes(option)
        ? cur.filter((x) => x !== option)
        : [...cur, option],
    }));
  };

  const canNext = () => {
    if (!q) return false;
    if (q.required) {
      if (q.type === "multi") return (answers[q.id] || []).length > 0;
      if (q.type === "open") return (answers[q.id] || "").trim().length > 0;
      return answers[q.id] !== undefined;
    }
    return true;
  };
  const isLast = qIdx === questions.length - 1;

  const handleNext = () => {
    if (q.required && !canNext()) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    if (q.endSurveyOn && q.endSurveyOn.includes(answer)) {
      setEnded(true);
      return;
    }
    if (qIdx < questions.length - 1) {
      setQIdx((i) => i + 1);
      bodyRef.current?.scrollTo(0, 0);
    }
  };
  const handlePrev = () => {
    setShowValidation(false);
    if (qIdx > 0) {
      setQIdx((i) => i - 1);
      bodyRef.current?.scrollTo(0, 0);
    }
  };

  const buildPayload = () => ({
    sessionId: sessionId.current,
    surveyId: survey.id,
    surveyTitle: survey.title,
    interviewerId: interviewer.id,
    interviewerName: interviewer.name,
    interviewerLocation: interviewer.location,
    respondentName: respondent.name,
    respondentPhone: respondent.phone,
    respondentTown: respondent.town,
    respondentLocation: respondent.location,
    gps: gps || null,
    gpsTimestamp: gps ? new Date().toISOString() : null,
    startedAt: startedAt.current,
    ...answers,
    notes,
    submitted: false,
  });

  // Autosave
  useEffect(() => {
    if (Object.keys(answers).length === 0) return;
    const timer = setTimeout(async () => {
      try {
        await toFirebase(buildPayload());
        setAutoSaveTs(new Date());
      } catch {
        saveToOfflineQueue(buildPayload());
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, [answers, notes]);

  const handleSubmit = async () => {
    setSaving(true);
    const data = {
      ...buildPayload(),
      submittedAt: serverTimestamp(),
      submitted: true,
    };
    try {
      await toFirebase(data);
      onSessionComplete({
        ...data,
        startedAt: startedAt.current,
        submittedAt: new Date().toISOString(),
      });
      setSubmitted(true);
      showToast("Interview saved successfully!", "success");
    } catch {
      const queued = saveToOfflineQueue(data);
      onSessionComplete({
        ...data,
        startedAt: startedAt.current,
        submittedAt: new Date().toISOString(),
      });
      setSubmitted(true);
      showToast(
        queued ? "Saved offline — will sync when online" : "Save failed",
        queued ? "success" : "error",
      );
    } finally {
      setSaving(false);
    }
  };

  // Completion dashboard
  if (submitted) {
    const duration = Math.round(
      (Date.now() - new Date(startedAt.current).getTime()) / 60000,
    );
    return (
      <div className="app">
        <div className="end-screen">
          <div className="end-icon-wrap success">✅</div>
          <div className="end-title">Interview submitted</div>
          <div className="end-sub">
            {respondent.name ? `${respondent.name}'s` : "This"} responses have
            been saved and are ready for analysis.
          </div>
          <div className="completion-dashboard">
            <div className="completion-row">
              <span className="completion-row-label">Respondent</span>
              <span className="completion-row-val">
                {respondent.name || "—"}
              </span>
            </div>
            <div className="completion-row">
              <span className="completion-row-label">Phone</span>
              <span className="completion-row-val">
                {respondent.phone || "—"}
              </span>
            </div>
            <div className="completion-row">
              <span className="completion-row-label">Location</span>
              <span className="completion-row-val">
                {respondent.town || "—"}
              </span>
            </div>
            <div className="completion-row">
              <span className="completion-row-label">Questions answered</span>
              <span className="completion-row-val">
                {Object.keys(answers).length} / {questions.length}
              </span>
            </div>
            <div className="completion-row">
              <span className="completion-row-label">Duration</span>
              <span className="completion-row-val">{duration} min</span>
            </div>
            <div className="completion-row">
              <span className="completion-row-label">GPS</span>
              <span className="completion-row-val">
                {gps ? `±${Math.round(gps.accuracy)}m` : "Not captured"}
              </span>
            </div>
            <div className="completion-row">
              <span className="completion-row-label">Session ID</span>
              <span className="completion-row-val">
                {sessionId.current.slice(-8)}
              </span>
            </div>
          </div>
          <div className="end-actions">
            <button className="btn-primary" onClick={onBack}>
              Start new interview
            </button>
            <button className="btn-secondary" onClick={onBack}>
              Back to dashboard
            </button>
          </div>
        </div>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    );
  }

  if (ended)
    return (
      <div className="app">
        <div className="end-screen">
          <div className="end-icon-wrap ended">🚫</div>
          <div className="end-title">Survey ended early</div>
          <div className="end-sub">
            Respondent does not qualify based on the screener criteria. No data
            will be saved.
          </div>
          <div className="end-actions">
            <button className="btn-primary" onClick={onBack}>
              Start new interview
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="app">
      <StatusBar
        saving={saving}
        gpsStatus={gpsStatus}
        offlineCount={getOfflineQueueSize()}
      />

      <div className="interview-header">
        <div className="interview-title-row">
          <button className="back-btn" onClick={onBack}>
            ←
          </button>
          <div>
            <div className="interview-survey-name">
              {survey.icon} {survey.title}
            </div>
            <div className="interview-section-name">
              {currentSection
                ? `${currentSection.part} — ${currentSection.title}`
                : ""}
            </div>
          </div>
          <div className="interview-header-right">
            <div className="q-progress">
              Q{qIdx + 1} / {questions.length}
            </div>
          </div>
        </div>
        <div className="progress-bar-outer">
          <div
            className="progress-bar-inner"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Section navigation pills */}
      <div className="section-nav">
        {survey.sections.map((sec, idx) => {
          const allQIds = sec.questions.map((q) => q.id);
          const allAnswered = allQIds.every((id) => answers[id] !== undefined);
          const isCurrent = idx === sectionIndex;
          return (
            <div
              key={sec.id}
              className={`section-pill ${isCurrent ? "active" : allAnswered ? "done" : ""}`}
            >
              {allAnswered && !isCurrent ? "✓ " : ""}
              {sec.part}: {sec.title}
            </div>
          );
        })}
      </div>

      <div className="interview-body" ref={bodyRef}>
        {/* GPS status badge */}
        {gpsStatus !== "idle" && (
          <div className={`gps-badge ${gpsStatus}`}>
            {gpsStatus === "acquiring" && <>🔍 Acquiring GPS location…</>}
            {gpsStatus === "acquired" && <>📍 GPS: {formatCoords(gps)}</>}
            {gpsStatus === "failed" && <>⚠ GPS unavailable</>}
          </div>
        )}

        {/* Respondent card — first question only */}
        {qIdx === 0 && (
          <div className="respondent-card">
            <div className="respondent-card-header">
              <div className="respondent-card-icon">👤</div>
              <div>
                <div className="respondent-card-title">Respondent details</div>
                <div className="respondent-card-sub">
                  Fill in before starting
                </div>
              </div>
            </div>
            <div className="respondent-grid">
              <input
                className="respondent-input"
                placeholder="Full name"
                value={respondent.name}
                onChange={(e) =>
                  setRespondent((r) => ({ ...r, name: e.target.value }))
                }
              />
              <input
                className="respondent-input"
                placeholder="Phone number"
                value={respondent.phone}
                type="tel"
                onChange={(e) =>
                  setRespondent((r) => ({ ...r, phone: e.target.value }))
                }
              />
              <select
                className="respondent-input"
                style={{ appearance: "none" }}
                value={respondent.town}
                onChange={(e) =>
                  setRespondent((r) => ({ ...r, town: e.target.value }))
                }
              >
                <option value="">Select town</option>
                <option value="Nairobi">Nairobi</option>
                <option value="Mombasa">Mombasa</option>
                <option value="Kisumu">Kisumu</option>
                <option value="Nakuru">Nakuru</option>
                <option value="Eldoret">Eldoret</option>
                <option value="Other">Other</option>
              </select>
              <input
                className="respondent-input full-width"
                placeholder="Estate / Sampling area"
                value={respondent.location}
                onChange={(e) =>
                  setRespondent((r) => ({ ...r, location: e.target.value }))
                }
              />
            </div>
          </div>
        )}

        {/* Question */}
        <div className="q-header">
          <div className="q-number">
            {q.id}
            {q.core && <span className="core-badge">{q.coreLabel}</span>}
            {q.required && (
              <span style={{ color: "var(--red)", marginLeft: 2 }}>*</span>
            )}
          </div>
          <div className="q-text">{q.text}</div>
          {q.swahili && <div className="q-swahili">{q.swahili}</div>}
        </div>

        {q.type === "single" && (
          <div className="options-list">
            {q.options.map((opt) => (
              <button
                key={opt}
                className={`option-btn ${answer === opt ? "selected" : ""}`}
                onClick={() => setAnswer(opt)}
              >
                <span className="option-check">✓</span>
                {opt}
              </button>
            ))}
          </div>
        )}

        {q.type === "multi" && (
          <div className="options-list">
            <div className="multi-hint">☑ Select all that apply</div>
            {q.options.map((opt) => {
              const sel = (answers[q.id] || []).includes(opt);
              return (
                <button
                  key={opt}
                  className={`option-btn ${sel ? "selected" : ""}`}
                  onClick={() => toggleMulti(opt)}
                >
                  <span className="option-check-sq">{sel ? "✓" : ""}</span>
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {q.type === "scale" && (
          <div className="scale-wrapper">
            {q.minLabel && q.maxLabel && (
              <div className="scale-labels-row">
                <span className="scale-label-txt">{q.minLabel}</span>
                <span className="scale-label-txt">{q.maxLabel}</span>
              </div>
            )}
            <div className="scale-btns">
              {Array.from(
                { length: q.max - q.min + 1 },
                (_, i) => i + q.min,
              ).map((n) => (
                <button
                  key={n}
                  className={`scale-btn ${answer === n ? "selected" : ""}`}
                  onClick={() => setAnswer(n)}
                >
                  {n}
                  <span className="scale-sub">
                    {n === q.min ? "Low" : n === q.max ? "High" : ""}
                  </span>
                </button>
              ))}
            </div>
            {q.labels && (
              <div style={{ marginTop: 12 }}>
                {q.labels.map((l) => (
                  <div
                    key={l}
                    style={{
                      fontSize: 13,
                      color: "var(--text3)",
                      padding: "2px 0",
                    }}
                  >
                    {l}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {q.type === "open" && (
          <textarea
            className="open-textarea"
            placeholder="Type respondent's answer verbatim…"
            value={answers[q.id] || ""}
            onChange={(e) => setAnswer(e.target.value)}
          />
        )}

        <div className="notes-area">
          <div className="notes-label">📝 Interviewer notes (private)</div>
          <textarea
            className="notes-input"
            placeholder="Observations, body language, verbatim quotes, context…"
            value={notes[q.id] || ""}
            onChange={(e) =>
              setNotes((prev) => ({ ...prev, [q.id]: e.target.value }))
            }
          />
          {autoSaveTs && (
            <div className="autosave-indicator">
              <span className="autosave-dot" />
              Autosaved{" "}
              {autoSaveTs.toLocaleTimeString("en-KE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>
      </div>

      {showValidation && (
        <div className="validation-summary">
          ⚠ This question is required — please select an answer to continue.
        </div>
      )}

      <div className="interview-footer">
        <button className="nav-btn" disabled={qIdx === 0} onClick={handlePrev}>
          ← Prev
        </button>
        {isLast ? (
          <button
            className="nav-btn nav-btn-submit"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving…" : "Submit interview ✓"}
          </button>
        ) : (
          <button className="nav-btn nav-btn-next" onClick={handleNext}>
            {canNext() ? "Next →" : "Next →"}
          </button>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function Darobo_collect() {
  const [interviewer, setInterviewer] = useState(null);
  const [screen, setScreen] = useState("login");
  const [activeSurveyId, setActiveSurveyId] = useState(null);
  const [sessions, setSessions] = useState([]);

  const handleLogin = (user) => {
    setInterviewer(user);
    setScreen("home");
  };
  const handleLogout = () => {
    setInterviewer(null);
    setScreen("login");
  };
  const handleStartSurvey = (id) => {
    setActiveSurveyId(id);
    setScreen("interview");
  };
  const handleSessionComplete = (payload) =>
    setSessions((prev) => [...prev, payload]);

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {screen === "login" && <LoginScreen onLogin={handleLogin} />}
        {screen === "home" && interviewer && (
          <HomeScreen
            interviewer={interviewer}
            sessions={sessions}
            onStartSurvey={handleStartSurvey}
            onLogout={handleLogout}
          />
        )}
        {screen === "interview" && interviewer && activeSurveyId && (
          <InterviewScreen
            survey={SURVEYS[activeSurveyId]}
            interviewer={interviewer}
            onBack={() => setScreen("home")}
            onSessionComplete={handleSessionComplete}
          />
        )}
      </div>
    </>
  );
}
