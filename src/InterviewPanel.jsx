import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Preloaded interviewer credentials ────────────────────────────────────────
const INTERVIEWERS = [
  { id: "INT001", name: "Loyce Dulo", location: "Mombasa", pin: "1234" },
  { id: "INT002", name: "Ronald Otieno", location: "Nairobi", pin: "1234" },
  { id: "INT003", name: "Lucy Wafula", location: "Mombasa", pin: "1234" },
  { id: "INT004", name: "Maxwel Mwania", location: "Nairobi", pin: "1234" },
  { id: "INT005", name: "Juda Mohamed", location: "Mombasa", pin: "1234" },
  { id: "INT006", name: "Michael Kaoto", location: "Mombasa", pin: "1234" },
];

// ─── Survey data ──────────────────────────────────────────────────────────────
const SURVEYS = {
  chama: {
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

  realestate: {
    id: "realestate",
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

// ─── Utilities ────────────────────────────────────────────────────────────────
function generateSessionId() {
  return `resp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function flattenQuestions(survey) {
  return survey.sections.flatMap((s) => s.questions);
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #F0F4FF;
    --bg2: #E8EEFF;
    --surface: #FFFFFF;
    --surface2: #F7F9FF;
    --surface3: #EEF2FF;
    --border: #D8E0F8;
    --border2: #A8B8F0;

    --dodger: #1E90FF;
    --dodger-hover: #0078F0;
    --dodger-dim: rgba(30,144,255,0.10);
    --dodger-mid: rgba(30,144,255,0.20);
    --dodger-dark: #0060CC;

    --sky: #38BDF8;
    --sky-dim: rgba(56,189,248,0.12);

    --green: #059669;
    --green-dim: rgba(5,150,105,0.10);
    --amber: #D97706;
    --amber-dim: rgba(217,119,6,0.10);
    --red: #DC2626;

    --text: #0F1B3D;
    --text2: #4A5880;
    --text3: #8A96B8;

    --radius: 12px;
    --radius-sm: 8px;
    --radius-lg: 16px;
    --radius-xl: 20px;
    --t: 160ms ease;
    --font: 'DM Sans', system-ui, sans-serif;
    --mono: 'DM Mono', monospace;
  }

  html, body, #root { height: 100%; font-family: var(--font); background: var(--bg); color: var(--text); }

  .app { min-height: 100vh; display: flex; flex-direction: column; }

  /* ── Login ── */
  .login-screen {
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    background: var(--bg);
    padding: 24px;
    position: relative;
  }
  .login-screen::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(30,144,255,0.10) 0%, transparent 70%);
    pointer-events: none;
  }
  .login-card {
    width: 100%; max-width: 420px;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-xl);
    box-shadow: 0 8px 40px rgba(30,144,255,0.10), 0 1px 0 rgba(255,255,255,0.8) inset;
    overflow: hidden;
    position: relative;
  }
  .login-header {
    padding: 32px 32px 24px;
    border-bottom: 1.5px solid var(--border);
    text-align: center;
    background: linear-gradient(160deg, #1060CC 0%, #1E90FF 100%);
    position: relative;
    overflow: hidden;
  }
  .login-header::after {
    content: '';
    position: absolute;
    width: 200px; height: 200px;
    border-radius: 50%;
    background: rgba(255,255,255,0.06);
    top: -60px; right: -60px;
  }
  .login-logo {
    display: inline-flex; align-items: center; gap: 10px; margin-bottom: 20px;
    position: relative; z-index: 1;
  }
  .logo-mark {
    width: 42px; height: 42px;
    background: #FFFFFF;
    border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; font-weight: 700; color: var(--dodger);
    letter-spacing: -1px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  .logo-text { font-size: 21px; font-weight: 700; letter-spacing: -0.5px; color: #FFFFFF; }
  .login-tagline { font-size: 11px; color: rgba(255,255,255,0.55); letter-spacing: 1.2px; text-transform: uppercase; position: relative; z-index: 1; }
  .login-title { font-size: 16px; font-weight: 600; margin-bottom: 4px; color: #FFFFFF; position: relative; z-index: 1; margin-top: 16px; }
  .login-sub { font-size: 13px; color: rgba(255,255,255,0.65); position: relative; z-index: 1; }
  .login-body { padding: 24px 32px 32px; }
  .field-label { font-size: 11px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 8px; display: block; }
  .field-group { margin-bottom: 16px; }
  .select-field, .input-field {
    width: 100%;
    background: var(--surface2);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-family: var(--font); font-size: 14px;
    padding: 11px 14px;
    outline: none;
    transition: border-color var(--t), box-shadow var(--t);
    appearance: none;
  }
  .select-field:focus, .input-field:focus {
    border-color: var(--dodger);
    box-shadow: 0 0 0 3px var(--dodger-dim);
  }
  .pin-wrapper { display: flex; gap: 10px; }
  .pin-dot {
    flex: 1; height: 52px;
    background: var(--surface2);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 700;
    transition: all var(--t);
    color: var(--dodger);
  }
  .pin-dot.empty { color: var(--text3); font-size: 12px; }
  .pin-dot.active { border-color: var(--dodger); box-shadow: 0 0 0 3px var(--dodger-dim); }
  .numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 16px; }
  .num-btn {
    background: var(--surface2);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-family: var(--font); font-size: 18px; font-weight: 500;
    padding: 14px; cursor: pointer;
    transition: all var(--t);
    display: flex; align-items: center; justify-content: center;
  }
  .num-btn:hover { background: var(--dodger-dim); border-color: var(--border2); color: var(--dodger); }
  .num-btn:active { transform: scale(0.95); }
  .num-btn.del { font-size: 14px; color: var(--text2); }
  .btn-primary {
    width: 100%;
    background: var(--dodger);
    color: #FFFFFF;
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--font); font-size: 15px; font-weight: 600;
    padding: 14px; cursor: pointer;
    transition: all var(--t);
    margin-top: 20px;
    letter-spacing: 0.2px;
  }
  .btn-primary:hover { background: var(--dodger-hover); }
  .btn-primary:active { transform: scale(0.98); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .error-msg {
    background: rgba(220,38,38,0.07);
    border: 1.5px solid rgba(220,38,38,0.2);
    border-radius: var(--radius-sm);
    color: var(--red); font-size: 13px;
    padding: 10px 12px; margin-top: 12px; text-align: center;
  }

  /* ── Topbar ── */
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 24px;
    border-bottom: 1.5px solid var(--border);
    background: var(--surface);
    position: sticky; top: 0; z-index: 10;
    box-shadow: 0 2px 12px rgba(30,144,255,0.07);
  }
  .topbar-logo { display: flex; align-items: center; gap: 10px; }
  .topbar-logo .logo-mark-sm {
    width: 32px; height: 32px;
    background: var(--dodger);
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; color: #FFF;
  }
  .topbar-logo span { font-size: 15px; font-weight: 600; color: var(--text); }
  .topbar-user { display: flex; align-items: center; gap: 10px; }
  .avatar {
    width: 34px; height: 34px;
    background: var(--dodger-dim);
    border: 1.5px solid var(--border2);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 600; color: var(--dodger);
  }
  .user-name { font-size: 13px; font-weight: 500; color: var(--text); }
  .user-id { font-size: 11px; color: var(--text3); }
  .logout-btn {
    background: none;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text2); font-family: var(--font); font-size: 12px;
    padding: 6px 12px; cursor: pointer;
    transition: all var(--t);
  }
  .logout-btn:hover { border-color: var(--dodger); color: var(--dodger); background: var(--dodger-dim); }

  /* ── Home ── */
  .home-screen { flex: 1; padding: 24px; max-width: 720px; margin: 0 auto; width: 100%; }
  .home-content { padding: 28px 0; }
  .section-heading { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text3); margin-bottom: 16px; }
  .survey-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 520px) { .survey-grid { grid-template-columns: 1fr; } }

  .survey-card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 22px;
    cursor: pointer;
    transition: all var(--t);
    position: relative;
    overflow: hidden;
  }
  .survey-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: var(--dodger);
    opacity: 0;
    transition: opacity var(--t);
  }
  .survey-card:hover { border-color: var(--dodger); box-shadow: 0 6px 24px rgba(30,144,255,0.12); transform: translateY(-2px); }
  .survey-card:hover::before { opacity: 1; }
  .survey-icon { font-size: 30px; margin-bottom: 12px; }
  .survey-title { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .survey-sub { font-size: 12px; color: var(--text2); margin-bottom: 14px; line-height: 1.5; }
  .survey-meta { display: flex; gap: 6px; flex-wrap: wrap; }
  .meta-tag {
    font-size: 11px; font-weight: 500;
    background: var(--surface3); border: 1px solid var(--border);
    border-radius: 20px; padding: 3px 9px; color: var(--text2);
  }
  .start-row { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; }
  .start-btn {
    font-size: 13px; font-weight: 600;
    color: var(--dodger);
    background: var(--dodger-dim);
    border: 1.5px solid rgba(30,144,255,0.25);
    border-radius: var(--radius-sm);
    padding: 7px 14px; cursor: pointer;
    transition: all var(--t);
  }
  .start-btn:hover { background: var(--dodger-mid); border-color: var(--dodger); }
  .q-count { font-size: 12px; color: var(--text3); }

  .recent-section { margin-top: 32px; }
  .empty-state {
    background: var(--surface); border: 1.5px dashed var(--border);
    border-radius: var(--radius); padding: 28px; text-align: center;
    color: var(--text3); font-size: 13px; line-height: 1.7;
  }

  /* ── Interview ── */
  .interview-screen { flex: 1; display: flex; flex-direction: column; max-width: 700px; margin: 0 auto; width: 100%; }
  .interview-header {
    padding: 14px 24px;
    border-bottom: 1.5px solid var(--border);
    background: var(--surface);
    position: sticky; top: 0; z-index: 10;
    box-shadow: 0 2px 12px rgba(30,144,255,0.07);
  }
  .interview-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .back-btn {
    width: 32px; height: 32px;
    background: var(--surface2); border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 16px; color: var(--text2);
    transition: all var(--t); flex-shrink: 0;
  }
  .back-btn:hover { border-color: var(--dodger); color: var(--dodger); background: var(--dodger-dim); }
  .interview-survey-name { font-size: 14px; font-weight: 600; color: var(--text); }
  .interview-section-name { font-size: 12px; color: var(--text2); }
  .interview-header-right { margin-left: auto; text-align: right; }
  .q-progress { font-size: 12px; color: var(--text3); font-weight: 500; font-family: var(--mono); }
  .progress-bar-outer { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .progress-bar-inner { height: 100%; background: var(--dodger); border-radius: 2px; transition: width 350ms ease; }

  .interview-body { flex: 1; padding: 32px 24px; overflow-y: auto; background: var(--bg); }
  .q-header { margin-bottom: 26px; }
  .q-number { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text3); margin-bottom: 8px; display: flex; align-items: center; gap: 8px; font-family: var(--mono); }
  .core-badge {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    padding: 2px 8px; border-radius: 20px;
    background: var(--amber-dim); color: var(--amber);
    border: 1px solid rgba(217,119,6,0.25);
  }
  .q-text { font-size: 19px; font-weight: 500; line-height: 1.5; margin-bottom: 7px; color: var(--text); }
  .q-swahili { font-size: 13px; color: var(--text2); font-style: italic; line-height: 1.6; }

  .options-list { display: flex; flex-direction: column; gap: 9px; }
  .option-btn {
    width: 100%;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    color: var(--text); font-family: var(--font); font-size: 14px; font-weight: 400;
    padding: 13px 16px; text-align: left;
    cursor: pointer; transition: all var(--t);
    display: flex; align-items: center; gap: 12px;
  }
  .option-btn:hover { background: var(--dodger-dim); border-color: var(--dodger); color: var(--dodger-dark); }
  .option-btn.selected { background: var(--dodger-dim); border-color: var(--dodger); color: var(--dodger-dark); }
  .option-check {
    width: 20px; height: 20px; border-radius: 50%;
    border: 2px solid var(--border2); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; color: transparent; transition: all var(--t);
  }
  .option-btn.selected .option-check { background: var(--dodger); border-color: var(--dodger); color: #FFF; }
  .option-check-sq {
    width: 20px; height: 20px; border-radius: 5px;
    border: 2px solid var(--border2); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; color: transparent; transition: all var(--t);
  }
  .option-btn.selected .option-check-sq { background: var(--sky); border-color: var(--sky); color: #fff; }

  .scale-wrapper { margin-top: 8px; }
  .scale-btns { display: flex; gap: 8px; }
  .scale-btn {
    flex: 1; height: 60px;
    background: var(--surface); border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text); font-family: var(--font); font-size: 18px; font-weight: 600;
    cursor: pointer; transition: all var(--t);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  }
  .scale-btn .scale-sub { font-size: 9px; font-weight: 400; color: var(--text3); text-transform: uppercase; letter-spacing: 0.4px; }
  .scale-btn:hover { border-color: var(--dodger); background: var(--dodger-dim); color: var(--dodger); }
  .scale-btn.selected { background: var(--dodger); border-color: var(--dodger); color: #FFFFFF; }
  .scale-btn.selected .scale-sub { color: rgba(255,255,255,0.65); }

  .open-textarea {
    width: 100%; min-height: 120px;
    background: var(--surface); border: 1.5px solid var(--border);
    border-radius: var(--radius);
    color: var(--text); font-family: var(--font); font-size: 15px;
    padding: 16px; outline: none; resize: vertical;
    transition: border-color var(--t), box-shadow var(--t); line-height: 1.6;
  }
  .open-textarea:focus { border-color: var(--dodger); box-shadow: 0 0 0 3px var(--dodger-dim); }
  .open-textarea::placeholder { color: var(--text3); }

  .notes-area { margin-top: 20px; padding-top: 20px; border-top: 1.5px solid var(--border); }
  .notes-label { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text3); margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .notes-input {
    width: 100%; min-height: 68px;
    background: var(--surface); border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text2); font-family: var(--font); font-size: 13px;
    padding: 10px 12px; outline: none; resize: none;
    transition: border-color var(--t); line-height: 1.5;
  }
  .notes-input:focus { border-color: var(--border2); }
  .notes-input::placeholder { color: var(--text3); }

  .interview-footer {
    padding: 14px 24px;
    border-top: 1.5px solid var(--border);
    background: var(--surface);
    display: flex; align-items: center; gap: 12px;
  }
  .nav-btn {
    height: 44px;
    background: var(--surface2); border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text); font-family: var(--font); font-size: 14px; font-weight: 500;
    padding: 0 18px; cursor: pointer;
    transition: all var(--t);
    display: flex; align-items: center; gap: 6px;
  }
  .nav-btn:hover { border-color: var(--border2); background: var(--surface3); }
  .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .nav-btn-next {
    flex: 1;
    background: var(--dodger); border-color: var(--dodger);
    color: #FFFFFF; font-weight: 600; justify-content: center;
  }
  .nav-btn-next:hover { background: var(--dodger-hover); border-color: var(--dodger-hover); }
  .nav-btn-next:disabled { background: var(--dodger); opacity: 0.4; }
  .nav-btn-submit {
    flex: 1;
    background: var(--green); border-color: var(--green);
    color: #fff; font-weight: 600; justify-content: center; font-size: 14px;
  }
  .nav-btn-submit:hover { background: #047857; border-color: #047857; }

  /* ── Respondent bar ── */
  .respondent-bar {
    background: var(--surface); border: 1.5px solid var(--border);
    border-radius: var(--radius); padding: 16px;
    margin-bottom: 24px; display: flex; flex-direction: column; gap: 10px;
  }
  .respondent-label { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.7px; font-weight: 600; }
  .respondent-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .respondent-input {
    background: var(--surface2); border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text); font-family: var(--font); font-size: 13px;
    padding: 9px 11px; outline: none; width: 100%;
    transition: border-color var(--t), box-shadow var(--t);
  }
  .respondent-input:focus { border-color: var(--dodger); box-shadow: 0 0 0 3px var(--dodger-dim); }
  .respondent-input::placeholder { color: var(--text3); }

  /* ── End screen ── */
  .end-screen {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 48px 24px; text-align: center; background: var(--bg);
  }
  .end-icon { font-size: 60px; margin-bottom: 20px; }
  .end-title { font-size: 26px; font-weight: 600; margin-bottom: 8px; color: var(--text); }
  .end-sub { font-size: 15px; color: var(--text2); max-width: 340px; margin: 0 auto 28px; line-height: 1.65; }
  .end-actions { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 320px; }
  .btn-secondary {
    background: var(--surface); border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text); font-family: var(--font); font-size: 14px; font-weight: 500;
    padding: 12px 20px; cursor: pointer; transition: all var(--t);
  }
  .btn-secondary:hover { border-color: var(--border2); background: var(--surface3); }

  /* ── Toast ── */
  .toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: var(--surface); border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 20px; font-size: 13px; font-weight: 500;
    display: flex; align-items: center; gap: 10px;
    box-shadow: 0 8px 32px rgba(30,144,255,0.14);
    z-index: 100; animation: slideUp 0.25s ease; white-space: nowrap; color: var(--text);
  }
  .toast.success { border-color: rgba(5,150,105,0.35); color: var(--green); }
  .toast.error { border-color: rgba(220,38,38,0.3); color: var(--red); }
  @keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } }

  /* ── Session list ── */
  .session-item {
    background: var(--surface); border: 1.5px solid var(--border);
    border-radius: var(--radius-sm); padding: 13px 16px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    transition: border-color var(--t);
  }
  .session-item:hover { border-color: var(--border2); }
`;

// ─── Components ───────────────────────────────────────────────────────────────

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`toast ${type}`}>
      <span>{type === "success" ? "✓" : "⚠"}</span>
      {msg}
    </div>
  );
}

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
            <div className="logo-mark"></div>
            <span className="logo-text">Darobo Collect</span>
          </div>
          <div className="login-tagline"></div>
          <div className="login-title"></div>
          <div className="login-sub">
            Sign in with your interviewer credentials
          </div>
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
              <option value="">Select your ID…</option>
              {INTERVIEWERS.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          {selectedId && (
            <>
              <label className="field-label">Enter PIN</label>
              <div className="pin-wrapper" style={{ marginBottom: 12 }}>
                {Array(4)
                  .fill(null)
                  .map((_, i) => (
                    <div
                      key={i}
                      className={`pin-dot ${i === pin.length ? "active" : ""} ${pin[i] ? "" : "empty"}`}
                    >
                      {pin[i] ? "●" : i === pin.length ? "▌" : "·"}
                    </div>
                  ))}
              </div>
              <div className="numpad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button
                    key={n}
                    className="num-btn"
                    onClick={() => handleNum(String(n))}
                  >
                    {n}
                  </button>
                ))}
                <button className="num-btn" style={{ visibility: "hidden" }} />
                <button className="num-btn" onClick={() => handleNum("0")}>
                  0
                </button>
                <button className="num-btn del" onClick={handleDel}>
                  ⌫
                </button>
              </div>
            </>
          )}
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

function HomeScreen({ interviewer, onStartSurvey, sessions, onLogout }) {
  return (
    <>
      <div className="topbar">
        <div className="topbar-logo">
          <div className="logo-mark-sm">A</div>
          <span>Darobo</span>
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
          <div className="section-heading">Choose questionnaire</div>
          <div className="survey-grid">
            {Object.values(SURVEYS).map((s) => {
              const totalQ = s.sections.reduce(
                (acc, sec) => acc + sec.questions.length,
                0,
              );
              return (
                <div key={s.id} className="survey-card">
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
                      {sessions.filter((x) => x.surveyId === s.id).length}{" "}
                      sessions today
                    </div>
                    <button
                      className="start-btn"
                      onClick={() => onStartSurvey(s.id)}
                    >
                      Start Interview →
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
                No sessions recorded yet today.
                <br />
                Start an interview above to begin.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...sessions]
                  .reverse()
                  .slice(0, 5)
                  .map((s) => (
                    <div key={s.sessionId} className="session-item">
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--text)",
                          }}
                        >
                          {s.respondentName || "Anonymous respondent"}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text3)",
                            marginTop: 2,
                          }}
                        >
                          {SURVEYS[s.surveyId]?.title} ·{" "}
                          {new Date(s.startedAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 9px",
                          borderRadius: 20,
                          background: s.submitted
                            ? "rgba(5,150,105,0.10)"
                            : "rgba(217,119,6,0.10)",
                          color: s.submitted ? "var(--green)" : "var(--amber)",
                          border: `1px solid ${s.submitted ? "rgba(5,150,105,0.25)" : "rgba(217,119,6,0.25)"}`,
                        }}
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

function InterviewScreen({ survey, interviewer, onBack, onSessionComplete }) {
  const questions = flattenQuestions(survey);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState({});
  const [respondent, setRespondent] = useState({
    name: "",
    phone: "",
    location: "",
  });
  const [ended, setEnded] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const sessionId = useRef(generateSessionId());
  const bodyRef = useRef(null);

  const q = questions[qIdx];
  const progress = ((qIdx + 1) / questions.length) * 100;
  const currentSection = survey.sections.find((s) =>
    s.questions.some((qq) => qq.id === q?.id),
  );
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

  const handleNext = () => {
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
    if (qIdx > 0) {
      setQIdx((i) => i - 1);
      bodyRef.current?.scrollTo(0, 0);
    }
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

  const buildPayload = () => ({
    sessionId: sessionId.current,
    surveyId: survey.id,
    surveyTitle: survey.title,
    interviewerId: interviewer.id,
    interviewerName: interviewer.name,
    interviewerLocation: interviewer.location,
    respondentName: respondent.name,
    respondentPhone: respondent.phone,
    respondentLocation: respondent.location,
    startedAt: new Date().toISOString(),
    ...answers,
    notes,
    submitted: false,
  });

  const handleSubmit = async () => {
    setSaving(true);
    const payload = {
      ...buildPayload(),
      submittedAt: new Date().toISOString(),
      submitted: true,
    };
    try {
      // Replace with your Firebase saveToFirebase(payload) call
      await addDoc(collection(db, "Answers", payload.surveyId), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
      setSubmitted(true);
      onSessionComplete(payload);
      showToast("Interview saved successfully!", "success");
    } catch (e) {
      showToast("Save failed — check connection", "error");
    } finally {
      setSaving(false);
    }
  };

  if (submitted)
    return (
      <div className="app">
        <div className="end-screen">
          <div className="end-icon">✅</div>
          <div className="end-title">Interview submitted</div>
          <div className="end-sub">
            {respondent.name ? `${respondent.name}'s` : "This"} responses have
            been saved and are ready for analysis.
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

  if (ended)
    return (
      <div className="app">
        <div className="end-screen">
          <div className="end-icon">🚫</div>
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

      <div className="interview-body" ref={bodyRef}>
        {qIdx === 0 && (
          <div className="respondent-bar">
            <div className="respondent-label">Respondent details</div>
            <div className="respondent-fields">
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
                onChange={(e) =>
                  setRespondent((r) => ({ ...r, phone: e.target.value }))
                }
              />
            </div>
            <input
              className="respondent-input"
              placeholder="Location (estate / town)"
              value={respondent.location}
              onChange={(e) =>
                setRespondent((r) => ({ ...r, location: e.target.value }))
              }
            />
          </div>
        )}

        <div className="q-header">
          <div className="q-number">
            {q.id}
            {q.core && <span className="core-badge">{q.coreLabel}</span>}
            {q.required && (
              <span
                style={{ color: "var(--red)", fontSize: 12, marginLeft: 2 }}
              >
                *
              </span>
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
            <div
              style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8 }}
            >
              Select all that apply
            </div>
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
                      fontSize: 12,
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
        </div>
      </div>

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
          <button
            className="nav-btn nav-btn-next"
            onClick={handleNext}
            disabled={!canNext()}
          >
            {canNext() ? "Next →" : "Answer required"}
          </button>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function ResearchApp() {
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
