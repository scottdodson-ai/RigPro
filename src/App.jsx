import { useState, useMemo, useRef, useEffect, Fragment } from "react";
import InvestorDashboard from "./RigPro3InvestorDashboard";


// ── BASE DATA ─────────────────────────────────────────────────────────────────

const DEFAULT_LABOR = [
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

function defLaborRows(client, customerRates, baseLabor) {
  const cr = customerRates[client];
  const _baseLabor = baseLabor || DEFAULT_LABOR;
  return ["Foreman","Rigger","Labor","Operator","CDL Driver"].map(role => {
    const b  = _baseLabor.find(r => r.role === role) || _baseLabor[0];
    const sp = cr && cr[role];
    return { id:uid(), role, workers:0, regHrs:0, otHrs:0, days:0,
             special:!!sp, overReg:sp?sp.reg:b.reg, overOT:sp?sp.ot:b.ot,
             note:sp?"Special rate":"", always:false };
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

function calcQuote(q, customerRates, eqOv, eqMapArg, baseLabor) {
  const _eqMap = eqMapArg || EQ_MAP;
  const _baseLabor = baseLabor || DEFAULT_LABOR;
  const labor = (q.laborRows||[]).reduce((s,r) => {
    const b  = _baseLabor.find(x => x.role===r.role) || _baseLabor[0];
    const rR = r.special ? Number(r.overReg) : b.reg;
    const oR = r.special ? Number(r.overOT)  : b.ot;
    return s + (rR*r.workers*(r.regHrs||0)*r.days) + (oR*r.workers*(r.otHrs||0)*r.days);
  }, 0);
  const laborCost = (q.laborRows||[]).reduce((s,r) => {
    const b  = _baseLabor.find(x => x.role===r.role) || _baseLabor[0];
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
    // Use the specific daily_cost from the equipment definition, or default to 0
    const ec = e ? (Number(e.daily_cost || e.daily * 0.6)) : 0;
    return s + (ec * r.days) + Number(r.ship||0);
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
function Header({ view, setView, extra, crumb, role, token, setToken, setRole }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const TABS = token ? [
    ["dash","Dashboard"], ["customers","Customers"], ["rfqs","Request For Quote"],
    ["equipment","Equip Rates"], ["labor","Labor Rates"], ["calendar","Calendar"]
  ] : [["landing", "Home"]];
  
  if (token && role === "admin") TABS.push(["admin", "Admin Controls"]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 801px)");
    const closeIfDesktop = () => {
      if (mq.matches || window.innerWidth >= 801) setMenuOpen(false);
    };
    closeIfDesktop();

    // MediaQueryList events are inconsistent across browsers.
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", closeIfDesktop);
    else if (typeof mq.addListener === "function") mq.addListener(closeIfDesktop);

    window.addEventListener("resize", closeIfDesktop);
    return () => {
      if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", closeIfDesktop);
      else if (typeof mq.removeListener === "function") mq.removeListener(closeIfDesktop);
      window.removeEventListener("resize", closeIfDesktop);
    };
  }, []);

  const handleLogout = () => { 
    localStorage.removeItem("token"); 
    localStorage.removeItem("role"); 
    if (setToken) setToken("");
    if (setRole) setRole("user");
    setView("landing");
  };

  return (
    <>
      <style>{`
        @media (max-width: 800px) {
          .desktop-nav { display: none !important; }
          .hamburger-btn { display: flex !important; margin-left: auto; }
          .mobile-inline { display: flex !important; }
        }
        @media (min-width: 801px) {
          .hamburger-btn { display: none !important; }
          .mobile-inline { display: none !important; }
        }
      `}</style>
      <div
        style={{
          background: C.sur,
          borderBottom: `1px solid ${C.bdr}`,
          padding: "6px 14px 10px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        }}
      >
        {/* Top row: logo + nav */}
        <div style={{ display:"flex", alignItems:"center", minHeight:54 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginRight:16 }}>
            <div style={{ width:36, height:36, background:C.accL, border:`2px solid ${C.accB}`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⛓</div>
            <div>
              <div style={{ fontFamily:"Georgia,serif", fontSize:13, color:C.acc, fontWeight:700, lineHeight:1.1 }}>Shoemaker</div>
              <div style={{ fontSize:9, color:C.txtS, letterSpacing:.5 }}>RIGGING & TRANSPORT</div>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="desktop-nav" style={{ display:"flex", alignItems:"center", flex:1, gap:4, overflowX:"auto" }}>
            {TABS.map(([v,l]) => (
              <button key={v} onClick={() => setView(v)} style={{ background:"none", border:"none", color:view===v?C.acc:C.txtM, fontSize:12, cursor:"pointer", padding:"4px 8px", borderBottom:view===v?`2px solid ${C.acc}`:"2px solid transparent", fontFamily:"inherit", fontWeight:view===v?700:400, whiteSpace:"nowrap" }}>{l}</button>
            ))}
            {crumb && <><span style={{ color:C.bdr, margin:"0 2px" }}>›</span><span style={{ color:C.txtS, fontSize:12, whiteSpace:"nowrap" }}>{crumb}</span></>}
          </div>

          {/* Mobile inline actions (same top line as logo + hamburger) */}
          <div
            className="mobile-inline"
            style={{
              display: "none",
              marginLeft: "auto",
              alignItems: "center",
              gap: 6,
              overflowX: "auto",
              maxWidth: "60vw",
              paddingLeft: 8,
            }}
          >
            {extra}
            {token ? (
              <button style={{ ...mkBtn("danger"), fontSize:10, padding:"5px 8px" }} onClick={handleLogout}>Logout</button>
            ) : (
              view !== "login" && <button style={{ ...mkBtn("primary"), fontSize:10, padding:"5px 10px" }} onClick={() => setView("login")}>Login</button>
            )}
          </div>

          {/* Hamburger (mobile) */}
          <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:C.txtM, padding:"4px" }}>
            ☰
          </button>
        </div>

        {/* Second row: actions far-right (desktop) */}
        <div className="desktop-nav" style={{ display:"flex", justifyContent:"flex-end", gap:10, flexWrap:"wrap" }}>
          {extra}
          {token ? (
            <button style={{ ...mkBtn("danger"), fontSize:11, padding:"4px 8px" }} onClick={handleLogout}>Logout</button>
          ) : (
            view !== "login" && <button style={{ ...mkBtn("primary"), fontSize:11, padding:"4px 12px" }} onClick={() => setView("login")}>Login</button>
          )}
        </div>
      </div>

      {menuOpen && (
        <div style={{ background:C.sur, borderBottom:`1px solid ${C.bdr}`, display:"flex", flexDirection:"column", padding:"10px 14px", gap:5, position:"sticky", top:54, zIndex:99, boxShadow:"0 4px 6px rgba(0,0,0,.05)" }}>
          {TABS.map(([v,l]) => (
            <button key={v} onClick={() => { setView(v); setMenuOpen(false); }} style={{ background:view===v?C.accL:"transparent", border:"none", color:view===v?C.acc:C.txt, fontSize:14, cursor:"pointer", padding:"10px", borderRadius:6, textAlign:"left", fontWeight:view===v?700:500 }}>{l}</button>
          ))}
          <div style={{ height:1, background:C.bdr, margin:"5px 0" }} />
          <div style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"center", padding:"5px 0" }}>{extra}</div>
          {token ? (
            <button style={{ ...mkBtn("danger"), fontSize:13, padding:"10px", marginTop:5, justifyContent:"center" }} onClick={handleLogout}>Logout</button>
          ) : (
            view !== "login" && <button style={{ ...mkBtn("primary"), fontSize:13, padding:"10px", marginTop:5, justifyContent:"center" }} onClick={() => { setView("login"); setMenuOpen(false); }}>Login</button>
          )}
        </div>
      )}
    </>
  );
}

function ActionBtns({ onReq, onFromReq, onNew }) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 800px)");
    const sync = () => setCompact(!!mq.matches);
    sync();
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", sync);
    else if (typeof mq.addListener === "function") mq.addListener(sync);
    window.addEventListener("resize", sync);
    return () => {
      if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", sync);
      else if (typeof mq.removeListener === "function") mq.removeListener(sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  const s = compact ? { fontSize:10, padding:"5px 8px", gap:3 } : {};
  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
      <button style={{ ...mkBtn("outline"), ...s }} onClick={onReq}>📋 New Request</button>
      <button style={{ ...mkBtn("blue"), ...s }}    onClick={onFromReq}>📄 Pending Requests</button>
      <button style={{ ...mkBtn("primary"), ...s }} onClick={onNew}>{compact ? "+ New" : "+ New Estimate"}</button>
    </div>
  );
}

// ── MODALS ────────────────────────────────────────────────────────────────────
function RFQModal({ init, onSave, onClose }) {
  const blank = { id:uid(), rn:nextRN(), company:"", requester:"", email:"", phone:"", jobSite:"", desc:"", notes:"", date:today(), status:"New", salesAssoc:"" };
  const [f, setF] = useState(init || blank);
  const u = (k,v) => setF(x => ({ ...x, [k]:v }));
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.35)", zIndex:300, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"20px 12px", overflowY:"auto" }}>
      <div style={{ background:C.sur, borderRadius:10, padding:20, width:"100%", maxWidth:560, boxShadow:"0 8px 28px rgba(0,0,0,.18)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div><div style={{ fontSize:11, color:C.txtS, textTransform:"uppercase", letterSpacing:1 }}>Request For Quote</div><div style={{ fontSize:17, fontWeight:700 }}>{f.rn}</div></div>
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
          <button style={mkBtn("primary")} onClick={() => onSave(f)}>Save RFQ</button>
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

function SearchResultsModal({ search, quotes, reqs, custData, onClose, onOpenQuote, onOpenReq, onOpenCust }) {
  const q = search.toLowerCase().trim();
  
  const results = useMemo(() => {
    if (!q) return [];
    const res = [];
    
    // Quotes
    quotes.forEach(quote => {
      const match = [
        quote.qn,                // Quote Number
        quote.desc,              // Quote Title / Description
        quote.jobSite,           // Location
        quote.contactName,       // Contact Name
        quote.contactEmail,      // Contact Email
        quote.contactPhone,      // Contact Phone
        quote.notes,             // Additional Description / Notes
        quote.client             // Customer Name
      ].some(s => s?.toLowerCase().includes(q));
      
      if (match) res.push({ type: 'Quote', data: quote, label: quote.qn, sub: quote.client, desc: `${quote.desc} @ ${quote.jobSite}` });
    });
    
    // Requests
    reqs.forEach(req => {
      const match = [
        req.rn,                  // Request Number
        req.company,             // Customer
        req.requester,           // Contact Name
        req.email,               // Contact Email
        req.phone,               // Contact Phone
        req.jobSite,             // Location
        req.desc,                // Description
        req.notes                // Additional Notes
      ].some(s => s?.toLowerCase().includes(q));
      
      if (match) res.push({ type: 'RFQ', data: req, label: req.rn, sub: req.company, desc: `${req.desc || req.notes} @ ${req.jobSite}` });
    });
    
    // Customers
    Object.entries(custData).forEach(([name, data]) => {
      const contactMatch = (data.contacts || []).some(c => 
        [c.name, c.email, c.phone, c.title].some(s => s?.toLowerCase().includes(q))
      );
      const locationMatch = (data.locations || []).some(l => 
        [l.name, l.address, l.notes].some(s => s?.toLowerCase().includes(q))
      );
      const profileMatch = [
        name,                    // Customer Name
        data.notes,              // Description / Profile Notes
        data.billingAddr,        // Location
        data.website,
        data.industry
      ].some(s => s?.toLowerCase().includes(q));
      
      if (profileMatch || contactMatch || locationMatch) {
        res.push({ type: 'Customer', data: { name }, label: name, sub: data.industry || 'Industrial', desc: data.billingAddr });
      }
    });
    
    return res;
  }, [q, quotes, reqs, custData]);

  const T_COLORS = { Quote: C.acc, RFQ: C.blue, Customer: C.purp };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:800, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"40px 16px", overflowY:"auto" }}>
      <div style={{ background:C.sur, borderRadius:12, width:"100%", maxWidth:640, boxShadow:"0 12px 40px rgba(0,0,0,.25)", display:"flex", flexDirection:"column", maxHeight:"85vh" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.bdr}`, display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:C.sur, borderTopLeftRadius:12, borderTopRightRadius:12 }}>
          <div>
            <div style={{ fontSize:11, color:C.txtS, textTransform:"uppercase", letterSpacing:1, fontWeight:700 }}>Search Results</div>
            <div style={{ fontSize:15, color:C.txtM }}>Matches for "<span style={{ fontWeight:700, color:C.txt }}>{search}</span>"</div>
          </div>
          <button onClick={onClose} style={{ background:C.bg, border:"none", width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:20, color:C.txtS, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        
        <div style={{ flex:1, overflowY:"auto", padding:12 }}>
          {results.length === 0 ? (
            <div style={{ padding:40, textAlign:"center", color:C.txtS }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🔍</div>
              <div style={{ fontSize:16, fontWeight:600 }}>No matches found</div>
              <div style={{ fontSize:13 }}>Try different keywords like location, contact name, or description.</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {results.map((r, i) => (
                <div 
                  key={i} 
                  style={{ display:"flex", gap:12, padding:14, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:10, cursor:"pointer", transition:"all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T_COLORS[r.type]; e.currentTarget.style.background = C.bg; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.bdr; e.currentTarget.style.background = C.sur; }}
                  onClick={() => {
                    if (r.type === 'Quote') onOpenQuote(r.data);
                    else if (r.type === 'RFQ') onOpenReq(r.data);
                    else if (r.type === 'Customer') onOpenCust(r.data.name);
                    onClose();
                  }}
                >
                  <div style={{ width:40, height:40, background:C.bg, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, color:T_COLORS[r.type], border:`1px solid ${C.bdr}` }}>
                    {r.type === 'Quote' ? '📄' : r.type === 'RFQ' ? '📋' : '🏢'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:2 }}>
                      <span style={{ fontWeight:700, fontSize:14 }}>{r.label}</span>
                      <span style={{ fontSize:10, fontWeight:800, color:T_COLORS[r.type], textTransform:"uppercase", letterSpacing:0.5, background:C.bg, padding:"2px 6px", borderRadius:4, border:`1px solid ${C.bdr}` }}>{r.type}</span>
                    </div>
                    <div style={{ fontSize:12, fontWeight:600, color:C.txtM, marginBottom:4 }}>{r.sub}</div>
                    <div style={{ fontSize:12, color:C.txtS, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ padding:14, borderTop:`1px solid ${C.bdr}`, background:C.bg, borderBottomLeftRadius:12, borderBottomRightRadius:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:11, color:C.txtS }}>Found {results.length} result(s)</div>
          <button style={{ ...mkBtn("ghost"), padding:"5px 12px" }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── EQUIPMENT RATES PAGE ──────────────────────────────────────────────────────
function EquipmentPage({ equipment, setEquipment, eqCats, eqMap, eqOv, setEqOv, role }) {
  // ── Rate override state (unchanged) ───────────────────────────────────────
  const [ec, setEc]     = useState(null);    // code being rate-overridden
  const [ev, setEv]     = useState("");
  const [en, setEn]     = useState("");

  // ── Inline edit state for equipment records ────────────────────────────────
  const [editRow, setEditRow] = useState(null); // { code, name, cap, daily, cost, cat } — original
  const [editVal, setEditVal] = useState({});    // live field values while editing

  // ── Add new equipment state ────────────────────────────────────────────────
  const [showAdd,  setShowAdd]  = useState(false);
  const [newEquip, setNewEquip] = useState({ code:"", cat:"Forklift", name:"", cap:"—", daily:0, daily_cost:0 });
  const [addError, setAddError] = useState("");

  const KNOWN_CATS = [...new Set([...eqCats, "Forklift","Aerial Lift","Crane","Misc","Tools","Truck"])];

  // ── Rate override helpers (original behaviour) ────────────────────────────
  const startOv = code => { const o=eqOv[code]; setEc(code); setEv(o?o.daily:(eqMap[code]?.daily||0)); setEn(o?o.note:""); };
  const saveOv  = ()   => { setEqOv(p=>({...p,[ec]:{daily:Number(ev),note:en}})); setEc(null); };
  const clearOv = code => setEqOv(p => { const n={...p}; delete n[code]; return n; });

  // ── Equipment record edit helpers ─────────────────────────────────────────
  function startEdit(e) {
    setEditRow(e.code);
    setEditVal({ code:e.code, cat:e.cat, name:e.name, cap:e.cap, daily:e.daily, daily_cost:e.daily_cost || (e.daily * 0.6) });
    setEc(null); // close any rate override
  }
  function saveEdit() {
    if (!editVal.name || !editVal.code) return;
    setEquipment(prev => prev.map(e =>
      e.code === editRow
        ? { ...e, code:editVal.code, cat:editVal.cat, name:editVal.name, cap:editVal.cap, daily:Number(editVal.daily), daily_cost:Number(editVal.daily_cost) }
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
      daily_cost: Number(newEquip.daily_cost) || (newEquip.daily * 0.6),
    }]);
    setNewEquip({ code:"", cat:"Forklift", name:"", cap:"—", daily:0, daily_cost:0 });
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
        {role === "admin" && (
          <button style={{ ...mkBtn("primary"), fontSize:12 }} onClick={() => { setShowAdd(!showAdd); setAddError(""); }}>
            {showAdd ? "✕ Cancel" : "+ Add Equipment"}
          </button>
        )}
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
                onChange={e => {
                  const val = Number(e.target.value);
                  setNewEquip(x => ({ ...x, daily: val, daily_cost: val * 0.6 }));
                }}/>
            </div>
            <div>
              <div style={{ fontSize:11, color:C.txtM, fontWeight:600, marginBottom:3 }}>DAILY COST ($)</div>
              <input style={fi} type="number" min={0} value={newEquip.daily_cost}
                onChange={e => setNewEquip(x => ({ ...x, daily_cost: e.target.value }))}/>
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
                  {["Code","Category","Equipment Name","Capacity","Base/Day", (role === "admin" ? "Cost/Day" : null), "Override Rate","Override Note",""].filter(Boolean).map(h => (
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
                        <td style={tdS}>
                          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <span style={{ fontSize:13, color:C.txtS }}>$</span>
                            <input style={{ ...fi, width:70 }} type="number" min={0} value={editVal.daily_cost}
                              onChange={x => setEditVal(v=>({...v, daily_cost:x.target.value}))}/>
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
                        ${Number(e.daily).toLocaleString()}/day
                      </td>
                      {role === "admin" && (
                        <td style={{ ...tdS, color:C.txtS, fontSize:13 }}>
                          ${Number(e.daily_cost || (e.daily * 0.6)).toLocaleString()}
                        </td>
                      )}
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
                            {role === "admin" && <button style={{ ...mkBtn("ghost"), fontSize:11, padding:"3px 8px" }} onClick={() => startEdit(e)}>✏ Edit</button>}
                            <button style={{ ...mkBtn("outline"), fontSize:11, padding:"3px 8px" }} onClick={() => startOv(e.code)}>Override</button>
                            {role === "admin" && (
                              <>
                                {ov && <button style={{ ...mkBtn("danger"), fontSize:11, padding:"3px 8px" }} onClick={() => clearOv(e.code)}>Reset</button>}
                                <button style={{ ...mkBtn("danger"),  fontSize:11, padding:"3px 8px" }} onClick={() => deleteEquip(e.code)}>Delete</button>
                              </>
                            )}
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


// ── LABOR RATES PAGE ────────────────────────────────────────────────────────
function LaborRatesPage({ customerRates, setCustomerRates, role, baseLabor, setBaseLabor }) {
  const [editing, setEditing] = useState(null); 
  const [vals,    setVals]    = useState({});    
  const [search,  setSearch]  = useState("");
  const [adding,  setAdding]  = useState(false);

  function startEdit(c) {
    setEditing(c);
    const existing = customerRates[c] || {};
    const init = {};
    baseLabor.forEach(r => {
      init[r.role] = existing[r.role] || { reg: r.reg, ot: r.ot };
    });
    setVals(init);
    setAdding(false);
  }

  function save() {
    setCustomerRates(prev => ({ ...prev, [editing]: vals }));
    setEditing(null);
  }

  function clear(c) {
    if (confirm(`Remove custom labor rates for ${c}?`)) {
      const copy = { ...customerRates };
      delete copy[c];
      setCustomerRates(copy);
      if (editing === c) setEditing(null);
    }
  }

  function update(role, field, val) {
    setVals(prev => ({
      ...prev,
      [role]: { ...prev[role], [field]: Number(val) }
    }));
  }

  const clientsWithRates = Object.keys(customerRates).filter(c => 
    c.toLowerCase().includes(search.toLowerCase())
  );

  const isAd = role === "admin";
  const fS = { background: "#fff", border: `1px solid ${C.bdrM}`, borderRadius: 5, color: C.txt, 
               fontFamily: "inherit", fontSize: 13, padding: "5px 10px", width: "100%", 
               boxSizing: "border-box", outline: "none", textAlign: "right" };

  return (
    <div style={{ padding: "0 24px 40px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "24px 0 8px" }}>Labor Rates</h1>
      <p style={{ color: C.txtS, fontSize: 13, marginBottom: 24 }}>
        Standard billing and cost rates used in all estimates. Create customer-specific rates that override standard rates.
      </p>

      {/* Standard Rates Section */}
      <Card style={{ padding: 20, marginBottom: 24, background: "#fff" }}>
         <div style={{ color: C.acc, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
            Standard Rates
         </div>
         <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
               <thead>
                  <tr>
                     <th style={{ ...thS, paddingLeft: 0 }}>ROLE</th>
                     <th style={{ ...thS, textAlign: "right" }}>BILL REGULAR</th>
                     <th style={{ ...thS, textAlign: "right" }}>BILL OT</th>
                     <th style={{ ...thS, textAlign: "right" }}>COST REGULAR</th>
                     <th style={{ ...thS, textAlign: "right" }}>COST OT</th>
                     <th style={{ ...thS, textAlign: "right", paddingRight: 0 }}>BURDEN %</th>
                  </tr>
               </thead>
               <tbody>
                   {baseLabor.map((r, i) => {
                      const margin = Math.round(((r.reg - r.costReg) / r.reg) * 100);
                      return (
                         <tr key={r.role} style={{ background: i % 2 === 1 ? "transparent" : "#fbfbfc" }}>
                            <td style={{ ...tdS, fontWeight: 700, color: C.txt, paddingLeft: 8 }}>{r.role}</td>
                            <td style={{ ...tdS, textAlign: "right" }}>
                               {isAd ? <input style={{ ...fS, color:C.acc, width:85 }} type="number" value={r.reg} onChange={e => setBaseLabor(p => p.map(x=>x.role===r.role ? {...x, reg:Number(e.target.value)} : x))}/> : <span style={{ color:C.acc, fontWeight:800 }}>${r.reg.toFixed(2)}/hr</span>}
                            </td>
                            <td style={{ ...tdS, textAlign: "right" }}>
                               {isAd ? <input style={{ ...fS, color:C.ora, width:85 }} type="number" value={r.ot} onChange={e => setBaseLabor(p => p.map(x=>x.role===r.role ? {...x, ot:Number(e.target.value)} : x))}/> : <span style={{ color:C.ora, fontWeight:800 }}>${r.ot.toFixed(2)}/hr</span>}
                            </td>
                            <td style={{ ...tdS, textAlign: "right" }}>
                               {isAd ? <input style={{ ...fS, color:C.teal, width:85 }} type="number" value={r.costReg} onChange={e => setBaseLabor(p => p.map(x=>x.role===r.role ? {...x, costReg:Number(e.target.value)} : x))}/> : <span style={{ color:C.teal, fontWeight:700 }}>${r.costReg.toFixed(2)}/hr</span>}
                            </td>
                            <td style={{ ...tdS, textAlign: "right" }}>
                               {isAd ? <input style={{ ...fS, color:C.teal, width:85 }} type="number" value={r.costOT} onChange={e => setBaseLabor(p => p.map(x=>x.role===r.role ? {...x, costOT:Number(e.target.value)} : x))}/> : <span style={{ color:C.teal, fontWeight:700 }}>${r.costOT.toFixed(2)}/hr</span>}
                            </td>
                            <td style={{ ...tdS, textAlign: "right", paddingRight: 8 }}>
                               <span style={{ background: C.bluB, color: C.blue, border: `1px solid ${C.bluBdr}`, padding: "2px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                                  {margin}% margin
                               </span>
                            </td>
                         </tr>
                      );
                   })}
               </tbody>
            </table>
         </div>
         <div style={{ background: C.bg, padding: "12px 16px", borderRadius: 8, marginTop: 18, fontSize: 12, color: C.txtS, textAlign: "center", lineHeight: 1.5 }}>
            OT rate = 1.5× regular · Cost rates include wages, burden, and overhead · These rates apply to all estimates unless a customer special rate is set
         </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
         <div style={{ color: C.acc, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
            Customer Special Rates
         </div>
         <button style={{ ...mkBtn("primary"), padding: "6px 16px", fontSize: 12 }} onClick={() => setAdding(true)}>+ Add</button>
      </div>

      {adding && !editing && (
         <Card style={{ marginBottom: 16, border: `2.5px solid ${C.accB}`, padding: 20 }}>
            <Lbl c="SELECT CUSTOMER TO CUSTOMIZE"/>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
               <select style={{ ...sel, flex: 1, padding: "8px 12px" }} onChange={e => startEdit(e.target.value)} defaultValue="">
                  <option value="" disabled>Choose a customer...</option>
                  {CUSTOMERS.filter(c => !customerRates[c]).map(c => <option key={c} value={c}>{c}</option>)}
               </select>
               <button style={mkBtn("ghost")} onClick={() => setAdding(false)}>Cancel</button>
            </div>
         </Card>
      )}

      {editing && !customerRates[editing] && (
         <Card style={{ marginBottom: 16, border: `2.5px solid ${C.accB}`, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
               <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.txt }}>{editing}</div>
                  <div style={{ fontSize: 12, color: C.txtS, marginTop: 2 }}>Setting Custom Labor Rate Overrides</div>
               </div>
               <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: C.txtS }}>✕</button>
            </div>
            <div style={{ overflowX: "auto" }}>
               <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={{...thS,textAlign:"left"}}>ROLE</th><th style={{...thS,textAlign:"right"}}>REGULAR</th><th style={{...thS,textAlign:"right"}}>OT</th></tr></thead>
                  <tbody>
                     {baseLabor.map(r => (
                        <tr key={r.role}>
                           <td style={{ ...tdS, fontSize: 13, fontWeight: 700, border: "none" }}>{r.role}</td>
                           <td style={{ ...tdS, border: "none", textAlign: "right" }}>
                              <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.bdrM}`, borderRadius: 5, overflow: "hidden", marginLeft: "auto", width: 100 }}>
                                 <span style={{ padding: "0 6px", color: C.txtS, fontSize: 11, background: C.bg }}>$</span>
                                 <input style={{ border: "none", outline: "none", padding: "4px 6px", width: "100%", textAlign: "right", fontSize: 13, fontWeight: 700 }} type="number" 
                                    value={vals[r.role]?.reg || 0} onChange={e => update(r.role, "reg", e.target.value)}/>
                              </div>
                           </td>
                           <td style={{ ...tdS, border: "none", textAlign: "right" }}>
                              <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.bdrM}`, borderRadius: 5, overflow: "hidden", marginLeft: "auto", width: 100 }}>
                                 <span style={{ padding: "0 6px", color: C.txtS, fontSize: 11, background: C.bg }}>$</span>
                                 <input style={{ border: "none", outline: "none", padding: "4px 6px", width: "100%", textAlign: "right", fontSize: 13, fontWeight: 700 }} type="number" 
                                    value={vals[r.role]?.ot || 0} onChange={e => update(r.role, "ot", e.target.value)}/>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
               <button style={{ ...mkBtn("primary"), flex: 1 }} onClick={save}>Save Custom Rates</button>
               <button style={{ ...mkBtn("ghost"), flex: 1 }} onClick={() => setEditing(null)}>Cancel</button>
            </div>
         </Card>
      )}

      <div style={{ position: "relative", marginBottom: 16 }}>
         <span style={{ position: "absolute", left: 14, top: 11, color: C.txtS }}>🔍</span>
         <input 
            style={{ ...inp, padding: "11px 14px 11px 38px", border: `1px solid ${C.bdrM}`, borderRadius: 8 }} 
            placeholder="Search customers..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
         />
      </div>

      {clientsWithRates.map(c => {
         const isExpanded = editing === c;
         return (
            <Card key={c} style={{ marginBottom: 12, border: isExpanded ? `2.5px solid ${C.acc}` : `1px solid ${C.bdrM}`, borderRadius: 8, overflow: "hidden", transition: "all .2s" }}>
               <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: isExpanded ? C.bg : "#fff" }} onClick={() => isExpanded ? setEditing(null) : startEdit(c)}>
                  <div>
                     <div style={{ fontWeight: 800, fontSize: 16, color: C.txt }}>{c}</div>
                     {!isExpanded && <div style={{ fontSize: 12, color: C.txtS, marginTop: 3 }}>{Object.keys(customerRates[c]||{}).length} roles customized</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }} onClick={e => e.stopPropagation()}>
                     <span style={{ border: `1px solid ${C.grnBdr}`, background: C.grnB, color: C.grn, padding: "2px 10px", borderRadius: 4, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>Active</span>
                     {role === "admin" && <button style={{ background: C.redB, border: `1px solid ${C.redBdr}`, color: C.red, borderRadius: 5, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, fontWeight: 700 }} onClick={() => clear(c)}>✕</button>}
                  </div>
               </div>
               {isExpanded && (
                  <div style={{ padding: "0 20px 20px", background: "#fff", borderTop: `1px solid ${C.bg}` }}>
                     <div style={{ overflowX: "auto", marginTop: 12 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                           <thead><tr><th style={{...thS,textAlign:"left",fontSize:10}}>ROLE</th><th style={{...thS,textAlign:"right",fontSize:10}}>BILL REGULAR</th><th style={{...thS,textAlign:"right",fontSize:10}}>BILL OT</th></tr></thead>
                           <tbody>
                              {baseLabor.map(r => (
                                 <tr key={r.role}>
                                    <td style={{ ...tdS, fontSize: 13, fontWeight: 700, border: "none" }}>{r.role}</td>
                                    <td style={{ ...tdS, border: "none", textAlign: "right" }}>
                                       <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.bdrM}`, borderRadius: 5, overflow: "hidden", marginLeft: "auto", width: 100 }}>
                                          <span style={{ padding: "0 6px", color: C.txtS, fontSize: 11, background: C.bg }}>$</span>
                                          <input style={{ border: "none", outline: "none", padding: "4px 6px", width: "100%", textAlign: "right", fontSize: 13, fontWeight: 700 }} type="number" 
                                             value={vals[r.role]?.reg || 0} onChange={e => update(r.role, "reg", e.target.value)}/>
                                       </div>
                                    </td>
                                    <td style={{ ...tdS, border: "none", textAlign: "right" }}>
                                       <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.bdrM}`, borderRadius: 5, overflow: "hidden", marginLeft: "auto", width: 100 }}>
                                          <span style={{ padding: "0 6px", color: C.txtS, fontSize: 11, background: C.bg }}>$</span>
                                          <input style={{ border: "none", outline: "none", padding: "4px 6px", width: "100%", textAlign: "right", fontSize: 13, fontWeight: 700 }} type="number" 
                                             value={vals[r.role]?.ot || 0} onChange={e => update(r.role, "ot", e.target.value)}/>
                                       </div>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                     <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                        <button style={{ ...mkBtn("primary"), flex: 1 }} onClick={save}>Save Changes</button>
                        <button style={{ ...mkBtn("ghost"), flex: 1 }} onClick={() => setEditing(null)}>Cancel</button>
                     </div>
                  </div>
               )}
            </Card>
         );
      })}

      {clientsWithRates.length === 0 && search && (
         <div style={{ textAlign: "center", padding: 40, color: C.txtS, fontSize: 14 }}>
            No customized customers matching "{search}"
         </div>
      )}
    </div>
  );
}


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
function CustomerModal({ custName, quotes, custData, setCustData, profileTemplate, onOpenQuote, onClose }) {
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
              { l:"Total Quotes", v:quotes.length,   c:"#4a5060" },
              { l:"Won",          v:won.length,       c:"#16a34a" },
              { l:"Submitted",    v:submitted.length, c:"#2563eb" },
              { l:"Revenue",      v:"$"+Math.round(revenue).toLocaleString(), c:"#b86b0a" },
              { l:"Locations",    v:locations.length, c:"#7c3aed" },
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
  const [calView,       setCalView]       = useState("job");      // "job" | "equipment"
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

  // ── Equipment conflict detection ──────────────────────────────────────────
  const equipConflicts = useMemo(() => {
    const cf = [];
    for (let i = 0; i < activeJobs.length; i++) {
      for (let j = i + 1; j < activeJobs.length; j++) {
        const a = activeJobs[i], b = activeJobs[j];
        if (a.startObj <= b.endObj && a.endObj >= b.startObj) {
          const shared = (a.equipList || []).filter(c => (b.equipList || []).includes(c));
          if (shared.length) cf.push({ jobA: a, jobB: b, equipment: shared });
        }
      }
    }
    return cf;
  }, [activeJobs]);

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
    const equipMap   = equipOnDay(d);
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
          {[["job", "📋 By Job"], ["equipment", "🔧 By Equipment"]].map(([v, l]) => (
            <button key={v} onClick={() => setCalView(v)} style={{
              background: calView === v ? C.acc : "transparent",
              color:      calView === v ? "#fff" : C.txtM,
              border: "none", padding: "7px 16px", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", transition: "background .15s",
            }}>{l}</button>
          ))}
        </div>

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
      <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
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
          {cells.map((d, i) => <Fragment key={i}>{renderCell(d)}</Fragment>)}
        </div>
      </div>

      {/* ── Selected Day Detail ───────────────────────────────────────────── */}
      {selDay && (() => {
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
      <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 8, padding: 14 }}>
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
      </div>
    </div>
  );
}


// ── LOGIN FORM ───────────────────────────────────────────────────────────────
function LoginForm({ setToken, setRole, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login Failed");
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      setToken(data.token);
      setRole(data.user.role);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:C.sur, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <form onSubmit={handleLogin} style={{ background:"#fff", border:`1px solid ${C.bdr}`, borderRadius:10, padding:30, width:"100%", maxWidth:400, boxShadow:"0 10px 30px rgba(0,0,0,.1)" }}>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:28, fontWeight:800, color:C.acc, letterSpacing:"-1px" }}>RigPro Login</div>
        </div>
        {error && <div style={{ background:C.redB, color:C.red, padding:10, borderRadius:5, marginBottom:15, fontSize:13 }}>{error}</div>}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:600, color:C.txtM, marginBottom:6 }}>USERNAME</div>
          <input style={{ ...inp, padding:"10px 12px", fontSize:14 }} value={username} onChange={e=>setUsername(e.target.value)} required />
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:600, color:C.txtM, marginBottom:6 }}>PASSWORD</div>
          <input type="password" style={{ ...inp, padding:"10px 12px", fontSize:14 }} value={password} onChange={e=>setPassword(e.target.value)} required />
        </div>
        <button type="submit" style={{ ...mkBtn("primary"), width:"100%", justifyContent:"center", padding:"12px", fontSize:14 }}>Login</button>
        <button type="button" onClick={onBack} style={{ ...mkBtn("ghost"), width:"100%", justifyContent:"center", padding:"10px", marginTop:10, fontSize:14 }}>Cancel</button>
      </form>
    </div>
  );
}

// ── ADMIN PAGE ───────────────────────────────────────────────────────────────
function DatabaseBrowser({ token }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [rows, setRows] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!token) return;
    const fetchTables = async () => {
      try {
        const res = await fetch("/api/admin/tables", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) setTables(data);
        else setErr("Invalid data format received");
      } catch (err) { 
        console.error("fetchTables error:", err); 
        setErr("Could not load database tables.");
      }
    };
    fetchTables();
  }, [token]);

  const fetchTableData = async (table) => {
    setSelectedTable(table);
    setDbLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/tables/${table}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) setRows(data);
    } catch (err) { 
      console.error("fetchTableData error:", err); 
      setErr(`Failed to load data for ${table}`);
    }
    finally { setDbLoading(false); }
  };

  return (
    <div style={{ marginTop: 40, borderTop: `1px solid ${C.bdr}`, paddingTop: 30 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.acc, marginBottom: 16 }}>🗄 MySQL Data Browser</div>
      
      {err && <div style={{ background: C.redB, color: C.red, padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, border: `1px solid ${C.redBdr}` }}>⚠ {err}</div>}

      <div style={{ display: "flex", gap: 20, alignItems: "start" }}>
        {/* Tables List */}
        <div style={{ width: 180, flexShrink: 0 }}>
          <Lbl c="TABLES" />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {tables.length === 0 && !err && <div style={{ fontSize: 12, color: C.txtS, padding: 10 }}>No tables found.</div>}
            {tables.map(t => (
              <button key={t} 
                style={{ ...mkBtn(selectedTable === t ? "primary" : "ghost"), justifyContent: "start", fontSize: 12, padding: "6px 14px", border: selectedTable===t?'none':`1px solid ${C.bdr}` }}
                onClick={() => fetchTableData(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Table Data */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedTable ? (
            <Card style={{ padding: 16, margin: 0, background: "#fff", border: `1.5px solid ${C.accB}`, borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.acc }}>Table: {selectedTable}</div>
                <div style={{ fontSize: 11, color: C.txtS }}>Showing {rows.length} rows</div>
              </div>
              {dbLoading ? <div style={{ padding: 40, textAlign: "center", color: C.txtS }}>Fetching database records...</div> : (
                <div style={{ overflowX: "auto", maxHeight: 450, borderRadius: 6, border: `1px solid ${C.bdr}` }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr>
                        {rows.length > 0 && Object.keys(rows[0]).map(h => (
                          <th key={h} style={{ ...thS, background: C.bg, position: "sticky", top: 0, zIndex: 1, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} style={{ background: i % 2 === 1 ? "transparent" : "#fbfbfc" }}>
                          {Object.values(r).map((v, j) => (
                            <td key={j} style={{ ...tdS, whiteSpace: "nowrap", borderBottom: `1px solid #f0f0f0` }}>
                              {v === null ? <span style={{ fontStyle: "italic", color: C.txtS }}>NULL</span> : String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : (
            <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa", borderRadius: 10, border: `2px dashed ${C.bdr}`, color: C.txtS, fontSize: 13 }}>
              Select a table from the left to browse MySQL data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminPage({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "user" });
  const [formErr, setFormErr] = useState("");
  const [todos, setTodos] = useState(() => JSON.parse(localStorage.getItem("admin_todos") || "[]"));
  const [newTodo, setNewTodo] = useState("");

  useEffect(() => {
    localStorage.setItem("admin_todos", JSON.stringify(todos));
  }, [todos]);

  const addTodo = (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    setTodos([...todos, { id: Date.now(), text: newTodo, done: false }]);
    setNewTodo("");
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const delTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id));
  };


  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormErr("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type":"application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      setNewUser({ username: "", password: "", role: "user" });
      fetchUsers();
    } catch (err) { setFormErr(err.message); }
  };

  const updateUserRole = async (id, role) => {
    try {
      await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type":"application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ role })
      });
      fetchUsers();
    } catch (err) { console.error(err); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      fetchUsers();
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchUsers(); }, []);

  return (
    <div style={{ padding:"24px", maxWidth:1100, margin:"0 auto" }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, color:C.acc, marginBottom:4 }}>Admin Control Panel</div>
            <div style={{ fontSize:14, color:C.txtM, marginBottom:20 }}>System oversight and user management</div>
          </div>
          <button 
             style={{ ...mkBtn("primary"), padding: "10px 20px", fontWeight: 700, background: "linear-gradient(135deg, #0d8c6a, #10b981)" }}
             onClick={() => window.dispatchEvent(new CustomEvent('change-view', { detail: 'investor' }))}
          >
             📊 Open Investor Dashboard
          </button>
        </div>


        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:20, marginBottom:30 }}>
          {/* USER LIST */}
          <div style={{ flex:1 }}>
            <Sec c="Active Accounts"/>
            {loading ? <div style={{ padding:20, color:C.txtS }}>Loading accounts...</div> : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {users.map(u => (
                  <div key={u.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:C.sur, border:`1px solid ${C.bdr}`, padding:"12px 16px", borderRadius:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:28, height:28, background:C.accL, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:C.acc, fontSize:10 }}>{u.username?.[0].toUpperCase() || "?"}</div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13 }}>{u.username}</div>
                        <div style={{ fontSize:10, color:C.txtS }}>{u.role.toUpperCase()}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <select
                        style={{ ...sel, padding:"2px 4px", fontSize:11 }}
                        value={u.role}
                        onChange={(e) => updateUserRole(u.id, e.target.value)}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button style={{ ...mkBtn("danger"), padding:"4px 8px", fontSize:10 }} onClick={() => deleteUser(u.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CREATE FORM */}
          <div style={{ display: "flex", flexDirection:"column", gap:20 }}>
            <div style={{ background:C.sur, border:`1.5px dashed ${C.bdr}`, borderRadius:10, padding:20 }}>
              <Sec c="Add New Account"/>
              <form onSubmit={handleCreateUser} style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div>
                  <Lbl c="USERNAME"/>
                  <input style={inp} value={newUser.username} onChange={e=>setNewUser(p=>({...p,username:e.target.value}))} required placeholder="Enter username..."/>
                </div>
                <div>
                  <Lbl c="PASSWORD"/>
                  <input style={inp} type="password" value={newUser.password} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))} required placeholder="Enter password..."/>
                </div>
                <div>
                  <Lbl c="ROLE"/>
                  <select style={{ ...sel, width:"100%" }} value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}>
                    <option value="user">Standard User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                {formErr && <div style={{ fontSize:12, color:C.red, fontWeight:600 }}>⚠ {formErr}</div>}
                <button type="submit" style={{ ...mkBtn("primary"), width:"100%", justifyContent:"center", padding:"10px", marginTop:6 }}>Create User</button>
              </form>
            </div>

            <div style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:10, padding:20, marginTop:10 }}>
              <Sec c="Admin Tasks & Todos"/>
              <form onSubmit={addTodo} style={{ display:"flex", gap:8, marginBottom:16 }}>
                <input 
                  style={{ ...inp, flex:1 }} 
                  value={newTodo} 
                  onChange={e=>setNewTodo(e.target.value)} 
                  placeholder="What needs to be done?"
                />
                <button type="submit" style={{ ...mkBtn("blue"), padding:"0 16px" }}>Add</button>
              </form>
              <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:200, overflowY:"auto" }}>
                {todos.length === 0 && <div style={{ textAlign:"center", padding:10, color:C.txtS, fontSize:13 }}>No pending tasks.</div>}
                {todos.map(t => (
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, background:t.done ? C.bg : "transparent", padding:8, borderRadius:6, border:`1px solid ${t.done ? C.bdr : "transparent"}` }}>
                    <input 
                      type="checkbox" 
                      checked={t.done} 
                      onChange={() => toggleTodo(t.id)} 
                      style={{ cursor:"pointer", width:16, height:16 }}
                    />
                    <span style={{ flex:1, fontSize:13, color: t.done ? C.txtS : C.txt, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                    <button onClick={() => delTodo(t.id)} style={{ padding:0, border:"none", background:"transparent", color:C.txtS, cursor:"pointer", fontSize:12 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>


        {/* DATA BROWSER SECTION */}
        <DatabaseBrowser token={token} />

        <div style={{ borderTop:`1px solid ${C.bdr}`, paddingTop:20, marginTop:10 }}>
          <div style={{ background:C.accL, border:`1px solid ${C.accB}`, padding:16, borderRadius:8 }}>
            <div style={{ fontWeight:700, marginBottom:8, color:C.acc }}>✓ Security Tip</div>
            <div style={{ fontSize:13, color:C.txtM, lineHeight:1.5 }}>
              Use strong passwords for all new accounts. Promoting a user to Admin grants full access to internal database tables and user settings.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [token,      setToken]      = useState(localStorage.getItem("token") || "");
  const [role,       setRole]       = useState(localStorage.getItem("role") || "user");
  const [view,       setView]       = useState("landing");
  const [quotes,     setQuotes]     = useState(SAMPLE_QUOTES);
  const [reqs,       setReqs]       = useState(SAMPLE_REQS);
  const [active,     setActive]     = useState(null);
  const [selC,       setSelC]       = useState(null);
  const [search,     setSearch]     = useState("");
  const [showRM,     setShowRM]     = useState(false);
  const [editR,      setEditR]      = useState(null);
  const [showWM,       setShowWM]       = useState(false);
  const [adjModal,     setAdjModal]     = useState(null);  // quote to adjust
  const [wonOnly,      setWonOnly]      = useState(false); // filter customers view
  const [custView,     setCustView]     = useState("card"); // "list" or "card"
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [customerRates, setCustomerRates] = useState(INIT_CUSTOMER_RATES);
  const [baseLabor,     setBaseLabor]     = useState(DEFAULT_LABOR);
  const [equipment,     setEquipment]     = useState(EQUIPMENT);
  const eqMap  = useMemo(() => { const m={}; equipment.forEach(e=>{m[e.code]=e;}); return m; }, [equipment]);
  const eqCats = useMemo(() => [...new Set(equipment.map(e=>e.cat))], [equipment]);
  const [eqOv,       setEqOv]       = useState({});
  const [custData,         setCustData]         = useState(INIT_CUST_DATA);
  const [showCustModal,    setShowCustModal]    = useState(false);
  const [profileTemplate,  setProfileTemplate]  = useState(DEFAULT_PROFILE_TEMPLATE);
  const [showProfileTempl, setShowProfileTempl] = useState(false);

  // Reset filters when navigating to the main customers list (from another tab or detail view)
  useEffect(() => {
    if (view === "customers" && !selC) {
      setWonOnly(false);
      setSearch("");
    }
  }, [view, selC]);
  const [notifs,     setNotifs]     = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const fileRef = useRef();

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
    setView("editor");
  }

  function openEdit(q) {
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

  useEffect(() => {
    const handleView = (e) => setView(e.detail);
    window.addEventListener('change-view', handleView);
    return () => window.removeEventListener('change-view', handleView);
  }, []);



  function saveAdjustment(quoteId, adj) {
    setQuotes(prev => prev.map(q =>
      q.id === quoteId
        ? { ...q, salesAdjustments: [...(q.salesAdjustments||[]), adj] }
        : q
    ));
  }

  function saveQuote() {
    const cv  = calcQuote(active, customerRates, eqOv, eqMap, baseLabor);
    const upd = { ...active, ...cv };
    if (upd.client) {
      const newRates = {};
      (upd.laborRows||[]).forEach(r => { if(r.special) newRates[r.role]={ reg:Number(r.overReg), ot:Number(r.overOT) }; });
      if (Object.keys(newRates).length > 0) setCustomerRates(prev=>({...prev,[upd.client]:{...(prev[upd.client]||{}),...newRates}}));
    }
    setQuotes(prev => { const ix=prev.findIndex(q=>q.id===upd.id); return ix>=0?prev.map((q,i)=>i===ix?upd:q):[upd,...prev]; });
    if (upd.fromReqId) setReqs(prev=>prev.map(r=>r.id===upd.fromReqId?{...r,status:"Quoted"}:r));
    setView("customers");
  }

  function markWon(jn, cd) {
    const upd = { ...active, status:"Won", jobNum:jn, compDate:cd, locked:true };
    const cv  = calcQuote(upd, customerRates, eqOv, eqMap, baseLabor);
    const fin = { ...upd, ...cv };
    setQuotes(prev => { const ix=prev.findIndex(q=>q.id===fin.id); return ix>=0?prev.map((q,i)=>i===ix?fin:q):[fin,...prev]; });
    setShowWM(false);
    setActive(fin);
  }

  function submitQuote() {
    const cv  = calcQuote(active, customerRates, eqOv, eqMap, baseLabor);
    const upd = { ...active, ...cv, status:"Submitted" };
    setQuotes(prev => { const ix=prev.findIndex(q=>q.id===upd.id); return ix>=0?prev.map((q,i)=>i===ix?upd:q):[upd,...prev]; });
    setNotifs(p => [{ id:uid(), qn:upd.qn, client:upd.client, total:upd.total, at:new Date().toLocaleTimeString(), status:"Pending" }, ...p]);
    setActive(upd);
    setShowNotifs(true);
  }

  function saveReq(req) {
    setReqs(prev => { const ix=prev.findIndex(r=>r.id===req.id); return ix>=0?prev.map((r,i)=>i===ix?req:r):[req,...prev]; });
    setShowRM(false); setEditR(null);
  }

  const u    = (f,v)       => setActive(q => ({ ...q, [f]:v }));
  const addR = (sec,def)   => setActive(q => ({ ...q, [sec]:[...(q[sec]||[]),{ id:uid(),...def }] }));
  const updR = (sec,id,f,v)=> setActive(q => ({ ...q, [sec]:q[sec].map(r=>r.id===id?{...r,[f]:v}:r) }));
  const delR = (sec,id)    => setActive(q => ({ ...q, [sec]:q[sec].filter(r=>r.id!==id) }));

  const cv      = active ? calcQuote(active, customerRates, eqOv, eqMap, baseLabor) : null;
  const pendN   = notifs.filter(n=>n.status==="Pending").length;
  const actBtns = <ActionBtns onReq={()=>{setEditR(null);setShowRM(true);}} onFromReq={()=>setView("rfqs")} onNew={()=>openNew()}/>;

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

  // Authentication Guard
  useEffect(() => {
    if (view!=="landing" && view!=="login" && !token) {
      setView("login");
    }
  }, [view, token]);

  // ── LANDING PAGE ───────────────────────────────────────────────────────────
  if (view==="landing") return (
    <div style={{ minHeight:"100vh", background:C.sur, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", display:"flex", flexDirection:"column" }}>
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"6rem", fontWeight:800, color:C.acc, letterSpacing:"-2px", lineHeight:1, marginBottom:10 }}>RigPro</div>
          <div style={{ fontSize:"1.2rem", color:C.txtM, fontWeight:500, letterSpacing:"1px", marginBottom:40 }}>Shoemaker Rigging & Transport</div>
          <button style={{ ...mkBtn("primary"), fontSize:"1.1rem", padding:"12px 24px", borderRadius:"8px", cursor:"pointer", boxShadow:"0 4px 14px rgba(0,0,0,.15)", transition:"transform 0.1s" }} onClick={() => token ? setView("dash") : setView("login")}>
            {token ? "Enter Dashboard" : "Enter Application"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── LOGIN PAGE ─────────────────────────────────────────────────────────────
  if (view==="login") {
    if (token) {
      setView("dash");
      return null;
    }
    return (
      <div style={{ minHeight:"100vh", background:C.sur, display:"flex", flexDirection:"column" }}>
        <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} />
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <LoginForm setToken={(t) => { setToken(t); setView("dash"); }} setRole={setRole} onBack={() => setView("landing")} />
        </div>
      </div>
    );
  }

  // ── ADMIN ──────────────────────────────────────────────────────────────────
  if (view==="admin" && role!=="admin") return <div style={{padding:40, color:C.red, fontWeight:700, fontSize:20}}>403 Unauthorized. Access Restricted to Administrators.</div>;
  if (view==="admin") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} />
      <AdminPage token={token} />
    </div>
  );

  if (view==="investor" && role==="admin") return (
    <div style={{ minHeight: "100vh", background: "#020617" }}>
      <button 
        onClick={() => setView("admin")} 
        style={{ ...mkBtn("ghost"), position: "fixed", top: 12, left: 16, zIndex: 100, color: "#fff", background: "rgba(15, 23, 42, 0.8)", borderColor: "#475569" }}
      >
        ← Back to Admin
      </button>
      <InvestorDashboard />
    </div>
  );


  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  if (view==="dash") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      {showRM && <RFQModal init={editR} onSave={saveReq} onClose={()=>{setShowRM(false);setEditR(null);}}/>}
      {showNotifs && <NotifPanel/>}
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <button style={{ ...mkBtn("ghost"), padding:"5px 9px", position:"relative" }} onClick={()=>setShowNotifs(true)}>
            🔔{pendN>0&&<span style={{ position:"absolute", top:-3, right:-3, background:C.red, color:"#fff", borderRadius:"50%", width:15, height:15, fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{pendN}</span>}
          </button>
          {actBtns}
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
          {[{ l:"Revenue Won", v:fmt(stats.rev), s:`${quotes.filter(q=>q.status==="Won").length} jobs`, c:C.grn },{ l:"Pipeline", v:fmt(stats.pipe), s:`${quotes.filter(q=>q.status==="Submitted").length} submitted`, c:C.blue },{ l:"Win Rate", v:stats.wr+"%", s:"closed quotes", c:C.acc },{ l:"Open RFQs", v:stats.rn, s:"need estimates", c:C.ora }].map(x => (
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
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:5 }}><Sec c="📋 Requests for Quote"/><button style={{ ...mkBtn("ghost"), fontSize:11, padding:"3px 9px" }} onClick={()=>setView("rfqs")}>View All</button></div>
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
      {showCustModal&&<CustomerModal custName={showCustModal} quotes={quotes.filter(q=>q.client===showCustModal)} custData={custData} setCustData={setCustData} profileTemplate={profileTemplate} onOpenQuote={q=>{openEdit(q);}} onClose={()=>setShowCustModal(false)}/>}
      {showSearchModal&&<SearchResultsModal search={search} quotes={quotes} reqs={reqs} custData={custData} onClose={()=>setShowSearchModal(false)} onOpenQuote={openEdit} onOpenReq={r=>{setEditR(r);setShowRM(true);}} onOpenCust={setSelC}/>}
      {showRM && <RFQModal init={editR} onSave={saveReq} onClose={()=>{setShowRM(false);setEditR(null);}}/>}
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={actBtns}/>
      <div style={{ padding:"14px", maxWidth:1160, margin:"0 auto" }}>
        {selC ? (() => {
          const cQuotes = quotes.filter(q=>q.client===selC&&(!wonOnly||q.status==="Won"));
          const con     = cQuotes.find(q=>q.contactName);
          return (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:12 }}>
                <button style={{ ...mkBtn("ghost"), fontSize:12, padding:"4px 9px" }} onClick={()=>setSelC(null)}>← All Customers</button>
                <div style={{ fontSize:18, fontWeight:700 }}>{selC}</div>
                <div style={{ marginLeft:"auto", display:"flex", gap:4, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:6, padding:2 }}>
                  <button 
                    style={{ ...mkBtn(custView==="card"?"primary":"ghost"), border:"none", padding:"4px 8px", fontSize:11, gap:4 }} 
                    onClick={()=>setCustView("card")}
                  >
                    🔲 Card
                  </button>
                  <button 
                    style={{ ...mkBtn(custView==="list"?"primary":"ghost"), border:"none", padding:"4px 8px", fontSize:11, gap:4 }} 
                    onClick={()=>setCustView("list")}
                  >
                    📜 List
                  </button>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:custView==="card"?"300px 1fr":"1fr", gap:12, alignItems:"start" }}>
                {custView === "card" && (
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
                )}
                <div>
                  {custView === "card" ? (
                    cQuotes.map(q => {
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
                    })
                  ) : (
                    <Card style={{ padding:0 }}>
                      <div style={{ overflowX:"auto" }}>
                        <table style={{ width:"100%", borderCollapse:"collapse" }}>
                          <thead style={{ background:"#f9fafb" }}>
                            <tr>
                              {["Quote #","Description","Job Site","Status","Total","Actions"].map(h=><th key={h} style={{ ...thS, padding:"12px 14px", borderBottom:`1px solid ${C.bdr}` }}>{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {cQuotes.map(q => {
                              const isCO = q.isChangeOrder;
                              const adjSum = (q.salesAdjustments||[]).reduce((s,a)=>s+a.amount,0);
                              const adjTotal = (q.total||0) + adjSum;
                              return (
                                <tr key={q.id} style={{ cursor:"pointer" }} onClick={()=>openEdit(q)}>
                                  <td style={{ ...tdS, padding:"12px 14px", fontWeight:700, color:isCO?C.purp:C.acc }}>{q.qn}</td>
                                  <td style={{ ...tdS, padding:"12px 14px" }}>
                                    <div style={{ fontWeight:600 }}>{q.desc}</div>
                                    {isCO && <div style={{ fontSize:10, color:C.purp }}>Change Order</div>}
                                  </td>
                                  <td style={{ ...tdS, padding:"12px 14px", fontSize:12, color:C.txtM, maxWidth:240, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{q.jobSite}</td>
                                  <td style={{ ...tdS, padding:"12px 14px" }}><Badge status={q.status}/></td>
                                  <td style={{ ...tdS, padding:"12px 14px", fontWeight:700 }}>
                                    {fmt(adjTotal)}
                                    {adjSum !== 0 && <div style={{ fontSize:9, color:adjSum>0?C.grn:C.red }}>({adjSum>0?"+":""}{fmt(adjSum)} adj.)</div>}
                                  </td>
                                  <td style={{ ...tdS, padding:"12px 14px" }}>
                                    <div style={{ display:"flex", gap:4 }}>
                                      {!q.locked && <button style={{ ...mkBtn("outline"), padding:"3px 7px", fontSize:10 }} onClick={e=>{e.stopPropagation();openEdit(q);}}>Edit</button>}
                                      {q.status==="Won" && <button style={{ ...mkBtn("ghost"), padding:"3px 7px", fontSize:10 }} onClick={e=>{e.stopPropagation();setAdjModal(q);}}>$ Adj</button>}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </>
          );
        })() : (
          <>
            {showProfileTempl && <ProfileTemplateModal template={profileTemplate} setTemplate={setProfileTemplate} onClose={()=>setShowProfileTempl(false)}/>}
            
            <div style={{ display:"flex", alignItems:"flex-end", gap:12, marginBottom:16, flexWrap:"wrap" }}>
              <div>
                <Lbl c="FILTER BY CUSTOMER"/>
                <select 
                  style={{ ...sel, width:240, height:32 }} 
                  value={selC || ""} 
                  onChange={e => setSelC(e.target.value || null)}
                >
                  <option value="">--- All Customers ---</option>
                  {CUSTOMERS.sort().map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex:"0 0 auto", width:240 }}>
                <Lbl c="GLOBAL KEYWORD SEARCH"/>
                <div style={{ position:"relative" }}>
                  <input 
                    style={{ ...inp, paddingRight:32 }} 
                    placeholder="Keywords (location, contact, desc)..." 
                    value={search} 
                    onChange={e=>setSearch(e.target.value)}
                    onKeyDown={e => { if(e.key === 'Enter') setShowSearchModal(true); }}
                  />
                  <button 
                    onClick={()=>setShowSearchModal(true)} 
                    style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:14 }}
                  >
                    🔍
                  </button>
                </div>
              </div>
              <button 
                style={{ ...mkBtn(wonOnly?"primary":"ghost"), fontSize:11, padding:"6px 12px", whiteSpace:"nowrap", gap:6 }} 
                onClick={()=>setWonOnly(w=>!w)}
              >
                🏆 {wonOnly ? "Viewing: Won Quotes Only" : "Viewing: All Quotes"}
              </button>
              {(selC || search || wonOnly) && <button style={{ ...mkBtn("danger"), background:"none", color:C.red, border:`1px solid ${C.redBdr}`, fontSize:11, padding:"6px 12px", fontWeight:600 }} onClick={()=>{setSelC(null);setSearch("");setWonOnly(false);}}>✕ Clear</button>}
              
              <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10 }}>
                <button style={{ ...mkBtn("ghost"), fontSize:11, padding:"6px 12px", whiteSpace:"nowrap" }} onClick={()=>setShowProfileTempl(true)}>⚙ Edit Profile Template</button>
                <div style={{ display:"flex", gap:4, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:6, padding:2 }}>
                  <button 
                    style={{ ...mkBtn(custView==="card"?"primary":"ghost"), border:"none", padding:"4px 8px", fontSize:11, gap:4 }} 
                    onClick={()=>setCustView("card")}
                  >
                    🔲 Card
                  </button>
                  <button 
                    style={{ ...mkBtn(custView==="list"?"primary":"ghost"), border:"none", padding:"4px 8px", fontSize:11, gap:4 }} 
                    onClick={()=>setCustView("list")}
                  >
                    📜 List
                  </button>
                </div>
              </div>
            </div>

            {custView === "card" ? (
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
            ) : (
              <Card style={{ padding:0 }}>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead style={{ background:"#f9fafb" }}>
                      <tr>
                        {["Customer Name","Total Volume","Active Quotes","Won Jobs","Status","Actions"].map(h => (
                          <th key={h} style={{ ...thS, padding:"12px 14px", borderBottom:`1px solid ${C.bdr}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {customers.filter(c=>!search||c.name.toLowerCase().includes(search.toLowerCase())).map(c => {
                        const displayQuotes = wonOnly ? c.quotes.filter(q=>q.status==="Won") : c.quotes;
                        const won = c.quotes.filter(q=>q.status==="Won");
                        const tot = wonOnly ? won.reduce((s,q)=>s+(q.total||0)+((q.salesAdjustments||[]).reduce((ss,a)=>ss+a.amount,0)),0) : c.quotes.reduce((s,q)=>s+(q.total||0),0);
                        return (
                          <tr key={c.name} style={{ cursor:"pointer" }} onClick={()=>setSelC(c.name)}>
                            <td style={{ ...tdS, padding:"12px 14px", fontWeight:700, fontSize:14 }}>{c.name}</td>
                            <td style={{ ...tdS, padding:"12px 14px", fontWeight:700, color:C.acc }}>{fmt(tot)}</td>
                            <td style={{ ...tdS, padding:"12px 14px", color:C.txtM }}>{c.quotes.length}</td>
                            <td style={{ ...tdS, padding:"12px 14px", color:C.grn, fontWeight:600 }}>{won.length}</td>
                            <td style={{ ...tdS, padding:"12px 14px" }}>
                              <div style={{ display:"flex", gap:3 }}>
                                {displayQuotes.slice(0,3).map(q=><Badge key={q.id} status={q.status}/>)}
                                {displayQuotes.length > 3 && <span style={{ fontSize:10, color:C.txtS }}>+{displayQuotes.length-3}</span>}
                              </div>
                            </td>
                            <td style={{ ...tdS, padding:"12px 14px" }}>
                              <div style={{ display:"flex", gap:6 }}>
                                <button style={{ ...mkBtn("ghost"), fontSize:10, padding:"4px 8px" }} onClick={e=>{e.stopPropagation();setShowCustModal(c.name);}}>Profile</button>
                                <button style={{ ...mkBtn("primary"), fontSize:10, padding:"4px 8px" }} onClick={e=>{e.stopPropagation();setSelC(c.name);}}>View</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ── RFQs ───────────────────────────────────────────────────────────────
  if (view==="rfqs") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      {showRM && <RFQModal init={editR} onSave={saveReq} onClose={()=>{setShowRM(false);setEditR(null);}}/>}
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={actBtns}/>
      <div style={{ padding:"14px", maxWidth:1160, margin:"0 auto" }}>
        <div style={{ marginBottom:14 }}><div style={{ fontSize:20, fontWeight:700 }}>Request For Quote</div><div style={{ fontSize:12, color:C.txtS }}>Incoming requests waiting for estimation</div></div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {reqs.map(r => (
            <Card key={r.id} style={{ marginBottom:0 }}>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-start" }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:3 }}><span style={{ fontWeight:700, color:C.acc, fontSize:12 }}>{r.rn}</span><Badge status={r.status}/><span style={{ fontSize:11, color:C.txtS }}>{r.date}</span></div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{r.company}</div>
                  {r.jobSite    && <div style={{ fontSize:12, color:C.txtM, marginTop:1 }}>📍 {r.jobSite}</div>}
                  {r.requester  && <div style={{ fontSize:12, color:C.txtM }}>Contact: {r.requester}{r.phone?" · "+r.phone:""}</div>}
                  <div style={{ fontSize:12, color:C.txtM, marginTop:3 }}>{r.desc}</div>
                  {r.salesAssoc && <div style={{ fontSize:11, color:C.txtS, marginTop:3 }}>Sales Associate: <strong>{r.salesAssoc}</strong></div>}
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                  <button style={{ ...mkBtn("ghost"),  fontSize:11, padding:"4px 9px" }} onClick={()=>{setEditR(r);setShowRM(true);}}>Edit</button>
                  <button style={{ ...mkBtn("blue"),   fontSize:11, padding:"4px 9px" }} onClick={()=>openNew(r)}>Create Estimate →</button>
                  <button style={{ ...mkBtn("danger"), fontSize:11, padding:"4px 9px" }} onClick={()=>setReqs(p=>p.filter(x=>x.id!==r.id))}>Delete</button>
                </div>
              </div>
            </Card>
          ))}
          {reqs.length===0 && <Card style={{ textAlign:"center", color:C.txtS, padding:40 }}>No requests yet.</Card>}
        </div>
      </div>
    </div>
  );

  // ── EQUIPMENT RATES ────────────────────────────────────────────────────────
  if (view==="equipment") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={actBtns}/>
      <EquipmentPage equipment={equipment} setEquipment={setEquipment} eqCats={eqCats} eqMap={eqMap} eqOv={eqOv} setEqOv={setEqOv} role={role}/>
    </div>
  );

  // ── LABOR RATES ────────────────────────────────────────────────────────────
  if (view==="labor") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={actBtns}/>
      <LaborRatesPage customerRates={customerRates} setCustomerRates={setCustomerRates} role={role} baseLabor={baseLabor} setBaseLabor={setBaseLabor}/>
    </div>
  );

  // ── CALENDAR ──────────────────────────────────────────────────────────────
  if (view==="calendar") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={actBtns}/>
      <CalendarPage quotes={quotes} setQuotes={setQuotes} eqMap={eqMap} onOpenQuote={q=>{ openEdit(q); setView("editor"); }}/>
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
        <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} crumb={active.qn+(active.isChangeOrder?" (CO)":"")} extra={
          <div style={{ display:"flex", gap:5 }}>
            <button style={mkBtn("ghost")} onClick={()=>setView("customers")}>Cancel</button>
            {!active.locked && <button style={mkBtn("primary")} onClick={saveQuote}>Save Quote</button>}
          </div>
        }/>
        <div style={{ padding:"14px", maxWidth:1160, margin:"0 auto" }}>
          {active.fromReqId    && <div style={{ background:C.bluB, border:`1px solid ${C.bluBdr}`, borderRadius:6, padding:"8px 12px", marginBottom:10, fontSize:12, color:C.blue }}>📋 Pre-filled from a Quote Request.</div>}
          {active.isChangeOrder && <div style={{ background:"#f5f3ff", border:"1px solid #ddd6fe", borderRadius:6, padding:"8px 12px", marginBottom:10, fontSize:12, color:"#6d28d9" }}>📝 Change Order — linked to original won quote.</div>}
          {active.locked       && <div style={{ background:C.yelB, border:`1px solid ${C.yelBdr}`, borderRadius:6, padding:"8px 12px", marginBottom:10, fontSize:12, color:C.yel }}>🔒 This quote is locked. View only.</div>}

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
                    const b   = baseLabor.find(x=>x.role===row.role)||baseLabor[0];
                    const rR  = row.special ? Number(row.overReg) : b.reg;
                    const oR  = row.special ? Number(row.overOT)  : b.ot;
                    const sub = rR*row.workers*(row.regHrs||0)*row.days + oR*row.workers*(row.otHrs||0)*row.days;
                    return (
                      <tr key={row.id}>
                        <td style={tdS}><select style={sel} value={row.role} onChange={e=>updR("laborRows",row.id,"role",e.target.value)} disabled={active.locked}>{baseLabor.map(r=><option key={r.role}>{r.role}</option>)}</select></td>
                        <td style={tdS}><input style={{ ...inp, width:50 }} type="number" min={0} value={row.workers}    onChange={e=>updR("laborRows",row.id,"workers",Number(e.target.value))} disabled={active.locked}/></td>
                        <td style={tdS}><input style={{ ...inp, width:50 }} type="number" min={0} value={row.days}       onChange={e=>updR("laborRows",row.id,"days",Number(e.target.value))}    disabled={active.locked}/></td>
                        <td style={tdS}><input style={{ ...inp, width:54 }} type="number" min={0} value={row.regHrs||0}  onChange={e=>updR("laborRows",row.id,"regHrs",Number(e.target.value))} disabled={active.locked}/></td>
                        <td style={tdS}><input style={{ ...inp, width:54 }} type="number" min={0} value={row.otHrs||0}   onChange={e=>updR("laborRows",row.id,"otHrs",Number(e.target.value))}  disabled={active.locked}/></td>
                        <td style={tdS}>{row.special ? (
                          <div style={{ display:"flex", gap:3, alignItems:"center", flexWrap:"wrap" }}>
                            <span style={{ fontSize:10, color:C.txtS }}>R:</span><DollarInput val={row.overReg} on={e=>{ const v=Number(e.target.value); updR("laborRows",row.id,"overReg",v); if(row.always) setCustomerRates(p=>({...p, [active.client]:{ ...(p[active.client]||{}), [row.role]:{ ...((p[active.client]||{})[row.role]||{}), reg:v } }})); }} w={50}/>
                            <span style={{ fontSize:10, color:C.txtS }}>OT:</span><DollarInput val={row.overOT} on={e=>{ const v=Number(e.target.value); updR("laborRows",row.id,"overOT",v);  if(row.always) setCustomerRates(p=>({...p, [active.client]:{ ...(p[active.client]||{}), [row.role]:{ ...((p[active.client]||{})[row.role]||{}), ot:v } }})); }}  w={50}/>
                            <label style={{ fontSize:9, color:C.acc, display:"flex", alignItems:"center", gap:2, cursor:"pointer", background:C.accL, padding:"1px 4px", borderRadius:3 }}>
                               <input type="checkbox" checked={!!row.always} onChange={e=>{
                                  const on=e.target.checked;
                                  updR("laborRows",row.id,"always",on);
                                  if(on) setCustomerRates(p=>({...p, [active.client]:{ ...(p[active.client]||{}), [row.role]:{ reg:row.overReg, ot:row.overOT } }}));
                               }} /> Always?
                            </label>
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
                    const eq    = eqMap[row.code] || EQUIPMENT[0];
                    const gOv   = eqOv[row.code];
                    const bd    = gOv ? gOv.daily : eq.daily;
                    const daily = row.overRate ? Number(row.overDaily) : bd;
                    const sub   = daily*row.days + Number(row.ship||0);
                    return (
                      <tr key={row.id}>
                        <td style={tdS}><select style={{ ...sel, maxWidth:210 }} value={row.code} onChange={e=>{ const ne=eqMap[e.target.value]||EQUIPMENT[0]; const go=eqOv[e.target.value]; updR("equipRows",row.id,"code",e.target.value); updR("equipRows",row.id,"overDaily",go?go.daily:ne.daily); }} disabled={active.locked}>{eqCats.map(cat=><optgroup key={cat} label={cat}>{equipment.filter(e=>e.cat===cat).map(e=><option key={e.code} value={e.code}>{e.name}</option>)}</optgroup>)}</select></td>
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
