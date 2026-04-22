import React from "react";
import { useState, useMemo, useRef, useEffect } from "react";
import JSAWizardModal from "./JSAWizardModal";

// ── API HELPERS ───────────────────────────────────────────────
const getToken = () => localStorage.getItem("rigpro_token") || "";

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

// ── BASE DATA ─────────────────────────────────────────────────────────────────

const BASE_LABOR = [
  { role:"Foreman",    reg:88,   ot:132,    costReg:48.07, costOT:66.09 },
  { role:"Rigger",     reg:83.5, ot:125.25, costReg:46.79, costOT:64.81 },
  { role:"Labor",      reg:78,   ot:117,    costReg:42.96, costOT:58.73 },
  { role:"Operator",   reg:83.5, ot:125.25, costReg:46.79, costOT:64.81 },
  { role:"CDL Driver", reg:78,   ot:117,    costReg:42.96, costOT:58.73 },
];

const EQUIPMENT = [
  { code:"242",    cat:"Forklift",    name:"2000 Gradall 534D-9",                        cap:"9,000 lb",   daily:790  },
  { code:"300",    cat:"Forklift",    name:"Caterpillar GC35K",                          cap:"15,500 lb",  daily:840  },
  { code:"301",    cat:"Forklift",    name:"HysterS80XLBCS",                             cap:"8,000 lb",   daily:530  },
  { code:"302",    cat:"Forklift",    name:"Cat125D 12,500 LB Forklift",                 cap:"12,500 lb",  daily:850  },
  { code:"308",    cat:"Forklift",    name:"Cat T150D 15,000 LB Forklift",               cap:"15,000 lb",  daily:950  },
  { code:"320",    cat:"Forklift",    name:"Royal T300B 30,000 lb",                      cap:"30,000 lb",  daily:1100 },
  { code:"322",    cat:"Forklift",    name:"Rigger's Special 80-100k",                   cap:"100,000 lb", daily:1200 },
  { code:"237",    cat:"Aerial Lift", name:"Skyjack SJ3226",                             cap:"–",          daily:250  },
  { code:"251",    cat:"Aerial Lift", name:"JLG 450AJ Lift",                             cap:"–",          daily:525  },
  { code:"254",    cat:"Aerial Lift", name:"JLG 600S Boom",                              cap:"–",          daily:650  },
  { code:"255",    cat:"Aerial Lift", name:"2013 Skyjack SJ4632",                        cap:"–",          daily:375  },
  { code:"259",    cat:"Aerial Lift", name:"2015 Skyjack SJ3219",                        cap:"–",          daily:155  },
  { code:"250",    cat:"Crane",       name:"2005 Broderson IC-200-3F 30-Ton Carry Deck", cap:"30,000 lb",  daily:1000 },
  { code:"257",    cat:"Crane",       name:"Broderson IC80-2D 17,000 lb Carry Deck",     cap:"17,000 lb",  daily:750  },
  { code:"RP8x10", cat:"Misc",        name:"8'×10' Steel Road Plates",                   cap:"–",          daily:90   },
  { code:"RP4x10", cat:"Misc",        name:"4'×10' Steel Road Plates",                   cap:"–",          daily:90   },
  { code:"RP8x12", cat:"Misc",        name:"8'×12' Steel Road Plates",                   cap:"–",          daily:90   },
  { code:"RP8x20", cat:"Misc",        name:"8'×20' Steel Road Plates",                   cap:"–",          daily:100  },
  { code:"GANG",   cat:"Tools",       name:"Gang Box Charge",                             cap:"–",          daily:50   },
  { code:"CONEX",  cat:"Tools",       name:"Conex Job Trailer",                           cap:"–",          daily:50   },
  { code:"TORCH",  cat:"Tools",       name:"Torch Outfit",                                cap:"–",          daily:50   },
  { code:"100D",   cat:"Truck",       name:"2007 Inter 9200 Tractor",                     cap:"–",          daily:1000 },
  { code:"110D",   cat:"Truck",       name:"2008 Landall Trailer",                        cap:"–",          daily:1000 },
  { code:"111D",   cat:"Truck",       name:"1999 Fontaine Flatbed Trailer",               cap:"–",          daily:1000 },
  { code:"SEMI",   cat:"Truck",       name:"Semi Truck and Trailer",                      cap:"–",          daily:1000 },
  { code:"CONE",   cat:"Truck",       name:"Semi Truck and Conestoga",                    cap:"–",          daily:1500 },
  { code:"PICK",   cat:"Truck",       name:"Pickup Truck",                                cap:"–",          daily:125  },
];

const EQ_MAP = {};
EQUIPMENT.forEach(e => { EQ_MAP[e.code] = e; });
const EQ_CATS = [...new Set(EQUIPMENT.map(e => e.cat))];

const CUSTOMERS = [
  "Apex Industrial LLC","Beacon Manufacturing Co.","Cornerstone Plastics Inc.",
  "Delta Fabrication Group","Eagle Press & Die","Frontier Castings Ltd.",
  "Gateway Precision Tools","Horizon Automotive Parts","Icon Rubber Products",
  "Junction Steel Works","Keystone Die Casting","Landmark Tooling Inc.",
  "Meridian Extrusion Co.","Northgate Aluminum","Overland Transport Mfg.",
  "Pinnacle Forge & Stamp","Quartz Industrial Services","Ridgeline Machine Works",
  "Summit Plastics Group","Titan Manufacturing LLC",
];

const PER_DIEM = 50;
const HOTEL    = 120;

const INIT_CUSTOMER_RATES = {
  "Apex Industrial LLC": {
    Foreman:      { reg:80, ot:120 },
    Rigger:       { reg:76, ot:114 },
    Labor:        { reg:70, ot:105 },
    Operator:     { reg:76, ot:114 },
    "CDL Driver": { reg:70, ot:105 },
  },
};

const SAMPLE_QUOTES = [
  // Apex Industrial LLC
  { id:1,  qn:"RIG-2024-001", client:"Apex Industrial LLC",       jobSite:"1200 Industrial Pkwy, Akron, OH 44312",      desc:"Press line relocation – Bay 4",          date:"2024-11-12", status:"Won",       qtype:"Contract", labor:38400, equip:32000, hauling:9800,  travel:2400, mats:4000,  total:84200,  markup:0,    salesAssoc:"Dan M",   jobNum:"J-2024-112", startDate:"2026-03-17", compDate:"2026-03-22", locked:true,  salesAdjustments:[{id:1,amount:4200,reason:"Additional Work",note:"Added crane pick for Bay 5 beam install",date:"2025-01-10"},{id:2,amount:-1500,reason:"Discount",note:"Loyalty discount applied per management approval",date:"2025-01-12"}], notes:"Long-term client.", attachments:[{name:"floor-plan.pdf"}], contactName:"James Whitfield",  contactEmail:"j.whitfield@apexind.com",    contactPhone:"330-555-0182", equipList:["300","250","SEMI"] },
  { id:2,  qn:"RIG-2024-008", client:"Apex Industrial LLC",       jobSite:"1200 Industrial Pkwy, Akron, OH 44312",      desc:"Overhead crane installation – Bay 7",    date:"2024-08-20", status:"Won",       qtype:"Contract", labor:52000, equip:44000, hauling:11000, travel:3200, mats:6000,  total:112000, markup:0.08, salesAssoc:"Dan M",   jobNum:"J-2024-088", startDate:"2026-04-07", compDate:"2026-04-12", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"James Whitfield",  contactEmail:"j.whitfield@apexind.com",    contactPhone:"330-555-0182", equipList:["250","320","PICK"] },
  { id:3,  qn:"RIG-2025-007", client:"Apex Industrial LLC",       jobSite:"1200 Industrial Pkwy, Akron, OH 44312",      desc:"Injection mold press relocation",        date:"2025-02-10", status:"Submitted", qtype:"T&M",      labor:24000, equip:19000, hauling:6500,  travel:1800, mats:2800,  total:54100,  markup:0.05, salesAssoc:"Sarah K", jobNum:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"Follow up on approval.", attachments:[], contactName:"Rick Torres",      contactEmail:"r.torres@apexind.com",       contactPhone:"330-555-0199", equipList:["302","PICK"] },
  // Beacon Manufacturing Co.
  { id:4,  qn:"RIG-2024-002", client:"Beacon Manufacturing Co.",  jobSite:"500 Commerce Blvd, Dayton, OH 45402",        desc:"Hydraulic press installation",           date:"2024-12-01", status:"Submitted", qtype:"Contract", labor:56000, equip:62000, hauling:18000, travel:6500, mats:6500,  total:142500, markup:0,    salesAssoc:"Sarah K", jobNum:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"", attachments:[], contactName:"Carolyn Marsh",    contactEmail:"c.marsh@beaconmfg.com",      contactPhone:"937-555-0244", equipList:["300","257","SEMI","PICK"] },
  { id:5,  qn:"RIG-2024-011", client:"Beacon Manufacturing Co.",  jobSite:"500 Commerce Blvd, Dayton, OH 45402",        desc:"CNC lathe bank relocation – Bldg B",    date:"2024-09-15", status:"Won",       qtype:"Contract", labor:31000, equip:27000, hauling:8000,  travel:2200, mats:3400,  total:71600,  markup:0.07, salesAssoc:"Sarah K", jobNum:"J-2024-095", startDate:"2026-03-24", compDate:"2026-03-27", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Carolyn Marsh",    contactEmail:"c.marsh@beaconmfg.com",      contactPhone:"937-555-0244", equipList:["300","SEMI"] },
  { id:6,  qn:"RIG-2025-003", client:"Beacon Manufacturing Co.",  jobSite:"500 Commerce Blvd, Dayton, OH 45402",        desc:"Transformer set – electrical bay",       date:"2025-01-22", status:"Draft",     qtype:"T&M",      labor:18000, equip:21000, hauling:5500,  travel:1600, mats:2200,  total:48300,  markup:0,    salesAssoc:"Mike R",  jobNum:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"", attachments:[], contactName:"Doug Hensley",     contactEmail:"d.hensley@beaconmfg.com",    contactPhone:"937-555-0280", equipList:["257","PICK"] },
  // Cornerstone Plastics Inc.
  { id:7,  qn:"RIG-2024-003", client:"Cornerstone Plastics Inc.", jobSite:"800 Factory Dr, Columbus, OH 43219",         desc:"Kiln dismantle & reinstall",             date:"2024-12-15", status:"Draft",     qtype:"T&M",      labor:28000, equip:24000, hauling:7200,  travel:2400, mats:2600,  total:61800,  markup:0,    salesAssoc:"Dan M",   jobNum:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"", attachments:[], contactName:"",                 contactEmail:"",                           contactPhone:"", equipList:["308","PICK"] },
  { id:8,  qn:"RIG-2024-015", client:"Cornerstone Plastics Inc.", jobSite:"800 Factory Dr, Columbus, OH 43219",         desc:"Blow mold machine relocation",           date:"2024-10-08", status:"Lost",      qtype:"Contract", labor:22000, equip:18000, hauling:5200,  travel:1500, mats:2100,  total:49500,  markup:0,    salesAssoc:"Dan M",   jobNum:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"Lost to competitor.", attachments:[], contactName:"Pat Gilmore",      contactEmail:"p.gilmore@cornerstone.com",  contactPhone:"614-555-0312", equipList:["301"] },
  { id:9,  qn:"RIG-2025-009", client:"Cornerstone Plastics Inc.", jobSite:"1450 Westgate Blvd, Columbus, OH 43228",     desc:"New facility equipment install",         date:"2025-03-01", status:"Submitted", qtype:"Contract", labor:41000, equip:36000, hauling:10500, travel:3100, mats:4800,  total:95400,  markup:0.08, salesAssoc:"Mike R",  jobNum:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"New location.", attachments:[], contactName:"Pat Gilmore",      contactEmail:"p.gilmore@cornerstone.com",  contactPhone:"614-555-0312", equipList:["320","250","SEMI"] },
  // Delta Fabrication Group
  { id:10, qn:"RIG-2025-001", client:"Delta Fabrication Group",   jobSite:"300 Metalworks Ave, Cleveland, OH 44124",   desc:"Aluminum furnace relocation",            date:"2025-01-08", status:"Lost",      qtype:"Contract", labor:21000, equip:18500, hauling:5800,  travel:1400, mats:2000,  total:47300,  markup:0,    salesAssoc:"Sarah K", jobNum:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"", attachments:[], contactName:"",                 contactEmail:"",                           contactPhone:"", equipList:["300","PICK"] },
  { id:11, qn:"RIG-2024-019", client:"Delta Fabrication Group",   jobSite:"300 Metalworks Ave, Cleveland, OH 44124",   desc:"Press brake relocation – north wing",    date:"2024-11-30", status:"Won",       qtype:"Contract", labor:29000, equip:24500, hauling:7100,  travel:2000, mats:3100,  total:65700,  markup:0.07, salesAssoc:"Mike R",  jobNum:"J-2024-119", startDate:"2026-03-18", compDate:"2026-03-21", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Sandra Voss",      contactEmail:"s.voss@deltafab.com",        contactPhone:"216-555-0415", equipList:["300","257","SEMI"] },
  { id:12, qn:"RIG-2025-011", client:"Delta Fabrication Group",   jobSite:"300 Metalworks Ave, Cleveland, OH 44124",   desc:"Stamping line expansion – Bay 9",        date:"2025-02-20", status:"Draft",     qtype:"T&M",      labor:35000, equip:31000, hauling:9000,  travel:2700, mats:4200,  total:81900,  markup:0,    salesAssoc:"Dan M",   jobNum:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"", attachments:[], contactName:"Sandra Voss",      contactEmail:"s.voss@deltafab.com",        contactPhone:"216-555-0415", equipList:["320","PICK"] },
  // Eagle Press & Die
  { id:13, qn:"RIG-2025-002", client:"Eagle Press & Die",         jobSite:"500 Eagle Way, Canton, OH 44702",            desc:"Press relocation – Building B",          date:"2025-02-14", status:"Won",       qtype:"Contract", labor:44000, equip:38000, hauling:12000, travel:3200, mats:5200,  total:98000,  markup:0.10, salesAssoc:"Mike R",  jobNum:"J-2025-001", startDate:"2026-03-19", compDate:"2026-03-22", locked:true,  salesAdjustments:[], notes:"Priority client.", attachments:[], contactName:"Bob Trexler",      contactEmail:"b.trexler@eaglepress.com",   contactPhone:"330-555-0311", equipList:["300","250","SEMI","PICK"] },
  { id:14, qn:"RIG-2024-022", client:"Eagle Press & Die",         jobSite:"500 Eagle Way, Canton, OH 44702",            desc:"Die spotting press removal",             date:"2024-07-10", status:"Won",       qtype:"Contract", labor:18500, equip:15500, hauling:4800,  travel:1300, mats:1900,  total:42800,  markup:0.08, salesAssoc:"Mike R",  jobNum:"J-2024-071", startDate:"2026-04-14", compDate:"2026-04-16", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Bob Trexler",      contactEmail:"b.trexler@eaglepress.com",   contactPhone:"330-555-0311", equipList:["302","PICK"] },
  { id:15, qn:"RIG-2025-013", client:"Eagle Press & Die",         jobSite:"500 Eagle Way, Canton, OH 44702",            desc:"Robotic welding cell relocation",        date:"2025-03-05", status:"Draft",     qtype:"T&M",      labor:27000, equip:22000, hauling:6200,  travel:1900, mats:2800,  total:59900,  markup:0,    salesAssoc:"Dan M",   jobNum:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"", attachments:[], contactName:"Lisa Brandt",      contactEmail:"l.brandt@eaglepress.com",    contactPhone:"330-555-0322", equipList:["308","257"] },
  // Frontier Castings Ltd.
  { id:16, qn:"RIG-2025-003", client:"Frontier Castings Ltd.",    jobSite:"900 Industrial Blvd, Youngstown, OH 44503",  desc:"Furnace installation",                   date:"2025-02-28", status:"Submitted", qtype:"T&M",      labor:32000, equip:28000, hauling:8500,  travel:2800, mats:3400,  total:74700,  markup:0.08, salesAssoc:"Dan M",   jobNum:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"", attachments:[], contactName:"Tony Ruiz",        contactEmail:"t.ruiz@frontiercasting.com", contactPhone:"330-555-0518", equipList:["320","SEMI"] },
  { id:17, qn:"RIG-2024-027", client:"Frontier Castings Ltd.",    jobSite:"900 Industrial Blvd, Youngstown, OH 44503",  desc:"Sand casting conveyor relocation",       date:"2024-09-22", status:"Won",       qtype:"Contract", labor:39000, equip:33000, hauling:9500,  travel:2900, mats:4300,  total:88700,  markup:0.07, salesAssoc:"Sarah K", jobNum:"J-2024-097", startDate:"2026-03-17", compDate:"2026-03-20", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Tony Ruiz",        contactEmail:"t.ruiz@frontiercasting.com", contactPhone:"330-555-0518", equipList:["300","257","SEMI"] },
  { id:18, qn:"RIG-2025-016", client:"Frontier Castings Ltd.",    jobSite:"900 Industrial Blvd, Youngstown, OH 44503",  desc:"Core room equipment upgrade",            date:"2025-03-10", status:"Draft",     qtype:"Contract", labor:19000, equip:16500, hauling:4800,  travel:1400, mats:2100,  total:43800,  markup:0,    salesAssoc:"Mike R",  jobNum:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"", attachments:[], contactName:"Angela Kim",        contactEmail:"a.kim@frontiercasting.com",  contactPhone:"330-555-0530", equipList:["308","PICK"] },
];

const SAMPLE_REQS = [
  { id:101, rn:"REQ-2025-001", company:"Apex Industrial LLC",      requester:"James Whitfield", email:"j.whitfield@apexind.com",  phone:"330-555-0182", jobSite:"1200 Industrial Pkwy, Akron, OH 44312",   desc:"Relocate 40-ton hydraulic press from Bay 3 to Bay 7, approx. 200ft move.", notes:"",                          date:"2025-03-10", status:"New",         salesAssoc:"" },
  { id:102, rn:"REQ-2025-002", company:"Beacon Manufacturing Co.", requester:"Carolyn Marsh",   email:"c.marsh@beaconmfg.com",    phone:"937-555-0244", jobSite:"500 Commerce Blvd, Dayton, OH 45402",     desc:"Install new transformer, 15,000 lbs, second floor, dock access available.", notes:"Need quote by end of week.", date:"2025-03-12", status:"In Progress", salesAssoc:"Dan M" },
];

// Initial customer contact books and notes
const INIT_CUST_DATA = {
  "Apex Industrial LLC":       {
    notes:"Long-term client since 2019. Always pays on time.",
    billingAddr:"1200 Industrial Pkwy, Akron, OH 44312", website:"www.apexindustrial.com",
    industry:"Heavy Manufacturing", paymentTerms:"Net 30", accountNum:"APX-001",
    contacts:[
      {id:1,name:"James Whitfield",title:"Plant Manager",email:"j.whitfield@apexind.com",phone:"330-555-0182",primary:true,locationId:null},
      {id:2,name:"Rick Torres",title:"Maintenance Supervisor",email:"r.torres@apexind.com",phone:"330-555-0199",primary:false,locationId:null}
    ],
    locations:[
      {id:"loc1",name:"Akron Main Plant",address:"1200 Industrial Pkwy, Akron, OH 44312",notes:"Primary facility"}
    ]
  },
  "Beacon Manufacturing Co.":  {
    notes:"Mid-size shop. Multiple locations. Carolyn handles all rigging requests.",
    billingAddr:"500 Commerce Blvd, Dayton, OH 45402", website:"www.beaconmfg.com",
    industry:"Precision Manufacturing", paymentTerms:"Net 45", accountNum:"BCN-002",
    contacts:[
      {id:1,name:"Carolyn Marsh",title:"Facilities Director",email:"c.marsh@beaconmfg.com",phone:"937-555-0244",primary:true,locationId:"loc1"},
      {id:2,name:"Doug Hensley",title:"Maintenance Manager",email:"d.hensley@beaconmfg.com",phone:"937-555-0280",primary:false,locationId:"loc2"}
    ],
    locations:[
      {id:"loc1",name:"Dayton Facility",address:"500 Commerce Blvd, Dayton, OH 45402",notes:"HQ and main production"},
      {id:"loc2",name:"Springfield Warehouse",address:"220 Warehouse Dr, Springfield, OH 45501",notes:"Secondary storage"}
    ]
  },
  "Cornerstone Plastics Inc.": {
    notes:"Growing account. New facility planned for 2026.",
    billingAddr:"800 Factory Dr, Columbus, OH 43219", website:"",
    industry:"Plastics Manufacturing", paymentTerms:"Net 30", accountNum:"CRN-003",
    contacts:[{id:1,name:"Pat Gilmore",title:"Operations Manager",email:"p.gilmore@cornerstone.com",phone:"614-555-0312",primary:true,locationId:null}],
    locations:[{id:"loc1",name:"Columbus Plant",address:"800 Factory Dr, Columbus, OH 43219",notes:""}]
  },
  "Delta Fabrication Group":   {
    notes:"Competitive bidding environment. Price-sensitive.",
    billingAddr:"300 Metalworks Ave, Cleveland, OH 44124", website:"www.deltafab.com",
    industry:"Metal Fabrication", paymentTerms:"Net 30", accountNum:"DLT-004",
    contacts:[{id:1,name:"Sandra Voss",title:"Purchasing Manager",email:"s.voss@deltafab.com",phone:"216-555-0415",primary:true,locationId:null}],
    locations:[{id:"loc1",name:"Cleveland Fab Shop",address:"300 Metalworks Ave, Cleveland, OH 44124",notes:""}]
  },
  "Eagle Press & Die":         {
    notes:"Excellent relationship. Repeat business every quarter.",
    billingAddr:"500 Eagle Way, Canton, OH 44702", website:"www.eaglepress.com",
    industry:"Press & Die Manufacturing", paymentTerms:"Net 15", accountNum:"EGL-005",
    contacts:[
      {id:1,name:"Bob Trexler",title:"VP Operations",email:"b.trexler@eaglepress.com",phone:"330-555-0311",primary:true,locationId:"loc1"},
      {id:2,name:"Lisa Brandt",title:"Plant Engineer",email:"l.brandt@eaglepress.com",phone:"330-555-0322",primary:false,locationId:"loc1"}
    ],
    locations:[{id:"loc1",name:"Canton Facility",address:"500 Eagle Way, Canton, OH 44702",notes:""}]
  },
  "Frontier Castings Ltd.":    {
    notes:"Union shop. Require certified rigging documentation.",
    billingAddr:"900 Industrial Blvd, Youngstown, OH 44503", website:"",
    industry:"Metal Casting", paymentTerms:"Net 45", accountNum:"FRT-006",
    contacts:[
      {id:1,name:"Tony Ruiz",title:"Safety & Facilities",email:"t.ruiz@frontiercasting.com",phone:"330-555-0518",primary:true,locationId:null},
      {id:2,name:"Angela Kim",title:"Project Coordinator",email:"a.kim@frontiercasting.com",phone:"330-555-0530",primary:false,locationId:null}
    ],
    locations:[{id:"loc1",name:"Youngstown Plant",address:"900 Industrial Blvd, Youngstown, OH 44503",notes:""}]
  },
};

// Default profile template — defines which fields appear on all customer profiles
const DEFAULT_PROFILE_TEMPLATE = [
  { key:"billingAddr",   label:"Billing Address",   type:"textarea", enabled:true  },
  { key:"website",       label:"Website",            type:"text",     enabled:true  },
  { key:"industry",      label:"Industry",           type:"text",     enabled:true  },
  { key:"paymentTerms",  label:"Payment Terms",      type:"text",     enabled:true  },
  { key:"accountNum",    label:"Account Number",     type:"text",     enabled:true  },
  { key:"taxId",         label:"Tax ID / EIN",       type:"text",     enabled:false },
  { key:"creditLimit",   label:"Credit Limit",       type:"text",     enabled:false },
  { key:"certRequired",  label:"Certifications Required", type:"text",enabled:false },
  { key:"safetyContact", label:"Safety Contact",     type:"text",     enabled:false },
  { key:"preferredContact", label:"Preferred Contact Method", type:"text", enabled:false },
];


// ── UTILS ─────────────────────────────────────────────────────────────────────
const fmt    = n  => "$" + Math.round(n||0).toLocaleString();
const uid    = () => Date.now() + Math.floor(Math.random()*10000);
const nextQN = () => "RIG-" + new Date().getFullYear() + "-" + String(Math.floor(Math.random()*900+100));
const nextRN = () => "REQ-" + new Date().getFullYear() + "-" + String(Math.floor(Math.random()*900+100));
const today  = () => new Date().toISOString().slice(0,10);

function defLaborRows(client, customerRates) {
  const cr = customerRates[client];
  return ["Foreman","Rigger","Labor"].map(role => {
    const b  = BASE_LABOR.find(r => r.role === role);
    const sp = cr && cr[role];
    return { id:uid(), role, workers:0, regHrs:0, otHrs:0, days:0,
             special:!!sp, overReg:sp?sp.reg:b.reg, overOT:sp?sp.ot:b.ot,
             note:sp?"Special rate":"" };
  });
}

function blankQuote(req, customerRates, isCO=false, parentQ=null) {
  const client = req?.company || "";
  return {
    id:uid(), qn:nextQN(), client,
    jobSite:      req?.jobSite    || "",
    desc:         isCO && parentQ ? `Change Order – ${parentQ.desc}` : (req?.desc || ""),
    contactName:  req?.requester  || "",
    contactEmail: req?.email      || "",
    contactPhone: req?.phone      || "",
    salesAssoc:   req?.salesAssoc  || "",
    date:today(), status:"Draft", qtype:"Contract", markup:0,
    fromReqId: req?.id    || null,
    parentId:  parentQ?.id || null,
    isChangeOrder: isCO,
    locked:false, jobNum:"", compDate:"",
    notes:"", attachments:[], salesAdjustments:[],
    laborRows:    defLaborRows(client, customerRates),
    travelRows:   [{ id:uid(), label:"First Mobilization", workers:0, days:0, perDiem:false, hotel:false }],
    equipRows:    [{ id:uid(), code:"300", days:0, ship:0, overRate:false, overDaily:840, overNote:"" }],
    haulingRows:  [{ id:uid(), vendor:"", desc:"", cost:0, markup:0.35 }],
    matRows:      [{ id:uid(), vendor:"", desc:"", cost:0, markup:0.15 }],
  };
}


// ── INTAKE → ESTIMATE PREFILL ──────────────────────────────────────────────
function intakeToQuote(intake, customerRates, eqMap) {
  const machines  = intake.machines || [];
  const firstM    = machines[0] || {};
  const client    = intake.customer || "";
  const sites     = intake.sites || [];
  const origin    = sites[0] || {};
  const dest      = sites[sites.length-1] || {};
  const isMulti   = intake.multiSite && sites.length > 1;
  const outOfTown = (intake.scopeTypes||[]).includes("Out-of-Town");

  // Job site string
  const siteStr = origin.address || [origin.street, origin.city, origin.state, origin.zip].filter(Boolean).join(", ");
  const destStr = isMulti ? (dest.address || [dest.street, dest.city, dest.state].filter(Boolean).join(", ")) : "";

  // Description from machines
  const machineDesc = machines.length === 1
    ? [firstM.equipDesc, firstM.manufacturer, firstM.model].filter(Boolean).join(" — ")
    : machines.map((m,i) => `M${i+1}: ${m.equipDesc||"Machine"}`).join(" · ");

  // Scope summary
  const scopeDesc = (intake.scopeTypes||[]).join(", ");
  const fullDesc  = [machineDesc, scopeDesc].filter(Boolean).join(" | ");

  // Date from phases or requestedDate
  const phases    = intake.splitDates ? (intake.dateSegments||[]) : [];
  const startDate = phases[0]?.startDate || intake.requestedDate || "";
  const endDate   = phases[phases.length-1]?.endDate || intake.requestedDate || "";

  // Labor rows — map intake labor to estimate format
  // Intake: { role, regHrs, otHrs, estDays }
  // Estimate: { id, role, workers, regHrs, otHrs, days, special, overReg, overOT, note }
  const cr = customerRates[client] || {};
  const laborRows = (intake.laborRows||[])
    .filter(r => r.regHrs || r.otHrs || r.estDays)
    .map(r => {
      const b   = BASE_LABOR.find(x => x.role===r.role) || BASE_LABOR[0];
      const sp  = cr[r.role];
      const days = Number(r.estDays) || Math.ceil((Number(r.regHrs||0)+Number(r.otHrs||0))/8) || 1;
      return {
        id: uid(), role: r.role,
        workers: 1,
        regHrs:  Number(r.regHrs) || 0,
        otHrs:   Number(r.otHrs)  || 0,
        days,
        special: !!sp,
        overReg: sp ? sp.reg : b.reg,
        overOT:  sp ? sp.ot  : b.ot,
        note:    sp ? "Special rate" : "",
      };
    });

  // Fall back to default labor if intake had none filled in
  const finalLaborRows = laborRows.length > 0 ? laborRows : defLaborRows(client, customerRates);

  // Equipment rows — from intake checklist
  const equipRows = Object.keys(intake.equipChecked||{})
    .filter(k => intake.equipChecked[k] && !k.includes("_"))
    .map(code => {
      const eq    = eqMap[code] || {};
      const days  = Number(intake[`${code}_days`]) || 1;
      const daily = eq.daily || 0;
      return { id:uid(), code, days, ship:0, overRate:false, overDaily:daily, overNote:"" };
    });

  const finalEquipRows = equipRows.length > 0
    ? equipRows
    : [{ id:uid(), code:"300", days:1, ship:0, overRate:false, overDaily:840, overNote:"" }];

  // Hauling rows — from subRows (subcontractors, crane rentals, equipment rentals)
  const haulingRows = (intake.subRows||[])
    .filter(r => r.vendor && ["Subcontractor","Crane Rental (w/ Operator)","Equipment Rental","Permit","Other"].includes(r.type))
    .map(r => ({
      id:uid(), vendor:r.vendor||"",
      desc: r.type + (r.notes ? ` — ${r.notes}` : ""),
      cost: Number(r.cost)||0, markup:0.35,
    }));

  const finalHaulingRows = haulingRows.length > 0
    ? haulingRows
    : [{ id:uid(), vendor:"", desc:"", cost:0, markup:0.35 }];

  // Material rows — from subRows type=Material
  const matRows = (intake.subRows||[])
    .filter(r => r.vendor && r.type === "Material")
    .map(r => ({
      id:uid(), vendor:r.vendor||"",
      desc: r.notes || r.vendor,
      cost: Number(r.cost)||0, markup:0.15,
    }));

  const finalMatRows = matRows.length > 0
    ? matRows
    : [{ id:uid(), vendor:"", desc:"", cost:0, markup:0.15 }];

  // Travel rows — out of town gets per diem
  const travelRows = outOfTown
    ? [{ id:uid(), label:"First Mobilization", workers: finalLaborRows.length||1, days:1, perDiem:true, hotel:true }]
    : [{ id:uid(), label:"First Mobilization", workers:0, days:0, perDiem:false, hotel:false }];

  return {
    id:uid(), qn:nextQN(),
    client,
    jobSite:      isMulti ? `${siteStr} → ${destStr}` : siteStr,
    desc:         fullDesc,
    contactName:  intake.contactName  || "",
    contactEmail: intake.email        || "",
    contactPhone: intake.phone        || "",
    salesAssoc:   intake.estimator    || "",
    date:         today(),
    status:       "Draft",
    qtype:        "Contract",
    markup:       0,
    fromIntakeId: intake.id           || null,
    fromReqId:    intake.rfqId        || null,
    startDate,
    compDate:     endDate,
    locked:       false,
    jobNum:       "",
    notes:        intake.specialNotes || "",
    attachments:  [],
    salesAdjustments: [],
    laborRows:    finalLaborRows,
    travelRows,
    equipRows:    finalEquipRows,
    haulingRows:  finalHaulingRows,
    matRows:      finalMatRows,
  };
}

function calcQuote(q, customerRates, eqOv, eqMapArg) {
  const _eqMap = eqMapArg || EQ_MAP;
  const labor = (q.laborRows||[]).reduce((s,r) => {
    const b  = BASE_LABOR.find(x => x.role===r.role) || BASE_LABOR[0];
    const rR = r.special ? Number(r.overReg) : b.reg;
    const oR = r.special ? Number(r.overOT)  : b.ot;
    return s + (rR*r.workers*(r.regHrs||0)*r.days) + (oR*r.workers*(r.otHrs||0)*r.days);
  }, 0);
  const laborCost = (q.laborRows||[]).reduce((s,r) => {
    const b  = BASE_LABOR.find(x => x.role===r.role) || BASE_LABOR[0];
    const rR = r.special ? Number(r.overReg) : b.costReg;
    const oR = r.special ? Number(r.overOT)  : b.costOT;
    return s + (rR*r.workers*(r.regHrs||0)*r.days) + (oR*r.workers*(r.otHrs||0)*r.days);
  }, 0);
  const travel = (q.travelRows||[]).reduce((s,r) =>
    s + r.workers*r.days*((r.perDiem?PER_DIEM:0)+(r.hotel?HOTEL:0)), 0);
  const equip = (q.equipRows||[]).reduce((s,r) => {
    const e  = _eqMap[r.code];
    const bd = eqOv[r.code] ? eqOv[r.code].daily : (e?e.daily:0);
    const d  = r.overRate ? Number(r.overDaily) : bd;
    return s + d*r.days + Number(r.ship||0);
  }, 0);
  const equipCost = (q.equipRows||[]).reduce((s,r) => {
    const e = _eqMap[r.code];
    return s + (e?e.daily*r.days:0) + Number(r.ship||0);
  }, 0);
  const hauling  = (q.haulingRows||[]).reduce((s,r) => s+Number(r.cost)*(1+Number(r.markup||0)), 0);
  const mats     = (q.matRows||[]).reduce((s,r) => s+Number(r.cost)*(1+Number(r.markup||0.15)), 0);
  const sub      = labor+travel+equip+hauling+mats;
  const muAmt    = sub*(q.markup||0);
  const total    = sub+muAmt;
  const dc       = laborCost+travel+equipCost
                 + (q.haulingRows||[]).reduce((s,r)=>s+Number(r.cost),0)
                 + (q.matRows||[]).reduce((s,r)=>s+Number(r.cost),0);
  const np       = total-dc;
  const nm       = total>0 ? (np/total)*100 : 0;
  return { labor, travel, equip, hauling, mats, sub, muAmt, total, dc, np, nm };
}

// ── THEME ─────────────────────────────────────────────────────────────────────
const C = {
  bg:"#f5f6f8", sur:"#ffffff", bdr:"#e2e5ea", bdrM:"#c8cdd5",
  txt:"#1c1f26", txtM:"#4a5060", txtS:"#8a93a2",
  acc:"#b86b0a", accL:"#fff7ed", accB:"#f5a623",
  blue:"#2563eb", bluB:"#eff6ff", bluBdr:"#bfdbfe",
  grn:"#16a34a", grnB:"#f0fdf4", grnBdr:"#bbf7d0",
  red:"#dc2626", redB:"#fef2f2", redBdr:"#fecaca",
  ora:"#ea580c", teal:"#0d9488", purp:"#7c3aed", lime:"#15803d",
  yel:"#b45309", yelB:"#fffbeb", yelBdr:"#fde68a",
};

const SS = {
  Draft:          { bg:"#f1f5f9", cl:"#475569", bd:"#cbd5e1" },
  Submitted:      { bg:C.bluB,   cl:C.blue,    bd:C.bluBdr  },
  Won:            { bg:C.grnB,   cl:C.grn,     bd:C.grnBdr  },
  Lost:           { bg:C.redB,   cl:C.red,     bd:C.redBdr  },
  New:            { bg:C.bluB,   cl:C.blue,    bd:C.bluBdr  },
  "In Progress":  { bg:C.yelB,   cl:C.yel,     bd:C.yelBdr  },
  Quoted:         { bg:C.grnB,   cl:C.grn,     bd:C.grnBdr  },
  "Change Order": { bg:"#f5f3ff", cl:"#6d28d9", bd:"#ddd6fe" },
};

const inp = { background:C.sur, border:`1px solid ${C.bdrM}`, borderRadius:5, color:C.txt, fontFamily:"inherit", fontSize:13, padding:"7px 10px", width:"100%", boxSizing:"border-box", outline:"none" };
const sel = { background:C.sur, border:`1px solid ${C.bdrM}`, borderRadius:5, color:C.txt, fontFamily:"inherit", fontSize:13, padding:"7px 8px" };
const tdS = { padding:"7px 5px", borderBottom:`1px solid ${C.bdr}`, verticalAlign:"middle" };
const thS = { color:C.txtS, fontSize:11, fontWeight:600, paddingBottom:8, textAlign:"left", textTransform:"uppercase", whiteSpace:"nowrap" };

function mkBtn(v="primary") {
  const m = {
    primary: { bg:C.acc,  cl:"#fff",  bd:"none" },
    blue:    { bg:C.blue, cl:"#fff",  bd:"none" },
    outline: { bg:C.sur,  cl:C.acc,   bd:`1.5px solid ${C.accB}` },
    ghost:   { bg:C.sur,  cl:C.txtM,  bd:`1px solid ${C.bdr}` },
    danger:  { bg:C.redB, cl:C.red,   bd:`1px solid ${C.redBdr}` },
    won:     { bg:C.grnB, cl:C.grn,   bd:`1px solid ${C.grnBdr}` },
  };
  const x = m[v] || m.primary;
  return { background:x.bg, color:x.cl, border:x.bd, borderRadius:6, padding:"7px 13px", fontSize:12, fontFamily:"inherit", fontWeight:600, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4, whiteSpace:"nowrap" };
}

// ── SMALL COMPONENTS ──────────────────────────────────────────────────────────
const Badge = ({ status }) => { const x = SS[status]||SS.Draft; return <span style={{ background:x.bg, color:x.cl, border:`1px solid ${x.bd}`, borderRadius:4, padding:"2px 8px", fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>{status}</span>; };
const Lbl   = ({ c }) => <div style={{ fontSize:11, color:C.txtM, marginBottom:3, fontWeight:600 }}>{c}</div>;
const Sec   = ({ c }) => <div style={{ color:C.acc, fontSize:11, letterSpacing:1, marginBottom:10, fontWeight:700, textTransform:"uppercase" }}>{c}</div>;
const XBtn  = ({ on }) => <button onClick={on} style={{ background:"none", border:"none", color:C.txtS, cursor:"pointer", fontSize:17, padding:"0 3px", lineHeight:1 }}>×</button>;
const Card  = ({ children, style={} }) => <div style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:8, padding:16, marginBottom:12, ...style }}>{children}</div>;
const DollarInput = ({ val, on, w=80 }) => (
  <div style={{ display:"flex", alignItems:"center", border:`1px solid ${C.bdrM}`, borderRadius:5, overflow:"hidden", background:C.sur }}>
    <span style={{ padding:"0 6px", color:C.txtS, fontSize:13, borderRight:`1px solid ${C.bdrM}`, background:"#f9fafb", display:"flex", alignItems:"center" }}>$</span>
    <input type="number" value={val} onChange={on} style={{ border:"none", outline:"none", fontFamily:"inherit", fontSize:13, padding:"7px 8px", width:w, background:"transparent", color:C.txt }}/>
  </div>
);

function CostBar({ labor, travel, equip, hauling, mats }) {
  const total = labor+travel+equip+hauling+mats || 1;
  const bars  = [{ l:"Labor",v:labor,c:C.ora },{ l:"Travel",v:travel,c:C.blue },{ l:"Equip",v:equip,c:C.teal },{ l:"Haul",v:hauling,c:C.purp },{ l:"Mats",v:mats,c:C.lime }];
  return (
    <div style={{ marginTop:10 }}>
      <div style={{ display:"flex", height:8, borderRadius:4, overflow:"hidden", gap:1, background:C.bdr }}>
        {bars.map(b => b.v>0 && <div key={b.l} style={{ width:`${b.v/total*100}%`, background:b.c }}/>)}
      </div>
      <div style={{ display:"flex", gap:10, marginTop:6, flexWrap:"wrap" }}>
        {bars.map(b => <div key={b.l} style={{ display:"flex", alignItems:"center", gap:3, fontSize:10, color:C.txtS }}><div style={{ width:7, height:7, borderRadius:2, background:b.c }}/>{b.l} {Math.round(b.v/total*100)}%</div>)}
      </div>
    </div>
  );
}

function AutoInput({ val, on, list, ph }) {
  const [open, setOpen] = useState(false);
  const sg = val.length > 0 ? list.filter(c => c.toLowerCase().includes(val.toLowerCase())).slice(0,6) : [];
  return (
    <div style={{ position:"relative" }}>
      <input style={inp} value={val} placeholder={ph} onChange={e => { on(e.target.value); setOpen(true); }} onBlur={() => setTimeout(()=>setOpen(false), 150)}/>
      {open && sg.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:5, zIndex:200, boxShadow:"0 4px 14px rgba(0,0,0,.1)", maxHeight:200, overflowY:"auto" }}>
          {sg.map(c => <div key={c} style={{ padding:"8px 12px", fontSize:13, cursor:"pointer", borderBottom:`1px solid ${C.bdr}` }} onMouseDown={() => { on(c); setOpen(false); }}>{c}</div>)}
        </div>
      )}
    </div>
  );
}

// ── HEADER ────────────────────────────────────────────────────────────────────
function Header({ view, setView, extra, crumb }) {
  return (
    <div style={{ background:C.sur, borderBottom:`1px solid ${C.bdr}`, padding:"0 14px", display:"flex", alignItems:"center", gap:4, minHeight:54, flexWrap:"wrap", position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginRight:8 }}>
        <div style={{ width:36, height:36, background:C.accL, border:`2px solid ${C.accB}`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⛓</div>
        <div>
          <div style={{ fontFamily:"Georgia,serif", fontSize:13, color:C.acc, fontWeight:700, lineHeight:1.1 }}>Shoemaker</div>
          <div style={{ fontSize:9, color:C.txtS, letterSpacing:.5 }}>RIGGING & TRANSPORT</div>
        </div>
      </div>
      {[["dash","Dashboard"],["jobs","Sales"],["customers","Customers"],["requests","Requests"],["quotes","Quotes"],["equipment","Equip Rates"],["labor","Labor Rates"],["calendar","Calendar"]].map(([v,l]) => (
        <button key={v} onClick={() => setView(v)} style={{ background:"none", border:"none", color:view===v?C.acc:C.txtM, fontSize:12, cursor:"pointer", padding:"4px 8px", borderBottom:view===v?`2px solid ${C.acc}`:"2px solid transparent", fontFamily:"inherit", fontWeight:view===v?700:400, whiteSpace:"nowrap" }}>{l}</button>
      ))}
      {crumb && <><span style={{ color:C.bdr, margin:"0 2px" }}>›</span><span style={{ color:C.txtS, fontSize:12, whiteSpace:"nowrap" }}>{crumb}</span></>}
      {extra && <div style={{ marginLeft:"auto", paddingLeft:8 }}>{extra}</div>}
    </div>
  );
}

function ActionBtns({ onReq, onFromReq, onNew }) {
  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
      <button style={mkBtn("outline")} onClick={onReq}>📋 Quote Request</button>
      <button style={mkBtn("blue")}    onClick={onFromReq}>📄 From Request</button>
      <button style={mkBtn("primary")} onClick={onNew}>+ New Estimate</button>
    </div>
  );
}

// ── MODALS ────────────────────────────────────────────────────────────────────
function ReqModal({ init, onSave, onClose }) {
  const blank = { id:uid(), rn:nextRN(), company:"", requester:"", email:"", phone:"", jobSite:"", desc:"", notes:"", date:today(), status:"New", salesAssoc:"" };
  const [f, setF] = useState(init || blank);
  const u = (k,v) => setF(x => ({ ...x, [k]:v }));
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.35)", zIndex:300, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"20px 12px", overflowY:"auto" }}>
      <div style={{ background:C.sur, borderRadius:10, padding:20, width:"100%", maxWidth:560, boxShadow:"0 8px 28px rgba(0,0,0,.18)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div><div style={{ fontSize:11, color:C.txtS, textTransform:"uppercase", letterSpacing:1 }}>Quote Request</div><div style={{ fontSize:17, fontWeight:700 }}>{f.rn}</div></div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:C.txtS }}>×</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div style={{ gridColumn:"1/-1" }}><Lbl c="COMPANY *"/><AutoInput val={f.company} on={v=>u("company",v)} list={CUSTOMERS} ph="Company name"/></div>
          <div><Lbl c="REQUESTER *"/><input style={inp} value={f.requester} placeholder="Full name" onChange={e=>u("requester",e.target.value)}/></div>
          <div><Lbl c="PHONE"/><input style={inp} value={f.phone} placeholder="XXX-XXX-XXXX" onChange={e=>u("phone",e.target.value)}/></div>
          <div style={{ gridColumn:"1/-1" }}><Lbl c="EMAIL"/><input style={inp} value={f.email} placeholder="email@company.com" onChange={e=>u("email",e.target.value)}/></div>
          <div style={{ gridColumn:"1/-1" }}><Lbl c="JOB SITE ADDRESS"/><input style={inp} value={f.jobSite} placeholder="123 Main St, City, State ZIP" onChange={e=>u("jobSite",e.target.value)}/></div>
          <div style={{ gridColumn:"1/-1" }}><Lbl c="JOB DESCRIPTION *"/><textarea style={{ ...inp, height:80, resize:"vertical" }} value={f.desc} onChange={e=>u("desc",e.target.value)}/></div>
          <div><Lbl c="STATUS"/><select style={{ ...sel, width:"100%" }} value={f.status} onChange={e=>u("status",e.target.value)}>{["New","In Progress","Quoted"].map(x=><option key={x}>{x}</option>)}</select></div>
          <div><Lbl c="SALES ASSOCIATE"/><input style={inp} value={f.salesAssoc||""} placeholder="Sales associate name" onChange={e=>u("salesAssoc",e.target.value)}/></div>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:18, justifyContent:"flex-end" }}>
          <button style={mkBtn("ghost")} onClick={onClose}>Cancel</button>
          <button style={mkBtn("primary")} onClick={() => onSave(f)}>Save Request</button>
        </div>
      </div>
    </div>
  );
}

function WonModal({ quote, onSave, onClose }) {
  const [jn, setJn] = useState("");
  const [cd, setCd] = useState("");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.sur, borderRadius:10, padding:20, width:"100%", maxWidth:420, boxShadow:"0 8px 28px rgba(0,0,0,.2)" }}>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:3 }}>Mark Quote as Won</div>
        <div style={{ fontSize:12, color:C.txtS, marginBottom:14 }}>{quote.qn} — {quote.client}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div><Lbl c="JOB NUMBER *"/><input style={inp} value={jn} placeholder="J-2025-001" onChange={e=>setJn(e.target.value)}/></div>
          <div><Lbl c="EST. COMPLETION DATE"/><input style={inp} type="date" value={cd} onChange={e=>setCd(e.target.value)}/></div>
        </div>
        <div style={{ background:C.yelB, border:`1px solid ${C.yelBdr}`, borderRadius:6, padding:"8px 10px", marginTop:12, fontSize:11, color:C.yel }}>
          Once marked Won, this estimate will be locked. Change orders can still be created.
        </div>
        <div style={{ display:"flex", gap:7, marginTop:14, justifyContent:"flex-end" }}>
          <button style={mkBtn("ghost")} onClick={onClose}>Cancel</button>
          <button style={{ ...mkBtn("won"), opacity:jn?1:.5 }} onClick={() => jn && onSave(jn,cd)}>Mark as Won</button>
        </div>
      </div>
    </div>
  );
}

// ── LABOR RATES PAGE ────────────────────────────────────────────────────────────
function LaborRatesPage({ customerRates, setCustomerRates }) {
  const [selClient, setSelClient]   = useState("");
  const [editRates, setEditRates]   = useState(null); // { role: { reg, ot } }
  const [showForm,  setShowForm]    = useState(false);
  const [newClient, setNewClient]   = useState("");
  const [search,    setSearch]      = useState("");

  const CUSTS_WITH_RATES = Object.keys(customerRates).sort();
  const CUSTS_ALL = [
    "Apex Industrial LLC","Beacon Manufacturing Co.","Cornerstone Plastics Inc.",
    "Delta Fabrication Group","Eagle Press & Die","Frontier Castings Ltd.",
    "Gateway Precision Tools","Horizon Automotive Parts","Junction Steel Works",
    "Keystone Die Casting","Landmark Tooling Inc.","Meridian Extrusion Co.",
    "Northgate Aluminum","Pinnacle Forge & Stamp","Summit Plastics Group",
    "Titan Manufacturing LLC",
  ];

  const inp = {
    background:C.sur, border:`1px solid ${C.bdrM}`, borderRadius:5,
    color:C.txt, fontFamily:"inherit", fontSize:13,
    padding:"6px 8px", outline:"none", width:"100%", boxSizing:"border-box",
  };

  function startEdit(client) {
    const existing = customerRates[client] || {};
    const rates = {};
    BASE_LABOR.forEach(r => {
      rates[r.role] = {
        reg: existing[r.role]?.reg ?? r.reg,
        ot:  existing[r.role]?.ot  ?? r.ot,
      };
    });
    setSelClient(client);
    setEditRates(rates);
  }

  function saveRates() {
    setCustomerRates(prev => ({ ...prev, [selClient]: editRates }));
    setSelClient("");
    setEditRates(null);
  }

  function deleteRates(client) {
    setCustomerRates(prev => {
      const n = { ...prev };
      delete n[client];
      return n;
    });
    if (selClient === client) { setSelClient(""); setEditRates(null); }
  }

  function addNewClient() {
    if (!newClient) return;
    startEdit(newClient);
    setNewClient("");
    setShowForm(false);
  }

  function updRate(role, field, val) {
    setEditRates(prev => ({ ...prev, [role]: { ...prev[role], [field]: Number(val) } }));
  }

  const filteredClients = CUSTS_WITH_RATES.filter(c =>
    !search || c.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding:"16px", maxWidth:1100, margin:"0 auto" }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:20, fontWeight:700 }}>Labor Rates</div>
        <div style={{ fontSize:12, color:C.txtS }}>
          Standard billing and cost rates used in all estimates. Create customer-specific rates that override the standard rates for that client.
        </div>
      </div>

      {/* ── Standard Rates Table ───────────────────────────────────── */}
      <div style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:8, padding:16, marginBottom:16 }}>
        <div style={{ color:C.acc, fontSize:11, letterSpacing:1, marginBottom:12, fontWeight:700, textTransform:"uppercase" }}>
          Standard Rates
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:480 }}>
            <thead>
              <tr>
                {["Role","Bill Regular","Bill OT","Cost Regular","Cost OT","Burden %"].map(h => (
                  <th key={h} style={{ color:C.txtS, fontSize:11, fontWeight:600, paddingBottom:8, textAlign:"left", textTransform:"uppercase", whiteSpace:"nowrap", borderBottom:`2px solid ${C.bdr}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BASE_LABOR.map((r, i) => {
                const burden = r.reg > 0 ? Math.round((1 - r.costReg / r.reg) * 100) : 0;
                return (
                  <tr key={r.role} style={{ background: i%2===0 ? C.sur : C.bg }}>
                    <td style={{ padding:"9px 8px", fontWeight:600, fontSize:13, borderBottom:`1px solid ${C.bdr}` }}>{r.role}</td>
                    <td style={{ padding:"9px 8px", color:C.acc,  fontWeight:700, fontSize:13, borderBottom:`1px solid ${C.bdr}` }}>${r.reg.toFixed(2)}/hr</td>
                    <td style={{ padding:"9px 8px", color:C.ora,  fontWeight:700, fontSize:13, borderBottom:`1px solid ${C.bdr}` }}>${r.ot.toFixed(2)}/hr</td>
                    <td style={{ padding:"9px 8px", color:C.grn,  fontSize:13, borderBottom:`1px solid ${C.bdr}` }}>${r.costReg.toFixed(2)}/hr</td>
                    <td style={{ padding:"9px 8px", color:"#0d9488", fontSize:13, borderBottom:`1px solid ${C.bdr}` }}>${r.costOT.toFixed(2)}/hr</td>
                    <td style={{ padding:"9px 8px", fontSize:12, color:C.txtM, borderBottom:`1px solid ${C.bdr}` }}>
                      <span style={{ background:C.bluB, color:C.blue, border:`1px solid ${C.bluBdr}`, borderRadius:4, padding:"2px 7px", fontSize:11, fontWeight:600 }}>
                        {burden}% margin
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop:10, padding:"8px 12px", background:C.bg, borderRadius:6, fontSize:12, color:C.txtS }}>
          OT rate = 1.5× regular · Cost rates include wages, burden, and overhead · These rates apply to all estimates unless a customer special rate is set
        </div>
      </div>

      {/* ── Customer Special Rates ─────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns: editRates ? "280px 1fr" : "1fr", gap:14, alignItems:"start" }}>

        {/* Left: client list */}
        <div>
          <div style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:8, padding:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ color:C.acc, fontSize:11, letterSpacing:1, fontWeight:700, textTransform:"uppercase" }}>Customer Special Rates</div>
              <button onClick={() => setShowForm(!showForm)} style={{
                background:C.acc, color:"#fff", border:"none", borderRadius:5,
                padding:"4px 10px", fontSize:11, fontWeight:600, cursor:"pointer"
              }}>+ Add</button>
            </div>

            {showForm && (
              <div style={{ background:C.bg, borderRadius:6, padding:10, marginBottom:10, border:`1px solid ${C.bdr}` }}>
                <div style={{ fontSize:11, color:C.txtM, fontWeight:600, marginBottom:5 }}>SELECT CUSTOMER</div>
                <select style={{ ...inp, marginBottom:8 }} value={newClient} onChange={e => setNewClient(e.target.value)}>
                  <option value="">— Choose customer —</option>
                  {CUSTS_ALL.filter(c => !customerRates[c]).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => setShowForm(false)} style={{ background:C.sur, color:C.txtM, border:`1px solid ${C.bdr}`, borderRadius:5, padding:"5px 10px", fontSize:11, fontWeight:600, cursor:"pointer" }}>Cancel</button>
                  <button onClick={addNewClient} style={{ background:C.acc, color:"#fff", border:"none", borderRadius:5, padding:"5px 10px", fontSize:11, fontWeight:600, cursor:"pointer", opacity:newClient?1:.5 }}>Set Rates</button>
                </div>
              </div>
            )}

            <input style={{ ...inp, marginBottom:8 }} placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)}/>

            {filteredClients.length === 0 && (
              <div style={{ color:C.txtS, fontSize:12, padding:"10px 0", textAlign:"center" }}>
                {CUSTS_WITH_RATES.length === 0 ? "No special rates set yet. Click + Add to create one." : "No matches."}
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {filteredClients.map(client => {
                const isActive = selClient === client;
                return (
                  <div key={client} onClick={() => startEdit(client)} style={{
                    background: isActive ? C.accL : C.bg,
                    border: `1px solid ${isActive ? C.accB : C.bdr}`,
                    borderRadius:6, padding:"9px 11px", cursor:"pointer",
                    display:"flex", justifyContent:"space-between", alignItems:"center"
                  }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:13, color: isActive ? C.acc : C.txt }}>{client}</div>
                      <div style={{ fontSize:11, color:C.txtS, marginTop:1 }}>
                        {BASE_LABOR.length} roles customized
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                      <span style={{ background:C.grnB, color:C.grn, border:`1px solid ${C.grnBdr}`, borderRadius:3, fontSize:10, padding:"1px 6px", fontWeight:600 }}>Active</span>
                      <button onClick={e => { e.stopPropagation(); deleteRates(client); }} style={{ background:"none", border:"none", color:C.txtS, cursor:"pointer", fontSize:16, padding:"0 3px", lineHeight:1 }} title="Delete special rates">×</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: rate editor */}
        {editRates && (
          <div style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:8, padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:11, color:C.txtS, textTransform:"uppercase", letterSpacing:1 }}>Special Rates For</div>
                <div style={{ fontSize:16, fontWeight:700, color:C.acc, marginTop:1 }}>{selClient}</div>
              </div>
              <button onClick={() => { setSelClient(""); setEditRates(null); }} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.txtS }}>×</button>
            </div>

            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:420 }}>
                <thead>
                  <tr style={{ borderBottom:`2px solid ${C.bdr}` }}>
                    {["Role","Std Bill Reg","Std Bill OT","Custom Bill Reg","Custom Bill OT","Diff"].map(h => (
                      <th key={h} style={{ color:C.txtS, fontSize:11, fontWeight:600, paddingBottom:8, textAlign:"left", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BASE_LABOR.map((r, i) => {
                    const cr = editRates[r.role] || { reg: r.reg, ot: r.ot };
                    const diffReg = cr.reg - r.reg;
                    const diffOT  = cr.ot  - r.ot;
                    return (
                      <tr key={r.role} style={{ background: i%2===0 ? C.sur : C.bg }}>
                        <td style={{ padding:"8px 6px", fontWeight:600, fontSize:13, borderBottom:`1px solid ${C.bdr}` }}>{r.role}</td>
                        <td style={{ padding:"8px 6px", color:C.txtS, fontSize:13, borderBottom:`1px solid ${C.bdr}` }}>${r.reg.toFixed(2)}</td>
                        <td style={{ padding:"8px 6px", color:C.txtS, fontSize:13, borderBottom:`1px solid ${C.bdr}` }}>${r.ot.toFixed(2)}</td>
                        <td style={{ padding:"8px 6px", borderBottom:`1px solid ${C.bdr}` }}>
                          <div style={{ display:"flex", alignItems:"center", border:`1px solid ${C.bdrM}`, borderRadius:5, overflow:"hidden", background:C.sur, width:100 }}>
                            <span style={{ padding:"0 5px", color:C.txtS, fontSize:13, borderRight:`1px solid ${C.bdrM}`, background:"#f9fafb", display:"flex", alignItems:"center" }}>$</span>
                            <input type="number" step="0.25" min="0"
                              value={cr.reg}
                              onChange={e => updRate(r.role, "reg", e.target.value)}
                              style={{ border:"none", outline:"none", fontFamily:"inherit", fontSize:13, padding:"6px 7px", width:68, background:"transparent", color:C.acc, fontWeight:700 }}
                            />
                          </div>
                        </td>
                        <td style={{ padding:"8px 6px", borderBottom:`1px solid ${C.bdr}` }}>
                          <div style={{ display:"flex", alignItems:"center", border:`1px solid ${C.bdrM}`, borderRadius:5, overflow:"hidden", background:C.sur, width:100 }}>
                            <span style={{ padding:"0 5px", color:C.txtS, fontSize:13, borderRight:`1px solid ${C.bdrM}`, background:"#f9fafb", display:"flex", alignItems:"center" }}>$</span>
                            <input type="number" step="0.25" min="0"
                              value={cr.ot}
                              onChange={e => updRate(r.role, "ot", e.target.value)}
                              style={{ border:"none", outline:"none", fontFamily:"inherit", fontSize:13, padding:"6px 7px", width:68, background:"transparent", color:C.ora, fontWeight:700 }}
                            />
                          </div>
                        </td>
                        <td style={{ padding:"8px 6px", borderBottom:`1px solid ${C.bdr}` }}>
                          <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
                            <span style={{ fontSize:11, fontWeight:600, color: diffReg < 0 ? C.red : diffReg > 0 ? C.grn : C.txtS }}>
                              Reg: {diffReg > 0 ? "+" : ""}{diffReg.toFixed(2)}
                            </span>
                            <span style={{ fontSize:11, fontWeight:600, color: diffOT < 0 ? C.red : diffOT > 0 ? C.grn : C.txtS }}>
                              OT: {diffOT > 0 ? "+" : ""}{diffOT.toFixed(2)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop:12, padding:"8px 12px", background:C.yelB, border:`1px solid ${C.yelBdr}`, borderRadius:6, fontSize:12, color:C.yel }}>
              These rates will auto-apply when <strong>{selClient}</strong> is selected on a new estimate. They can be toggled per-row in the estimate editor.
            </div>

            <div style={{ display:"flex", gap:8, marginTop:12, justifyContent:"flex-end" }}>
              <button onClick={() => { setSelClient(""); setEditRates(null); }} style={{ background:C.sur, color:C.txtM, border:`1px solid ${C.bdr}`, borderRadius:6, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={saveRates} style={{ background:C.acc, color:"#fff", border:"none", borderRadius:6, padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                Save Special Rates
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SALESMAN CHARTS ───────────────────────────────────────────────────────────

// ── SALES ADJUSTMENT MODAL ────────────────────────────────────────────────────
function SalesAdjustmentModal({ quote, onSave, onClose }) {
  const REASONS = ["Additional Work", "Performance", "Discount", "Other"];
  const [amount,  setAmount]  = useState("");
  const [sign,    setSign]    = useState("+"); // "+" increase, "-" decrease
  const [reason,  setReason]  = useState(REASONS[0]);
  const [note,    setNote]    = useState("");
  const [error,   setError]   = useState("");

  const adjTotal = (quote.salesAdjustments || []).reduce((s,a) => s + a.amount, 0);
  const netTotal = (quote.total || 0) + adjTotal;

  function submit() {
    setError("");
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Enter a valid adjustment amount greater than $0.");
      return;
    }
    if (!note.trim()) {
      setError("An explanation is required.");
      return;
    }
    const adj = {
      id:      Date.now(),
      amount:  sign === "+" ? Math.abs(Number(amount)) : -Math.abs(Number(amount)),
      reason,
      note:    note.trim(),
      date:    new Date().toISOString().slice(0, 10),
    };
    onSave(quote.id, adj);
    onClose();
  }

  const fmt = n => "$" + Math.round(Math.abs(n)).toLocaleString();
  const inp2 = {
    background:"#fff", border:"1px solid #c8cdd5", borderRadius:5, color:"#1c1f26",
    fontFamily:"inherit", fontSize:13, padding:"7px 10px", width:"100%",
    boxSizing:"border-box", outline:"none",
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:700,
                  display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:10, padding:22, width:"100%", maxWidth:480,
                    boxShadow:"0 8px 32px rgba(0,0,0,.25)" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <div>
            <div style={{ fontSize:11, color:"#8a93a2", textTransform:"uppercase", letterSpacing:1 }}>Sales Adjustment</div>
            <div style={{ fontSize:17, fontWeight:700, marginTop:2 }}>{quote.qn} — {quote.client}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#8a93a2" }}>×</button>
        </div>

        {/* Current totals */}
        <div style={{ background:"#f5f6f8", border:"1px solid #e2e5ea", borderRadius:7,
                      padding:"10px 14px", marginBottom:16, display:"flex", gap:16, flexWrap:"wrap" }}>
          <div><div style={{ fontSize:11, color:"#8a93a2", marginBottom:2 }}>Original Total</div>
            <div style={{ fontSize:15, fontWeight:700, color:"#1c1f26" }}>${Math.round(quote.total||0).toLocaleString()}</div></div>
          {adjTotal !== 0 && <>
            <div><div style={{ fontSize:11, color:"#8a93a2", marginBottom:2 }}>Prior Adjustments</div>
              <div style={{ fontSize:15, fontWeight:700, color:adjTotal>=0?"#16a34a":"#dc2626" }}>
                {adjTotal>=0?"+":""}{fmt(adjTotal)}</div></div>
            <div><div style={{ fontSize:11, color:"#8a93a2", marginBottom:2 }}>Adjusted Total</div>
              <div style={{ fontSize:15, fontWeight:700, color:"#b86b0a" }}>${Math.round(netTotal).toLocaleString()}</div></div>
          </>}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* Amount with +/- toggle */}
          <div>
            <div style={{ fontSize:11, color:"#4a5060", fontWeight:600, marginBottom:5 }}>ADJUSTMENT AMOUNT *</div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <div style={{ display:"flex", background:"#f5f6f8", border:"1px solid #e2e5ea", borderRadius:6, overflow:"hidden", flexShrink:0 }}>
                {["+","-"].map(s => (
                  <button key={s} onClick={()=>setSign(s)} style={{
                    background: sign===s ? (s==="+"?"#16a34a":"#dc2626") : "transparent",
                    color:      sign===s ? "#fff" : "#8a93a2",
                    border:"none", padding:"7px 14px", fontSize:15, fontWeight:700,
                    cursor:"pointer", fontFamily:"inherit", minWidth:36,
                  }}>{s}</button>
                ))}
              </div>
              <div style={{ display:"flex", alignItems:"center", border:"1px solid #c8cdd5", borderRadius:5,
                             overflow:"hidden", background:"#fff", flex:1 }}>
                <span style={{ padding:"0 8px", color:"#8a93a2", fontSize:14, borderRight:"1px solid #c8cdd5",
                                background:"#f9fafb", display:"flex", alignItems:"center", height:"100%" }}>$</span>
                <input type="number" min={0} step={0.01} value={amount} placeholder="0.00"
                  onChange={e=>setAmount(e.target.value)}
                  style={{ border:"none", outline:"none", fontFamily:"inherit", fontSize:14, padding:"7px 10px",
                           flex:1, background:"transparent", color:"#1c1f26" }}/>
              </div>
            </div>
            {/* Preview */}
            {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
              <div style={{ fontSize:12, marginTop:5, color:sign==="+"?"#16a34a":"#dc2626", fontWeight:600 }}>
                {sign==="+"?"Increases":"Decreases"} total by ${Math.round(Number(amount)).toLocaleString()} →{" "}
                New total: ${Math.round(netTotal + (sign==="+"?1:-1)*Number(amount)).toLocaleString()}
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <div style={{ fontSize:11, color:"#4a5060", fontWeight:600, marginBottom:5 }}>REASON *</div>
            <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
              {REASONS.map(r => (
                <button key={r} onClick={()=>setReason(r)} style={{
                  background: reason===r ? "#b86b0a" : "#f5f6f8",
                  color:      reason===r ? "#fff"    : "#4a5060",
                  border:    `1px solid ${reason===r ? "transparent" : "#e2e5ea"}`,
                  borderRadius:6, padding:"6px 13px", fontSize:12, fontWeight:600,
                  cursor:"pointer", fontFamily:"inherit",
                }}>{r}</button>
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div>
            <div style={{ fontSize:11, color:"#4a5060", fontWeight:600, marginBottom:5 }}>
              EXPLANATION * <span style={{ color:"#8a93a2", fontWeight:400 }}>(required)</span>
            </div>
            <textarea value={note} onChange={e=>setNote(e.target.value)}
              placeholder={`Explain the ${reason.toLowerCase()} adjustment in detail…`}
              style={{ ...inp2, height:88, resize:"vertical" }}/>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:6,
                          padding:"8px 12px", fontSize:12, color:"#dc2626" }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:8, marginTop:18, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ background:"#fff", color:"#4a5060", border:"1px solid #e2e5ea",
                                             borderRadius:6, padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer" }}>Cancel</button>
          <button onClick={submit} style={{ background:"#b86b0a", color:"#fff", border:"none",
                                            borderRadius:6, padding:"7px 18px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            Submit Adjustment
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EQUIPMENT RATES PAGE ──────────────────────────────────────────────────────
function EquipmentPage({ equipment, setEquipment, eqCats, eqMap, eqOv, setEqOv }) {
  // ── Rate override state (unchanged) ───────────────────────────────────────
  const [ec, setEc]     = useState(null);    // code being rate-overridden
  const [ev, setEv]     = useState("");
  const [en, setEn]     = useState("");

  // ── Inline edit state for equipment records ────────────────────────────────
  const [editRow, setEditRow] = useState(null); // { code, name, cap, daily, cat } — original
  const [editVal, setEditVal] = useState({});    // live field values while editing

  // ── Add new equipment state ────────────────────────────────────────────────
  const [showAdd,  setShowAdd]  = useState(false);
  const [newEquip, setNewEquip] = useState({ code:"", cat:"Forklift", name:"", cap:"—", daily:0 });
  const [addError, setAddError] = useState("");

  const KNOWN_CATS = [...new Set([...eqCats, "Forklift","Aerial Lift","Crane","Misc","Tools","Truck"])];

  // ── Rate override helpers (original behaviour) ────────────────────────────
  const startOv = code => { const o=eqOv[code]; setEc(code); setEv(o?o.daily:(eqMap[code]?.daily||0)); setEn(o?o.note:""); };
  const saveOv  = ()   => { setEqOv(p=>({...p,[ec]:{daily:Number(ev),note:en}})); setEc(null); };
  const clearOv = code => setEqOv(p => { const n={...p}; delete n[code]; return n; });

  // ── Equipment record edit helpers ─────────────────────────────────────────
  function startEdit(e) {
    setEditRow(e.code);
    setEditVal({ code:e.code, cat:e.cat, name:e.name, cap:e.cap, daily:e.daily });
    setEc(null); // close any rate override
  }
  function saveEdit() {
    if (!editVal.name || !editVal.code) return;
    setEquipment(prev => prev.map(e =>
      e.code === editRow
        ? { ...e, code:editVal.code, cat:editVal.cat, name:editVal.name, cap:editVal.cap, daily:Number(editVal.daily) }
        : e
    ));
    // If code changed, migrate rate override
    if (editRow !== editVal.code && eqOv[editRow]) {
      setEqOv(p => { const n={...p}; n[editVal.code]=n[editRow]; delete n[editRow]; return n; });
    }
    setEditRow(null);
  }
  function deleteEquip(code) {
    if (!window.confirm(`Delete ${code} from the equipment list?`)) return;
    setEquipment(prev => prev.filter(e => e.code !== code));
    clearOv(code);
  }

  // ── Add new equipment ─────────────────────────────────────────────────────
  function addEquip() {
    setAddError("");
    if (!newEquip.code.trim())  { setAddError("Code is required."); return; }
    if (!newEquip.name.trim())  { setAddError("Name is required."); return; }
    if (eqMap[newEquip.code.trim()]) { setAddError(`Code "${newEquip.code}" already exists.`); return; }
    setEquipment(prev => [...prev, {
      code: newEquip.code.trim().toUpperCase(),
      cat:  newEquip.cat,
      name: newEquip.name.trim(),
      cap:  newEquip.cap.trim() || "—",
      daily: Number(newEquip.daily) || 0,
    }]);
    setNewEquip({ code:"", cat:"Forklift", name:"", cap:"—", daily:0 });
    setShowAdd(false);
  }

  const fi = { background:C.sur, border:`1px solid ${C.bdrM}`, borderRadius:5, color:C.txt,
               fontFamily:"inherit", fontSize:12, padding:"5px 7px", width:"100%",
               boxSizing:"border-box", outline:"none" };

  return (
    <div style={{ padding:"16px", maxWidth:1200, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:700 }}>Equipment</div>
          <div style={{ fontSize:12, color:C.txtS }}>
            Edit equipment details · Set daily rate overrides · Add new pieces of equipment
          </div>
        </div>
        <button style={{ ...mkBtn("primary"), fontSize:12 }} onClick={() => { setShowAdd(!showAdd); setAddError(""); }}>
          {showAdd ? "✕ Cancel" : "+ Add Equipment"}
        </button>
      </div>

      {/* ── Add new equipment form ─────────────────────────────────────────── */}
      {showAdd && (
        <Card style={{ marginBottom:16, border:`1.5px solid ${C.accB}`, background:C.accL }}>
          <Sec c="New Equipment"/>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:12 }}>
            <div>
              <div style={{ fontSize:11, color:C.txtM, fontWeight:600, marginBottom:3 }}>CODE *</div>
              <input style={fi} value={newEquip.code} placeholder="e.g. 325"
                onChange={e => setNewEquip(x=>({...x, code:e.target.value}))}/>
            </div>
            <div>
              <div style={{ fontSize:11, color:C.txtM, fontWeight:600, marginBottom:3 }}>CATEGORY *</div>
              <select style={{ ...fi, padding:"5px 7px" }} value={newEquip.cat}
                onChange={e => setNewEquip(x=>({...x, cat:e.target.value}))}>
                {KNOWN_CATS.map(ct => <option key={ct}>{ct}</option>)}
                <option value="__new__">+ New Category…</option>
              </select>
            </div>
            <div style={{ gridColumn:"span 2" }}>
              <div style={{ fontSize:11, color:C.txtM, fontWeight:600, marginBottom:3 }}>NAME *</div>
              <input style={fi} value={newEquip.name} placeholder="e.g. 2024 Caterpillar TL943D"
                onChange={e => setNewEquip(x=>({...x, name:e.target.value}))}/>
            </div>
            <div>
              <div style={{ fontSize:11, color:C.txtM, fontWeight:600, marginBottom:3 }}>CAPACITY</div>
              <input style={fi} value={newEquip.cap} placeholder="e.g. 12,000 lb"
                onChange={e => setNewEquip(x=>({...x, cap:e.target.value}))}/>
            </div>
            <div>
              <div style={{ fontSize:11, color:C.txtM, fontWeight:600, marginBottom:3 }}>DAILY RATE ($)</div>
              <input style={fi} type="number" min={0} value={newEquip.daily}
                onChange={e => setNewEquip(x=>({...x, daily:e.target.value}))}/>
            </div>
          </div>
          {addError && (
            <div style={{ background:C.redB, border:`1px solid ${C.redBdr}`, borderRadius:5,
                          padding:"7px 11px", fontSize:12, color:C.red, marginBottom:10 }}>
              {addError}
            </div>
          )}
          <div style={{ display:"flex", gap:8 }}>
            <button style={mkBtn("primary")} onClick={addEquip}>Save Equipment</button>
            <button style={mkBtn("ghost")} onClick={() => { setShowAdd(false); setAddError(""); }}>Cancel</button>
          </div>
        </Card>
      )}

      {/* ── Equipment tables by category ───────────────────────────────────── */}
      {eqCats.map(cat => (
        <Card key={cat}>
          <Sec c={cat}/>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:640 }}>
              <thead>
                <tr>
                  {["Code","Category","Equipment Name","Capacity","Base/Day","Override Rate","Override Note",""].map(h => (
                    <th key={h} style={thS}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equipment.filter(e => e.cat === cat).map(e => {
                  const ov       = eqOv[e.code];
                  const isOv     = ec === e.code;      // rate override mode
                  const isEdit   = editRow === e.code; // full row edit mode

                  if (isEdit) {
                    // ── Full inline edit row ─────────────────────────────
                    return (
                      <tr key={e.code} style={{ background:C.accL }}>
                        <td style={tdS}>
                          <input style={{ ...fi, width:60 }} value={editVal.code}
                            onChange={x => setEditVal(v=>({...v, code:x.target.value}))}/>
                        </td>
                        <td style={tdS}>
                          <select style={{ ...fi, width:100 }} value={editVal.cat}
                            onChange={x => setEditVal(v=>({...v, cat:x.target.value}))}>
                            {KNOWN_CATS.map(ct => <option key={ct}>{ct}</option>)}
                          </select>
                        </td>
                        <td style={tdS}>
                          <input style={{ ...fi, width:200 }} value={editVal.name}
                            onChange={x => setEditVal(v=>({...v, name:x.target.value}))}/>
                        </td>
                        <td style={tdS}>
                          <input style={{ ...fi, width:90 }} value={editVal.cap}
                            onChange={x => setEditVal(v=>({...v, cap:x.target.value}))}/>
                        </td>
                        <td style={tdS}>
                          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <span style={{ fontSize:13, color:C.txtS }}>$</span>
                            <input style={{ ...fi, width:70 }} type="number" min={0} value={editVal.daily}
                              onChange={x => setEditVal(v=>({...v, daily:x.target.value}))}/>
                          </div>
                        </td>
                        <td style={tdS} colSpan={2}>
                          <span style={{ fontSize:12, color:C.txtS, fontStyle:"italic" }}>
                            Save to keep current override
                          </span>
                        </td>
                        <td style={tdS}>
                          <div style={{ display:"flex", gap:5 }}>
                            <button style={{ ...mkBtn("primary"), fontSize:11, padding:"4px 9px" }} onClick={saveEdit}>Save</button>
                            <button style={{ ...mkBtn("ghost"),   fontSize:11, padding:"4px 9px" }} onClick={() => setEditRow(null)}>Cancel</button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // ── Normal row ───────────────────────────────────────────
                  return (
                    <tr key={e.code} style={{ opacity: isEdit ? .4 : 1 }}>
                      <td style={{ ...tdS, color:C.txtS, fontSize:11, fontWeight:600 }}>{e.code}</td>
                      <td style={{ ...tdS, fontSize:12, color:C.txtM }}>{e.cat}</td>
                      <td style={{ ...tdS, fontWeight:500 }}>{e.name}</td>
                      <td style={{ ...tdS, color:C.txtS, fontSize:12 }}>{e.cap}</td>
                      <td style={{ ...tdS, color:ov?C.txtS:C.txt, textDecoration:ov?"line-through":"none", fontSize:13 }}>
                        ${e.daily.toLocaleString()}/day
                      </td>
                      <td style={tdS}>
                        {isOv ? (
                          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <DollarInput val={ev} on={x=>setEv(x.target.value)} w={65}/>
                            <span style={{ fontSize:12, color:C.txtS }}>/day</span>
                          </div>
                        ) : (
                          ov
                            ? <span style={{ color:C.ora, fontWeight:700, fontSize:13 }}>${Number(ov.daily).toLocaleString()}/day</span>
                            : <span style={{ color:C.txtS, fontSize:12 }}>—</span>
                        )}
                      </td>
                      <td style={tdS}>
                        {isOv
                          ? <input style={{ ...inp, width:160 }} value={en} placeholder="Reason for override…" onChange={x=>setEn(x.target.value)}/>
                          : <span style={{ fontSize:12, color:C.txtM, fontStyle:ov?"italic":"normal" }}>{ov?.note||""}</span>
                        }
                      </td>
                      <td style={tdS}>
                        {isOv ? (
                          <div style={{ display:"flex", gap:5 }}>
                            <button style={{ ...mkBtn("primary"), fontSize:11, padding:"4px 9px" }} onClick={saveOv}>Save</button>
                            <button style={{ ...mkBtn("ghost"),   fontSize:11, padding:"4px 9px" }} onClick={() => setEc(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                            <button style={{ ...mkBtn("ghost"),   fontSize:11, padding:"3px 8px" }} onClick={() => startEdit(e)}>✏ Edit</button>
                            <button style={{ ...mkBtn("outline"), fontSize:11, padding:"3px 8px" }} onClick={() => startOv(e.code)}>Override</button>
                            {ov && <button style={{ ...mkBtn("danger"), fontSize:11, padding:"3px 8px" }} onClick={() => clearOv(e.code)}>Reset</button>}
                            <button style={{ ...mkBtn("danger"),  fontSize:11, padding:"3px 8px" }} onClick={() => deleteEquip(e.code)}>Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}


// ── PROFILE TEMPLATE MODAL ────────────────────────────────────────────────────
function ProfileTemplateModal({ template, setTemplate, onClose }) {
  const [fields, setFields] = useState(template.map(f => ({...f})));
  const [newField, setNewField] = useState({ key:"", label:"", type:"text", enabled:true });
  const [addErr,   setAddErr]   = useState("");

  function toggle(i)    { setFields(prev => prev.map((f,j) => j===i ? {...f, enabled:!f.enabled} : f)); }
  function updateLabel(i, v) { setFields(prev => prev.map((f,j) => j===i ? {...f, label:v} : f)); }
  function removeField(i)   { setFields(prev => prev.filter((_,j) => j!==i)); }
  function moveUp(i)    { if(i===0)return; setFields(prev=>{const a=[...prev];[a[i-1],a[i]]=[a[i],a[i-1]];return a;}); }
  function moveDown(i)  { if(i>=fields.length-1)return; setFields(prev=>{const a=[...prev];[a[i],a[i+1]]=[a[i+1],a[i]];return a;}); }

  function addField() {
    setAddErr("");
    if (!newField.key.trim())   { setAddErr("Field key is required."); return; }
    if (!newField.label.trim()) { setAddErr("Label is required."); return; }
    if (fields.find(f => f.key === newField.key.trim())) { setAddErr("Key already exists."); return; }
    setFields(prev => [...prev, { ...newField, key:newField.key.trim(), label:newField.label.trim(), enabled:true }]);
    setNewField({ key:"", label:"", type:"text", enabled:true });
    setAddErr("");
  }

  function save() { setTemplate(fields); onClose(); }

  const inp2 = { background:"#fff", border:"1px solid #c8cdd5", borderRadius:5, color:"#1c1f26",
                 fontFamily:"inherit", fontSize:12, padding:"5px 8px", width:"100%",
                 boxSizing:"border-box", outline:"none" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:600,
                  display:"flex", alignItems:"flex-start", justifyContent:"center",
                  padding:"20px 12px", overflowY:"auto" }}>
      <div style={{ background:"#fff", borderRadius:10, padding:22, width:"100%", maxWidth:600,
                    boxShadow:"0 12px 40px rgba(0,0,0,.25)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div>
            <div style={{ fontSize:11, color:"#8a93a2", textTransform:"uppercase", letterSpacing:1 }}>Global Setting</div>
            <div style={{ fontSize:18, fontWeight:700, marginTop:2 }}>Edit Profile Template</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#8a93a2" }}>×</button>
        </div>
        <div style={{ fontSize:12, color:"#8a93a2", marginBottom:16 }}>
          Choose which fields appear on every customer profile. Toggle, reorder, rename, or add custom fields.
        </div>

        {/* Field list */}
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
          {fields.map((f, i) => (
            <div key={f.key} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px",
                                       background: f.enabled ? "#f0fdf4" : "#f5f6f8",
                                       border:`1px solid ${f.enabled ? "#bbf7d0" : "#e2e5ea"}`,
                                       borderRadius:7 }}>
              {/* Toggle */}
              <input type="checkbox" checked={f.enabled} onChange={()=>toggle(i)}
                style={{ width:16, height:16, cursor:"pointer", accentColor:"#b86b0a" }}/>
              {/* Label edit */}
              <input style={{ ...inp2, flex:1, fontWeight:600, fontSize:13,
                              background:"transparent", border:"none", outline:"none",
                              color: f.enabled ? "#1c1f26" : "#8a93a2" }}
                value={f.label} onChange={e => updateLabel(i, e.target.value)}/>
              {/* Type badge */}
              <span style={{ fontSize:10, color:"#8a93a2", background:"#f1f5f9", borderRadius:3,
                             padding:"1px 6px", whiteSpace:"nowrap" }}>{f.type}</span>
              {/* Move up/down */}
              <button onClick={()=>moveUp(i)} disabled={i===0}
                style={{ background:"none", border:"none", cursor:i===0?"default":"pointer",
                         color:i===0?"#c8cdd5":"#8a93a2", fontSize:13, padding:"0 2px" }}>↑</button>
              <button onClick={()=>moveDown(i)} disabled={i>=fields.length-1}
                style={{ background:"none", border:"none", cursor:i>=fields.length-1?"default":"pointer",
                         color:i>=fields.length-1?"#c8cdd5":"#8a93a2", fontSize:13, padding:"0 2px" }}>↓</button>
              {/* Remove */}
              <button onClick={()=>removeField(i)}
                style={{ background:"none", border:"none", color:"#8a93a2", cursor:"pointer",
                         fontSize:15, padding:"0 2px", lineHeight:1 }}>×</button>
            </div>
          ))}
        </div>

        {/* Add custom field */}
        <div style={{ background:"#f5f6f8", border:"1px solid #e2e5ea", borderRadius:8, padding:12, marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#4a5060", marginBottom:8 }}>+ Add Custom Field</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 100px", gap:8, marginBottom:8 }}>
            <div>
              <div style={{ fontSize:11, color:"#4a5060", fontWeight:600, marginBottom:3 }}>LABEL</div>
              <input style={inp2} value={newField.label} placeholder="e.g. Purchase Order #"
                onChange={e => setNewField(x=>({...x, label:e.target.value}))}/>
            </div>
            <div>
              <div style={{ fontSize:11, color:"#4a5060", fontWeight:600, marginBottom:3 }}>KEY (no spaces)</div>
              <input style={inp2} value={newField.key} placeholder="e.g. poNumber"
                onChange={e => setNewField(x=>({...x, key:e.target.value.replace(/\s/g,"")}))}/>
            </div>
            <div>
              <div style={{ fontSize:11, color:"#4a5060", fontWeight:600, marginBottom:3 }}>TYPE</div>
              <select style={{ ...inp2, padding:"5px 7px" }} value={newField.type}
                onChange={e => setNewField(x=>({...x, type:e.target.value}))}>
                <option value="text">Text</option>
                <option value="textarea">Textarea</option>
                <option value="number">Number</option>
              </select>
            </div>
          </div>
          {addErr && <div style={{ fontSize:11, color:"#dc2626", marginBottom:6 }}>{addErr}</div>}
          <button onClick={addField} style={{ background:"#b86b0a", color:"#fff", border:"none", borderRadius:5,
                                              padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>
            Add Field
          </button>
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ background:"#fff", color:"#4a5060", border:"1px solid #e2e5ea",
                                             borderRadius:6, padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer" }}>Cancel</button>
          <button onClick={save} style={{ background:"#b86b0a", color:"#fff", border:"none",
                                          borderRadius:6, padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer" }}>Save Template</button>
        </div>
      </div>
    </div>
  );
}

// ── CUSTOMER MODAL ─────────────────────────────────────────────────────────────
function CustomerModal({ custName, quotes, custData, setCustData, profileTemplate, onOpenQuote, onClose, intakes=[] }) {
  const data = custData[custName] || { notes:"", contacts:[], locations:[], billingAddr:"", website:"", industry:"", paymentTerms:"", accountNum:"" };

  const [notes,       setNotes]       = useState(data.notes || "");
  const [contacts,    setContacts]    = useState(data.contacts || []);
  const [locations,   setLocations]   = useState(data.locations || []);
  const [profileFields, setProfileFields] = useState(() => {
    const f = {};
    (profileTemplate || []).forEach(t => { f[t.key] = data[t.key] || ""; });
    return f;
  });
  const [search,      setSearch]      = useState("");
  const [tab,         setTab]         = useState("overview");   // overview | quotes | locations
  const [selLoc,      setSelLoc]      = useState("ALL");        // "ALL" or locationId
  const [showAddContact,  setShowAddContact]  = useState(false);
  const [showAddLoc,      setShowAddLoc]      = useState(false);
  const [editLocId,       setEditLocId]       = useState(null);
  const [newContact,  setNewContact]  = useState({ name:"", title:"", email:"", phone:"", primary:false, locationId:null });
  const [newLoc,      setNewLoc]      = useState({ name:"", address:"", notes:"" });
  const [editLoc,     setEditLoc]     = useState({ name:"", address:"", notes:"" });

  const won       = quotes.filter(q => q.status==="Won");

  // ── Machine history for this customer ─────────────────────────────────────
  const machineHistory = intakes
    .filter(intake => (intake.customer||intake.form_data?.customer||"").toLowerCase() === custName.toLowerCase())
    .flatMap(intake => {
      const fd = intake.form_data || intake;
      const machines = fd.machines || [];
      const rfqNum   = fd.rfqNumber || intake.rfq_number || "";
      const movedDate = fd.requestedDate || (fd.dateSegments||[])[0]?.startDate || intake.created_at?.slice(0,10) || "";
      const originSite = (fd.sites||[])[0];
      const siteStr = originSite?.address || [originSite?.street, originSite?.city, originSite?.state].filter(Boolean).join(", ") || "";
      return machines.map(m => ({
        id:        m.id,
        equipDesc: m.equipDesc    || m.equip_desc    || "",
        manufacturer: m.manufacturer || "",
        model:     m.model        || m.model_num     || "",
        serial:    m.serial       || m.serial_num    || "",
        weight:    m.weight       || m.weight_lbs    || "",
        dimensions: m.dimensions  || "",
        movedDate,
        originSite: siteStr,
        rfqNumber:  rfqNum,
        intakeId:   intake.id,
      }));
    })
    .sort((a,b) => (b.movedDate||"").localeCompare(a.movedDate||""));
  const revenue   = won.reduce((s,q) => s+(q.total||0), 0);
  const submitted = quotes.filter(q => q.status==="Submitted");

  // Filtered quotes for quotes tab
  const filteredQ = quotes.filter(q => {
    const s = search.toLowerCase();
    const locMatch = selLoc==="ALL" || (() => {
      const loc = locations.find(l=>l.id===selLoc);
      return loc && q.jobSite?.toLowerCase().includes(loc.address.split(",")[0].toLowerCase());
    })();
    const textMatch = !s || [q.jobSite,q.contactName,q.desc,q.qn].some(x=>x?.toLowerCase().includes(s));
    return locMatch && textMatch;
  });

  // Save helper
  function persist(updates) {
    const merged = { ...data, notes, contacts, locations, ...profileFields, ...updates };
    setCustData(prev => ({ ...prev, [custName]: merged }));
  }

  function saveAll() { persist({}); }

  // ── Contacts ────────────────────────────────────────────────────────────
  function addContact() {
    if (!newContact.name) return;
    const upd = [...contacts, { ...newContact, id:Date.now() }];
    setContacts(upd);
    persist({ contacts:upd });
    setNewContact({ name:"", title:"", email:"", phone:"", primary:false, locationId:selLoc==="ALL"?null:selLoc });
    setShowAddContact(false);
  }
  function removeContact(id) {
    const upd = contacts.filter(c=>c.id!==id);
    setContacts(upd);
    persist({ contacts:upd });
  }

  // ── Locations ───────────────────────────────────────────────────────────
  function addLocation() {
    if (!newLoc.name) return;
    const upd = [...locations, { ...newLoc, id:"loc"+Date.now() }];
    setLocations(upd);
    persist({ locations:upd });
    setNewLoc({ name:"", address:"", notes:"" });
    setShowAddLoc(false);
  }
  function saveLocEdit() {
    const upd = locations.map(l => l.id===editLocId ? { ...l, ...editLoc } : l);
    setLocations(upd);
    persist({ locations:upd });
    setEditLocId(null);
  }
  function removeLocation(id) {
    const upd = locations.filter(l=>l.id!==id);
    setLocations(upd);
    // Unassign contacts from this location
    const updc = contacts.map(c => c.locationId===id ? {...c,locationId:null} : c);
    setContacts(updc);
    persist({ locations:upd, contacts:updc });
  }

  // ── Contacts filtered by location ───────────────────────────────────────
  const visibleContacts = selLoc==="ALL" ? contacts : contacts.filter(c=>c.locationId===selLoc);

  const tabBtn = (id, label, count) => (
    <button onClick={()=>setTab(id)} style={{
      background:"none", border:"none", cursor:"pointer", padding:"8px 14px", fontSize:13,
      fontFamily:"inherit", fontWeight:tab===id?700:400,
      color:tab===id?"#b86b0a":"#8a93a2",
      borderBottom:tab===id?"2px solid #b86b0a":"2px solid transparent",
      whiteSpace:"nowrap",
    }}>
      {label}{count!=null?<span style={{fontSize:11,marginLeft:4,color:"#8a93a2"}}>({count})</span>:null}
    </button>
  );

  const inp2 = { background:"#fff", border:"1px solid #c8cdd5", borderRadius:5, color:"#1c1f26",
                 fontFamily:"inherit", fontSize:13, padding:"6px 9px", width:"100%",
                 boxSizing:"border-box", outline:"none" };

  const enabledFields = (profileTemplate||[]).filter(f=>f.enabled);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:500,
                  display:"flex", alignItems:"flex-start", justifyContent:"center",
                  padding:"16px 12px", overflowY:"auto" }}>
      <div style={{ background:"#fff", borderRadius:10, width:"100%", maxWidth:900,
                    boxShadow:"0 12px 40px rgba(0,0,0,.25)", display:"flex", flexDirection:"column" }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ padding:"18px 22px 0", borderBottom:"1px solid #e2e5ea" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11, color:"#8a93a2", textTransform:"uppercase", letterSpacing:1 }}>Customer Profile</div>
              <div style={{ fontSize:20, fontWeight:700, marginTop:2 }}>{custName}</div>
              {data.accountNum && <div style={{ fontSize:12, color:"#8a93a2", marginTop:1 }}>Account: {data.accountNum}</div>}
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:"#8a93a2", lineHeight:1 }}>×</button>
          </div>
          {/* Summary pills */}
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            {[
              { l:"Total Quotes", v:quotes.length,        c:"#4a5060" },
              { l:"Won",          v:won.length,            c:"#16a34a" },
              { l:"Submitted",    v:submitted.length,      c:"#2563eb" },
              { l:"Revenue",      v:"$"+Math.round(revenue).toLocaleString(), c:"#b86b0a" },
              { l:"Locations",    v:locations.length,      c:"#7c3aed" },
              { l:"Machines",     v:machineHistory.length, c:"#0d9488" },
            ].map(x => (
              <div key={x.l} style={{ background:"#f5f6f8", borderRadius:6, padding:"5px 11px", fontSize:12 }}>
                <span style={{ color:"#8a93a2" }}>{x.l}: </span>
                <span style={{ fontWeight:700, color:x.c }}>{x.v}</span>
              </div>
            ))}
          </div>
          {/* Tabs */}
          <div style={{ display:"flex", gap:0, overflowX:"auto" }}>
            {tabBtn("overview",  "Overview",  null)}
            {tabBtn("locations", "Locations", locations.length)}
            {tabBtn("quotes",    `Quotes`,    quotes.length)}
            {tabBtn("machines",  "Machines",  machineHistory.length)}
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div style={{ padding:"18px 22px", overflowY:"auto", maxHeight:"62vh" }}>

          {/* ════ OVERVIEW TAB ════ */}
          {tab==="overview" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>

              {/* Left: Profile fields */}
              <div>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>Profile Information</div>

                {/* Location selector for contacts */}
                {locations.length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, color:"#8a93a2", fontWeight:600, marginBottom:5 }}>FILTER BY LOCATION</div>
                    <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                      <button onClick={()=>setSelLoc("ALL")} style={{ background:selLoc==="ALL"?"#b86b0a":"#f5f6f8", color:selLoc==="ALL"?"#fff":"#4a5060", border:`1px solid ${selLoc==="ALL"?"transparent":"#e2e5ea"}`, borderRadius:5, padding:"4px 10px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>All Locations</button>
                      {locations.map(l => (
                        <button key={l.id} onClick={()=>setSelLoc(l.id)} style={{ background:selLoc===l.id?"#7c3aed":"#f5f6f8", color:selLoc===l.id?"#fff":"#4a5060", border:`1px solid ${selLoc===l.id?"transparent":"#e2e5ea"}`, borderRadius:5, padding:"4px 10px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{l.name}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dynamic profile fields from template */}
                <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
                  {enabledFields.map(field => (
                    <div key={field.key}>
                      <div style={{ fontSize:11, color:"#4a5060", fontWeight:600, marginBottom:3 }}>{field.label.toUpperCase()}</div>
                      {field.type==="textarea"
                        ? <textarea style={{ ...inp2, height:60, resize:"vertical" }} value={profileFields[field.key]||""} placeholder={field.label}
                            onChange={e => setProfileFields(p=>({...p,[field.key]:e.target.value}))}/>
                        : <input style={inp2} type={field.type==="number"?"number":"text"} value={profileFields[field.key]||""} placeholder={field.label}
                            onChange={e => setProfileFields(p=>({...p,[field.key]:e.target.value}))}/>
                      }
                    </div>
                  ))}
                </div>
                <button onClick={saveAll} style={{ background:"#b86b0a", color:"#fff", border:"none", borderRadius:5, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>Save Profile</button>
              </div>

              {/* Right: Contacts + Notes */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>
                    Contacts{selLoc!=="ALL" ? ` — ${locations.find(l=>l.id===selLoc)?.name||""}` : ""}
                  </div>
                  <button onClick={()=>setShowAddContact(!showAddContact)}
                    style={{ background:"#b86b0a", color:"#fff", border:"none", borderRadius:5, padding:"4px 10px", fontSize:11, fontWeight:600, cursor:"pointer" }}>
                    + Add Contact
                  </button>
                </div>

                {showAddContact && (
                  <div style={{ background:"#f5f6f8", borderRadius:7, padding:12, marginBottom:10, border:"1px solid #e2e5ea" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                      <div style={{ gridColumn:"1/-1" }}><div style={{ fontSize:11,color:"#4a5060",fontWeight:600,marginBottom:2 }}>NAME *</div><input style={inp2} value={newContact.name} placeholder="Full name" onChange={e=>setNewContact(x=>({...x,name:e.target.value}))}/></div>
                      <div><div style={{ fontSize:11,color:"#4a5060",fontWeight:600,marginBottom:2 }}>TITLE</div><input style={inp2} value={newContact.title} placeholder="Job title" onChange={e=>setNewContact(x=>({...x,title:e.target.value}))}/></div>
                      <div><div style={{ fontSize:11,color:"#4a5060",fontWeight:600,marginBottom:2 }}>PHONE</div><input style={inp2} value={newContact.phone} placeholder="XXX-XXX-XXXX" onChange={e=>setNewContact(x=>({...x,phone:e.target.value}))}/></div>
                      <div style={{ gridColumn:"1/-1" }}><div style={{ fontSize:11,color:"#4a5060",fontWeight:600,marginBottom:2 }}>EMAIL</div><input style={inp2} value={newContact.email} placeholder="email@company.com" onChange={e=>setNewContact(x=>({...x,email:e.target.value}))}/></div>
                      {locations.length>0 && <div style={{ gridColumn:"1/-1" }}>
                        <div style={{ fontSize:11,color:"#4a5060",fontWeight:600,marginBottom:2 }}>LOCATION</div>
                        <select style={{ ...inp2, padding:"5px 8px" }} value={newContact.locationId||""} onChange={e=>setNewContact(x=>({...x,locationId:e.target.value||null}))}>
                          <option value="">No specific location</option>
                          {locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </div>}
                      <div style={{ gridColumn:"1/-1" }}><label style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer" }}><input type="checkbox" checked={newContact.primary} onChange={e=>setNewContact(x=>({...x,primary:e.target.checked}))}/>Set as primary contact</label></div>
                    </div>
                    <div style={{ display:"flex",gap:7,marginTop:10,justifyContent:"flex-end" }}>
                      <button onClick={()=>setShowAddContact(false)} style={{ background:"#fff",color:"#4a5060",border:"1px solid #e2e5ea",borderRadius:5,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer" }}>Cancel</button>
                      <button onClick={addContact} style={{ background:"#b86b0a",color:"#fff",border:"none",borderRadius:5,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer" }}>Save Contact</button>
                    </div>
                  </div>
                )}

                {visibleContacts.length===0 && !showAddContact && (
                  <div style={{ color:"#8a93a2", fontSize:12, padding:"8px 0" }}>No contacts{selLoc!=="ALL"?" at this location":""} yet.</div>
                )}
                <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:14 }}>
                  {visibleContacts.map(con => {
                    const loc = locations.find(l=>l.id===con.locationId);
                    return (
                      <div key={con.id} style={{ background:"#f5f6f8", border:"1px solid #e2e5ea", borderRadius:7, padding:"10px 12px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div>
                            <div style={{ fontWeight:600, fontSize:13, display:"flex", alignItems:"center", gap:6 }}>
                              {con.name}
                              {con.primary && <span style={{ background:"#fff7ed",color:"#b86b0a",border:"1px solid #f5a623",borderRadius:3,fontSize:10,padding:"1px 5px",fontWeight:600 }}>Primary</span>}
                            </div>
                            {con.title && <div style={{ fontSize:12,color:"#4a5060",marginTop:1 }}>{con.title}</div>}
                            {con.email && <div style={{ fontSize:12,color:"#2563eb",marginTop:2 }}>{con.email}</div>}
                            {con.phone && <div style={{ fontSize:12,color:"#4a5060" }}>{con.phone}</div>}
                            {loc && <div style={{ fontSize:11,color:"#7c3aed",marginTop:2 }}>📍 {loc.name}</div>}
                          </div>
                          <button onClick={()=>removeContact(con.id)} style={{ background:"none",border:"none",color:"#8a93a2",cursor:"pointer",fontSize:16,padding:"0 3px",lineHeight:1 }}>×</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Notes */}
                <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Customer Notes</div>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                  placeholder="Add notes — payment history, special requirements, key relationships…"
                  style={{ ...inp2, height:100, resize:"vertical" }}/>
                <button onClick={saveAll} style={{ background:"#b86b0a",color:"#fff",border:"none",borderRadius:5,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",marginTop:8 }}>Save Notes</button>
              </div>
            </div>
          )}

          {/* ════ LOCATIONS TAB ════ */}
          {tab==="locations" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontWeight:700, fontSize:15 }}>Locations</div>
                <button onClick={()=>setShowAddLoc(!showAddLoc)}
                  style={{ background:"#b86b0a",color:"#fff",border:"none",borderRadius:6,padding:"6px 13px",fontSize:12,fontWeight:600,cursor:"pointer" }}>
                  + Add Location
                </button>
              </div>

              {showAddLoc && (
                <div style={{ background:"#fff7ed",border:"1.5px solid #f5a623",borderRadius:8,padding:14,marginBottom:14 }}>
                  <div style={{ fontSize:13,fontWeight:700,marginBottom:10 }}>New Location</div>
                  <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
                    <div><div style={{ fontSize:11,color:"#4a5060",fontWeight:600,marginBottom:3 }}>LOCATION NAME *</div><input style={inp2} value={newLoc.name} placeholder="e.g. Dayton Facility" onChange={e=>setNewLoc(x=>({...x,name:e.target.value}))}/></div>
                    <div><div style={{ fontSize:11,color:"#4a5060",fontWeight:600,marginBottom:3 }}>ADDRESS</div><input style={inp2} value={newLoc.address} placeholder="123 Main St, City, State ZIP" onChange={e=>setNewLoc(x=>({...x,address:e.target.value}))}/></div>
                    <div><div style={{ fontSize:11,color:"#4a5060",fontWeight:600,marginBottom:3 }}>NOTES</div><input style={inp2} value={newLoc.notes} placeholder="e.g. Primary production facility" onChange={e=>setNewLoc(x=>({...x,notes:e.target.value}))}/></div>
                  </div>
                  <div style={{ display:"flex",gap:8,marginTop:12,justifyContent:"flex-end" }}>
                    <button onClick={()=>setShowAddLoc(false)} style={{ background:"#fff",color:"#4a5060",border:"1px solid #e2e5ea",borderRadius:5,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer" }}>Cancel</button>
                    <button onClick={addLocation} style={{ background:"#b86b0a",color:"#fff",border:"none",borderRadius:5,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer" }}>Save Location</button>
                  </div>
                </div>
              )}

              {locations.length===0 && !showAddLoc && (
                <div style={{ color:"#8a93a2",fontSize:13,padding:"20px 0",textAlign:"center" }}>No locations yet. Click Add Location to add the first one.</div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {locations.map(loc => {
                  const locContacts = contacts.filter(c=>c.locationId===loc.id);
                  const locQuotes   = quotes.filter(q=>q.jobSite?.toLowerCase().includes((loc.address||"").split(",")[0].toLowerCase()));
                  const isEdit      = editLocId === loc.id;
                  return (
                    <div key={loc.id} style={{ border:"1px solid #e2e5ea",borderRadius:8,overflow:"hidden" }}>
                      {/* Location header */}
                      <div style={{ background:"#f5f6f8",padding:"11px 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                        <div>
                          {isEdit ? (
                            <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                              <input style={{ ...inp2,fontWeight:700,fontSize:14 }} value={editLoc.name} onChange={e=>setEditLoc(x=>({...x,name:e.target.value}))} placeholder="Location name"/>
                              <input style={inp2} value={editLoc.address} onChange={e=>setEditLoc(x=>({...x,address:e.target.value}))} placeholder="Address"/>
                              <input style={inp2} value={editLoc.notes} onChange={e=>setEditLoc(x=>({...x,notes:e.target.value}))} placeholder="Notes"/>
                              <div style={{ display:"flex",gap:7 }}>
                                <button onClick={saveLocEdit} style={{ background:"#b86b0a",color:"#fff",border:"none",borderRadius:5,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer" }}>Save</button>
                                <button onClick={()=>setEditLocId(null)} style={{ background:"#fff",color:"#4a5060",border:"1px solid #e2e5ea",borderRadius:5,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer" }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ fontWeight:700,fontSize:15 }}>📍 {loc.name}</div>
                              {loc.address && <div style={{ fontSize:12,color:"#4a5060",marginTop:2 }}>{loc.address}</div>}
                              {loc.notes   && <div style={{ fontSize:11,color:"#8a93a2",marginTop:1,fontStyle:"italic" }}>{loc.notes}</div>}
                              <div style={{ display:"flex",gap:10,marginTop:5,fontSize:11,color:"#8a93a2" }}>
                                <span>{locContacts.length} contact(s)</span>
                                <span>{locQuotes.length} estimate(s)</span>
                              </div>
                            </>
                          )}
                        </div>
                        {!isEdit && (
                          <div style={{ display:"flex",gap:6 }}>
                            <button onClick={()=>{setEditLocId(loc.id);setEditLoc({name:loc.name,address:loc.address||"",notes:loc.notes||""});}}
                              style={{ background:"#fff",color:"#4a5060",border:"1px solid #e2e5ea",borderRadius:5,padding:"4px 9px",fontSize:11,fontWeight:600,cursor:"pointer" }}>✏ Edit</button>
                            <button onClick={()=>removeLocation(loc.id)}
                              style={{ background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:5,padding:"4px 9px",fontSize:11,fontWeight:600,cursor:"pointer" }}>Delete</button>
                          </div>
                        )}
                      </div>

                      {/* Location contacts */}
                      {locContacts.length > 0 && (
                        <div style={{ padding:"10px 14px",borderTop:"1px solid #e2e5ea" }}>
                          <div style={{ fontSize:11,color:"#8a93a2",fontWeight:600,marginBottom:7,textTransform:"uppercase",letterSpacing:.5 }}>Contacts</div>
                          <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                            {locContacts.map(con=>(
                              <div key={con.id} style={{ background:"#f5f6f8",border:"1px solid #e2e5ea",borderRadius:6,padding:"6px 10px",fontSize:12 }}>
                                <div style={{ fontWeight:600 }}>{con.name}{con.primary&&<span style={{ color:"#b86b0a",fontSize:10,marginLeft:4 }}>★</span>}</div>
                                {con.title && <div style={{ color:"#4a5060" }}>{con.title}</div>}
                                {con.phone && <div style={{ color:"#4a5060" }}>{con.phone}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Location estimates */}
                      {locQuotes.length > 0 && (
                        <div style={{ padding:"10px 14px",borderTop:"1px solid #e2e5ea" }}>
                          <div style={{ fontSize:11,color:"#8a93a2",fontWeight:600,marginBottom:7,textTransform:"uppercase",letterSpacing:.5 }}>Estimates at this Location</div>
                          <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                            {locQuotes.map(q=>{
                              const ss={Draft:{bg:"#f1f5f9",cl:"#475569",bd:"#cbd5e1"},Submitted:{bg:"#eff6ff",cl:"#2563eb",bd:"#bfdbfe"},Won:{bg:"#f0fdf4",cl:"#16a34a",bd:"#bbf7d0"},Lost:{bg:"#fef2f2",cl:"#dc2626",bd:"#fecaca"}};
                              const st=ss[q.status]||ss.Draft;
                              return(
                                <div key={q.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"#f9fafb",border:"1px solid #e2e5ea",borderRadius:6 }}>
                                  <div>
                                    <span style={{ fontWeight:700,color:"#b86b0a",fontSize:12,marginRight:8 }}>{q.qn}</span>
                                    <span style={{ background:st.bg,color:st.cl,border:`1px solid ${st.bd}`,borderRadius:3,padding:"1px 6px",fontSize:10,fontWeight:600 }}>{q.status}</span>
                                    <div style={{ fontSize:12,color:"#4a5060",marginTop:2 }}>{q.desc}</div>
                                  </div>
                                  <div style={{ textAlign:"right" }}>
                                    <div style={{ fontWeight:700,color:"#b86b0a",fontSize:13 }}>${Math.round(q.total||0).toLocaleString()}</div>
                                    <button onClick={()=>{onOpenQuote(q);onClose();}} style={{ background:"#fff",color:"#b86b0a",border:"1px solid #f5a623",borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:600,cursor:"pointer",marginTop:3 }}>Open</button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════ QUOTES TAB ════ */}
          {/* ════ MACHINES TAB ════ */}
          {tab==="machines" && (
            <div>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>
                Machine History
                <span style={{ fontSize:12, color:"#8a93a2", fontWeight:400, marginLeft:8 }}>
                  Equipment moved for {custName}
                </span>
              </div>
              {machineHistory.length === 0 ? (
                <div style={{ textAlign:"center", color:"#8a93a2", padding:"40px 0", fontSize:13 }}>
                  No machine history yet. Machines appear here when an intake is saved for this customer.
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {machineHistory.map((m, i) => (
                    <div key={m.id||i} style={{ background:"#f5f6f8", border:"1px solid #e2e5ea", borderRadius:7, padding:"12px 16px", borderLeft:"3px solid #0d9488" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:14, color:"#1c1f26", marginBottom:4 }}>
                            {m.equipDesc || "—"}
                          </div>
                          <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                            {m.manufacturer && <span style={{ fontSize:12, color:"#4a5060" }}>🏭 {m.manufacturer}{m.model?" "+m.model:""}</span>}
                            {m.serial       && <span style={{ fontSize:12, color:"#4a5060" }}>S/N: {m.serial}</span>}
                            {m.weight       && <span style={{ fontSize:12, color:"#b86b0a", fontWeight:600 }}>{m.weight} lbs</span>}
                            {m.dimensions   && <span style={{ fontSize:12, color:"#4a5060" }}>{m.dimensions}</span>}
                          </div>
                          {m.originSite && (
                            <div style={{ fontSize:11, color:"#8a93a2", marginTop:4 }}>📍 {m.originSite}</div>
                          )}
                          {m.rfqNumber && (
                            <div style={{ fontSize:11, color:"#8a93a2", marginTop:2 }}>RFQ: {m.rfqNumber}</div>
                          )}
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          {m.movedDate && (
                            <div style={{ fontSize:12, fontWeight:700, color:"#0d9488" }}>{m.movedDate}</div>
                          )}
                          <div style={{ fontSize:10, color:"#8a93a2", marginTop:2 }}>Date Moved</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab==="quotes" && (
            <div>
              <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
                <input style={{ ...inp2, flex:1, minWidth:200 }}
                  placeholder="Search by location, contact, description, or quote #…"
                  value={search} onChange={e=>setSearch(e.target.value)}/>
                {locations.length > 0 && (
                  <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                    <button onClick={()=>setSelLoc("ALL")} style={{ background:selLoc==="ALL"?"#b86b0a":"#f5f6f8",color:selLoc==="ALL"?"#fff":"#4a5060",border:`1px solid ${selLoc==="ALL"?"transparent":"#e2e5ea"}`,borderRadius:5,padding:"4px 9px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>All</button>
                    {locations.map(l=>(
                      <button key={l.id} onClick={()=>setSelLoc(l.id)} style={{ background:selLoc===l.id?"#7c3aed":"#f5f6f8",color:selLoc===l.id?"#fff":"#4a5060",border:`1px solid ${selLoc===l.id?"transparent":"#e2e5ea"}`,borderRadius:5,padding:"4px 9px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>{l.name}</button>
                    ))}
                  </div>
                )}
              </div>
              {filteredQ.length===0 && <div style={{ textAlign:"center",color:"#8a93a2",padding:"24px 0",fontSize:13 }}>No quotes match your filter.</div>}
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {filteredQ.map(q=>{
                  const ss={Draft:{bg:"#f1f5f9",cl:"#475569",bd:"#cbd5e1"},Submitted:{bg:"#eff6ff",cl:"#2563eb",bd:"#bfdbfe"},Won:{bg:"#f0fdf4",cl:"#16a34a",bd:"#bbf7d0"},Lost:{bg:"#fef2f2",cl:"#dc2626",bd:"#fecaca"},"Change Order":{bg:"#f5f3ff",cl:"#6d28d9",bd:"#ddd6fe"}};
                  const st=ss[q.status]||ss.Draft;
                  return(
                    <div key={q.id} style={{ background:"#f5f6f8",border:"1px solid #e2e5ea",borderRadius:7,padding:"11px 14px" }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8 }}>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",marginBottom:3 }}>
                            <span style={{ fontWeight:700,color:"#b86b0a",fontSize:12 }}>{q.qn}</span>
                            <span style={{ background:st.bg,color:st.cl,border:`1px solid ${st.bd}`,borderRadius:4,padding:"1px 7px",fontSize:11,fontWeight:600 }}>{q.status}</span>
                            {q.isChangeOrder&&<span style={{ fontSize:11,color:"#6d28d9",fontWeight:600 }}>Change Order</span>}
                            {q.locked&&<span style={{ fontSize:11,color:"#16a34a" }}>🔒 {q.jobNum}</span>}
                          </div>
                          <div style={{ fontWeight:600,fontSize:13 }}>{q.desc}</div>
                          {q.jobSite&&<div style={{ fontSize:12,color:"#4a5060",marginTop:1 }}>📍 {q.jobSite}</div>}
                          {q.contactName&&<div style={{ fontSize:12,color:"#4a5060" }}>Contact: {q.contactName}</div>}
                          <div style={{ fontSize:11,color:"#8a93a2",marginTop:2 }}>{q.date} · {q.qtype}{q.salesAssoc?" · SA: "+q.salesAssoc:""}</div>
                        </div>
                        <div style={{ textAlign:"right",flexShrink:0 }}>
                          <div style={{ fontSize:18,fontWeight:700,color:"#1c1f26" }}>${Math.round(q.total||0).toLocaleString()}</div>
                          <button onClick={()=>{onOpenQuote(q);onClose();}} style={{ background:"#fff",color:"#b86b0a",border:"1px solid #f5a623",borderRadius:5,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer",marginTop:5 }}>Open Estimate</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding:"12px 22px",borderTop:"1px solid #e2e5ea",display:"flex",justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ background:"#b86b0a",color:"#fff",border:"none",borderRadius:6,padding:"8px 20px",fontSize:13,fontWeight:600,cursor:"pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── SALESMAN CHARTS ───────────────────────────────────────────────────────────
function PieChart({ data, size=120 }) {
  // data = [{ label, value, color }]
  const total = data.reduce((s,d)=>s+d.value,0) || 1;
  let angle = -Math.PI/2;
  const slices = data.filter(d=>d.value>0).map(d => {
    const startAngle = angle;
    const sweep = (d.value/total)*Math.PI*2;
    angle += sweep;
    const x1 = Math.cos(startAngle)*50+60, y1 = Math.sin(startAngle)*50+60;
    const x2 = Math.cos(angle)*50+60,      y2 = Math.sin(angle)*50+60;
    const large = sweep > Math.PI ? 1 : 0;
    return { ...d, path:`M60,60 L${x1},${y1} A50,50 0 ${large},1 ${x2},${y2} Z`, sweep };
  });
  if (slices.length === 1) {
    return <svg width={size} height={size} viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill={slices[0].color}/></svg>;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      {slices.map((s,i) => <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth="1.5"/>)}
    </svg>
  );
}

function ChartCard({ title, data, total, onClickChart }) {
  const hasData = data.some(d=>d.value>0);
  return (
    <div style={{ background:"#fff", border:"1px solid #e2e5ea", borderRadius:8, padding:14, flex:1, minWidth:220 }}>
      <div style={{ fontSize:11, color:"#8a93a2", fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>{title}</div>
      {!hasData ? (
        <div style={{ textAlign:"center", color:"#c8cdd5", fontSize:12, padding:"20px 0" }}>No data yet</div>
      ) : (
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ cursor:"pointer", flexShrink:0 }} onClick={()=>onClickChart({ title, data, total })} title="Click for details">
            <PieChart data={data}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            {data.filter(d=>d.value>0).map((d,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:5, marginBottom:4, fontSize:12 }}>
                <div style={{ width:9, height:9, borderRadius:2, background:d.color, flexShrink:0 }}/>
                <span style={{ color:"#4a5060", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{d.label}</span>
                <span style={{ fontWeight:700, color:"#1c1f26", flexShrink:0 }}>{d.value}</span>
              </div>
            ))}
            <div style={{ borderTop:"1px solid #e2e5ea", marginTop:5, paddingTop:5, fontSize:11, color:"#8a93a2" }}>Total: <strong style={{ color:"#1c1f26" }}>{total}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartDetailModal({ chart, onClose }) {
  if (!chart) return null;
  const total = chart.total || chart.data.reduce((s,d)=>s+d.value,0);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:10, padding:22, width:"100%", maxWidth:440, boxShadow:"0 8px 32px rgba(0,0,0,.2)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:700 }}>{chart.title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#8a93a2" }}>×</button>
        </div>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
          <PieChart data={chart.data} size={180}/>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr>
            <th style={{ textAlign:"left", fontSize:11, color:"#8a93a2", fontWeight:600, paddingBottom:6, textTransform:"uppercase" }}>Sales Associate</th>
            <th style={{ textAlign:"right", fontSize:11, color:"#8a93a2", fontWeight:600, paddingBottom:6, textTransform:"uppercase" }}>Count</th>
            <th style={{ textAlign:"right", fontSize:11, color:"#8a93a2", fontWeight:600, paddingBottom:6, textTransform:"uppercase" }}>Share</th>
            <th style={{ textAlign:"right", fontSize:11, color:"#8a93a2", fontWeight:600, paddingBottom:6, textTransform:"uppercase" }}>Revenue</th>
          </tr></thead>
          <tbody>
            {chart.data.filter(d=>d.value>0).map((d,i) => (
              <tr key={i}>
                <td style={{ padding:"7px 0", borderBottom:"1px solid #e2e5ea", fontSize:13, display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:d.color, flexShrink:0 }}/>
                  {d.label}
                </td>
                <td style={{ padding:"7px 0", borderBottom:"1px solid #e2e5ea", fontSize:13, textAlign:"right", fontWeight:600 }}>{d.value}</td>
                <td style={{ padding:"7px 0", borderBottom:"1px solid #e2e5ea", fontSize:13, textAlign:"right", color:"#8a93a2" }}>{Math.round(d.value/total*100)}%</td>
                <td style={{ padding:"7px 0", borderBottom:"1px solid #e2e5ea", fontSize:13, textAlign:"right", color:"#b86b0a", fontWeight:600 }}>{d.amt>0?"$"+Math.round(d.amt).toLocaleString():"—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ paddingTop:8, fontSize:12, fontWeight:700, color:"#1c1f26" }}>Total</td>
              <td style={{ paddingTop:8, fontSize:12, fontWeight:700, textAlign:"right" }}>{total}</td>
              <td style={{ paddingTop:8, fontSize:12, color:"#8a93a2", textAlign:"right" }}>100%</td>
              <td style={{ paddingTop:8, fontSize:12, fontWeight:700, color:"#b86b0a", textAlign:"right" }}>${Math.round(chart.data.reduce((s,d)=>s+(d.amt||0),0)).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        <div style={{ marginTop:12, textAlign:"right" }}>
          <button onClick={onClose} style={{ background:"#b86b0a", color:"#fff", border:"none", borderRadius:6, padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

const PIE_COLORS = ["#b86b0a","#2563eb","#16a34a","#dc2626","#7c3aed","#0d9488","#ea580c","#b45309","#6d28d9","#0e7490"];

function SalesmanCharts({ quotes, reqs }) {
  const [detail, setDetail] = useState(null);

  const getSA = (item) => item.salesAssoc || item.estimator || "Unassigned";

  // Build salesman sets
  const allSA = [...new Set([
    ...reqs.map(r=>getSA(r)),
    ...quotes.map(q=>q.salesAssoc||"Unassigned"),
  ])].filter(Boolean);

  function buildData(items, getSAFn, getValFn=null) {
    const map = {};
    items.forEach(item => {
      const sa = getSAFn(item);
      if (!map[sa]) map[sa] = { value:0, amt:0 };
      map[sa].value++;
      if (getValFn) map[sa].amt += getValFn(item)||0;
    });
    return Object.entries(map).sort((a,b)=>b[1].value-a[1].value).map(([label,d],i) => ({
      label, value:d.value, amt:d.amt, color:PIE_COLORS[i%PIE_COLORS.length]
    }));
  }

  const pendingReqs  = reqs.filter(r=>r.status!=="Quoted");
  const submittedQ   = quotes.filter(q=>q.status==="Submitted");
  const wonQ         = quotes.filter(q=>q.status==="Won");
  const lostQ        = quotes.filter(q=>q.status==="Lost");

  const pendingData  = buildData(pendingReqs,  r=>getSA(r),                        r=>0);
  const submitData   = buildData(submittedQ,   q=>q.salesAssoc||"Unassigned", q=>q.total);
  const wonData      = buildData(wonQ,         q=>q.salesAssoc||"Unassigned", q=>q.total);
  const lostData     = buildData(lostQ,        q=>q.salesAssoc||"Unassigned", q=>q.total);

  return (
    <>
      {detail && <ChartDetailModal chart={detail} onClose={()=>setDetail(null)}/>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:10, marginBottom:12 }}>
        <ChartCard
          title="Pending Requests by Sales Associate"
          data={pendingData}
          total={pendingReqs.length}
          onClickChart={d=>setDetail({...d,showAmt:true})}
        />
        <ChartCard
          title="Submitted Estimates by Sales Associate"
          data={submitData}
          total={submittedQ.length}
          onClickChart={d=>setDetail({...d,showAmt:true})}
        />
        <ChartCard
          title="Sales (Won) by Sales Associate"
          data={wonData}
          total={wonQ.length}
          onClickChart={d=>setDetail({...d,showAmt:true})}
        />
        <ChartCard
          title="Lost Quotes by Sales Associate"
          data={lostData}
          total={lostQ.length}
          onClickChart={d=>setDetail({...d,showAmt:true})}
        />
      </div>
    </>
  );
}


// ── CALENDAR PAGE ─────────────────────────────────────────────────────────────
function CalendarPage({ quotes, setQuotes, eqMap, onOpenQuote }) {
  const eqLookup = eqMap || EQ_MAP;
  const [curDate,       setCurDate]       = useState(new Date(2026, 2, 1));
  const [calView,       setCalView]       = useState("master");   // "master" | "job" | "equipment"
  const [selEquip,      setSelEquip]      = useState("ALL");      // equipment filter in equip view
  const [selDay,        setSelDay]        = useState(null);
  const [detailJob,     setDetailJob]     = useState(null);
  const [editDates,     setEditDates]     = useState(null);       // {startDate, compDate} while editing
  const [showConflicts, setShowConflicts] = useState(false);
  const [gcalStatus,    setGcalStatus]    = useState("idle");
  const [gcalEmail,     setGcalEmail]     = useState("");

  const year  = curDate.getFullYear();
  const month = curDate.getMonth();
  const MONTHS = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  // ── Active jobs (won or submitted with a startDate) ───────────────────────
  const activeJobs = useMemo(() =>
    quotes
      .filter(q => q.startDate && (q.status === "Won" || q.status === "Submitted"))
      .map(q => ({
        ...q,
        startObj: new Date(q.startDate + "T12:00:00"),
        endObj:   q.compDate ? new Date(q.compDate + "T12:00:00")
                             : new Date(q.startDate + "T12:00:00"),
      })),
    [quotes]
  );

  // ── Equipment conflict detection — uses equipSchedule dates if available ────
  const equipConflicts = useMemo(() => {
    const cf = [];
    // Build per-equipment date ranges for each job
    function getJobEquipRanges(job) {
      if (job.equipSchedule && job.equipSchedule.length > 0) {
        return job.equipSchedule.map(s => ({
          code:  s.code,
          start: s.startDate ? new Date(s.startDate + "T12:00:00") : job.startObj,
          end:   s.endDate   ? new Date(s.endDate   + "T12:00:00") : job.endObj,
        }));
      }
      // Fall back to equipList with full job span
      return (job.equipList || []).map(code => ({
        code, start: job.startObj, end: job.endObj,
      }));
    }
    for (let i = 0; i < activeJobs.length; i++) {
      for (let j = i + 1; j < activeJobs.length; j++) {
        const a = activeJobs[i], b = activeJobs[j];
        const aRanges = getJobEquipRanges(a);
        const bRanges = getJobEquipRanges(b);
        const conflicts = [];
        aRanges.forEach(ar => {
          const br = bRanges.find(x => x.code === ar.code);
          if (br && ar.start <= br.end && ar.end >= br.start) {
            conflicts.push(ar.code);
          }
        });
        if (conflicts.length) cf.push({ jobA: a, jobB: b, equipment: conflicts });
      }
    }
    return cf;
  }, [activeJobs]);

  // ── Per-day equipment map also uses equipSchedule ─────────────────────────
  function equipOnDayAccurate(d) {
    const day = new Date(year, month, d, 12);
    const m = {};
    activeJobs.forEach(job => {
      function getJobEquipRanges(j) {
        if (j.equipSchedule && j.equipSchedule.length > 0) return j.equipSchedule;
        return (j.equipList || []).map(code => ({
          code,
          startDate: j.startDate || "",
          endDate:   j.compDate  || j.startDate || "",
        }));
      }
      getJobEquipRanges(job).forEach(s => {
        if (!s.startDate) return;
        const start = new Date(s.startDate + "T12:00:00");
        const end   = new Date((s.endDate||s.startDate) + "T12:00:00");
        if (day >= start && day <= end) {
          if (!m[s.code]) m[s.code] = [];
          m[s.code].push(job);
        }
      });
    });
    return m;
  }

  // ── All equipment codes across scheduled jobs ─────────────────────────────
  const allEquipCodes = useMemo(() => {
    const s = new Set();
    activeJobs.forEach(q => (q.equipList || []).forEach(c => s.add(c)));
    return ["ALL", ...Array.from(s).sort()];
  }, [activeJobs]);

  // ── Day helpers ───────────────────────────────────────────────────────────
  function jobsOnDay(d) {
    const day = new Date(year, month, d);
    return activeJobs.filter(q => {
      const s = new Date(q.startObj.getFullYear(), q.startObj.getMonth(), q.startObj.getDate());
      const e = new Date(q.endObj.getFullYear(),   q.endObj.getMonth(),   q.endObj.getDate());
      return day >= s && day <= e;
    });
  }
  function equipOnDay(d) {
    const m = {};
    jobsOnDay(d).forEach(job =>
      (job.equipList || []).forEach(code => {
        if (!m[code]) m[code] = [];
        m[code].push(job);
      })
    );
    return m;
  }
  // In equipment view, jobs on day filtered to selected equipment
  function jobsForEquipOnDay(d) {
    if (selEquip === "ALL") return jobsOnDay(d);
    return jobsOnDay(d).filter(q => (q.equipList || []).includes(selEquip));
  }

  // ── Calendar grid ─────────────────────────────────────────────────────────
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayDate = new Date();
  const isToday = d =>
    d === todayDate.getDate() && month === todayDate.getMonth() && year === todayDate.getFullYear();

  // ── Save edited dates back to quotes array ────────────────────────────────
  function saveDates() {
    if (!detailJob || !editDates) return;
    setQuotes(prev => prev.map(q =>
      q.id === detailJob.id
        ? { ...q, startDate: editDates.startDate, compDate: editDates.compDate }
        : q
    ));
    setDetailJob(q => ({ ...q, startDate: editDates.startDate, compDate: editDates.compDate }));
    setEditDates(null);
  }

  function connectGCal() {
    setGcalStatus("connecting");
    setTimeout(() => { setGcalStatus("connected"); setGcalEmail("scott@shoemakerrigging.com"); }, 1800);
  }

  const sc = s => s === "Won"
    ? { bg: C.grnB, cl: C.grn,  bd: C.grnBdr }
    : { bg: C.bluB, cl: C.blue, bd: C.bluBdr };

  const monthJobs = activeJobs
    .filter(q => {
      const ms = new Date(year, month, 1);
      const me = new Date(year, month + 1, 0, 23, 59);
      return q.startObj <= me && q.endObj >= ms;
    })
    .sort((a, b) => a.startObj - b.startObj);

  // ── Shared cell renderer ──────────────────────────────────────────────────
  function renderCell(d) {
    if (!d) return (
      <div style={{ minHeight: 105, borderRight: `1px solid ${C.bdr}`,
                    borderBottom: `1px solid ${C.bdr}`, background: C.bg }}/>
    );

    const allDayJobs = jobsOnDay(d);
    const equipMap   = equipOnDayAccurate(d);
    const viewJobs   = calView === "job" ? allDayJobs : jobsForEquipOnDay(d);
    const isSel      = selDay === d;
    const isTod      = isToday(d);
    const hasCf      = calView === "job"
      ? Object.values(equipMap).some(jbs => jbs.length > 1)
      : selEquip !== "ALL" && (equipMap[selEquip] || []).length > 1;

    return (
      <div key={d} onClick={() => setSelDay(d === selDay ? null : d)}
        style={{
          minHeight: 105, padding: "5px 5px",
          borderRight: `1px solid ${C.bdr}`, borderBottom: `1px solid ${C.bdr}`,
          borderTop: isTod ? `2.5px solid ${C.accB}` : hasCf ? `2.5px solid ${C.red}` : "none",
          background: isSel ? C.accL : hasCf ? "#fff5f5" : C.sur,
          cursor: "pointer",
        }}>
        {/* Day number */}
        <div style={{
          fontSize: 12, fontWeight: isTod ? 700 : 400, marginBottom: 3,
          width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "50%", background: isTod ? C.acc : "transparent",
          color: isTod ? "#fff" : C.txt,
        }}>
          {d}{hasCf && <span style={{ fontSize: 8, marginLeft: 1 }}>⚠</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* JOB VIEW: job chips only, no equipment */}
          {calView === "job" && viewJobs.slice(0, 2).map(job => {
            const s       = sc(job.status);
            const isStart = job.startObj.getDate()===d && job.startObj.getMonth()===month && job.startObj.getFullYear()===year;
            const isEnd   = job.endObj.getDate()===d   && job.endObj.getMonth()===month   && job.endObj.getFullYear()===year;
            return (
              <div key={job.id} onClick={e => { e.stopPropagation(); setDetailJob(job); setEditDates(null); }}
                title={`${job.client} — ${job.desc}`}
                style={{
                  fontSize: 10, fontWeight: 600, padding: "2px 5px", cursor: "pointer",
                  background: s.bg, color: s.cl, border: `1px solid ${s.bd}`, borderRadius: 3,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  borderLeft:  isStart ? `3px solid ${s.cl}` : undefined,
                  borderRight: isEnd   ? `3px solid ${s.cl}` : undefined,
                }}>
                {isStart ? "▶ " : ""}{job.client.split(" ")[0]}{isEnd ? " ■" : ""}
              </div>
            );
          })}
          {calView === "job" && viewJobs.length > 2 && (
            <div style={{ fontSize: 10, color: C.txtS, paddingLeft: 3 }}>+{viewJobs.length - 2} more</div>
          )}

          {/* EQUIPMENT VIEW: equipment badges only, no job chips */}
          {calView === "equipment" && allDayJobs.length > 0 && (() => {
            const visibleCodes = selEquip === "ALL"
              ? Object.entries(equipMap).slice(0, 4)
              : Object.entries(equipMap).filter(([code]) => code === selEquip);
            const overflow = selEquip === "ALL" ? Math.max(0, Object.keys(equipMap).length - 4) : 0;
            return (
              <>
                {visibleCodes.map(([code, jbs]) => {
                  const conflict = jbs.length > 1;
                  return (
                    <div key={code} onClick={e => { e.stopPropagation(); setSelEquip(code); }} title={`${code}${eqLookup[code] ? " — " + eqLookup[code].name : ""}${conflict ? " ⚠ DOUBLE-BOOKED" : ""}`}
                      style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 5px", borderRadius: 3, marginTop: 1,
                        background: conflict ? C.redB : C.yelB,
                        color:      conflict ? C.red  : C.yel,
                        border:    `1px solid ${conflict ? C.redBdr : C.yelBdr}`,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}>
                      {conflict ? "⚠ " : ""}{code}{jbs.length > 1 ? ` ×${jbs.length}` : ""}
                    </div>
                  );
                })}
                {overflow > 0 && <div style={{ fontSize: 9, color: C.txtS }}>+{overflow} more equip</div>}
              </>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "14px", maxWidth: 1200, margin: "0 auto" }}>

      {/* ── Equipment Conflict Modal ──────────────────────────────────────── */}
      {showConflicts && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 700,
                      display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.sur, borderRadius: 10, padding: 22, width: "100%", maxWidth: 580,
                        maxHeight: "80vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: C.red, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>⚠ Equipment Conflicts</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>
                  {equipConflicts.length} Scheduling Conflict{equipConflicts.length !== 1 ? "s" : ""} Detected
                </div>
              </div>
              <button onClick={() => setShowConflicts(false)}
                style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.txtS }}>×</button>
            </div>
            {equipConflicts.map((cf, i) => (
              <div key={i} style={{ background: C.redB, border: `1px solid ${C.redBdr}`,
                                    borderRadius: 8, padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 8 }}>
                  ⚠ Conflict #{i + 1} — Equipment double-booked
                </div>
                <div style={{ display: "flex", gap: 7, marginBottom: 10, flexWrap: "wrap" }}>
                  {cf.equipment.map(code => {
                    const eq = eqLookup[code];
                    return (
                      <span key={code} style={{ background: C.sur, border: `1px solid ${C.redBdr}`,
                                                 borderRadius: 5, padding: "3px 9px", fontSize: 12,
                                                 fontWeight: 700, color: C.red }}>
                        {code} — {eq ? eq.name : code}
                      </span>
                    );
                  })}
                </div>
                {[cf.jobA, cf.jobB].map(job => (
                  <div key={job.id} style={{ background: C.sur, border: `1px solid ${C.bdr}`,
                                             borderRadius: 6, padding: "9px 12px", marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.acc }}>{job.qn}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{job.client}</div>
                    <div style={{ fontSize: 12, color: C.txtM }}>{job.desc}</div>
                    <div style={{ fontSize: 11, color: C.txtS, marginTop: 2 }}>
                      📅 {job.startDate} → {job.compDate || "TBD"} · SA: {job.salesAssoc || "—"}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div style={{ textAlign: "right" }}>
              <button style={mkBtn("primary")} onClick={() => setShowConflicts(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Job Detail / Date Edit Popup ──────────────────────────────────── */}
      {detailJob && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 600,
                      display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.sur, borderRadius: 10, padding: 20, width: "100%", maxWidth: 520,
                        boxShadow: "0 8px 32px rgba(0,0,0,.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: C.txtS, textTransform: "uppercase", letterSpacing: 1 }}>
                  {detailJob.status === "Won" ? "Active Job" : "Submitted Estimate"}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>{detailJob.qn}</div>
              </div>
              <button onClick={() => { setDetailJob(null); setEditDates(null); }}
                style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.txtS }}>×</button>
            </div>

            {/* Job info */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {[
                ["Client",       detailJob.client],
                ["Description",  detailJob.desc],
                ["Job Site",     detailJob.jobSite],
                ["Status",       detailJob.status],
                detailJob.jobNum ? ["Job #", detailJob.jobNum] : null,
                ["Sales Assoc.", detailJob.salesAssoc || "—"],
                ["Value",        fmt(detailJob.total)],
              ].filter(Boolean).map(([l, v]) => (
                <div key={l} style={{ display: "flex", gap: 10, fontSize: 13 }}>
                  <span style={{ color: C.txtS, minWidth: 100, flexShrink: 0 }}>{l}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* ── Date editing section ───────────────────────────────────── */}
            <div style={{ background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.txtM, textTransform: "uppercase", letterSpacing: .5 }}>
                  📅 Job Dates
                </div>
                {!editDates && (
                  <button onClick={() => setEditDates({ startDate: detailJob.startDate || "", compDate: detailJob.compDate || "" })}
                    style={{ ...mkBtn("outline"), fontSize: 11, padding: "3px 9px" }}>
                    Edit Dates
                  </button>
                )}
              </div>

              {editDates ? (
                /* Edit mode */
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.txtM, marginBottom: 4, fontWeight: 600 }}>START DATE</div>
                      <input type="date" value={editDates.startDate}
                        onChange={e => setEditDates(d => ({ ...d, startDate: e.target.value }))}
                        style={{ background: C.sur, border: `1px solid ${C.bdrM}`, borderRadius: 5,
                                 color: C.txt, fontFamily: "inherit", fontSize: 13, padding: "7px 9px",
                                 width: "100%", boxSizing: "border-box", outline: "none" }}/>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: C.txtM, marginBottom: 4, fontWeight: 600 }}>COMPLETION DATE</div>
                      <input type="date" value={editDates.compDate}
                        onChange={e => setEditDates(d => ({ ...d, compDate: e.target.value }))}
                        style={{ background: C.sur, border: `1px solid ${C.bdrM}`, borderRadius: 5,
                                 color: C.txt, fontFamily: "inherit", fontSize: 13, padding: "7px 9px",
                                 width: "100%", boxSizing: "border-box", outline: "none" }}/>
                    </div>
                  </div>
                  {/* Duration preview */}
                  {editDates.startDate && editDates.compDate && (
                    <div style={{ fontSize: 12, color: C.acc, marginBottom: 10, fontWeight: 600 }}>
                      Duration: {Math.round((new Date(editDates.compDate) - new Date(editDates.startDate)) / 86400000) + 1} day(s)
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={mkBtn("primary")} onClick={saveDates}>Save Dates</button>
                    <button style={mkBtn("ghost")} onClick={() => setEditDates(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.txtS, marginBottom: 3 }}>Start Date</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.grn }}>
                      {detailJob.startDate || <span style={{ color: C.txtS, fontStyle: "italic" }}>Not set</span>}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.txtS, marginBottom: 3 }}>Completion Date</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ora }}>
                      {detailJob.compDate || <span style={{ color: C.txtS, fontStyle: "italic" }}>Not set</span>}
                    </div>
                  </div>
                  {detailJob.startDate && detailJob.compDate && (
                    <div style={{ gridColumn: "1/-1", fontSize: 12, color: C.txtS }}>
                      Duration: {Math.round((new Date(detailJob.compDate) - new Date(detailJob.startDate)) / 86400000) + 1} day(s)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Equipment list */}
            {(detailJob.equipList || []).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: C.txtS, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 7 }}>
                  Equipment on this Job
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(detailJob.equipList || []).map(code => {
                    const eq = eqLookup[code];
                    const hasConflict = equipConflicts.some(cf =>
                      (cf.jobA.id === detailJob.id || cf.jobB.id === detailJob.id) && cf.equipment.includes(code)
                    );
                    return (
                      <span key={code} style={{
                        background: hasConflict ? C.redB : C.grnB,
                        color:      hasConflict ? C.red  : C.grn,
                        border:    `1px solid ${hasConflict ? C.redBdr : C.grnBdr}`,
                        borderRadius: 5, padding: "3px 9px", fontSize: 12, fontWeight: 600,
                      }}>
                        {hasConflict ? "⚠ " : "🔧 "}{code}{eq ? ` — ${eq.name}` : ""}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={mkBtn("ghost")} onClick={() => { setDetailJob(null); setEditDates(null); }}>Close</button>
              <button style={mkBtn("primary")} onClick={() => { onOpenQuote(detailJob); setDetailJob(null); setEditDates(null); }}>
                Open Estimate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Job Calendar</div>
          <div style={{ fontSize: 12, color: C.txtS, marginTop: 2 }}>
            Start & completion spans · Equipment per day · Conflict detection
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {equipConflicts.length > 0 && (
            <button onClick={() => setShowConflicts(true)} style={{
              background: C.redB, color: C.red, border: `1.5px solid ${C.redBdr}`,
              borderRadius: 7, padding: "7px 13px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}>
              ⚠ {equipConflicts.length} Equipment Conflict{equipConflicts.length !== 1 ? "s" : ""}
            </button>
          )}
          {/* Google Calendar */}
          <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 8,
                        padding: "9px 13px", display: "flex", alignItems: "center", gap: 9 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="17" rx="2" fill="#fff" stroke="#dadce0" strokeWidth="1.2"/>
              <rect x="3" y="4" width="18" height="6" rx="2" fill="#4285f4"/>
              <rect x="3" y="8" width="18" height="2" fill="#4285f4"/>
              <text x="12" y="19" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#4285f4">31</text>
              <line x1="8" y1="2" x2="8" y2="7"  stroke="#4285f4" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="2" x2="16" y2="7" stroke="#4285f4" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {gcalStatus === "idle"       && <button onClick={connectGCal} style={{ background:"#4285f4", color:"#fff", border:"none", borderRadius:5, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>Connect Google Calendar</button>}
            {gcalStatus === "connecting" && <span style={{ fontSize:12, color:C.txtS }}>Connecting…</span>}
            {gcalStatus === "connected"  && (
              <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ color: C.grn, fontWeight: 700 }}>✓ Connected</span>
                <span style={{ color: C.txtS }}>{gcalEmail}</span>
                <button onClick={() => setGcalStatus("idle")} style={{ background:"none", border:"none", color:C.txtS, cursor:"pointer", fontSize:11 }}>Disconnect</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── View Toggle + Equipment Filter ───────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        {/* View toggle */}
        <div style={{ display: "flex", background: C.bg, border: `1px solid ${C.bdr}`,
                      borderRadius: 7, overflow: "hidden", flexShrink: 0 }}>
          {[["master", "📊 Schedule"], ["job", "📋 By Job"], ["equipment", "🔧 By Equipment"]].map(([v, l]) => (
            <button key={v} onClick={() => setCalView(v)} style={{
              background: calView === v ? C.acc : "transparent",
              color:      calView === v ? "#fff" : C.txtM,
              border: "none", padding: "7px 16px", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", transition: "background .15s",
            }}>{l}</button>
          ))}
        </div>

        {/* ── MASTER SCHEDULE VIEW ────────────────────────────────────────── */}
        {calView === "master" && (() => {
          if (!activeJobs.length) return (
            <div style={{ width:"100%", textAlign:"center", color:C.txtS, padding:"40px 0", fontSize:13 }}>
              No scheduled jobs. Add start dates to Won or Submitted quotes to see them here.
            </div>
          );

          const sorted    = [...activeJobs].sort((a,b) => a.startObj - b.startObj);
          const minDate   = sorted[0].startDate;
          const maxRaw    = sorted.reduce((m,j) => {
            const jEnd = j.compDate || j.startDate;
            // Also consider equipSchedule end dates
            const eqEnd = (j.equipSchedule||[]).reduce((em,s) => s.endDate>em?s.endDate:em, jEnd);
            return (!m || eqEnd > m) ? eqEnd : m;
          }, "");
          const maxDate   = jAddDays(maxRaw, 4);
          const totalDays = Math.max(jDaysBetween(minDate, maxDate) + 1, 14);
          const todayStr  = new Date().toISOString().slice(0,10);
          const COL_W     = 28;
          const JOB_H     = 28;
          const EQ_H      = 18;
          const LABEL_W   = 200;
          const COLORS    = [C.grn, C.blue, C.acc, C.teal, "#7c3aed", "#ec4899", "#f59e0b", "#06b6d4"];
          const conflictJobIds = new Set(equipConflicts.flatMap(cf => [cf.jobA.id, cf.jobB.id]));

          // Helper: get equipSchedule for a job (same logic as JobsPage)
          function getEquipSched(job) {
            if (job.equipSchedule && job.equipSchedule.length > 0) return job.equipSchedule;
            return (job.equipList||[]).map(code => ({
              code,
              startDate: job.startDate || "",
              endDate:   job.compDate  || job.startDate || "",
            }));
          }

          // Build flat rows: job row + equipment sub-rows
          const masterRows = [];
          sorted.forEach((job, ji) => {
            const color    = COLORS[ji % COLORS.length];
            const hasCf    = conflictJobIds.has(job.id);
            const adjTotal = (job.salesAdjustments||[]).reduce((s,a)=>s+a.amount,0);
            const netTotal = (job.total||0)+adjTotal;
            masterRows.push({ type:"job", job, color, hasCf, netTotal });
            getEquipSched(job).forEach(s => {
              if (!s.startDate) return;
              const hasCfEq = equipConflicts.some(cf =>
                cf.equipment.includes(s.code) &&
                (cf.jobA.id===job.id || cf.jobB.id===job.id)
              );
              masterRows.push({ type:"equip", job, color, code:s.code, startDate:s.startDate, endDate:s.endDate||s.startDate, hasCf:hasCfEq });
            });
          });

          return (
            <div style={{ width:"100%", marginBottom:16 }}>
              {/* Conflict alert */}
              {equipConflicts.length > 0 && (
                <div onClick={() => setShowConflicts(true)} style={{
                  background:C.redB, border:`1px solid ${C.red}`, borderRadius:7,
                  padding:"10px 14px", marginBottom:12, display:"flex", alignItems:"center",
                  gap:10, cursor:"pointer"
                }}>
                  <span style={{ fontSize:18 }}>⚠️</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, color:C.red, fontSize:13 }}>
                      {equipConflicts.length} equipment conflict{equipConflicts.length>1?"s":""} — click to review
                    </div>
                    <div style={{ fontSize:11, color:C.txtS, marginTop:2 }}>
                      {equipConflicts.slice(0,3).map((cf,i) => (
                        <span key={i} style={{ marginRight:12 }}>
                          {cf.equipment.join(", ")}: {cf.jobA.client.split(" ")[0]} ↔ {cf.jobB.client.split(" ")[0]}
                        </span>
                      ))}
                      {equipConflicts.length > 3 && <span>+{equipConflicts.length-3} more</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Master Gantt */}
              <div style={{ overflowX:"auto" }}>
                <div style={{ minWidth: LABEL_W + totalDays * COL_W }}>

                  {/* Date header */}
                  <div style={{ display:"flex", marginBottom:2, borderBottom:`1px solid ${C.bdr}` }}>
                    <div style={{ width:LABEL_W, flexShrink:0, fontSize:9, color:C.txtS,
                                  fontWeight:600, textTransform:"uppercase", letterSpacing:.5,
                                  display:"flex", alignItems:"flex-end", paddingBottom:5, paddingLeft:4 }}>
                      Job / Equipment
                    </div>
                    <div style={{ flex:1, position:"relative", height:36 }}>
                      {Array.from({length:totalDays}, (_,i) => {
                        const d    = jAddDays(minDate, i);
                        const dt   = new Date(d);
                        const isMon   = dt.getDay() === 1;
                        const isWe    = jIsWeekend(d);
                        const isTod   = d === todayStr;
                        return (
                          <div key={d} style={{
                            position:"absolute", left:i*COL_W, width:COL_W, top:0, bottom:0,
                            background: isTod ? `${C.red}18` : isWe ? `${C.acc}08` : "transparent",
                            borderLeft: isMon ? `1px solid ${C.bdrM}` : "none",
                          }}>
                            {(isMon || i===0) && (
                              <div style={{ fontSize:8, color:isTod?C.red:C.txtS, position:"absolute",
                                           bottom:5, left:2, whiteSpace:"nowrap", fontWeight:isTod?700:400 }}>
                                {jFmtDate(d)}
                              </div>
                            )}
                            {isTod && <div style={{ position:"absolute", top:0, bottom:0, left:COL_W/2-1,
                                                    width:2, background:C.red, opacity:.7 }}/>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rows */}
                  {masterRows.map((row, ri) => {
                    if (row.type === "job") {
                      const { job, color, hasCf, netTotal } = row;
                      const leftPx = jDaysBetween(minDate, job.startDate) * COL_W;
                      const widPx  = Math.max(COL_W, (jDaysBetween(job.startDate, job.compDate||job.startDate)+1)*COL_W);
                      return (
                        <div key={`job-${job.id}`} style={{
                          display:"flex", alignItems:"center",
                          borderBottom:`1px solid ${C.bdr}`, minHeight:JOB_H+8,
                          background: hasCf ? `${C.red}08` : ri%2===0 ? C.sur : "transparent",
                        }}>
                          {/* Label */}
                          <div style={{ width:LABEL_W, flexShrink:0, padding:"4px 8px 4px 4px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                              {hasCf && <span style={{ color:C.red, fontSize:10, flexShrink:0 }}>⚠</span>}
                              <div style={{ minWidth:0 }}>
                                <div style={{ fontSize:11, fontWeight:700,
                                             color: hasCf ? C.red : color,
                                             whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                                  {job.client}
                                </div>
                                <div style={{ fontSize:9, color:C.txtS, display:"flex", gap:6, flexWrap:"nowrap" }}>
                                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                    {job.jobNum||job.qn}
                                  </span>
                                  <span style={{ color:C.grn, fontWeight:600, flexShrink:0 }}>{fmt(netTotal)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Bar area */}
                          <div style={{ flex:1, position:"relative", height:JOB_H+8 }}>
                            {/* Background grid */}
                            {Array.from({length:totalDays},(_,i)=>{
                              const d=jAddDays(minDate,i);
                              return jIsWeekend(d)?<div key={d} style={{position:"absolute",top:0,bottom:0,left:i*COL_W,width:COL_W,background:`${C.acc}06`}}/>:null;
                            })}
                            {/* Today line */}
                            {todayStr>=minDate&&todayStr<=maxDate&&(
                              <div style={{position:"absolute",top:0,bottom:0,
                                          left:jDaysBetween(minDate,todayStr)*COL_W+COL_W/2-1,
                                          width:2,background:C.red,opacity:.5,zIndex:3}}/>
                            )}
                            {/* Job bar */}
                            <div onClick={()=>onOpenQuote&&onOpenQuote(job)}
                              title={`${job.client} — ${job.desc}
${job.startDate} → ${job.compDate||"TBD"}`}
                              style={{
                                position:"absolute", left:leftPx, width:widPx,
                                top:4, height:JOB_H,
                                background: hasCf ? C.redB : `${color}28`,
                                border:`1.5px solid ${hasCf?C.red:color}`,
                                borderRadius:4, cursor:"pointer", zIndex:1,
                                display:"flex", alignItems:"center", padding:"0 7px",
                                overflow:"hidden", transition:"opacity .15s",
                              }}
                              onMouseEnter={e=>e.currentTarget.style.opacity=".75"}
                              onMouseLeave={e=>e.currentTarget.style.opacity="1"}
                            >
                              <span style={{ fontSize:9, fontWeight:700, color:hasCf?C.red:color,
                                            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                                {job.status==="Won"?"✓ ":""}{job.desc||job.client}
                                {job.compDate&&job.startDate!==job.compDate?` · ${jDaysBetween(job.startDate,job.compDate)+1}d`:""}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      // Equipment sub-row
                      const { job, color, code, startDate, endDate, hasCf } = row;
                      const eqInfo  = eqLookup[code];
                      const leftPx  = jDaysBetween(minDate, startDate) * COL_W;
                      const widPx   = Math.max(COL_W, (jDaysBetween(startDate, endDate)+1)*COL_W);
                      const days    = jDaysBetween(startDate, endDate)+1;
                      return (
                        <div key={`eq-${job.id}-${code}`} style={{
                          display:"flex", alignItems:"center",
                          borderBottom:`1px solid ${C.bdr}22`,
                          minHeight:EQ_H+6,
                          background: hasCf ? `${C.red}05` : "transparent",
                        }}>
                          {/* Label */}
                          <div style={{ width:LABEL_W, flexShrink:0, padding:"2px 8px 2px 20px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                              {hasCf && <span style={{ color:C.red, fontSize:9 }}>⚠</span>}
                              <span style={{ fontSize:10, color:hasCf?C.red:C.txtS, fontWeight:600,
                                            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                                🔧 {eqInfo ? eqInfo.name.split(" ").slice(-3).join(" ") : code}
                              </span>
                            </div>
                            <div style={{ fontSize:9, color:C.txtS, paddingLeft:14 }}>
                              {days}d{eqInfo?.daily?` · ${fmt(days*eqInfo.daily)}`:""}
                            </div>
                          </div>
                          {/* Bar area */}
                          <div style={{ flex:1, position:"relative", height:EQ_H+6 }}>
                            {todayStr>=minDate&&todayStr<=maxDate&&(
                              <div style={{position:"absolute",top:0,bottom:0,
                                          left:jDaysBetween(minDate,todayStr)*COL_W+COL_W/2-1,
                                          width:2,background:C.red,opacity:.3,zIndex:3}}/>
                            )}
                            <div title={`${code}${eqInfo?" — "+eqInfo.name:""}
${startDate} → ${endDate} · ${days} day${days!==1?"s":""}`}
                              style={{
                                position:"absolute", left:leftPx, width:widPx,
                                top:3, height:EQ_H,
                                background: hasCf ? `${C.red}33` : `${color}18`,
                                border:`1px solid ${hasCf?C.red:color}66`,
                                borderRadius:3, zIndex:1,
                                display:"flex", alignItems:"center", padding:"0 5px",
                                overflow:"hidden",
                              }}>
                              <span style={{ fontSize:8, color:hasCf?C.red:C.txtS,
                                            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                                            fontWeight: hasCf?700:400 }}>
                                {hasCf?"⚠ ":""}{code}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })}

                  {/* Legend */}
                  <div style={{ display:"flex", gap:16, marginTop:10, paddingTop:10,
                               borderTop:`1px solid ${C.bdr}`, fontSize:10, color:C.txtS, flexWrap:"wrap" }}>
                    <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <div style={{ width:16, height:8, background:`${C.grn}28`, border:`1px solid ${C.grn}`, borderRadius:2 }}/>
                      Won Job
                    </span>
                    <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <div style={{ width:16, height:8, background:`${C.blue}28`, border:`1px solid ${C.blue}`, borderRadius:2 }}/>
                      Submitted
                    </span>
                    <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <div style={{ width:16, height:8, background:`${C.grn}18`, border:`1px solid ${C.grn}66`, borderRadius:2 }}/>
                      🔧 Equipment (actual dates)
                    </span>
                    <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <div style={{ width:16, height:8, background:C.redB, border:`1px solid ${C.red}`, borderRadius:2 }}/>
                      ⚠ Conflict
                    </span>
                    <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <div style={{ width:2, height:10, background:C.red }}/>
                      Today
                    </span>
                    <span style={{ color:C.txtS }}>Hover bars for details · Click job bar to open estimate</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Equipment filter — only in equipment view */}
        {calView === "equipment" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: C.txtS, fontWeight: 600 }}>Equipment:</span>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {allEquipCodes.map(code => {
                const eq = eqLookup[code];
                const hasConflict = code !== "ALL" && equipConflicts.some(cf => cf.equipment.includes(code));
                return (
                  <button key={code} onClick={() => setSelEquip(code)} style={{
                    background: selEquip === code ? (hasConflict ? C.red : C.acc) : (hasConflict ? C.redB : C.bg),
                    color:      selEquip === code ? "#fff" : (hasConflict ? C.red : C.txtM),
                    border:    `1px solid ${selEquip === code ? "transparent" : hasConflict ? C.redBdr : C.bdr}`,
                    borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}>
                    {hasConflict ? "⚠ " : ""}{code === "ALL" ? "All Equipment" : code}
                    {eq && code !== "ALL" ? ` — ${eq.name.split(" ").slice(0, 2).join(" ")}` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { c: C.grn,  l: "Won Job (active span)" },
          { c: C.blue, l: "Submitted Estimate"    },
          { c: C.yel,  l: "Equipment scheduled"   },
          { c: C.red,  l: "Equipment conflict ⚠"  },
          { c: C.accB, l: "Today"                 },
        ].map(x => (
          <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.txtM }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: x.c }}/>{x.l}
          </div>
        ))}
      </div>

      {/* ── Calendar Grid ────────────────────────────────────────────────── */}
      {calView !== "master" && <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
        {/* Month nav */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "11px 16px", borderBottom: `1px solid ${C.bdr}`, background: C.bg }}>
          <button onClick={() => setCurDate(new Date(year, month - 1, 1))}
            style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 6, padding: "5px 14px", fontSize: 14, cursor: "pointer", fontWeight: 700 }}>‹</button>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{MONTHS[month]} {year}</div>
          <button onClick={() => setCurDate(new Date(year, month + 1, 1))}
            style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 6, padding: "5px 14px", fontSize: 14, cursor: "pointer", fontWeight: 700 }}>›</button>
        </div>
        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: `1px solid ${C.bdr}` }}>
          {DAYS.map(d => (
            <div key={d} style={{ padding: "7px 0", textAlign: "center", fontSize: 11, fontWeight: 600, color: C.txtS, textTransform: "uppercase" }}>{d}</div>
          ))}
        </div>
        {/* Cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {cells.map((d, i) => <React.Fragment key={i}>{renderCell(d)}</React.Fragment>)}
        </div>
      </div>}

      {/* ── Selected Day Detail ───────────────────────────────────────────── */}
      {calView !== "master" && selDay && (() => {
        const jobs     = calView === "job" ? jobsOnDay(selDay) : jobsForEquipOnDay(selDay);
        const equipMap = equipOnDay(selDay);
        if (!jobs.length) return null;
        return (
          <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
              {MONTHS[month]} {selDay}, {year}
              {calView === "equipment" && selEquip !== "ALL" && (
                <span style={{ fontSize: 13, color: C.acc, marginLeft: 8 }}>· {selEquip} — {eqLookup[selEquip]?.name || ""}</span>
              )}
            </div>
            {/* Conflict warnings */}
            {Object.entries(equipMap).filter(([, jbs]) => jbs.length > 1).map(([code, jbs]) => {
              const eq = eqLookup[code];
              return (
                <div key={code} style={{ background: C.redB, border: `1px solid ${C.redBdr}`, borderRadius: 7,
                                          padding: "9px 13px", marginBottom: 9, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>⚠</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.red }}>Conflict: {code} — {eq ? eq.name : code}</div>
                    <div style={{ fontSize: 12, color: C.red, marginTop: 1 }}>
                      Double-booked: {jbs.map(j => j.qn).join(" and ")}
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Job cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {jobs.map(job => {
                const s = sc(job.status);
                const jobEquip = (job.equipList || []).map(code => ({
                  code, eq: eqLookup[code], conflict: (equipMap[code] || []).length > 1,
                }));
                return (
                  <div key={job.id} style={{ border: `1px solid ${s.bd}`, borderRadius: 7,
                                             padding: "11px 14px", background: s.bg }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, color: C.acc, fontSize: 12 }}>{job.qn}</span>
                          <span style={{ background: s.bg, color: s.cl, border: `1px solid ${s.bd}`,
                                         borderRadius: 4, padding: "1px 7px", fontSize: 11, fontWeight: 600 }}>{job.status}</span>
                          {job.jobNum && <span style={{ fontSize: 11, color: C.grn }}>🔒 {job.jobNum}</span>}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{job.client}</div>
                        <div style={{ fontSize: 12, color: C.txtM }}>{job.desc}</div>
                        {job.jobSite && <div style={{ fontSize: 11, color: C.txtS, marginTop: 1 }}>📍 {job.jobSite}</div>}
                        <div style={{ fontSize: 11, color: C.txtS, marginTop: 2 }}>
                          📅 {job.startDate} → {job.compDate || "TBD"} · SA: {job.salesAssoc || "—"}
                        </div>
                        {jobEquip.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
                            {jobEquip.map(({ code, eq, conflict }) => (
                              <span key={code} style={{
                                background: conflict ? C.redB : C.sur,
                                color:      conflict ? C.red  : C.txtM,
                                border:    `1px solid ${conflict ? C.redBdr : C.bdr}`,
                                borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600,
                              }}>
                                {conflict ? "⚠ " : "🔧 "}{code}{eq ? ` — ${eq.name}` : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: C.acc }}>{fmt(job.total)}</div>
                        <button onClick={() => { setDetailJob(job); setEditDates(null); }}
                          style={{ ...mkBtn("ghost"), fontSize: 11, padding: "3px 9px", marginTop: 6 }}>
                          Details / Edit Dates
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Scheduled Jobs This Month ─────────────────────────────────────── */}
      {calView !== "master" && <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 8, padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
          Scheduled Jobs — {MONTHS[month]} {year}
          {calView === "equipment" && selEquip !== "ALL" && (
            <span style={{ fontSize: 13, color: C.acc, marginLeft: 8, fontWeight: 400 }}>
              · Filtered to {selEquip}
            </span>
          )}
        </div>
        {(() => {
          const filtered = calView === "equipment" && selEquip !== "ALL"
            ? monthJobs.filter(q => (q.equipList || []).includes(selEquip))
            : monthJobs;
          if (!filtered.length) return (
            <div style={{ color: C.txtS, fontSize: 13 }}>No jobs scheduled this month.</div>
          );
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {filtered.map(job => {
                const s = sc(job.status);
                const hasCf = equipConflicts.some(cf => cf.jobA.id === job.id || cf.jobB.id === job.id);
                return (
                  <div key={job.id} onClick={() => { setDetailJob(job); setEditDates(null); }}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                             padding: "11px 14px", borderRadius: 7, cursor: "pointer", gap: 10,
                             background: hasCf ? "#fff5f5" : s.bg,
                             border: `1px solid ${hasCf ? C.redBdr : s.bd}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, color: C.acc, fontSize: 12 }}>{job.qn}</span>
                        <span style={{ background: s.bg, color: s.cl, border: `1px solid ${s.bd}`,
                                       borderRadius: 4, padding: "1px 7px", fontSize: 11, fontWeight: 600 }}>{job.status}</span>
                        {hasCf && <span style={{ color: C.red, fontSize: 11, fontWeight: 700 }}>⚠ Equip Conflict</span>}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{job.client}</div>
                      <div style={{ fontSize: 12, color: C.txtM }}>{job.desc}</div>
                      <div style={{ fontSize: 11, color: C.txtS, marginTop: 2 }}>
                        📅 {job.startDate} → {job.compDate || "TBD"} · SA: {job.salesAssoc || "—"}
                      </div>
                      {(job.equipList || []).length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
                          {(job.equipList || []).map(code => (
                            <span key={code} style={{ fontSize: 10, background: C.sur, border: `1px solid ${C.bdr}`,
                                                       borderRadius: 3, padding: "1px 6px", color: C.txtM }}>
                              🔧 {code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.acc }}>{fmt(job.total)}</div>
                      <div style={{ fontSize: 11, color: C.txtS, marginTop: 3 }}>click to edit dates</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>}
    </div>
  );
}


// ── ADMIN PAGE ────────────────────────────────────────────────────────────────
function AdminPage({ currentUser, onBack }) {
  const [tab, setTab]               = useState("users");
  const [users, setUsers]           = useState([]);
  const [company, setCompany]       = useState({});
  const [tasks, setTasks]           = useState([]);
  const [tables, setTables]         = useState([]);
  const [browseTable, setBrowseTable] = useState(null);
  const [browseRows, setBrowseRows] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState("");
  const [pipelineSettings, setPipelineSettings] = useState({
    rfq_warn_days:    "3",
    rfq_overdue_days: "7",
    quote_warn_days:  "5",
    quote_stale_days: "10",
    pipeline_owner:   "",
  });

  // User form
  const blankUser = { username:"", password:"", first_name:"", last_name:"", email:"", cell_phone:"", role:"estimator" };
  const [userForm, setUserForm]     = useState(blankUser);
  const [editUserId, setEditUserId] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);

  // Task form
  const [newTask, setNewTask]       = useState("");

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const adminFetch = async (path, options = {}) => {
    const res = await fetch(path, {
      ...options,
      headers: { "Content-Type":"application/json", Authorization:`Bearer ${localStorage.getItem("rigpro_token")||""}`, ...(options.headers||{}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||"Error"); }
    return res.json();
  };

  useEffect(() => { loadTab(tab); }, [tab]);

  async function loadTab(t) {
    setLoading(true);
    try {
      if (t === "users")    { const d = await adminFetch("/api/admin/users");    setUsers(d); }
      if (t === "company")  { const d = await adminFetch("/api/admin/company");  setCompany(d); }
      if (t === "pipeline") { const d = await adminFetch("/api/admin/settings"); setPipelineSettings(prev => ({ ...prev, ...d })); }
      if (t === "tasks")    { const d = await adminFetch("/api/admin/tasks");    setTasks(d); }
      if (t === "database") { const d = await adminFetch("/api/admin/tables");   setTables(d); }
    } catch (e) { flash("Error loading: " + e.message); }
    setLoading(false);
  }

  // ── USER MANAGEMENT ──────────────────────────────────────────
  async function saveUser() {
    try {
      if (editUserId) {
        const updated = await adminFetch(`/api/admin/users/${editUserId}`, { method:"PUT", body: userForm });
        setUsers(prev => prev.map(u => u.id === editUserId ? { ...u, ...updated } : u));
        flash("User updated.");
      } else {
        const created = await adminFetch("/api/admin/users", { method:"POST", body: userForm });
        setUsers(prev => [created, ...prev]);
        flash("User created.");
      }
      setUserForm(blankUser); setEditUserId(null); setShowUserForm(false);
    } catch (e) { flash(e.message); }
  }

  async function toggleUser(u) {
    try {
      await adminFetch(`/api/admin/users/${u.id}/status`, { method:"PATCH", body:{ is_disabled: !u.is_disabled } });
      setUsers(prev => prev.map(x => x.id===u.id ? {...x, is_disabled: !u.is_disabled} : x));
    } catch (e) { flash(e.message); }
  }

  function startEditUser(u) {
    setUserForm({ username: u.username, password:"", first_name: u.first_name||"", last_name: u.last_name||"", email: u.email||"", cell_phone: u.cell_phone||"", role: u.role });
    setEditUserId(u.id); setShowUserForm(true);
  }

  // ── COMPANY PROFILE ──────────────────────────────────────────
  async function saveCompany() {
    try {
      const d = await adminFetch("/api/admin/company", { method:"PUT", body: company });
      setCompany(d); flash("Company profile saved.");
    } catch (e) { flash(e.message); }
  }

  async function savePipelineSettings() {
    try {
      await adminFetch("/api/admin/settings", { method:"PUT", body: pipelineSettings });
      flash("Pipeline settings saved.");
    } catch (e) { flash(e.message); }
  }

  // ── ADMIN TASKS ───────────────────────────────────────────────
  async function addTask() {
    if (!newTask.trim()) return;
    try {
      const t = await adminFetch("/api/admin/tasks", { method:"POST", body:{ text: newTask } });
      setTasks(prev => [t, ...prev]); setNewTask(""); flash("Task added.");
    } catch (e) { flash(e.message); }
  }

  async function toggleTask(t) {
    try {
      await adminFetch(`/api/admin/tasks/${t.id}`, { method:"PATCH", body:{ done: !t.done } });
      setTasks(prev => prev.map(x => x.id===t.id ? {...x, done: !t.done} : x));
    } catch (e) { flash(e.message); }
  }

  async function deleteTask(id) {
    try {
      await adminFetch(`/api/admin/tasks/${id}`, { method:"DELETE" });
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) { flash(e.message); }
  }

  // ── DATA BROWSER ──────────────────────────────────────────────
  async function browseTableData(name) {
    setBrowseTable(name); setBrowseRows([]);
    try {
      const rows = await adminFetch(`/api/admin/tables/${name}`);
      setBrowseRows(rows);
    } catch (e) { flash(e.message); }
  }

  // ── COLORS ───────────────────────────────────────────────────
  const tabs = [
    { id:"users",    label:"👥 Users" },
    { id:"company",  label:"🏢 Company Profile" },
    { id:"pipeline", label:"⚙ Pipeline Settings" },
    { id:"tasks",    label:"✅ Admin Tasks" },
    { id:"database", label:"🗄️ Database" },
    { id:"browser",  label:"🔍 Data Browser" },
  ];

  const inp2 = { background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:6, padding:"7px 10px", color:C.txt, fontSize:13, width:"100%", fontFamily:"inherit", outline:"none" };
  const sel2 = { ...inp2, cursor:"pointer" };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      {/* Header */}
      <div style={{ background:C.sur, borderBottom:`1px solid ${C.bdr}`, padding:"10px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <button style={{ ...mkBtn("ghost"), fontSize:12 }} onClick={onBack}>← Back</button>
        <span style={{ fontWeight:700, fontSize:16, color:C.acc }}>Admin Panel</span>
        <span style={{ fontSize:12, color:C.txtS }}>Logged in as {currentUser?.username}</span>
      </div>

      <div style={{ display:"flex", maxWidth:1200, margin:"0 auto", padding:16, gap:16 }}>
        {/* Sidebar */}
        <div style={{ width:180, flexShrink:0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ display:"block", width:"100%", textAlign:"left", padding:"10px 14px", marginBottom:4, borderRadius:7, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight: tab===t.id ? 700 : 400, background: tab===t.id ? C.accB : "transparent", color: tab===t.id ? C.acc : C.txt }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, minWidth:0 }}>
          {msg && <div style={{ background: msg.includes("Error") ? C.redB : C.grnB, border:`1px solid ${msg.includes("Error")?C.redBdr:C.grnBdr}`, borderRadius:7, padding:"8px 14px", marginBottom:12, fontSize:13, color: msg.includes("Error") ? C.red : C.grn }}>{msg}</div>}

          {/* ── USERS ── */}
          {tab === "users" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <Sec c="User Management" />
                <button style={mkBtn("primary")} onClick={()=>{ setUserForm(blankUser); setEditUserId(null); setShowUserForm(true); }}>+ New User</button>
              </div>

              {showUserForm && (
                <Card style={{ marginBottom:16 }}>
                  <Sec c={editUserId ? "Edit User" : "New User"} />
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                    {!editUserId && <>
                      <div><Lbl c="USERNAME"/><input style={inp2} value={userForm.username} onChange={e=>setUserForm(p=>({...p,username:e.target.value}))}/></div>
                      <div><Lbl c="PASSWORD"/><input style={inp2} type="password" value={userForm.password} onChange={e=>setUserForm(p=>({...p,password:e.target.value}))}/></div>
                    </>}
                    {editUserId && <div><Lbl c="NEW PASSWORD (leave blank to keep)"/><input style={inp2} type="password" value={userForm.password} onChange={e=>setUserForm(p=>({...p,password:e.target.value}))}/></div>}
                    <div><Lbl c="FIRST NAME"/><input style={inp2} value={userForm.first_name} onChange={e=>setUserForm(p=>({...p,first_name:e.target.value}))}/></div>
                    <div><Lbl c="LAST NAME"/><input style={inp2} value={userForm.last_name} onChange={e=>setUserForm(p=>({...p,last_name:e.target.value}))}/></div>
                    <div><Lbl c="EMAIL"/><input style={inp2} value={userForm.email} onChange={e=>setUserForm(p=>({...p,email:e.target.value}))}/></div>
                    <div><Lbl c="CELL PHONE"/><input style={inp2} value={userForm.cell_phone} onChange={e=>setUserForm(p=>({...p,cell_phone:e.target.value}))}/></div>
                    <div><Lbl c="ROLE"/><select style={sel2} value={userForm.role} onChange={e=>setUserForm(p=>({...p,role:e.target.value}))}>
                      {["admin","manager","estimator","user"].map(r=><option key={r} value={r}>{r}</option>)}
                    </select></div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button style={mkBtn("primary")} onClick={saveUser}>Save</button>
                    <button style={mkBtn("outline")} onClick={()=>{setShowUserForm(false);setEditUserId(null);}}>Cancel</button>
                  </div>
                </Card>
              )}

              {loading ? <div style={{ color:C.txtS, padding:20 }}>Loading...</div> : (
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr style={{ borderBottom:`2px solid ${C.bdr}` }}>
                    {["Name","Username","Email","Cell","Role","Status",""].map(h=><th key={h} style={{ textAlign:"left", padding:"6px 10px", fontSize:11, color:C.txtS, fontWeight:700, textTransform:"uppercase" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom:`1px solid ${C.bdr}`, opacity: u.is_disabled ? 0.5 : 1 }}>
                        <td style={{ padding:"8px 10px", fontWeight:600 }}>{u.first_name} {u.last_name}</td>
                        <td style={{ padding:"8px 10px", color:C.txtM }}>{u.username}</td>
                        <td style={{ padding:"8px 10px", color:C.txtM, fontSize:12 }}>{u.email}</td>
                        <td style={{ padding:"8px 10px", color:C.txtM, fontSize:12 }}>{u.cell_phone}</td>
                        <td style={{ padding:"8px 10px" }}><span style={{ background: u.role==="admin"?C.redB:u.role==="manager"?C.yelB:C.bluB, color: u.role==="admin"?C.red:u.role==="manager"?C.yel:C.blue, border:`1px solid ${u.role==="admin"?C.redBdr:u.role==="manager"?C.yelBdr:C.bluBdr}`, borderRadius:4, padding:"1px 7px", fontSize:11, fontWeight:600 }}>{u.role}</span></td>
                        <td style={{ padding:"8px 10px" }}><span style={{ color: u.is_disabled ? C.red : C.grn, fontWeight:600, fontSize:12 }}>{u.is_disabled ? "Disabled" : "Active"}</span></td>
                        <td style={{ padding:"8px 10px" }}>
                          <div style={{ display:"flex", gap:6 }}>
                            <button style={{ ...mkBtn("outline"), fontSize:11, padding:"2px 8px" }} onClick={()=>startEditUser(u)}>Edit</button>
                            {u.id !== currentUser?.id && <button style={{ ...mkBtn(u.is_disabled?"primary":"danger"), fontSize:11, padding:"2px 8px" }} onClick={()=>toggleUser(u)}>{u.is_disabled?"Enable":"Disable"}</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── COMPANY PROFILE ── */}
          {tab === "company" && (
            <div>
              <Sec c="Company Profile" />
              <Card>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                  <div style={{ gridColumn:"1/-1" }}><Lbl c="COMPANY NAME"/><input style={inp2} value={company.name||""} onChange={e=>setCompany(p=>({...p,name:e.target.value}))}/></div>
                  <div style={{ gridColumn:"1/-1" }}><Lbl c="ADDRESS"/><input style={inp2} value={company.address||""} onChange={e=>setCompany(p=>({...p,address:e.target.value}))}/></div>
                  <div style={{ gridColumn:"1/-1" }}><Lbl c="SERVICES TAGLINE"/><input style={inp2} value={company.services||""} onChange={e=>setCompany(p=>({...p,services:e.target.value}))}/></div>
                  <div><Lbl c="PHONE"/><input style={inp2} value={company.phone||""} onChange={e=>setCompany(p=>({...p,phone:e.target.value}))}/></div>
                  <div><Lbl c="EMAIL"/><input style={inp2} value={company.email||""} onChange={e=>setCompany(p=>({...p,email:e.target.value}))}/></div>
                  <div style={{ gridColumn:"1/-1" }}><Lbl c="WEBSITE"/><input style={inp2} value={company.website||""} onChange={e=>setCompany(p=>({...p,website:e.target.value}))}/></div>
                </div>
                <button style={mkBtn("primary")} onClick={saveCompany}>Save Company Profile</button>
              </Card>
            </div>
          )}

          {/* ── PIPELINE SETTINGS ── */}
          {tab === "pipeline" && (
            <div>
              <Sec c="Pipeline Settings" />
              <Card style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, color:C.txtS, marginBottom:16, lineHeight:1.6 }}>
                  Age thresholds control when warning (🟡) and overdue/stale (🔴) badges appear
                  on RFQs and submitted quotes. Changes take effect immediately across the app.
                </div>

                <div style={{ marginBottom:18 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:C.acc, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${C.bdr}` }}>
                    📋 RFQ Supervision (Requests tab)
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 20px" }}>
                    <div>
                      <Lbl c="WARNING BADGE — days without a quote" />
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <input type="number" min="1" max="30" style={{ ...inp2, width:80 }}
                          value={pipelineSettings.rfq_warn_days}
                          onChange={e => setPipelineSettings(p => ({ ...p, rfq_warn_days: e.target.value }))}/>
                        <span style={{ fontSize:11, color:C.txtS }}>days → 🟡 yellow badge</span>
                      </div>
                    </div>
                    <div>
                      <Lbl c="OVERDUE BADGE — days without a quote" />
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <input type="number" min="1" max="90" style={{ ...inp2, width:80 }}
                          value={pipelineSettings.rfq_overdue_days}
                          onChange={e => setPipelineSettings(p => ({ ...p, rfq_overdue_days: e.target.value }))}/>
                        <span style={{ fontSize:11, color:C.txtS }}>days → 🔴 red badge, floats to top</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom:18 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:C.acc, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${C.bdr}` }}>
                    📄 Quote Follow-Up Supervision (Quotes tab)
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 20px" }}>
                    <div>
                      <Lbl c="FOLLOW-UP WARNING — days since submission" />
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <input type="number" min="1" max="30" style={{ ...inp2, width:80 }}
                          value={pipelineSettings.quote_warn_days}
                          onChange={e => setPipelineSettings(p => ({ ...p, quote_warn_days: e.target.value }))}/>
                        <span style={{ fontSize:11, color:C.txtS }}>days → 🟡 follow-up badge</span>
                      </div>
                    </div>
                    <div>
                      <Lbl c="STALE BADGE — days since submission" />
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <input type="number" min="1" max="90" style={{ ...inp2, width:80 }}
                          value={pipelineSettings.quote_stale_days}
                          onChange={e => setPipelineSettings(p => ({ ...p, quote_stale_days: e.target.value }))}/>
                        <span style={{ fontSize:11, color:C.txtS }}>days → 🔴 stale badge</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom:18 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:C.acc, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${C.bdr}` }}>
                    👤 Pipeline Defaults
                  </div>
                  <div style={{ maxWidth:320 }}>
                    <Lbl c="DEFAULT ESTIMATOR / PIPELINE OWNER" />
                    <input style={inp2}
                      value={pipelineSettings.pipeline_owner}
                      placeholder="e.g. Scott DeMuesy"
                      onChange={e => setPipelineSettings(p => ({ ...p, pipeline_owner: e.target.value }))}/>
                    <div style={{ fontSize:11, color:C.txtS, marginTop:4 }}>Pre-filled on new intakes. Overrideable per record.</div>
                  </div>
                </div>

                <button style={mkBtn("primary")} onClick={savePipelineSettings}>Save Pipeline Settings</button>
              </Card>

              <Card>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>Badge Preview — Current Settings</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, fontSize:12 }}>
                  {[
                    { label:"RFQ created today", days:0, type:"rfq" },
                    { label:`RFQ ${pipelineSettings.rfq_warn_days}+ days old — no quote yet`, days:Number(pipelineSettings.rfq_warn_days), type:"rfq" },
                    { label:`RFQ ${pipelineSettings.rfq_overdue_days}+ days old — overdue`, days:Number(pipelineSettings.rfq_overdue_days), type:"rfq" },
                    { label:"Quote submitted today", days:0, type:"quote" },
                    { label:`Quote ${pipelineSettings.quote_warn_days}+ days since submission`, days:Number(pipelineSettings.quote_warn_days), type:"quote" },
                    { label:`Quote ${pipelineSettings.quote_stale_days}+ days since submission`, days:Number(pipelineSettings.quote_stale_days), type:"quote" },
                  ].map((row, i) => {
                    const isRfq = row.type === "rfq";
                    const warn  = isRfq ? Number(pipelineSettings.rfq_warn_days)    : Number(pipelineSettings.quote_warn_days);
                    const crit  = isRfq ? Number(pipelineSettings.rfq_overdue_days) : Number(pipelineSettings.quote_stale_days);
                    const badge = row.days >= crit ? { bg:C.redB, cl:C.red,  label: isRfq ? "🔴 OVERDUE"    : "🔴 STALE"     }
                                : row.days >= warn ? { bg:C.yelB, cl:C.yel,  label: isRfq ? "🟡 NEEDS QUOTE": "🟡 FOLLOW UP"  }
                                :                   { bg:C.sur2,  cl:C.txtM, label: "✅ OK" };
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"7px 10px", background:C.sur2, borderRadius:5 }}>
                        <div style={{ flex:1, color:C.txtM }}>{row.label}</div>
                        <div style={{ background:badge.bg, color:badge.cl, border:`1px solid ${badge.cl}33`, padding:"2px 10px", borderRadius:4, fontSize:11, fontWeight:700 }}>
                          {badge.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* ── ADMIN TASKS ── */}
          {tab === "tasks" && (
            <div>
              <Sec c="Admin Tasks" />
              <Card style={{ marginBottom:12 }}>
                <div style={{ display:"flex", gap:8 }}>
                  <input style={{ ...inp2, flex:1 }} placeholder="Add a new task..." value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()}/>
                  <button style={mkBtn("primary")} onClick={addTask}>Add</button>
                </div>
              </Card>
              {loading ? <div style={{ color:C.txtS }}>Loading...</div> : tasks.length === 0 ? <div style={{ color:C.txtS, padding:20, textAlign:"center" }}>No tasks yet.</div> : (
                tasks.map(t => (
                  <div key={t.id} style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"10px 14px", marginBottom:8, display:"flex", alignItems:"flex-start", gap:10 }}>
                    <input type="checkbox" checked={!!t.done} onChange={()=>toggleTask(t)} style={{ marginTop:3, cursor:"pointer" }}/>
                    <div style={{ flex:1, textDecoration: t.done ? "line-through" : "none", color: t.done ? C.txtS : C.txt, fontSize:13 }}>{t.text}</div>
                    <div style={{ fontSize:11, color:C.txtS, whiteSpace:"nowrap" }}>{t.created_by}</div>
                    <button onClick={()=>deleteTask(t.id)} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:16, padding:"0 3px" }}>×</button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── DATABASE MAINTENANCE ── */}
          {tab === "database" && (
            <div>
              <Sec c="Database Maintenance" />
              <Card style={{ marginBottom:12 }}>
                <div style={{ fontWeight:700, marginBottom:10, fontSize:13 }}>Table Row Counts</div>
                {loading ? <div style={{ color:C.txtS }}>Loading...</div> : (
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr style={{ borderBottom:`2px solid ${C.bdr}` }}>
                      <th style={{ textAlign:"left", padding:"5px 10px", fontSize:11, color:C.txtS, textTransform:"uppercase" }}>Table</th>
                      <th style={{ textAlign:"right", padding:"5px 10px", fontSize:11, color:C.txtS, textTransform:"uppercase" }}>Rows</th>
                    </tr></thead>
                    <tbody>
                      {tables.map(t => (
                        <tr key={t.name} style={{ borderBottom:`1px solid ${C.bdr}` }}>
                          <td style={{ padding:"7px 10px", fontFamily:"monospace", fontSize:13 }}>{t.name}</td>
                          <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700, color: t.count > 0 ? C.grn : C.txtS }}>{t.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
              <Card>
                <div style={{ fontWeight:700, marginBottom:6, fontSize:13 }}>Server Info</div>
                <div style={{ fontSize:12, color:C.txtM, lineHeight:2 }}>
                  <div>Platform: DigitalOcean Ubuntu 24.04</div>
                  <div>Database: MySQL 8.0 — rigpro3</div>
                  <div>Node: Express API on port 3001</div>
                  <div>Process Manager: PM2</div>
                </div>
              </Card>
            </div>
          )}

          {/* ── DATA BROWSER ── */}
          {tab === "browser" && (
            <div>
              <Sec c="Global Data Browser" />
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
                {ALLOWED_TABLES_BROWSER.map(t => (
                  <button key={t} onClick={()=>browseTableData(t)} style={{ ...mkBtn(browseTable===t?"primary":"outline"), fontSize:12, padding:"5px 12px" }}>{t}</button>
                ))}
              </div>
              {browseTable && (
                <div>
                  <div style={{ fontWeight:700, marginBottom:8, color:C.acc }}>{browseTable} <span style={{ fontWeight:400, color:C.txtS, fontSize:12 }}>({browseRows.length} rows)</span></div>
                  {browseRows.length === 0 ? <div style={{ color:C.txtS }}>No data.</div> : (
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:600 }}>
                        <thead><tr style={{ borderBottom:`2px solid ${C.bdr}`, background:C.sur }}>
                          {Object.keys(browseRows[0]).map(k => <th key={k} style={{ textAlign:"left", padding:"5px 8px", color:C.txtS, fontWeight:700, textTransform:"uppercase", fontSize:10, whiteSpace:"nowrap" }}>{k}</th>)}
                        </tr></thead>
                        <tbody>
                          {browseRows.map((row, i) => (
                            <tr key={i} style={{ borderBottom:`1px solid ${C.bdr}` }}>
                              {Object.values(row).map((v, j) => (
                                <td key={j} style={{ padding:"5px 8px", color:C.txt, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                  {v === null ? <span style={{ color:C.txtS }}>null</span> : String(v).length > 60 ? String(v).slice(0,60)+"…" : String(v)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {!browseTable && <div style={{ color:C.txtS, padding:20, textAlign:"center" }}>Select a table above to browse its data.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── JOBS PAGE ─────────────────────────────────────────────────────────────────

// ── JOB GANTT CHART ─────────────────────────────────────────────────────────
const JOB_DAY_MS = 86400000;
const jAddDays = (dateStr, n) => {
  if (!dateStr) return "";
  const d = new Date(dateStr); d.setDate(d.getDate()+n);
  return d.toISOString().slice(0,10);
};
const jDaysBetween = (a,b) => {
  if(!a||!b) return 0;
  return Math.max(0, Math.round((new Date(b)-new Date(a))/JOB_DAY_MS));
};
const jFmtDate = s => {
  if(!s) return "";
  return new Date(s).toLocaleDateString("en-US",{month:"short",day:"numeric"});
};
const jIsWeekend = s => { if(!s) return false; const d=new Date(s); return d.getDay()===0||d.getDay()===6; };

function JobGantt({ job, eqMap, onUpdateDates }) {
  const dragRef = useRef(null);

  // Build phases — use intake phases if available, else single bar
  const phases = useMemo(() => {
    if (job.intakeData?.splitDates && job.intakeData?.dateSegments?.length > 0) {
      return job.intakeData.dateSegments.map((seg,i) => ({
        id: seg.id||String(i),
        label: seg.label||`Phase ${i+1}`,
        startDate: seg.startDate || job.startDate || "",
        endDate:   seg.endDate   || job.compDate  || "",
        color: [C.acc,C.blue,C.grn,"#7c3aed","#0d9488"][i%5],
        bg:    [C.accL,C.bluB,C.grnB,"#2e1065","#042f2e"][i%5],
      }));
    }
    return [{
      id:"main",
      label: job.desc || "Job",
      startDate: job.startDate || "",
      endDate:   job.compDate  || "",
      color: C.grn,
      bg:    C.grnB,
    }];
  }, [job]);

  // Equipment rows from equipList
  const equipRows = useMemo(() => {
    return (job.equipList||[]).map(code => ({
      code,
      name: eqMap[code]?.name || code,
      cat:  eqMap[code]?.cat  || "Equipment",
    }));
  }, [job.equipList, eqMap]);

  // Labor rows
  const laborRows = useMemo(() => {
    return (job.laborRows||[]).filter(r => r.days > 0 || r.estDays > 0);
  }, [job.laborRows]);

  const allStarts = phases.filter(p=>p.startDate).map(p=>p.startDate);
  const allEnds   = phases.filter(p=>p.endDate).map(p=>p.endDate);

  if (!allStarts.length) return (
    <div style={{textAlign:"center",padding:"24px",color:C.txtS,fontSize:13}}>
      No dates set for this job. Edit the estimate to add start and completion dates.
    </div>
  );

  const minDate  = allStarts.reduce((a,b)=>a<b?a:b);
  const maxDate  = allEnds.length ? allEnds.reduce((a,b)=>a>b?a:b) : jAddDays(minDate,7);
  const totalDays = Math.max(jDaysBetween(minDate,maxDate)+3, 5);
  const COL_W    = Math.max(24, Math.min(52, Math.floor(740/totalDays)));
  const ROW_H    = 30;
  const LABEL_W  = 150;

  const dayHeaders = [];
  for(let i=0;i<=totalDays;i++) dayHeaders.push(jAddDays(minDate,i));
  const dateToX = date => jDaysBetween(minDate,date)*COL_W;

  // Drag handlers
  const startDrag = (phaseIdx, edge, e) => {
    e.preventDefault(); e.stopPropagation();
    const origStart = phases[phaseIdx].startDate;
    const origEnd   = phases[phaseIdx].endDate || jAddDays(phases[phaseIdx].startDate,1);
    dragRef.current = { phaseIdx, edge, startX:e.clientX, origStart, origEnd };
    const onMove = ev => {
      const dx = ev.clientX - dragRef.current.startX;
      const dd = Math.round(dx/COL_W);
      const {phaseIdx:pi,edge:eg,origStart:os,origEnd:oe} = dragRef.current;
      let ns = os, ne = oe;
      if(eg==="bar")   { ns=jAddDays(os,dd); ne=jAddDays(oe,dd); }
      else if(eg==="l"){ const t=jAddDays(os,dd); if(jDaysBetween(t,oe)>=1) ns=t; }
      else if(eg==="r"){ const t=jAddDays(oe,dd); if(jDaysBetween(os,t)>=1) ne=t; }
      if(onUpdateDates) onUpdateDates(pi, ns, ne, phases);
    };
    const onUp = () => { dragRef.current=null; window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); };
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
  };

  // Build rows
  const rows = [];
  phases.forEach((ph,pi) => {
    if(!ph.startDate) return;
    const barX = dateToX(ph.startDate);
    const barW = Math.max(COL_W, dateToX(ph.endDate||jAddDays(ph.startDate,1))-barX+COL_W);
    rows.push({type:"phase",ph,pi,barX,barW});
    laborRows.forEach(lr=>{
      const days=lr.days||lr.estDays||0;
      rows.push({type:"labor",lr,barX,barW:days*COL_W,color:ph.color});
    });
  });
  // Equipment rows are added once (not per-phase) using their own schedule dates
  equipRows.forEach(eq=>{
    if(!eq.startDate) return;
    const eqBarX = dateToX(eq.startDate);
    const eqBarW = Math.max(COL_W, dateToX(eq.endDate||jAddDays(eq.startDate,1))-eqBarX+COL_W);
    rows.push({type:"equip",eq,barX:eqBarX,barW:eqBarW,color:C.teal});
  });

  // Today marker
  const todayStr = new Date().toISOString().slice(0,10);
  const todayX   = todayStr >= minDate ? dateToX(todayStr) : null;

  return (
    <div style={{overflowX:"auto"}}>
      <div style={{display:"flex",minWidth:LABEL_W+totalDays*COL_W+20}}>
        {/* Labels */}
        <div style={{width:LABEL_W,flexShrink:0}}>
          <div style={{height:44,borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"flex-end",paddingBottom:6}}>
            <div style={{fontSize:9,color:C.txtS,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,paddingLeft:4}}>Task / Resource</div>
          </div>
          {rows.map((row,ri)=>(
            <div key={ri} style={{height:ROW_H,borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",paddingLeft:row.type==="phase"?0:12,gap:5}}>
              {row.type==="phase"&&<><div style={{width:8,height:8,borderRadius:2,background:row.ph.color,flexShrink:0}}/><div style={{fontSize:11,fontWeight:700,color:row.ph.color,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.ph.label}</div></>}
              {row.type==="labor"&&<><span style={{fontSize:10}}>👷</span><div style={{fontSize:10,color:C.txtS,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.lr.role}</div></>}
              {row.type==="equip"&&<><span style={{fontSize:10}}>🔧</span><div style={{fontSize:10,color:C.txtS,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.eq.name?.split(" ").slice(-2).join(" ")||row.eq.code}</div></>}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{flex:1,position:"relative",userSelect:"none"}}>
          {/* Day headers */}
          <div style={{height:44,display:"flex",alignItems:"flex-end",borderBottom:`1px solid ${C.bdr}`,overflow:"hidden"}}>
            {dayHeaders.map((d,di)=>{
              const dd=new Date(d); const isMon=dd.getDay()===1;
              return (
                <div key={d} style={{width:COL_W,flexShrink:0,position:"relative",borderLeft:isMon?`1px solid ${C.bdrM}`:"none"}}>
                  {(di===0||isMon)&&<div style={{fontSize:8,color:C.txtS,whiteSpace:"nowrap",position:"absolute",bottom:6,left:2,letterSpacing:.2}}>{jFmtDate(d)}</div>}
                </div>
              );
            })}
          </div>

          {/* Background grid */}
          <div style={{position:"absolute",top:44,left:0,right:0,bottom:0,pointerEvents:"none",zIndex:0}}>
            {dayHeaders.map((d,di)=>{
              const dd=new Date(d); const isMon=dd.getDay()===1; const isWe=jIsWeekend(d);
              return <div key={d} style={{position:"absolute",top:0,bottom:0,left:di*COL_W,width:COL_W,background:isWe?"rgba(184,107,10,.06)":"transparent",borderLeft:isMon?`1px solid ${C.bdr}`:"none"}}/>;
            })}
          </div>

          {/* Today line */}
          {todayX!==null&&<div style={{position:"absolute",top:44,bottom:0,left:todayX+COL_W/2,width:2,background:"#ef4444",opacity:.7,zIndex:3,pointerEvents:"none"}}><div style={{position:"absolute",top:0,left:-16,background:"#ef4444",color:"#fff",fontSize:8,padding:"1px 4px",borderRadius:2,whiteSpace:"nowrap"}}>Today</div></div>}

          {/* Rows */}
          {rows.map((row,ri)=>(
            <div key={ri} style={{height:ROW_H,borderBottom:`1px solid ${C.bdr}`,position:"relative",zIndex:1}}>
              {row.type==="phase"&&row.ph.startDate&&(
                <>
                  <div onMouseDown={e=>startDrag(row.pi,"bar",e)}
                    style={{position:"absolute",top:5,left:row.barX,width:row.barW,height:20,background:row.ph.color,borderRadius:4,opacity:.9,cursor:"grab",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:9,color:"#000",fontWeight:700,pointerEvents:"none",padding:"0 6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {jFmtDate(row.ph.startDate)}{row.ph.endDate?` → ${jFmtDate(row.ph.endDate)}`:""} · {jDaysBetween(row.ph.startDate,row.ph.endDate||jAddDays(row.ph.startDate,1))+1}d
                    </span>
                  </div>
                  <div onMouseDown={e=>startDrag(row.pi,"l",e)} style={{position:"absolute",top:5,left:row.barX,width:7,height:20,background:"rgba(0,0,0,.3)",cursor:"ew-resize",borderRadius:"4px 0 0 4px",zIndex:2}}/>
                  <div onMouseDown={e=>startDrag(row.pi,"r",e)} style={{position:"absolute",top:5,left:row.barX+row.barW-7,width:7,height:20,background:"rgba(0,0,0,.3)",cursor:"ew-resize",borderRadius:"0 4px 4px 0",zIndex:2}}/>
                </>
              )}
              {row.type==="labor"&&(
                <div style={{position:"absolute",top:7,left:row.barX,width:row.barW,height:16,background:`${row.color}44`,border:`1px solid ${row.color}`,borderRadius:3,display:"flex",alignItems:"center",paddingLeft:4}}>
                  <span style={{fontSize:8,color:row.color,fontWeight:600,whiteSpace:"nowrap"}}>{row.lr.role}</span>
                </div>
              )}
              {row.type==="equip"&&(
                <div style={{position:"absolute",top:7,left:row.barX,width:row.barW,height:16,background:`${row.color}22`,border:`1px solid ${row.color}66`,borderRadius:3,display:"flex",alignItems:"center",paddingLeft:4}}>
                  <span style={{fontSize:8,color:C.txtM,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{row.eq.name?.split(" ").slice(-2).join(" ")||row.eq.code}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:14,marginTop:8,fontSize:10,color:C.txtS,flexWrap:"wrap"}}>
        <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:20,height:8,background:C.grn,borderRadius:2}}/> Phase (drag to adjust)</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:20,height:8,background:`${C.grn}44`,border:`1px solid ${C.grn}`,borderRadius:2}}/> Labor</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:20,height:8,background:`${C.grn}22`,border:`1px solid ${C.grn}66`,borderRadius:2}}/> Equipment</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:2,height:10,background:"#ef4444"}}/> Today</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:16,height:8,background:"rgba(184,107,10,.06)"}}/> Weekend</span>
      </div>
    </div>
  );
}

function JobsPage({ quotes, reqs, setQuotes, eqMap, onOpenQuote }) {
  const [selJob,    setSelJob]    = useState(null);
  const [search,    setSearch]    = useState("");
  const [editNotes, setEditNotes] = useState(null);
  const [notesVal,  setNotesVal]  = useState("");
  const [sortBy,    setSortBy]    = useState("date_desc");

  // Build equipSchedule from a job — use existing equipSchedule or init from equipList
  function getEquipSchedule(job) {
    if (job.equipSchedule && job.equipSchedule.length > 0) return job.equipSchedule;
    return (job.equipList || []).map(code => ({
      code,
      startDate: job.startDate || "",
      endDate:   job.compDate  || job.startDate || "",
    }));
  }

  function updateEquipSchedule(code, field, value) {
    const current = getEquipSchedule(selJob);
    const updated  = current.map(e => e.code === code ? { ...e, [field]: value } : e);
    const upd = { ...selJob, equipSchedule: updated };
    setQuotes(prev => prev.map(q => q.id === selJob.id ? upd : q));
    setSelJob(upd);
  }

  // Only Won quotes = Jobs
  const jobs = useMemo(() => {
    return quotes
      .filter(q => q.status === "Won")
      .filter(q => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (q.jobNum||"").toLowerCase().includes(s) ||
               (q.client||"").toLowerCase().includes(s) ||
               (q.desc||"").toLowerCase().includes(s) ||
               (q.jobSite||"").toLowerCase().includes(s);
      })
      .sort((a, b) => {
        if (sortBy === "date_desc") return new Date(b.date||0) - new Date(a.date||0);
        if (sortBy === "date_asc")  return new Date(a.date||0) - new Date(b.date||0);
        if (sortBy === "total_desc") return (b.total||0) - (a.total||0);
        if (sortBy === "client")    return (a.client||"").localeCompare(b.client||"");
        return 0;
      });
  }, [quotes, search, sortBy]);

  // Revenue metrics — recognized on won date
  const totalRevenue  = jobs.reduce((s, q) => s + (q.total||0), 0);
  const activeJobs    = jobs.filter(q => q.startDate && new Date(q.startDate) >= new Date(new Date().toISOString().slice(0,10)));
  const jobsThisYear  = jobs.filter(q => (q.date||"").startsWith(new Date().getFullYear().toString()));

  // Find linked RFQ for a job
  const getRfq = (job) => job.fromReqId ? reqs.find(r => r.id === job.fromReqId) : null;

  function saveNotes(jobId) {
    setQuotes(prev => prev.map(q => q.id === jobId ? { ...q, notes: notesVal } : q));
    // Persist to server
    const job = quotes.find(q => q.id === jobId);
    if (job) {
      fetch(`/api/quotes/${jobId}`, {
        method: "POST",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${localStorage.getItem("rigpro_token")||""}` },
        body: JSON.stringify({ ...job, notes: notesVal }),
      }).catch(e => console.warn("Save notes error:", e));
    }
    setEditNotes(null);
  }

  const inp2 = { background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:6, padding:"7px 10px", color:C.txt, fontSize:13, fontFamily:"inherit", outline:"none" };

  // ── JOB FOLDER DETAIL VIEW ────────────────────────────────────
  if (selJob) {
    const rfq = getRfq(selJob);
    const adjTotal = (selJob.salesAdjustments||[]).reduce((s,a)=>s+a.amount,0);
    const netTotal = (selJob.total||0) + adjTotal;
    const changeOrders = quotes.filter(q => q.isChangeOrder && q.parentId === selJob.id);

    return (
      <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
        <div style={{ background:C.sur, borderBottom:`1px solid ${C.bdr}`, padding:"10px 20px", display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:10 }}>
          <button style={{ ...mkBtn("ghost"), fontSize:12 }} onClick={()=>setSelJob(null)}>← Jobs</button>
          <span style={{ fontWeight:700, fontSize:16 }}>Job Folder</span>
          <span style={{ background:C.grnB, color:C.grn, border:`1px solid ${C.grnBdr}`, borderRadius:4, padding:"2px 10px", fontSize:12, fontWeight:700 }}>
            {selJob.jobNum || "No Job #"}
          </span>
          <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
            <button style={{ ...mkBtn("outline"), fontSize:12 }} onClick={()=>onOpenQuote(selJob)}>✏️ Edit Estimate</button>
          </div>
        </div>

        <div style={{ maxWidth:960, margin:"0 auto", padding:"20px 16px" }}>

          {/* ── JOB HEADER ── */}
          <Card style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
              <div>
                <div style={{ fontSize:20, fontWeight:800, color:C.acc, marginBottom:4 }}>{selJob.client}</div>
                <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>{selJob.desc}</div>
                <div style={{ fontSize:13, color:C.txtM }}>{selJob.jobSite}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:24, fontWeight:800, color:C.grn }}>{fmt(netTotal)}</div>
                <div style={{ fontSize:11, color:C.txtS }}>Net Contract Value</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10, marginTop:14, paddingTop:14, borderTop:`1px solid ${C.bdr}` }}>
              {[
                ["Job Number",    selJob.jobNum     || "—"],
                ["Quote #",       selJob.qn         || "—"],
                ["Sales Assoc.",  selJob.salesAssoc || "—"],
                ["Type",          selJob.qtype      || "—"],
                ["Won Date",      selJob.date       || "—"],
                ["Start Date",    selJob.startDate  || "—"],
                ["Comp. Date",    selJob.compDate   || "—"],
                ["Duration",      selJob.startDate && selJob.compDate
                  ? Math.round((new Date(selJob.compDate)-new Date(selJob.startDate))/86400000)+1+" day(s)"
                  : "—"],
              ].map(([k,v]) => (
                <div key={k}>
                  <div style={{ fontSize:10, color:C.txtS, textTransform:"uppercase", letterSpacing:.5, marginBottom:2 }}>{k}</div>
                  <div style={{ fontWeight:600, fontSize:13 }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>

            {/* ── RFQ INFO ── */}
            <Card>
              <Sec c="📋 Original Request (RFQ)"/>
              {rfq ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <div>
                    <div style={{ fontSize:10, color:C.txtS, textTransform:"uppercase", letterSpacing:.5 }}>Request #</div>
                    <div style={{ fontWeight:700, color:C.acc }}>{rfq.rn}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:C.txtS, textTransform:"uppercase", letterSpacing:.5 }}>Requester</div>
                    <div style={{ fontWeight:600 }}>{rfq.requester || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:C.txtS, textTransform:"uppercase", letterSpacing:.5 }}>Contact</div>
                    <div style={{ fontSize:12, color:C.txtM }}>{rfq.email || "—"}</div>
                    <div style={{ fontSize:12, color:C.txtM }}>{rfq.phone || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:C.txtS, textTransform:"uppercase", letterSpacing:.5 }}>Job Site</div>
                    <div style={{ fontSize:12 }}>{rfq.jobSite || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:C.txtS, textTransform:"uppercase", letterSpacing:.5 }}>Request Description</div>
                    <div style={{ fontSize:12, color:C.txtM, lineHeight:1.5 }}>{rfq.desc || "—"}</div>
                  </div>
                  {rfq.notes && <div>
                    <div style={{ fontSize:10, color:C.txtS, textTransform:"uppercase", letterSpacing:.5 }}>RFQ Notes</div>
                    <div style={{ fontSize:12, color:C.txtM }}>{rfq.notes}</div>
                  </div>}
                  <div>
                    <div style={{ fontSize:10, color:C.txtS, textTransform:"uppercase", letterSpacing:.5 }}>Date Received</div>
                    <div style={{ fontSize:12 }}>{rfq.date || "—"}</div>
                  </div>
                </div>
              ) : (
                <div style={{ color:C.txtS, fontSize:13, fontStyle:"italic" }}>
                  {selJob.contactName ? (
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      <div><span style={{ fontSize:10, color:C.txtS, textTransform:"uppercase" }}>Contact</span><br/><span style={{ fontWeight:600 }}>{selJob.contactName}</span></div>
                      <div style={{ fontSize:12, color:C.txtM }}>{selJob.contactEmail}</div>
                      <div style={{ fontSize:12, color:C.txtM }}>{selJob.contactPhone}</div>
                    </div>
                  ) : "No RFQ linked to this job."}
                </div>
              )}
            </Card>

            {/* ── COST SUMMARY ── */}
            <Card>
              <Sec c="💰 Cost Summary"/>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {[
                  ["Labor",    selJob.labor],
                  ["Equipment",selJob.equip],
                  ["Hauling",  selJob.hauling],
                  ["Travel",   selJob.travel],
                  ["Materials",selJob.mats],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:`1px solid ${C.bdr}` }}>
                    <span style={{ color:C.txtM, fontSize:13 }}>{k}</span>
                    <span style={{ fontWeight:600 }}>{fmt(v)}</span>
                  </div>
                ))}
                {selJob.markup > 0 && (
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:`1px solid ${C.bdr}` }}>
                    <span style={{ color:C.txtM, fontSize:13 }}>Markup ({Math.round((selJob.markup||0)*100)}%)</span>
                    <span style={{ fontWeight:600 }}>{fmt((selJob.labor+selJob.equip+selJob.hauling+selJob.travel+selJob.mats)*(selJob.markup||0))}</span>
                  </div>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", marginTop:4 }}>
                  <span style={{ fontWeight:700 }}>Base Total</span>
                  <span style={{ fontWeight:700, color:C.blue }}>{fmt(selJob.total)}</span>
                </div>
                {(selJob.salesAdjustments||[]).map(a => (
                  <div key={a.id} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", borderTop:`1px dashed ${C.bdr}` }}>
                    <span style={{ fontSize:12, color: a.amount >= 0 ? C.grn : C.red }}>{a.reason}</span>
                    <span style={{ fontSize:12, fontWeight:600, color: a.amount >= 0 ? C.grn : C.red }}>{a.amount >= 0 ? "+" : ""}{fmt(a.amount)}</span>
                  </div>
                ))}
                {adjTotal !== 0 && (
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderTop:`2px solid ${C.bdr}`, marginTop:4 }}>
                    <span style={{ fontWeight:800, fontSize:15 }}>Net Total</span>
                    <span style={{ fontWeight:800, fontSize:15, color:C.grn }}>{fmt(netTotal)}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ── EQUIPMENT SCHEDULE ── */}
          {(selJob.equipList||[]).length > 0 && (
            <Card style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <Sec c="🏗️ Equipment Schedule"/>
                <div style={{ fontSize:11, color:C.txtS }}>Set exact dates each piece is on-site</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {getEquipSchedule(selJob).map(eq => {
                  const e = eqMap[eq.code];
                  const days = eq.startDate && eq.endDate
                    ? Math.round((new Date(eq.endDate) - new Date(eq.startDate)) / 86400000) + 1
                    : null;
                  // Conflict check — does this equipment overlap with another job on these dates?
                  const hasConflict = eq.startDate && eq.endDate && quotes
                    .filter(q => q.id !== selJob.id && q.startDate && (q.status==="Won"||q.status==="Submitted"))
                    .some(q => {
                      const otherSched = (q.equipSchedule||[]).find(s=>s.code===eq.code)
                        || (q.equipList||[]).includes(eq.code) ? { startDate:q.startDate, endDate:q.compDate||q.startDate } : null;
                      if (!otherSched?.startDate) return false;
                      return new Date(eq.startDate) <= new Date(otherSched.endDate||otherSched.startDate)
                          && new Date(eq.endDate)   >= new Date(otherSched.startDate);
                    });
                  return (
                    <div key={eq.code} style={{
                      background: hasConflict ? C.redB : C.sur2,
                      border: `1px solid ${hasConflict ? C.red : C.bdr}`,
                      borderRadius: 7, padding: "10px 14px",
                    }}>
                      <div style={{ display:"flex", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                        {/* Equipment info */}
                        <div style={{ minWidth:160, flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:13, color: hasConflict ? C.red : C.blue }}>
                            {hasConflict && "⚠ "}{e ? e.name : eq.code}
                          </div>
                          <div style={{ fontSize:11, color:C.txtS, marginTop:2 }}>
                            {e ? `${e.cat} · ${fmt(e.daily)}/day` : eq.code}
                            {days && <span style={{ marginLeft:8, color: hasConflict ? C.red : C.acc, fontWeight:600 }}>
                              {days} day{days!==1?"s":""} on-site
                              {days > 0 && e?.daily ? ` · ${fmt(days * e.daily)}` : ""}
                            </span>}
                          </div>
                          {hasConflict && (
                            <div style={{ fontSize:10, color:C.red, marginTop:3, fontWeight:600 }}>
                              ⚠ Double-booked — conflicts with another scheduled job
                            </div>
                          )}
                        </div>
                        {/* Date inputs */}
                        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                          <div>
                            <div style={{ fontSize:10, color:C.txtS, textTransform:"uppercase", letterSpacing:.5, marginBottom:3 }}>On Site</div>
                            <input type="date"
                              style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:5,
                                       padding:"5px 8px", color:C.txt, fontSize:12, fontFamily:"inherit", outline:"none" }}
                              value={eq.startDate || ""}
                              onChange={e => updateEquipSchedule(eq.code, "startDate", e.target.value)}/>
                          </div>
                          <div style={{ color:C.txtS, fontSize:14, paddingTop:16 }}>→</div>
                          <div>
                            <div style={{ fontSize:10, color:C.txtS, textTransform:"uppercase", letterSpacing:.5, marginBottom:3 }}>Off Site</div>
                            <input type="date"
                              style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:5,
                                       padding:"5px 8px", color:C.txt, fontSize:12, fontFamily:"inherit", outline:"none" }}
                              value={eq.endDate || ""}
                              onChange={e => updateEquipSchedule(eq.code, "endDate", e.target.value)}/>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize:11, color:C.txtS, marginTop:10, fontStyle:"italic" }}>
                Dates here feed the project Gantt and equipment conflict detection on the Calendar.
              </div>
            </Card>
          )}

          {/* ── CHANGE ORDERS ── */}
          {changeOrders.length > 0 && (
            <Card style={{ marginBottom:16 }}>
              <Sec c="📝 Change Orders"/>
              {changeOrders.map(co => (
                <div key={co.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.bdr}` }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13 }}>{co.qn} <span style={{ color:C.ora, fontSize:11 }}>Change Order</span></div>
                    <div style={{ fontSize:12, color:C.txtM }}>{co.desc}</div>
                  </div>
                  <div style={{ fontWeight:700, color:C.blue }}>{fmt(co.total)}</div>
                </div>
              ))}
            </Card>
          )}

          {/* ── PROJECT GANTT ── */}
          <Card style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <Sec c="📊 Project Schedule"/>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <div style={{ fontSize:11, color:C.txtS }}>Drag bars to adjust dates</div>
              </div>
            </div>
            <JobGantt
              job={selJob}
              eqMap={eqMap}
              onUpdateDates={(phaseIdx, newStart, newEnd, phases) => {
                // Single phase job — update startDate/compDate directly
                if (phases.length === 1) {
                  const upd = { ...selJob, startDate: newStart, compDate: newEnd };
                  setQuotes(prev => prev.map(q => q.id===selJob.id ? upd : q));
                  setSelJob(upd);
                }
                // Multi-phase — update intakeData dateSegments
                else if (selJob.intakeData?.dateSegments) {
                  const segs = selJob.intakeData.dateSegments.map((s,i) =>
                    i===phaseIdx ? {...s, startDate:newStart, endDate:newEnd} : s
                  );
                  const upd = { ...selJob, intakeData: {...selJob.intakeData, dateSegments:segs},
                    startDate: segs[0]?.startDate || selJob.startDate,
                    compDate:  segs[segs.length-1]?.endDate || selJob.compDate,
                  };
                  setQuotes(prev => prev.map(q => q.id===selJob.id ? upd : q));
                  setSelJob(upd);
                }
              }}
            />
            {/* Quick date edit */}
            <div style={{ display:"flex", gap:16, marginTop:14, paddingTop:12, borderTop:`1px solid ${C.bdr}`, flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:10, color:C.txtS, textTransform:"uppercase", letterSpacing:.5, marginBottom:4 }}>Start Date</div>
                <input type="date" style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:5, padding:"5px 8px", color:C.txt, fontSize:12, fontFamily:"inherit", outline:"none" }}
                  value={selJob.startDate||""}
                  onChange={e => {
                    const upd = {...selJob, startDate:e.target.value};
                    setQuotes(prev=>prev.map(q=>q.id===selJob.id?upd:q));
                    setSelJob(upd);
                  }}/>
              </div>
              <div>
                <div style={{ fontSize:10, color:C.txtS, textTransform:"uppercase", letterSpacing:.5, marginBottom:4 }}>Completion Date</div>
                <input type="date" style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:5, padding:"5px 8px", color:C.txt, fontSize:12, fontFamily:"inherit", outline:"none" }}
                  value={selJob.compDate||""}
                  onChange={e => {
                    const upd = {...selJob, compDate:e.target.value};
                    setQuotes(prev=>prev.map(q=>q.id===selJob.id?upd:q));
                    setSelJob(upd);
                  }}/>
              </div>
              {selJob.startDate && selJob.compDate && (
                <div style={{ display:"flex", alignItems:"flex-end" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.acc }}>
                    {jDaysBetween(selJob.startDate, selJob.compDate)+1} day{jDaysBetween(selJob.startDate,selJob.compDate)>0?"s":""} scheduled
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* ── NOTES ── */}
          <Card style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <Sec c="📌 Job Notes"/>
              {editNotes !== selJob.id
                ? <button style={{ ...mkBtn("outline"), fontSize:11, padding:"3px 10px" }} onClick={()=>{ setEditNotes(selJob.id); setNotesVal(selJob.notes||""); }}>Edit</button>
                : <div style={{ display:"flex", gap:6 }}>
                    <button style={{ ...mkBtn("primary"), fontSize:11, padding:"3px 10px" }} onClick={()=>saveNotes(selJob.id)}>Save</button>
                    <button style={{ ...mkBtn("ghost"), fontSize:11, padding:"3px 10px" }} onClick={()=>setEditNotes(null)}>Cancel</button>
                  </div>
              }
            </div>
            {editNotes === selJob.id
              ? <textarea style={{ ...inp2, width:"100%", minHeight:100, resize:"vertical", boxSizing:"border-box" }} value={notesVal} onChange={e=>setNotesVal(e.target.value)} autoFocus/>
              : <div style={{ fontSize:13, color: selJob.notes ? C.txt : C.txtS, fontStyle: selJob.notes ? "normal" : "italic", lineHeight:1.6, whiteSpace:"pre-wrap" }}>
                  {selJob.notes || "No notes for this job yet."}
                </div>
            }
          </Card>

          {/* ── ATTACHMENTS ── */}
          {(selJob.attachments||[]).length > 0 && (
            <Card>
              <Sec c="📎 Attachments"/>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {(selJob.attachments||[]).map((a,i) => (
                  <div key={i} style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:6, padding:"6px 12px", fontSize:12, color:C.blue }}>
                    📄 {a.name}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ── JOBS LIST VIEW ────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      <div style={{ background:C.sur, borderBottom:`1px solid ${C.bdr}`, padding:"10px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontWeight:700, fontSize:16 }}>📁 Job Folders</span>
        <span style={{ fontSize:12, color:C.txtS }}>{jobs.length} jobs · {fmt(totalRevenue)} total sales</span>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"16px" }}>

        {/* ── REVENUE SUMMARY CARDS ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12, marginBottom:20 }}>
          {[
            { label:"Total Sales Revenue", value:fmt(totalRevenue), sub:`${jobs.length} won jobs`, color:C.grn },
            { label:"Sales This Year",     value:fmt(jobsThisYear.reduce((s,q)=>s+(q.total||0),0)), sub:`${jobsThisYear.length} jobs in ${new Date().getFullYear()}`, color:C.blue },
            { label:"Upcoming Jobs",       value:activeJobs.length, sub:"scheduled start dates", color:C.ora },
            { label:"Avg Job Value",       value:jobs.length ? fmt(totalRevenue/jobs.length) : "$0", sub:"per won job", color:C.acc },
          ].map(x => (
            <Card key={x.label}>
              <div style={{ fontSize:11, color:C.txtS, textTransform:"uppercase", letterSpacing:.5, marginBottom:4 }}>{x.label}</div>
              <div style={{ fontSize:22, fontWeight:800, color:x.color }}>{x.value}</div>
              <div style={{ fontSize:11, color:C.txtS, marginTop:2 }}>{x.sub}</div>
            </Card>
          ))}
        </div>

        {/* ── SEARCH + SORT ── */}
        <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
          <input style={{ flex:1, minWidth:200, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:7, padding:"8px 12px", color:C.txt, fontSize:13, fontFamily:"inherit", outline:"none" }}
            placeholder="Search jobs by number, client, description..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <select style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:7, padding:"8px 12px", color:C.txt, fontSize:13, fontFamily:"inherit", cursor:"pointer", outline:"none" }}
            value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="total_desc">Highest Value</option>
            <option value="client">Client A–Z</option>
          </select>
        </div>

        {/* ── UPCOMING SCHEDULE TIMELINE ── */}
        {(() => {
          const upcoming = jobs.filter(j=>j.startDate).sort((a,b)=>new Date(a.startDate)-new Date(b.startDate));
          if(!upcoming.length) return null;
          const minD = upcoming[0].startDate;
          const maxD = upcoming.reduce((m,j)=>(!m||j.compDate>m)?j.compDate||j.startDate:m,"");
          const span = Math.max(jDaysBetween(minD,maxD)+7,30);
          const todayS = new Date().toISOString().slice(0,10);
          return (
            <Card style={{marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>📅 Upcoming Schedule</span>
                <span style={{fontSize:11,color:C.txtS}}>{upcoming.length} job{upcoming.length>1?"s":""} with dates</span>
              </div>
              <div style={{overflowX:"auto"}}>
                <div style={{position:"relative",minWidth:600}}>
                  {/* Mini bars */}
                  {upcoming.map((j,i)=>{
                    const leftPct = (jDaysBetween(minD,j.startDate)/span)*100;
                    const widPct  = Math.max(1, (jDaysBetween(j.startDate,j.compDate||j.startDate)+1)/span*100);
                    const colors  = [C.grn,C.blue,C.acc,C.teal,"#7c3aed"];
                    const color   = colors[i%colors.length];
                    return (
                      <div key={j.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <div style={{width:140,flexShrink:0,fontSize:11,color:C.txtM,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.client}</div>
                        <div style={{flex:1,position:"relative",height:20,background:C.sur2,borderRadius:3}}>
                          <div style={{position:"absolute",left:`${leftPct}%`,width:`${widPct}%`,top:2,bottom:2,background:color,borderRadius:3,minWidth:4,display:"flex",alignItems:"center",paddingLeft:4,overflow:"hidden"}}>
                            <span style={{fontSize:8,color:"#000",fontWeight:700,whiteSpace:"nowrap"}}>{j.jobNum||j.qn}</span>
                          </div>
                          {/* Today line */}
                          {todayS>=minD&&todayS<=jAddDays(minD,span)&&(
                            <div style={{position:"absolute",left:`${(jDaysBetween(minD,todayS)/span)*100}%`,top:0,bottom:0,width:1,background:"#ef4444",opacity:.7}}/>
                          )}
                        </div>
                        <div style={{width:70,flexShrink:0,fontSize:10,color:C.txtS,textAlign:"right"}}>{jFmtDate(j.startDate)}</div>
                      </div>
                    );
                  })}
                  {/* Date labels */}
                  <div style={{display:"flex",justifyContent:"space-between",paddingLeft:148,marginTop:4,fontSize:9,color:C.txtS}}>
                    <span>{jFmtDate(minD)}</span>
                    <span>{jFmtDate(jAddDays(minD,Math.floor(span/2)))}</span>
                    <span>{jFmtDate(jAddDays(minD,span))}</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })()}

        {/* ── JOBS TABLE ── */}
        {jobs.length === 0 ? (
          <Card><div style={{ textAlign:"center", color:C.txtS, padding:40 }}>No won jobs yet. Mark a quote as Won to create a job folder.</div></Card>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {jobs.map(job => {
              const rfq = getRfq(job);
              const adjTotal = (job.salesAdjustments||[]).reduce((s,a)=>s+a.amount,0);
              const netTotal = (job.total||0) + adjTotal;
              return (
                <div key={job.id} onClick={()=>setSelJob(job)} style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:9, padding:"14px 18px", cursor:"pointer", transition:"box-shadow .15s" }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 3px 12px rgba(0,0,0,.08)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                        <span style={{ background:C.grnB, color:C.grn, border:`1px solid ${C.grnBdr}`, borderRadius:4, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{job.jobNum || "No Job #"}</span>
                        <span style={{ fontSize:11, color:C.txtS }}>{job.qn}</span>
                        {rfq && <span style={{ background:C.bluB, color:C.blue, border:`1px solid ${C.bluBdr}`, borderRadius:4, padding:"1px 6px", fontSize:10, fontWeight:600 }}>RFQ: {rfq.rn}</span>}
                      </div>
                      <div style={{ fontWeight:700, fontSize:15, marginBottom:2 }}>{job.client}</div>
                      <div style={{ fontSize:13, color:C.txtM, marginBottom:4 }}>{job.desc}</div>
                      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                        <span style={{ fontSize:11, color:C.txtS }}>📍 {job.jobSite || "—"}</span>
                        <span style={{ fontSize:11, color:C.txtS }}>👤 {job.salesAssoc || "—"}</span>
                        <span style={{ fontSize:11, color:C.txtS }}>📅 Won: {job.date || "—"}</span>
                        {job.startDate && <span style={{ fontSize:11, color:C.ora }}>🔧 Start: {job.startDate}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:20, fontWeight:800, color:C.grn }}>{fmt(netTotal)}</div>
                      <div style={{ fontSize:11, color:C.txtS }}>{job.qtype}</div>
                      {(job.equipList||[]).length > 0 && <div style={{ fontSize:11, color:C.txtS, marginTop:2 }}>{(job.equipList||[]).length} equipment pieces</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const ALLOWED_TABLES_BROWSER = ['users','customers','customer_contacts','customer_locations','equipment','rfqs','quotes','customer_rates','company_profile','admin_tasks','pipeline_settings','intakes','machine_history'];

// ── MAIN APP ──────────────────────────────────────────────────────────────────

// ── DARK THEME — RigPro3 DNA ──────────────────────────────────────────────────
const IC = {
  bg:"#111827", sur:"#1f2937", sur2:"#18202e", bdr:"#374151", bdrM:"#4b5563",
  txt:"#f9fafb", txtM:"#d1d5db", txtS:"#9ca3af",
  acc:"#b86b0a", accL:"#451a03", accB:"#f5a623",
  blue:"#3b82f6", bluB:"#1e3a5f",
  grn:"#22c55e",  grnB:"#14532d",
  red:"#ef4444",  redB:"#450a0a",
  yel:"#f59e0b",  yelB:"#451a03",
  purp:"#a78bfa", purpB:"#2e1065",
  teal:"#2dd4bf", tealB:"#042f2e",
};

const I_PHASE_COLORS = [IC.accB, IC.blue, IC.grn, IC.purp, IC.teal, IC.yel];
const I_PHASE_BG     = [IC.accL, IC.bluB, IC.grnB, IC.purpB, IC.tealB, IC.yelB];

const I_EQUIPMENT = [
  { code:"242",    cat:"Forklift",    name:"2000 Gradall 534D-9",                   cap:"9,000 lb"   },
  { code:"300",    cat:"Forklift",    name:"Caterpillar GC35K",                     cap:"15,500 lb"  },
  { code:"301",    cat:"Forklift",    name:"Hyster S80XLBCS",                       cap:"8,000 lb"   },
  { code:"302",    cat:"Forklift",    name:"Cat 125D 12,500 lb",                    cap:"12,500 lb"  },
  { code:"308",    cat:"Forklift",    name:"Cat T150D 15,000 lb",                   cap:"15,000 lb"  },
  { code:"320",    cat:"Forklift",    name:"Royal T300B 30,000 lb",                 cap:"30,000 lb"  },
  { code:"322",    cat:"Forklift",    name:"Rigger's Special 80–100k",              cap:"100,000 lb" },
  { code:"237",    cat:"Aerial Lift", name:"Skyjack SJ3226",                        cap:"–"          },
  { code:"251",    cat:"Aerial Lift", name:"JLG 450AJ Lift",                        cap:"–"          },
  { code:"254",    cat:"Aerial Lift", name:"JLG 600S Boom",                         cap:"–"          },
  { code:"255",    cat:"Aerial Lift", name:"2013 Skyjack SJ4632",                   cap:"–"          },
  { code:"259",    cat:"Aerial Lift", name:"2015 Skyjack SJ3219",                   cap:"–"          },
  { code:"250",    cat:"Crane",       name:"Broderson IC-200-3F 30-Ton",            cap:"30,000 lb"  },
  { code:"257",    cat:"Crane",       name:"Broderson IC80-2D 17,000 lb",           cap:"17,000 lb"  },
  { code:"RP8x10", cat:"Road Plates", name:"8'×10' Steel Road Plates",              cap:"–"          },
  { code:"RP4x10", cat:"Road Plates", name:"4'×10' Steel Road Plates",              cap:"–"          },
  { code:"RP8x12", cat:"Road Plates", name:"8'×12' Steel Road Plates",              cap:"–"          },
  { code:"RP8x20", cat:"Road Plates", name:"8'×20' Steel Road Plates",              cap:"–"          },
  { code:"GANG",   cat:"Tools",       name:"Gang Box Charge",                        cap:"–"          },
  { code:"CONEX",  cat:"Tools",       name:"Conex Job Trailer",                      cap:"–"          },
  { code:"TORCH",  cat:"Tools",       name:"Torch Outfit",                           cap:"–"          },
  { code:"100D",   cat:"Truck",       name:"2007 Inter 9200 Tractor",               cap:"–"          },
  { code:"110D",   cat:"Truck",       name:"2008 Landall Trailer",                  cap:"–"          },
  { code:"111D",   cat:"Truck",       name:"1999 Fontaine Flatbed",                 cap:"–"          },
  { code:"SEMI",   cat:"Truck",       name:"Semi Truck and Trailer",                cap:"–"          },
  { code:"CONE",   cat:"Truck",       name:"Semi Truck and Conestoga",              cap:"–"          },
  { code:"PICK",   cat:"Truck",       name:"Pickup Truck",                          cap:"–"          },
];
const I_EQ_CATS = [...new Set(I_EQUIPMENT.map(e => e.cat))];
const I_EQ_MAP  = Object.fromEntries(I_EQUIPMENT.map(e => [e.code, e]));

const I_LABOR_ROLES   = ["Foreman","Rigger","Labor","Operator","CDL Driver"];
const I_WEIGHT_SOURCES = ["Estimated","Nameplate","Engineering Drawing","Engineer Stamped","Scale Verified"];
const I_SCOPE_OPTIONS  = [
  "Pick & Set","Machinery Moving","Transport","Tandem Lift",
  "Below-Hook Rigging Only","Skidding / Rolling","Multi-Lift Project","Removal / Demo",
  "Steel Road Plates","Out-of-Town",
];
const I_CUSTOMERS = [
  "Apex Industrial LLC","Beacon Manufacturing Co.","Cornerstone Plastics Inc.",
  "Delta Fabrication Group","Eagle Press & Die","Frontier Castings Ltd.",
  "Great Lakes Stamping","Harmon Tool & Die","Iron Valley Forge",
  "Junction Steel Works","Keystone Die Casting","Landmark Tooling Inc.",
  "Meridian Extrusion Co.","Northgate Aluminum","Pinnacle Forge & Stamp",
  "Summit Plastics Group","Titan Manufacturing LLC",
];
const CUSTOMER_LOCATIONS = {
  "Apex Industrial LLC":       ["1200 Industrial Pkwy, Akron, OH 44312","4500 West Ave, Akron, OH 44303"],
  "Beacon Manufacturing Co.":  ["500 Commerce Blvd, Dayton, OH 45402","220 Warehouse Dr, Springfield, OH 45501"],
  "Cornerstone Plastics Inc.": ["800 Factory Dr, Columbus, OH 43219","1450 Westgate Blvd, Columbus, OH 43228"],
  "Delta Fabrication Group":   ["300 Metalworks Ave, Cleveland, OH 44124"],
  "Eagle Press & Die":         ["500 Eagle Way, Canton, OH 44702"],
  "Frontier Castings Ltd.":    ["900 Industrial Blvd, Youngstown, OH 44503"],
  "Iron Valley Forge":         ["1050 Forge Rd, Massillon, OH 44646"],
};

// ── STYLE PRIMITIVES ──────────────────────────────────────────────────────────
const iInp  = { background:IC.sur2, border:`1px solid ${IC.bdrM}`, borderRadius:5, color:IC.txt, fontFamily:"inherit", fontSize:12, padding:"6px 9px", width:"100%", boxSizing:"border-box", outline:"none" };
const iSel  = { ...iInp, appearance:"none", cursor:"pointer" };
const iTa   = { ...iInp, resize:"vertical", minHeight:56 };
const iInpS = { ...iInp, fontSize:11, padding:"5px 8px" };
const iMkBtn = v => {
  const m = { primary:{bg:IC.acc,cl:"#fff",bd:"none"}, bright:{bg:IC.accB,cl:"#000",bd:"none"},
    blue:{bg:IC.blue,cl:"#fff",bd:"none"}, ghost:{bg:IC.sur,cl:IC.txtM,bd:`1px solid ${IC.bdr}`},
    danger:{bg:IC.redB,cl:IC.red,bd:`1px solid ${IC.redB}`},
    grn:{bg:IC.grnB,cl:IC.grn,bd:`1px solid ${IC.grnB}`},
    teal:{bg:IC.tealB,cl:IC.teal,bd:`1px solid ${IC.teal}`} };
  const x = m[v]||m.ghost;
  return { background:x.bg, color:x.cl, border:x.bd, borderRadius:5, padding:"6px 11px",
    fontSize:11, fontFamily:"inherit", fontWeight:600, cursor:"pointer",
    display:"inline-flex", alignItems:"center", gap:4, whiteSpace:"nowrap" };
};

const iUid  = () => Math.random().toString(36).slice(2,8);
const ILbl  = ({c,req}) => <div style={{fontSize:10,color:IC.txtM,marginBottom:2,fontWeight:600,letterSpacing:.3,textTransform:"uppercase"}}>{c}{req&&<span style={{color:IC.accB,marginLeft:2}}>*</span>}</div>;

// ── AUTOCOMPLETE ──────────────────────────────────────────────────────────────
const IAutoInput = ({val,on,list,ph}) => {
  const [open,setOpen] = useState(false);
  const filtered = (list||[]).filter(x=>x.toLowerCase().includes((val||"").toLowerCase())).slice(0,8);
  return (
    <div style={{position:"relative"}}>
      <input style={iInp} value={val||""} placeholder={ph}
        onChange={e=>{on(e.target.value);setOpen(true);}}
        onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}/>
      {open&&filtered.length>0&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:IC.sur,border:`1px solid ${IC.bdrM}`,borderRadius:5,zIndex:300,boxShadow:"0 6px 20px rgba(0,0,0,.5)",maxHeight:160,overflowY:"auto"}}>
          {filtered.map(c=><div key={c} onMouseDown={()=>{on(c);setOpen(false);}}
            style={{padding:"7px 11px",fontSize:12,cursor:"pointer",borderBottom:`1px solid ${IC.bdr}`,color:IC.txt}}>{c}</div>)}
        </div>
      )}
    </div>
  );
};

// ── SITE BLOCK ────────────────────────────────────────────────────────────────
const iNewSite = () => ({id:iUid(),label:"",locMode:"known",address:"",street:"",city:"",state:"OH",zip:"",notes:"",env:"indoor",floor:"",clearance:""});
function SiteBlock({site,idx,total,customer,onChange,onRemove,onMoveUp,onMoveDown}) {
  const knownLocs = CUSTOMER_LOCATIONS[customer]||[];
  const [lm,setLm] = useState(site.locMode||"known");
  const up=(k,v)=>onChange({...site,[k]:v});
  const isO=idx===0||total===1, isD=idx===total-1&&total>1;
  return (
    <div style={{background:IC.sur2,border:`1px solid ${IC.bdrM}`,borderRadius:6,padding:"10px 12px",marginBottom:10,borderLeft:`3px solid ${isO?IC.accB:isD?IC.grn:IC.blue}`}}>
      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:9}}>
        <span style={{fontSize:10,fontWeight:700,color:isO?IC.accB:isD?IC.grn:IC.blue,minWidth:80}}>
          {total===1?"📍 SITE":isO?"📍 ORIGIN":isD?"🏁 DESTINATION":`↪ STOP ${idx+1}`}
        </span>
        <input style={{...iInpS,flex:1}} value={site.label||""} placeholder="Location label"
          onChange={e=>up("label",e.target.value)}/>
        <div style={{display:"flex",gap:3}}>
          {idx>0&&<button style={iMkBtn("ghost")} onClick={onMoveUp}>↑</button>}
          {idx<total-1&&<button style={iMkBtn("ghost")} onClick={onMoveDown}>↓</button>}
          {total>1&&<button style={iMkBtn("danger")} onClick={onRemove}>✕</button>}
        </div>
      </div>
      {knownLocs.length>0&&(
        <div style={{display:"flex",gap:5,marginBottom:8}}>
          {["known","custom"].map(m=>(
            <button key={m} onClick={()=>{setLm(m);up("locMode",m);}}
              style={{...iMkBtn(lm===m?"primary":"ghost"),fontSize:10,padding:"3px 9px"}}>
              {m==="known"?"📋 Known":"✏️ Custom"}
            </button>
          ))}
        </div>
      )}
      {lm==="known"&&knownLocs.length>0?(
        <div><Lbl c="Location" req/>
          <select style={{...iSel,width:"100%"}} value={site.address||""} onChange={e=>up("address",e.target.value)}>
            <option value="">— Select known site —</option>
            {knownLocs.map(l=><option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"6px 9px"}}>
          <div style={{gridColumn:"1/-1"}}><Lbl c="Street" req/><input style={iInpS} value={site.street||""} placeholder="123 Industrial Pkwy" onChange={e=>up("street",e.target.value)}/></div>
          <div><Lbl c="City"/><input style={iInpS} value={site.city||""} placeholder="Akron" onChange={e=>up("city",e.target.value)}/></div>
          <div><Lbl c="State"/><input style={iInpS} value={site.state||"OH"} onChange={e=>up("state",e.target.value)}/></div>
          <div><Lbl c="ZIP"/><input style={iInpS} value={site.zip||""} onChange={e=>up("zip",e.target.value)}/></div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px 9px",marginTop:8}}>
        <div><Lbl c="Indoor/Outdoor"/>
          <select style={{...iSel,width:"100%"}} value={site.env||"indoor"} onChange={e=>up("env",e.target.value)}>
            <option value="indoor">Indoor</option><option value="outdoor">Outdoor</option><option value="both">Both</option>
          </select>
        </div>
        <div><Lbl c="Floor / Ground"/><input style={iInpS} value={site.floor||""} placeholder="Sealed concrete" onChange={e=>up("floor",e.target.value)}/></div>
        <div><Lbl c="Overhead Clear"/><input style={iInpS} value={site.clearance||""} placeholder='18" clear' onChange={e=>up("clearance",e.target.value)}/></div>
      </div>
      <div style={{marginTop:7}}><Lbl c="Access Notes"/>
        <textarea style={{...iTa,minHeight:40}} value={site.notes||""} placeholder="Dock height, aisle width, obstructions..." onChange={e=>up("notes",e.target.value)}/>
      </div>
    </div>
  );
}

// ── MACHINE CARD ──────────────────────────────────────────────────────────────
const iNewMachine = (n) => ({
  id:iUid(), num:n,
  equipDesc:"", manufacturer:"", model:"", serial:"",
  weight:"", weightSource:"Estimated", cogKnown:false, dimensions:"",
  pickupPoint:"", setPoint:"",
  phaseId:"",   // which phase this machine moves in
  notes:"",
});

function MachineCard({machine, idx, phases, onChange, onRemove, canRemove}) {
  const [open, setOpen] = useState(true);
  const up = (k,v) => onChange({...machine,[k]:v});
  return (
    <div style={{background:IC.sur2,border:`1px solid ${IC.bdrM}`,borderRadius:6,marginBottom:10,overflow:"hidden",borderLeft:`3px solid ${I_PHASE_COLORS[idx%I_PHASE_COLORS.length]}`}}>
      {/* Machine header */}
      <div onClick={()=>setOpen(p=>!p)} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",cursor:"pointer",background:open?IC.sur2:"#0f1724"}}>
        <div style={{background:I_PHASE_COLORS[idx%I_PHASE_COLORS.length],color:"#000",fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:3,whiteSpace:"nowrap"}}>
          M{idx+1}
        </div>
        <div style={{fontSize:12,fontWeight:600,color:IC.txt,flex:1}}>
          {machine.equipDesc||`Machine ${idx+1} — click to fill in`}
          {machine.weight&&<span style={{fontSize:10,color:IC.txtS,marginLeft:8}}>{machine.weight} lbs</span>}
        </div>
        {machine.phaseId&&phases.find(p=>p.id===machine.phaseId)&&(
          <div style={{fontSize:10,color:I_PHASE_COLORS[phases.findIndex(p=>p.id===machine.phaseId)%I_PHASE_COLORS.length],background:I_PHASE_BG[phases.findIndex(p=>p.id===machine.phaseId)%I_PHASE_BG.length],padding:"2px 7px",borderRadius:3}}>
            {phases.find(p=>p.id===machine.phaseId).label}
          </div>
        )}
        {canRemove&&<button style={iMkBtn("danger")} onClick={e=>{e.stopPropagation();onRemove();}}>✕</button>}
        <span style={{color:IC.txtS,fontSize:11,transform:open?"rotate(180deg)":"none",display:"inline-block"}}>▾</span>
      </div>

      {open&&(
        <div style={{padding:"12px 14px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 14px"}}>
            <div style={{gridColumn:"1/-1"}}><Lbl c="Equipment Description" req/>
              <input style={iInp} value={machine.equipDesc} placeholder="e.g. CNC Milling Machine, Hydraulic Press" onChange={e=>up("equipDesc",e.target.value)}/>
            </div>
            <div><Lbl c="Manufacturer"/><input style={iInp} value={machine.manufacturer} placeholder="Mazak, Verson…" onChange={e=>up("manufacturer",e.target.value)}/></div>
            <div><Lbl c="Model"/><input style={iInp} value={machine.model} placeholder="Model #" onChange={e=>up("model",e.target.value)}/></div>
            <div><Lbl c="Serial #"/><input style={iInp} value={machine.serial} placeholder="Optional" onChange={e=>up("serial",e.target.value)}/></div>
            <div><Lbl c="Dimensions (L×W×H)"/><input style={iInp} value={machine.dimensions} placeholder='12"×8"×7"' onChange={e=>up("dimensions",e.target.value)}/></div>
            <div><Lbl c="Weight (lbs)" req/><input style={iInp} value={machine.weight} placeholder='e.g. 18,500' onChange={e=>up("weight",e.target.value)}/></div>
            <div><Lbl c="Weight Source"/>
              <select style={{...iSel,width:"100%"}} value={machine.weightSource} onChange={e=>up("weightSource",e.target.value)}>
                {I_WEIGHT_SOURCES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{display:"flex",alignItems:"flex-end",paddingBottom:3}}>
              <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:11,color:IC.txtM}}>
                <input type="checkbox" checked={machine.cogKnown} onChange={e=>up("cogKnown",e.target.checked)} style={{accentColor:IC.accB,width:12,height:12}}/>
                CoG known — attach drawing
              </label>
            </div>
            <div><Lbl c="Pickup Point"/><input style={iInp} value={machine.pickupPoint} placeholder="Bay 4, north wall" onChange={e=>up("pickupPoint",e.target.value)}/></div>
            <div><Lbl c="Set Point"/><input style={iInp} value={machine.setPoint} placeholder="Foundation pad B" onChange={e=>up("setPoint",e.target.value)}/></div>
            {phases.length>0&&(
              <div style={{gridColumn:"1/-1"}}>
                <Lbl c="Assigned Phase (when does this machine move?)"/>
                <select style={{...iSel,width:"100%"}} value={machine.phaseId||""} onChange={e=>up("phaseId",e.target.value)}>
                  <option value="">— Not assigned —</option>
                  {phases.map((p,pi)=><option key={p.id} value={p.id}>{p.label||`Phase ${pi+1}`}{p.startDate?` (${p.startDate})`:""}  </option>)}
                </select>
              </div>
            )}
            <div style={{gridColumn:"1/-1"}}><Lbl c="Machine Notes"/>
              <textarea style={{...iTa,minHeight:40}} value={machine.notes} placeholder="Special handling, fragile parts, prior damage..." onChange={e=>up("notes",e.target.value)}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MEDIA CAPTURE ─────────────────────────────────────────────────────────────
function MediaCapture({photos,onAdd,onRemove}) {
  const fileRef=useRef(), camRef=useRef();
  const [tagMode,setTagMode]=useState(false);
  const [tagVal,setTagVal]=useState("");
  const handleFiles=files=>Array.from(files).forEach(file=>{
    const r=new FileReader(); r.onload=e=>onAdd({id:iUid(),src:e.target.result,name:file.name,type:"photo"}); r.readAsDataURL(file);
  });
  return (
    <div>
      {photos.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:10}}>
          {photos.map(p=>(
            <div key={p.id} style={{position:"relative"}}>
              {p.type==="tag"
                ?<div style={{width:68,height:68,background:IC.accL,border:`2px solid ${IC.accB}`,borderRadius:5,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}><div style={{fontSize:20}}>🏷️</div><div style={{fontSize:8,color:IC.accB,fontWeight:700,textAlign:"center",padding:"0 4px",wordBreak:"break-all"}}>{p.tagId}</div></div>
                :<img src={p.src} alt={p.name} style={{width:68,height:68,objectFit:"cover",borderRadius:5,border:`1px solid ${IC.bdrM}`}}/>
              }
              <button onClick={()=>onRemove(p.id)} style={{position:"absolute",top:-5,right:-5,width:16,height:16,borderRadius:"50%",background:IC.red,border:"none",color:"#fff",fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
        <button style={iMkBtn("primary")} onClick={()=>camRef.current?.click()}>📷 Take Photo</button>
        <input ref={camRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
        <button style={iMkBtn("ghost")} onClick={()=>fileRef.current?.click()}>🖼 Upload</button>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
        {tagMode
          ?<div style={{display:"flex",gap:5,alignItems:"center"}}>
              <input style={{...iInp,width:140,fontSize:11}} value={tagVal} placeholder="Tag ID / Serial"
                onChange={e=>setTagVal(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&tagVal.trim()){onAdd({id:iUid(),type:"tag",tagId:tagVal.trim(),src:null,name:`Tag:${tagVal.trim()}`});setTagVal("");setTagMode(false);}}}/>
              <button style={iMkBtn("primary")} onClick={()=>{if(tagVal.trim()){onAdd({id:iUid(),type:"tag",tagId:tagVal.trim(),src:null,name:`Tag:${tagVal.trim()}`});setTagVal("");setTagMode(false);}}}>Add</button>
              <button style={iMkBtn("ghost")} onClick={()=>setTagMode(false)}>✕</button>
            </div>
          :<button style={iMkBtn("ghost")} onClick={()=>setTagMode(true)}>🏷️ Enter Tag</button>
        }
      </div>
      <div style={{fontSize:10,color:IC.txtS,marginTop:5}}>Photos & asset tags travel with this RFQ for machine identification.</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── GANTT CHART ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
const IG_DAY_MS = 86400000;
const igAddDays = (dateStr, n) => {
  if(!dateStr) return "";
  const d = new Date(dateStr); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10);
};
const igDaysBetween = (a,b) => {
  if(!a||!b) return 0;
  return Math.round((new Date(b)-new Date(a))/IG_DAY_MS);
};
const igFmtDate = s => {
  if(!s) return ""; const d=new Date(s);
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
};
const igIsWeekend = dateStr => {
  if(!dateStr) return false;
  const d = new Date(dateStr); return d.getDay()===0||d.getDay()===6;
};

function GanttChart({phases, laborRows, equipChecked, machines, f, onUpdatePhase}) {
  // Build timeline bounds
  const allStarts = phases.filter(p=>p.startDate).map(p=>p.startDate);
  const allEnds   = phases.filter(p=>p.endDate).map(p=>p.endDate);
  if(!allStarts.length) return (
    <div style={{textAlign:"center",padding:"40px 20px",color:IC.txtS,fontSize:13}}>
      Add start dates to your phases to generate the Gantt chart.
    </div>
  );

  const minDate = allStarts.reduce((a,b)=>a<b?a:b);
  const maxDate = allEnds.length ? allEnds.reduce((a,b)=>a>b?a:b) : addDays(minDate, 14);
  const totalDays = Math.max(daysBetween(minDate, maxDate) + 2, 7);

  const COL_W = Math.max(28, Math.min(48, Math.floor(800 / totalDays)));
  const ROW_H = 32;
  const LABEL_W = 160;

  // Build day headers
  const dayHeaders = [];
  for(let i=0;i<=totalDays;i++){
    const d = addDays(minDate, i);
    dayHeaders.push(d);
  }

  // Convert date to x offset
  const dateToX = date => daysBetween(minDate, date) * COL_W;

  // Drag state
  const dragRef = useRef(null);

  const startDrag = (phaseIdx, edge, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const origStart = phases[phaseIdx].startDate;
    const origEnd   = phases[phaseIdx].endDate || addDays(phases[phaseIdx].startDate, 1);
    dragRef.current = { phaseIdx, edge, startX, origStart, origEnd };

    const onMove = ev => {
      const dx = ev.clientX - dragRef.current.startX;
      const dDays = Math.round(dx / COL_W);
      const { phaseIdx:pi, edge:eg, origStart:os, origEnd:oe } = dragRef.current;
      const phase = { ...phases[pi] };
      if(eg==="bar") {
        phase.startDate = addDays(os, dDays);
        phase.endDate   = addDays(oe, dDays);
      } else if(eg==="left") {
        const newStart = addDays(os, dDays);
        if(daysBetween(newStart, oe) >= 1) phase.startDate = newStart;
      } else if(eg==="right") {
        const newEnd = addDays(oe, dDays);
        if(daysBetween(os, newEnd) >= 1) phase.endDate = newEnd;
      }
      onUpdatePhase(pi, phase);
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Build row data
  const rows = [];

  phases.forEach((phase, pi) => {
    const color = I_PHASE_COLORS[pi % I_PHASE_COLORS.length];
    const bgCol = I_PHASE_BG[pi % I_PHASE_BG.length];
    const sDate = phase.startDate;
    const eDate = phase.endDate || addDays(sDate, 1);
    const barX = sDate ? dateToX(sDate) : 0;
    const barW = sDate ? Math.max(COL_W, dateToX(eDate) - barX + COL_W) : 0;

    // Phase header row
    rows.push({ type:"phase", phase, pi, color, bgCol, sDate, eDate, barX, barW });

    // Machine milestones assigned to this phase
    const phaseMachines = machines.filter(m => m.phaseId === phase.id);
    phaseMachines.forEach(m => {
      rows.push({ type:"machine", machine:m, color, sDate, barX });
    });

    // Labor rows with days
    laborRows.filter(r => (r.estDays||r.regHrs||r.otHrs)).forEach(lr => {
      const days = Number(lr.estDays) || Math.ceil((Number(lr.regHrs||0)+Number(lr.otHrs||0))/8);
      if(days > 0) {
        const lBarX = sDate ? barX : 0;
        const lBarW = days * COL_W;
        rows.push({ type:"labor", labor:lr, color, lBarX, lBarW, days, sDate });
      }
    });

    // Equipment rows with days
    Object.keys(equipChecked).filter(k=>equipChecked[k]&&!k.includes("_")).forEach(code => {
      const days = Number(f[`${code}_days`]) || 0;
      if(days > 0) {
        const eq = I_EQ_MAP[code];
        if(!eq) return;
        const eBarX = sDate ? barX : 0;
        const eBarW = days * COL_W;
        rows.push({ type:"equip", eq, color, eBarX, eBarW, days, sDate, code });
      }
    });
  });

  // Weekend highlights
  const weekendCols = dayHeaders.filter(d=>isWeekend(d));

  const gridW = totalDays * COL_W;
  const totalH = rows.length * ROW_H + 48; // 48 = header

  return (
    <div style={{overflowX:"auto", overflowY:"visible"}}>
      <div style={{display:"flex", minWidth: LABEL_W + gridW + 20}}>

        {/* Row labels */}
        <div style={{width:LABEL_W, flexShrink:0}}>
          {/* Header spacer */}
          <div style={{height:48, borderBottom:`1px solid ${IC.bdr}`, display:"flex", alignItems:"flex-end", paddingBottom:6}}>
            <div style={{fontSize:9, color:IC.txtS, fontWeight:600, letterSpacing:.5, textTransform:"uppercase", paddingLeft:4}}>Task / Resource</div>
          </div>
          {rows.map((row, ri) => (
            <div key={ri} style={{height:ROW_H, borderBottom:`1px solid ${IC.bdr}`, display:"flex", alignItems:"center", paddingLeft:row.type==="phase"?0:14, gap:5}}>
              {row.type==="phase"&&(
                <>
                  <div style={{width:8,height:8,borderRadius:2,background:row.color,flexShrink:0}}/>
                  <div style={{fontSize:11,fontWeight:700,color:row.color,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.phase.label||`Phase ${row.pi+1}`}</div>
                </>
              )}
              {row.type==="machine"&&(
                <>
                  <div style={{fontSize:13}}>⚙</div>
                  <div style={{fontSize:10,color:IC.txtM,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.machine.equipDesc||`Machine`}</div>
                </>
              )}
              {row.type==="labor"&&(
                <>
                  <div style={{fontSize:11}}>👷</div>
                  <div style={{fontSize:10,color:IC.txtS,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.labor.role} ({row.days}d)</div>
                </>
              )}
              {row.type==="equip"&&(
                <>
                  <div style={{fontSize:11}}>🔧</div>
                  <div style={{fontSize:10,color:IC.txtS,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{I_EQ_MAP[row.code]?.name||row.code} ({row.days}d)</div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Grid + bars */}
        <div style={{flex:1, position:"relative", userSelect:"none"}}>

          {/* Day column headers */}
          <div style={{height:48,display:"flex",alignItems:"flex-end",borderBottom:`1px solid ${IC.bdr}`,position:"relative",overflow:"hidden"}}>
            {dayHeaders.map((d,di)=>{
              const dd = new Date(d);
              const isMonday = dd.getDay()===1;
              const isSun    = dd.getDay()===0;
              return (
                <div key={d} style={{width:COL_W,flexShrink:0,textAlign:"center",position:"relative",
                  borderLeft: isMonday?`1px solid ${IC.bdrM}`:"none"}}>
                  {(di===0||isMonday)&&(
                    <div style={{fontSize:8,color:IC.txtS,whiteSpace:"nowrap",position:"absolute",bottom:6,left:2,letterSpacing:.3}}>
                      {fmtDate(d)}
                    </div>
                  )}
                  {isSun&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:"rgba(245,166,35,.25)"}}/>}
                </div>
              );
            })}
          </div>

          {/* Background grid + weekend shading */}
          <div style={{position:"absolute",top:48,left:0,right:0,bottom:0,pointerEvents:"none",zIndex:0}}>
            {dayHeaders.map((d,di)=>{
              const weekend = isWeekend(d);
              const dd = new Date(d); const isMonday = dd.getDay()===1;
              return (
                <div key={d} style={{position:"absolute",top:0,bottom:0,left:di*COL_W,width:COL_W,
                  background:weekend?"rgba(245,166,35,.06)":"transparent",
                  borderLeft:isMonday?`1px solid ${IC.bdr}`:"none"}}/>
              );
            })}
          </div>

          {/* Rows */}
          {rows.map((row,ri)=>(
            <div key={ri} style={{height:ROW_H,borderBottom:`1px solid ${IC.bdr}`,position:"relative",zIndex:1}}>

              {/* Phase bar — draggable */}
              {row.type==="phase"&&row.sDate&&(
                <>
                  <div
                    onMouseDown={e=>startDrag(row.pi,"bar",e)}
                    style={{position:"absolute",top:6,left:row.barX,width:row.barW,height:20,
                      background:row.color,borderRadius:4,opacity:.9,cursor:"grab",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:9,color:"#000",fontWeight:700,letterSpacing:.3,pointerEvents:"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"0 6px"}}>
                      {fmtDate(row.sDate)}{row.eDate?` → ${fmtDate(row.eDate)}`:""} · {daysBetween(row.sDate,row.eDate||addDays(row.sDate,1))+1}d
                    </span>
                  </div>
                  {/* Left drag handle */}
                  <div onMouseDown={e=>startDrag(row.pi,"left",e)}
                    style={{position:"absolute",top:6,left:row.barX,width:8,height:20,background:"rgba(0,0,0,.3)",cursor:"ew-resize",borderRadius:"4px 0 0 4px",zIndex:2}}/>
                  {/* Right drag handle */}
                  <div onMouseDown={e=>startDrag(row.pi,"right",e)}
                    style={{position:"absolute",top:6,left:row.barX+row.barW-8,width:8,height:20,background:"rgba(0,0,0,.3)",cursor:"ew-resize",borderRadius:"0 4px 4px 0",zIndex:2}}/>
                </>
              )}

              {/* Machine milestone diamond */}
              {row.type==="machine"&&row.sDate&&(
                <div style={{position:"absolute",top:"50%",left:row.barX+COL_W/2-8,transform:"translateY(-50%) rotate(45deg)",
                  width:14,height:14,background:row.color,border:`2px solid #000`}}
                  title={row.machine.equipDesc}>
                </div>
              )}

              {/* Labor bar */}
              {row.type==="labor"&&row.sDate&&(
                <div style={{position:"absolute",top:8,left:row.lBarX,width:row.lBarW,height:16,
                  background:`${row.color}55`,border:`1px solid ${row.color}`,borderRadius:3,
                  display:"flex",alignItems:"center",paddingLeft:4}}>
                  <span style={{fontSize:8,color:row.color,fontWeight:600,whiteSpace:"nowrap"}}>{row.labor.role}</span>
                </div>
              )}

              {/* Equipment bar */}
              {row.type==="equip"&&row.sDate&&(
                <div style={{position:"absolute",top:8,left:row.eBarX,width:row.eBarW,height:16,
                  background:`${row.color}33`,border:`1px solid ${row.color}88`,borderRadius:3,
                  display:"flex",alignItems:"center",paddingLeft:4}}>
                  <span style={{fontSize:8,color:IC.txtM,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{I_EQ_MAP[row.code]?.name?.split(" ").slice(-2).join(" ")||row.code}</span>
                </div>
              )}

            </div>
          ))}

          {/* Gap / break indicators between phases */}
          {phases.map((phase,pi)=>{
            if(pi===phases.length-1) return null;
            const next = phases[pi+1];
            if(!phase.endDate||!next.startDate) return null;
            const gapDays = daysBetween(phase.endDate, next.startDate);
            if(gapDays<=0) return null;
            const gapX = dateToX(addDays(phase.endDate,1));
            const gapW = (gapDays-1)*COL_W;
            if(gapW<4) return null;
            return (
              <div key={`gap${pi}`} style={{position:"absolute",top:0,left:gapX,width:gapW,bottom:0,
                background:"repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(245,166,35,.08) 4px,rgba(245,166,35,.08) 8px)",
                borderLeft:`1px dashed ${IC.accB}55`,borderRight:`1px dashed ${IC.accB}55`,
                pointerEvents:"none",zIndex:0}}>
                {gapW>30&&<div style={{position:"absolute",top:4,left:4,fontSize:8,color:IC.accB,whiteSpace:"nowrap"}}>⏸ {gapDays}d break</div>}
              </div>
            );
          })}

        </div>
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:10,paddingLeft:LABEL_W,fontSize:10,color:IC.txtS}}>
        <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:24,height:10,background:IC.accB,borderRadius:2}}/> Phase (drag edges or bar)</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,background:IC.accB,transform:"rotate(45deg)"}}/> Machine milestone</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:24,height:10,background:`${IC.accB}55`,border:`1px solid ${IC.accB}`,borderRadius:2}}/> Labor</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:24,height:10,background:`${IC.accB}33`,border:`1px solid ${IC.accB}88`,borderRadius:2}}/> Equipment</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:16,height:10,background:"rgba(245,166,35,.12)",border:`1px dashed ${IC.accB}55`}}/> Break</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:16,height:10,background:"rgba(245,166,35,.06)"}}/> Weekend</span>
      </div>
    </div>
  );
}

// ── PRINT BLANK ───────────────────────────────────────────────────────────────
function PrintBlank({onBack}) {
  const hdr = t=><div style={{fontWeight:700,fontSize:10,background:"#e5e7eb",padding:"3px 7px",marginTop:12,marginBottom:5,textTransform:"uppercase"}}>{t}</div>;
  const row = (label,w="70%")=>(
    <div style={{display:"flex",gap:8,marginBottom:5,alignItems:"flex-end"}}>
      <div style={{flexShrink:0,fontSize:10,fontWeight:600,width:130}}>{label}:</div>
      <div style={{borderBottom:"1px solid #999",width:w,height:16}}/>
    </div>
  );
  const chk = labels=>(
    <div style={{display:"flex",flexWrap:"wrap",gap:"4px 16px",marginBottom:6}}>
      {labels.map(l=><span key={l} style={{fontSize:10}}>☐ {l}</span>)}
    </div>
  );
  return (
    <div style={{background:"#fff",color:"#000",fontFamily:"Arial,sans-serif",padding:"24px 28px",maxWidth:820,margin:"0 auto",fontSize:11}}>
      <style>{`@media print{body{margin:0}.no-print{display:none!important}}`}</style>
      <div style={{display:"flex",justifyContent:"space-between",borderBottom:"2.5px solid #000",paddingBottom:8,marginBottom:12}}>
        <div><div style={{fontFamily:"Georgia,serif",fontSize:18,fontWeight:700}}>Mario Rigging & Transport</div>
          <div style={{fontSize:10,color:"#555",marginTop:2}}>Job Intake / RFQ — Field Copy</div></div>
        <div style={{textAlign:"right",fontSize:10}}>
          <div>RFQ #: <span style={{borderBottom:"1px solid #999",display:"inline-block",width:90,height:14}}/></div>
          <div style={{marginTop:4}}>Date: <span style={{borderBottom:"1px solid #999",display:"inline-block",width:100,height:14}}/></div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 24px"}}>
        <div>{hdr("1. Customer")}{row("Company")}{row("Contact")}{row("Phone")}{row("Email","80%")}</div>
        <div>{hdr("2. Schedule")}
          {row("Requested Date")}{chk(["Split/Phased dates"])}{row("Phase 1 Start")}{row("Phase 1 End")}{row("Phase 2 Start")}{row("Phase 2 End")}
          {chk(["Flexible ±3 days","OT/weekend OK","Permits","Stamped Lift Plan"])}
        </div>
      </div>
      {hdr("3. Job Site(s)")}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 24px"}}>
        <div><div style={{fontSize:10,fontWeight:700,marginBottom:3}}>📍 Origin</div>{row("Address","85%")}{row("City/State/ZIP","85%")}{row("Floor/Clearance","85%")}</div>
        <div><div style={{fontSize:10,fontWeight:700,marginBottom:3}}>🏁 Destination</div>{row("Address","85%")}{row("City/State/ZIP","85%")}{row("Floor/Clearance","85%")}</div>
      </div>
      {hdr("4. Scope")}{chk(I_SCOPE_OPTIONS)}{row("Pickup Point")}{row("Set Point")}
      {hdr("5. Machine(s)")}
      {[1,2,3].map(n=>(
        <div key={n} style={{border:"1px solid #ccc",borderRadius:3,padding:"6px 8px",marginBottom:6}}>
          <div style={{fontWeight:700,fontSize:10,marginBottom:4}}>Machine {n}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 12px"}}>
            {[["Description",""],["Manufacturer",""],["Model",""],["Serial #",""],["Weight (lbs)",""],["Dimensions",""],["Pickup Point",""],["Set Point",""],["Phase",""]].map(([l])=>row(l,"90%"))}
          </div>
        </div>
      ))}
      {hdr("6. Labor")}
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,marginBottom:6}}>
        <thead><tr style={{background:"#f3f4f6"}}>
          {["Role","Reg Hrs","OT Hrs","Est Days","Notes"].map(h=><th key={h} style={{border:"1px solid #ccc",padding:"3px 7px",textAlign:"left"}}>{h}</th>)}
        </tr></thead>
        <tbody>{I_LABOR_ROLES.map(r=><tr key={r}><td style={{border:"1px solid #ccc",padding:"3px 7px"}}>{r}</td>{[1,2,3,4].map(i=><td key={i} style={{border:"1px solid #ccc",padding:"3px 7px"}}>&nbsp;</td>)}</tr>)}</tbody>
      </table>
      {hdr("7. Equipment Needed")}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px",marginBottom:6}}>
        {I_EQ_CATS.map(cat=>(
          <div key={cat}><div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",color:"#555",marginBottom:2}}>{cat}</div>
            {I_EQUIPMENT.filter(e=>e.cat===cat).map(e=>(
              <div key={e.code} style={{display:"flex",gap:4,alignItems:"center",marginBottom:2,fontSize:9}}>
                <span>☐</span><span style={{flex:1}}>{e.name}</span>
                <span style={{borderBottom:"1px solid #ccc",width:36,height:11,display:"inline-block"}}/><span style={{fontSize:8,color:"#888"}}>days</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      {hdr("8. Subcontractors / Rentals / Materials")}
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,marginBottom:6}}>
        <thead><tr style={{background:"#f3f4f6"}}>{["Type","Vendor / Description","Est. Cost","Notes"].map(h=><th key={h} style={{border:"1px solid #ccc",padding:"3px 7px",textAlign:"left"}}>{h}</th>)}</tr></thead>
        <tbody>{[1,2,3,4].map(i=><tr key={i}>{[0,1,2,3].map(j=><td key={j} style={{border:"1px solid #ccc",padding:"3px 7px",height:18}}>&nbsp;</td>)}</tr>)}</tbody>
      </table>
      {hdr("9. Notes")}{[0,1,2].map(i=><div key={i} style={{borderBottom:"1px solid #ccc",height:16,marginBottom:5}}/>)}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20,marginTop:16,borderTop:"1px solid #000",paddingTop:12}}>
        {["Customer Signature / Date","Received By / Date","Estimator / Date"].map(l=><div key={l}><div style={{borderBottom:"1px solid #000",height:28}}/><div style={{fontSize:9,color:"#666",marginTop:3}}>{l}</div></div>)}
      </div>
      <div className="no-print" style={{marginTop:18,display:"flex",gap:10}}>
        <button onClick={()=>window.print()} style={{padding:"7px 16px",background:"#000",color:"#fff",border:"none",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>🖨 Print</button>
        <button onClick={onBack} style={{padding:"7px 16px",background:"#e5e7eb",border:"none",cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
      </div>
    </div>
  );
}

// ── STATE FACTORIES ───────────────────────────────────────────────────────────
const mkLaborRow = () => ({ id:iUid(), role:"Rigger", regHrs:"", otHrs:"", estDays:"", notes:"" });
const mkSubRow   = () => ({ id:iUid(), type:"Subcontractor", vendor:"", cost:"", notes:"" });
const EMPTY = () => ({
  customer:"", contactName:"", phone:"", email:"",
  multiSite:false, sites:[iNewSite(),iNewSite()],
  machines:[iNewMachine(1)],
  scopeTypes:[], pickupPoint:"", setPoint:"",
  laborRows:I_LABOR_ROLES.map(role=>({id:iUid(),role,regHrs:"",otHrs:"",estDays:"",notes:""})),
  equipChecked:{},
  subRows:[mkSubRow()],
  splitDates:false,
  dateSegments:[{id:iUid(),label:"Phase 1",startDate:"",endDate:"",notes:""}],
  requestedDate:"", flexDate:false, overtimeOk:false, permitRequired:false, engineeredLiftPlan:false,
  photos:[],
  specialNotes:"",
  priority:"Standard", estimator:"Scott DeMuesy", internalNotes:"",
});

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
function IntakeFormWrapper({ initReq=null, pipelineOwner="", onSave=null, onBack=null, onBuildEstimate=null }) {
  const [f, setF] = useState(() => {
    const base = EMPTY();
    if (initReq) {
      base.customer     = initReq.company   || "";
      base.contactName  = initReq.requester || "";
      base.phone        = initReq.phone     || "";
      base.email        = initReq.email     || "";
      base.specialNotes = initReq.desc      || "";
      base.estimator    = pipelineOwner     || "Scott DeMuesy";
      if (initReq.jobSite) {
        base.sites[0].street  = initReq.jobSite;
        base.sites[0].locMode = "custom";
      }
    } else if (pipelineOwner) {
      base.estimator = pipelineOwner;
    }
    return base;
  });
  const [page, setPage] = useState("form");
  const [ganttData, setGanttData] = useState(null);
  const ganttRef = useRef(null);
  const rfqNum = useRef("RFQ-"+new Date().getFullYear()+"-"+String(Math.floor(Math.random()*9000)+1000).padStart(4,"0")).current;

  // Mobile detection
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const mob1 = isMobile ? "1fr" : "1fr 1fr";
  const mob3 = isMobile ? "1fr" : "1fr 1fr 1fr";
  const mob2to3 = isMobile ? "1fr" : "2fr 1fr 1fr";

  const u = (k,v) => setF(p=>({...p,[k]:v}));
  const toggleScope = v => u("scopeTypes", f.scopeTypes.includes(v)?f.scopeTypes.filter(x=>x!==v):[...f.scopeTypes,v]);

  // Sites
  const addSite    = () => u("sites",[...f.sites,iNewSite()]);
  const removeSite = i  => u("sites",f.sites.filter((_,idx)=>idx!==i));
  const updateSite = (i,s) => u("sites",f.sites.map((x,idx)=>idx===i?s:x));
  const moveSite   = (i,d) => { const a=[...f.sites]; const j=i+d; if(j<0||j>=a.length)return; [a[i],a[j]]=[a[j],a[i]]; u("sites",a); };

  // Machines
  const addMachine    = () => u("machines",[...f.machines, iNewMachine(f.machines.length+1)]);
  const removeMachine = i  => u("machines",f.machines.filter((_,idx)=>idx!==i));
  const updateMachine = (i,m) => u("machines",f.machines.map((x,idx)=>idx===i?m:x));

  // Labor
  const updateLabor = (id,k,v) => u("laborRows",f.laborRows.map(r=>r.id===id?{...r,[k]:v}:r));
  const addLaborRow = () => u("laborRows",[...f.laborRows,mkLaborRow()]);
  const removeLabor = id => u("laborRows",f.laborRows.filter(r=>r.id!==id));

  // Equip checklist
  const toggleEq = code => u("equipChecked",{...f.equipChecked,[code]:!f.equipChecked[code]});

  // Subs
  const updateSub = (id,k,v) => u("subRows",f.subRows.map(r=>r.id===id?{...r,[k]:v}:r));
  const addSubRow = () => u("subRows",[...f.subRows,mkSubRow()]);
  const removeSub = id => u("subRows",f.subRows.filter(r=>r.id!==id));

  // Photos
  const addPhoto    = p  => u("photos",[...f.photos,p]);
  const removePhoto = id => u("photos",f.photos.filter(p=>p.id!==id));

  // Gantt phase update (from drag)
  const updateGanttPhase = (i, phase) => {
    u("dateSegments", f.dateSegments.map((s,idx)=>idx===i?{...s,...phase}:s));
  };

  // Submit — snapshot, persist, show Gantt
  const handleSubmit = () => {
    const snapshot = { ...f, rfqNumber: rfqNum, rfqId: initReq?.id || null };
    setGanttData(snapshot);
    setPage("submitted");
    if (onSave) onSave(snapshot);
  };

  // Collapsible sections
  const [open, setOpen] = useState(()=>{
    const mob = typeof window!=="undefined"&&window.innerWidth<700;
    return {s1:!mob,s2:!mob,s3:!mob,s4:!mob,s5:!mob,s6:!mob,s7:!mob,s8:!mob,s9:!mob,s10:!mob,s11:!mob,s12:!mob};
  });
  const tog = k => setOpen(p=>({...p,[k]:!p[k]}));

  const CCard = ({sKey,num,title,action,badge,children,cardStyle={}}) => {
    const isOpen = open[sKey];
    return (
      <div style={{background:IC.sur,border:`1px solid ${IC.bdr}`,borderRadius:7,marginBottom:11,overflow:"hidden",...cardStyle}}>
        <div onClick={()=>tog(sKey)} style={{display:"flex",alignItems:"center",gap:7,padding:"10px 14px",cursor:"pointer",background:isOpen?IC.sur:IC.sur2,borderBottom:isOpen?`1px solid ${IC.bdr}`:"none",userSelect:"none"}}>
          <div style={{width:17,height:17,borderRadius:3,background:IC.accB,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#000",flexShrink:0}}>{num}</div>
          <div style={{color:IC.accB,fontSize:10,letterSpacing:1.1,fontWeight:700,textTransform:"uppercase",flex:1}}>{title}</div>
          {!isOpen&&badge&&<div style={{fontSize:10,color:IC.txtS,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160,marginRight:6}}>{badge}</div>}
          {isOpen&&action&&<div onClick={e=>e.stopPropagation()}>{action}</div>}
          <div style={{color:IC.txtS,fontSize:11,marginLeft:4,transition:"transform .2s",transform:isOpen?"rotate(180deg)":"none"}}>▾</div>
        </div>
        {isOpen&&<div style={{padding:"12px 14px"}}>{children}</div>}
      </div>
    );
  };


  if(page==="blank") return <PrintBlank onBack={()=>setPage("form")}/>;

  // ── SUBMITTED VIEW — confirmation + Gantt ──────────────────────────────────
  if(page==="submitted" && ganttData) {
    const gPhases = ganttData.splitDates
      ? ganttData.dateSegments
      : [{id:"single",label:"Move Day",startDate:ganttData.requestedDate,endDate:ganttData.requestedDate}];
    const handleUpdatePhase = (i, phase) => {
      setGanttData(prev => ({
        ...prev,
        dateSegments: (prev.dateSegments||[]).map((s,idx)=>idx===i?{...s,...phase}:s),
        requestedDate: !prev.splitDates && i===0 ? phase.startDate||prev.requestedDate : prev.requestedDate,
      }));
    };
    return (
      <div style={{background:IC.bg,minHeight:"100vh",fontFamily:"system-ui,sans-serif",color:IC.txt}}>
        {/* Submitted nav */}
        <div style={{background:IC.sur,borderBottom:`1px solid ${IC.bdr}`,padding:"0 16px",display:"flex",alignItems:"center",gap:10,minHeight:50,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,.4)"}}>
          <div style={{width:32,height:32,background:IC.accL,border:`2px solid ${IC.accB}`,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>⛓</div>
          <div>
            <div style={{fontFamily:"Georgia,serif",fontSize:13,color:IC.accB,fontWeight:700,lineHeight:1.1}}>Mario</div>
            <div style={{fontSize:9,color:IC.txtS,letterSpacing:.5}}>RIGGING & TRANSPORT</div>
          </div>
          <div style={{width:1,height:26,background:IC.bdr,margin:"0 6px"}}/>
          <div style={{fontSize:12,color:IC.grn,fontWeight:700}}>✓ Intake Submitted</div>
          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <button style={iMkBtn("primary")} onClick={()=>window.print()}>🖨 Print</button>
            <button style={iMkBtn("ghost")} onClick={()=>{setF(EMPTY());setGanttData(null);setPage("form"); if(onBack) onBack();}}>← Back to Pipeline</button>
            {onBuildEstimate && ganttData && (
              <button style={iMkBtn("bright")} onClick={()=>{ onBuildEstimate(ganttData); setF(EMPTY()); setGanttData(null); setPage("form"); }}>
                📄 Build Estimate →
              </button>
            )}
          </div>
        </div>

        <div style={{maxWidth:900,margin:"0 auto",padding:"20px 14px"}}>

          {/* Confirmation banner */}
          <div style={{background:IC.grnB,border:`1px solid ${IC.grn}`,borderRadius:8,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            <div style={{fontSize:32}}>✅</div>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,color:IC.grn,marginBottom:3}}>Intake Submitted — {ganttData.customer||"Customer"}</div>
              <div style={{fontSize:12,color:IC.txtM,display:"flex",gap:16,flexWrap:"wrap"}}>
                <span>⚙ {ganttData.machines.length} machine{ganttData.machines.length>1?"s":""}</span>
                <span>📍 {ganttData.multiSite?`${ganttData.sites.length} sites`:"Single site"}</span>
                <span>📅 {ganttData.splitDates?`${ganttData.dateSegments.length} phases`:ganttData.requestedDate||"Date TBD"}</span>
                <span>👷 {ganttData.laborRows.filter(r=>r.regHrs||r.otHrs||r.estDays).length} labor roles</span>
                <span>🔧 {Object.keys(ganttData.equipChecked).filter(k=>ganttData.equipChecked[k]&&!k.includes("_")).length} equipment items</span>
              </div>
            </div>
          </div>

          {/* Machine summary */}
          {ganttData.machines.length > 0 && (
            <div style={{background:IC.sur,border:`1px solid ${IC.bdr}`,borderRadius:8,padding:"14px 18px",marginBottom:16}}>
              <div style={{fontSize:10,color:IC.accB,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Machine Summary</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {ganttData.machines.map((m,i)=>(
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",padding:"8px 10px",background:IC.sur2,borderRadius:5,borderLeft:`3px solid ${I_PHASE_COLORS[i%I_PHASE_COLORS.length]}`}}>
                    <div style={{background:I_PHASE_BG[i%I_PHASE_BG.length],color:I_PHASE_COLORS[i%I_PHASE_COLORS.length],fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:3,whiteSpace:"nowrap"}}>M{i+1}</div>
                    <div style={{fontSize:12,fontWeight:600,color:IC.txt,flex:1}}>{m.equipDesc||"—"}</div>
                    {m.manufacturer&&<div style={{fontSize:11,color:IC.txtS}}>{m.manufacturer}{m.model?` ${m.model}`:""}</div>}
                    {m.serial&&<div style={{fontSize:11,color:IC.txtS}}>S/N: {m.serial}</div>}
                    {m.weight&&<div style={{fontSize:11,color:IC.accB,fontWeight:600}}>{m.weight} lbs</div>}
                    {m.phaseId&&gPhases.find(p=>p.id===m.phaseId)&&(
                      <div style={{fontSize:10,color:IC.blue,background:IC.bluB,padding:"2px 7px",borderRadius:3}}>{gPhases.find(p=>p.id===m.phaseId).label}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GANTT */}
          <div ref={ganttRef} style={{background:IC.sur,border:`2px solid ${IC.teal}`,borderRadius:9,padding:"16px 18px",marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:18,height:18,borderRadius:3,background:IC.teal,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#000"}}>G</div>
                <div style={{fontSize:13,fontWeight:700,color:IC.teal}}>PROJECT GANTT</div>
                <div style={{fontSize:10,color:IC.txtS}}>Drag phase bars to adjust dates · changes are reflected below</div>
              </div>
            </div>

            {ganttData.machines.length>1&&(
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                {ganttData.machines.map((m,i)=>(
                  <div key={m.id} style={{background:I_PHASE_BG[i%I_PHASE_BG.length],color:I_PHASE_COLORS[i%I_PHASE_COLORS.length],border:`1px solid ${I_PHASE_COLORS[i%I_PHASE_COLORS.length]}`,fontSize:10,padding:"3px 9px",borderRadius:4,display:"flex",gap:5,alignItems:"center"}}>
                    <span style={{fontWeight:700}}>M{i+1}</span>
                    <span>{m.equipDesc||"Machine"}</span>
                    {m.weight&&<span style={{opacity:.7}}>· {m.weight} lbs</span>}
                    {m.phaseId&&gPhases.find(p=>p.id===m.phaseId)&&<span style={{opacity:.7}}>· {gPhases.find(p=>p.id===m.phaseId).label}</span>}
                  </div>
                ))}
              </div>
            )}

            <GanttChart
              phases={gPhases}
              laborRows={ganttData.laborRows}
              equipChecked={ganttData.equipChecked}
              machines={ganttData.machines}
              f={ganttData}
              onUpdatePhase={handleUpdatePhase}
            />

            {/* Live date feedback */}
            <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
              {gPhases.map((seg,i)=>(
                <div key={seg.id||i} style={{background:IC.sur2,border:`1px solid ${IC.bdr}`,borderRadius:5,padding:"6px 10px",fontSize:11}}>
                  <span style={{color:I_PHASE_COLORS[i%I_PHASE_COLORS.length],fontWeight:700}}>{seg.label||`Phase ${i+1}`}</span>
                  <span style={{color:IC.txtS,marginLeft:6}}>{seg.startDate||"—"}{seg.endDate&&seg.endDate!==seg.startDate?` → ${seg.endDate}`:""}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div style={{background:IC.bg,minHeight:"100vh",paddingBottom:60,fontFamily:"system-ui,-apple-system,sans-serif",color:IC.txt}}>

      {/* NAV */}
      <div style={{background:IC.sur,borderBottom:`1px solid ${IC.bdr}`,padding:"0 16px",display:"flex",alignItems:"center",gap:10,minHeight:50,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,.4)"}}>
        <div style={{width:32,height:32,background:IC.accL,border:`2px solid ${IC.accB}`,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>⛓</div>
        <div>
          <div style={{fontFamily:"Georgia,serif",fontSize:13,color:IC.accB,fontWeight:700,lineHeight:1.1}}>Mario</div>
          <div style={{fontSize:9,color:IC.txtS,letterSpacing:.5}}>RIGGING & TRANSPORT</div>
        </div>
        <div style={{width:1,height:26,background:IC.bdr,margin:"0 6px"}}/>
        <div style={{fontSize:12,color:IC.txtM,fontWeight:600}}>{isMobile?"Intake":"Job Intake / RFQ"}</div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <button style={iMkBtn("ghost")} onClick={()=>setPage("blank")}>🖨 Print Blank</button>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"10px 10px":"16px 14px"}}>

        {/* RFQ Banner */}
        <div style={{background:IC.sur,border:`1px solid ${IC.bdrM}`,borderRadius:7,padding:"11px 16px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:9,color:IC.txtS,textTransform:"uppercase",letterSpacing:1,marginBottom:1}}>Intake Reference</div>
            <div style={{fontSize:19,fontWeight:700,color:IC.accB}}>{rfqNum}</div>
          </div>
          <div style={{textAlign:"right",fontSize:11,color:IC.txtS}}>
            <div>{new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</div>
            <div style={{color:IC.txtM,marginTop:1}}>Required fields <span style={{color:IC.accB}}>*</span></div>
          </div>
        </div>

        {/* ── 1: CUSTOMER ── */}
        <CCard sKey="s1" num="1" title="Customer Information" badge={f.customer?`${f.customer}${f.contactName?" · "+f.contactName:""}`:"Not started"}>
          <div style={{display:"grid",gridTemplateColumns:mob1,gap:"9px 15px"}}>
            <div style={{gridColumn:"1/-1"}}><ILbl c="Company" req/><IAutoInput val={f.customer} on={v=>u("customer",v)} list={I_CUSTOMERS} ph="Company name"/></div>
            <div><ILbl c="Contact Name" req/><input style={iInp} value={f.contactName} placeholder="Jane Smith" onChange={e=>u("contactName",e.target.value)}/></div>
            <div><ILbl c="Phone"/><input style={iInp} value={f.phone} placeholder="(330) 555-0100" onChange={e=>u("phone",e.target.value)}/></div>
            <div style={{gridColumn:"1/-1"}}><ILbl c="Email"/><input style={iInp} value={f.email} placeholder="contact@company.com" onChange={e=>u("email",e.target.value)}/></div>
          </div>
        </CCard>

        {/* ── 2: MACHINES ── */}
        <CCard sKey="s2" num="2" title={`Machine(s) / Load  (${f.machines.length})`}
          badge={f.machines.map(m=>m.equipDesc||"?").join(", ")||"Not started"}
          action={<button style={{...iMkBtn("blue"),fontSize:10,padding:"3px 9px"}} onClick={e=>{e.stopPropagation();addMachine();}}>+ Add Machine</button>}>
          {f.machines.length>1&&(
            <div style={{background:IC.sur2,border:`1px solid ${IC.bdr}`,borderRadius:5,padding:"7px 11px",marginBottom:10,fontSize:11,color:IC.txtS}}>
              ⚙ Multi-machine job — {f.machines.length} machines on one mobilization. Assign each to a phase in the Schedule section.
            </div>
          )}
          {f.machines.map((m,i)=>(
            <MachineCard key={m.id} machine={m} idx={i}
              phases={f.splitDates?f.dateSegments:[]}
              onChange={nm=>updateMachine(i,nm)}
              onRemove={()=>removeMachine(i)}
              canRemove={f.machines.length>1}/>
          ))}
          <button style={{...iMkBtn("blue"),width:"100%",justifyContent:"center",marginTop:4}} onClick={addMachine}>
            + Add Another Machine to This Job
          </button>
        </CCard>

        {/* ── 3: SITES ── */}
        <CCard sKey="s3" num="3" title="Job Site(s)"
          badge={f.multiSite?`${f.sites.length} sites`:(f.sites[0]?.address||f.sites[0]?.street||"Not started")}
          action={<label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:11,color:IC.txtM}} onClick={e=>e.stopPropagation()}>
            <input type="checkbox" checked={f.multiSite} onChange={e=>u("multiSite",e.target.checked)} style={{accentColor:IC.accB,width:13,height:13}}/>
            Multi-site / Plant-to-Plant
          </label>}>
          {!f.multiSite?(
            <SiteBlock site={f.sites[0]} idx={-1} total={1} customer={f.customer}
              onChange={s=>updateSite(0,s)} onRemove={()=>{}} onMoveUp={()=>{}} onMoveDown={()=>{}}/>
          ):(
            <>
              <div style={{background:IC.sur2,border:`1px solid ${IC.bdr}`,borderRadius:5,padding:"7px 11px",marginBottom:10,fontSize:11,color:IC.txtS}}>📦 Multi-site move — Origin → Stops → Destination</div>
              {f.sites.map((site,i)=>(
                <SiteBlock key={site.id} site={site} idx={i} total={f.sites.length} customer={f.customer}
                  onChange={s=>updateSite(i,s)} onRemove={()=>removeSite(i)}
                  onMoveUp={()=>moveSite(i,-1)} onMoveDown={()=>moveSite(i,1)}/>
              ))}
              <button style={{...iMkBtn("blue"),width:"100%",justifyContent:"center",marginTop:2}} onClick={addSite}>+ Add Stop / Plant</button>
            </>
          )}
        </CCard>

        {/* ── 4: SCOPE ── */}
        <CCard sKey="s4" num="4" title="Scope of Work" badge={f.scopeTypes.length?f.scopeTypes.join(", "):"Not selected"}>
          <div style={{display:"flex",flexWrap:"wrap",gap:isMobile?"8px 12px":"5px 18px",marginBottom:12}}>
            {I_SCOPE_OPTIONS.map(s=>(
              <label key={s} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,color:f.scopeTypes.includes(s)?IC.txt:IC.txtM}}>
                <input type="checkbox" checked={f.scopeTypes.includes(s)} onChange={()=>toggleScope(s)} style={{accentColor:IC.accB,width:13,height:13}}/>{s}
              </label>
            ))}
          </div>
          {f.machines.length===1&&(
            <div style={{display:"grid",gridTemplateColumns:mob1,gap:"9px 15px"}}>
              <div><ILbl c="Pickup Point"/><input style={iInp} value={f.pickupPoint} placeholder="e.g. Bay 4, north wall" onChange={e=>u("pickupPoint",e.target.value)}/></div>
              <div><ILbl c="Set Point"/><input style={iInp} value={f.setPoint} placeholder="e.g. Foundation pad B" onChange={e=>u("setPoint",e.target.value)}/></div>
            </div>
          )}
          {f.machines.length>1&&<div style={{fontSize:11,color:IC.txtS,marginTop:4}}>ℹ Pickup & set points are set per machine above.</div>}
        </CCard>

        {/* ── 5: SCHEDULE ── */}
        <CCard sKey="s5" num="5" title="Schedule & Requirements"
          badge={f.splitDates?`${f.dateSegments.length} phases`:(f.requestedDate||"No date set")}
          action={<label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:11,color:IC.txtM}} onClick={e=>e.stopPropagation()}>
            <input type="checkbox" checked={f.splitDates}
              onChange={e=>{u("splitDates",e.target.checked); if(e.target.checked&&!f.dateSegments[0].startDate&&f.requestedDate) u("dateSegments",[{...f.dateSegments[0],startDate:f.requestedDate}]);}}
              style={{accentColor:IC.accB,width:13,height:13}}/>
            Split / phased dates
          </label>}>
          {!f.splitDates&&(
            <div style={{display:"grid",gridTemplateColumns:mob3,gap:"9px 15px"}}>
              <div><ILbl c="Requested Date" req/><input type="date" style={iInp} value={f.requestedDate} onChange={e=>u("requestedDate",e.target.value)}/></div>
              <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end",gap:7}}>
                {[["flexDate","Flexible ±3 days"],["overtimeOk","OT / weekend OK"]].map(([k,l])=>(
                  <label key={k} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,color:IC.txtM}}>
                    <input type="checkbox" checked={f[k]} onChange={e=>u(k,e.target.checked)} style={{accentColor:IC.accB,width:13,height:13}}/>{l}
                  </label>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end",gap:7}}>
                {[["permitRequired","Permits / traffic"],["engineeredLiftPlan","Stamped lift plan"]].map(([k,l])=>(
                  <label key={k} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,color:IC.txtM}}>
                    <input type="checkbox" checked={f[k]} onChange={e=>u(k,e.target.checked)} style={{accentColor:IC.accB,width:13,height:13}}/>{l}
                  </label>
                ))}
              </div>
            </div>
          )}
          {f.splitDates&&(
            <div>
              <div style={{background:IC.sur2,border:`1px solid ${IC.bdr}`,borderRadius:5,padding:"7px 11px",marginBottom:10,fontSize:11,color:IC.txtS}}>
                📅 Define phases — machines can be assigned to specific phases. Drag phase bars on the Gantt to adjust.
              </div>
              {f.dateSegments.map((seg,i)=>(
                <div key={seg.id} style={{background:IC.sur2,border:`1px solid ${IC.bdrM}`,borderLeft:`3px solid ${I_PHASE_COLORS[i%I_PHASE_COLORS.length]}`,borderRadius:6,padding:"10px 12px",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <div style={{background:I_PHASE_BG[i%I_PHASE_BG.length],color:I_PHASE_COLORS[i%I_PHASE_COLORS.length],fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:3,whiteSpace:"nowrap"}}>PHASE {i+1}</div>
                    <input style={{...iInpS,flex:1}} value={seg.label}
                      placeholder={["Disconnect & Prep","Move Day","Reinstall","Final Connections","Inspection"][i]||"Phase description"}
                      onChange={e=>u("dateSegments",f.dateSegments.map((s,idx)=>idx===i?{...s,label:e.target.value}:s))}/>
                    {f.dateSegments.length>1&&<button style={iMkBtn("danger")} onClick={()=>u("dateSegments",f.dateSegments.filter((_,idx)=>idx!==i))}>✕</button>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 2fr",gap:"7px 12px"}}>
                    <div><ILbl c="Start Date" req/><input type="date" style={iInp} value={seg.startDate} onChange={e=>u("dateSegments",f.dateSegments.map((s,idx)=>idx===i?{...s,startDate:e.target.value}:s))}/></div>
                    <div><ILbl c="End Date"/><input type="date" style={iInp} value={seg.endDate} onChange={e=>u("dateSegments",f.dateSegments.map((s,idx)=>idx===i?{...s,endDate:e.target.value}:s))}/></div>
                    <div><ILbl c="Phase Notes"/><input style={iInp} value={seg.notes} placeholder="What's happening..." onChange={e=>u("dateSegments",f.dateSegments.map((s,idx)=>idx===i?{...s,notes:e.target.value}:s))}/></div>
                  </div>
                  {/* Machines assigned here */}
                  {f.machines.filter(m=>m.phaseId===seg.id).length>0&&(
                    <div style={{marginTop:8,display:"flex",gap:5,flexWrap:"wrap"}}>
                      {f.machines.filter(m=>m.phaseId===seg.id).map(m=>(
                        <div key={m.id} style={{background:I_PHASE_BG[i%I_PHASE_BG.length],color:I_PHASE_COLORS[i%I_PHASE_COLORS.length],fontSize:10,padding:"2px 7px",borderRadius:3}}>
                          ⚙ {m.equipDesc||"Machine"}
                        </div>
                      ))}
                    </div>
                  )}
                  {i<f.dateSegments.length-1&&seg.endDate&&f.dateSegments[i+1].startDate&&(()=>{
                    const days=Math.round((new Date(f.dateSegments[i+1].startDate)-new Date(seg.endDate))/86400000);
                    return days>0?<div style={{marginTop:7,fontSize:10,color:IC.yel,display:"flex",alignItems:"center",gap:5}}>⏸ <span>{days}-day break before Phase {i+2}</span></div>:null;
                  })()}
                </div>
              ))}
              <button style={{...iMkBtn("blue"),width:"100%",justifyContent:"center",marginBottom:12}}
                onClick={()=>u("dateSegments",[...f.dateSegments,{id:iUid(),label:`Phase ${f.dateSegments.length+1}`,startDate:"",endDate:"",notes:""}])}>
                + Add Phase
              </button>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 15px"}}>
                {[["flexDate","Flexible ±3 days"],["overtimeOk","OT / weekend OK"],["permitRequired","Permits / traffic"],["engineeredLiftPlan","Stamped lift plan"]].map(([k,l])=>(
                  <label key={k} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,color:IC.txtM}}>
                    <input type="checkbox" checked={f[k]} onChange={e=>u(k,e.target.checked)} style={{accentColor:IC.accB,width:13,height:13}}/>{l}
                  </label>
                ))}
              </div>
            </div>
          )}
        </CCard>

        {/* ── 6: PHOTOS ── */}
        <CCard sKey="s6" num="6" title="Photos & Asset Tag" badge={f.photos.length?`${f.photos.length} attached`:"None"}>
          <MediaCapture photos={f.photos} onAdd={addPhoto} onRemove={removePhoto}/>
        </CCard>

        {/* ── 7: LABOR ── */}
        <CCard sKey="s7" num="7" title="Labor Requirements"
          badge={f.laborRows.filter(r=>r.regHrs||r.otHrs||r.estDays).length?`${f.laborRows.filter(r=>r.regHrs||r.otHrs||r.estDays).length} roles`:"Not estimated"}
          action={<button style={{...iMkBtn("ghost"),fontSize:10,padding:"3px 9px"}} onClick={e=>{e.stopPropagation();addLaborRow();}}>+ Row</button>}>
          {isMobile ? (
            // ── Mobile: card layout ──
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {f.laborRows.map(r=>(
                <div key={r.id} style={{background:IC.sur2,border:`1px solid ${IC.bdrM}`,borderRadius:6,padding:"10px 12px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <select style={{...iSel,flex:1,marginRight:8}} value={r.role} onChange={e=>updateLabor(r.id,"role",e.target.value)}>
                      {[...I_LABOR_ROLES,"Other"].map(x=><option key={x}>{x}</option>)}
                    </select>
                    {f.laborRows.length>1&&<button style={iMkBtn("danger")} onClick={()=>removeLabor(r.id)}>✕</button>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                    {[["regHrs","Reg Hrs"],["otHrs","OT Hrs"],["estDays","Days"]].map(([k,label])=>(
                      <div key={k}>
                        <div style={{fontSize:10,color:IC.txtS,marginBottom:3,textTransform:"uppercase"}}>{label}</div>
                        <input type="number" style={{...iInpS,width:"100%",boxSizing:"border-box"}} value={r[k]} placeholder="0" onChange={e=>updateLabor(r.id,k,e.target.value)}/>
                      </div>
                    ))}
                  </div>
                  <input style={{...iInpS,width:"100%",boxSizing:"border-box"}} value={r.notes} placeholder="Notes..." onChange={e=>updateLabor(r.id,"notes",e.target.value)}/>
                </div>
              ))}
            </div>
          ) : (
            // ── Desktop: table layout ──
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{borderBottom:`1px solid ${IC.bdr}`}}>
                  {["Role","Reg Hrs","OT Hrs","Est. Days","Notes",""].map((h,i)=>(
                    <th key={i} style={{color:IC.txtS,fontSize:10,fontWeight:600,padding:"4px 8px",textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {f.laborRows.map(r=>(
                    <tr key={r.id} style={{borderBottom:`1px solid ${IC.bdr}`}}>
                      <td style={{padding:"5px 6px",minWidth:100}}>
                        <select style={{...iSel,width:"100%"}} value={r.role} onChange={e=>updateLabor(r.id,"role",e.target.value)}>
                          {[...I_LABOR_ROLES,"Other"].map(x=><option key={x}>{x}</option>)}
                        </select>
                      </td>
                      {["regHrs","otHrs","estDays"].map(k=>(
                        <td key={k} style={{padding:"5px 6px",width:70}}>
                          <input type="number" style={{...iInpS,width:"100%"}} value={r[k]} placeholder="0" onChange={e=>updateLabor(r.id,k,e.target.value)}/>
                        </td>
                      ))}
                      <td style={{padding:"5px 6px"}}><input style={{...iInpS,width:"100%"}} value={r.notes} placeholder="Notes..." onChange={e=>updateLabor(r.id,"notes",e.target.value)}/></td>
                      <td style={{padding:"5px 6px",width:28}}>{f.laborRows.length>1&&<button style={iMkBtn("danger")} onClick={()=>removeLabor(r.id)}>✕</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CCard>

        {/* ── 8: I_EQUIPMENT CHECKLIST ── */}
        <CCard sKey="s8" num="8" title="Equipment Needed"
          badge={`${Object.keys(f.equipChecked).filter(k=>f.equipChecked[k]&&!k.includes("_")).length} selected`}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"0 24px"}}>
            {I_EQ_CATS.map(cat=>(
              <div key={cat} style={{marginBottom:10}}>
                <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:IC.accB,marginBottom:5,paddingBottom:3,borderBottom:`1px solid ${IC.bdr}`}}>{cat}</div>
                {I_EQUIPMENT.filter(e=>e.cat===cat).map(e=>(
                  <div key={e.code} style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                    <input type="checkbox" checked={!!f.equipChecked[e.code]} onChange={()=>toggleEq(e.code)} style={{accentColor:IC.accB,width:13,height:13,flexShrink:0,cursor:"pointer"}}/>
                    <span style={{fontSize:11,color:f.equipChecked[e.code]?IC.txt:IC.txtS,flex:1,lineHeight:1.3}}>{e.name}</span>
                    {e.cap!=="–"&&<span style={{fontSize:10,color:IC.accB,whiteSpace:"nowrap"}}>{e.cap}</span>}
                    {f.equipChecked[e.code]&&(
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <input type="number" value={f[`${e.code}_days`]||""} placeholder="days"
                          style={{...iInpS,width:46,padding:"3px 5px"}}
                          onChange={ev=>setF(p=>({...p,[`${e.code}_days`]:ev.target.value}))}/>
                        <span style={{fontSize:9,color:IC.txtS}}>days</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CCard>

        {/* ── 9: SUBS ── */}
        <CCard sKey="s9" num="9" title="Subcontractors / Rentals / Materials"
          badge={f.subRows.filter(r=>r.vendor).length?`${f.subRows.filter(r=>r.vendor).length} entries`:"None"}
          action={<button style={{...iMkBtn("ghost"),fontSize:10,padding:"3px 9px"}} onClick={e=>{e.stopPropagation();addSubRow();}}>+ Add Row</button>}>
          {isMobile ? (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {f.subRows.map(r=>(
                <div key={r.id} style={{background:IC.sur2,border:`1px solid ${IC.bdrM}`,borderRadius:6,padding:"10px 12px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <select style={{...iSel,flex:1,marginRight:8}} value={r.type} onChange={e=>updateSub(r.id,"type",e.target.value)}>
                      {["Subcontractor","Crane Rental (w/ Operator)","Equipment Rental","Material","Permit","Other"].map(x=><option key={x}>{x}</option>)}
                    </select>
                    {f.subRows.length>1&&<button style={iMkBtn("danger")} onClick={()=>removeSub(r.id)}>✕</button>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:8,marginBottom:8}}>
                    <input style={{...iInpS,width:"100%",boxSizing:"border-box"}} value={r.vendor} placeholder="Vendor or description" onChange={e=>updateSub(r.id,"vendor",e.target.value)}/>
                    <input style={{...iInpS,width:"100%",boxSizing:"border-box"}} value={r.cost} placeholder="$0" onChange={e=>updateSub(r.id,"cost",e.target.value)}/>
                  </div>
                  <input style={{...iInpS,width:"100%",boxSizing:"border-box"}} value={r.notes} placeholder="Notes..." onChange={e=>updateSub(r.id,"notes",e.target.value)}/>
                </div>
              ))}
            </div>
          ) : (
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{borderBottom:`1px solid ${IC.bdr}`}}>
                {["Type","Vendor / Description","Est. Cost","Notes",""].map((h,i)=>(
                  <th key={i} style={{color:IC.txtS,fontSize:10,fontWeight:600,padding:"4px 8px",textAlign:"left"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {f.subRows.map(r=>(
                  <tr key={r.id} style={{borderBottom:`1px solid ${IC.bdr}`}}>
                    <td style={{padding:"5px 6px",width:155}}>
                      <select style={{...iSel,width:"100%"}} value={r.type} onChange={e=>updateSub(r.id,"type",e.target.value)}>
                        {["Subcontractor","Crane Rental (w/ Operator)","Equipment Rental","Material","Permit","Other"].map(x=><option key={x}>{x}</option>)}
                      </select>
                    </td>
                    <td style={{padding:"5px 6px"}}><input style={{...iInpS,width:"100%"}} value={r.vendor} placeholder="Vendor or description" onChange={e=>updateSub(r.id,"vendor",e.target.value)}/></td>
                    <td style={{padding:"5px 6px",width:90}}><input style={{...iInpS,width:"100%"}} value={r.cost} placeholder="$0" onChange={e=>updateSub(r.id,"cost",e.target.value)}/></td>
                    <td style={{padding:"5px 6px"}}><input style={{...iInpS,width:"100%"}} value={r.notes} placeholder="Notes..." onChange={e=>updateSub(r.id,"notes",e.target.value)}/></td>
                    <td style={{padding:"5px 6px",width:28}}>{f.subRows.length>1&&<button style={iMkBtn("danger")} onClick={()=>removeSub(r.id)}>✕</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CCard>

        {/* ── 10: NOTES ── */}
        <CCard sKey="s10" num="10" title="Notes / Special Conditions" badge={f.specialNotes?f.specialNotes.slice(0,50)+(f.specialNotes.length>50?"…":""):"None"}>
          <ILbl c="Customer Notes"/>
          <textarea style={iTa} value={f.specialNotes}
            placeholder="Disconnect responsibilities, union requirements, hazmat, confined space, prior damage, shutdowns..."
            onChange={e=>u("specialNotes",e.target.value)}/>
        </CCard>

        {/* ── 11: INTERNAL ── */}
        <CCard sKey="s11" num="11" title="Internal — Estimator"
          badge={`${f.priority} · ${f.estimator||"Unassigned"}`}
          cardStyle={{borderLeft:`3px solid ${IC.acc}`}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 2fr",gap:"9px 15px"}}>
            <div><ILbl c="Priority"/>
              <select style={{...iSel,width:"100%"}} value={f.priority} onChange={e=>u("priority",e.target.value)}>
                {["Standard","Rush","Future / No Rush"].map(x=><option key={x}>{x}</option>)}
              </select>
            </div>
            <div><ILbl c="Estimator"/><input style={iInp} value={f.estimator} onChange={e=>u("estimator",e.target.value)}/></div>
            <div><ILbl c="Internal Notes"/><input style={iInp} value={f.internalNotes} placeholder="Flags, concerns..." onChange={e=>u("internalNotes",e.target.value)}/></div>
          </div>
        </CCard>

        <div style={{background:IC.sur,border:`1px solid ${IC.bdrM}`,borderRadius:7,padding:"12px 16px",display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:isMobile?"stretch":"center",gap:10,marginBottom:20}}>
          {!isMobile&&<div style={{display:"flex",gap:8}}>
            <button style={iMkBtn("ghost")} onClick={()=>{setF(EMPTY());setGanttData(null);}}>🗑 Clear</button>
            <button style={iMkBtn("ghost")} onClick={()=>setPage("blank")}>🖨 Blank</button>
          </div>}
          <div style={{display:"flex",gap:8,flexDirection:isMobile?"column":"row"}}>
            {isMobile&&<button style={{...iMkBtn("ghost"),justifyContent:"center"}} onClick={()=>{setF(EMPTY());setGanttData(null);}}>🗑 Clear Form</button>}
            <button style={{...iMkBtn("primary"),justifyContent:"center"}} onClick={()=>window.print()}>🖨 Print</button>
            <button style={{...iMkBtn("bright"),justifyContent:"center",padding:isMobile?"14px 20px":"6px 11px",fontSize:isMobile?14:11}} onClick={handleSubmit}>
              Submit &amp; View Gantt ▶
            </button>
          </div>
        </div>


      </div>
    </div>
  );
}


export default function MarioApp() {
  // ── AUTH STATE ──────────────────────────────────────────────
  const [token,      setToken]      = useState(localStorage.getItem("rigpro_token") || "");
  const [currentUser,setCurrentUser]= useState(null);
  const [loginUser,  setLoginUser]  = useState("");
  const [loginPass,  setLoginPass]  = useState("");
  const [loginErr,   setLoginErr]   = useState("");
  const [loading,    setLoading]    = useState(false);

  // ── APP STATE ───────────────────────────────────────────────
  const [view,       setView]       = useState(token ? "dash" : "login");  const [quotes,     setQuotes]     = useState(SAMPLE_QUOTES);
  const [reqs,       setReqs]       = useState(SAMPLE_REQS);
  const [active,     setActive]     = useState(null);
  const [selC,       setSelC]       = useState(null);
  const [search,     setSearch]     = useState("");
  const [showRM,     setShowRM]     = useState(false);
  const [editR,      setEditR]      = useState(null);
  const [showWM,       setShowWM]       = useState(false);
  const [showJSAModal, setShowJSAModal] = useState(false);
  const [adjModal,     setAdjModal]     = useState(null);
  const [copyFrom,     setCopyFrom]     = useState(null);
  const [wonOnly,      setWonOnly]      = useState(false);
  const [customerRates, setCustomerRates] = useState(INIT_CUSTOMER_RATES);
  const [equipment,  setEquipment]  = useState(EQUIPMENT);
  const eqMap  = useMemo(() => { const m={}; equipment.forEach(e=>{m[e.code]=e;}); return m; }, [equipment]);
  const eqLookup = eqMap;
  const eqCats = useMemo(() => [...new Set(equipment.map(e=>e.cat))], [equipment]);
  const [eqOv,       setEqOv]       = useState({});
  const [custData,         setCustData]         = useState(INIT_CUST_DATA);
  const [showCustModal,    setShowCustModal]    = useState(false);
  const [profileTemplate,  setProfileTemplate]  = useState(DEFAULT_PROFILE_TEMPLATE);
  const [showProfileTempl, setShowProfileTempl] = useState(false);
  const [notifs,     setNotifs]     = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const fileRef = useRef();

  // ── PIPELINE STATE ───────────────────────────────────────────
  const [pipelineSettings, setPipelineSettings] = useState({
    rfq_warn_days:    "3",
    rfq_overdue_days: "7",
    quote_warn_days:  "5",
    quote_stale_days: "10",
    pipeline_owner:   "",
  });
  const [intakes,        setIntakes]        = useState([]);
  const [intakeFromReq,  setIntakeFromReq]  = useState(null);

  // ── LOGIN ────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    setLoginErr(""); setLoading(true);
    try {
      const data = await apiFetch("/api/login", {
        method: "POST",
        body: { username: loginUser, password: loginPass },
      });
      localStorage.setItem("rigpro_token", data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      await loadData();
      setView("dash");
    } catch (err) {
      setLoginErr(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("rigpro_token");
    setToken("");
    setCurrentUser(null);
    setView("login");
  }

  // ── LOAD ALL DATA FROM SERVER ────────────────────────────────
  async function loadData() {
    try {
      const data = await apiFetch("/api/data");
      if (data.quotes     && data.quotes.length)     setQuotes(data.quotes);
      if (data.rfqs       && data.rfqs.length)       setReqs(data.rfqs);
      if (data.customers  && Object.keys(data.customers).length) setCustData(data.customers);
      if (data.equipment  && data.equipment.length)  setEquipment(data.equipment);
      if (data.customerRates) setCustomerRates(prev => ({ ...prev, ...data.customerRates }));
      if (data.settings)  setPipelineSettings(prev => ({ ...prev, ...data.settings }));
      if (data.intakes    && data.intakes.length)    setIntakes(data.intakes);
    } catch (err) {
      console.warn("Could not load data from server, using local sample data.", err.message);
    }
  }

  // Load data on mount if already logged in
  useEffect(() => {
    if (token) {
      apiFetch("/api/me").then(u => setCurrentUser(u)).catch(() => {
        handleLogout(); // token expired
      });
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── PERSIST QUOTE TO SERVER ──────────────────────────────────
  async function persistQuote(q) {
    try {
      await apiFetch(`/api/quotes/${q.id}`, { method: "POST", body: q });
    } catch (err) {
      console.warn("Could not save quote to server:", err.message);
    }
  }

  // ── PERSIST RFQ TO SERVER ────────────────────────────────────
  async function persistRfq(r) {
    try {
      await apiFetch(`/api/rfqs/${r.id}`, { method: "POST", body: r });
    } catch (err) {
      console.warn("Could not save RFQ to server:", err.message);
    }
  }

  // ── PERSIST INTAKE TO SERVER ─────────────────────────────────
  async function persistIntake(intake) {
    try {
      await apiFetch(`/api/intakes/${intake.id}`, { method: "POST", body: intake });
    } catch (err) {
      console.warn("Could not save intake to server:", err.message);
    }
  }

  const stats = useMemo(() => {
    const won    = quotes.filter(q => q.status==="Won");
    const sub    = quotes.filter(q => q.status==="Submitted");
    const closed = quotes.filter(q => ["Won","Lost"].includes(q.status));
    return {
      rev:  won.reduce((s,q)=>s+(q.total||0),0),
      pipe: sub.reduce((s,q)=>s+(q.total||0),0),
      wr:   closed.length ? Math.round(won.length/closed.length*100) : 0,
      rn:   reqs.filter(r=>r.status==="New").length,
    };
  }, [quotes, reqs]);

  const customers = useMemo(() => {
    const m = {};
    quotes.forEach(q => { if(!m[q.client]) m[q.client]={name:q.client,quotes:[]}; m[q.client].quotes.push(q); });
    return Object.values(m);
  }, [quotes]);

  function openNew(req=null, isCO=false, parentQ=null) {
    setActive(blankQuote(req, customerRates, isCO, parentQ));
    setCopyFrom(null);
    setView("editor");
  }

  function openEdit(q) {
    setCopyFrom(null);
    const full = q.laborRows ? { ...q } : {
      ...q, markup:q.markup||0,
      laborRows:    defLaborRows(q.client, customerRates),
      travelRows:   [{ id:uid(), label:"First Mobilization", workers:0, days:0, perDiem:false, hotel:false }],
      equipRows:    [{ id:uid(), code:"300", days:0, ship:0, overRate:false, overDaily:840, overNote:"" }],
      haulingRows:  [{ id:uid(), vendor:"", desc:"Transport",    cost:q.hauling||0, markup:0.35 }],
      matRows:      [{ id:uid(), vendor:"", desc:"Misc Hardware", cost:q.mats||0,   markup:0.15 }],
    };
    setActive(full);
    setView("editor");
  }

  function openFromIntake(intake) {
    const q = intakeToQuote(intake, customerRates, eqMap);
    setActive(q);
    setCopyFrom(null);
    setView("editor");
  }

  function applyQuoteCopy(sourceQ) {
    // Deep-copy line item rows with fresh IDs, keep rest of active quote unchanged
    setActive(prev => ({
      ...prev,
      markup:      sourceQ.markup || 0,
      laborRows:   (sourceQ.laborRows  || []).map(r => ({ ...r, id: uid() })),
      travelRows:  (sourceQ.travelRows || []).map(r => ({ ...r, id: uid() })),
      equipRows:   (sourceQ.equipRows  || []).map(r => ({ ...r, id: uid() })),
      haulingRows: (sourceQ.haulingRows|| []).map(r => ({ ...r, id: uid() })),
      matRows:     (sourceQ.matRows    || []).map(r => ({ ...r, id: uid() })),
      copiedFromId: sourceQ.id,
    }));
    setCopyFrom(null);
  }

  function saveAdjustment(quoteId, adj) {
    setQuotes(prev => prev.map(q =>
      q.id === quoteId
        ? { ...q, salesAdjustments: [...(q.salesAdjustments||[]), adj] }
        : q
    ));
  }

  function saveQuote() {
    const cv  = calcQuote(active, customerRates, eqOv, eqMap);
    const upd = { ...active, ...cv };
    if (upd.client) {
      const newRates = {};
      (upd.laborRows||[]).forEach(r => { if(r.special) newRates[r.role]={ reg:Number(r.overReg), ot:Number(r.overOT) }; });
      if (Object.keys(newRates).length > 0) setCustomerRates(prev=>({...prev,[upd.client]:{...(prev[upd.client]||{}),...newRates}}));
    }
    setQuotes(prev => { const ix=prev.findIndex(q=>q.id===upd.id); return ix>=0?prev.map((q,i)=>i===ix?upd:q):[upd,...prev]; });
    if (upd.fromReqId) setReqs(prev=>prev.map(r=>r.id===upd.fromReqId?{...r,status:"Quoted"}:r));
    persistQuote(upd); // ← save to MySQL
    setView("customers");
  }

  function markWon(jn, cd) {
    const upd = { ...active, status:"Won", jobNum:jn, compDate:cd, locked:true };
    const cv  = calcQuote(upd, customerRates, eqOv, eqMap);
    const fin = { ...upd, ...cv };
    setQuotes(prev => { const ix=prev.findIndex(q=>q.id===fin.id); return ix>=0?prev.map((q,i)=>i===ix?fin:q):[fin,...prev]; });
    persistQuote(fin); // ← save to MySQL
    setShowWM(false);
    setActive(fin);
  }

  function submitQuote() {
    const cv  = calcQuote(active, customerRates, eqOv, eqMap);
    const upd = { ...active, ...cv, status:"Submitted" };
    setQuotes(prev => { const ix=prev.findIndex(q=>q.id===upd.id); return ix>=0?prev.map((q,i)=>i===ix?upd:q):[upd,...prev]; });
    setNotifs(p => [{ id:uid(), qn:upd.qn, client:upd.client, total:upd.total, at:new Date().toLocaleTimeString(), status:"Pending" }, ...p]);
    persistQuote(upd); // ← save to MySQL
    setActive(upd);
    setShowNotifs(true);
  }

  function saveReq(req) {
    setReqs(prev => { const ix=prev.findIndex(r=>r.id===req.id); return ix>=0?prev.map((r,i)=>i===ix?req:r):[req,...prev]; });
    persistRfq(req); // ← save to MySQL
    setShowRM(false); setEditR(null);
  }

  // ── AGE BADGE HELPER ─────────────────────────────────────────
  function ageBadge(dateStr, warnDays, overdueDays, warnLabel, overdueLabel) {
    if (!dateStr) return null;
    const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
    if (days >= overdueDays) return { days, bg:C.redB, cl:C.red, bd:`1px solid ${C.red}33`, label:overdueLabel };
    if (days >= warnDays)    return { days, bg:C.yelB, cl:C.yel, bd:`1px solid ${C.yel}33`, label:warnLabel };
    return null;
  }

  const u    = (f,v)       => setActive(q => ({ ...q, [f]:v }));
  const addR = (sec,def)   => setActive(q => ({ ...q, [sec]:[...(q[sec]||[]),{ id:uid(),...def }] }));
  const updR = (sec,id,f,v)=> setActive(q => ({ ...q, [sec]:q[sec].map(r=>r.id===id?{...r,[f]:v}:r) }));
  const delR = (sec,id)    => setActive(q => ({ ...q, [sec]:q[sec].filter(r=>r.id!==id) }));

  const cv      = active ? calcQuote(active, customerRates, eqOv, eqMap) : null;
  const pendN   = notifs.filter(n=>n.status==="Pending").length;
  const actBtns = <ActionBtns onReq={()=>{setEditR(null);setShowRM(true);}} onFromReq={()=>setView("requests")} onNew={()=>openNew()}/>;
  const logoutBtn = <button style={{ ...mkBtn("ghost"), fontSize:11, padding:"4px 10px" }} onClick={handleLogout}>Sign Out</button>;
  const adminBtn  = currentUser?.role === "admin" ? <button style={{ ...mkBtn("outline"), fontSize:11, padding:"4px 10px" }} onClick={()=>setView("admin")}>⚙ Admin</button> : null;

  const NotifPanel = () => (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.3)", zIndex:400, display:"flex", alignItems:"flex-start", justifyContent:"flex-end" }}>
      <div style={{ background:C.sur, width:"100%", maxWidth:360, height:"100vh", overflowY:"auto", boxShadow:"-3px 0 16px rgba(0,0,0,.12)", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.bdr}`, display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:C.sur }}>
          <span style={{ fontWeight:700, fontSize:15 }}>Notifications</span>
          <button onClick={()=>setShowNotifs(false)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.txtS }}>×</button>
        </div>
        <div style={{ flex:1, padding:12, display:"flex", flexDirection:"column", gap:8 }}>
          {notifs.length===0 && <div style={{ textAlign:"center", color:C.txtS, padding:32, fontSize:13 }}>No notifications yet.</div>}
          {notifs.map(n => (
            <div key={n.id} style={{ background:n.status==="Pending"?C.yelB:n.status==="Approved"?C.grnB:C.redB, border:`1px solid ${n.status==="Pending"?C.yelBdr:n.status==="Approved"?C.grnBdr:C.redBdr}`, borderRadius:7, padding:12 }}>
              <div style={{ fontWeight:700, fontSize:13 }}>{n.qn}</div>
              <div style={{ fontSize:12, color:C.txtM }}>{n.client}</div>
              <div style={{ fontSize:12, marginTop:2 }}>Total: {fmt(n.total)}</div>
              <div style={{ fontSize:10, color:C.txtS, marginTop:2 }}>Submitted {n.at}</div>
              <div style={{ display:"flex", gap:5, marginTop:8, alignItems:"center" }}>
                {n.status==="Pending" && <>
                  <button style={{ ...mkBtn("won"),    fontSize:11, padding:"3px 8px" }} onClick={()=>setNotifs(p=>p.map(x=>x.id===n.id?{...x,status:"Approved"}:x))}>Approve</button>
                  <button style={{ ...mkBtn("danger"), fontSize:11, padding:"3px 8px" }} onClick={()=>setNotifs(p=>p.map(x=>x.id===n.id?{...x,status:"Changes Requested"}:x))}>Request Changes</button>
                </>}
                <span style={{ fontSize:11, fontWeight:600, color:n.status==="Pending"?C.yel:n.status==="Approved"?C.grn:C.red }}>{n.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── ADMIN PANEL ────────────────────────────────────────────────────────────
  if (view === "admin") return (
    <AdminPage currentUser={currentUser} onBack={()=>setView("dash")} />
  );

  // ── LOGIN SCREEN ───────────────────────────────────────────────────────────
  if (view === "login") return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif" }}>
      <div style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:10, padding:32, width:"100%", maxWidth:400, boxShadow:"0 8px 30px rgba(0,0,0,.1)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:32, fontWeight:800, color:C.acc, letterSpacing:"-1px" }}>RigPro</div>
          <div style={{ fontSize:13, color:C.txtS, marginTop:4 }}>Shoemaker Rigging & Transport</div>
        </div>
        <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <ILbl c="USERNAME" />
            <input style={inp} value={loginUser} onChange={e=>setLoginUser(e.target.value)} autoFocus required placeholder="Username" />
          </div>
          <div>
            <ILbl c="PASSWORD" />
            <input style={inp} type="password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} required placeholder="Password" />
          </div>
          {loginErr && <div style={{ background:C.redB, border:`1px solid ${C.redBdr}`, borderRadius:6, padding:"8px 12px", fontSize:12, color:C.red }}>{loginErr}</div>}
          <button type="submit" style={{ ...mkBtn("primary"), justifyContent:"center", padding:"11px", fontSize:14 }} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  if (view==="dash") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      {showRM && <ReqModal init={editR} onSave={saveReq} onClose={()=>{setShowRM(false);setEditR(null);}}/>}
      {showNotifs && <NotifPanel/>}
      <Header view={view} setView={setView} extra={
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {currentUser && <span style={{ fontSize:12, color:C.txtM, fontWeight:600 }}>{currentUser.first_name || currentUser.username}</span>}
          <button style={{ ...mkBtn("ghost"), padding:"5px 9px", position:"relative" }} onClick={()=>setShowNotifs(true)}>
            🔔{pendN>0&&<span style={{ position:"absolute", top:-3, right:-3, background:C.red, color:"#fff", borderRadius:"50%", width:15, height:15, fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{pendN}</span>}
          </button>
          {actBtns}
          {adminBtn}
          {logoutBtn}
        </div>
      }/>
      <div style={{ padding:"16px", maxWidth:1160, margin:"0 auto" }}>
        <Card>
          <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
            <div style={{ width:56, height:56, background:C.accL, border:`2px solid ${C.accB}`, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0 }}>⛓</div>
            <div>
              <div style={{ fontSize:20, fontWeight:700 }}>Shoemaker Rigging & Transport LLC</div>
              <div style={{ fontSize:12, color:C.txtS }}>3385 Miller Park Road · Akron, OH 44312</div>
              <div style={{ fontSize:11, color:C.txtS, marginTop:1 }}>Industrial Rigging · Machinery Moving · Heavy Haul Transport</div>
            </div>
            <div style={{ marginLeft:"auto", textAlign:"right" }}>
              <div style={{ fontSize:11, color:C.txtS }}>Estimating System</div>
              <div style={{ fontSize:13, fontWeight:700, color:C.acc }}>RigPro v3.1</div>
            </div>
          </div>
        </Card>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:12 }}>
          {[{ l:"Sales", v:fmt(stats.rev), s:`${quotes.filter(q=>q.status==="Won").length} jobs`, c:C.grn },{ l:"Pipeline", v:fmt(stats.pipe), s:`${quotes.filter(q=>q.status==="Submitted").length} submitted`, c:C.blue },{ l:"Win Rate", v:stats.wr+"%", s:"closed quotes", c:C.acc },{ l:"Open Requests", v:stats.rn, s:"need estimates", c:C.ora }].map(x => (
            <Card key={x.l} style={{ marginBottom:0 }}><div style={{ fontSize:11, color:C.txtS, fontWeight:600, marginBottom:4 }}>{x.l}</div><div style={{ fontSize:24, fontWeight:700, color:x.c }}>{x.v}</div><div style={{ fontSize:11, color:C.txtS, marginTop:2 }}>{x.s}</div></Card>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))", gap:8, marginBottom:12 }}>
          {["Draft","Submitted","Won","Lost"].map(st => { const qs=quotes.filter(q=>q.status===st); const x=SS[st]; return (<div key={st} style={{ background:x.bg, border:`1px solid ${x.bd}`, borderRadius:8, padding:12 }}><div style={{ fontSize:11, fontWeight:600, color:x.cl }}>{st}</div><div style={{ fontSize:20, fontWeight:700, color:x.cl, margin:"2px 0" }}>{qs.length}</div><div style={{ fontSize:11, color:x.cl, opacity:.8 }}>{fmt(qs.reduce((s,q)=>s+(q.total||0),0))}</div></div>); })}
        </div>
        {/* ── SALESMAN TRACKING CHARTS ─────────────────────────────────── */}
        <SalesmanCharts quotes={quotes} reqs={reqs}/>

        {reqs.filter(r=>r.status!=="Quoted").length > 0 && (
          <Card>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:5 }}><Sec c="📋 Pending Requests"/><button style={{ ...mkBtn("ghost"), fontSize:11, padding:"3px 9px" }} onClick={()=>setView("requests")}>View All</button></div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {reqs.filter(r=>r.status!=="Quoted").slice(0,3).map(r => (
                <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 11px", background:C.bg, borderRadius:6, border:`1px solid ${C.bdr}`, flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:140 }}><div style={{ fontWeight:600, fontSize:13 }}>{r.company}</div><div style={{ fontSize:11, color:C.txtS, marginTop:1 }}>{(r.desc||"").slice(0,70)}</div></div>
                  <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}><Badge status={r.status}/><button style={{ ...mkBtn("blue"), padding:"5px 10px", fontSize:11 }} onClick={()=>openNew(r)}>Estimate →</button></div>
                </div>
              ))}
            </div>
          </Card>
        )}
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:5 }}><Sec c="Recent Quotes"/><button style={{ ...mkBtn("ghost"), fontSize:11, padding:"3px 9px" }} onClick={()=>setView("customers")}>View All</button></div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:460 }}>
              <thead><tr>{["Quote #","Client","Description","Date","Status","Total"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
              <tbody>{quotes.slice(0,5).map(q=>(
                <tr key={q.id} style={{ cursor:"pointer" }} onClick={()=>openEdit(q)}>
                  <td style={{ ...tdS, color:C.acc, fontWeight:600, whiteSpace:"nowrap" }}>{q.qn}</td>
                  <td style={tdS}>{q.client}</td>
                  <td style={{ ...tdS, color:C.txtM, maxWidth:180 }}>{q.desc}</td>
                  <td style={{ ...tdS, color:C.txtS, whiteSpace:"nowrap" }}>{q.date}</td>
                  <td style={tdS}><Badge status={q.status}/></td>
                  <td style={{ ...tdS, fontWeight:700, whiteSpace:"nowrap" }}>{fmt(q.total||0)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );

  // ── CUSTOMERS ──────────────────────────────────────────────────────────────
  if (view==="customers") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      {adjModal&&<SalesAdjustmentModal quote={adjModal} onSave={saveAdjustment} onClose={()=>setAdjModal(null)}/>}
      {showCustModal&&<CustomerModal custName={showCustModal} quotes={quotes.filter(q=>q.client===showCustModal)} custData={custData} setCustData={setCustData} profileTemplate={profileTemplate} onOpenQuote={q=>{openEdit(q);}} onClose={()=>setShowCustModal(false)} intakes={intakes}/>}
      {showRM && <ReqModal init={editR} onSave={saveReq} onClose={()=>{setShowRM(false);setEditR(null);}}/>}
      <Header view={view} setView={setView} extra={actBtns}/>
      <div style={{ padding:"14px", maxWidth:1160, margin:"0 auto" }}>
        {selC ? (() => {
          const cQuotes = quotes.filter(q=>q.client===selC&&(!wonOnly||q.status==="Won"));
          const con     = cQuotes.find(q=>q.contactName);
          return (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:12 }}>
                <button style={{ ...mkBtn("ghost"), fontSize:12, padding:"4px 9px" }} onClick={()=>setSelC(null)}>← All Customers</button>
                <div style={{ fontSize:18, fontWeight:700 }}>{selC}</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:12, alignItems:"start" }}>
                <div>
                  <Card>
                    <Sec c="Contact Info"/>
                    {con ? <><div style={{ fontSize:13, fontWeight:600 }}>{con.contactName}</div><div style={{ fontSize:12, color:C.txtM, marginTop:2 }}>{con.contactEmail}</div><div style={{ fontSize:12, color:C.txtM }}>{con.contactPhone}</div></> : <div style={{ fontSize:12, color:C.txtS }}>No contact info yet.</div>}
                    <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.bdr}` }}>
                      <Sec c="Notes"/>
                      <textarea style={{ ...inp, height:90, resize:"vertical" }} placeholder="Add notes about this customer…"/>
                    </div>
                  </Card>
                  <button style={{ ...mkBtn("primary"), width:"100%", justifyContent:"center", marginTop:4 }} onClick={()=>openNew({company:selC})}>+ New Estimate</button>
                </div>
                <div>
                  {cQuotes.map(q => {
                    const isCO = q.isChangeOrder;
                    return (
                      <Card key={q.id} style={{ marginBottom:9 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:7 }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", marginBottom:3 }}>
                              <span style={{ fontWeight:700, color:isCO?C.purp:C.acc, fontSize:12 }}>{q.qn}</span>
                              <Badge status={q.status}/>
                              {isCO && <span style={{ fontSize:11, color:C.purp, fontWeight:600 }}>Change Order</span>}
                              {q.locked && <span style={{ fontSize:11, color:C.grn }}>🔒 Job: {q.jobNum}</span>}
                            </div>
                            <div style={{ fontWeight:600, fontSize:14 }}>{q.desc}</div>
                            <div style={{ fontSize:12, color:C.txtM, marginTop:1 }}>{q.jobSite}</div>
                            <div style={{ display:"flex", gap:8, marginTop:4, flexWrap:"wrap" }}>
                              <span style={{ fontSize:12, color:C.ora }}>Labor: {fmt(q.labor||0)}</span>
                              <span style={{ fontSize:12, color:C.teal }}>Equip: {fmt(q.equip||q.equipment||0)}</span>
                            </div>
                            {(q.attachments||[]).length > 0 && <div style={{ fontSize:11, color:C.txtS, marginTop:2 }}>📎 {q.attachments.length} attachment(s)</div>}
                            {q.locked && <div style={{ fontSize:11, color:C.grn, marginTop:1 }}>Est. completion: {q.compDate||"TBD"}</div>}
                            {(q.salesAdjustments||[]).length > 0 && (
                              <div style={{ marginTop:7, paddingTop:7, borderTop:`1px solid ${C.bdr}` }}>
                                <div style={{ fontSize:10, color:C.txtS, fontWeight:600, textTransform:"uppercase", letterSpacing:.5, marginBottom:5 }}>Sales Adjustments</div>
                                {(q.salesAdjustments||[]).map(a=>(
                                  <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:4, fontSize:11 }}>
                                    <div style={{ flex:1, minWidth:0 }}>
                                      <span style={{ fontWeight:600, color:a.amount>=0?C.grn:C.red, marginRight:5 }}>{a.amount>=0?"+":""}{fmt(a.amount)}</span>
                                      <span style={{ background:a.amount>=0?C.grnB:C.redB, color:a.amount>=0?C.grn:C.red, border:`1px solid ${a.amount>=0?C.grnBdr:C.redBdr}`, borderRadius:3, padding:"1px 5px", fontSize:10, fontWeight:600, marginRight:5 }}>{a.reason}</span>
                                      <span style={{ color:C.txtM }}>{a.note}</span>
                                    </div>
                                    <span style={{ color:C.txtS, whiteSpace:"nowrap", flexShrink:0 }}>{a.date}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            {(() => {
                              const adjSum = (q.salesAdjustments||[]).reduce((s,a)=>s+a.amount,0);
                              const adjTotal = (q.total||0) + adjSum;
                              return (<>
                                <div style={{ fontSize:20, fontWeight:700 }}>{fmt(adjTotal)}</div>
                                {adjSum !== 0 && <div style={{ fontSize:11, color:"#8a93a2", textDecoration:"line-through" }}>{fmt(q.total||0)}</div>}
                                {adjSum !== 0 && <div style={{ fontSize:11, fontWeight:600, color:adjSum>0?"#16a34a":"#dc2626" }}>{adjSum>0?"+":""}{fmt(adjSum)} adj.</div>}
                              </>);
                            })()}
                            <div style={{ display:"flex", gap:4, marginTop:5, justifyContent:"flex-end", flexWrap:"wrap" }}>
                              {!q.locked && <button style={{ ...mkBtn("outline"), padding:"3px 8px", fontSize:11 }} onClick={()=>openEdit(q)}>Edit</button>}
                              {q.status==="Won" && !isCO && <button style={{ ...mkBtn("ghost"), padding:"3px 8px", fontSize:11 }} onClick={()=>openNew({company:q.client,jobSite:q.jobSite},true,q)}>+ Change Order</button>}
                              {q.status==="Won" && <button style={{ background:"#eff6ff",color:"#2563eb",border:"1px solid #bfdbfe",borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }} onClick={()=>setAdjModal(q)}>$ Sales Adjustment</button>}
                              {!q.locked && <button style={{ ...mkBtn("danger"), padding:"3px 7px", fontSize:11 }} onClick={()=>setQuotes(p=>p.filter(x=>x.id!==q.id))}>✕</button>}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          );
        })() : (
          <>
            {showProfileTempl && <ProfileTemplateModal template={profileTemplate} setTemplate={setProfileTemplate} onClose={()=>setShowProfileTempl(false)}/>}
            <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
              <input style={{ ...inp, width:220, flex:"0 0 auto" }} placeholder="Search customers…" value={search} onChange={e=>setSearch(e.target.value)}/>
              <button style={{ ...mkBtn(wonOnly?"primary":"ghost"), fontSize:11, padding:"6px 12px", whiteSpace:"nowrap" }} onClick={()=>setWonOnly(w=>!w)}>🏆 {wonOnly?"All Quotes":"Won Quotes"}</button>
              <button style={{ ...mkBtn("ghost"), fontSize:11, padding:"6px 12px", whiteSpace:"nowrap" }} onClick={()=>setShowProfileTempl(true)}>⚙ Edit Profile Template</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:10 }}>
              {customers.filter(c=>!search||c.name.toLowerCase().includes(search.toLowerCase())).map(c => {
                const displayQuotes = wonOnly ? c.quotes.filter(q=>q.status==="Won") : c.quotes;
                const won = c.quotes.filter(q=>q.status==="Won");
                const tot = wonOnly ? won.reduce((s,q)=>s+(q.total||0)+((q.salesAdjustments||[]).reduce((ss,a)=>ss+a.amount,0)),0) : c.quotes.reduce((s,q)=>s+(q.total||0),0);
                return (
                  <Card key={c.name} style={{ cursor:"pointer", marginBottom:0 }} onClick={()=>setSelC(c.name)}>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{c.name}</div>
                    <div style={{ fontSize:12, color:C.txtS, marginBottom:6 }}>{c.quotes.length} quote(s) · {won.length} won</div>
                    <div style={{ fontSize:18, fontWeight:700, color:C.acc, marginBottom:5 }}>{fmt(tot)}</div>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:9 }}>{displayQuotes.slice(0,4).map(q=><Badge key={q.id} status={q.status}/>)}</div>
                    <div style={{ display:"flex", gap:6, borderTop:`1px solid ${C.bdr}`, paddingTop:9 }}>
                      <button style={{ ...mkBtn("outline"), fontSize:11, padding:"4px 9px", flex:1, justifyContent:"center" }} onClick={e=>{e.stopPropagation();setSelC(c.name);}}>View Quotes</button>
                      <button style={{ ...mkBtn("primary"), fontSize:11, padding:"4px 9px", flex:1, justifyContent:"center" }} onClick={e=>{e.stopPropagation();setShowCustModal(c.name);}}>Profile</button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ── REQUESTS ───────────────────────────────────────────────────────────────
  if (view==="requests") {
    const warnDays    = Number(pipelineSettings.rfq_warn_days    || 3);
    const overdueDays = Number(pipelineSettings.rfq_overdue_days || 7);
    const sortedReqs  = [...reqs].sort((a, b) => {
      const dA = Math.floor((Date.now() - new Date(a.date)) / 86400000);
      const dB = Math.floor((Date.now() - new Date(b.date)) / 86400000);
      const critA = dA >= overdueDays ? 2 : dA >= warnDays ? 1 : 0;
      const critB = dB >= overdueDays ? 2 : dB >= warnDays ? 1 : 0;
      if (critB !== critA) return critB - critA;
      return new Date(a.date) - new Date(b.date);
    });
    const overdueCount = sortedReqs.filter(r => {
      const d = Math.floor((Date.now()-new Date(r.date))/86400000);
      return d >= overdueDays;
    }).length;
    return (
      <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
        {showRM && <ReqModal init={editR} onSave={saveReq} onClose={()=>{setShowRM(false);setEditR(null);}}/>}
        <Header view={view} setView={setView} extra={actBtns}/>
        <div style={{ padding:"14px", maxWidth:1160, margin:"0 auto" }}>
          <div style={{ marginBottom:14, display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:700 }}>Quote Requests</div>
              <div style={{ fontSize:12, color:C.txtS }}>Incoming RFQs — every request needs a quote</div>
            </div>
            {overdueCount > 0 && (
              <div style={{ background:C.redB, border:`1px solid ${C.red}`, borderRadius:7, padding:"8px 14px", display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:16 }}>🔴</span>
                <span style={{ fontSize:13, fontWeight:700, color:C.red }}>
                  {overdueCount} overdue request{overdueCount>1?"s":""} — need quotes immediately
                </span>
              </div>
            )}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {sortedReqs.map(r => {
              const badge = ageBadge(r.date, warnDays, overdueDays, "🟡 NEEDS QUOTE", "🔴 OVERDUE");
              return (
                <Card key={r.id} style={{ marginBottom:0, borderLeft: badge ? `3px solid ${badge.cl}` : `3px solid ${C.bdr}` }}>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-start" }}>
                    <div style={{ flex:1, minWidth:200 }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:3 }}>
                        <span style={{ fontWeight:700, color:C.acc, fontSize:12 }}>{r.rn}</span>
                        <Badge status={r.status}/>
                        <span style={{ fontSize:11, color:C.txtS }}>{r.date}</span>
                        {badge && (
                          <span style={{ background:badge.bg, color:badge.cl, border:badge.bd, borderRadius:4, padding:"1px 8px", fontSize:10, fontWeight:700 }}>
                            {badge.label} · {badge.days}d
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight:700, fontSize:15 }}>{r.company}</div>
                      {r.jobSite   && <div style={{ fontSize:12, color:C.txtM, marginTop:1 }}>📍 {r.jobSite}</div>}
                      {r.requester && <div style={{ fontSize:12, color:C.txtM }}>Contact: {r.requester}{r.phone?" · "+r.phone:""}</div>}
                      <div style={{ fontSize:12, color:C.txtM, marginTop:3 }}>{r.desc}</div>
                      {r.salesAssoc && <div style={{ fontSize:11, color:C.txtS, marginTop:3 }}>Sales: <strong>{r.salesAssoc}</strong></div>}
                    </div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                      <button style={{ ...mkBtn("ghost"),   fontSize:11, padding:"4px 9px" }} onClick={()=>{setEditR(r);setShowRM(true);}}>Edit</button>
                      <button style={{ ...mkBtn("outline"), fontSize:11, padding:"4px 9px" }} onClick={()=>{ setIntakeFromReq(r); setView("intake"); }}>📋 Build Intake</button>
                      <button style={{ ...mkBtn("blue"),    fontSize:11, padding:"4px 9px" }} onClick={()=>openNew(r)}>Create Estimate →</button>
                      <button style={{ ...mkBtn("danger"),  fontSize:11, padding:"4px 9px" }} onClick={()=>setReqs(p=>p.filter(x=>x.id!==r.id))}>Delete</button>
                    </div>
                  </div>
                </Card>
              );
            })}
            {reqs.length===0 && <Card style={{ textAlign:"center", color:C.txtS, padding:40 }}>No requests yet.</Card>}
          </div>
        </div>
      </div>
    );
  }

  // ── QUOTES / PIPELINE ──────────────────────────────────────────────────────
  if (view==="quotes") {
    const warnDays   = Number(pipelineSettings.quote_warn_days    || 5);
    const staleDays  = Number(pipelineSettings.quote_stale_days   || 10);
    const rfqWarn    = Number(pipelineSettings.rfq_warn_days      || 3);
    const rfqOverdue = Number(pipelineSettings.rfq_overdue_days   || 7);

    const STAGES = [
      { key:"Intake",    label:"Intake",    color:C.blue,  bg:C.bluB  },
      { key:"Submitted", label:"Submitted", color:C.yel,   bg:C.yelB  },
      { key:"Won",       label:"Won",       color:C.grn,   bg:C.grnB  },
      { key:"Lost",      label:"Lost",      color:C.red,   bg:C.redB  },
      { key:"Draft",     label:"Draft",     color:C.txtS,  bg:C.sur2  },
    ];

    const byStage   = STAGES.map(s => ({
      ...s,
      count: quotes.filter(q => q.status===s.key).length,
      value: quotes.filter(q => q.status===s.key).reduce((sum,q) => sum+(q.total||0), 0),
    }));
    const totalPipe = byStage.filter(s=>["Intake","Submitted"].includes(s.key)).reduce((s,b)=>s+b.value,0);
    const totalWon  = byStage.find(s=>s.key==="Won")?.value || 0;
    const maxVal    = Math.max(...byStage.map(b=>b.value), 1);
    const openRfqs  = reqs.filter(r=>r.status!=="Quoted");
    const needsFollowUp = quotes.filter(q => {
      if (q.status!=="Submitted") return false;
      return Math.floor((Date.now()-new Date(q.date))/86400000) >= warnDays;
    }).length;
    const overdueRfqs = openRfqs.filter(r =>
      Math.floor((Date.now()-new Date(r.date))/86400000) >= rfqOverdue
    ).length;

    // Local UI state — defined with useState inside the if block via a wrapper component
    function QuotesPage() {
      const [qFilter,  setQFilter]  = useState("All");
      const [qSearch,  setQSearch]  = useState("");
      const [selQuote, setSelQuote] = useState(null);

      const filteredQ = quotes.filter(q => {
        const matchStage  = qFilter==="All" || q.status===qFilter;
        const matchSearch = !qSearch || [q.qn,q.client,q.desc,q.jobSite,q.salesAssoc].some(f=>(f||"").toLowerCase().includes(qSearch.toLowerCase()));
        return matchStage && matchSearch;
      }).sort((a,b) => {
        const scoreQ = q => {
          if (q.status!=="Submitted") return 0;
          const d = Math.floor((Date.now()-new Date(q.date))/86400000);
          return d >= staleDays ? 2 : d >= warnDays ? 1 : 0;
        };
        return scoreQ(b)-scoreQ(a) || new Date(b.date)-new Date(a.date);
      });

      return (
        <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
          <Header view={view} setView={setView} extra={<div style={{display:"flex",gap:6,alignItems:"center"}}>{currentUser&&<span style={{fontSize:12,color:C.txtM,fontWeight:600}}>{currentUser.first_name||currentUser.username}</span>}{actBtns}{adminBtn}{logoutBtn}</div>}/>
          <div style={{ padding:"14px", maxWidth:1260, margin:"0 auto" }}>

            {/* Action Required alerts */}
            {(needsFollowUp>0||overdueRfqs>0) && (
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
                {overdueRfqs>0 && (
                  <div onClick={()=>setView("requests")} style={{ cursor:"pointer", background:C.redB, border:`1px solid ${C.red}`, borderRadius:7, padding:"9px 16px", display:"flex", alignItems:"center", gap:8, flex:1, minWidth:220 }}>
                    <span style={{ fontSize:18 }}>🔴</span>
                    <div>
                      <div style={{ fontWeight:700, color:C.red, fontSize:13 }}>{overdueRfqs} Overdue RFQ{overdueRfqs>1?"s":""}</div>
                      <div style={{ fontSize:11, color:C.txtS }}>Click to view Requests →</div>
                    </div>
                  </div>
                )}
                {needsFollowUp>0 && (
                  <div onClick={()=>setQFilter("Submitted")} style={{ cursor:"pointer", background:C.yelB, border:`1px solid ${C.yel}`, borderRadius:7, padding:"9px 16px", display:"flex", alignItems:"center", gap:8, flex:1, minWidth:220 }}>
                    <span style={{ fontSize:18 }}>🟡</span>
                    <div>
                      <div style={{ fontWeight:700, color:C.yel, fontSize:13 }}>{needsFollowUp} Quote{needsFollowUp>1?"s":""} Need Follow-Up</div>
                      <div style={{ fontSize:11, color:C.txtS }}>Click to filter Submitted →</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dashboard: chart + stats */}
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14, marginBottom:14 }}>
              <Card style={{ marginBottom:0 }}>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:15, fontWeight:700 }}>Pipeline Overview</div>
                  <div style={{ fontSize:11, color:C.txtS, marginTop:2 }}>
                    Active: <strong style={{ color:C.acc }}>{fmt(totalPipe)}</strong> · Won YTD: <strong style={{ color:C.grn }}>{fmt(totalWon)}</strong>
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {byStage.map(s => (
                    <div key={s.key} onClick={()=>setQFilter(s.key)} style={{ cursor:"pointer" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <div style={{ width:10, height:10, borderRadius:2, background:s.color }}/>
                          <span style={{ fontSize:12, fontWeight:600, color:qFilter===s.key?s.color:C.txtM }}>{s.label}</span>
                          <span style={{ fontSize:11, color:C.txtS }}>{s.count} quote{s.count!==1?"s":""}</span>
                        </div>
                        <span style={{ fontSize:13, fontWeight:700, color:s.color }}>{fmt(s.value)}</span>
                      </div>
                      <div style={{ height:10, background:C.sur2, borderRadius:5, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${(s.value/maxVal)*100}%`, background:s.color, borderRadius:5, transition:"width .3s", minWidth:s.count>0?4:0 }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {[
                  { label:"Active Pipeline",  value:fmt(totalPipe), color:C.acc  },
                  { label:"Won YTD",          value:fmt(totalWon),  color:C.grn  },
                  { label:"Open RFQs",        value:openRfqs.length, color:C.blue },
                  { label:"Win Rate", value:(()=>{ const cl=quotes.filter(q=>["Won","Lost"].includes(q.status)); return cl.length?Math.round(quotes.filter(q=>q.status==="Won").length/cl.length*100)+"%":"—"; })(), color:C.teal },
                ].map(stat=>(
                  <Card key={stat.label} style={{ marginBottom:0, padding:"14px 16px" }}>
                    <div style={{ fontSize:11, color:C.txtS, marginBottom:4, textTransform:"uppercase", letterSpacing:.5 }}>{stat.label}</div>
                    <div style={{ fontSize:22, fontWeight:700, color:stat.color }}>{stat.value}</div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Pipeline list */}
            <Card>
              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:14, flexWrap:"wrap" }}>
                <div style={{ display:"flex", gap:0, borderRadius:6, overflow:"hidden", border:`1px solid ${C.bdr}` }}>
                  {["All",...STAGES.map(s=>s.key)].map(f=>(
                    <button key={f} onClick={()=>setQFilter(f)}
                      style={{ background:qFilter===f?C.acc:"transparent", color:qFilter===f?"#fff":C.txtM, border:"none", padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", borderRight:`1px solid ${C.bdr}`, whiteSpace:"nowrap" }}>
                      {f}{f!=="All"?" ("+(quotes.filter(q=>q.status===f).length)+")":""}
                    </button>
                  ))}
                </div>
                <input style={{ ...inp, flex:1, minWidth:160, fontSize:12 }}
                  placeholder="Search customer, quote #, description..."
                  value={qSearch} onChange={e=>setQSearch(e.target.value)}/>
                <button style={{ ...mkBtn("primary"), fontSize:11 }} onClick={()=>openNew()}>+ New Estimate</button>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {filteredQ.map(q => {
                  const adjTotal  = (q.total||0)+(q.salesAdjustments||[]).reduce((s,a)=>s+a.amount,0);
                  const stageCfg  = STAGES.find(s=>s.key===q.status)||STAGES[STAGES.length-1];
                  const badge     = q.status==="Submitted" ? ageBadge(q.date, warnDays, staleDays, "🟡 FOLLOW UP", "🔴 STALE") : null;
                  const isOpen    = selQuote?.id===q.id;
                  return (
                    <div key={q.id} onClick={()=>setSelQuote(isOpen?null:q)}
                      style={{ background:isOpen?C.accL:C.sur2, border:`1px solid ${isOpen?C.accB:C.bdr}`,
                        borderLeft:`3px solid ${stageCfg.color}`, borderRadius:6, padding:"10px 12px",
                        cursor:"pointer", transition:"background .15s" }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                        <span style={{ fontWeight:700, color:C.acc, fontSize:12, whiteSpace:"nowrap" }}>{q.qn}</span>
                        <span style={{ background:stageCfg.bg, color:stageCfg.color, border:`1px solid ${stageCfg.color}33`, borderRadius:3, padding:"1px 7px", fontSize:10, fontWeight:700 }}>{q.status}</span>
                        {badge && <span style={{ background:badge.bg, color:badge.cl, border:badge.bd, borderRadius:3, padding:"1px 7px", fontSize:10, fontWeight:700 }}>{badge.label} · {badge.days}d</span>}
                        <span style={{ fontWeight:600, fontSize:13, flex:1 }}>{q.client}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:stageCfg.color, whiteSpace:"nowrap" }}>{fmt(adjTotal)}</span>
                      </div>
                      <div style={{ display:"flex", gap:12, marginTop:4, flexWrap:"wrap" }}>
                        <span style={{ fontSize:12, color:C.txtM }}>{q.desc}</span>
                        {q.jobSite && <span style={{ fontSize:11, color:C.txtS }}>📍 {q.jobSite}</span>}
                        <span style={{ fontSize:11, color:C.txtS }}>{q.date}</span>
                        {q.salesAssoc && <span style={{ fontSize:11, color:C.txtS }}>👤 {q.salesAssoc}</span>}
                      </div>
                      {isOpen && (
                        <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.bdr}` }} onClick={e=>e.stopPropagation()}>
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                            <button style={{ ...mkBtn("outline"), fontSize:11, padding:"4px 10px" }} onClick={()=>{ openEdit(q); setView("editor"); }}>✏️ Open Estimate</button>
                            <button style={{ ...mkBtn("blue"),    fontSize:11, padding:"4px 10px" }} onClick={()=>{ setIntakeFromReq(null); setView("intake"); }}>📋 {q.intake_id?"View Intake":"Build Intake"}</button>
                          {q.intake_id && intakes.find(i=>i.id===q.intake_id) && (
                            <button style={{ ...mkBtn("primary"), fontSize:11, padding:"4px 10px" }} onClick={()=>openFromIntake(intakes.find(i=>i.id===q.intake_id))}>📄 Build Estimate →</button>
                          )}
                            {q.status==="Submitted" && (
                              <button style={{ ...mkBtn("won"), fontSize:11, padding:"4px 10px" }} onClick={()=>{ openEdit(q); setView("editor"); setShowWM(true); }}>🏆 Mark Won</button>
                            )}
                            {q.status==="Submitted" && (
                              <div style={{ display:"flex", gap:6, alignItems:"center", marginLeft:"auto" }}>
                                <span style={{ fontSize:11, color:C.txtS }}>Follow-up:</span>
                                <input type="date" style={{ ...inp, width:140, fontSize:11, padding:"3px 7px" }}
                                  value={q.follow_up_date||""}
                                  onClick={e=>e.stopPropagation()}
                                  onChange={e=>{ const upd={...q,follow_up_date:e.target.value}; setQuotes(prev=>prev.map(x=>x.id===q.id?upd:x)); persistQuote(upd); }}/>
                              </div>
                            )}
                          </div>
                          <div style={{ display:"flex", gap:14, marginTop:10, flexWrap:"wrap" }}>
                            {[["Labor",q.labor],["Equipment",q.equip],["Hauling",q.hauling],["Travel",q.travel],["Materials",q.mats]].map(([l,v])=>v>0&&(
                              <div key={l} style={{ fontSize:11, color:C.txtS }}>{l}: <strong style={{ color:C.txtM }}>{fmt(v)}</strong></div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredQ.length===0 && (
                  <div style={{ textAlign:"center", color:C.txtS, padding:"40px 20px", fontSize:13 }}>
                    {qSearch?"No quotes match your search.":`No ${qFilter==="All"?"":qFilter+" "}quotes yet.`}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      );
    }
    return <QuotesPage/>;
  }

  // ── INTAKE FORM ────────────────────────────────────────────────────────────
  if (view==="intake") return (
    <IntakeFormWrapper
      initReq={intakeFromReq}
      pipelineOwner={pipelineSettings.pipeline_owner || "Scott DeMuesy"}
      onSave={(intake) => {
        const newIntake = { ...intake, id: intake.id || Math.random().toString(36).slice(2,10) };
        setIntakes(prev => [newIntake, ...prev.filter(x => x.id !== newIntake.id)]);
        persistIntake(newIntake);
        if (intakeFromReq) {
          setReqs(prev => prev.map(r => r.id===intakeFromReq.id ? {...r, status:"In Progress", intake_id: newIntake.id} : r));
        }
      }}
      onBuildEstimate={(intake) => {
        openFromIntake(intake);
      }}
      onBack={() => setView(intakeFromReq ? "requests" : "quotes")}
    />
  );

  // ── EQUIPMENT RATES ────────────────────────────────────────────────────────
  if (view==="equipment") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      <Header view={view} setView={setView} extra={actBtns}/>
      <EquipmentPage equipment={equipment} setEquipment={setEquipment} eqCats={eqCats} eqMap={eqMap} eqOv={eqOv} setEqOv={setEqOv}/>
    </div>
  );

  // ── LABOR RATES ────────────────────────────────────────────────────────────
  if (view==="labor") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      <Header view={view} setView={setView} extra={actBtns}/>
      <LaborRatesPage customerRates={customerRates} setCustomerRates={setCustomerRates}/>
    </div>
  );

  // ── CALENDAR ──────────────────────────────────────────────────────────────
  if (view==="calendar") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      <Header view={view} setView={setView} extra={actBtns}/>
      <CalendarPage quotes={quotes} setQuotes={setQuotes} eqMap={eqMap} onOpenQuote={q=>{ openEdit(q); setView("editor"); }}/>
    </div>
  );

  // ── JOBS / SALES ──────────────────────────────────────────────────────────
  if (view==="jobs") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      <Header view={view} setView={setView} extra={<div style={{display:"flex",gap:6,alignItems:"center"}}>{currentUser&&<span style={{fontSize:12,color:C.txtM,fontWeight:600}}>{currentUser.first_name||currentUser.username}</span>}{actBtns}{adminBtn}{logoutBtn}</div>}/>
      <JobsPage quotes={quotes} reqs={reqs} setQuotes={setQuotes} eqMap={eqMap} onOpenQuote={q=>{ openEdit(q); setView("editor"); }}/>
    </div>
  );

  // ── EDITOR ─────────────────────────────────────────────────────────────────
  if (view==="editor" && active) {
    function handleClientChange(val) {
      u("client", val);
      const c = customerRates[val];
      if (c) setActive(q => ({ ...q, client:val, laborRows:(q.laborRows||[]).map(r => { const rc=c[r.role]; return rc?{...r,special:true,overReg:rc.reg,overOT:rc.ot,note:"Special rate"}:{...r,special:false}; }) }));
      else setActive(q => ({ ...q, client:val, laborRows:(q.laborRows||[]).map(r => ({ ...r, special:false })) }));
    }

    const SummaryPanel = () => (
      <Card>
        <Sec c="Estimate Summary"/>
        <div style={{ fontSize:12, color:C.txtM, marginBottom:2 }}>{active.qn} · {active.date} · {active.qtype}{active.isChangeOrder?" · Change Order":""}</div>
        <button 
          onClick={() => setShowJSAModal(true)} 
          style={{ width: "100%", background: active.jsaData ? C.grnB : C.sur, color: active.jsaData ? C.grn : C.txtM, border: `1px solid ${active.jsaData ? C.grnBdr : C.bdr}`, borderRadius: 6, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, transition: "all 0.1s" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>🛡️</span> {active.jsaData ? "JSA Completed" : "Conduct JSA"}
          </span>
          {active.jsaData ? <span style={{ color: C.grn }}>✓</span> : <span style={{ color: C.acc, fontSize: 10 }}>REQUIRED</span>}
        </button>
        {[{ l:"Labor",v:cv.labor,c:C.ora },{ l:"Travel",v:cv.travel,c:C.blue },{ l:"Equipment",v:cv.equip,c:C.teal },{ l:"Hauling",v:cv.hauling,c:C.purp },{ l:"Materials",v:cv.mats,c:C.lime }].map(x => (
          <div key={x.l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${C.bdr}` }}>
            <span style={{ color:C.txtM, fontSize:13 }}>{x.l}</span>
            <span style={{ color:x.c, fontWeight:700, fontSize:13 }}>{fmt(x.v)}</span>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.bdr}` }}>
          <span style={{ color:C.txtM, fontSize:13 }}>Subtotal</span>
          <span style={{ fontSize:13, fontWeight:600 }}>{fmt(cv.sub)}</span>
        </div>
        <div style={{ padding:"6px 0", borderBottom:`1px solid ${C.bdr}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <span style={{ color:C.txtM, fontSize:13 }}>Markup</span>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <input style={{ ...inp, width:48, textAlign:"right" }} type="number" step={1} min={0} max={100} value={Math.round((active.markup||0)*100)} onChange={e=>u("markup",Number(e.target.value)/100)}/>
              <span style={{ fontSize:11, color:C.txtS }}>%</span>
              <span style={{ fontSize:13, fontWeight:600, minWidth:60, textAlign:"right" }}>{fmt(cv.muAmt)}</span>
            </div>
          </div>
          <input type="range" min={0} max={50} step={1} value={Math.round((active.markup||0)*100)} onChange={e=>u("markup",Number(e.target.value)/100)} style={{ width:"100%", accentColor:C.acc }}/>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.txtS, marginTop:2 }}><span>0%</span><span>25%</span><span>50%</span></div>
        </div>
        <div style={{ background:C.accL, border:`1.5px solid ${C.accB}`, borderRadius:7, padding:14, marginTop:10 }}>
          <div style={{ fontSize:10, color:C.acc, letterSpacing:1, fontWeight:700, marginBottom:2 }}>TOTAL ESTIMATE</div>
          <div style={{ fontSize:30, fontWeight:700, color:C.acc }}>{fmt(cv.total)}</div>
        </div>
        <div style={{ background:cv.np>=0?C.grnB:C.redB, border:`1px solid ${cv.np>=0?C.grnBdr:C.redBdr}`, borderRadius:7, padding:12, marginTop:8 }}>
          <div style={{ fontSize:10, color:cv.np>=0?C.grn:C.red, letterSpacing:1, fontWeight:700, marginBottom:2 }}>EST. NET PROFIT</div>
          <div style={{ fontSize:22, fontWeight:700, color:cv.np>=0?C.grn:C.red }}>{fmt(cv.np)}</div>
          <div style={{ fontSize:11, color:cv.np>=0?C.grn:C.red, marginTop:1, opacity:.8 }}>{cv.nm.toFixed(1)}% margin</div>
        </div>
        <CostBar labor={cv.labor} travel={cv.travel} equip={cv.equip} hauling={cv.hauling} mats={cv.mats}/>
        {!active.locked && <>
          <button style={{ ...mkBtn("primary"), width:"100%", padding:"9px 0", marginTop:12, fontSize:13, justifyContent:"center" }} onClick={saveQuote}>💾 Save Quote</button>
          <button style={{ ...mkBtn("blue"),    width:"100%", padding:"8px 0", marginTop:5,  fontSize:13, justifyContent:"center" }} onClick={submitQuote}>📤 Submit for Review</button>
          <button style={{ ...mkBtn("won"),     width:"100%", padding:"8px 0", marginTop:5,  fontSize:13, justifyContent:"center" }} onClick={()=>setShowWM(true)}>✓ Mark as Won</button>
        </>}
        {active.locked && (
          <div style={{ marginTop:12 }}>
            <div style={{ padding:"8px 10px", background:C.grnB, border:`1px solid ${C.grnBdr}`, borderRadius:6, fontSize:12, color:C.grn, marginBottom:6 }}>
              🔒 Locked · Job {active.jobNum} · Complete by {active.compDate||"TBD"}
            </div>
            <button style={{ ...mkBtn("blue"), width:"100%", justifyContent:"center", padding:"8px 0" }}
              onClick={()=>setAdjModal(active)}>
              $ Sales Adjustment
            </button>
            {(active.salesAdjustments||[]).length > 0 && (
              <div style={{ marginTop:8, padding:"8px 10px", background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:6 }}>
                <div style={{ fontSize:10, color:C.txtS, fontWeight:600, textTransform:"uppercase", letterSpacing:.5, marginBottom:5 }}>Adjustments</div>
                {(active.salesAdjustments||[]).map(a=>(
                  <div key={a.id} style={{ fontSize:11, marginBottom:3 }}>
                    <span style={{ fontWeight:700, color:a.amount>=0?C.grn:C.red }}>{a.amount>=0?"+":""}{fmt(a.amount)}</span>
                    <span style={{ background:a.amount>=0?C.grnB:C.redB, color:a.amount>=0?C.grn:C.red, border:`1px solid ${a.amount>=0?C.grnBdr:C.redBdr}`, borderRadius:3, padding:"1px 5px", fontSize:10, fontWeight:600, margin:"0 5px" }}>{a.reason}</span>
                    <span style={{ color:C.txtM }}>{a.note}</span>
                  </div>
                ))}
                <div style={{ borderTop:`1px solid ${C.bdr}`, marginTop:6, paddingTop:6, fontSize:12, fontWeight:700, color:C.acc }}>
                  Adjusted Total: {fmt((active.total||0)+(active.salesAdjustments||[]).reduce((s,a)=>s+a.amount,0))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    );

    return (
      <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
        {adjModal&&<SalesAdjustmentModal quote={adjModal} onSave={saveAdjustment} onClose={()=>setAdjModal(null)}/>}
        {showWM && <WonModal quote={active} onSave={markWon} onClose={()=>setShowWM(false)}/>}
        {showJSAModal && <JSAWizardModal quote={active} onSave={(jsa) => { u("jsaData", jsa); setShowJSAModal(false); }} onClose={() => setShowJSAModal(false)} />}
        <Header view={view} setView={setView} crumb={active.qn+(active.isChangeOrder?" (CO)":"")} extra={
          <div style={{ display:"flex", gap:5 }}>
            <button style={mkBtn("ghost")} onClick={()=>setView("customers")}>Cancel</button>
            {!active.locked && <button style={mkBtn("primary")} onClick={saveQuote}>Save Quote</button>}
          </div>
        }/>
        <div style={{ padding:"14px", maxWidth:1160, margin:"0 auto" }}>
          {active.fromReqId    && <div style={{ background:C.bluB, border:`1px solid ${C.bluBdr}`, borderRadius:6, padding:"8px 12px", marginBottom:10, fontSize:12, color:C.blue }}>📋 Pre-filled from a Quote Request.</div>}
          {active.isChangeOrder && <div style={{ background:"#f5f3ff", border:"1px solid #ddd6fe", borderRadius:6, padding:"8px 12px", marginBottom:10, fontSize:12, color:"#6d28d9" }}>📝 Change Order — linked to original won quote.</div>}
          {active.locked       && <div style={{ background:C.yelB, border:`1px solid ${C.yelBdr}`, borderRadius:6, padding:"8px 12px", marginBottom:10, fontSize:12, color:C.yel }}>🔒 This quote is locked. View only.</div>}

          {/* ── Copy from Previous Quote ─────────────────────────────────────── */}
          {!active.locked && (() => {
            const prevQ = active.copiedFromId
              ? quotes.find(q => q.id === active.copiedFromId)
              : null;
            const searchQ = copyFrom?.search || "";
            const filteredQ = quotes
              .filter(q => q.id !== active.id)
              .filter(q =>
                !searchQ ||
                [q.qn, q.client, q.desc, q.jobSite].some(x =>
                  x?.toLowerCase().includes(searchQ.toLowerCase())
                )
              )
              .slice(0, 12);

            return (
              <Card style={{ marginBottom: 10, border: `1.5px solid ${C.bluBdr}`, background: C.bluB }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: prevQ || copyFrom ? 12 : 0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:16 }}>📋</span>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, color:C.blue }}>Copy from Previous Quote</div>
                      <div style={{ fontSize:11, color:C.txtS, marginTop:1 }}>
                        {prevQ ? `Pricing copied from ${prevQ.qn}` : "Import line items & pricing from an existing estimate"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    {prevQ && (
                      <button onClick={() => setActive(p => ({ ...p, copiedFromId: null }))}
                        style={{ ...mkBtn("ghost"), fontSize:11, padding:"3px 8px" }}>
                        ✕ Clear
                      </button>
                    )}
                    <button
                      onClick={() => setCopyFrom(copyFrom ? null : { search:"" })}
                      style={{ ...mkBtn(copyFrom ? "blue" : "outline"), fontSize:11, padding:"5px 11px" }}>
                      {copyFrom ? "✕ Cancel" : prevQ ? "↩ Change Source" : "Select Quote to Copy"}
                    </button>
                  </div>
                </div>

                {/* Copied-from banner */}
                {prevQ && !copyFrom && (
                  <div style={{ background:"#dbeafe", border:`1px solid ${C.bluBdr}`, borderRadius:6,
                                padding:"8px 12px", display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                    <span style={{ fontSize:12, color:C.blue }}>
                      ✓ Pricing imported from <strong>{prevQ.qn}</strong> · {prevQ.client} · {prevQ.desc}
                    </span>
                    <span style={{ fontSize:11, color:C.txtS }}>
                      Labor, travel, equipment, hauling & materials rows copied · markup {Math.round((prevQ.markup||0)*100)}%
                    </span>
                  </div>
                )}

                {/* Quote picker */}
                {copyFrom && (
                  <div>
                    <input
                      autoFocus
                      style={{ ...inp, marginBottom:8, fontSize:13 }}
                      placeholder="Search by quote #, client, description, or job site…"
                      value={copyFrom.search}
                      onChange={e => setCopyFrom(p => ({ ...p, search: e.target.value }))}
                    />
                    {filteredQ.length === 0 && (
                      <div style={{ textAlign:"center", color:C.txtS, fontSize:12, padding:"10px 0" }}>
                        No quotes found.
                      </div>
                    )}
                    <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:300, overflowY:"auto" }}>
                      {filteredQ.map(q => {
                        const adjSum = (q.salesAdjustments||[]).reduce((s,a)=>s+a.amount,0);
                        const adjTotal = (q.total||0) + adjSum;
                        const hasRows = !!(q.laborRows?.length || q.equipRows?.length);
                        const st = {Draft:{bg:"#f1f5f9",cl:"#475569",bd:"#cbd5e1"},Submitted:{bg:C.bluB,cl:C.blue,bd:C.bluBdr},Won:{bg:C.grnB,cl:C.grn,bd:C.grnBdr},Lost:{bg:C.redB,cl:C.red,bd:C.redBdr}}[q.status]||{bg:"#f1f5f9",cl:"#475569",bd:"#cbd5e1"};
                        return (
                          <div key={q.id}
                            onClick={() => {
                              if (hasRows) {
                                applyQuoteCopy(q);
                              } else {
                                // Quote has flat totals only — copy what we can, fill defaults
                                const synth = {
                                  ...q,
                                  laborRows:   defLaborRows(q.client, customerRates),
                                  travelRows:  [{ id:uid(), label:"First Mobilization", workers:0, days:0, perDiem:false, hotel:false }],
                                  equipRows:   [{ id:uid(), code:"300", days:0, ship:0, overRate:false, overDaily:840, overNote:"" }],
                                  haulingRows: [{ id:uid(), vendor:"", desc:"", cost:0, markup:0.35 }],
                                  matRows:     [{ id:uid(), vendor:"", desc:"", cost:0, markup:0.15 }],
                                };
                                applyQuoteCopy(synth);
                              }
                            }}
                            style={{
                              padding:"10px 12px", borderRadius:7, cursor:"pointer",
                              background:C.sur, border:`1px solid ${C.bdr}`,
                              display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10,
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = C.accL}
                            onMouseLeave={e => e.currentTarget.style.background = C.sur}
                          >
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", marginBottom:3 }}>
                                <span style={{ fontWeight:700, color:C.acc, fontSize:12 }}>{q.qn}</span>
                                <span style={{ background:st.bg, color:st.cl, border:`1px solid ${st.bd}`,
                                               borderRadius:3, padding:"1px 6px", fontSize:10, fontWeight:600 }}>
                                  {q.status}
                                </span>
                                {!hasRows && (
                                  <span style={{ fontSize:10, color:C.txtS, fontStyle:"italic" }}>flat totals only</span>
                                )}
                              </div>
                              <div style={{ fontWeight:600, fontSize:13 }}>{q.client}</div>
                              <div style={{ fontSize:12, color:C.txtM }}>{q.desc}</div>
                              {q.jobSite && <div style={{ fontSize:11, color:C.txtS, marginTop:1 }}>📍 {q.jobSite}</div>}
                              {hasRows && (
                                <div style={{ display:"flex", gap:8, marginTop:4, flexWrap:"wrap" }}>
                                  {q.laborRows?.length   > 0 && <span style={{ fontSize:10, color:C.txtS }}>👷 {q.laborRows.length} labor</span>}
                                  {q.equipRows?.length   > 0 && <span style={{ fontSize:10, color:C.txtS }}>🏗 {q.equipRows.length} equip</span>}
                                  {q.haulingRows?.length > 0 && <span style={{ fontSize:10, color:C.txtS }}>🚛 {q.haulingRows.length} hauling</span>}
                                  {q.matRows?.length     > 0 && <span style={{ fontSize:10, color:C.txtS }}>🔩 {q.matRows.length} materials</span>}
                                  <span style={{ fontSize:10, color:C.txtS }}>markup {Math.round((q.markup||0)*100)}%</span>
                                </div>
                              )}
                            </div>
                            <div style={{ textAlign:"right", flexShrink:0 }}>
                              <div style={{ fontSize:15, fontWeight:700, color:C.acc }}>${Math.round(adjTotal).toLocaleString()}</div>
                              <div style={{ fontSize:11, color:C.blue, fontWeight:600, marginTop:3 }}>
                                {hasRows ? "Copy pricing →" : "Copy structure →"}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })()}

          <Card>
            <Sec c="Quote Information"/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10 }}>
              <div style={{ gridColumn:"span 2" }}>
                <Lbl c="CLIENT *"/>
                <AutoInput val={active.client||""} on={handleClientChange} list={CUSTOMERS} ph="Company name"/>
                {customerRates[active.client] && <div style={{ fontSize:11, color:C.yel, marginTop:2 }}>⚡ Special labor rates saved for this client</div>}
              </div>
              <div style={{ gridColumn:"span 2" }}><Lbl c="JOB SITE ADDRESS"/><input style={inp} value={active.jobSite||""} onChange={e=>u("jobSite",e.target.value)} placeholder="123 Main St, City, State ZIP" disabled={active.locked}/></div>
              <div><Lbl c="QUOTE TYPE"/><select style={{ ...sel, width:"100%" }} value={active.qtype} onChange={e=>u("qtype",e.target.value)} disabled={active.locked}><option>Contract</option><option>T&M</option><option>Not To Exceed</option></select></div>
              <div><Lbl c="STATUS"/><select style={{ ...sel, width:"100%" }} value={active.status} onChange={e=>u("status",e.target.value)} disabled={active.locked}>{["Draft","Submitted","Won","Lost"].map(x=><option key={x}>{x}</option>)}</select></div>
              <div><Lbl c="SALES ASSOCIATE"/><input style={inp} value={active.salesAssoc||""} onChange={e=>u("salesAssoc",e.target.value)} disabled={active.locked} placeholder="Sales associate name"/></div>
              <div><Lbl c="CONTACT NAME"/><input style={inp} value={active.contactName||""} onChange={e=>u("contactName",e.target.value)} disabled={active.locked}/></div>
              <div><Lbl c="CONTACT PHONE"/><input style={inp} value={active.contactPhone||""} onChange={e=>u("contactPhone",e.target.value)} disabled={active.locked}/></div>
              <div><Lbl c="CONTACT EMAIL"/><input style={inp} value={active.contactEmail||""} onChange={e=>u("contactEmail",e.target.value)} disabled={active.locked}/></div>
              <div style={{ gridColumn:"span 2" }}><Lbl c="JOB DESCRIPTION"/><textarea style={{ ...inp, height:56, resize:"vertical" }} value={active.desc||""} onChange={e=>u("desc",e.target.value)} disabled={active.locked}/></div>
            </div>
          </Card>

          <Card>
            <Sec c="📎 Attachments"/>
            <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center", marginBottom:7 }}>
              {(active.attachments||[]).map((a,ix) => (
                <div key={ix} style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:5, padding:"3px 8px", fontSize:12, display:"flex", alignItems:"center", gap:4 }}>
                  📎 {a.name}{!active.locked && <XBtn on={()=>u("attachments",(active.attachments||[]).filter((_,j)=>j!==ix))}/>}
                </div>
              ))}
              {(active.attachments||[]).length===0 && <span style={{ fontSize:12, color:C.txtS }}>No attachments yet.</span>}
            </div>
            {!active.locked && <>
              <button style={{ ...mkBtn("ghost"), fontSize:11 }} onClick={()=>fileRef.current?.click()}>+ Attach Document</button>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.png" style={{ display:"none" }} onChange={e=>{ const f=e.target.files[0]; if(f){ u("attachments",[...(active.attachments||[]),{name:f.name}]); e.target.value=""; }}}/>
            </>}
          </Card>

          <Card>
            <Sec c="👷 Labor"/>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:620 }}>
                <thead><tr>{["Role","Workers","Days","Reg Hrs","OT Hrs","Bill Rate","Subtotal","Special?",""].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                <tbody>
                  {(active.laborRows||[]).map(row => {
                    const b   = BASE_LABOR.find(x=>x.role===row.role)||BASE_LABOR[0];
                    const rR  = row.special ? Number(row.overReg) : b.reg;
                    const oR  = row.special ? Number(row.overOT)  : b.ot;
                    const sub = rR*row.workers*(row.regHrs||0)*row.days + oR*row.workers*(row.otHrs||0)*row.days;
                    return (
                      <tr key={row.id}>
                        <td style={tdS}><select style={sel} value={row.role} onChange={e=>updR("laborRows",row.id,"role",e.target.value)} disabled={active.locked}>{BASE_LABOR.map(r=><option key={r.role}>{r.role}</option>)}</select></td>
                        <td style={tdS}><input style={{ ...inp, width:50 }} type="number" min={0} value={row.workers}    onChange={e=>updR("laborRows",row.id,"workers",Number(e.target.value))} disabled={active.locked}/></td>
                        <td style={tdS}><input style={{ ...inp, width:50 }} type="number" min={0} value={row.days}       onChange={e=>updR("laborRows",row.id,"days",Number(e.target.value))}    disabled={active.locked}/></td>
                        <td style={tdS}><input style={{ ...inp, width:54 }} type="number" min={0} value={row.regHrs||0}  onChange={e=>updR("laborRows",row.id,"regHrs",Number(e.target.value))} disabled={active.locked}/></td>
                        <td style={tdS}><input style={{ ...inp, width:54 }} type="number" min={0} value={row.otHrs||0}   onChange={e=>updR("laborRows",row.id,"otHrs",Number(e.target.value))}  disabled={active.locked}/></td>
                        <td style={tdS}>{row.special ? (
                          <div style={{ display:"flex", gap:3, alignItems:"center", flexWrap:"wrap" }}>
                            <span style={{ fontSize:10, color:C.txtS }}>R:</span><DollarInput val={row.overReg} on={e=>updR("laborRows",row.id,"overReg",Number(e.target.value))} w={50}/>
                            <span style={{ fontSize:10, color:C.txtS }}>OT:</span><DollarInput val={row.overOT} on={e=>updR("laborRows",row.id,"overOT",Number(e.target.value))}  w={50}/>
                          </div>
                        ) : <span style={{ fontSize:13, color:C.txtM }}>${rR.toFixed(2)} / ${oR.toFixed(2)}</span>}</td>
                        <td style={{ ...tdS, color:C.ora, fontWeight:700, fontSize:13 }}>{fmt(sub)}</td>
                        <td style={tdS}><label style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, cursor:"pointer" }}><input type="checkbox" checked={!!row.special} disabled={active.locked} onChange={e=>{ const on=e.target.checked; const rc=customerRates[active.client]?.[row.role]; updR("laborRows",row.id,"special",on); if(on&&rc){updR("laborRows",row.id,"overReg",rc.reg);updR("laborRows",row.id,"overOT",rc.ot);}else if(on){updR("laborRows",row.id,"overReg",b.reg);updR("laborRows",row.id,"overOT",b.ot);}}}/>Sp.</label></td>
                        <td style={tdS}>{!active.locked && <XBtn on={()=>delR("laborRows",row.id)}/>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!active.locked && <button style={{ ...mkBtn("outline"), marginTop:8, fontSize:11 }} onClick={()=>addR("laborRows",{ role:"Operator", workers:0, regHrs:0, otHrs:0, days:0, special:false, overReg:83.5, overOT:125.25, note:"" })}>+ Add Crew</button>}
          </Card>

          <Card>
            <Sec c="🚗 Travel & Mobilization"/>
            <div style={{ fontSize:11, color:C.txtS, marginBottom:8 }}>Per Diem: ${PER_DIEM}/night · Hotel: ${HOTEL}/night</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:400 }}>
                <thead><tr>{["Mobilization","Workers","Days","Per Diem","Hotel","Subtotal",""].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                <tbody>
                  {(active.travelRows||[]).map(row => {
                    const sub = row.workers*row.days*((row.perDiem?PER_DIEM:0)+(row.hotel?HOTEL:0));
                    return (
                      <tr key={row.id}>
                        <td style={tdS}><select style={sel} value={row.label} onChange={e=>updR("travelRows",row.id,"label",e.target.value)} disabled={active.locked}>{["First Mobilization","Second Mobilization","Additional Mobilization"].map(l=><option key={l}>{l}</option>)}</select></td>
                        <td style={tdS}><input style={{ ...inp, width:50 }} type="number" min={0} value={row.workers} onChange={e=>updR("travelRows",row.id,"workers",Number(e.target.value))} disabled={active.locked}/></td>
                        <td style={tdS}><input style={{ ...inp, width:50 }} type="number" min={0} value={row.days}    onChange={e=>updR("travelRows",row.id,"days",Number(e.target.value))}    disabled={active.locked}/></td>
                        <td style={{ ...tdS, textAlign:"center" }}><input type="checkbox" checked={row.perDiem} onChange={e=>updR("travelRows",row.id,"perDiem",e.target.checked)} disabled={active.locked} style={{ width:15, height:15 }}/></td>
                        <td style={{ ...tdS, textAlign:"center" }}><input type="checkbox" checked={row.hotel}   onChange={e=>updR("travelRows",row.id,"hotel",e.target.checked)}   disabled={active.locked} style={{ width:15, height:15 }}/></td>
                        <td style={{ ...tdS, color:C.blue, fontWeight:700, fontSize:13 }}>{fmt(sub)}</td>
                        <td style={tdS}>{!active.locked && <XBtn on={()=>delR("travelRows",row.id)}/>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!active.locked && <button style={{ ...mkBtn("outline"), marginTop:8, fontSize:11 }} onClick={()=>addR("travelRows",{ label:"Additional Mobilization", workers:0, days:0, perDiem:false, hotel:false })}>+ Add Mobilization</button>}
          </Card>

          <Card>
            <Sec c="🏗 Equipment"/>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:560 }}>
                <thead><tr>{["Equipment","Cap.","Rate/Day","Days","Shipping","Subtotal","Override?",""].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                <tbody>
                  {(active.equipRows||[]).map(row => {
                    const eq    = eqLookup[row.code] || equipment[0] || EQUIPMENT[0];
                    const gOv   = eqOv[row.code];
                    const bd    = gOv ? gOv.daily : eq.daily;
                    const daily = row.overRate ? Number(row.overDaily) : bd;
                    const sub   = daily*row.days + Number(row.ship||0);
                    return (
                      <tr key={row.id}>
                        <td style={tdS}><select style={{ ...sel, maxWidth:210 }} value={row.code} onChange={e=>{ const ne=eqLookup[e.target.value]||equipment[0]||EQUIPMENT[0]; const go=eqOv[e.target.value]; updR("equipRows",row.id,"code",e.target.value); updR("equipRows",row.id,"overDaily",go?go.daily:ne.daily); }} disabled={active.locked}>{eqCats.map(cat=><optgroup key={cat} label={cat}>{equipment.filter(e=>e.cat===cat).map(e=><option key={e.code} value={e.code}>{e.name}</option>)}</optgroup>)}</select></td>
                        <td style={{ ...tdS, fontSize:11, color:C.txtS }}>{eq.cap}</td>
                        <td style={tdS}>{row.overRate ? <DollarInput val={row.overDaily} on={e=>updR("equipRows",row.id,"overDaily",Number(e.target.value))} w={65}/> : <span style={{ fontSize:13, color:gOv?C.yel:C.txtM }}>${daily.toLocaleString()}/day{gOv?" ⚡":""}</span>}</td>
                        <td style={tdS}><input style={{ ...inp, width:50 }} type="number" min={0} value={row.days} onChange={e=>updR("equipRows",row.id,"days",Number(e.target.value))} disabled={active.locked}/></td>
                        <td style={tdS}><DollarInput val={row.ship||0} on={e=>updR("equipRows",row.id,"ship",Number(e.target.value))} w={65}/></td>
                        <td style={{ ...tdS, color:C.teal, fontWeight:700, fontSize:13 }}>{fmt(sub)}</td>
                        <td style={tdS}>{!active.locked && <label style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, cursor:"pointer" }}><input type="checkbox" checked={!!row.overRate} onChange={e=>{ updR("equipRows",row.id,"overRate",e.target.checked); if(e.target.checked) updR("equipRows",row.id,"overDaily",bd); }}/>Ov.</label>}</td>
                        <td style={tdS}>{!active.locked && <XBtn on={()=>delR("equipRows",row.id)}/>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!active.locked && <button style={{ ...mkBtn("outline"), marginTop:8, fontSize:11 }} onClick={()=>addR("equipRows",{ code:"300", days:0, ship:0, overRate:false, overDaily:840, overNote:"" })}>+ Add Equipment</button>}
          </Card>

          <Card>
            <Sec c="🚛 Third Party Hauling / Subcontracted Services"/>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:420 }}>
                <thead><tr>{["Vendor","Description","Cost","Markup %","Bid Amt",""].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                <tbody>
                  {(active.haulingRows||[]).map(row => {
                    const bid = Number(row.cost)*(1+Number(row.markup||0));
                    return (
                      <tr key={row.id}>
                        <td style={tdS}><input style={inp} value={row.vendor} placeholder="Vendor"  onChange={e=>updR("haulingRows",row.id,"vendor",e.target.value)} disabled={active.locked}/></td>
                        <td style={tdS}><input style={inp} value={row.desc}   placeholder="Details" onChange={e=>updR("haulingRows",row.id,"desc",e.target.value)}   disabled={active.locked}/></td>
                        <td style={tdS}><DollarInput val={row.cost} on={e=>updR("haulingRows",row.id,"cost",Number(e.target.value))} w={75}/></td>
                        <td style={tdS}><select style={sel} value={row.markup} onChange={e=>updR("haulingRows",row.id,"markup",Number(e.target.value))} disabled={active.locked}>{[0,0.15,0.20,0.25,0.30,0.35].map(v=><option key={v} value={v}>{v===0?"None":Math.round(v*100)+"%"}</option>)}</select></td>
                        <td style={{ ...tdS, color:C.purp, fontWeight:700, fontSize:13 }}>{fmt(bid)}</td>
                        <td style={tdS}>{!active.locked && <XBtn on={()=>delR("haulingRows",row.id)}/>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!active.locked && <button style={{ ...mkBtn("outline"), marginTop:8, fontSize:11 }} onClick={()=>addR("haulingRows",{ vendor:"", desc:"", cost:0, markup:0.35 })}>+ Add Hauling</button>}
          </Card>

          <Card>
            <Sec c="🔩 Materials & Outside Services"/>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:420 }}>
                <thead><tr>{["Vendor","Description","Cost","Markup %","Bid Amt",""].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                <tbody>
                  {(active.matRows||[]).map(row => {
                    const bid = Number(row.cost)*(1+Number(row.markup||0.15));
                    return (
                      <tr key={row.id}>
                        <td style={tdS}><input style={inp} value={row.vendor} placeholder="Vendor"   onChange={e=>updR("matRows",row.id,"vendor",e.target.value)} disabled={active.locked}/></td>
                        <td style={tdS}><input style={inp} value={row.desc}   placeholder="Material" onChange={e=>updR("matRows",row.id,"desc",e.target.value)}   disabled={active.locked}/></td>
                        <td style={tdS}><DollarInput val={row.cost} on={e=>updR("matRows",row.id,"cost",Number(e.target.value))} w={75}/></td>
                        <td style={tdS}><select style={sel} value={row.markup} onChange={e=>updR("matRows",row.id,"markup",Number(e.target.value))} disabled={active.locked}>{[0.10,0.15,0.20,0.25,0.30,0.35].map(v=><option key={v} value={v}>{Math.round(v*100)+"%"}</option>)}</select></td>
                        <td style={{ ...tdS, color:C.lime, fontWeight:700, fontSize:13 }}>{fmt(bid)}</td>
                        <td style={tdS}>{!active.locked && <XBtn on={()=>delR("matRows",row.id)}/>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!active.locked && <button style={{ ...mkBtn("outline"), marginTop:8, fontSize:11 }} onClick={()=>addR("matRows",{ vendor:"", desc:"", cost:0, markup:0.15 })}>+ Add Material</button>}
          </Card>

          <SummaryPanel/>
        </div>
      </div>
    );
  }

  return null;
}
