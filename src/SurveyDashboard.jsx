import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  ComposedChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  CiLineHeight, CiViewList, CiTempHigh, CiViewTable, CiBoxList,
  CiBag1, CiMoneyCheck1, CiMobile4, CiUser, CiWallet,
  CiViewTimeline, CiDatabase, CiFolderOn, CiClock1,
  CiFloppyDisk, CiBookmarkCheck, CiCircleQuestion, CiFolderOff,
  CiMapPin, CiTrash, CiLogout, CiLock, CiMail, CiExport,
} from "react-icons/ci";

import { db } from "./firebase";
import { supabase_two } from "./supa_client.js";
 import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const SAMPLE_TARGET = 120;

// ── SURVEYS DATA ──────────────────────────────────────────────────────────────
const SURVEYS = [
  {
    id: "chama",
    title: "Chama Secretaries & SACCO",
    subtitle: "H1 & H2 Hypothesis Validation",
    sample: 20,
    sections: [
      {
        id: "screener",
        title: "Screener & Demographics",
        part: "Part A",
        questions: [
          {
            id: "Q1",
            type: "single",
            required: true,
            text: "Are you currently a member or officer of a chama?",
            options: [
              "Yes, I am a chama/group member",
              "Yes, I am a SACCO member",
              "Yes, I am a secretary or treasurer",
              "No → End survey",
            ],
            endSurveyOn: ["No → End survey"],
          },
          {
            id: "Q2",
            type: "single",
            required: true,
            text: "How long have you been a member?",
            options: [
              "Less than 1 year",
              "1–3 years",
              "4–7 years",
              "More than 7 years",
            ],
          },
          {
            id: "Q3",
            type: "single",
            required: true,
            text: "What is the approximate total value of funds your chama manages per month?",
            options: [
              "Below KSh 50,000",
              "KSh 50,000–200,000",
              "KSh 200,000–1,000,000",
              "Above KSh 1,000,000",
            ],
          },
        ],
      },
      {
        id: "documentation",
        title: "Documentation Habits",
        part: "Part B — H1 Pain Signal",
        questions: [
          {
            id: "Q4",
            type: "multi",
            required: false,
            text: "What does your chama use to document loan agreements, contribution rules, or member decisions?",
            options: [
              "A written paper register",
              "A printed agreement form",
              "WhatsApp messages",
              "A lawyer-drafted contract",
              "Verbal agreement with witnesses",
              "Nothing",
              "Other",
            ],
          },
          {
            id: "Q5",
            type: "single",
            required: true,
            text: "When a new member joins and receives a loan, is there a signed written agreement?",
            options: ["Always", "Sometimes", "Rarely", "Never"],
          },
          {
            id: "Q6",
            type: "single",
            required: true,
            core: true,
            coreLabel: "Core H1",
            text: "Has your chama ever been unable to enforce a loan or contribution because there was no written proof?",
            options: [
              "Yes, it happened",
              "Yes, more than once",
              "Not yet, but I worry it could happen",
              "No, we have not had this problem",
            ],
          },
          {
            id: "Q7",
            type: "single",
            required: false,
            text: "Think of the worst dispute or loss. How much did it cost?",
            options: [
              "We have not had such a dispute",
              "Below KSh 5,000",
              "KSh 5,000–50,000",
              "KSh 50,000–200,000",
              "Above KSh 200,000",
              "We lost members, not just money",
            ],
          },
          {
            id: "Q8",
            type: "single",
            required: false,
            text: "In the last 12 months, how many members have left your chama due to a disagreement over money or terms?",
            options: ["None", "1–2 members", "3–5 members", "More than 5"],
          },
          {
            id: "Q9",
            type: "scale",
            required: true,
            text: "How big a problem is the lack of proper documentation for your group? Rate from 1 to 5.",
            min: 1,
            max: 5,
          },
        ],
      },
      {
        id: "workarounds",
        title: "Current Workarounds",
        part: "Part C",
        questions: [
          {
            id: "Q10",
            type: "multi",
            required: false,
            text: "When there is a dispute, where do members currently go to resolve it?",
            options: [
              "We resolve it internally",
              "Village elder or community leader",
              "Lawyer or paralegal",
              "Police or local chief",
              "Court",
              "We give up — no recourse",
            ],
          },
          {
            id: "Q11",
            type: "single",
            required: false,
            text: "What is the biggest reason your group does not use formal written contracts today?",
            options: [
              "Too expensive",
              "Too complicated",
              "We trust each other",
              "We do not know how",
              "Even written contracts do not help in court",
              "Other",
            ],
          },
          {
            id: "Q12",
            type: "single",
            required: true,
            text: "If a simple, affordable tool existed to document and sign group agreements using only a phone — how likely would you be to use it?",
            options: [
              "Definitely yes",
              "Probably yes",
              "Not sure",
              "Probably not",
              "Definitely not",
            ],
          },
        ],
      },
      {
        id: "wtp",
        title: "Willingness to Pay",
        part: "Part D — H2 Signal",
        questions: [
          {
            id: "Q13",
            type: "single",
            required: true,
            core: true,
            coreLabel: "Core H2",
            text: "Would you pay for a tool that creates a legal agreement in under 5 minutes, both parties sign by PIN, and produces a tamper-proof record?",
            options: [
              "Yes, I would pay personally",
              "Yes, if the group pays",
              "Maybe, depends on the price",
              "No",
            ],
          },
          {
            id: "Q14",
            type: "single",
            required: false,
            text: "Per single agreement, what is the maximum you would pay?",
            options: [
              "KSh 0 — I would not pay",
              "KSh 10–30",
              "KSh 31–100",
              "KSh 101–300",
              "KSh 301–500",
              "Above KSh 500",
            ],
          },
          {
            id: "Q15",
            type: "single",
            required: false,
            text: "Who should pay for each agreement?",
            options: [
              "The individual member",
              "The chama or SACCO pays for everyone",
              "Split equally",
              "Whoever benefits more should pay",
            ],
          },
          {
            id: "Q16",
            type: "single",
            required: false,
            text: "If the chama paid a flat monthly fee for unlimited agreement signing — how much per month would be reasonable?",
            options: [
              "Below KSh 200/month",
              "KSh 200–500/month",
              "KSh 500–2,000/month",
              "Above KSh 2,000/month",
              "Would not want this model",
            ],
          },
          {
            id: "Q17",
            type: "single",
            required: true,
            text: "Would you trust a document signed using a phone PIN and stored online more, same, or less than a paper agreement?",
            options: ["More", "Same", "Less", "I do not know"],
          },
        ],
      },
      {
        id: "adoption",
        title: "Adoption & Barriers",
        part: "Part E",
        questions: [
          {
            id: "Q18",
            type: "multi",
            required: false,
            text: "What would make you decide NOT to use a digital signing tool for your group agreements?",
            options: [
              "Older members cannot use phones",
              "Do not trust it in court",
              "Privacy concerns — who sees our data?",
              "Cost too high",
              "Internet not reliable in our area",
              "Fear of losing PIN",
              "No reason — I would use it",
            ],
          },
          {
            id: "Q19",
            type: "single",
            required: false,
            text: "Does your chama have members who use only a basic (non-smartphone) phone?",
            options: [
              "Yes, most members",
              "Yes, some members",
              "Very few",
              "No, all use smartphones",
            ],
          },
          {
            id: "Q20",
            type: "single",
            required: false,
            text: "Who would you most trust to introduce a new tool like this to your group?",
            options: [
              "An M-Pesa agent we already use",
              "Our SACCO or bank",
              "A friend or member who tried it",
              "A lawyer or legal professional",
              "The chama/SACCO secretary or chairperson",
            ],
          },
        ],
      },
      {
        id: "secretary",
        title: "Secretary Track",
        part: "Part F — Secretary Only",
        questions: [
          {
            id: "Q21",
            type: "single",
            required: false,
            text: "As secretary, how many agreements do you draft or witness per month on average?",
            options: ["1–5", "6–15", "16–50", "More than 50"],
          },
          {
            id: "Q22",
            type: "single",
            required: false,
            text: "On average, how much time do you spend per week managing documentation, reminders, and disputes?",
            options: [
              "Under 1 hour",
              "1–3 hours",
              "4–8 hours",
              "More than 8 hours",
            ],
          },
          {
            id: "Q23",
            type: "single",
            required: false,
            text: "If you could reduce your documentation and dispute workload by 80%, would that make your role as secretary easier?",
            options: ["Yes, significantly", "Yes, somewhat", "Not sure", "No"],
          },
          {
            id: "Q24",
            type: "single",
            required: false,
            text: "Would you be willing to try a free version of this tool for one month and give us your honest feedback?",
            options: ["Yes — collect contact", "Maybe — tell me more", "No"],
          },
          {
            id: "Q25",
            type: "open",
            required: false,
            text: "In your own words — what is the one thing you most need to make your chama or SACCO agreements more secure?",
          },
        ],
      },
    ],
  },
  {
    id: "landlord",
    title: "Real Estate — Landlords",
    subtitle: "H1 & H2 Hypothesis Validation",
    sample: 40,
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
            options: ["1 unit", "2–5 units", "6–10 units", "More than 10"],
          },
          {
            id: "Q3",
            type: "single",
            required: true,
            text: "What is the typical monthly rent for your units?",
            options: [
              "Below KSh 5,000",
              "KSh 5,000–15,000",
              "KSh 15,001–40,000",
              "Above KSh 40,000",
            ],
          },
        ],
      },
      {
        id: "documentation",
        title: "Documentation Practices",
        part: "Part B — H1 Pain Signal",
        questions: [
          {
            id: "Q4",
            type: "multi",
            required: false,
            text: "When a new tenant moves in, what documents do you use?",
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
          {
            id: "Q5",
            type: "single",
            required: false,
            text: "When a tenant pays a deposit, how do you document it?",
            options: [
              "Written receipt signed by both parties",
              "M-Pesa transaction record only",
              "Verbal acknowledgment",
              "WhatsApp message",
              "Nothing",
            ],
          },
          {
            id: "Q6",
            type: "single",
            required: true,
            core: true,
            coreLabel: "Core H1",
            text: "In the past 12 months, have you had a dispute with a tenant over rent, deposit, repairs, or the terms of their agreement?",
            options: [
              "Yes, and I lost money",
              "Yes, and the tenant left without paying",
              "Yes, but we resolved it",
              "Not in the last 12 months, but in the past",
              "Never",
            ],
          },
          {
            id: "Q7",
            type: "single",
            required: false,
            text: "When that dispute happened — did you have a signed written agreement covering the disputed point?",
            options: [
              "Yes, but the tenant denied it",
              "We had an agreement but it did not cover this point",
              "No, we had no written agreement",
              "Not applicable",
            ],
          },
          {
            id: "Q8",
            type: "single",
            required: false,
            text: "What was the approximate financial cost of your worst tenancy dispute?",
            options: [
              "Below KSh 5,000",
              "KSh 5,000–30,000",
              "KSh 30,001–100,000",
              "Above KSh 100,000",
              "I have not had such a dispute",
            ],
          },
          {
            id: "Q9",
            type: "scale",
            required: true,
            text: "How big a problem is the lack of proper rental documentation for you? Rate 1–5.",
            min: 1,
            max: 5,
          },
          {
            id: "Q10",
            type: "single",
            required: false,
            text: "On average, how many tenants move out per year leaving a dispute unresolved?",
            options: ["None", "1 tenant", "2–3 tenants", "More than 3"],
          },
        ],
      },
      {
        id: "workarounds",
        title: "Current Workarounds",
        part: "Part C",
        questions: [
          {
            id: "Q11",
            type: "multi",
            required: false,
            text: "When a tenant dispute turns serious, where do you currently go for help?",
            options: [
              "Resolve it myself",
              "Local chief or village elder",
              "Estate agent or caretaker",
              "Lawyer",
              "Rent Tribunal",
              "I give up and absorb the loss",
            ],
          },
          {
            id: "Q12",
            type: "single",
            required: false,
            text: "Why don't you use a lawyer-drafted lease for all your tenancies?",
            options: [
              "Too expensive (KSh 5,000–30,000 per lease)",
              "Too slow — tenants won't wait",
              "Unnecessary for low-rent units",
              "I don't know where to get one",
              "I already use a standard agreement",
            ],
          },
        ],
      },
      {
        id: "wtp",
        title: "Willingness to Pay",
        part: "Part D — H2 Signal",
        questions: [
          {
            id: "Q13",
            type: "single",
            required: true,
            core: true,
            coreLabel: "Core H2",
            text: "Imagine a tool that creates a legally enforceable tenancy agreement in 5 minutes. The tenant signs from their phone using a PIN. Would you pay for this?",
            options: [
              "Yes, definitely",
              "Yes, if it is affordable",
              "Maybe",
              "No",
            ],
          },
          {
            id: "Q14",
            type: "single",
            required: false,
            core: true,
            coreLabel: "Core H2",
            text: "Per tenancy agreement, what is the maximum you would pay?",
            options: [
              "KSh 0 — would not pay",
              "KSh 50–100",
              "KSh 101–300",
              "KSh 301–500",
              "KSh 501–1,000",
              "Above KSh 1,000",
            ],
          },
          {
            id: "Q15",
            type: "single",
            required: false,
            text: "If a monthly subscription gave you unlimited agreements for all your units — what price per month would feel fair?",
            options: [
              "Below KSh 200/month",
              "KSh 200–500/month",
              "KSh 501–1,000/month",
              "Above KSh 1,000/month",
              "I prefer paying per agreement",
            ],
          },
          {
            id: "Q16",
            type: "single",
            required: false,
            text: "If your property agent offered this service as part of their fees, would you prefer that to paying separately?",
            options: [
              "Yes — easier if bundled",
              "No — I'd rather control it myself",
              "I don't use an agent",
            ],
          },
        ],
      },
      {
        id: "adoption",
        title: "Adoption & Barriers",
        part: "Part E",
        questions: [
          {
            id: "Q17",
            type: "single",
            required: false,
            text: "Would your tenants be able to sign a digital lease using only a basic phone and a PIN?",
            options: [
              "Yes, most of them",
              "Some, but not all",
              "Probably not — most are not tech-savvy",
              "I'm not sure",
            ],
          },
          {
            id: "Q18",
            type: "multi",
            required: false,
            text: "What would stop you from using a digital signing tool?",
            options: [
              "Not sure if courts accept it",
              "Tenants won't trust it",
              "Cost too high",
              "Privacy — who sees my agreement?",
              "Too complicated for me",
              "Nothing — I would use it",
            ],
          },
          {
            id: "Q19",
            type: "single",
            required: false,
            text: "If this tool worked via M-Pesa — would that make it easier to use?",
            options: [
              "Yes, much easier",
              "Somewhat",
              "Makes no difference",
              "No, I'd prefer another payment method",
            ],
          },
          {
            id: "Q20",
            type: "single",
            required: false,
            text: "Who would you most trust to offer you this service?",
            options: [
              "My current property agent",
              "My bank or M-Pesa",
              "A startup app recommended by a friend",
              "A government-affiliated service",
              "A law firm",
            ],
          },
        ],
      },
      {
        id: "close",
        title: "Close & Pilot Recruitment",
        part: "Part F",
        questions: [
          {
            id: "Q21",
            type: "single",
            required: false,
            text: "How often do you sign new tenancy agreements per year?",
            options: ["1–2", "3–5", "6–12", "More than 12"],
          },
          {
            id: "Q22",
            type: "open",
            required: false,
            text: "In your own words — what is the single most stressful part of managing tenants?",
          },
          {
            id: "Q23",
            type: "single",
            required: false,
            text: "Would you be willing to try a free version for 1 month and give us feedback?",
            options: ["Yes — collect contact", "Maybe — tell me more", "No"],
          },
        ],
      },
    ],
  },
  {
    id: "agent",
    title: "Real Estate — Agents",
    subtitle: "H1 & H2 Hypothesis Validation",
    sample: 20,
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
            options: ["1 unit", "2–5 units", "6–10 units", "More than 10"],
          },
          {
            id: "Q3",
            type: "single",
            required: true,
            text: "What is the typical monthly rent for your units?",
            options: [
              "Below KSh 5,000",
              "KSh 5,000–15,000",
              "KSh 15,001–40,000",
              "Above KSh 40,000",
            ],
          },
        ],
      },
      {
        id: "documentation",
        title: "Documentation Practices",
        part: "Part B — H1 Pain Signal",
        questions: [
          {
            id: "Q4",
            type: "multi",
            required: false,
            text: "When a new tenant moves in, what documents do you use?",
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
          {
            id: "Q5",
            type: "single",
            required: false,
            text: "When a tenant pays a deposit, how do you document it?",
            options: [
              "Written receipt signed by both parties",
              "M-Pesa transaction record only",
              "Verbal acknowledgment",
              "WhatsApp message",
              "Nothing",
            ],
          },
          {
            id: "Q6",
            type: "single",
            required: true,
            core: true,
            coreLabel: "Core H1",
            text: "In the past 12 months, have you had a dispute with a tenant over rent, deposit, repairs, or the terms of their agreement?",
            options: [
              "Yes, and I lost money",
              "Yes, and the tenant left without paying",
              "Yes, but we resolved it",
              "Not in the last 12 months, but in the past",
              "Never",
            ],
          },
          {
            id: "Q7",
            type: "single",
            required: false,
            text: "When that dispute happened — did you have a signed written agreement covering the disputed point?",
            options: [
              "Yes, but the tenant denied it",
              "We had an agreement but it did not cover this point",
              "No, we had no written agreement",
              "Not applicable",
            ],
          },
          {
            id: "Q8",
            type: "single",
            required: false,
            text: "What was the approximate financial cost of your worst tenancy dispute?",
            options: [
              "Below KSh 5,000",
              "KSh 5,000–30,000",
              "KSh 30,001–100,000",
              "Above KSh 100,000",
              "I have not had such a dispute",
            ],
          },
          {
            id: "Q9",
            type: "scale",
            required: true,
            text: "How big a problem is the lack of proper rental documentation for you? Rate 1–5.",
            min: 1,
            max: 5,
          },
          {
            id: "Q10",
            type: "single",
            required: false,
            text: "On average, how many tenants move out per year leaving a dispute unresolved?",
            options: ["None", "1 tenant", "2–3 tenants", "More than 3"],
          },
        ],
      },
      {
        id: "workarounds",
        title: "Current Workarounds",
        part: "Part C",
        questions: [
          {
            id: "Q11",
            type: "multi",
            required: false,
            text: "When a tenant dispute turns serious, where do you currently go for help?",
            options: [
              "Resolve it myself",
              "Local chief or village elder",
              "Estate agent or caretaker",
              "Lawyer",
              "Rent Tribunal",
              "I give up and absorb the loss",
            ],
          },
          {
            id: "Q12",
            type: "single",
            required: false,
            text: "Why don't you use a lawyer-drafted lease for all your tenancies?",
            options: [
              "Too expensive (KSh 5,000–30,000 per lease)",
              "Too slow — tenants won't wait",
              "Unnecessary for low-rent units",
              "I don't know where to get one",
              "I already use a standard agreement",
            ],
          },
        ],
      },
      {
        id: "wtp",
        title: "Willingness to Pay",
        part: "Part D — H2 Signal",
        questions: [
          {
            id: "Q13",
            type: "single",
            required: true,
            core: true,
            coreLabel: "Core H2",
            text: "Imagine a tool that creates a legally enforceable tenancy agreement in 5 minutes. The tenant signs from their phone using a PIN. Would you pay for this?",
            options: [
              "Yes, definitely",
              "Yes, if it is affordable",
              "Maybe",
              "No",
            ],
          },
          {
            id: "Q14",
            type: "single",
            required: false,
            core: true,
            coreLabel: "Core H2",
            text: "Per tenancy agreement, what is the maximum you would pay?",
            options: [
              "KSh 0 — would not pay",
              "KSh 50–100",
              "KSh 101–300",
              "KSh 301–500",
              "KSh 501–1,000",
              "Above KSh 1,000",
            ],
          },
          {
            id: "Q15",
            type: "single",
            required: false,
            text: "If a monthly subscription gave you unlimited agreements for all your units — what price per month would feel fair?",
            options: [
              "Below KSh 200/month",
              "KSh 200–500/month",
              "KSh 501–1,000/month",
              "Above KSh 1,000/month",
              "I prefer paying per agreement",
            ],
          },
          {
            id: "Q16",
            type: "single",
            required: false,
            text: "If your property agent offered this service as part of their fees, would you prefer that to paying separately?",
            options: [
              "Yes — easier if bundled",
              "No — I'd rather control it myself",
              "I don't use an agent",
            ],
          },
        ],
      },
      {
        id: "adoption",
        title: "Adoption & Barriers",
        part: "Part E",
        questions: [
          {
            id: "Q17",
            type: "single",
            required: false,
            text: "Would your tenants be able to sign a digital lease using only a basic phone and a PIN?",
            options: [
              "Yes, most of them",
              "Some, but not all",
              "Probably not — most are not tech-savvy",
              "I'm not sure",
            ],
          },
          {
            id: "Q18",
            type: "multi",
            required: false,
            text: "What would stop you from using a digital signing tool?",
            options: [
              "Not sure if courts accept it",
              "Tenants won't trust it",
              "Cost too high",
              "Privacy — who sees my agreement?",
              "Too complicated for me",
              "Nothing — I would use it",
            ],
          },
          {
            id: "Q19",
            type: "single",
            required: false,
            text: "If this tool worked via M-Pesa — would that make it easier to use?",
            options: [
              "Yes, much easier",
              "Somewhat",
              "Makes no difference",
              "No, I'd prefer another payment method",
            ],
          },
          {
            id: "Q20",
            type: "single",
            required: false,
            text: "Who would you most trust to offer you this service?",
            options: [
              "My current property agent",
              "My bank or M-Pesa",
              "A startup app recommended by a friend",
              "A government-affiliated service",
              "A law firm",
            ],
          },
        ],
      },
      {
        id: "close",
        title: "Close & Pilot Recruitment",
        part: "Part F",
        questions: [
          {
            id: "Q21",
            type: "single",
            required: false,
            text: "How often do you sign new tenancy agreements per year?",
            options: ["1–2", "3–5", "6–12", "More than 12"],
          },
          {
            id: "Q22",
            type: "open",
            required: false,
            text: "In your own words — what is the single most stressful part of managing tenants?",
          },
          {
            id: "Q23",
            type: "single",
            required: false,
            text: "Would you be willing to try a free version for 1 month and give us feedback?",
            options: ["Yes — collect contact", "Maybe — tell me more", "No"],
          },
        ],
      },
    ],
  },
  {
    id: "tenant",
    title: "Real Estate — Tenants",
    subtitle: "H1 & H2 Hypothesis Validation",
    sample: 40,
    sections: [
      {
        id: "screener",
        title: "Screener & Rent Context",
        part: "Part A",
        questions: [
          {
            id: "Q1",
            type: "single",
            required: true,
            text: "Are you currently renting accommodation in Kenya?",
            options: [
              "Yes, I am currently renting / Ndio, ninakodisha sasa hivi",
              "No, but I rented in the past 2 years / Hapana, lakini nilikodisha miaka 2 iliyopita",
              "No / Hapana → End survey",
            ],
            endSurveyOn: ["No / Hapana → End survey"],
          },
          {
            id: "Q2",
            type: "single",
            required: true,
            text: "What is your monthly rent?",
            options: [
              "Below KSh 5,000",
              "KSh 5,000-15,000",
              "KSh 15,001-40,000",
              "Above KSh 40,000",
            ],
          },
        ],
      },
      {
        id: "documentation",
        title: "Documentation Pain",
        part: "Part B — H1 Tenant Signal",
        questions: [
          {
            id: "Q3",
            type: "single",
            required: true,
            text: "When you moved into your current home, did you sign a written tenancy agreement?",
            options: [
              "Yes, a formal printed lease / Ndio, mkataba rasmi uliochapishwa",
              "Yes, a handwritten agreement / Ndio, makubaliano ya mkono",
              "Only a verbal agreement / Makubaliano ya mdomo tu",
              "No agreement at all / Hakuna makubaliano kabisa",
            ],
          },
          {
            id: "Q4",
            type: "single",
            required: true,
            text: "Have you ever lost a deposit or been overcharged because you had no written proof of what was agreed?",
            options: [
              "Yes, I lost my deposit / Ndio, nilipoteza amana yangu",
              "Yes, I was overcharged on rent / Ndio, nilitozwa zaidi ya kodi",
              "Yes, both / Ndio, vyote viwili",
              "No, but I worried it could happen / Hapana, lakini niliogopa",
              "No / Hapana",
            ],
          },
          {
            id: "Q5",
            type: "single",
            required: true,
            text: "Have you ever moved out of a house because of a dispute with your landlord that you could not resolve?",
            options: [
              "Yes / Ndio",
              "No, but I know someone who has / Hapana, lakini najua mtu",
              "No / Hapana",
            ],
          },
          {
            id: "Q6",
            type: "single",
            required: true,
            text: "When you pay monthly rent via M-Pesa, does your landlord give you a proper written receipt?",
            options: [
              "Always / Wakati wote",
              "Sometimes / Mara nyingine",
              "Rarely / Mara chache",
              "Never - M-Pesa message is all I have / Kamwe",
            ],
          },
          {
            id: "Q7",
            type: "scale",
            required: true,
            core: true,
            coreLabel: "Core H1",
            text: "How serious a problem is having no reliable lease agreement in your rental situation? Rate 1-5.",
            min: 1,
            max: 5,
          },
        ],
      },
      {
        id: "trust_adoption",
        title: "Trust & Adoption",
        part: "Part C — H2 Tenant Trust Signal",
        questions: [
          {
            id: "Q8",
            type: "single",
            required: true,
            text: "Would you trust a tenancy agreement signed using a phone PIN and stored permanently online more, same, or less than a paper lease?",
            options: [
              "More / Zaidi",
              "Same / Sawa",
              "Less / Kidogo",
              "I don't know / Sijui",
            ],
          },
          {
            id: "Q9",
            type: "single",
            required: true,
            core: true,
            coreLabel: "Core H2",
            text: "If your landlord offered a digitally signed, legally enforceable lease - would you prefer that over a paper one?",
            options: [
              "Yes, strongly prefer / Ndio, ninapendelea sana",
              "Yes, slightly prefer / Ndio, ninapendelea kidogo",
              "No preference / Sina upendeleo",
              "Prefer paper / Napendelea karatasi",
            ],
          },
          {
            id: "Q10",
            type: "single",
            required: true,
            text: "Would you pay a small fee (KSh 20-50) to have your tenancy agreement signed and stored digitally even if your landlord won't pay?",
            options: [
              "Yes / Ndio",
              "Maybe / Labda",
              "Only if landlord pays / Tu kama mwenye nyumba atalipa",
              "No / Hapana",
            ],
          },
          {
            id: "Q11",
            type: "single",
            required: true,
            text: "What phone do you use?",
            options: [
              "Basic / feature phone (no internet) / Simu ya kawaida (bila mtandao)",
              "Smartphone, but mostly calls/SMS / Smartphone, lakini hasa simu/SMS",
              "Smartphone with WhatsApp / Smartphone na WhatsApp",
              "Smartphone with regular internet / Smartphone na mtandao wa kawaida",
            ],
          },
          {
            id: "Q12",
            type: "multi",
            required: false,
            text: "What would most reassure you that a digital agreement is legitimate and enforceable? (Mark all that apply)",
            options: [
              "My bank or M-Pesa also uses the same system / Benki yangu au M-Pesa pia hutumia mfumo huo huo",
              "I can verify it online anytime / Ninaweza kuthibitisha mtandaoni wakati wowote",
              "A friend or neighbour has used it / Rafiki au jirani amewahi kuitumia",
              "It is approved by the government / Imeidhinishwa na serikali",
              "A lawyer confirmed it works in court / Wakili alithibitisha inafanya kazi mahakamani",
            ],
          },
          {
            id: "Q13",
            type: "open",
            required: false,
            text: "In your own words, what is the one thing you most wish was different about how rental agreements work in Kenya?",
          },
        ],
      },
    ],
  },
];

// ── THEME TOKENS ──────────────────────────────────────────────────────────────
const C = {
  primary: "#1E3A5F",
  accent: "#C0451A",
  accentL: "#F9EDE8",
  teal: "#1D7A5F",
  tealL: "#E6F4EF",
  sky: "#185FA5",
  skyL: "#E6F1FB",
  purple: "#534AB7",
  purpleL: "#EEEDFE",
  amber: "#BA7517",
  amberL: "#FAEEDA",
  red: "#A32D2D",
  redL: "#FCEBEB",
  bg: "#F0F2F5",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F1923",
  muted: "#64748B",
  sidebar: "#1E3A5F",
};

const PIE_COLORS = [C.accent, C.teal, C.sky, C.purple, C.amber, C.red, "#0891b2", "#65a30d", "#db2777", "#ea580c"];
const INT_PALETTE = [C.accent, C.teal, C.sky, C.purple, C.amber, "#0891b2", "#65a30d", "#db2777", "#ea580c", "#0f766e"];

// ── HELPERS ───────────────────────────────────────────────────────────────────
const pct = (n, t) => (t ? ((n / t) * 100).toFixed(1) : "0.0");
const short = (s, m = 18) => (s?.length > m ? s.slice(0, m) + "…" : s || "–");

function countBy(arr, key) {
  const m = {};
  arr.forEach((r) => {
    const v = r[key];
    if (Array.isArray(v)) v.forEach((x) => { m[x] = (m[x] || 0) + 1; });
    else if (v != null && v !== "") m[v] = (m[v] || 0) + 1;
  });
  return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function durMin(r) {
  if (!r.startedAt || !r.gpsTimestamp) return null;
  const d = Math.round((new Date(r.gpsTimestamp) - new Date(r.startedAt)) / 60000);
  return d > 0 && d < 180 ? d : null;
}

function fmtTime(ts) {
  if (!ts) return "–";
  return new Date(ts).toLocaleString("en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDate(ts) {
  if (!ts) return "–";
  return new Date(ts).toLocaleDateString("en-KE", { month: "short", day: "numeric" });
}

function fmtDateISO(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDuration(start, end) {
  if (!start || !end) return null;
  const ms = new Date(end) - new Date(start);
  if (isNaN(ms) || ms < 0) return null;
  const mins = Math.floor(ms / 60000), secs = Math.floor((ms % 60000) / 1000);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function groupByDay(records) {
  const m = {};
  records.forEach((r) => {
    const d = r.startedAt ? fmtDate(r.startedAt) : "Unknown";
    m[d] = (m[d] || 0) + 1;
  });
  let cum = 0;
  return Object.entries(m).map(([date, count]) => { cum += count; return { date, count, cumulative: cum }; });
}

function hitRateByDay(records) {
  const m = {};
  records.forEach((r) => {
    const d = r.startedAt ? fmtDate(r.startedAt) : "?";
    const int = r.interviewerName || r.interviewerId || "Unknown";
    if (!m[d]) m[d] = {};
    m[d][int] = (m[d][int] || 0) + 1;
  });
  return Object.entries(m).map(([date, byInt]) => {
    const total = Object.values(byInt).reduce((a, b) => a + b, 0);
    const activePpl = Object.keys(byInt).length;
    return { date, total, activePpl, avgPerInt: activePpl ? +(total / activePpl).toFixed(1) : 0, ...byInt };
  });
}

function interviewerStats(records) {
  const m = {};
  records.forEach((r) => {
    const k = r.interviewerName || r.interviewerId || "Unknown";

    if (!m[k]) m[k] = { name: k, id: r.interviewerId || "–", count: 0, surveyIds: new Set(), locations: new Set(), durations: [], days: new Set(), byDay: {}, wtp: 0, disputes: 0 };
    const e = m[k];
    e.count++;
    if (r.surveyId) e.surveyIds.add(r.surveyId);
    if (r.interviewerLocation) e.locations.add(r.interviewerLocation);
    if (r.respondentTown) e.locations.add(r.respondentTown);
    const d = durMin(r);
    if (d) e.durations.push(d);
    if (r.startedAt) {
      const day = fmtDate(r.startedAt);
      e.days.add(day);
      e.byDay[day] = (e.byDay[day] || 0) + 1;
    }
    if (r.Q13?.startsWith("Yes")) e.wtp++;
    if (r.Q6 && !r.Q6.startsWith("Never")) e.disputes++;
  });
  return Object.values(m).map((v) => {
    const durs = v.durations;
    const avgDur = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : null;
    const minDur = durs.length ? Math.min(...durs) : null;
    const maxDur = durs.length ? Math.max(...durs) : null;
    const activeDays = v.days.size;
    const hitRate = activeDays ? +(v.count / activeDays).toFixed(1) : 0;
    const byDayArr = Object.entries(v.byDay).map(([date, cnt]) => ({ date, count: cnt }));
    const qualityScore = Math.min(100, Math.round((v.count / SAMPLE_TARGET) * 40 + (hitRate / 5) * 30 + (activeDays / 10) * 30));
    return { ...v, surveyIds: [...v.surveyIds].join(", ") || "–", locations: [...v.locations].join(", ") || "–", avgDur, minDur, maxDur, activeDays, hitRate, byDayArr, wtpRate: v.count ? pct(v.wtp, v.count) : "0.0", disputeRate: v.count ? pct(v.disputes, v.count) : "0.0", qualityScore };
  }).sort((a, b) => b.count - a.count);
}

// ── CSV HELPERS ───────────────────────────────────────────────────────────────
const META_COLUMNS = [
  { key: "sessionId", label: "Session ID", group: "meta" },
  { key: "surveyId", label: "Survey ID", group: "meta" },
  { key: "surveyTitle", label: "Survey title", group: "meta" },
  { key: "interviewerId", label: "Interviewer ID", group: "interviewer" },
  { key: "interviewerName", label: "Interviewer name", group: "interviewer" },
  { key: "interviewerLocation", label: "Interviewer location", group: "interviewer" },
  { key: "respondentName", label: "Respondent name", group: "respondent" },
  { key: "respondentPhone", label: "Respondent phone", group: "respondent" },
  { key: "respondentTown", label: "Respondent town", group: "respondent" },
  { key: "respondentLocation", label: "Respondent location", group: "respondent" },
  { key: "_gps_lat", label: "GPS latitude", group: "gps" },
  { key: "_gps_lng", label: "GPS longitude", group: "gps" },
  { key: "_gps_accuracy", label: "GPS accuracy (m)", group: "gps" },
  { key: "gpsTimestamp", label: "GPS timestamp", group: "gps" },
  { key: "startedAt", label: "Started at", group: "timing" },
  { key: "submittedAt", label: "Submitted at", group: "timing" },
  { key: "_duration_min", label: "Duration (min)", group: "timing" },
  { key: "submitted", label: "Submitted", group: "timing" },
  { key: "notes", label: "Notes", group: "timing" },
];

const GROUP_COLOR = { meta: "#378ADD", interviewer: "#BA7517", respondent: "#1D9E75", gps: "#D4537E", timing: "#888780", question: "#7F77DD" };

function resolveMetaValue(row, key) {
  if (key === "_gps_lat") return row.gps?.lat ?? row.gps?.latitude ?? "";
  if (key === "_gps_lng") return row.gps?.lng ?? row.gps?.longitude ?? "";
  if (key === "_gps_accuracy") return row.gps?.accuracy ?? "";
  if (key === "_duration_min") {
    if (!row.startedAt || !row.submittedAt) return "";
    const ms = new Date(row.submittedAt) - new Date(row.startedAt);
    return isNaN(ms) ? "" : Math.round(ms / 60000);
  }
  return row[key] ?? "";
}

function escapeCSV(val) {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCSV(rows, survey) {
  const qCols = survey.sections.flatMap((s) => s.questions.map((q) => ({ key: q.id, label: `${q.id}: ${q.text}`, group: "question" })));
  const allCols = [...META_COLUMNS, ...qCols];
  const header = allCols.map((c) => escapeCSV(c.label)).join(",");
  const body = rows.map((row) => allCols.map((c) => c.group === "question" ? escapeCSV(row[c.key] ?? "") : escapeCSV(resolveMetaValue(row, c.key))).join(","));
  return [header, ...body].join("\r\n");
}

function triggerDownload(content, filename) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── CHART TOOLTIP ──────────────────────────────────────────────────────────────
const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.primary, border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, padding: "8px 12px" }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, fontWeight: 700, color: p.color || "#fff" }}>
          {p.name !== "value" ? `${p.name}: ` : ""}{p.value}
        </div>
      ))}
    </div>
  );
};

// ── BADGE ──────────────────────────────────────────────────────────────────────
function Badge({ children, color, bg }) {
  return (
    <span style={{ background: bg || C.tealL, color: color || C.teal, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

// ── KPI CARD ───────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, accent = C.accent }) => (
  <div className="kpi-card">
    <div className="kpi-icon" style={{ color: accent }}>{icon}</div>
    <div className="kpi-value" style={{ color: accent }}>{value}</div>
    <div className="kpi-label">{label}</div>
  </div>
);

// ── SECTION HEAD ───────────────────────────────────────────────────────────────
function SectionHead({ title, sub, badge, badgeColor }) {
  return (
    <div className="sec-head">
      <div>
        <div className="sec-title">{title}</div>
        {sub && <div className="sec-sub">{sub}</div>}
      </div>
      {badge && <span className="sec-badge" style={{ background: badgeColor ? `${badgeColor}18` : C.tealL, color: badgeColor || C.teal }}>{badge}</span>}
    </div>
  );
}

// ── SAMPLE PROGRESS ────────────────────────────────────────────────────────────
function SampleProgress({ totalFiles, completionPct }) {
  return (
    <div className="sb-progress">
      <div className="sb-progress-label">Sample Progress</div>
      <div className="sb-progress-count">{totalFiles}</div>
      <div className="sb-progress-sub">of {SAMPLE_TARGET} target interviews</div>
      <div className="sb-bar-bg">
        <div className="sb-bar-fill" style={{ width: `${Math.min(100, (totalFiles / SAMPLE_TARGET) * 100)}%` }} />
      </div>
      <div className="sb-bar-nums">
        <span>0</span>
        <span style={{ color: "#60a5fa", fontWeight: 600 }}>{completionPct}%</span>
        <span>{SAMPLE_TARGET}</span>
      </div>
    </div>
  );
}

// ── HYPOTHESIS CARDS ───────────────────────────────────────────────────────────
function HypothesisCards({ hadDispute, noWritten, willPay, totalFiles }) {
  const cards = [
    { l: "Had a tenant dispute", v: hadDispute || 0, color: C.accent, badge: "H1 Signal" },
    { l: "No written agreement", v: noWritten || 0, color: C.red, badge: "H1 Root Cause" },
    { l: "Would pay for digital lease", v: willPay || 0, color: C.teal, badge: "H2 Signal" },
  ];
  return (
    <div className="chart-grid-3 fade-up-2">
      {cards.map((s) => (
        <div key={s.l} className="chart-card hyp-card">
          <div className="hyp-label">{s.l}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "8px 0 10px" }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.v}</span>
            <span style={{ fontSize: 12, color: C.muted }}>/ {totalFiles}</span>
          </div>
          <div className="prog-bg">
            <div className="prog-fill" style={{ width: `${pct(s.v, totalFiles)}%`, background: s.color }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 11, color: s.color, fontWeight: 700 }}>{pct(s.v, totalFiles)}%</span>
            <span className="sec-badge" style={{ background: `${s.color}18`, color: s.color }}>{s.badge}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── CHART COMPONENTS ───────────────────────────────────────────────────────────
function CumulativeChart({ byDay }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={byDay} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} domain={[0, SAMPLE_TARGET]} />
        <Tooltip content={<CT />} />
        <Area type="monotone" dataKey="cumulative" fill={`${C.teal}18`} stroke={C.teal} strokeWidth={2} name="Cumulative" />
        <Bar dataKey="count" fill={C.accent} radius={[3, 3, 0, 0]} opacity={0.75} name="Daily" />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function ChartCard({ title, sub, children }) {
  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      {sub && <div className="chart-sub">{sub}</div>}
      {children}
    </div>
  );
}

function BarChartSimple({ data, color }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 9 }} tickFormatter={(v) => short(v, 14)} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip content={<CT />} />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function HBarChart({ data, color }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36 + 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
        <XAxis type="number" tick={{ fontSize: 10 }} />
        <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} tickFormatter={(v) => short(v, 26)} />
        <Tooltip content={<CT />} />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieSimple({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
          label={({ name, percent }) => `${short(name, 14)} ${(percent * 100).toFixed(0)}%`}
          labelLine={false} fontSize={10}>
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── FILTER BAR ─────────────────────────────────────────────────────────────────
function FilterBar({ gInterviewer, setGInterviewer, gSurveyId, setGSurveyId, gLocation, setGLocation, rSubmitted, setRSubmitted, rDateFrom, setRDateFrom, rDateTo, setRDateTo, rSearch, setRSearch, allInterviewers, allSurveyIds, allLocations, hasFilter, onClear }) {
  return (
    <div className="chart-card filter-bar">
      <div className="filter-row">
        <span className="filter-label">Filter</span>
        <select className="filter-select" value={gInterviewer} onChange={(e) => setGInterviewer(e.target.value)}>
          <option value="all">All interviewers</option>
          {allInterviewers.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select className="filter-select" value={gSurveyId} onChange={(e) => setGSurveyId(e.target.value)}>
          <option value="all">All surveys</option>
          {allSurveyIds.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={gLocation} onChange={(e) => setGLocation(e.target.value)}>
          <option value="all">All locations</option>
          {allLocations.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className="filter-select" value={rSubmitted} onChange={(e) => setRSubmitted(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="yes">Submitted</option>
          <option value="no">Not submitted</option>
        </select>
      </div>
      <div className="filter-row" style={{ marginTop: 8 }}>
        <span className="filter-label">Date</span>
        <input className="filter-input" type="date" value={rDateFrom} onChange={(e) => setRDateFrom(e.target.value)} />
        <span className="filter-sep">–</span>
        <input className="filter-input" type="date" value={rDateTo} onChange={(e) => setRDateTo(e.target.value)} />
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input className="search-inp" placeholder="Search name, town, ID…" value={rSearch} onChange={(e) => setRSearch(e.target.value)} />
        </div>
        {hasFilter && <button className="btn-clear" onClick={onClear}>✕ Clear</button>}
      </div>
    </div>
  );
}

// ── RAW RESPONSES TABLE ────────────────────────────────────────────────────────
function RawResponsesTable({ rawFiltered, onView, onDelete, isAdmin = false }) {
  return (
    <div className="chart-card">
      <div className="tbl-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Record ID</th>
              <th>Survey</th>
              <th>Town</th>
              <th>Interviewer</th>
              <th>Date</th>
              <th>Duration</th>
              <th>Status</th>
              <th>GPS</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rawFiltered.map((r, idx) => {
              const d = durMin(r);
              return (
                <tr key={r.id} style={{ background: idx % 2 === 0 ? "transparent" : "#fafbfc" }}>
                  <td className="mono" style={{ color: C.muted }}>{idx + 1}</td>
                  <td className="mono" style={{ color: C.muted, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(r.id || "–").slice(0, 16)}…</td>
                  <td><Badge color={C.sky} bg={C.skyL}>{r.surveyId || "–"}</Badge></td>
                  <td>{r.respondentTown || "–"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{r.interviewerName || "–"}</td>
                  <td className="mono" style={{ color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(r.startedAt)}</td>
                  <td className="mono" style={{ whiteSpace: "nowrap" }}>{d != null ? `${d}m` : "–"}</td>
                  <td><Badge color={r.submitted ? C.teal : C.amber} bg={r.submitted ? C.tealL : C.amberL}>{r.submitted ? "✓ Submitted" : "Pending"}</Badge></td>
                  <td>{r.gps ? <Badge color={C.sky} bg={C.skyL}>📍</Badge> : <span style={{ color: "#ccc" }}>—</span>}</td>
                  {isAdmin && (
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="icon-btn danger" onClick={() => onDelete(r)} title="Delete"><CiTrash /></button>
                        <button className="icon-btn primary" onClick={() => onView(r)} title="View"><CiViewList /></button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rawFiltered.length === 0 && (
          <div className="empty-state"><div className="empty-icon">🔍</div>No results match the current filters.</div>
        )}
      </div>
    </div>
  );
}

// ── CONFIRM DELETE ─────────────────────────────────────────────────────────────
const ConfirmDelete = ({ record, onConfirm, onCancel, deleting }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
      <div className="confirm-title">Delete this response?</div>
      <div className="confirm-body">
        <strong>{record.respondentName || "Unknown"}</strong> · {record.respondentTown || "–"}
        <br />Interviewed by {record.interviewerName || record.interviewerId || "–"} on {fmtDate(record.startedAt)}
        <br /><br />This permanently removes the document from Firestore and cannot be undone.
      </div>
      <div className="confirm-actions">
        <button className="btn-ghost" onClick={onCancel} disabled={deleting}>Cancel</button>
        <button className="btn-danger" onClick={onConfirm} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</button>
      </div>
    </div>
  </div>
);

// ── LOADING SCREEN ─────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 14 }}>
      <div style={{ width: 34, height: 34, border: `3px solid #E2E8F0`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
      <div style={{ fontSize: 13, color: C.muted }}>Loading…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── PREVIEW TABLE (Exporter) ───────────────────────────────────────────────────
function PreviewTable({ rows, survey }) {
  const qCols = survey.sections.flatMap((s) => s.questions.map((q) => ({ key: q.id, label: `${q.id}: ${q.text.length > 46 ? q.text.slice(0, 46) + "…" : q.text}`, group: "question", core: q.core ?? false })));
  const allCols = [...META_COLUMNS, ...qCols];
  const thStyle = (col) => ({ background: "#F8FAFC", fontWeight: 600, fontSize: 10.5, color: "#64748B", padding: "7px 9px", textAlign: "left", borderBottom: "1px solid #E2E8F0", borderTop: `3px solid ${GROUP_COLOR[col.group]}`, whiteSpace: "nowrap", position: "sticky", top: 0, zIndex: 1, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" });
  return (
    <div style={{ overflowX: "auto", maxHeight: "calc(100vh - 420px)", borderRadius: 8, border: "1px solid #E2E8F0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
        <thead>
          <tr>
            {allCols.map((col) => (
              <th key={col.key} style={thStyle(col)} title={col.label}>
                {col.label}
                {col.core && <span style={{ marginLeft: 4, fontSize: 9, background: "#7F77DD22", color: "#7F77DD", border: "0.5px solid #7F77DD55", borderRadius: 4, padding: "1px 4px" }}>core</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={allCols.length} style={{ textAlign: "center", padding: "2.5rem", color: "#94A3B8", fontSize: 13 }}>No responses match the current filters.</td></tr>
          ) : rows.map((row, ri) => (
            <tr key={row.sessionId || ri} onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {allCols.map((col) => {
                const raw = col.group === "question" ? (row[col.key] ?? "") : resolveMetaValue(row, col.key);
                let cell;
                if (col.key === "submitted") {
                  const ok = raw === true || raw === "true";
                  cell = <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 500, background: ok ? "#EAF3DE" : "#FAEEDA", color: ok ? "#27500A" : "#633806" }}>{ok ? "submitted" : "draft"}</span>;
                } else { cell = Array.isArray(raw) ? raw.join("; ") : String(raw); }
                return (
                  <td key={col.key} title={Array.isArray(raw) ? raw.join("; ") : String(raw)} style={{ padding: "6px 9px", borderBottom: "0.5px solid #F0F2F5", whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{cell}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── LOGIN PAGE ─────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError("");
      const { data, error: authErr } = await supabase_two.auth.signInWithPassword(
        { email: email.trim(), password },
      );
      if (authErr) {
        setError("Invalid email or password. Please try again.");
        setLoading(false);
        return;
      }
      if (data) {
        const { data: profile, error: profErr } = await supabase_two
          .from("profiles")
          .select("*")
          .eq("email", email.trim())
          .single();
        if (profErr || !profile) {
          setError("Profile not found. Please contact Darobo R. Center.");
          setLoading(false);
          return;
        }
        onLogin({
          id: profile.id,
          role: profile.role,
          email: profile.email,
          name: profile.fullname,
        });
        setLoading(false);
      }
    };

  return (
    <>
      <style>{loginCss}</style>
      <div className="login-shell">
        <div className="login-brand-panel">
          <div className="login-brand-inner">
            <div className="login-wordmark">DAROBO</div>
            <div className="login-tagline">
              Transforming data into actionable market intelligence.
            </div>
            <div className="login-brand-stats">
              <div className="lbs-item">
                <div className="lbs-num">30+</div>
                <div className="lbs-lbl">Projects completed</div>
              </div>
              <div className="lbs-item">
                <div className="lbs-num">220</div>
                <div className="lbs-lbl">Field agents</div>
              </div>
              <div className="lbs-item">
                <div className="lbs-num">KE</div>
                <div className="lbs-lbl">Region & towns</div>
              </div>
            </div>
          </div>
        </div>
        <div className="login-form-panel">
          <div className="login-card">
            <div className="login-card-head">
              <div className="login-card-title">Sign in</div>
              <div className="login-card-sub">
                Enter your credentials
              </div>
            </div>
            <form onSubmit={handleLogin} className="lf-form">
              <div className="lf-field">
                <label className="lf-label">Email address</label>
                <div className="lf-input-wrap">
                  <CiMail className="lf-icon" />
                  <input
                    className="lf-input"
                    type="email"
                    placeholder="you@darobo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="lf-field">
                <label className="lf-label">Password</label>
                <div className="lf-input-wrap">
                  <CiLock className="lf-icon" />
                  <input
                    className="lf-input"
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="lf-toggle"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              {error && <div className="lf-error">⚠ {error}</div>}
              <button className="lf-btn" type="submit" disabled={loading}>
                {loading && <span className="lf-spinner" />}
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
            <div className="lf-register">
              <div className="lf-register-title">No account?</div>
              <div className="lf-register-body">
                Contact Darobo Research Center to get access credentials.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── CLIENT DASHBOARD ───────────────────────────────────────────────────────────
export function ClientDashboard({ records, user, onLogout }) {
  const [activeSec, setActiveSec] = useState("summary");
  const [gInterviewer, setGInterviewer] = useState("all");
  const [gSurveyId, setGSurveyId] = useState("all");
  const [gLocation, setGLocation] = useState("all");
  const [rSearch, setRSearch] = useState("");
  const [rDateFrom, setRDateFrom] = useState("");
  const [rDateTo, setRDateTo] = useState("");
  const [rSubmitted, setRSubmitted] = useState("all");

  const allInterviewers = useMemo(() => [...new Set(records.map((r) => r.interviewerName).filter(Boolean))].sort(), [records]);
  const allSurveyIds = useMemo(() => [...new Set(records.map((r) => r.surveyId).filter(Boolean))].sort(), [records]);
  const allLocations = useMemo(() => [...new Set(records.flatMap((r) => [r.interviewerLocation, r.respondentTown]).filter(Boolean))].sort(), [records]);

  const filtered = useMemo(() => records.filter((r) => {
    if (gInterviewer !== "all" && r.interviewerName !== gInterviewer) return false;
    if (gSurveyId !== "all" && r.surveyId !== gSurveyId) return false;
    if (gLocation !== "all" && r.interviewerLocation !== gLocation && r.respondentTown !== gLocation) return false;
    return true;
  }), [records, gInterviewer, gSurveyId, gLocation]);

  const rawFiltered = useMemo(() => filtered.filter((r) => {
    if (rSubmitted !== "all") { if (rSubmitted === "yes" && !r.submitted) return false; if (rSubmitted === "no" && r.submitted) return false; }
    if (rDateFrom && fmtDateISO(r.startedAt) < rDateFrom) return false;
    if (rDateTo && fmtDateISO(r.startedAt) > rDateTo) return false;
    if (rSearch) { const q = rSearch.toLowerCase(); return [r.respondentName, r.interviewerName, r.respondentTown, r.surveyId].some((v) => v?.toLowerCase().includes(q)); }
    return true;
  }), [filtered, rSearch, rDateFrom, rDateTo, rSubmitted]);

  const hasFilter = rSearch || rDateFrom || rDateTo || rSubmitted !== "all";
  const clearFilter = () => { setRSearch(""); setRDateFrom(""); setRDateTo(""); setRSubmitted("all"); };

  const totalFiles = filtered.length;
  const completionPct = pct(totalFiles, SAMPLE_TARGET);
  const durations = filtered.map(durMin).filter(Boolean);
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const willPay = filtered.filter((r) => r.Q13?.startsWith("Yes")).length;
  const hadDispute = filtered.filter((r) => r.Q6 && !r.Q6.startsWith("Never")).length;
  const intStats = useMemo(() => interviewerStats(filtered), [filtered]);
  const byDay = useMemo(() => groupByDay(filtered), [filtered]);
  const q13data = useMemo(() => countBy(filtered, "Q13"), [filtered]);
  const q6data = useMemo(() => countBy(filtered, "Q6"), [filtered]);
  const q2data = useMemo(() => countBy(filtered, "Q2"), [filtered]);
  const q3data = useMemo(() => countBy(filtered, "Q3"), [filtered]);
  const q12data = useMemo(() => countBy(filtered, "Q12"), [filtered]);

  const nav = [
    { id: "summary", icon: <CiLineHeight />, label: "Summary" },
    { id: "h1", icon: <CiTempHigh />, label: "H1 Pain Signal" },
    { id: "h2", icon: <CiBag1 />, label: "H2 WTP Signal" },
    { id: "property", icon: <CiViewList />, label: "Property Profile" },
    { id: "progress", icon: <CiViewTimeline />, label: "Field Progress" },
    { id: "responses", icon: <CiViewTable />, label: "Surveys List" },
  ];

  return (
    <>
      <style>{dashCss}</style>
      <div className="dash-main">
        <header className="topbar">
          <span className="tb-brand">DAROBO</span>
          <div className="tb-divider" />
          <span style={{ marginRight: "auto", color: "#fff" }}>
            {" "}
            Project-AhidiApp
          </span>
          <span className="tb-live">
            <span className="pulse" /> Live
          </span>
          <span className="tb-pill muted">Client View</span>
          <button className="tb-btn" onClick={onLogout}>
            <CiLogout /> Sign out
          </button>
        </header>
        <div className="body-content">
          <aside className="sidebar">
            <span className="tb-user">
              <CiUser /> {user.name}
            </span>
            <div className="sb-role-badge">Client View</div>
            <div className="sb-section-label">Reports</div>
            {nav.map((n) => (
              <button
                key={n.id}
                className={`sb-item${activeSec === n.id ? " active" : ""}`}
                onClick={() => setActiveSec(n.id)}
              >
                <span className="sb-icon">{n.icon}</span>
                {n.label}
              </button>
            ))}
            <div className="sb-divider" />
            <SampleProgress
              totalFiles={totalFiles}
              completionPct={completionPct}
            />
          </aside>
          <main className="main">
            <div className="contents">
              {activeSec === "summary" && (
                <>
                  <div className="kpi-row fade-up">
                    <KpiCard
                      icon={<CiFolderOn />}
                      label="Total Responses"
                      value={totalFiles}
                      accent={C.accent}
                    />
                    <KpiCard
                      icon={<CiViewList />}
                      label="Sample Progress"
                      value={`${completionPct}%`}
                      accent={C.teal}
                    />
                    <KpiCard
                      icon={<CiClock1 />}
                      label="Avg Duration"
                      value={`${avgDuration}m`}
                      accent={C.sky}
                    />
                    <KpiCard
                      icon={<CiUser />}
                      label="Field Agents"
                      value={intStats.length}
                      accent={C.purple}
                    />
                  </div>
                  <SectionHead
                    title="Key Hypothesis Signals"
                    sub={`Core validation metrics — n=${totalFiles}`}
                  />
                  <HypothesisCards
                    hadDispute={hadDispute}
                    willPay={willPay}
                    totalFiles={totalFiles}
                  />
                  <div className="chart-card fade-up-3">
                    <div className="chart-title">Cumulative Progress</div>
                    <div className="chart-sub">
                      Running total vs {SAMPLE_TARGET} target
                    </div>
                    <CumulativeChart byDay={byDay} />
                  </div>
                </>
              )}
              {activeSec === "h1" && (
                <>
                  <SectionHead
                    title="H1 — Pain Signal Analysis"
                    sub="Dispute frequency and documentation gaps"
                    badge="H1 Validation"
                    badgeColor={C.accent}
                  />
                  <div className="chart-grid-2 fade-up">
                    <ChartCard
                      title="Dispute Frequency"
                      sub="Q6 — How often disputes occur"
                    >
                      <BarChartSimple data={q6data} color={C.accent} />
                    </ChartCard>
                    <ChartCard
                      title="Trust Factors"
                      sub="Q12 — What builds digital lease trust?"
                    >
                      <HBarChart data={q12data} color={C.red} />
                    </ChartCard>
                  </div>
                </>
              )}
              {activeSec === "h2" && (
                <>
                  <SectionHead
                    title="H2 — Willingness to Pay Signal"
                    sub="Digital lease adoption and pricing"
                    badge="H2 Validation"
                    badgeColor={C.teal}
                  />
                  <div className="chart-grid-2 fade-up">
                    <ChartCard
                      title="Would Pay for Digital Lease?"
                      sub="Q13 — Core H2 signal"
                    >
                      <PieSimple data={q13data} />
                    </ChartCard>
                    <ChartCard
                      title="Agreement Type"
                      sub="Q3 — Current lease documentation"
                    >
                      <BarChartSimple data={q3data} color={C.teal} />
                    </ChartCard>
                  </div>
                </>
              )}
              {activeSec === "property" && (
                <>
                  <SectionHead
                    title="Property & Respondent Profile"
                    sub="Segment characteristics"
                  />
                  <div className="chart-grid-2 fade-up">
                    <ChartCard
                      title="Rent Range"
                      sub="Q2 — Monthly rent distribution"
                    >
                      <BarChartSimple data={q2data} color={C.sky} />
                    </ChartCard>
                    <ChartCard
                      title="Agreement Type"
                      sub="Q3 — Lease documentation"
                    >
                      <PieSimple data={q3data} />
                    </ChartCard>
                    <ChartCard
                      title="Respondent Locations"
                      sub="Geographic spread"
                    >
                      <HBarChart
                        data={countBy(filtered, "respondentTown").slice(0, 10)}
                        color={C.teal}
                      />
                    </ChartCard>
                  </div>
                </>
              )}
              {activeSec === "progress" && (
                <>
                  <SectionHead
                    title="Field Progress Overview"
                    sub="Submission pace and team performance"
                  />
                  <div className="kpi-row fade-up">
                    <KpiCard
                      icon={<CiFloppyDisk />}
                      label="Collected"
                      value={totalFiles}
                      accent={C.accent}
                    />
                    <KpiCard
                      icon={<CiFolderOn />}
                      label="Remaining"
                      value={Math.max(0, SAMPLE_TARGET - totalFiles)}
                      accent={C.red}
                    />
                    <KpiCard
                      icon={<CiViewTimeline />}
                      label="Active Days"
                      value={byDay.length}
                      accent={C.sky}
                    />
                    <KpiCard
                      icon={<CiUser />}
                      label="Field Agents"
                      value={intStats.length}
                      accent={C.purple}
                    />
                  </div>
                  <div className="chart-card fade-up-2">
                    <div className="chart-title">Cumulative Submissions</div>
                    <div className="chart-sub">
                      Daily and running total vs {SAMPLE_TARGET} target
                    </div>
                    <CumulativeChart byDay={byDay} />
                  </div>
                </>
              )}
              {activeSec === "responses" && (
                <>
                  <SectionHead
                    title="Surveys List"
                    sub={`${rawFiltered.length} of ${filtered.length} records`}
                  />
                  <FilterBar
                    gInterviewer={gInterviewer}
                    setGInterviewer={setGInterviewer}
                    gSurveyId={gSurveyId}
                    setGSurveyId={setGSurveyId}
                    gLocation={gLocation}
                    setGLocation={setGLocation}
                    rSubmitted={rSubmitted}
                    setRSubmitted={setRSubmitted}
                    rDateFrom={rDateFrom}
                    setRDateFrom={setRDateFrom}
                    rDateTo={rDateTo}
                    setRDateTo={setRDateTo}
                    rSearch={rSearch}
                    setRSearch={setRSearch}
                    allInterviewers={allInterviewers}
                    allSurveyIds={allSurveyIds}
                    allLocations={allLocations}
                    hasFilter={hasFilter}
                    onClear={clearFilter}
                  />
                  <RawResponsesTable
                    rawFiltered={rawFiltered}
                    onView={() => {}}
                    onDelete={() => {}}
                    isAdmin={false}
                  />
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

// ── CSS STRINGS ────────────────────────────────────────────────────────────────
const loginCss = `
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  font-family:
    "Inter",
    system-ui,
    -apple-system,
    sans-serif;
  background: #0f1923;
}
.login-shell {
  display: flex;
  min-height: 100vh;
}
.login-brand-panel {
  flex: 0 0 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: #06396d;
}
.login-brand-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 30% 40%,
    rgba(240, 113, 67, 0.336) 0%,
    transparent 40%
  );
}
.login-brand-inner {
  position: relative;
  z-index: 1;
  padding: 3rem;
  text-align: left;
}
.login-wordmark {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #fff;
  background: linear-gradient(135deg, #ffffff 60%, #000000 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.login-tagline {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.514);
  margin-top: 6px;
  letter-spacing: 0.05em;
}
.login-brand-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 56px;
  padding-top: 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.lbs-item {
  text-align: center;
}
.lbs-num {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
}
.lbs-lbl {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.521);
  margin-top: 4px;
  letter-spacing: 0.06em;
}
.login-form-panel {
  flex: 1;
  background: #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
.login-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 2.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}
.login-card-head {
  margin-bottom: 2rem;
}
.login-card-title {
  font-size: 22px;
  font-weight: 700;
  color: #0f1923;
}
.login-card-sub {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}
.lf-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.lf-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lf-label {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.lf-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.lf-icon {
  position: absolute;
  left: 12px;
  font-size: 17px;
  color: #94a3b8;
}
.lf-input {
  width: 100%;
  padding: 10px 12px 10px 38px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: #f8fafc;
  color: #0f1923;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  outline: none;
}
.lf-input:focus {
  border-color: #c0451a;
  box-shadow: 0 0 0 3px rgba(192, 69, 26, 0.12);
}
.lf-toggle {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
}
.lf-error {
  background: #fcebeb;
  color: #a32d2d;
  border: 1px solid #f7c1c1;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
}
.lf-btn {
  padding: 12px;
  background: #c0451a;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition:
    background 0.15s,
    transform 0.1s;
}
.lf-btn:hover:not(:disabled) {
  background: #a33915;
}
.lf-btn:active {
  transform: scale(0.98);
}
.lf-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.lf-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
.lf-register {
  margin-top: 24px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}
.lf-register-title {
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}
.lf-register-body {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}
@media (max-width: 720px) {
  .login-brand-panel {
    display: none;
  }
   .sidebar {
    display: none;
  }
  .login-card {
    border: none;
    box-shadow: none;
    padding: 2rem 1.5rem;
  }
}

`;

const dashCss = `
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
html,
body,
#root {
  height: 100%;
  font-family:
    "Inter",
    system-ui,
    -apple-system,
    sans-serif;
  background: #ffffff;
  color: #0f1923;
  font-size: 13px;
}
.dash-main {
  display: grid;
  grid-template-rows: 35px 1fr;
  height: 100vh;
  overflow: hidden;
  width: 95%;
  margin: 5px auto;
    background: #f0f2f5;
}
.body-content {
  display: grid;
  grid-template-columns: 200px 1fr;
  overflow: hidden;
  height: 100%;
}
.topbar {
  background: #06396d;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.39);
}
.tb-brand {
  font-weight: 800;
  letter-spacing: 0.1em;
  font-size: 15px;
  background: linear-gradient(135deg, #fff 50%, #c0451a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-right: 4px;
}
.tb-divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.12);
  margin: 0 10px;
}
.tb-live {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  margin-right: 20px;
  color: rgba(255, 255, 255, 0.5);
}
.pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3);
  }
  50% {
    box-shadow: 0 0 0 5px rgba(34, 197, 94, 0);
  }
}
.tb-pill {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.tb-pill.green {
  color: #86efac;
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.2);
}
.tb-pill.admin {
  font-size: 15px;
  border-radius: 0;
  color: #ff4524;
  text-align: center;
  margin-bottom: 5px;
  background: #f7efec;
}
.tb-pill.muted {
  color: rgba(255, 255, 255, 0.35);
  background: transparent;
  border-color: rgba(255, 255, 255, 0.06);
}
.tb-btn {
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  letter-spacing: 0.02em;
  transition: background 0.15s;
}
.tb-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}
.tb-user {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
}
.sidebar {
  background: #ffffff;
  border: 1px solid rgba(207, 207, 207, 0.637);
  overflow-y: auto;
  padding: 0px 15px 20px;
  display: flex;
  margin: 10px 0;
  margin-left: 5px;
  border-radius: 8px;
  flex-direction: column;
}
.sb-section-label {
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 8px 16px 4px;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #b0b8c8;
  margin-top: 4px;
}
.sb-role-badge {
  margin: 0 12px 12px;
  padding: 6px 10px;
  background: rgba(192, 69, 26, 0.15);
  border: 1px solid rgba(192, 69, 26, 0.25);
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #f97316;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-align: center;
}
.sb-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 16px;
  margin: 1px 8px;
  border-radius: 7px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  width: calc(100% - 16px);
  transition:
    background 0.12s,
    color 0.12s;
}

.sb-item {
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #4a5568;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  align-items: center;
  transition: all 0.15s;
}
.sb-item:hover {
  background: #fff1f1;
  color: var(--primary);
}
.sb-item.active {
  color: var(--sky);
  font-weight: 600;
  background: #def2ff83;
}

.sb-icon {
  font-size: 16px;
  display: flex;
  align-items: center;
  opacity: 0.7;
}
.sb-item.active .sb-icon {
  opacity: 1;
}
.sb-divider {
  height: 1px;
  background: rgb(199, 85, 85);
  margin: 12px 16px;
}
.sb-filters {
  padding: 4px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sb-progress {
  padding: 16px 14px;
  margin: auto 0 0;
}
.sb-progress-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(255, 72, 72);
  margin-bottom: 8px;
}
.sb-progress-count {
  font-size: 28px;
  font-weight: 800;
  color: #ff3f3f;
  line-height: 1;
}
.sb-progress-sub {
  font-size: 10px;
  color: rgba(157, 203, 255, 0.35);
  margin-top: 3px;
  margin-bottom: 10px;
}
.sb-bar-bg {
  height: 5px;
  background: rgba(255, 255, 255, 0.808);
  border-radius: 10px;
  overflow: hidden;
}
.sb-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a8bc0, #1665f9);
  border-radius: 10px;
  transition: width 0.5s ease;
}
.sb-bar-nums {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.3);
}

.sb-filters {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}

.sb-icon {
  font-size: 16px;
  text-align: center;
}
.sb-divider {
  height: 1px;
  background: var(--border);
  margin: 10px 0;
}
.sb-progress {
  padding: 4px 8px 10px;
}
.sb-progress-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b0b8c8;
  font-family: var(--mono);
  margin-bottom: 4px;
}
.sb-progress-count {
  font-size: 22px;
  font-weight: 700;
  color: var(--sky);
  font-family: var(--mono);
}
.sb-progress-sub {
  font-size: 11px;
  color: var(--muted);
}
.sb-bar-bg {
  height: 5px;
  background: var(--border);
  border-radius: 100px;
  overflow: hidden;
  margin: 6px 0 4px;
}
.sb-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--sky), #60aeff);
  border-radius: 100px;
  transition: width 0.6s ease;
}
.sb-bar-nums {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-family: var(--mono);
  color: var(--muted);
}
.main {
  overflow-y: auto;
  background: #f0f2f5;
  padding: 20px;
}
.contents {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
}
.kpi-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.kpi-icon {
  font-size: 20px;
  margin-bottom: 4px;
}
.kpi-value {
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
}
.kpi-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}
.sec-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 4px;
}
.sec-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f1923;
}
.sec-sub {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}
.sec-badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.chart-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  padding: 16px 18px;
}
.chart-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f1923;
  margin-bottom: 3px;
}
.chart-sub {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 12px;
}
.chart-grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}
.chart-grid-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}
.hyp-card {
  display: flex;
  flex-direction: column;
}
.hyp-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.prog-bg {
  height: 6px;
  background: #f0f2f5;
  border-radius: 10px;
  overflow: hidden;
  flex: 1;
}
.prog-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.4s ease;
}
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-label {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.filter-select {
  padding: 5px 10px;
  border: 1.5px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  color: #0f1923;
  background: #fff;
  cursor: pointer;
  outline: none;
}
.filter-select:focus {
  border-color: #c0451a;
}
.filter-input {
  padding: 5px 10px;
  border: 1.5px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  color: #0f1923;
  background: #fff;
  outline: none;
}
.filter-sep {
  color: #94a3b8;
  font-size: 12px;
}
.search-wrap {
  position: relative;
  flex: 1;
  min-width: 200px;
}
.search-icon {
  position: absolute;
  left: 9px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 16px;
}
.search-inp {
  width: 100%;
  padding: 5px 10px 5px 28px;
  border: 1.5px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  color: #0f1923;
  background: #fff;
  outline: none;
}
.search-inp:focus,
.filter-input:focus {
  border-color: #c0451a;
}
.btn-clear {
  padding: 5px 12px;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
}
.btn-clear:hover {
  border-color: #c0451a;
  color: #c0451a;
}
.tbl-wrap {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.data-table th {
  background: #f8fafc;
  padding: 8px 12px;
  text-align: left;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
  position: sticky;
  top: 0;
}
.data-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f2f5;
  color: #0f1923;
  vertical-align: middle;
}
.data-table tr:last-child td {
  border-bottom: none;
}
.data-table tbody tr:hover {
  background: #f8fafc;
}
.mono {
  font-family: "JetBrains Mono", "Fira Mono", monospace;
  font-size: 11px;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 3rem;
  color: #94a3b8;
  font-size: 13px;
}
.empty-icon {
  font-size: 28px;
}
.loader-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 14px;
}
.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #e2e8f0;
  border-top-color: #c0451a;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.loader-text {
  font-size: 13px;
  color: #94a3b8;
}
.int-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.int-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  padding: 14px 16px;
  transition: box-shadow 0.15s;
}
.int-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
.int-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.int-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.int-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f1923;
}
.int-id {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 2px;
}
.int-stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.int-stat {
  text-align: center;
  background: #f8fafc;
  border-radius: 7px;
  padding: 8px 4px;
}
.int-stat-val {
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}
.int-stat-lbl {
  font-size: 9px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 2px;
}
.int-meta {
  font-size: 10px;
  color: #94a3b8;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.int-progress-lbl {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 10px;
}
.int-progress {
  margin-top: 10px;
}
.timeline-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid #f0f2f5;
  font-size: 11px;
}
.timeline-row:last-child {
  border-bottom: none;
}
.tl-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.tl-name {
  font-weight: 600;
  color: #0f1923;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tl-meta {
  color: #94a3b8;
  white-space: nowrap;
}
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  font-size: 15px;
  transition: all 0.12s;
}
.icon-btn.danger:hover {
  background: #fcebeb;
  border-color: #f7c1c1;
  color: #a32d2d;
}
.icon-btn.primary:hover {
  background: #e6f1fb;
  border-color: #b5d4f4;
  color: #185fa5;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}
.confirm-box {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 420px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}
.confirm-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f1923;
  margin-bottom: 12px;
}
.confirm-body {
  font-size: 13px;
  color: #374151;
  line-height: 1.6;
  margin-bottom: 20px;
}
.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.btn-ghost {
  padding: 8px 16px;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
}
.btn-ghost:hover {
  border-color: #c0451a;
  color: #c0451a;
}
.btn-danger {
  padding: 8px 16px;
  background: #a32d2d;
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}
.btn-danger:hover {
  background: #7a2020;
}
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #64748b;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 0 8px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.back-btn:hover {
  color: #c0451a;
}
.fade-up {
  animation: fadeUp 0.35s ease both;
}
.fade-up-2 {
  animation: fadeUp 0.35s 0.08s ease both;
}
.fade-up-3 {
  animation: fadeUp 0.35s 0.16s ease both;
}
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.sidebar::-webkit-scrollbar {
  width: 3px;
}

`;

const otherSTYLES = `

`;

// ── ADMIN DASHBOARD ────────────────────────────────────────────────────────────
export default function SurveyDashboard() {
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSec, setActiveSec] = useState("overview");
  const [selectedInt, setSelectedInt] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [pendingDel, setPendingDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [exportMsg, setExportMsg] = useState("");

  // Global filters
  const [gInterviewer, setGInterviewer] = useState("all");
  const [gSurveyId, setGSurveyId] = useState("all");
  const [gLocation, setGLocation] = useState("all");

  // Raw filters
  const [rSearch, setRSearch] = useState("");
  const [rDateFrom, setRDateFrom] = useState("");
  const [rDateTo, setRDateTo] = useState("");
  const [rSubmitted, setRSubmitted] = useState("all");

  // Export states
  const [activeSurveyId, setActiveSurveyId] = useState("tenant");
  const [filterSubmitted, setFilterSubmitted] = useState("");
  const [filterInterviewer, setFilterInterviewer] = useState("");
  const [search, setSearch] = useState("");

  const logActivity = (msg) => setActivityLog((prev) => [{ ts: new Date().toLocaleTimeString(), msg }, ...prev.slice(0, 49)]);

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const snap = await getDocs(collection(db, "AnswersDB"));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRecords(data);
        logActivity(`Refreshed — ${data.length} records loaded`);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
  
  
  useEffect(() => { if (user) fetchData(); }, [user]);

  const handleLogin = (u) => setUser(u);
  const handleLogout = () => { setUser(null); setRecords([]); setActiveSec("overview"); };

  const handleDeleteConfirm = async () => {
    if (!pendingDel) return;
    setDeleting(true);
    try {
      // await deleteDoc(doc(db, "AnswersDB", pendingDel.id));
      setRecords((prev) => prev.filter((r) => r.id !== pendingDel.id));
      logActivity(`Deleted: ${pendingDel.respondentName || pendingDel.id}`);
      setPendingDel(null);
    } catch (e) { alert("Delete failed: " + e.message); }
    finally { setDeleting(false); }
  };

  const allInterviewers = useMemo(() => [...new Set(records.map((r) => r.interviewerName).filter(Boolean))].sort(), [records]);
  const allSurveyIds = useMemo(() => [...new Set(records.map((r) => r.surveyId).filter(Boolean))].sort(), [records]);
  const allLocations = useMemo(() => [...new Set(records.flatMap((r) => [r.interviewerLocation, r.respondentTown]).filter(Boolean))].sort(), [records]);

  const filtered = useMemo(() => records.filter((r) => {
    if (gInterviewer !== "all" && r.interviewerName !== gInterviewer) return false;
    if (gSurveyId !== "all" && r.surveyId !== gSurveyId) return false;
    if (gLocation !== "all" && r.interviewerLocation !== gLocation && r.respondentTown !== gLocation) return false;
    return true;
  }), [records, gInterviewer, gSurveyId, gLocation]);

  const rawFiltered = useMemo(() => filtered.filter((r) => {
    if (rSubmitted !== "all") { if (rSubmitted === "yes" && !r.submitted) return false; if (rSubmitted === "no" && r.submitted) return false; }
    if (rDateFrom && fmtDateISO(r.startedAt) < rDateFrom) return false;
    if (rDateTo && fmtDateISO(r.startedAt) > rDateTo) return false;
    if (rSearch) { const q = rSearch.toLowerCase(); return [r.respondentName, r.interviewerName, r.respondentTown, r.respondentLocation, r.interviewerId, r.surveyId].some((v) => v?.toLowerCase().includes(q)); }
    return true;
  }), [filtered, rSearch, rDateFrom, rDateTo, rSubmitted]);

  const hasRawFilter = rSearch || rDateFrom || rDateTo || rSubmitted !== "all";
  const clearRawFilters = () => { setRSearch(""); setRDateFrom(""); setRDateTo(""); setRSubmitted("all"); };
  const intStats = useMemo(() => interviewerStats(filtered), [filtered]);
  const byDay = useMemo(() => groupByDay(filtered), [filtered]);
  const hitRate = useMemo(() => hitRateByDay(filtered), [filtered]);
  const totalFiles = filtered.length;
  const completionPct = pct(totalFiles, SAMPLE_TARGET);
  const durations = useMemo(() => filtered.map(durMin).filter(Boolean), [filtered]);
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const willPay = useMemo(() => filtered.filter((r) => r.Q13?.startsWith("Yes")).length, [filtered]);
  const hadDispute = useMemo(() => filtered.filter((r) => r.Q6 && !r.Q6.startsWith("Never")).length, [filtered]);
  const noWritten = useMemo(() => filtered.filter((r) => r.Q3 === "Only a verbal agreement / Makubaliano ya mdomo tu" || r.Q7 === "No, we had no written agreement").length, [filtered]);
  const gpsCoverage = useMemo(() => filtered.filter((r) => r.gps).length, [filtered]);
  const submittedCount = useMemo(() => filtered.filter((r) => r.submitted).length, [filtered]);

  // Exporter
  const activeSurvey = useMemo(() => SURVEYS.find((s) => s.id === activeSurveyId) ?? SURVEYS[0], [activeSurveyId]);
  const surveyRows = useMemo(() => records.filter((r) => r.surveyId === activeSurveyId), [records, activeSurveyId]);
  const interviewers = useMemo(() => [...new Set(surveyRows.map((r) => r.interviewerName))].sort(), [surveyRows]);
  const filteredRows = useMemo(() => surveyRows.filter((r) => {
    if (filterSubmitted === "submitted" && !r.submitted) return false;
    if (filterSubmitted === "draft" && r.submitted) return false;
    if (filterInterviewer && r.interviewerName !== filterInterviewer) return false;
    if (search) { const q = search.toLowerCase(); if (!["sessionId", "respondentName", "respondentPhone", "respondentTown"].some((k) => String(r[k] ?? "").toLowerCase().includes(q))) return false; }
    return true;
  }), [surveyRows, filterSubmitted, filterInterviewer, search]);
  const questions = activeSurvey.sections.reduce((n, s) => n + s.questions.length, 0);
  const submitted = filteredRows.filter((r) => r.submitted).length;

  const handleExport = useCallback(() => {
    if (!filteredRows.length) { setExportMsg({ type: "info", text: "No responses to export with current filters." }); return; }
    const csv = buildCSV(filteredRows, activeSurvey);
    const filename = `darobo_${activeSurveyId}_responses_${new Date().toISOString().slice(0, 10)}.csv`;
    triggerDownload(csv, filename);
    setExportMsg({ type: "ok", text: `Exported ${filteredRows.length} rows · ${filename}` });
  }, [filteredRows, activeSurvey, activeSurveyId]);

  // Chart data
  const q6data = useMemo(() => countBy(filtered, "Q6"), [filtered]);
  const q3data = useMemo(() => countBy(filtered, "Q3"), [filtered]);
  const q4data = useMemo(() => countBy(filtered, "Q4"), [filtered]);
  const q2data = useMemo(() => countBy(filtered, "Q2"), [filtered]);
  const q12data = useMemo(() => countBy(filtered, "Q12"), [filtered]);
  const q13data = useMemo(() => countBy(filtered, "Q13"), [filtered]);

  const navItems = [
    { id: "overview", icon: <CiLineHeight />, label: "Overview" },
    { id: "collection", icon: <CiViewList />, label: "Data Collection" },
    { id: "interviewers", icon: <CiBoxList />, label: "Interviewer Stats" },
    { id: "h1", icon: <CiTempHigh />, label: "H1 - Pain Signal" },
    { id: "h2", icon: <CiBag1 />, label: "H2 - WTP Signal" },
    { id: "property", icon: <CiViewList />, label: "Property Profile" },
    { id: "responses", icon: <CiViewTable />, label: "Surveys List" },
    { id: "exporter", icon: <CiExport />, label: "CSV Exporter" },
    { id: "activity", icon: <CiDatabase />, label: "Activity Log" },
  ];

  if (!user) return <LoginPage onLogin={handleLogin} />;
  if (user.role === "client") {
    if (loading) return <LoadingScreen />;
    return <ClientDashboard records={records} user={user} onLogout={handleLogout} />;
  }

  return (
    <>
      <style>{dashCss}</style>
      <style>{otherSTYLES}</style>
      {pendingDel && (
        <ConfirmDelete
          record={pendingDel}
          onConfirm={handleDeleteConfirm}
          onCancel={() => !deleting && setPendingDel(null)}
          deleting={deleting}
        />
      )}
      <div className="dash-main">
        <header className="topbar">
          <span className="tb-brand">DAROBO</span>
          <div className="tb-divider" />

          <span style={{ marginRight: "auto", color: "#fff" }}>
            Project-AhidiApp
          </span>

          <span className="tb-live">
            <span className="pulse" /> Live
          </span>

          <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
            <button className="tb-btn" onClick={() => setActiveSec("exporter")}>
              <CiExport /> Export CSV
            </button>

            <button className="tb-btn" onClick={fetchData}>
              ↻ Refresh
            </button>

            <button className="tb-btn" onClick={handleLogout}>
              <CiLogout /> Sign out
            </button>
          </div>
        </header>

        <div className="body-content">
          <aside className="sidebar">
            <span className="tb-pill admin">⚙ Admin</span>
            <div className="sb-section-label">Global Filter</div>
            <div className="sb-filters">
              <select
                className="filter-select"
                value={gInterviewer}
                onChange={(e) => setGInterviewer(e.target.value)}
              >
                <option value="all">All interviewers</option>
                {allInterviewers.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
              <select
                className="filter-select"
                value={gSurveyId}
                onChange={(e) => setGSurveyId(e.target.value)}
              >
                <option value="all">All surveys</option>
                {allSurveyIds.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                className="filter-select"
                value={gLocation}
                onChange={(e) => setGLocation(e.target.value)}
              >
                <option value="all">All locations</option>
                {allLocations.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              {(gInterviewer !== "all" ||
                gSurveyId !== "all" ||
                gLocation !== "all") && (
                <button
                  className="btn-clear"
                  onClick={() => {
                    setGInterviewer("all");
                    setGSurveyId("all");
                    setGLocation("all");
                  }}
                >
                  ✕ Clear filters
                </button>
              )}
            </div>
            <div className="sb-divider" />
            <div className="sb-section-label">Navigation</div>
            {navItems.map((n) => (
              <button
                key={n.id}
                className={`sb-item${activeSec === n.id ? " active" : ""}`}
                onClick={() => {
                  setActiveSec(n.id);
                  setSelectedInt(null);
                }}
              >
                <span className="sb-icon">{n.icon}</span>
                {n.label}
              </button>
            ))}
            <div className="sb-divider" />
            <SampleProgress
              totalFiles={totalFiles}
              completionPct={completionPct}
            />
          </aside>

          <main className="main">
            <div className="contents">
              {loading ? (
                <div className="loader-wrap">
                  <div className="spinner" />
                  <div className="loader-text">Fetching survey responses…</div>
                </div>
              ) : error ? (
                <div className="empty-state">
                  <div className="empty-icon">⚠️</div>
                  <strong>Firebase Error</strong>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                    {error}
                  </div>
                </div>
              ) : (
                <>
                  {/* ── OVERVIEW ── */}
                  {activeSec === "overview" && (
                    <>
                      <div className="kpi-row fade-up">
                        <KpiCard
                          icon={<CiFolderOn />}
                          label="Responses"
                          value={totalFiles}
                          accent={C.accent}
                        />
                        <KpiCard
                          icon={<CiViewList />}
                          label="Sample %"
                          value={`${completionPct}%`}
                          accent={C.teal}
                        />
                        <KpiCard
                          icon={<CiClock1 />}
                          label="Avg Duration"
                          value={`${avgDuration}m`}
                          accent={C.sky}
                        />
                        <KpiCard
                          icon={<CiUser />}
                          label="Interviewers"
                          value={intStats.length}
                          accent={C.purple}
                        />
                        <KpiCard
                          icon={<CiMapPin />}
                          label="GPS Tagged"
                          value={gpsCoverage}
                          accent={C.amber}
                        />
                        <KpiCard
                          icon={<CiFolderOff />}
                          label="Remaining"
                          value={Math.max(0, SAMPLE_TARGET - totalFiles)}
                          accent={C.red}
                        />
                        <KpiCard
                          icon={<CiBookmarkCheck />}
                          label="Submitted"
                          value={`${submittedCount} (${pct(submittedCount, totalFiles)}%)`}
                          accent={C.teal}
                        />
                        <KpiCard
                          icon={<CiViewTimeline />}
                          label="Active Days"
                          value={byDay.length}
                          accent={C.sky}
                        />
                      </div>
                      <SectionHead
                        title="Hypothesis Signal Summary"
                        sub={`Key validation metrics — n=${totalFiles}`}
                      />
                      <HypothesisCards
                        hadDispute={hadDispute}
                        noWritten={noWritten}
                        willPay={willPay}
                        totalFiles={totalFiles}
                      />
                      <div className="chart-grid-2 fade-up-3">
                        <ChartCard
                          title="Data Quality Indicators"
                          sub="GPS coverage, submission rate"
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                              marginTop: 8,
                            }}
                          >
                            {[
                              { l: "GPS Tagged", v: gpsCoverage, c: C.teal },
                              { l: "Submitted", v: submittedCount, c: C.sky },
                              { l: "H1 Signal", v: hadDispute, c: C.accent },
                              { l: "H2 Signal", v: willPay, c: C.purple },
                            ].map((q) => (
                              <div
                                key={q.l}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                              >
                                <div
                                  style={{
                                    width: 90,
                                    fontSize: 11,
                                    color: C.muted,
                                  }}
                                >
                                  {q.l}
                                </div>
                                <div className="prog-bg" style={{ flex: 1 }}>
                                  <div
                                    className="prog-fill"
                                    style={{
                                      width: `${pct(q.v, totalFiles)}%`,
                                      background: q.c,
                                    }}
                                  />
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: q.c,
                                    fontWeight: 700,
                                    width: 38,
                                    textAlign: "right",
                                  }}
                                >
                                  {pct(q.v, totalFiles)}%
                                </div>
                              </div>
                            ))}
                          </div>
                        </ChartCard>
                        <ChartCard
                          title="Recent Activity"
                          sub="Latest 8 submissions"
                        >
                          {[...filtered]
                            .sort(
                              (a, b) =>
                                new Date(b.startedAt) - new Date(a.startedAt),
                            )
                            .slice(0, 8)
                            .map((r, i) => (
                              <div key={r.id} className="timeline-row">
                                <div
                                  className="tl-dot"
                                  style={{
                                    background:
                                      INT_PALETTE[i % INT_PALETTE.length],
                                  }}
                                />
                                <div className="tl-name">
                                  {r.respondentName || "Anonymous"}
                                </div>
                                <div className="tl-meta">
                                  {r.respondentTown || "–"}
                                </div>
                                <div className="tl-meta">
                                  {r.interviewerName || "–"}
                                </div>
                                <div
                                  className="tl-meta"
                                  style={{
                                    marginLeft: "auto",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {fmtTime(r.startedAt)}
                                </div>
                              </div>
                            ))}
                        </ChartCard>
                      </div>
                      <div className="chart-card fade-up-3">
                        <div className="chart-title">
                          Cumulative Progress vs Target ({SAMPLE_TARGET})
                        </div>
                        <div className="chart-sub">
                          Running total of interviews collected
                        </div>
                        <CumulativeChart byDay={byDay} />
                      </div>
                    </>
                  )}

                  {/* ── DATA COLLECTION ── */}
                  {activeSec === "collection" && (
                    <>
                      <SectionHead
                        title="Data Collection Analytics"
                        sub="Submission pace, hit rates, and cumulative progress"
                        badge={`n = ${totalFiles}`}
                        badgeColor={C.teal}
                      />
                      <div className="kpi-row fade-up">
                        <KpiCard
                          icon={<CiFloppyDisk />}
                          label="Collected"
                          value={totalFiles}
                          accent={C.accent}
                        />
                        <KpiCard
                          icon={<CiFolderOff />}
                          label="Remaining"
                          value={Math.max(0, SAMPLE_TARGET - totalFiles)}
                          accent={C.red}
                        />
                        <KpiCard
                          icon={<CiClock1 />}
                          label="Avg Duration"
                          value={`${avgDuration}m`}
                          accent={C.teal}
                        />
                        <KpiCard
                          icon={<CiViewTimeline />}
                          label="Active Days"
                          value={byDay.length}
                          accent={C.sky}
                        />
                        <KpiCard
                          icon={<CiBookmarkCheck />}
                          label="Best Day"
                          value={
                            byDay.length
                              ? Math.max(...byDay.map((d) => d.count))
                              : 0
                          }
                          accent={C.purple}
                        />
                        <KpiCard
                          icon={<CiCircleQuestion />}
                          label="Daily Avg"
                          value={
                            byDay.length
                              ? (totalFiles / byDay.length).toFixed(1)
                              : 0
                          }
                          accent={C.amber}
                        />
                      </div>
                      <div className="chart-card fade-up-2">
                        <div className="chart-title">
                          Cumulative Progress vs Target ({SAMPLE_TARGET})
                        </div>
                        <div className="chart-sub">
                          Running total of interviews collected
                        </div>
                        <CumulativeChart byDay={byDay} />
                      </div>
                      <div className="chart-grid-2 fade-up-3">
                        <ChartCard
                          title="Hit Rate Per Day"
                          sub="Avg interviews per active interviewer / day"
                        >
                          <ResponsiveContainer width="100%" height={200}>
                            <ComposedChart
                              data={hitRate}
                              margin={{
                                top: 4,
                                right: 8,
                                left: -16,
                                bottom: 0,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f0f0f0"
                              />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip content={<CT />} />
                              <Bar
                                dataKey="total"
                                fill={C.sky}
                                radius={[3, 3, 0, 0]}
                                name="Total"
                                opacity={0.7}
                              />
                              <Line
                                type="monotone"
                                dataKey="avgPerInt"
                                stroke={C.accent}
                                strokeWidth={2}
                                dot={{ r: 3, fill: C.accent }}
                                name="Avg/Int"
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </ChartCard>
                        <ChartCard
                          title="Active Interviewers Per Day"
                          sub="Field team engagement by date"
                        >
                          <BarChartSimple
                            data={hitRate.map((h) => ({
                              name: h.date,
                              value: h.activePpl,
                            }))}
                            color={C.purple}
                          />
                        </ChartCard>
                      </div>
                      <div className="chart-card fade-up-3">
                        <div className="chart-title">Daily Hit Rate Table</div>
                        <div className="tbl-wrap">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Total</th>
                                <th>Active Interviewers</th>
                                <th>Avg / Interviewer</th>
                                <th>
                                  vs Pace ({(SAMPLE_TARGET / 30).toFixed(1)}
                                  /day)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {hitRate.map((row) => {
                                const pace = SAMPLE_TARGET / 30,
                                  ok = row.total >= pace;
                                return (
                                  <tr key={row.date}>
                                    <td className="mono">{row.date}</td>
                                    <td>
                                      <Badge color={C.accent} bg={C.accentL}>
                                        {row.total}
                                      </Badge>
                                    </td>
                                    <td className="mono">{row.activePpl}</td>
                                    <td
                                      className="mono"
                                      style={{ fontWeight: 700, color: C.teal }}
                                    >
                                      {row.avgPerInt}
                                    </td>
                                    <td>
                                      <Badge
                                        color={ok ? C.teal : C.amber}
                                        bg={ok ? C.tealL : C.amberL}
                                      >
                                        {ok ? "✓ On pace" : "↓ Below pace"}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── INTERVIEWERS ── */}
                  {activeSec === "interviewers" && !selectedInt && (
                    <>
                      <SectionHead
                        title="Interviewer Statistics"
                        sub={`${intStats.length} active field agents`}
                        badge="Click a card to drill down"
                        badgeColor={C.sky}
                      />
                      <div className="chart-card fade-up">
                        <div className="chart-title">
                          Response Count by Interviewer
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={intStats}
                            margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f0f0f0"
                            />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 10 }}
                              tickFormatter={(v) => v.split(" ")[0]}
                            />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip content={<CT />} />
                            <Bar
                              dataKey="count"
                              radius={[4, 4, 0, 0]}
                              name="Responses"
                            >
                              {intStats.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={INT_PALETTE[i % INT_PALETTE.length]}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="int-grid fade-up-2">
                        {intStats.map((iv, idx) => {
                          const col = INT_PALETTE[idx % INT_PALETTE.length];
                          return (
                            <div
                              key={iv.name}
                              className="int-card"
                              style={{
                                borderLeft: `3px solid ${col}`,
                                cursor: "pointer",
                              }}
                              onClick={() => setSelectedInt(iv)}
                            >
                              <div className="int-card-header">
                                <div
                                  className="int-avatar"
                                  style={{ background: col }}
                                >
                                  {iv.name
                                    .split(" ")
                                    .map((w) => w[0])
                                    .slice(0, 2)
                                    .join("")}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div className="int-name">{iv.name}</div>
                                  <div className="int-id">
                                    {iv.id} · {iv.surveyIds}
                                  </div>
                                </div>
                                <Badge color={col} bg={`${col}18`}>
                                  {iv.count}
                                </Badge>
                              </div>
                              <div className="int-stats-row">
                                <div className="int-stat">
                                  <div
                                    className="int-stat-val"
                                    style={{ color: col }}
                                  >
                                    {iv.hitRate}
                                  </div>
                                  <div className="int-stat-lbl">
                                    Hit Rate/Day
                                  </div>
                                </div>
                                <div className="int-stat">
                                  <div
                                    className="int-stat-val"
                                    style={{ color: C.teal }}
                                  >
                                    {iv.avgDur != null ? `${iv.avgDur}m` : "–"}
                                  </div>
                                  <div className="int-stat-lbl">
                                    Avg Duration
                                  </div>
                                </div>
                                <div className="int-stat">
                                  <div
                                    className="int-stat-val"
                                    style={{ color: C.purple }}
                                  >
                                    {iv.activeDays}
                                  </div>
                                  <div className="int-stat-lbl">
                                    Active Days
                                  </div>
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  marginBottom: 8,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: C.muted,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  Quality
                                </span>
                                <div className="prog-bg" style={{ flex: 1 }}>
                                  <div
                                    className="prog-fill"
                                    style={{
                                      width: `${iv.qualityScore}%`,
                                      background:
                                        iv.qualityScore > 70
                                          ? C.teal
                                          : iv.qualityScore > 40
                                            ? C.amber
                                            : C.red,
                                    }}
                                  />
                                </div>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: col,
                                    fontWeight: 700,
                                  }}
                                >
                                  {iv.qualityScore}%
                                </span>
                              </div>
                              <div className="int-meta">
                                <div>
                                  WTP:{" "}
                                  <span style={{ color: C.teal }}>
                                    {iv.wtpRate}%
                                  </span>{" "}
                                  · Disputes:{" "}
                                  <span style={{ color: C.accent }}>
                                    {iv.disputeRate}%
                                  </span>
                                </div>
                                <div>
                                  Locations:{" "}
                                  <span>{short(iv.locations, 40)}</span>
                                </div>
                              </div>
                              <div className="int-progress">
                                <div className="int-progress-lbl">
                                  <span>Share of target</span>
                                  <span style={{ color: col, fontWeight: 600 }}>
                                    {pct(iv.count, SAMPLE_TARGET)}%
                                  </span>
                                </div>
                                <div className="prog-bg">
                                  <div
                                    className="prog-fill"
                                    style={{
                                      width: `${Math.min(100, pct(iv.count, SAMPLE_TARGET))}%`,
                                      background: col,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="chart-card">
                        <div className="chart-title">
                          Interviewer Summary Table
                        </div>
                        <div className="tbl-wrap">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>ID</th>
                                <th>Surveys</th>
                                <th>Responses</th>
                                <th>Share</th>
                                <th>Hit Rate</th>
                                <th>Days</th>
                                <th>Avg Dur</th>
                                <th>Quality</th>
                                <th>WTP %</th>
                                <th>Dispute %</th>
                              </tr>
                            </thead>
                            <tbody>
                              {intStats.map((iv, i) => (
                                <tr
                                  key={iv.name}
                                  style={{ cursor: "pointer" }}
                                  onClick={() => setSelectedInt(iv)}
                                >
                                  <td
                                    style={{
                                      fontWeight: 600,
                                      color:
                                        INT_PALETTE[i % INT_PALETTE.length],
                                    }}
                                  >
                                    {iv.name}
                                  </td>
                                  <td className="mono">{iv.id}</td>
                                  <td>
                                    <Badge color={C.sky} bg={C.skyL}>
                                      {iv.surveyIds}
                                    </Badge>
                                  </td>
                                  <td>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                      }}
                                    >
                                      <div
                                        className="prog-bg"
                                        style={{ width: 50 }}
                                      >
                                        <div
                                          className="prog-fill"
                                          style={{
                                            width: `${pct(iv.count, SAMPLE_TARGET)}%`,
                                            background:
                                              INT_PALETTE[
                                                i % INT_PALETTE.length
                                              ],
                                          }}
                                        />
                                      </div>
                                      <span
                                        className="mono"
                                        style={{ fontWeight: 700 }}
                                      >
                                        {iv.count}
                                      </span>
                                    </div>
                                  </td>
                                  <td
                                    className="mono"
                                    style={{ color: C.accent, fontWeight: 600 }}
                                  >
                                    {pct(iv.count, SAMPLE_TARGET)}%
                                  </td>
                                  <td>
                                    <Badge color={C.teal} bg={C.tealL}>
                                      {iv.hitRate}/day
                                    </Badge>
                                  </td>
                                  <td className="mono">{iv.activeDays}</td>
                                  <td className="mono">
                                    {iv.avgDur != null ? `${iv.avgDur}m` : "–"}
                                  </td>
                                  <td>
                                    <Badge
                                      color={
                                        iv.qualityScore > 70
                                          ? C.teal
                                          : iv.qualityScore > 40
                                            ? C.amber
                                            : C.red
                                      }
                                      bg={
                                        iv.qualityScore > 70
                                          ? C.tealL
                                          : iv.qualityScore > 40
                                            ? C.amberL
                                            : C.redL
                                      }
                                    >
                                      {iv.qualityScore}%
                                    </Badge>
                                  </td>
                                  <td
                                    className="mono"
                                    style={{ color: C.teal, fontWeight: 600 }}
                                  >
                                    {iv.wtpRate}%
                                  </td>
                                  <td
                                    className="mono"
                                    style={{ color: C.accent }}
                                  >
                                    {iv.disputeRate}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="chart-card">
                        <div className="chart-title">
                          Interviewer Payment Schedule
                        </div>
                        <div className="chart-sub">
                          Estimated compensation based on completions (KSh
                          200/structured · KSh 500/in-depth)
                        </div>
                        <div className="tbl-wrap">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>ID</th>
                                <th>Structured</th>
                                <th>In-Depths</th>
                                <th>Total (KSh)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {intStats.map((iv, i) => {
                                const depths = iv.depths || 0,
                                  structured = iv.count - depths,
                                  amount = structured * 200 + depths * 500;
                                return (
                                  <tr key={iv.name}>
                                    <td
                                      style={{
                                        fontWeight: 600,
                                        color:
                                          INT_PALETTE[i % INT_PALETTE.length],
                                      }}
                                    >
                                      {iv.name}
                                    </td>
                                    <td className="mono">{iv.id}</td>
                                    <td
                                      className="mono"
                                      style={{ fontWeight: 600 }}
                                    >
                                      {structured}
                                    </td>
                                    <td
                                      className="mono"
                                      style={{ fontWeight: 600 }}
                                    >
                                      {depths}
                                    </td>
                                    <td>
                                      <Badge color={C.teal} bg={C.tealL}>
                                        KSh {amount.toLocaleString()}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr
                                style={{
                                  borderTop: `2px solid ${C.border}`,
                                  fontWeight: 700,
                                }}
                              >
                                <td
                                  colSpan={4}
                                  style={{ fontWeight: 700, paddingTop: 10 }}
                                >
                                  Total Payout
                                </td>
                                <td>
                                  <Badge color={C.accent} bg={C.accentL}>
                                    KSh{" "}
                                    {intStats
                                      .reduce((acc, iv) => {
                                        const d = iv.depths || 0;
                                        return (
                                          acc + (iv.count - d) * 200 + d * 500
                                        );
                                      }, 0)
                                      .toLocaleString()}
                                  </Badge>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── INTERVIEWER DRILL-DOWN ── */}
                  {activeSec === "interviewers" && selectedInt && (
                    <>
                      <div className="sec-head">
                        <div>
                          <button
                            className="back-btn"
                            onClick={() => setSelectedInt(null)}
                          >
                            ← Back to all interviewers
                          </button>
                          <div className="sec-title">{selectedInt.name}</div>
                          <div className="sec-sub">
                            ID: {selectedInt.id} · Surveys:{" "}
                            {selectedInt.surveyIds}
                          </div>
                        </div>
                      </div>
                      <div className="kpi-row fade-up">
                        <KpiCard
                          icon={<CiFolderOn />}
                          label="Responses"
                          value={selectedInt.count}
                          accent={C.accent}
                        />
                        <KpiCard
                          icon={<CiViewTimeline />}
                          label="Active Days"
                          value={selectedInt.activeDays}
                          accent={C.sky}
                        />
                        <KpiCard
                          icon={<CiClock1 />}
                          label="Avg Duration"
                          value={
                            selectedInt.avgDur != null
                              ? `${selectedInt.avgDur}m`
                              : "–"
                          }
                          accent={C.teal}
                        />
                        <KpiCard
                          icon={<CiBookmarkCheck />}
                          label="Hit Rate"
                          value={`${selectedInt.hitRate}/day`}
                          accent={C.purple}
                        />
                        <KpiCard
                          icon={<CiWallet />}
                          label="WTP Rate"
                          value={`${selectedInt.wtpRate}%`}
                          accent={C.amber}
                        />
                        <KpiCard
                          icon={<CiTempHigh />}
                          label="Dispute Rate"
                          value={`${selectedInt.disputeRate}%`}
                          accent={C.red}
                        />
                      </div>
                      <div className="chart-grid-2 fade-up-2">
                        <ChartCard
                          title="Daily Submissions"
                          sub="Responses per active day"
                        >
                          <BarChartSimple
                            data={selectedInt.byDayArr.map((d) => ({
                              name: d.date,
                              value: d.count,
                            }))}
                            color={C.accent}
                          />
                        </ChartCard>
                        <ChartCard
                          title="Duration Distribution"
                          sub={`Min ${selectedInt.minDur}m · Avg ${selectedInt.avgDur}m · Max ${selectedInt.maxDur}m`}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                              marginTop: 16,
                            }}
                          >
                            {[
                              {
                                l: "Min",
                                v: selectedInt.minDur || 0,
                                c: C.teal,
                              },
                              {
                                l: "Avg",
                                v: selectedInt.avgDur || 0,
                                c: C.accent,
                              },
                              {
                                l: "Max",
                                v: selectedInt.maxDur || 0,
                                c: C.red,
                              },
                            ].map((q) => (
                              <div
                                key={q.l}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                              >
                                <div
                                  style={{
                                    width: 36,
                                    fontSize: 11,
                                    color: C.muted,
                                  }}
                                >
                                  {q.l}
                                </div>
                                <div className="prog-bg" style={{ flex: 1 }}>
                                  <div
                                    className="prog-fill"
                                    style={{
                                      width: `${Math.min(100, (q.v / 60) * 100)}%`,
                                      background: q.c,
                                    }}
                                  />
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: q.c,
                                    fontWeight: 700,
                                    width: 36,
                                    textAlign: "right",
                                  }}
                                >
                                  {q.v}m
                                </div>
                              </div>
                            ))}
                          </div>
                        </ChartCard>
                      </div>
                      <div className="chart-card fade-up-3">
                        <div className="chart-title">
                          Quality Score Breakdown
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                          <RadarChart
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            data={[
                              {
                                subject: "Volume",
                                A: Math.min(
                                  100,
                                  pct(selectedInt.count, SAMPLE_TARGET),
                                ),
                              },
                              {
                                subject: "Hit Rate",
                                A: Math.min(
                                  100,
                                  (selectedInt.hitRate / 5) * 100,
                                ),
                              },
                              {
                                subject: "Duration",
                                A: selectedInt.avgDur
                                  ? Math.min(
                                      100,
                                      (selectedInt.avgDur / 30) * 100,
                                    )
                                  : 0,
                              },
                              {
                                subject: "WTP Rate",
                                A: parseFloat(selectedInt.wtpRate),
                              },
                              {
                                subject: "Activity",
                                A: Math.min(
                                  100,
                                  (selectedInt.activeDays / 10) * 100,
                                ),
                              },
                            ]}
                          >
                            <PolarGrid />
                            <PolarAngleAxis
                              dataKey="subject"
                              tick={{ fontSize: 11 }}
                            />
                            <PolarRadiusAxis
                              angle={30}
                              domain={[0, 100]}
                              tick={{ fontSize: 9 }}
                            />
                            <Radar
                              name={selectedInt.name}
                              dataKey="A"
                              stroke={C.accent}
                              fill={`${C.accent}30`}
                              fillOpacity={0.6}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}

                  {/* ── H1 ── */}
                  {activeSec === "h1" && (
                    <>
                      <SectionHead
                        title="H1 — Pain Signal Analysis"
                        sub="Tenant dispute frequency and documentation failures"
                        badge="H1 Validation"
                        badgeColor={C.accent}
                      />
                      <div className="kpi-row fade-up">
                        <KpiCard
                          icon={<CiTempHigh />}
                          label="Had Dispute"
                          value={`${hadDispute} (${pct(hadDispute, totalFiles)}%)`}
                          accent={C.accent}
                        />
                        <KpiCard
                          icon={<CiWallet />}
                          label="No Written Agreement"
                          value={`${noWritten} (${pct(noWritten, totalFiles)}%)`}
                          accent={C.red}
                        />
                      </div>
                      <div className="chart-grid-2 fade-up-2">
                        <ChartCard
                          title="Q6 — Dispute Frequency"
                          sub="How often issues arise with landlord"
                        >
                          <PieSimple data={q6data} />
                        </ChartCard>
                        <ChartCard
                          title="Q3 — Agreement Type"
                          sub="Current lease documentation status"
                        >
                          <PieSimple data={q3data} />
                        </ChartCard>
                        <ChartCard
                          title="Q4 — Dispute Experience"
                          sub="Actual dispute or fear of dispute"
                        >
                          <BarChartSimple data={q4data} color={C.accent} />
                        </ChartCard>
                        <ChartCard
                          title="Q12 — Trust Factors"
                          sub="What builds digital lease trust?"
                        >
                          <HBarChart data={q12data} color={C.purple} />
                        </ChartCard>
                      </div>
                    </>
                  )}

                  {/* ── H2 ── */}
                  {activeSec === "h2" && (
                    <>
                      <SectionHead
                        title="H2 — Willingness to Pay Signal"
                        sub="Digital lease adoption and pricing data"
                        badge="H2 Validation"
                        badgeColor={C.teal}
                      />
                      <div className="kpi-row fade-up">
                        <KpiCard
                          icon={<CiMoneyCheck1 />}
                          label="Would Pay (Yes)"
                          value={`${willPay} (${pct(willPay, totalFiles)}%)`}
                          accent={C.teal}
                        />
                      </div>
                      <div className="chart-grid-2 fade-up-2">
                        <ChartCard
                          title="Q13 — Would Pay for Digital Lease?"
                          sub="Core H2 willingness signal"
                        >
                          <PieSimple data={q13data} />
                        </ChartCard>
                        <ChartCard
                          title="Q12 — Trust Factors"
                          sub="What builds trust in digital leases?"
                        >
                          <HBarChart data={q12data} color={C.teal} />
                        </ChartCard>
                      </div>
                    </>
                  )}

                  {/* ── PROPERTY ── */}
                  {activeSec === "property" && (
                    <>
                      <SectionHead
                        title="Property & Respondent Profile"
                        sub="Segment characteristics"
                      />
                      <div className="chart-grid-2 fade-up">
                        <ChartCard
                          title="Q2 — Rent Range"
                          sub="Monthly rent distribution"
                        >
                          <BarChartSimple data={q2data} color={C.sky} />
                        </ChartCard>
                        <ChartCard
                          title="Q3 — Agreement Type"
                          sub="Lease documentation"
                        >
                          <PieSimple data={q3data} />
                        </ChartCard>
                        <ChartCard
                          title="Respondent Locations"
                          sub="Geographic spread of sample"
                        >
                          <HBarChart
                            data={countBy(filtered, "respondentTown").slice(
                              0,
                              10,
                            )}
                            color={C.teal}
                          />
                        </ChartCard>
                        <ChartCard
                          title="Survey Distribution"
                          sub="Responses by survey type"
                        >
                          <PieSimple data={countBy(filtered, "surveyId")} />
                        </ChartCard>
                      </div>
                    </>
                  )}

                  {/* ── SURVEYS LIST ── */}
                  {activeSec === "responses" && (
                    <>
                      <SectionHead
                        title="Surveys List"
                        sub={`${rawFiltered.length} of ${filtered.length} records shown`}
                      />
                      <FilterBar
                        gInterviewer={gInterviewer}
                        setGInterviewer={setGInterviewer}
                        gSurveyId={gSurveyId}
                        setGSurveyId={setGSurveyId}
                        gLocation={gLocation}
                        setGLocation={setGLocation}
                        rSubmitted={rSubmitted}
                        setRSubmitted={setRSubmitted}
                        rDateFrom={rDateFrom}
                        setRDateFrom={setRDateFrom}
                        rDateTo={rDateTo}
                        setRDateTo={setRDateTo}
                        rSearch={rSearch}
                        setRSearch={setRSearch}
                        allInterviewers={allInterviewers}
                        allSurveyIds={allSurveyIds}
                        allLocations={allLocations}
                        hasFilter={hasRawFilter}
                        onClear={clearRawFilters}
                      />
                      <RawResponsesTable
                        rawFiltered={rawFiltered}
                        onView={(r) => setViewRecord(r)}
                        onDelete={(r) => setPendingDel(r)}
                        isAdmin={true}
                      />
                    </>
                  )}

                  {/* ── EXPORTER ── */}
                  {activeSec === "exporter" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ flex: "1 1 280px" }}>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: C.text,
                            }}
                          >
                            CSV Exporter
                          </div>
                          <div style={{ fontSize: 11, color: C.muted }}>
                            {records.length} total responses across{" "}
                            {SURVEYS.length} surveys
                          </div>
                        </div>
                        <div
                          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                        >
                          <select
                            value={activeSurveyId}
                            onChange={(e) => setActiveSurveyId(e.target.value)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: `1px solid ${C.border}`,
                              fontSize: 13,
                            }}
                          >
                            {SURVEYS.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.title}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleExport}
                            style={{
                              padding: "7px 14px",
                              background: C.tealL,
                              color: C.teal,
                              border: `1px solid ${C.teal}44`,
                              borderRadius: 6,
                              fontWeight: 600,
                              fontSize: 13,
                              cursor: "pointer",
                            }}
                          >
                            ↓ Export CSV
                          </button>
                        </div>
                      </div>
                      <div
                        className="chart-card"
                        style={{ padding: "12px 16px" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            marginBottom: 12,
                          }}
                        >
                          <select
                            value={filterSubmitted}
                            onChange={(e) => setFilterSubmitted(e.target.value)}
                            style={{
                              padding: "5px 10px",
                              borderRadius: 6,
                              border: `1px solid ${C.border}`,
                              fontSize: 12,
                            }}
                          >
                            <option value="">All statuses</option>
                            <option value="submitted">Submitted only</option>
                            <option value="draft">Draft / partial only</option>
                          </select>
                          <select
                            value={filterInterviewer}
                            onChange={(e) =>
                              setFilterInterviewer(e.target.value)
                            }
                            style={{
                              padding: "5px 10px",
                              borderRadius: 6,
                              border: `1px solid ${C.border}`,
                              fontSize: 12,
                            }}
                          >
                            <option value="">All interviewers</option>
                            {interviewers.map((i) => (
                              <option key={i} value={i}>
                                {i}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Search session ID, name, phone, town…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: `1px solid ${C.border}`,
                              fontSize: 12,
                              flex: "1 1 180px",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit,minmax(80px,1fr))",
                            gap: 8,
                            marginBottom: 12,
                          }}
                        >
                          {[
                            ["Responses", filteredRows.length],
                            ["Submitted", submitted],
                            ["Draft", filteredRows.length - submitted],
                            ["Questions", questions],
                          ].map(([l, v]) => (
                            <div
                              key={l}
                              style={{
                                background: C.bg,
                                borderRadius: 6,
                                padding: "8px 12px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 10,
                                  color: C.muted,
                                  marginBottom: 3,
                                }}
                              >
                                {l}
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 700 }}>
                                {v}
                              </div>
                            </div>
                          ))}
                        </div>
                        {exportMsg && (
                          <div
                            style={{
                              fontSize: 12,
                              color: exportMsg.type === "ok" ? C.teal : C.muted,
                              marginBottom: 8,
                            }}
                          >
                            {exportMsg.type === "ok" ? "✓ " : "i "}
                            {exportMsg.text}
                          </div>
                        )}
                      </div>
                      <PreviewTable rows={filteredRows} survey={activeSurvey} />
                    </div>
                  )}

                  {/* ── ACTIVITY LOG ── */}
                  {activeSec === "activity" && (
                    <>
                      <SectionHead
                        title="Activity Log"
                        sub="Recent admin actions in this session"
                      />
                      <div className="chart-card fade-up">
                        {activityLog.length === 0 ? (
                          <div className="empty-state">
                            <div className="empty-icon">📋</div>No activity yet
                            in this session.
                          </div>
                        ) : (
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Time</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activityLog.map((a, i) => (
                                <tr key={i}>
                                  <td
                                    className="mono"
                                    style={{
                                      color: C.muted,
                                      whiteSpace: "nowrap",
                                      width: 80,
                                    }}
                                  >
                                    {a.ts}
                                  </td>
                                  <td>{a.msg}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

