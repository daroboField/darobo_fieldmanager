import { useState, useEffect, useRef } from "react";

import { supabase } from "./supa_client";


// ─── Firebase Initializer ─────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { collection, serverTimestamp } from "firebase/firestore";
import { doc, getDocs, addDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// ─── Survey data ──────────────────────────────────────────────────────────────
const SURVEYS = {
  chamas: {
    id: "chama",
    title: "Chama Secretaries & SACCO",
    subtitle: "H1 & H2 Hypothesis Validation",
    icon: "📝",
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
            swahili: "Je, wewe ni mwanachama au afisa wa chama sasa hivi?",
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
            swahili: "Umekuwa mwanachama kwa muda gani?",
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
            swahili:
              "Kiasi cha fedha kinachoshughulikiwa na chama yako kwa mwezi ni kingapi takriban?",
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
            swahili:
              "Chama yako hutumia nini kwa ajili ya kuandika makubaliano ya mikopo?",
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
            swahili:
              "Mwanachama mpya anapojiunga na kupata mkopo, je, kuna makubaliano ya maandishi yaliyosainiwa?",
            options: ["Always", "Sometimes", "Rarely", "Never"],
          },
          {
            id: "Q6",
            type: "single",
            required: true,
            core: true,
            coreLabel: "Core H1",
            text: "Has your chama ever been unable to enforce a loan or contribution because there was no written proof?",
            swahili:
              "Je, chama yako imewahi kushindwa kutekeleza mkopo au mchango kwa sababu hakukuwa na uthibitisho wa maandishi?",
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
            swahili:
              "Fikiria mgogoro mbaya zaidi au hasara. Iligharamu kiasi gani?",
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
            swahili:
              "Katika miezi 12 iliyopita, wanachama wangapi wameacha chama yako?",
            options: ["None", "1–2 members", "3–5 members", "More than 5"],
          },
          {
            id: "Q9",
            type: "scale",
            required: true,
            text: "How big a problem is the lack of proper documentation for your group? Rate from 1 to 5.",
            swahili:
              "Ukosefu wa nyaraka sahihi ni tatizo kubwa kiasi gani? Toa alama 1–5.",
            min: 1,
            max: 5,
            labels: [
              "1 — Not a problem",
              "2 — Minor",
              "3 — Moderate",
              "4 — Serious",
              "5 — Very serious",
            ],
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
            swahili:
              "Mgogoro unapotokea, wanachama huenda wapi kwa sasa kuusuluhisha?",
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
            swahili:
              "Sababu kubwa zaidi ya chama yako kutotumia mikataba rasmi ni nini?",
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
            swahili:
              "Kama zana rahisi ingewezesha kuandika na kusaini makubaliano ya kikundi kwa simu tu — ungependa kuitumia?",
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
            text: "Would you pay for a tool that: (1) creates a legal agreement in under 5 minutes, (2) both parties sign by PIN on any phone, and (3) produces a tamper-proof record stored online?",
            swahili:
              "Je, ungelipa kwa zana ambayo: (1) huunda makubaliano ya kisheria chini ya dakika 5, (2) pande zote zinasaini kwa nambari ya siri, na (3) inatoa rekodi isiyoweza kubadilishwa?",
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
            text: "Per single agreement (e.g. one loan contract), what is the maximum you would pay?",
            swahili:
              "Kwa makubaliano moja, kiwango cha juu zaidi unachoweza kulipa ni kiasi gani?",
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
            text: "Who should pay for each agreement — the individual member, the chama as an institution, or split equally?",
            swahili:
              "Nani alipe kwa kila makubaliano — mwanachama mmoja mmoja, chama kama taasisi, au kugawana?",
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
            swahili:
              "Kama chama ingelipa ada ya kila mwezi kwa usaini usio na kikomo — kiasi gani kwa mwezi kingekuwa cha msingi?",
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
            text: "Would you trust a document signed using a phone PIN and stored online — more, same, or less than a paper agreement signed in front of witnesses?",
            swahili:
              "Je, utaamini zaidi, sawa, au kidogo hati iliyosainiwa kwa simu — kuliko makubaliano ya karatasi mbele ya mashahidi?",
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
            swahili:
              "Ni nini kinachoweza kukufanya usitumie zana ya usaini wa kidijitali?",
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
            swahili:
              "Je, chama yako ina wanachama wanaotumia simu ya kawaida tu?",
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
            swahili:
              "Ni nani ungependa kuwasilisha zana mpya kama hii kwa kikundi chako?",
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
            swahili:
              "Kama katibu, unakubaliwa au unashuhudia makubaliano mangapi kwa wastani kwa mwezi?",
            options: ["1–5", "6–15", "16–50", "More than 50"],
          },
          {
            id: "Q22",
            type: "single",
            required: false,
            text: "On average, how much time do you spend per week managing documentation, reminders, and disputes?",
            swahili:
              "Kwa wastani, unatumia muda gani kwa wiki kusimamia nyaraka, vikumbusho, na migogoro?",
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
            swahili:
              "Kama ungeweza kupunguza mzigo wako wa nyaraka na migogoro kwa asilimia 80, hilo lingelifanya kazi yako rahisi zaidi?",
            options: ["Yes, significantly", "Yes, somewhat", "Not sure", "No"],
          },
          {
            id: "Q24",
            type: "single",
            required: false,
            text: "Would you be willing to try a free version of this tool for one month and give us your honest feedback?",
            swahili:
              "Je, uko tayari kujaribu toleo la bure la zana hii kwa mwezi mmoja?",
            options: ["Yes — collect contact", "Maybe — tell me more", "No"],
          },
          {
            id: "Q25",
            type: "open",
            required: false,
            text: "In your own words — what is the one thing you most need to make your chama or SACCO agreements more secure?",
            swahili:
              "Kwa maneno yako mwenyewe — ni kitu gani kimoja unachohitaji zaidi ili kufanya makubaliano yako kuwa salama zaidi?",
          },
        ],
      },
    ],
  },

  landlords: {
    id: "landlord",
    title: "Real Estate — Landlords",
    subtitle: "H1 & H2 Hypothesis Validation",
    icon: "📝",
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
          {
            id: "Q5",
            type: "single",
            required: false,
            text: "When a tenant pays a deposit, how do you document it?",
            swahili: "Mpangaji anapopiga amana, unairekodi vipi?",
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
            swahili:
              "Katika miezi 12 iliyopita, je, umekuwa na mgogoro na mpangaji kuhusu kodi, amana, ukarabati, au masharti ya makubaliano?",
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
            swahili:
              "Mgogoro huo ulipotokea — je, ulikuwa na makubaliano ya maandishi yaliyosainiwa?",
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
            swahili:
              "Gharama ya takriban ya fedha ya mgogoro wako mbaya zaidi na mpangaji ilikuwa kiasi gani?",
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
            swahili:
              "Ukosefu wa nyaraka sahihi za kukodisha ni tatizo kubwa kiasi gani kwako?",
            min: 1,
            max: 5,
            labels: [
              "1 — No problem",
              "2 — Minor",
              "3 — Moderate",
              "4 — Serious",
              "5 — Very serious",
            ],
          },
          {
            id: "Q10",
            type: "single",
            required: false,
            text: "On average, how many tenants move out per year leaving a dispute unresolved?",
            swahili:
              "Kwa wastani, wapangaji wangapi wanaondoka kwa mwaka wakiacha mgogoro bila kutatuliwa?",
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
            swahili:
              "Mgogoro na mpangaji ukiwa mkubwa, unakwenda wapi kwa msaada sasa hivi?",
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
            swahili:
              "Kwa nini hutumii mkataba ulioundwa na wakili kwa wapangaji wako wote?",
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
            text: "Imagine a tool that creates a legally enforceable tenancy agreement in 5 minutes. The tenant signs from their phone using a PIN. The signed agreement is stored permanently online and can be used in court. Would you pay for this?",
            swahili:
              "Fikiria zana inayounda makubaliano ya kukodisha yenye nguvu ya kisheria kwa dakika 5. Je, ungelipa kwa hili?",
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
            swahili:
              "Kwa kila makubaliano ya kukodisha, kiwango cha juu zaidi unachoweza kulipa ni kiasi gani?",
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
            swahili:
              "Kama usajili wa kila mwezi ulikupa makubaliano yasiyokuwa na kikomo — bei gani kwa mwezi ingeonekana kuwa ya haki?",
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
            swahili:
              "Kama wakala wako wa nyumba alitoa huduma hii kama sehemu ya ada zake, ungependelea hivyo badala ya kulipa tofauti?",
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
            swahili:
              "Je, wapangaji wako wangeweza kusaini mkataba wa kidijitali kwa kutumia simu ya kawaida tu na nambari ya siri?",
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
            swahili:
              "Ni nini kinachoweza kukuzuia kutumia zana ya usaini wa kidijitali?",
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
            text: "If this tool worked via M-Pesa — so you pay for the signing and the agreement at the same time — would that make it easier to use?",
            swahili:
              "Kama zana hii ingefanya kazi kupitia M-Pesa — ili uweze kulipa usaini na makubaliano wakati mmoja — hiyo ingekufanya iwe rahisi kutumia?",
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
            swahili: "Ni nani unayemwamini zaidi kutoa huduma hii?",
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
            swahili:
              "Unasaini makubaliano mapya ya kukodisha mara ngapi kwa mwaka?",
            options: ["1–2", "3–5", "6–12", "More than 12"],
          },
          {
            id: "Q22",
            type: "open",
            required: false,
            text: "In your own words — what is the single most stressful part of managing tenants?",
            swahili:
              "Kwa maneno yako mwenyewe — sehemu moja yenye msongo zaidi wa kusimamia wapangaji ni ipi?",
          },
          {
            id: "Q23",
            type: "single",
            required: false,
            text: "Would you be willing to try a free version for 1 month and give us feedback?",
            swahili:
              "Je, uko tayari kujaribu toleo la bure kwa mwezi 1 na kutupa maoni?",
            options: ["Yes — collect contact", "Maybe — tell me more", "No"],
          },
        ],
      },
    ],
  },

  agents: {
    id: "agent",
    title: "Real Estate — Agents",
    subtitle: "H1 & H2 Hypothesis Validation",
    icon: "📝",
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
          {
            id: "Q5",
            type: "single",
            required: false,
            text: "When a tenant pays a deposit, how do you document it?",
            swahili: "Mpangaji anapopiga amana, unairekodi vipi?",
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
            swahili:
              "Katika miezi 12 iliyopita, je, umekuwa na mgogoro na mpangaji kuhusu kodi, amana, ukarabati, au masharti ya makubaliano?",
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
            swahili:
              "Mgogoro huo ulipotokea — je, ulikuwa na makubaliano ya maandishi yaliyosainiwa?",
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
            swahili:
              "Gharama ya takriban ya fedha ya mgogoro wako mbaya zaidi na mpangaji ilikuwa kiasi gani?",
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
            swahili:
              "Ukosefu wa nyaraka sahihi za kukodisha ni tatizo kubwa kiasi gani kwako?",
            min: 1,
            max: 5,
            labels: [
              "1 — No problem",
              "2 — Minor",
              "3 — Moderate",
              "4 — Serious",
              "5 — Very serious",
            ],
          },
          {
            id: "Q10",
            type: "single",
            required: false,
            text: "On average, how many tenants move out per year leaving a dispute unresolved?",
            swahili:
              "Kwa wastani, wapangaji wangapi wanaondoka kwa mwaka wakiacha mgogoro bila kutatuliwa?",
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
            swahili:
              "Mgogoro na mpangaji ukiwa mkubwa, unakwenda wapi kwa msaada sasa hivi?",
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
            swahili:
              "Kwa nini hutumii mkataba ulioundwa na wakili kwa wapangaji wako wote?",
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
            text: "Imagine a tool that creates a legally enforceable tenancy agreement in 5 minutes. The tenant signs from their phone using a PIN. The signed agreement is stored permanently online and can be used in court. Would you pay for this?",
            swahili:
              "Fikiria zana inayounda makubaliano ya kukodisha yenye nguvu ya kisheria kwa dakika 5. Je, ungelipa kwa hili?",
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
            swahili:
              "Kwa kila makubaliano ya kukodisha, kiwango cha juu zaidi unachoweza kulipa ni kiasi gani?",
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
            swahili:
              "Kama usajili wa kila mwezi ulikupa makubaliano yasiyokuwa na kikomo — bei gani kwa mwezi ingeonekana kuwa ya haki?",
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
            swahili:
              "Kama wakala wako wa nyumba alitoa huduma hii kama sehemu ya ada zake, ungependelea hivyo badala ya kulipa tofauti?",
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
            swahili:
              "Je, wapangaji wako wangeweza kusaini mkataba wa kidijitali kwa kutumia simu ya kawaida tu na nambari ya siri?",
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
            swahili:
              "Ni nini kinachoweza kukuzuia kutumia zana ya usaini wa kidijitali?",
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
            text: "If this tool worked via M-Pesa — so you pay for the signing and the agreement at the same time — would that make it easier to use?",
            swahili:
              "Kama zana hii ingefanya kazi kupitia M-Pesa — ili uweze kulipa usaini na makubaliano wakati mmoja — hiyo ingekufanya iwe rahisi kutumia?",
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
            swahili: "Ni nani unayemwamini zaidi kutoa huduma hii?",
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
            swahili:
              "Unasaini makubaliano mapya ya kukodisha mara ngapi kwa mwaka?",
            options: ["1–2", "3–5", "6–12", "More than 12"],
          },
          {
            id: "Q22",
            type: "open",
            required: false,
            text: "In your own words — what is the single most stressful part of managing tenants?",
            swahili:
              "Kwa maneno yako mwenyewe — sehemu moja yenye msongo zaidi wa kusimamia wapangaji ni ipi?",
          },
          {
            id: "Q23",
            type: "single",
            required: false,
            text: "Would you be willing to try a free version for 1 month and give us feedback?",
            swahili:
              "Je, uko tayari kujaribu toleo la bure kwa mwezi 1 na kutupa maoni?",
            options: ["Yes — collect contact", "Maybe — tell me more", "No"],
          },
        ],
      },
    ],
  },

  tenant: {
    id: "tenant",
    title: "Real Estate — Tenants",
    subtitle: "H1 & H2 Hypothesis Validation",
    icon: "📝",
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
            swahili: "Je, sasa hivi unakodisha makazi Kenya?",
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
            swahili: "Kodi yako ya kila mwezi ni kiasi gani?",
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
            swahili:
              "Ulipohamia nyumba yako ya sasa, je, ulisaini makubaliano ya kukodisha ya maandishi?",
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
            swahili:
              "Je, umewahi kupoteza amana au kudaiwa zaidi kwa sababu hukuwa na uthibitisho wa maandishi?",
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
            swahili:
              "Je, umewahi kuhamia kutoka nyumba kwa sababu ya mgogoro na mwenye nyumba ambao haukuweza kutatuliwa?",
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
            swahili:
              "Unapolipa kodi ya kila mwezi kupitia M-Pesa, je, mwenye nyumba wako anakupa stakabadhi sahihi ya maandishi?",
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
            swahili:
              "Kukosa makubaliano ya kukodisha ya kuaminika ni tatizo kubwa kiasi gani? Toa alama 1-5.",
            min: 1,
            max: 5,
            labels: [
              "1 - Not a problem / Si tatizo",
              "2 - Minor / Dogo",
              "3 - Moderate / Wastani",
              "4 - Serious / Kubwa",
              "5 - Very serious / Kubwa sana",
            ],
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
            swahili:
              "Je, utaamini zaidi, sawa, au kidogo makubaliano yaliyosainiwa kwa nambari ya siri ya simu?",
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
            swahili:
              "Kama mwenye nyumba wako alitoa mkataba uliosainiwa kidijitali, ungependa hivyo badala ya karatasi?",
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
            swahili:
              "Je, ungelipa ada ndogo (KSh 20-50) kuwa na makubaliano yako ya kukodisha yaliyosainiwa na kuhifadhiwa kidijitali?",
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
            swahili: "Unatumia simu gani?",
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
            swahili:
              "Ni nini kinachoweza kukuambia zaidi kwamba makubaliano ya kidijitali ni halali?",
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
            swahili:
              "Kwa maneno yako mwenyewe, ni kitu gani kimoja unachopenda sana kingekuwa tofauti?",
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
  { id: "INT007", name: "Yvonne Ochieng", location: "Nairobi", pin: "1234" },
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
    doc(db, "AnswersDB", data.sessionId),
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
            <img src="./logo.ico" alt="" className="logo-mark" />
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


// ─── Home screen ──────────────────────────────────────────────────────────────
function HomeScreen({ interviewer, onStartSurvey, sessions, onLogout }) {
  const offlineCount = getOfflineQueueSize();

  return (
    <>
      <StatusBar saving={false} gpsStatus="ready" offlineCount={offlineCount} />
      <div className="topbar">
        <div className="topbar-logo">
          <img src="./logo.ico" alt="" className="logo-mark-sm" />
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
