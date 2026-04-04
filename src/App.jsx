import { useState, useMemo, useRef, useEffect, Fragment } from "react";
import CustomerCRMBoard from "./CustomerCRMBoard";
import VectorSearchPanel from "./VectorSearchPanel";
const InvestorDashboard = () => <div style={{padding:40,color:"#fff",textAlign:"center",fontSize:18}}>Investor Dashboard — coming soon.</div>;


// ── BASE DATA ─────────────────────────────────────────────────────────────────

const DEFAULT_LABOR = [
  { role:"Foreman",    reg:88,   ot:132,    costReg:48.07, costOT:66.09 },
  { role:"Rigger",     reg:83.5, ot:125.25, costReg:46.79, costOT:64.81 },
  { role:"Labor",      reg:78,   ot:117,    costReg:42.96, costOT:58.73 },
  { role:"Operator",   reg:83.5, ot:125.25, costReg:46.79, costOT:64.81 },
  { role:"CDL Driver", reg:78,   ot:117,    costReg:42.96, costOT:58.73 },
];

const EQUIPMENT = [
  { code:"242",    category:"Forklift",    name:"2000 Gradall 534D-9",                        capacity:"9,000 lb",   daily_rate:790  },
  { code:"300",    category:"Forklift",    name:"Caterpillar GC35K",                          capacity:"15,500 lb",  daily_rate:840  },
  { code:"301",    category:"Forklift",    name:"HysterS80XLBCS",                             capacity:"8,000 lb",   daily_rate:530  },
  { code:"302",    category:"Forklift",    name:"Cat125D 12,500 LB Forklift",                 capacity:"12,500 lb",  daily_rate:850  },
  { code:"308",    category:"Forklift",    name:"Cat T150D 15,000 LB Forklift",               capacity:"15,000 lb",  daily_rate:950  },
  { code:"320",    category:"Forklift",    name:"Royal T300B 30,000 lb",                      capacity:"30,000 lb",  daily_rate:1100 },
  { code:"322",    category:"Forklift",    name:"Rigger's Special 80-100k",                   capacity:"100,000 lb", daily_rate:1200 },
  { code:"237",    category:"Aerial Lift", name:"Skyjack SJ3226",                             capacity:"–",          daily_rate:250  },
  { code:"251",    category:"Aerial Lift", name:"JLG 450AJ Lift",                             capacity:"–",          daily_rate:525  },
  { code:"254",    category:"Aerial Lift", name:"JLG 600S Boom",                              capacity:"–",          daily_rate:650  },
  { code:"255",    category:"Aerial Lift", name:"2013 Skyjack SJ4632",                        capacity:"–",          daily_rate:375  },
  { code:"259",    category:"Aerial Lift", name:"2015 Skyjack SJ3219",                        capacity:"–",          daily_rate:155  },
  { code:"250",    category:"Crane",       name:"2005 Broderson IC-200-3F 30-Ton Carry Deck", capacity:"30,000 lb",  daily_rate:1000 },
  { code:"257",    category:"Crane",       name:"Broderson IC80-2D 17,000 lb Carry Deck",     capacity:"17,000 lb",  daily_rate:750  },
  { code:"RP8x10", category:"Misc",        name:"8'×10' Steel Road Plates",                   capacity:"–",          daily_rate:90   },
  { code:"RP4x10", category:"Misc",        name:"4'×10' Steel Road Plates",                   capacity:"–",          daily_rate:90   },
  { code:"RP8x12", category:"Misc",        name:"8'×12' Steel Road Plates",                   capacity:"–",          daily_rate:90   },
  { code:"RP8x20", category:"Misc",        name:"8'×20' Steel Road Plates",                   capacity:"–",          daily_rate:100  },
  { code:"GANG",   category:"Tools",       name:"Gang Box Charge",                             capacity:"–",          daily_rate:50   },
  { code:"CONEX",  category:"Tools",       name:"Conex Job Trailer",                           capacity:"–",          daily_rate:50   },
  { code:"TORCH",  category:"Tools",       name:"Torch Outfit",                                capacity:"–",          daily_rate:50   },
  { code:"100D",   category:"Truck",       name:"2007 Inter 9200 Tractor",                     capacity:"–",          daily_rate:1000 },
  { code:"110D",   category:"Truck",       name:"2008 Landall Trailer",                        capacity:"–",          daily_rate:1000 },
  { code:"111D",   category:"Truck",       name:"1999 Fontaine Flatbed Trailer",               capacity:"–",          daily_rate:1000 },
  { code:"SEMI",   category:"Truck",       name:"Semi Truck and Trailer",                      capacity:"–",          daily_rate:1000 },
  { code:"CONE",   category:"Truck",       name:"Semi Truck and Conestoga",                    capacity:"–",          daily_rate:1500 },
  { code:"PICK",   category:"Truck",       name:"Pickup Truck",                                capacity:"–",          daily_rate:125  },
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

const DEFAULT_PER_DIEM = 50;
const DEFAULT_HOTEL    = 120;

// ── SYSTEM PROMPTING ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = "RigPro v3.1 Unified Data Source Enabled. All future features are strictly referenced against the live MySQL database. System initialized with full historical dataset.";
const SHOW_SEMANTIC_SEARCH = false;
const SHOW_SYSTEM_PROMPT_BANNER = false;

const DEFAULT_COMPANY  = {
  name: "Shoemaker Rigging & Transport LLC",
  address: "3385 Miller Park Road · Akron, OH 44312",
  services: "Industrial Rigging · Machinery Moving · Heavy Haul Transport",
  logoSrc: null
};

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
  // ── 2024 QUOTES ───────────────────────────────────────────────────────────
  // Apex Industrial LLC
  { id:1,   qn:"RIG-2024-001", client:"Apex Industrial LLC",         jobSite:"1200 Industrial Pkwy, Akron, OH 44312",        desc:"Press line relocation – Bay 4",                    date:"2024-02-12", status:"Won",       qtype:"Contract", labor:38400, equip:32000, hauling:9800,  travel:2400, mats:4000,  total:84200,  markup:0,    salesAssoc:"Dan M",   job_num:"J-2024-012", startDate:"2024-03-10", compDate:"2024-03-15", locked:true,  salesAdjustments:[{id:1,amount:4200,reason:"Additional Work",note:"Added crane pick for Bay 5",date:"2024-03-12"}], notes:"Long-term client.", attachments:[], contactName:"James Whitfield",  contactEmail:"j.whitfield@apexind.com",    contactPhone:"330-555-0182", equipList:["300","250","SEMI"] },
  { id:2,   qn:"RIG-2024-008", client:"Apex Industrial LLC",         jobSite:"1200 Industrial Pkwy, Akron, OH 44312",        desc:"Overhead crane installation – Bay 7",              date:"2024-08-20", status:"Won",       qtype:"Contract", labor:52000, equip:44000, hauling:11000, travel:3200, mats:6000,  total:112000, markup:0.08, salesAssoc:"Dan M",   job_num:"J-2024-088", startDate:"2024-09-08", compDate:"2024-09-13", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"James Whitfield",  contactEmail:"j.whitfield@apexind.com",    contactPhone:"330-555-0182", equipList:["250","320","PICK"] },
  { id:3,   qn:"RIG-2024-031", client:"Apex Industrial LLC",         jobSite:"1200 Industrial Pkwy, Akron, OH 44312",        desc:"Compressor skid installation – utility bay",       date:"2024-11-05", status:"Won",       qtype:"Contract", labor:29500, equip:24000, hauling:7200,  travel:1800, mats:3100,  total:63800,  markup:0.05, salesAssoc:"Sarah K", job_num:"J-2024-131", startDate:"2024-11-22", compDate:"2024-11-26", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Rick Torres",      contactEmail:"r.torres@apexind.com",       contactPhone:"330-555-0199", equipList:["302","PICK"] },
  // Beacon Manufacturing Co.
  { id:4,   qn:"RIG-2024-002", client:"Beacon Manufacturing Co.",    jobSite:"500 Commerce Blvd, Dayton, OH 45402",          desc:"Hydraulic press installation",                     date:"2024-01-15", status:"Won",       qtype:"Contract", labor:56000, equip:62000, hauling:18000, travel:6500, mats:6500,  total:142500, markup:0,    salesAssoc:"Sarah K", job_num:"J-2024-002", startDate:"2024-02-10", compDate:"2024-02-17", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Carolyn Marsh",    contactEmail:"c.marsh@beaconmfg.com",      contactPhone:"937-555-0244", equipList:["300","257","SEMI","PICK"] },
  { id:5,   qn:"RIG-2024-011", client:"Beacon Manufacturing Co.",    jobSite:"500 Commerce Blvd, Dayton, OH 45402",          desc:"CNC lathe bank relocation – Bldg B",               date:"2024-09-15", status:"Won",       qtype:"Contract", labor:31000, equip:27000, hauling:8000,  travel:2200, mats:3400,  total:71600,  markup:0.07, salesAssoc:"Sarah K", job_num:"J-2024-095", startDate:"2024-10-07", compDate:"2024-10-10", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Carolyn Marsh",    contactEmail:"c.marsh@beaconmfg.com",      contactPhone:"937-555-0244", equipList:["300","SEMI"] },
  { id:6,   qn:"RIG-2024-024", client:"Beacon Manufacturing Co.",    jobSite:"220 Warehouse Dr, Springfield, OH 45501",      desc:"Warehouse conveyor system relocation",             date:"2024-06-03", status:"Lost",      qtype:"T&M",      labor:18000, equip:14500, hauling:4200,  travel:1100, mats:1800,  total:39600,  markup:0,    salesAssoc:"Mike R",  job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"Lost on price.", attachments:[], contactName:"Doug Hensley",     contactEmail:"d.hensley@beaconmfg.com",    contactPhone:"937-555-0280", equipList:["257","PICK"] },
  // Cornerstone Plastics Inc.
  { id:7,   qn:"RIG-2024-003", client:"Cornerstone Plastics Inc.",   jobSite:"800 Factory Dr, Columbus, OH 43219",           desc:"Kiln dismantle & reinstall",                       date:"2024-03-18", status:"Won",       qtype:"T&M",      labor:28000, equip:24000, hauling:7200,  travel:2400, mats:2600,  total:61800,  markup:0,    salesAssoc:"Dan M",   job_num:"J-2024-018", startDate:"2024-04-05", compDate:"2024-04-09", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Pat Gilmore",      contactEmail:"p.gilmore@cornerstone.com",  contactPhone:"614-555-0312", equipList:["308","PICK"] },
  { id:8,   qn:"RIG-2024-015", client:"Cornerstone Plastics Inc.",   jobSite:"800 Factory Dr, Columbus, OH 43219",           desc:"Blow mold machine relocation",                     date:"2024-10-08", status:"Lost",      qtype:"Contract", labor:22000, equip:18000, hauling:5200,  travel:1500, mats:2100,  total:49500,  markup:0,    salesAssoc:"Dan M",   job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"Lost to competitor.", attachments:[], contactName:"Pat Gilmore",      contactEmail:"p.gilmore@cornerstone.com",  contactPhone:"614-555-0312", equipList:["301"] },
  // Delta Fabrication Group
  { id:9,   qn:"RIG-2024-019", client:"Delta Fabrication Group",     jobSite:"300 Metalworks Ave, Cleveland, OH 44124",      desc:"Press brake relocation – north wing",              date:"2024-04-30", status:"Won",       qtype:"Contract", labor:29000, equip:24500, hauling:7100,  travel:2000, mats:3100,  total:65700,  markup:0.07, salesAssoc:"Mike R",  job_num:"J-2024-049", startDate:"2024-05-20", compDate:"2024-05-23", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Sandra Voss",      contactEmail:"s.voss@deltafab.com",        contactPhone:"216-555-0415", equipList:["300","257","SEMI"] },
  { id:10,  qn:"RIG-2024-033", client:"Delta Fabrication Group",     jobSite:"300 Metalworks Ave, Cleveland, OH 44124",      desc:"Welding robot install – south bay",                date:"2024-12-02", status:"Won",       qtype:"Contract", labor:34000, equip:28000, hauling:8500,  travel:2300, mats:3800,  total:76600,  markup:0.06, salesAssoc:"Mike R",  job_num:"J-2024-143", startDate:"2024-12-16", compDate:"2024-12-20", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Sandra Voss",      contactEmail:"s.voss@deltafab.com",        contactPhone:"216-555-0415", equipList:["308","SEMI"] },
  // Eagle Press & Die
  { id:11,  qn:"RIG-2024-022", client:"Eagle Press & Die",           jobSite:"500 Eagle Way, Canton, OH 44702",              desc:"Die spotting press removal",                       date:"2024-07-10", status:"Won",       qtype:"Contract", labor:18500, equip:15500, hauling:4800,  travel:1300, mats:1900,  total:42800,  markup:0.08, salesAssoc:"Mike R",  job_num:"J-2024-071", startDate:"2024-08-01", compDate:"2024-08-03", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Bob Trexler",      contactEmail:"b.trexler@eaglepress.com",   contactPhone:"330-555-0311", equipList:["302","PICK"] },
  { id:12,  qn:"RIG-2024-029", client:"Eagle Press & Die",           jobSite:"500 Eagle Way, Canton, OH 44702",              desc:"Stamping press motor swap – Bay 3",                date:"2024-10-22", status:"Lost",      qtype:"T&M",      labor:12000, equip:9500,  hauling:2800,  travel:900,  mats:1200,  total:26400,  markup:0,    salesAssoc:"Dan M",   job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"Customer did work in-house.", attachments:[], contactName:"Lisa Brandt",      contactEmail:"l.brandt@eaglepress.com",    contactPhone:"330-555-0322", equipList:["PICK"] },
  // Frontier Castings Ltd.
  { id:13,  qn:"RIG-2024-027", client:"Frontier Castings Ltd.",      jobSite:"900 Industrial Blvd, Youngstown, OH 44503",    desc:"Sand casting conveyor relocation",                 date:"2024-09-22", status:"Won",       qtype:"Contract", labor:39000, equip:33000, hauling:9500,  travel:2900, mats:4300,  total:88700,  markup:0.07, salesAssoc:"Sarah K", job_num:"J-2024-097", startDate:"2024-10-14", compDate:"2024-10-18", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Tony Ruiz",        contactEmail:"t.ruiz@frontiercasting.com", contactPhone:"330-555-0518", equipList:["300","257","SEMI"] },
  { id:14,  qn:"RIG-2024-035", client:"Frontier Castings Ltd.",      jobSite:"900 Industrial Blvd, Youngstown, OH 44503",    desc:"Melt furnace refractory removal",                  date:"2024-12-10", status:"Won",       qtype:"T&M",      labor:22000, equip:19000, hauling:5500,  travel:1800, mats:2400,  total:50700,  markup:0.05, salesAssoc:"Dan M",   job_num:"J-2024-155", startDate:"2024-12-20", compDate:"2024-12-24", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Angela Kim",        contactEmail:"a.kim@frontiercasting.com",  contactPhone:"330-555-0530", equipList:["308","PICK"] },
  // Gateway Precision Tools
  { id:15,  qn:"RIG-2024-004", client:"Gateway Precision Tools",     jobSite:"2200 Gateway Blvd, Toledo, OH 43612",          desc:"EDM machine relocation – clean room",              date:"2024-02-28", status:"Won",       qtype:"Contract", labor:16500, equip:13000, hauling:3800,  travel:1200, mats:1600,  total:36100,  markup:0.08, salesAssoc:"Sarah K", job_num:"J-2024-014", startDate:"2024-03-18", compDate:"2024-03-20", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Frank Nguyen",      contactEmail:"f.nguyen@gatewaypt.com",     contactPhone:"419-555-0601", equipList:["302","PICK"] },
  { id:16,  qn:"RIG-2024-021", client:"Gateway Precision Tools",     jobSite:"2200 Gateway Blvd, Toledo, OH 43612",          desc:"CNC machining center install",                     date:"2024-07-18", status:"Won",       qtype:"Contract", labor:24000, equip:20000, hauling:5800,  travel:1700, mats:2600,  total:54100,  markup:0.06, salesAssoc:"Sarah K", job_num:"J-2024-078", startDate:"2024-08-12", compDate:"2024-08-15", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Frank Nguyen",      contactEmail:"f.nguyen@gatewaypt.com",     contactPhone:"419-555-0601", equipList:["308","PICK"] },
  // Horizon Automotive Parts
  { id:17,  qn:"RIG-2024-006", client:"Horizon Automotive Parts",    jobSite:"750 Assembly Dr, Findlay, OH 45840",           desc:"Transfer press line relocation",                   date:"2024-05-14", status:"Won",       qtype:"Contract", labor:68000, equip:72000, hauling:22000, travel:7200, mats:8500,  total:172700, markup:0.08, salesAssoc:"Mike R",  job_num:"J-2024-055", startDate:"2024-06-02", compDate:"2024-06-09", locked:true,  salesAdjustments:[{id:2,amount:6500,reason:"Additional Work",note:"Extra rigging for subframe",date:"2024-06-05"}], notes:"Largest job of Q2.", attachments:[], contactName:"Donna Holt",         contactEmail:"d.holt@horizonauto.com",     contactPhone:"419-555-0712", equipList:["320","250","SEMI","PICK"] },
  { id:18,  qn:"RIG-2024-025", client:"Horizon Automotive Parts",    jobSite:"750 Assembly Dr, Findlay, OH 45840",           desc:"Spot weld robot arm replacement",                  date:"2024-08-30", status:"Lost",      qtype:"T&M",      labor:14000, equip:11000, hauling:3200,  travel:1100, mats:1400,  total:30700,  markup:0,    salesAssoc:"Mike R",  job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"Customer used OEM crew.", attachments:[], contactName:"Donna Holt",         contactEmail:"d.holt@horizonauto.com",     contactPhone:"419-555-0712", equipList:["PICK"] },
  // Icon Rubber Products
  { id:19,  qn:"RIG-2024-009", client:"Icon Rubber Products",        jobSite:"5100 Rubber Ln, Barberton, OH 44203",          desc:"Extruder relocation – Line 2",                     date:"2024-06-20", status:"Won",       qtype:"T&M",      labor:21000, equip:17500, hauling:5100,  travel:1600, mats:2200,  total:47400,  markup:0.05, salesAssoc:"Dan M",   job_num:"J-2024-065", startDate:"2024-07-08", compDate:"2024-07-11", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Greg Owens",        contactEmail:"g.owens@iconrubber.com",     contactPhone:"330-555-0821", equipList:["301","PICK"] },
  { id:20,  qn:"RIG-2024-032", client:"Icon Rubber Products",        jobSite:"5100 Rubber Ln, Barberton, OH 44203",          desc:"Banbury mixer overhaul lift",                      date:"2024-11-14", status:"Won",       qtype:"Contract", labor:27500, equip:23000, hauling:6600,  travel:2100, mats:2900,  total:62100,  markup:0.06, salesAssoc:"Dan M",   job_num:"J-2024-132", startDate:"2024-12-02", compDate:"2024-12-05", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Greg Owens",        contactEmail:"g.owens@iconrubber.com",     contactPhone:"330-555-0821", equipList:["308","SEMI"] },
  // Junction Steel Works
  { id:21,  qn:"RIG-2024-010", client:"Junction Steel Works",        jobSite:"1800 Steel Way, Warren, OH 44483",             desc:"Coil reel and straightener set",                   date:"2024-07-02", status:"Won",       qtype:"Contract", labor:45000, equip:38000, hauling:11500, travel:3400, mats:5200,  total:103100, markup:0.07, salesAssoc:"Sarah K", job_num:"J-2024-067", startDate:"2024-07-22", compDate:"2024-07-26", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Ray Kowalski",       contactEmail:"r.kowalski@junctionsteel.com",contactPhone:"330-555-0933", equipList:["320","250","SEMI"] },
  { id:22,  qn:"RIG-2024-028", client:"Junction Steel Works",        jobSite:"1800 Steel Way, Warren, OH 44483",             desc:"Shear line decommission",                          date:"2024-10-10", status:"Lost",      qtype:"T&M",      labor:16000, equip:13000, hauling:3800,  travel:1300, mats:1700,  total:35800,  markup:0,    salesAssoc:"Sarah K", job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"No budget this quarter.", attachments:[], contactName:"Ray Kowalski",       contactEmail:"r.kowalski@junctionsteel.com",contactPhone:"330-555-0933", equipList:["300","PICK"] },
  // Keystone Die Casting
  { id:23,  qn:"RIG-2024-014", client:"Keystone Die Casting",        jobSite:"620 Die Cast Dr, Massillon, OH 44646",         desc:"Die cast machine #4 replacement",                  date:"2024-09-05", status:"Won",       qtype:"Contract", labor:51000, equip:46000, hauling:13500, travel:4100, mats:5800,  total:120400, markup:0.08, salesAssoc:"Mike R",  job_num:"J-2024-091", startDate:"2024-09-25", compDate:"2024-09-30", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Helen Marsh",        contactEmail:"h.marsh@keystonedc.com",     contactPhone:"330-555-1044", equipList:["320","250","SEMI","PICK"] },
  // Landmark Tooling Inc.
  { id:24,  qn:"RIG-2024-017", client:"Landmark Tooling Inc.",       jobSite:"3300 Tool & Die Ave, Medina, OH 44256",        desc:"Surface grinder relocation",                       date:"2024-10-17", status:"Won",       qtype:"T&M",      labor:13500, equip:11000, hauling:3200,  travel:1000, mats:1400,  total:30100,  markup:0.05, salesAssoc:"Dan M",   job_num:"J-2024-107", startDate:"2024-11-04", compDate:"2024-11-06", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Phil Stevens",       contactEmail:"p.stevens@landmarktool.com", contactPhone:"330-555-1155", equipList:["302","PICK"] },
  { id:25,  qn:"RIG-2024-030", client:"Landmark Tooling Inc.",       jobSite:"3300 Tool & Die Ave, Medina, OH 44256",        desc:"Coordinate measuring machine install",             date:"2024-11-20", status:"Lost",      qtype:"Contract", labor:8500,  equip:7000,  hauling:2000,  travel:700,  mats:900,   total:19100,  markup:0,    salesAssoc:"Dan M",   job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"Client postponed project.", attachments:[], contactName:"Phil Stevens",       contactEmail:"p.stevens@landmarktool.com", contactPhone:"330-555-1155", equipList:["PICK"] },
  // Meridian Extrusion Co.
  { id:26,  qn:"RIG-2024-013", client:"Meridian Extrusion Co.",      jobSite:"4100 Extrusion Blvd, Sandusky, OH 44870",      desc:"Die cart system installation",                     date:"2024-08-12", status:"Won",       qtype:"Contract", labor:33000, equip:27500, hauling:8200,  travel:2600, mats:3600,  total:74900,  markup:0.06, salesAssoc:"Sarah K", job_num:"J-2024-083", startDate:"2024-09-02", compDate:"2024-09-06", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Carol Jensen",        contactEmail:"c.jensen@meridianext.com",   contactPhone:"419-555-1266", equipList:["308","SEMI"] },
  // Northgate Aluminum
  { id:27,  qn:"RIG-2024-016", client:"Northgate Aluminum",          jobSite:"700 Smelter Rd, Lima, OH 45801",               desc:"Rolling mill bearing replacement lift",            date:"2024-10-01", status:"Won",       qtype:"T&M",      labor:42000, equip:36000, hauling:10800, travel:3500, mats:4800,  total:97100,  markup:0.07, salesAssoc:"Mike R",  job_num:"J-2024-101", startDate:"2024-10-21", compDate:"2024-10-25", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Bruce Tanner",       contactEmail:"b.tanner@northgatealum.com", contactPhone:"419-555-1377", equipList:["320","250","SEMI"] },

  // ── 2025 QUOTES ───────────────────────────────────────────────────────────
  // Apex Industrial LLC
  { id:28,  qn:"RIG-2025-001", client:"Apex Industrial LLC",         jobSite:"1200 Industrial Pkwy, Akron, OH 44312",        desc:"Heat treat oven relocation – Bay 2",               date:"2025-01-14", status:"Won",       qtype:"Contract", labor:31000, equip:26500, hauling:7800,  travel:2100, mats:3400,  total:70800,  markup:0.06, salesAssoc:"Dan M",   job_num:"J-2025-004", startDate:"2025-02-03", compDate:"2025-02-07", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"James Whitfield",  contactEmail:"j.whitfield@apexind.com",    contactPhone:"330-555-0182", equipList:["300","SEMI"] },
  { id:29,  qn:"RIG-2025-007", client:"Apex Industrial LLC",         jobSite:"1200 Industrial Pkwy, Akron, OH 44312",        desc:"Injection mold press relocation",                  date:"2025-04-10", status:"Won",       qtype:"T&M",      labor:24000, equip:19000, hauling:6500,  travel:1800, mats:2800,  total:54100,  markup:0.05, salesAssoc:"Sarah K", job_num:"J-2025-042", startDate:"2025-05-01", compDate:"2025-05-05", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Rick Torres",      contactEmail:"r.torres@apexind.com",       contactPhone:"330-555-0199", equipList:["302","PICK"] },
  { id:30,  qn:"RIG-2025-021", client:"Apex Industrial LLC",         jobSite:"1200 Industrial Pkwy, Akron, OH 44312",        desc:"Cooling tower pump skid installation",             date:"2025-08-05", status:"Won",       qtype:"Contract", labor:27000, equip:22500, hauling:6800,  travel:1900, mats:3000,  total:61200,  markup:0.05, salesAssoc:"Dan M",   job_num:"J-2025-089", startDate:"2025-08-25", compDate:"2025-08-29", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"James Whitfield",  contactEmail:"j.whitfield@apexind.com",    contactPhone:"330-555-0182", equipList:["300","PICK"] },
  // Beacon Manufacturing Co.
  { id:31,  qn:"RIG-2025-003", client:"Beacon Manufacturing Co.",    jobSite:"500 Commerce Blvd, Dayton, OH 45402",          desc:"Transformer set – electrical bay",                 date:"2025-01-22", status:"Won",       qtype:"T&M",      labor:18000, equip:21000, hauling:5500,  travel:1600, mats:2200,  total:48300,  markup:0,    salesAssoc:"Mike R",  job_num:"J-2025-008", startDate:"2025-02-10", compDate:"2025-02-13", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Doug Hensley",     contactEmail:"d.hensley@beaconmfg.com",    contactPhone:"937-555-0280", equipList:["257","PICK"] },
  { id:32,  qn:"RIG-2025-018", client:"Beacon Manufacturing Co.",    jobSite:"500 Commerce Blvd, Dayton, OH 45402",          desc:"Laser cutter installation – Bldg C",               date:"2025-06-17", status:"Won",       qtype:"Contract", labor:22500, equip:19000, hauling:5700,  travel:1700, mats:2500,  total:51400,  markup:0.05, salesAssoc:"Sarah K", job_num:"J-2025-071", startDate:"2025-07-07", compDate:"2025-07-10", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Carolyn Marsh",    contactEmail:"c.marsh@beaconmfg.com",      contactPhone:"937-555-0244", equipList:["308","PICK"] },
  { id:33,  qn:"RIG-2025-031", client:"Beacon Manufacturing Co.",    jobSite:"220 Warehouse Dr, Springfield, OH 45501",      desc:"Robotic palletizer install",                       date:"2025-10-08", status:"Lost",      qtype:"Contract", labor:19000, equip:15500, hauling:4600,  travel:1400, mats:2000,  total:42500,  markup:0,    salesAssoc:"Mike R",  job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"Lost on price to regional competitor.", attachments:[], contactName:"Doug Hensley",     contactEmail:"d.hensley@beaconmfg.com",    contactPhone:"937-555-0280", equipList:["257","PICK"] },
  // Cornerstone Plastics Inc.
  { id:34,  qn:"RIG-2025-009", client:"Cornerstone Plastics Inc.",   jobSite:"1450 Westgate Blvd, Columbus, OH 43228",       desc:"New facility equipment install",                   date:"2025-03-01", status:"Won",       qtype:"Contract", labor:41000, equip:36000, hauling:10500, travel:3100, mats:4800,  total:95400,  markup:0.08, salesAssoc:"Mike R",  job_num:"J-2025-028", startDate:"2025-03-24", compDate:"2025-03-29", locked:true,  salesAdjustments:[], notes:"New location.", attachments:[], contactName:"Pat Gilmore",      contactEmail:"p.gilmore@cornerstone.com",  contactPhone:"614-555-0312", equipList:["320","250","SEMI"] },
  { id:35,  qn:"RIG-2025-022", client:"Cornerstone Plastics Inc.",   jobSite:"1450 Westgate Blvd, Columbus, OH 43228",       desc:"Trim press relocation – west wing",                date:"2025-07-14", status:"Won",       qtype:"T&M",      labor:19500, equip:16000, hauling:4700,  travel:1500, mats:2100,  total:43800,  markup:0.05, salesAssoc:"Dan M",   job_num:"J-2025-076", startDate:"2025-08-04", compDate:"2025-08-07", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Pat Gilmore",      contactEmail:"p.gilmore@cornerstone.com",  contactPhone:"614-555-0312", equipList:["302","PICK"] },
  // Delta Fabrication Group
  { id:36,  qn:"RIG-2025-002", client:"Delta Fabrication Group",     jobSite:"300 Metalworks Ave, Cleveland, OH 44124",      desc:"Aluminum furnace relocation",                      date:"2025-01-08", status:"Lost",      qtype:"Contract", labor:21000, equip:18500, hauling:5800,  travel:1400, mats:2000,  total:47300,  markup:0,    salesAssoc:"Sarah K", job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"", attachments:[], contactName:"Sandra Voss",      contactEmail:"s.voss@deltafab.com",        contactPhone:"216-555-0415", equipList:["300","PICK"] },
  { id:37,  qn:"RIG-2025-011", client:"Delta Fabrication Group",     jobSite:"300 Metalworks Ave, Cleveland, OH 44124",      desc:"Stamping line expansion – Bay 9",                  date:"2025-05-20", status:"Won",       qtype:"T&M",      labor:35000, equip:31000, hauling:9000,  travel:2700, mats:4200,  total:81900,  markup:0,    salesAssoc:"Dan M",   job_num:"J-2025-055", startDate:"2025-06-09", compDate:"2025-06-13", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Sandra Voss",      contactEmail:"s.voss@deltafab.com",        contactPhone:"216-555-0415", equipList:["320","PICK"] },
  { id:38,  qn:"RIG-2025-028", client:"Delta Fabrication Group",     jobSite:"300 Metalworks Ave, Cleveland, OH 44124",      desc:"Press room HVAC unit lift & set",                  date:"2025-09-11", status:"Won",       qtype:"T&M",      labor:12000, equip:9500,  hauling:2800,  travel:900,  mats:1200,  total:26400,  markup:0,    salesAssoc:"Mike R",  job_num:"J-2025-098", startDate:"2025-09-29", compDate:"2025-09-30", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Sandra Voss",      contactEmail:"s.voss@deltafab.com",        contactPhone:"216-555-0415", equipList:["257","PICK"] },
  // Eagle Press & Die
  { id:39,  qn:"RIG-2025-002B",client:"Eagle Press & Die",           jobSite:"500 Eagle Way, Canton, OH 44702",              desc:"Press relocation – Building B",                    date:"2025-02-14", status:"Won",       qtype:"Contract", labor:44000, equip:38000, hauling:12000, travel:3200, mats:5200,  total:98000,  markup:0.10, salesAssoc:"Mike R",  job_num:"J-2025-018", startDate:"2025-03-06", compDate:"2025-03-11", locked:true,  salesAdjustments:[], notes:"Priority client.", attachments:[], contactName:"Bob Trexler",      contactEmail:"b.trexler@eaglepress.com",   contactPhone:"330-555-0311", equipList:["300","250","SEMI","PICK"] },
  { id:40,  qn:"RIG-2025-013", client:"Eagle Press & Die",           jobSite:"500 Eagle Way, Canton, OH 44702",              desc:"Robotic welding cell relocation",                  date:"2025-05-05", status:"Won",       qtype:"T&M",      labor:27000, equip:22000, hauling:6200,  travel:1900, mats:2800,  total:59900,  markup:0,    salesAssoc:"Dan M",   job_num:"J-2025-051", startDate:"2025-05-26", compDate:"2025-05-29", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Lisa Brandt",      contactEmail:"l.brandt@eaglepress.com",    contactPhone:"330-555-0322", equipList:["308","257"] },
  { id:41,  qn:"RIG-2025-029", client:"Eagle Press & Die",           jobSite:"500 Eagle Way, Canton, OH 44702",              desc:"Blanking press electrical upgrade lift",           date:"2025-09-22", status:"Lost",      qtype:"Contract", labor:16000, equip:13000, hauling:3800,  travel:1200, mats:1700,  total:35700,  markup:0,    salesAssoc:"Sarah K", job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"Deferred to 2026.", attachments:[], contactName:"Bob Trexler",      contactEmail:"b.trexler@eaglepress.com",   contactPhone:"330-555-0311", equipList:["302","PICK"] },
  // Frontier Castings Ltd.
  { id:42,  qn:"RIG-2025-006", client:"Frontier Castings Ltd.",      jobSite:"900 Industrial Blvd, Youngstown, OH 44503",    desc:"Furnace installation",                             date:"2025-02-28", status:"Won",       qtype:"T&M",      labor:32000, equip:28000, hauling:8500,  travel:2800, mats:3400,  total:74700,  markup:0.08, salesAssoc:"Dan M",   job_num:"J-2025-022", startDate:"2025-03-20", compDate:"2025-03-25", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Tony Ruiz",        contactEmail:"t.ruiz@frontiercasting.com", contactPhone:"330-555-0518", equipList:["320","SEMI"] },
  { id:43,  qn:"RIG-2025-016", client:"Frontier Castings Ltd.",      jobSite:"900 Industrial Blvd, Youngstown, OH 44503",    desc:"Core room equipment upgrade",                      date:"2025-06-10", status:"Won",       qtype:"Contract", labor:19000, equip:16500, hauling:4800,  travel:1400, mats:2100,  total:43800,  markup:0,    salesAssoc:"Mike R",  job_num:"J-2025-065", startDate:"2025-07-01", compDate:"2025-07-04", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Angela Kim",        contactEmail:"a.kim@frontiercasting.com",  contactPhone:"330-555-0530", equipList:["308","PICK"] },
  // Gateway Precision Tools
  { id:44,  qn:"RIG-2025-004", client:"Gateway Precision Tools",     jobSite:"2200 Gateway Blvd, Toledo, OH 43612",          desc:"5-axis machining center install",                  date:"2025-01-30", status:"Won",       qtype:"Contract", labor:28000, equip:23500, hauling:6900,  travel:2100, mats:3100,  total:63600,  markup:0.06, salesAssoc:"Sarah K", job_num:"J-2025-011", startDate:"2025-02-18", compDate:"2025-02-22", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Frank Nguyen",      contactEmail:"f.nguyen@gatewaypt.com",     contactPhone:"419-555-0601", equipList:["308","SEMI"] },
  { id:45,  qn:"RIG-2025-025", client:"Gateway Precision Tools",     jobSite:"2200 Gateway Blvd, Toledo, OH 43612",          desc:"Grinding center relocation – east wing",           date:"2025-08-20", status:"Lost",      qtype:"T&M",      labor:11500, equip:9000,  hauling:2600,  travel:900,  mats:1200,  total:25200,  markup:0,    salesAssoc:"Sarah K", job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"", attachments:[], contactName:"Frank Nguyen",      contactEmail:"f.nguyen@gatewaypt.com",     contactPhone:"419-555-0601", equipList:["302","PICK"] },
  // Horizon Automotive Parts
  { id:46,  qn:"RIG-2025-008", client:"Horizon Automotive Parts",    jobSite:"750 Assembly Dr, Findlay, OH 45840",           desc:"Assembly conveyor extension",                      date:"2025-03-15", status:"Won",       qtype:"Contract", labor:55000, equip:48000, hauling:14500, travel:4800, mats:6500,  total:128800, markup:0.07, salesAssoc:"Mike R",  job_num:"J-2025-032", startDate:"2025-04-07", compDate:"2025-04-14", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Donna Holt",         contactEmail:"d.holt@horizonauto.com",     contactPhone:"419-555-0712", equipList:["320","250","SEMI","PICK"] },
  { id:47,  qn:"RIG-2025-024", client:"Horizon Automotive Parts",    jobSite:"750 Assembly Dr, Findlay, OH 45840",           desc:"Paint line robot install",                         date:"2025-08-11", status:"Won",       qtype:"Contract", labor:37000, equip:31000, hauling:9200,  travel:3100, mats:4100,  total:84400,  markup:0.06, salesAssoc:"Mike R",  job_num:"J-2025-085", startDate:"2025-09-01", compDate:"2025-09-05", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Donna Holt",         contactEmail:"d.holt@horizonauto.com",     contactPhone:"419-555-0712", equipList:["320","SEMI","PICK"] },
  // Icon Rubber Products
  { id:48,  qn:"RIG-2025-010", client:"Icon Rubber Products",        jobSite:"5100 Rubber Ln, Barberton, OH 44203",          desc:"Calendar roll change-out",                         date:"2025-04-03", status:"Won",       qtype:"T&M",      labor:18000, equip:15000, hauling:4400,  travel:1400, mats:1900,  total:40700,  markup:0.05, salesAssoc:"Dan M",   job_num:"J-2025-038", startDate:"2025-04-22", compDate:"2025-04-24", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Greg Owens",        contactEmail:"g.owens@iconrubber.com",     contactPhone:"330-555-0821", equipList:["308","PICK"] },
  // Junction Steel Works
  { id:49,  qn:"RIG-2025-014", client:"Junction Steel Works",        jobSite:"1800 Steel Way, Warren, OH 44483",             desc:"Pipe mill stand replacement",                      date:"2025-05-28", status:"Won",       qtype:"Contract", labor:58000, equip:52000, hauling:15500, travel:5100, mats:7000,  total:137600, markup:0.08, salesAssoc:"Sarah K", job_num:"J-2025-059", startDate:"2025-06-16", compDate:"2025-06-21", locked:true,  salesAdjustments:[{id:3,amount:5800,reason:"Additional Work",note:"Extra support rigging required",date:"2025-06-18"}], notes:"", attachments:[], contactName:"Ray Kowalski",       contactEmail:"r.kowalski@junctionsteel.com",contactPhone:"330-555-0933", equipList:["320","250","CONE","PICK"] },
  { id:50,  qn:"RIG-2025-030", client:"Junction Steel Works",        jobSite:"1800 Steel Way, Warren, OH 44483",             desc:"Slitting line tension roll swap",                  date:"2025-10-14", status:"Won",       qtype:"T&M",      labor:24000, equip:20500, hauling:6000,  travel:2000, mats:2700,  total:55200,  markup:0.05, salesAssoc:"Sarah K", job_num:"J-2025-108", startDate:"2025-11-03", compDate:"2025-11-06", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Ray Kowalski",       contactEmail:"r.kowalski@junctionsteel.com",contactPhone:"330-555-0933", equipList:["308","SEMI"] },
  // Keystone Die Casting
  { id:51,  qn:"RIG-2025-012", client:"Keystone Die Casting",        jobSite:"620 Die Cast Dr, Massillon, OH 44646",         desc:"750-ton die cast press swap",                      date:"2025-05-06", status:"Won",       qtype:"Contract", labor:62000, equip:57000, hauling:17000, travel:5600, mats:7500,  total:149100, markup:0.08, salesAssoc:"Mike R",  job_num:"J-2025-053", startDate:"2025-05-27", compDate:"2025-06-02", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Helen Marsh",        contactEmail:"h.marsh@keystonedc.com",     contactPhone:"330-555-1044", equipList:["320","250","SEMI","PICK"] },
  // Meridian Extrusion Co.
  { id:52,  qn:"RIG-2025-019", client:"Meridian Extrusion Co.",      jobSite:"4100 Extrusion Blvd, Sandusky, OH 44870",      desc:"Extrusion press hydraulic unit swap",              date:"2025-06-25", status:"Won",       qtype:"Contract", labor:29000, equip:24000, hauling:7100,  travel:2300, mats:3200,  total:65600,  markup:0.06, salesAssoc:"Sarah K", job_num:"J-2025-073", startDate:"2025-07-14", compDate:"2025-07-18", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Carol Jensen",        contactEmail:"c.jensen@meridianext.com",   contactPhone:"419-555-1266", equipList:["308","SEMI"] },
  // Northgate Aluminum
  { id:53,  qn:"RIG-2025-015", client:"Northgate Aluminum",          jobSite:"700 Smelter Rd, Lima, OH 45801",               desc:"Casting table replacement",                        date:"2025-05-19", status:"Won",       qtype:"Contract", labor:47000, equip:41000, hauling:12200, travel:4000, mats:5500,  total:109700, markup:0.07, salesAssoc:"Mike R",  job_num:"J-2025-062", startDate:"2025-06-09", compDate:"2025-06-14", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Bruce Tanner",       contactEmail:"b.tanner@northgatealum.com", contactPhone:"419-555-1377", equipList:["320","250","SEMI"] },
  // Overland Transport Mfg.
  { id:54,  qn:"RIG-2025-005", client:"Overland Transport Mfg.",     jobSite:"2800 Axle Dr, Springfield, OH 45505",          desc:"Frame assembly jig install",                       date:"2025-02-20", status:"Won",       qtype:"Contract", labor:36000, equip:30500, hauling:9000,  travel:3000, mats:4000,  total:82500,  markup:0.06, salesAssoc:"Dan M",   job_num:"J-2025-019", startDate:"2025-03-12", compDate:"2025-03-17", locked:true,  salesAdjustments:[], notes:"New account – strong prospect for repeat work.", attachments:[], contactName:"Walt Simmons",       contactEmail:"w.simmons@overlandmfg.com",  contactPhone:"937-555-1488", equipList:["320","SEMI","PICK"] },
  { id:55,  qn:"RIG-2025-027", client:"Overland Transport Mfg.",     jobSite:"2800 Axle Dr, Springfield, OH 45505",          desc:"Wheel end machining center relocation",            date:"2025-09-03", status:"Won",       qtype:"T&M",      labor:22000, equip:18500, hauling:5400,  travel:1800, mats:2400,  total:50100,  markup:0,    salesAssoc:"Dan M",   job_num:"J-2025-096", startDate:"2025-09-22", compDate:"2025-09-25", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Walt Simmons",       contactEmail:"w.simmons@overlandmfg.com",  contactPhone:"937-555-1488", equipList:["308","PICK"] },
  // Pinnacle Forge & Stamp
  { id:56,  qn:"RIG-2025-020", client:"Pinnacle Forge & Stamp",      jobSite:"1100 Forge Rd, Canton, OH 44705",              desc:"Hammer forge press relocation",                    date:"2025-07-07", status:"Won",       qtype:"Contract", labor:53000, equip:47000, hauling:14000, travel:4600, mats:6200,  total:124800, markup:0.08, salesAssoc:"Sarah K", job_num:"J-2025-079", startDate:"2025-07-28", compDate:"2025-08-01", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Liz Kowalczyk",      contactEmail:"l.kowalczyk@pinnacleforge.com",contactPhone:"330-555-1599", equipList:["320","250","SEMI"] },
  // Quartz Industrial Services
  { id:57,  qn:"RIG-2025-017", client:"Quartz Industrial Services",  jobSite:"600 Industrial Ct, Mansfield, OH 44903",       desc:"Industrial chiller skid set",                      date:"2025-06-02", status:"Won",       qtype:"T&M",      labor:17000, equip:14000, hauling:4100,  travel:1300, mats:1800,  total:38200,  markup:0,    salesAssoc:"Mike R",  job_num:"J-2025-068", startDate:"2025-06-23", compDate:"2025-06-25", locked:true,  salesAdjustments:[], notes:"New account.", attachments:[], contactName:"Steve Mallory",      contactEmail:"s.mallory@quartzind.com",    contactPhone:"419-555-1610", equipList:["257","PICK"] },
  // Ridgeline Machine Works
  { id:58,  qn:"RIG-2025-023", client:"Ridgeline Machine Works",     jobSite:"4500 Machinist Way, Ravenna, OH 44266",        desc:"Horizontal boring mill relocation",                date:"2025-07-30", status:"Won",       qtype:"Contract", labor:31500, equip:26500, hauling:7800,  travel:2500, mats:3500,  total:71800,  markup:0.06, salesAssoc:"Dan M",   job_num:"J-2025-082", startDate:"2025-08-18", compDate:"2025-08-22", locked:true,  salesAdjustments:[], notes:"New account.", attachments:[], contactName:"Tom Garfield",       contactEmail:"t.garfield@ridgelinemw.com", contactPhone:"330-555-1721", equipList:["308","SEMI","PICK"] },
  // Summit Plastics Group
  { id:59,  qn:"RIG-2025-026", client:"Summit Plastics Group",       jobSite:"3200 Polymer Dr, Akron, OH 44314",             desc:"Blow mold line 4 expansion",                       date:"2025-09-08", status:"Won",       qtype:"Contract", labor:34500, equip:29000, hauling:8600,  travel:2800, mats:3800,  total:78700,  markup:0.06, salesAssoc:"Sarah K", job_num:"J-2025-094", startDate:"2025-09-29", compDate:"2025-10-03", locked:true,  salesAdjustments:[], notes:"New account – large expansion planned.", attachments:[], contactName:"Pam Rodriguez",       contactEmail:"p.rodriguez@summitplastics.com",contactPhone:"330-555-1832", equipList:["320","SEMI","PICK"] },
  // Titan Manufacturing LLC
  { id:60,  qn:"RIG-2025-032", client:"Titan Manufacturing LLC",     jobSite:"8800 Titan Blvd, Lorain, OH 44052",           desc:"Heavy press foundation anchor & set",              date:"2025-10-21", status:"Won",       qtype:"Contract", labor:71000, equip:65000, hauling:19500, travel:6400, mats:8800,  total:170700, markup:0.09, salesAssoc:"Mike R",  job_num:"J-2025-112", startDate:"2025-11-10", compDate:"2025-11-17", locked:true,  salesAdjustments:[{id:4,amount:8500,reason:"Additional Work",note:"Secondary crane required for second bay",date:"2025-11-13"}], notes:"New account – flagship job.", attachments:[], contactName:"Steve Dolan",         contactEmail:"s.dolan@titanmfg.com",       contactPhone:"440-555-1943", equipList:["320","250","CONE","SEMI","PICK"] },

  // ── 2026 QUOTES (YTD + active pipeline) ──────────────────────────────────
  // Apex Industrial LLC
  { id:61,  qn:"RIG-2026-001", client:"Apex Industrial LLC",         jobSite:"1200 Industrial Pkwy, Akron, OH 44312",        desc:"Press line relocation – Bay 4 expansion",          date:"2026-01-08", status:"Won",       qtype:"Contract", labor:42000, equip:36000, hauling:10500, travel:2800, mats:4500,  total:93800,  markup:0.06, salesAssoc:"Dan M",   job_num:"J-2026-002", startDate:"2026-01-27", compDate:"2026-02-01", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"James Whitfield",  contactEmail:"j.whitfield@apexind.com",    contactPhone:"330-555-0182", equipList:["300","250","SEMI"] },
  { id:62,  qn:"RIG-2026-008", client:"Apex Industrial LLC",         jobSite:"1200 Industrial Pkwy, Akron, OH 44312",        desc:"Injection mold press – Bay 10",                    date:"2026-02-14", status:"Submitted", qtype:"T&M",      labor:26000, equip:21500, hauling:6200,  travel:1900, mats:2900,  total:58500,  markup:0.05, salesAssoc:"Sarah K", job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"Follow up on approval.", attachments:[], contactName:"Rick Torres",      contactEmail:"r.torres@apexind.com",       contactPhone:"330-555-0199", equipList:["302","PICK"] },
  // Beacon Manufacturing Co.
  { id:63,  qn:"RIG-2026-003", client:"Beacon Manufacturing Co.",    jobSite:"500 Commerce Blvd, Dayton, OH 45402",          desc:"Hydraulic press rebuild & set",                    date:"2026-01-20", status:"Won",       qtype:"Contract", labor:48000, equip:43000, hauling:12800, travel:4200, mats:5500,  total:113500, markup:0.07, salesAssoc:"Sarah K", job_num:"J-2026-005", startDate:"2026-02-09", compDate:"2026-02-14", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Carolyn Marsh",    contactEmail:"c.marsh@beaconmfg.com",      contactPhone:"937-555-0244", equipList:["300","257","SEMI","PICK"] },
  { id:64,  qn:"RIG-2026-014", client:"Beacon Manufacturing Co.",    jobSite:"500 Commerce Blvd, Dayton, OH 45402",          desc:"Coolant system skid install",                      date:"2026-03-05", status:"Draft",     qtype:"T&M",      labor:16000, equip:13500, hauling:3900,  travel:1300, mats:1700,  total:36400,  markup:0,    salesAssoc:"Mike R",  job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"", attachments:[], contactName:"Doug Hensley",     contactEmail:"d.hensley@beaconmfg.com",    contactPhone:"937-555-0280", equipList:["257","PICK"] },
  // Cornerstone Plastics Inc.
  { id:65,  qn:"RIG-2026-004", client:"Cornerstone Plastics Inc.",   jobSite:"1450 Westgate Blvd, Columbus, OH 43228",       desc:"Injection press line – Phase 2",                   date:"2026-01-27", status:"Won",       qtype:"Contract", labor:44500, equip:39000, hauling:11500, travel:3400, mats:5000,  total:103400, markup:0.08, salesAssoc:"Mike R",  job_num:"J-2026-007", startDate:"2026-02-16", compDate:"2026-02-21", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Pat Gilmore",      contactEmail:"p.gilmore@cornerstone.com",  contactPhone:"614-555-0312", equipList:["320","250","SEMI"] },
  // Delta Fabrication Group
  { id:66,  qn:"RIG-2026-006", client:"Delta Fabrication Group",     jobSite:"300 Metalworks Ave, Cleveland, OH 44124",      desc:"Stamping press motor rebuild lift",                date:"2026-02-03", status:"Won",       qtype:"Contract", labor:31500, equip:27000, hauling:8000,  travel:2500, mats:3500,  total:72500,  markup:0.06, salesAssoc:"Dan M",   job_num:"J-2026-009", startDate:"2026-02-23", compDate:"2026-02-27", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Sandra Voss",      contactEmail:"s.voss@deltafab.com",        contactPhone:"216-555-0415", equipList:["300","257","SEMI"] },
  { id:67,  qn:"RIG-2026-016", client:"Delta Fabrication Group",     jobSite:"300 Metalworks Ave, Cleveland, OH 44124",      desc:"Shear line Bay 5 upgrade",                         date:"2026-03-10", status:"Submitted", qtype:"T&M",      labor:23000, equip:19000, hauling:5500,  travel:1700, mats:2500,  total:51700,  markup:0,    salesAssoc:"Mike R",  job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"", attachments:[], contactName:"Sandra Voss",      contactEmail:"s.voss@deltafab.com",        contactPhone:"216-555-0415", equipList:["308","PICK"] },
  // Eagle Press & Die
  { id:68,  qn:"RIG-2026-005", client:"Eagle Press & Die",           jobSite:"500 Eagle Way, Canton, OH 44702",              desc:"Transfer press overhaul lift",                     date:"2026-01-31", status:"Won",       qtype:"Contract", labor:39000, equip:33500, hauling:9800,  travel:3100, mats:4300,  total:89700,  markup:0.07, salesAssoc:"Mike R",  job_num:"J-2026-008", startDate:"2026-02-19", compDate:"2026-02-24", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Bob Trexler",      contactEmail:"b.trexler@eaglepress.com",   contactPhone:"330-555-0311", equipList:["300","250","SEMI","PICK"] },
  { id:69,  qn:"RIG-2026-015", client:"Eagle Press & Die",           jobSite:"500 Eagle Way, Canton, OH 44702",              desc:"Blanking press electrical upgrade lift",           date:"2026-03-12", status:"Submitted", qtype:"Contract", labor:17000, equip:14000, hauling:4100,  travel:1300, mats:1800,  total:38200,  markup:0,    salesAssoc:"Sarah K", job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"Deferred from 2025.", attachments:[], contactName:"Lisa Brandt",      contactEmail:"l.brandt@eaglepress.com",    contactPhone:"330-555-0322", equipList:["302","PICK"] },
  // Frontier Castings Ltd.
  { id:70,  qn:"RIG-2026-007", client:"Frontier Castings Ltd.",      jobSite:"900 Industrial Blvd, Youngstown, OH 44503",    desc:"Induction furnace replacement",                    date:"2026-02-10", status:"Won",       qtype:"Contract", labor:58000, equip:52000, hauling:15500, travel:5000, mats:7000,  total:137500, markup:0.08, salesAssoc:"Dan M",   job_num:"J-2026-011", startDate:"2026-03-02", compDate:"2026-03-08", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Tony Ruiz",        contactEmail:"t.ruiz@frontiercasting.com", contactPhone:"330-555-0518", equipList:["320","250","SEMI"] },
  // Horizon Automotive Parts
  { id:71,  qn:"RIG-2026-009", client:"Horizon Automotive Parts",    jobSite:"750 Assembly Dr, Findlay, OH 45840",           desc:"Body framing robot install – Line 3",              date:"2026-02-18", status:"Won",       qtype:"Contract", labor:64000, equip:57000, hauling:17000, travel:5600, mats:7500,  total:151100, markup:0.08, salesAssoc:"Mike R",  job_num:"J-2026-013", startDate:"2026-03-10", compDate:"2026-03-17", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Donna Holt",         contactEmail:"d.holt@horizonauto.com",     contactPhone:"419-555-0712", equipList:["320","250","CONE","SEMI","PICK"] },
  { id:72,  qn:"RIG-2026-017", client:"Horizon Automotive Parts",    jobSite:"750 Assembly Dr, Findlay, OH 45840",           desc:"Weld fixture relocation – Line 7",                 date:"2026-03-14", status:"Submitted", qtype:"T&M",      labor:29000, equip:24500, hauling:7200,  travel:2400, mats:3200,  total:66300,  markup:0,    salesAssoc:"Mike R",  job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"", attachments:[], contactName:"Donna Holt",         contactEmail:"d.holt@horizonauto.com",     contactPhone:"419-555-0712", equipList:["320","SEMI","PICK"] },
  // Junction Steel Works
  { id:73,  qn:"RIG-2026-010", client:"Junction Steel Works",        jobSite:"1800 Steel Way, Warren, OH 44483",             desc:"Coil straightener swap – Mill 2",                  date:"2026-02-25", status:"Won",       qtype:"Contract", labor:49000, equip:43500, hauling:13000, travel:4300, mats:5900,  total:115700, markup:0.07, salesAssoc:"Sarah K", job_num:"J-2026-015", startDate:"2026-03-17", compDate:"2026-03-22", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Ray Kowalski",       contactEmail:"r.kowalski@junctionsteel.com",contactPhone:"330-555-0933", equipList:["320","250","SEMI"] },
  // Keystone Die Casting
  { id:74,  qn:"RIG-2026-011", client:"Keystone Die Casting",        jobSite:"620 Die Cast Dr, Massillon, OH 44646",         desc:"1000-ton press acquisition install",               date:"2026-02-28", status:"Submitted", qtype:"Contract", labor:78000, equip:71000, hauling:21000, travel:6900, mats:9500,  total:186400, markup:0.09, salesAssoc:"Mike R",  job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"Largest quote of the year.", attachments:[], contactName:"Helen Marsh",        contactEmail:"h.marsh@keystonedc.com",     contactPhone:"330-555-1044", equipList:["320","250","CONE","SEMI","PICK"] },
  // Titan Manufacturing LLC
  { id:75,  qn:"RIG-2026-012", client:"Titan Manufacturing LLC",     jobSite:"8800 Titan Blvd, Lorain, OH 44052",           desc:"Secondary press bay equipment set",                date:"2026-03-04", status:"Submitted", qtype:"Contract", labor:62000, equip:56000, hauling:16800, travel:5500, mats:7800,  total:148100, markup:0.08, salesAssoc:"Mike R",  job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"Follow-up on 2025 flagship job.", attachments:[], contactName:"Steve Dolan",         contactEmail:"s.dolan@titanmfg.com",       contactPhone:"440-555-1943", equipList:["320","250","SEMI","PICK"] },
  // Northgate Aluminum
  { id:76,  qn:"RIG-2026-013", client:"Northgate Aluminum",          jobSite:"700 Smelter Rd, Lima, OH 45801",               desc:"Furnace hearth replacement lift",                   date:"2026-03-11", status:"Draft",     qtype:"Contract", labor:44000, equip:38500, hauling:11500, travel:3700, mats:5200,  total:102900, markup:0.07, salesAssoc:"Dan M",   job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"", attachments:[], contactName:"Bruce Tanner",       contactEmail:"b.tanner@northgatealum.com", contactPhone:"419-555-1377", equipList:["320","250","SEMI"] },
  // Summit Plastics Group
  { id:77,  qn:"RIG-2026-018", client:"Summit Plastics Group",       jobSite:"3200 Polymer Dr, Akron, OH 44314",             desc:"Extrusion line 2 relocation",                      date:"2026-03-17", status:"Draft",     qtype:"T&M",      labor:28000, equip:23500, hauling:6900,  travel:2200, mats:3100,  total:63700,  markup:0,    salesAssoc:"Sarah K", job_num:"",           startDate:"", compDate:"",           locked:false, salesAdjustments:[], notes:"", attachments:[], contactName:"Pam Rodriguez",       contactEmail:"p.rodriguez@summitplastics.com",contactPhone:"330-555-1832", equipList:["308","SEMI","PICK"] },
  // Pinnacle Forge & Stamp
  { id:78,  qn:"RIG-2026-002", client:"Pinnacle Forge & Stamp",      jobSite:"1100 Forge Rd, Canton, OH 44705",              desc:"Forging press rebuild – Bay 1",                    date:"2026-01-15", status:"Won",       qtype:"Contract", labor:57000, equip:51000, hauling:15200, travel:5000, mats:6900,  total:135100, markup:0.08, salesAssoc:"Sarah K", job_num:"J-2026-003", startDate:"2026-02-03", compDate:"2026-02-09", locked:true,  salesAdjustments:[], notes:"", attachments:[], contactName:"Liz Kowalczyk",      contactEmail:"l.kowalczyk@pinnacleforge.com",contactPhone:"330-555-1599", equipList:["320","250","SEMI"] },
];

const SAMPLE_REQS = [
  // ── 2024 RFQs ─────────────────────────────────────────────────────────────
  { id:201, rn:"REQ-2024-001", company:"Apex Industrial LLC",         requester:"James Whitfield", email:"j.whitfield@apexind.com",         phone:"330-555-0182", jobSite:"1200 Industrial Pkwy, Akron, OH 44312",   desc:"Relocate press line from Bay 3 to Bay 4, approx. 150ft.",          notes:"Urgent – production line down.",       date:"2024-01-28", status:"Quoted",      salesAssoc:"Dan M"   },
  { id:202, rn:"REQ-2024-002", company:"Beacon Manufacturing Co.",    requester:"Carolyn Marsh",   email:"c.marsh@beaconmfg.com",           phone:"937-555-0244", jobSite:"500 Commerce Blvd, Dayton, OH 45402",     desc:"Install new 500-ton hydraulic press, ground floor dock access.",   notes:"Need by end of Q1.",                   date:"2024-01-10", status:"Quoted",      salesAssoc:"Sarah K" },
  { id:203, rn:"REQ-2024-003", company:"Cornerstone Plastics Inc.",   requester:"Pat Gilmore",     email:"p.gilmore@cornerstone.com",       phone:"614-555-0312", jobSite:"800 Factory Dr, Columbus, OH 43219",       desc:"Dismantle and reinstall kiln, same building different bay.",        notes:"",                                     date:"2024-03-05", status:"Quoted",      salesAssoc:"Dan M"   },
  { id:204, rn:"REQ-2024-004", company:"Gateway Precision Tools",     requester:"Frank Nguyen",    email:"f.nguyen@gatewaypt.com",          phone:"419-555-0601", jobSite:"2200 Gateway Blvd, Toledo, OH 43612",     desc:"Relocate EDM machine to clean room, tight tolerances required.",   notes:"Clean room protocol required.",        date:"2024-02-14", status:"Quoted",      salesAssoc:"Sarah K" },
  { id:205, rn:"REQ-2024-005", company:"Delta Fabrication Group",     requester:"Sandra Voss",     email:"s.voss@deltafab.com",             phone:"216-555-0415", jobSite:"300 Metalworks Ave, Cleveland, OH 44124",  desc:"Press brake relocation, north wing expansion.",                    notes:"Coordinate with plant shutdown.",       date:"2024-04-18", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:206, rn:"REQ-2024-006", company:"Horizon Automotive Parts",    requester:"Donna Holt",      email:"d.holt@horizonauto.com",          phone:"419-555-0712", jobSite:"750 Assembly Dr, Findlay, OH 45840",       desc:"Full transfer press line relocation, 5 presses, stamping bay.",    notes:"Summer shutdown window only.",         date:"2024-05-02", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:207, rn:"REQ-2024-007", company:"Icon Rubber Products",        requester:"Greg Owens",      email:"g.owens@iconrubber.com",          phone:"330-555-0821", jobSite:"5100 Rubber Ln, Barberton, OH 44203",      desc:"Extruder Line 2 move to Building B.",                              notes:"",                                     date:"2024-06-10", status:"Quoted",      salesAssoc:"Dan M"   },
  { id:208, rn:"REQ-2024-008", company:"Eagle Press & Die",           requester:"Bob Trexler",     email:"b.trexler@eaglepress.com",        phone:"330-555-0311", jobSite:"500 Eagle Way, Canton, OH 44702",          desc:"Remove die spotting press, building demo prep.",                   notes:"Demo crew takes over after removal.",  date:"2024-06-28", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:209, rn:"REQ-2024-009", company:"Junction Steel Works",        requester:"Ray Kowalski",    email:"r.kowalski@junctionsteel.com",    phone:"330-555-0933", jobSite:"1800 Steel Way, Warren, OH 44483",         desc:"Coil reel and straightener installation, new line.",               notes:"Crane capacity verification needed.",  date:"2024-06-20", status:"Quoted",      salesAssoc:"Sarah K" },
  { id:210, rn:"REQ-2024-010", company:"Keystone Die Casting",        requester:"Helen Marsh",     email:"h.marsh@keystonedc.com",          phone:"330-555-1044", jobSite:"620 Die Cast Dr, Massillon, OH 44646",     desc:"Replace die cast machine #4, 750-ton unit.",                      notes:"Union shop – certified riggers req.",  date:"2024-08-22", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:211, rn:"REQ-2024-011", company:"Meridian Extrusion Co.",      requester:"Carol Jensen",    email:"c.jensen@meridianext.com",        phone:"419-555-1266", jobSite:"4100 Extrusion Blvd, Sandusky, OH 44870",  desc:"Install die cart system and rail, press bay.",                     notes:"",                                     date:"2024-08-01", status:"Quoted",      salesAssoc:"Sarah K" },
  { id:212, rn:"REQ-2024-012", company:"Northgate Aluminum",          requester:"Bruce Tanner",    email:"b.tanner@northgatealum.com",      phone:"419-555-1377", jobSite:"700 Smelter Rd, Lima, OH 45801",           desc:"Rolling mill bearing replacement – full lift & re-set.",           notes:"High temp environment.",               date:"2024-09-15", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:213, rn:"REQ-2024-013", company:"Frontier Castings Ltd.",      requester:"Tony Ruiz",       email:"t.ruiz@frontiercasting.com",      phone:"330-555-0518", jobSite:"900 Industrial Blvd, Youngstown, OH 44503", desc:"Sand casting conveyor relocation, Building A to B.",               notes:"Union cert docs required.",            date:"2024-09-10", status:"Quoted",      salesAssoc:"Sarah K" },
  { id:214, rn:"REQ-2024-014", company:"Landmark Tooling Inc.",       requester:"Phil Stevens",    email:"p.stevens@landmarktool.com",      phone:"330-555-1155", jobSite:"3300 Tool & Die Ave, Medina, OH 44256",    desc:"Surface grinder relocation to new precision room.",                notes:"",                                     date:"2024-10-07", status:"Quoted",      salesAssoc:"Dan M"   },
  { id:215, rn:"REQ-2024-015", company:"Gateway Precision Tools",     requester:"Frank Nguyen",    email:"f.nguyen@gatewaypt.com",          phone:"419-555-0601", jobSite:"2200 Gateway Blvd, Toledo, OH 43612",     desc:"CNC machining center install, Building C.",                        notes:"",                                     date:"2024-07-10", status:"Quoted",      salesAssoc:"Sarah K" },
  { id:216, rn:"REQ-2024-016", company:"Frontier Castings Ltd.",      requester:"Angela Kim",      email:"a.kim@frontiercasting.com",       phone:"330-555-0530", jobSite:"900 Industrial Blvd, Youngstown, OH 44503", desc:"Melt furnace refractory removal – outage window.",                 notes:"48hr window only.",                    date:"2024-12-02", status:"Quoted",      salesAssoc:"Dan M"   },
  { id:217, rn:"REQ-2024-017", company:"Icon Rubber Products",        requester:"Greg Owens",      email:"g.owens@iconrubber.com",          phone:"330-555-0821", jobSite:"5100 Rubber Ln, Barberton, OH 44203",      desc:"Banbury mixer overhaul lift.",                                     notes:"",                                     date:"2024-11-04", status:"Quoted",      salesAssoc:"Dan M"   },
  { id:218, rn:"REQ-2024-018", company:"Delta Fabrication Group",     requester:"Sandra Voss",     email:"s.voss@deltafab.com",             phone:"216-555-0415", jobSite:"300 Metalworks Ave, Cleveland, OH 44124",  desc:"Install welding robot in south bay.",                              notes:"Coordinate with automation vendor.",    date:"2024-11-20", status:"Quoted",      salesAssoc:"Mike R"  },

  // ── 2025 RFQs ─────────────────────────────────────────────────────────────
  { id:219, rn:"REQ-2025-001", company:"Apex Industrial LLC",         requester:"James Whitfield", email:"j.whitfield@apexind.com",         phone:"330-555-0182", jobSite:"1200 Industrial Pkwy, Akron, OH 44312",   desc:"Relocate 40-ton hydraulic press from Bay 3 to Bay 7, 200ft.",     notes:"",                                     date:"2025-01-06", status:"Quoted",      salesAssoc:"Dan M"   },
  { id:220, rn:"REQ-2025-002", company:"Beacon Manufacturing Co.",    requester:"Carolyn Marsh",   email:"c.marsh@beaconmfg.com",           phone:"937-555-0244", jobSite:"500 Commerce Blvd, Dayton, OH 45402",     desc:"Install transformer 15,000 lbs, second floor.",                   notes:"Need quote by end of week.",           date:"2025-01-15", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:221, rn:"REQ-2025-003", company:"Overland Transport Mfg.",     requester:"Walt Simmons",    email:"w.simmons@overlandmfg.com",       phone:"937-555-1488", jobSite:"2800 Axle Dr, Springfield, OH 45505",     desc:"Frame assembly jig installation, new building.",                   notes:"New account – strong relationship.",   date:"2025-02-10", status:"Quoted",      salesAssoc:"Dan M"   },
  { id:222, rn:"REQ-2025-004", company:"Gateway Precision Tools",     requester:"Frank Nguyen",    email:"f.nguyen@gatewaypt.com",          phone:"419-555-0601", jobSite:"2200 Gateway Blvd, Toledo, OH 43612",     desc:"5-axis machining center installation.",                            notes:"",                                     date:"2025-01-22", status:"Quoted",      salesAssoc:"Sarah K" },
  { id:223, rn:"REQ-2025-005", company:"Eagle Press & Die",           requester:"Bob Trexler",     email:"b.trexler@eaglepress.com",        phone:"330-555-0311", jobSite:"500 Eagle Way, Canton, OH 44702",          desc:"Press Building B relocation, 800-ton unit.",                       notes:"Priority client.",                     date:"2025-02-05", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:224, rn:"REQ-2025-006", company:"Frontier Castings Ltd.",      requester:"Tony Ruiz",       email:"t.ruiz@frontiercasting.com",      phone:"330-555-0518", jobSite:"900 Industrial Blvd, Youngstown, OH 44503", desc:"Furnace installation, new pour station.",                          notes:"Union shop.",                          date:"2025-02-20", status:"Quoted",      salesAssoc:"Dan M"   },
  { id:225, rn:"REQ-2025-007", company:"Cornerstone Plastics Inc.",   requester:"Pat Gilmore",     email:"p.gilmore@cornerstone.com",       phone:"614-555-0312", jobSite:"1450 Westgate Blvd, Columbus, OH 43228",   desc:"Full facility equipment install, new location.",                   notes:"New location.",                        date:"2025-02-24", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:226, rn:"REQ-2025-008", company:"Horizon Automotive Parts",    requester:"Donna Holt",      email:"d.holt@horizonauto.com",          phone:"419-555-0712", jobSite:"750 Assembly Dr, Findlay, OH 45840",       desc:"Assembly conveyor extension, Line 4.",                             notes:"",                                     date:"2025-03-06", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:227, rn:"REQ-2025-009", company:"Keystone Die Casting",        requester:"Helen Marsh",     email:"h.marsh@keystonedc.com",          phone:"330-555-1044", jobSite:"620 Die Cast Dr, Massillon, OH 44646",     desc:"750-ton die cast press swap.",                                     notes:"Certified crane operator required.",   date:"2025-04-28", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:228, rn:"REQ-2025-010", company:"Icon Rubber Products",        requester:"Greg Owens",      email:"g.owens@iconrubber.com",          phone:"330-555-0821", jobSite:"5100 Rubber Ln, Barberton, OH 44203",      desc:"Calendar roll change-out.",                                        notes:"",                                     date:"2025-03-27", status:"Quoted",      salesAssoc:"Dan M"   },
  { id:229, rn:"REQ-2025-011", company:"Junction Steel Works",        requester:"Ray Kowalski",    email:"r.kowalski@junctionsteel.com",    phone:"330-555-0933", jobSite:"1800 Steel Way, Warren, OH 44483",         desc:"Pipe mill stand replacement.",                                     notes:"Crane capacity check required.",       date:"2025-05-19", status:"Quoted",      salesAssoc:"Sarah K" },
  { id:230, rn:"REQ-2025-012", company:"Northgate Aluminum",          requester:"Bruce Tanner",    email:"b.tanner@northgatealum.com",      phone:"419-555-1377", jobSite:"700 Smelter Rd, Lima, OH 45801",           desc:"Casting table replacement.",                                       notes:"",                                     date:"2025-05-12", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:231, rn:"REQ-2025-013", company:"Meridian Extrusion Co.",      requester:"Carol Jensen",    email:"c.jensen@meridianext.com",        phone:"419-555-1266", jobSite:"4100 Extrusion Blvd, Sandusky, OH 44870",  desc:"Extrusion press hydraulic unit swap.",                             notes:"",                                     date:"2025-06-18", status:"Quoted",      salesAssoc:"Sarah K" },
  { id:232, rn:"REQ-2025-014", company:"Pinnacle Forge & Stamp",      requester:"Liz Kowalczyk",   email:"l.kowalczyk@pinnacleforge.com",   phone:"330-555-1599", jobSite:"1100 Forge Rd, Canton, OH 44705",          desc:"Hammer forge press relocation.",                                   notes:"",                                     date:"2025-06-30", status:"Quoted",      salesAssoc:"Sarah K" },
  { id:233, rn:"REQ-2025-015", company:"Quartz Industrial Services",  requester:"Steve Mallory",   email:"s.mallory@quartzind.com",         phone:"419-555-1610", jobSite:"600 Industrial Ct, Mansfield, OH 44903",   desc:"Industrial chiller skid placement.",                               notes:"New account.",                         date:"2025-05-27", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:234, rn:"REQ-2025-016", company:"Ridgeline Machine Works",     requester:"Tom Garfield",    email:"t.garfield@ridgelinemw.com",      phone:"330-555-1721", jobSite:"4500 Machinist Way, Ravenna, OH 44266",    desc:"Horizontal boring mill relocation.",                               notes:"New account.",                         date:"2025-07-21", status:"Quoted",      salesAssoc:"Dan M"   },
  { id:235, rn:"REQ-2025-017", company:"Summit Plastics Group",       requester:"Pam Rodriguez",   email:"p.rodriguez@summitplastics.com",  phone:"330-555-1832", jobSite:"3200 Polymer Dr, Akron, OH 44314",         desc:"Blow mold line 4 expansion.",                                      notes:"New account.",                         date:"2025-08-29", status:"Quoted",      salesAssoc:"Sarah K" },
  { id:236, rn:"REQ-2025-018", company:"Titan Manufacturing LLC",     requester:"Steve Dolan",     email:"s.dolan@titanmfg.com",           phone:"440-555-1943", jobSite:"8800 Titan Blvd, Lorain, OH 44052",        desc:"Heavy press foundation anchor and set – Bay 1.",                  notes:"New account – flagship.",              date:"2025-10-13", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:237, rn:"REQ-2025-019", company:"Overland Transport Mfg.",     requester:"Walt Simmons",    email:"w.simmons@overlandmfg.com",       phone:"937-555-1488", jobSite:"2800 Axle Dr, Springfield, OH 45505",     desc:"Wheel end machining center relocation.",                           notes:"",                                     date:"2025-08-25", status:"Quoted",      salesAssoc:"Dan M"   },
  { id:238, rn:"REQ-2025-020", company:"Delta Fabrication Group",     requester:"Sandra Voss",     email:"s.voss@deltafab.com",             phone:"216-555-0415", jobSite:"300 Metalworks Ave, Cleveland, OH 44124",  desc:"Press room HVAC unit lift and set.",                               notes:"",                                     date:"2025-09-03", status:"Quoted",      salesAssoc:"Mike R"  },

  // ── 2026 RFQs (active) ────────────────────────────────────────────────────
  { id:239, rn:"REQ-2026-001", company:"Apex Industrial LLC",         requester:"James Whitfield", email:"j.whitfield@apexind.com",         phone:"330-555-0182", jobSite:"1200 Industrial Pkwy, Akron, OH 44312",   desc:"Injection mold press Bay 10 – 350-ton unit relocation.",          notes:"Follow up on 2025 approval.",          date:"2026-02-05", status:"Quoted",      salesAssoc:"Sarah K" },
  { id:240, rn:"REQ-2026-002", company:"Keystone Die Casting",        requester:"Helen Marsh",     email:"h.marsh@keystonedc.com",          phone:"330-555-1044", jobSite:"620 Die Cast Dr, Massillon, OH 44646",     desc:"1000-ton press acquisition – full install, new bay.",              notes:"Largest project to date.",             date:"2026-02-20", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:241, rn:"REQ-2026-003", company:"Titan Manufacturing LLC",     requester:"Steve Dolan",     email:"s.dolan@titanmfg.com",           phone:"440-555-1943", jobSite:"8800 Titan Blvd, Lorain, OH 44052",        desc:"Secondary press bay equipment set – follow-on from J-2025-112.",  notes:"",                                     date:"2026-02-26", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:242, rn:"REQ-2026-004", company:"Horizon Automotive Parts",    requester:"Donna Holt",      email:"d.holt@horizonauto.com",          phone:"419-555-0712", jobSite:"750 Assembly Dr, Findlay, OH 45840",       desc:"Weld fixture relocation Line 7, coordinate with Line 3 job.",      notes:"",                                     date:"2026-03-06", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:243, rn:"REQ-2026-005", company:"Delta Fabrication Group",     requester:"Sandra Voss",     email:"s.voss@deltafab.com",             phone:"216-555-0415", jobSite:"300 Metalworks Ave, Cleveland, OH 44124",  desc:"Shear line Bay 5 upgrade – new shear and material handling.",      notes:"",                                     date:"2026-03-08", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:244, rn:"REQ-2026-006", company:"Eagle Press & Die",           requester:"Lisa Brandt",     email:"l.brandt@eaglepress.com",         phone:"330-555-0322", jobSite:"500 Eagle Way, Canton, OH 44702",          desc:"Blanking press electrical upgrade – deferred from 2025.",          notes:"Deferred from 2025 bid.",              date:"2026-03-10", status:"Quoted",      salesAssoc:"Sarah K" },
  { id:245, rn:"REQ-2026-007", company:"Northgate Aluminum",          requester:"Bruce Tanner",    email:"b.tanner@northgatealum.com",      phone:"419-555-1377", jobSite:"700 Smelter Rd, Lima, OH 45801",           desc:"Furnace hearth replacement – outage window.",                      notes:"High temp environment.",               date:"2026-03-09", status:"Quoted",      salesAssoc:"Dan M"   },
  { id:246, rn:"REQ-2026-008", company:"Summit Plastics Group",       requester:"Pam Rodriguez",   email:"p.rodriguez@summitplastics.com",  phone:"330-555-1832", jobSite:"3200 Polymer Dr, Akron, OH 44314",         desc:"Extrusion line 2 relocation.",                                     notes:"",                                     date:"2026-03-15", status:"Quoted",      salesAssoc:"Sarah K" },
  { id:247, rn:"REQ-2026-009", company:"Beacon Manufacturing Co.",    requester:"Doug Hensley",    email:"d.hensley@beaconmfg.com",         phone:"937-555-0280", jobSite:"500 Commerce Blvd, Dayton, OH 45402",     desc:"Coolant system skid install – Bldg A.",                            notes:"",                                     date:"2026-03-03", status:"Quoted",      salesAssoc:"Mike R"  },
  { id:248, rn:"REQ-2026-010", company:"Ridgeline Machine Works",     requester:"Tom Garfield",    email:"t.garfield@ridgelinemw.com",      phone:"330-555-1721", jobSite:"4500 Machinist Way, Ravenna, OH 44266",    desc:"Vertical turning lathe install.",                                  notes:"",                                     date:"2026-03-18", status:"New",         salesAssoc:""        },
  { id:249, rn:"REQ-2026-011", company:"Quartz Industrial Services",  requester:"Steve Mallory",   email:"s.mallory@quartzind.com",         phone:"419-555-1610", jobSite:"600 Industrial Ct, Mansfield, OH 44903",   desc:"Cooling tower pump skid replacement.",                             notes:"",                                     date:"2026-03-19", status:"New",         salesAssoc:""        },
  { id:250, rn:"REQ-2026-012", company:"Landmark Tooling Inc.",       requester:"Phil Stevens",    email:"p.stevens@landmarktool.com",      phone:"330-555-1155", jobSite:"3300 Tool & Die Ave, Medina, OH 44256",    desc:"CNC turning center install – precision room.",                     notes:"Need quote ASAP.",                     date:"2026-03-20", status:"In Progress", salesAssoc:"Dan M"   },
  { id:251, rn:"REQ-2026-013", company:"Pinnacle Forge & Stamp",      requester:"Liz Kowalczyk",   email:"l.kowalczyk@pinnacleforge.com",   phone:"330-555-1599", jobSite:"1100 Forge Rd, Canton, OH 44705",          desc:"Forging press rebuild Bay 2.",                                     notes:"Follow-on from Jan job.",              date:"2026-03-21", status:"In Progress", salesAssoc:"Sarah K" },
  { id:252, rn:"REQ-2026-014", company:"Junction Steel Works",        requester:"Ray Kowalski",    email:"r.kowalski@junctionsteel.com",    phone:"330-555-0933", jobSite:"1800 Steel Way, Warren, OH 44483",         desc:"Entry-end equipment upgrade – Mill 3.",                            notes:"",                                     date:"2026-03-22", status:"New",         salesAssoc:""        },
];

// Initial customer contact books and notes
const INIT_CUST_DATA = {
  "Apex Industrial LLC":         { notes:"Long-term client since 2019. Always pays on time. Largest single account.", billingAddr:"1200 Industrial Pkwy, Akron, OH 44312", website:"www.apexindustrial.com", industry:"Heavy Manufacturing", paymentTerms:"Net 30", accountNum:"APX-001", contacts:[{id:1,name:"James Whitfield",title:"Plant Manager",email:"j.whitfield@apexind.com",phone:"330-555-0182",primary:true,locationId:"loc1"},{id:2,name:"Rick Torres",title:"Maintenance Supervisor",email:"r.torres@apexind.com",phone:"330-555-0199",primary:false,locationId:"loc1"}], locations:[{id:"loc1",name:"Akron Main Plant",address:"1200 Industrial Pkwy, Akron, OH 44312",notes:"Primary facility"}] },
  "Beacon Manufacturing Co.":    { notes:"Mid-size shop. Multiple locations. Carolyn handles all rigging requests.", billingAddr:"500 Commerce Blvd, Dayton, OH 45402", website:"www.beaconmfg.com", industry:"Precision Manufacturing", paymentTerms:"Net 45", accountNum:"BCN-002", contacts:[{id:1,name:"Carolyn Marsh",title:"Facilities Director",email:"c.marsh@beaconmfg.com",phone:"937-555-0244",primary:true,locationId:"loc1"},{id:2,name:"Doug Hensley",title:"Maintenance Manager",email:"d.hensley@beaconmfg.com",phone:"937-555-0280",primary:false,locationId:"loc2"}], locations:[{id:"loc1",name:"Dayton Facility",address:"500 Commerce Blvd, Dayton, OH 45402",notes:"HQ and main production"},{id:"loc2",name:"Springfield Warehouse",address:"220 Warehouse Dr, Springfield, OH 45501",notes:"Secondary storage"}] },
  "Cornerstone Plastics Inc.":   { notes:"Growing account. New facility opened 2025. Repeat business expected.", billingAddr:"800 Factory Dr, Columbus, OH 43219", website:"", industry:"Plastics Manufacturing", paymentTerms:"Net 30", accountNum:"CRN-003", contacts:[{id:1,name:"Pat Gilmore",title:"Operations Manager",email:"p.gilmore@cornerstone.com",phone:"614-555-0312",primary:true,locationId:null}], locations:[{id:"loc1",name:"Columbus Plant",address:"800 Factory Dr, Columbus, OH 43219",notes:""},{id:"loc2",name:"Westgate Facility",address:"1450 Westgate Blvd, Columbus, OH 43228",notes:"New facility 2025"}] },
  "Delta Fabrication Group":     { notes:"Competitive bidding environment. Price-sensitive. Good volume.", billingAddr:"300 Metalworks Ave, Cleveland, OH 44124", website:"www.deltafab.com", industry:"Metal Fabrication", paymentTerms:"Net 30", accountNum:"DLT-004", contacts:[{id:1,name:"Sandra Voss",title:"Purchasing Manager",email:"s.voss@deltafab.com",phone:"216-555-0415",primary:true,locationId:null}], locations:[{id:"loc1",name:"Cleveland Fab Shop",address:"300 Metalworks Ave, Cleveland, OH 44124",notes:""}] },
  "Eagle Press & Die":           { notes:"Excellent relationship. Repeat business every quarter. Priority client.", billingAddr:"500 Eagle Way, Canton, OH 44702", website:"www.eaglepress.com", industry:"Press & Die Manufacturing", paymentTerms:"Net 15", accountNum:"EGL-005", contacts:[{id:1,name:"Bob Trexler",title:"VP Operations",email:"b.trexler@eaglepress.com",phone:"330-555-0311",primary:true,locationId:"loc1"},{id:2,name:"Lisa Brandt",title:"Plant Engineer",email:"l.brandt@eaglepress.com",phone:"330-555-0322",primary:false,locationId:"loc1"}], locations:[{id:"loc1",name:"Canton Facility",address:"500 Eagle Way, Canton, OH 44702",notes:""}] },
  "Frontier Castings Ltd.":      { notes:"Union shop. Require certified rigging documentation. Strong relationship.", billingAddr:"900 Industrial Blvd, Youngstown, OH 44503", website:"", industry:"Metal Casting", paymentTerms:"Net 45", accountNum:"FRT-006", contacts:[{id:1,name:"Tony Ruiz",title:"Safety & Facilities",email:"t.ruiz@frontiercasting.com",phone:"330-555-0518",primary:true,locationId:null},{id:2,name:"Angela Kim",title:"Project Coordinator",email:"a.kim@frontiercasting.com",phone:"330-555-0530",primary:false,locationId:null}], locations:[{id:"loc1",name:"Youngstown Plant",address:"900 Industrial Blvd, Youngstown, OH 44503",notes:""}] },
  "Gateway Precision Tools":     { notes:"Clean room protocols required. Excellent payer. Expanding operations.", billingAddr:"2200 Gateway Blvd, Toledo, OH 43612", website:"www.gatewaypt.com", industry:"Precision Tooling", paymentTerms:"Net 30", accountNum:"GTW-007", contacts:[{id:1,name:"Frank Nguyen",title:"Facilities Engineer",email:"f.nguyen@gatewaypt.com",phone:"419-555-0601",primary:true,locationId:null}], locations:[{id:"loc1",name:"Toledo Facility",address:"2200 Gateway Blvd, Toledo, OH 43612",notes:""}] },
  "Horizon Automotive Parts":    { notes:"Automotive tier 1 supplier. Large project volumes. Summer shutdown windows.", billingAddr:"750 Assembly Dr, Findlay, OH 45840", website:"www.horizonauto.com", industry:"Automotive Parts Manufacturing", paymentTerms:"Net 45", accountNum:"HRZ-008", contacts:[{id:1,name:"Donna Holt",title:"Plant Manager",email:"d.holt@horizonauto.com",phone:"419-555-0712",primary:true,locationId:null}], locations:[{id:"loc1",name:"Findlay Assembly Plant",address:"750 Assembly Dr, Findlay, OH 45840",notes:""}] },
  "Icon Rubber Products":        { notes:"Consistent repeat business. High-temp environment jobs common.", billingAddr:"5100 Rubber Ln, Barberton, OH 44203", website:"", industry:"Rubber Products Manufacturing", paymentTerms:"Net 30", accountNum:"ICN-009", contacts:[{id:1,name:"Greg Owens",title:"Maintenance Director",email:"g.owens@iconrubber.com",phone:"330-555-0821",primary:true,locationId:null}], locations:[{id:"loc1",name:"Barberton Plant",address:"5100 Rubber Ln, Barberton, OH 44203",notes:""}] },
  "Junction Steel Works":        { notes:"Heavy capacity jobs. Always needs crane certification docs. Good referral source.", billingAddr:"1800 Steel Way, Warren, OH 44483", website:"www.junctionsteel.com", industry:"Steel Manufacturing", paymentTerms:"Net 30", accountNum:"JCT-010", contacts:[{id:1,name:"Ray Kowalski",title:"Operations Director",email:"r.kowalski@junctionsteel.com",phone:"330-555-0933",primary:true,locationId:null}], locations:[{id:"loc1",name:"Warren Steel Works",address:"1800 Steel Way, Warren, OH 44483",notes:""}] },
  "Keystone Die Casting":        { notes:"Union shop. Very large press work. Requires certified crew every job.", billingAddr:"620 Die Cast Dr, Massillon, OH 44646", website:"www.keystonedc.com", industry:"Die Casting", paymentTerms:"Net 30", accountNum:"KST-011", contacts:[{id:1,name:"Helen Marsh",title:"Facilities Manager",email:"h.marsh@keystonedc.com",phone:"330-555-1044",primary:true,locationId:null}], locations:[{id:"loc1",name:"Massillon Cast Shop",address:"620 Die Cast Dr, Massillon, OH 44646",notes:""}] },
  "Landmark Tooling Inc.":       { notes:"Smaller jobs, precision required. Good relationship. Fast pay.", billingAddr:"3300 Tool & Die Ave, Medina, OH 44256", website:"", industry:"Tooling & Die", paymentTerms:"Net 15", accountNum:"LMK-012", contacts:[{id:1,name:"Phil Stevens",title:"Shop Foreman",email:"p.stevens@landmarktool.com",phone:"330-555-1155",primary:true,locationId:null}], locations:[{id:"loc1",name:"Medina Tool Shop",address:"3300 Tool & Die Ave, Medina, OH 44256",notes:""}] },
  "Meridian Extrusion Co.":      { notes:"Extrusion-specific jobs. Heavy hydraulics. Reliable account.", billingAddr:"4100 Extrusion Blvd, Sandusky, OH 44870", website:"", industry:"Aluminum Extrusion", paymentTerms:"Net 45", accountNum:"MRD-013", contacts:[{id:1,name:"Carol Jensen",title:"Engineering Manager",email:"c.jensen@meridianext.com",phone:"419-555-1266",primary:true,locationId:null}], locations:[{id:"loc1",name:"Sandusky Extrusion Plant",address:"4100 Extrusion Blvd, Sandusky, OH 44870",notes:""}] },
  "Northgate Aluminum":          { notes:"High temp smelting environment. Safety protocols strictly enforced.", billingAddr:"700 Smelter Rd, Lima, OH 45801", website:"", industry:"Aluminum Smelting", paymentTerms:"Net 30", accountNum:"NGA-014", contacts:[{id:1,name:"Bruce Tanner",title:"Safety Manager",email:"b.tanner@northgatealum.com",phone:"419-555-1377",primary:true,locationId:null}], locations:[{id:"loc1",name:"Lima Smelter",address:"700 Smelter Rd, Lima, OH 45801",notes:""}] },
  "Overland Transport Mfg.":     { notes:"New account since 2025. Strong potential for repeat work. Good payer.", billingAddr:"2800 Axle Dr, Springfield, OH 45505", website:"", industry:"Transportation Equipment", paymentTerms:"Net 30", accountNum:"OVL-015", contacts:[{id:1,name:"Walt Simmons",title:"Plant Director",email:"w.simmons@overlandmfg.com",phone:"937-555-1488",primary:true,locationId:null}], locations:[{id:"loc1",name:"Springfield Plant",address:"2800 Axle Dr, Springfield, OH 45505",notes:""}] },
  "Pinnacle Forge & Stamp":      { notes:"Heavy forge work. Large cranes required. Growing account.", billingAddr:"1100 Forge Rd, Canton, OH 44705", website:"", industry:"Forging & Stamping", paymentTerms:"Net 30", accountNum:"PNK-016", contacts:[{id:1,name:"Liz Kowalczyk",title:"Operations Manager",email:"l.kowalczyk@pinnacleforge.com",phone:"330-555-1599",primary:true,locationId:null}], locations:[{id:"loc1",name:"Canton Forge",address:"1100 Forge Rd, Canton, OH 44705",notes:""}] },
  "Quartz Industrial Services":  { notes:"New account 2025. HVAC and utilities focus. Good referral potential.", billingAddr:"600 Industrial Ct, Mansfield, OH 44903", website:"", industry:"Industrial Services", paymentTerms:"Net 30", accountNum:"QTZ-017", contacts:[{id:1,name:"Steve Mallory",title:"Project Manager",email:"s.mallory@quartzind.com",phone:"419-555-1610",primary:true,locationId:null}], locations:[{id:"loc1",name:"Mansfield Office",address:"600 Industrial Ct, Mansfield, OH 44903",notes:""}] },
  "Ridgeline Machine Works":     { notes:"New account 2025. CNC and boring mill specialty. Strong pipeline.", billingAddr:"4500 Machinist Way, Ravenna, OH 44266", website:"", industry:"Precision Machining", paymentTerms:"Net 30", accountNum:"RDG-018", contacts:[{id:1,name:"Tom Garfield",title:"Plant Engineer",email:"t.garfield@ridgelinemw.com",phone:"330-555-1721",primary:true,locationId:null}], locations:[{id:"loc1",name:"Ravenna Machine Shop",address:"4500 Machinist Way, Ravenna, OH 44266",notes:""}] },
  "Summit Plastics Group":       { notes:"New account 2025. Large expansion plans for 2026–2027.", billingAddr:"3200 Polymer Dr, Akron, OH 44314", website:"", industry:"Plastics Manufacturing", paymentTerms:"Net 30", accountNum:"SMT-019", contacts:[{id:1,name:"Pam Rodriguez",title:"Facilities Director",email:"p.rodriguez@summitplastics.com",phone:"330-555-1832",primary:true,locationId:null}], locations:[{id:"loc1",name:"Akron Polymer Plant",address:"3200 Polymer Dr, Akron, OH 44314",notes:""}] },
  "Titan Manufacturing LLC":     { notes:"New account 2025. Flagship job. Very large press capacity. High priority growth account.", billingAddr:"8800 Titan Blvd, Lorain, OH 44052", website:"", industry:"Heavy Manufacturing", paymentTerms:"Net 45", accountNum:"TTN-020", contacts:[{id:1,name:"Steve Dolan",title:"VP Operations",email:"s.dolan@titanmfg.com",phone:"440-555-1943",primary:true,locationId:null}], locations:[{id:"loc1",name:"Lorain Titan Plant",address:"8800 Titan Blvd, Lorain, OH 44052",notes:""}] },
};

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
    date:today(), status:"In Progress", qtype:"Contract", markup:0,
    fromReqId: req?.id    || null,
    parentId:  parentQ?.id || null,
    isChangeOrder: isCO,
    locked:false, job_num:"", compDate:"",
    notes:"", attachments:[], salesAdjustments:[],
    laborRows:    defLaborRows(client, customerRates),
    travelRows:   [{ id:uid(), label:"First Mobilization", workers:0, days:0, perDiem:false, hotel:false }],
    travelOther:  0,
    travelMarkup: 0,
    liftPlanRequired: false,
    maxLiftTons: "",
    markupCostOnly: false,
    discounts:  [],
    subRows:    [],
    permitRows: [],
    equipRows:    [],
    haulingRows:  [{ id:uid(), vendor:"", desc:"", cost:0, markup:0.35 }],
    matRows:      [{ id:uid(), vendor:"", desc:"", cost:0, markup:0.15 }],
  };
}

function calcQuote(q, customerRates, eqOv, eqMapArg, baseLabor, perDiemRate=DEFAULT_PER_DIEM, hotelRate=DEFAULT_HOTEL) {
  if (q.isHistorical) {
    const total = Number(q.histTotal) || 0;
    const dc = Number(q.histCosts) || 0;
    const np = total - dc;
    const nm = total > 0 ? (np / total) * 100 : 0;
    return { labor:0, travel:0, equip:0, hauling:0, mats:0, subs:0, permits:0, subTotal:total, muAmt:0, muCost:0, preDisc:total, discAmt:0, total, dc, np, nm };
  }
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
  // Travel = per diem/hotel rows (each row has its own travelOther for airlines/misc), plus markup
  const travelBase = (q.travelRows||[]).reduce((s,r) =>
    s + r.workers*r.days*((r.perDiem?perDiemRate:0)+(r.hotel?hotelRate:0)) + Number(r.travelOther||0), 0);
  const travel = travelBase * (1 + Number(q.travelMarkup||0));
  const equip = (q.equipRows||[]).reduce((s,r) => {
    const e  = _eqMap[r.code];
    const bd = eqOv[r.code] ? eqOv[r.code].daily : (e?e.daily:0);
    const d  = r.overRate ? Number(r.overDaily) : bd;
    return s + d*r.days + Number(r.ship||0);
  }, 0);
  const equipCost = (q.equipRows||[]).reduce((s,r) => {
    const e = _eqMap[r.code];
    const ec = e ? (Number(e.daily_cost || e.daily * 0.6)) : 0;
    return s + (ec * r.days) + Number(r.ship||0);
  }, 0);
  const hauling  = (q.haulingRows||[]).reduce((s,r) => s+Number(r.cost)*(1+Number(r.markup||0)), 0);
  const mats     = (q.matRows||[]).reduce((s,r) => s+Number(r.cost)*(1+Number(r.markup||0.15)), 0);
  const subs     = (q.subRows||[]).reduce((s,r) => s+Number(r.cost)*(1+Number(r.markup||0)), 0);
  const permits  = (q.permitRows||[]).reduce((s,r) => s+Number(r.cost)*(1+Number(r.markup||0)), 0);
  // Sub = all billable costs before markup
  const subTotal = labor+travel+equip+hauling+mats+subs+permits;
  const muAmt    = subTotal*(q.markup||0);
  const muCost   = muAmt;
  const preDisc  = subTotal+muAmt;
  const discAmt  = (q.discounts||[]).reduce((s,d)=>s+d.discAmt,0);
  const total    = Math.max(0, preDisc-discAmt);
  const dc       = laborCost+travel+equipCost
                 + (q.haulingRows||[]).reduce((s,r)=>s+Number(r.cost),0)
                 + (q.matRows||[]).reduce((s,r)=>s+Number(r.cost),0)
                 + (q.subRows||[]).reduce((s,r)=>s+Number(r.cost),0)
                 + permits;
  const np       = total-dc;
  const nm       = total>0 ? (np/total)*100 : 0;
  return { labor, travel, equip, hauling, mats, subs, permits, subTotal, muAmt, muCost, preDisc, discAmt, total, dc, np, nm };
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
  "In Progress":       { bg:C.yelB,    cl:C.yel,     bd:C.yelBdr   },
  "In Review":         { bg:C.bluB,    cl:C.blue,     bd:C.bluBdr   },
  "Approved":          { bg:"#f0fdfa", cl:"#0d9488",  bd:"#99f6e4"  },
  "Adjustments Needed":{ bg:"#fff1f2", cl:"#e11d48",  bd:"#fecdd3"  },
  Submitted:           { bg:"#eff6ff", cl:"#2563eb",  bd:"#bfdbfe"  },
  Won:                 { bg:C.grnB,    cl:C.grn,      bd:C.grnBdr   },
  Lost:                { bg:C.redB,    cl:C.red,       bd:C.redBdr   },
  Dead:                { bg:"#1c1f26", cl:"#9ca3af",  bd:"#374151"  },
  Draft:               { bg:"#f1f5f9", cl:"#475569",  bd:"#cbd5e1"  }, // legacy fallback
  New:                 { bg:C.bluB,    cl:C.blue,     bd:C.bluBdr   },
  "Quoted":            { bg:C.grnB,    cl:C.grn,      bd:C.grnBdr   },
  "Change Order":      { bg:"#f5f3ff", cl:"#6d28d9",  bd:"#ddd6fe"  },
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
const Card  = ({ children, style={}, onClick }) => <div className="app-card" onClick={onClick} style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:8, padding:16, marginBottom:12, width:"100%", minWidth:0, ...style }}>{children}</div>;
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [profileForm, setProfileForm] = useState({ first_name:"", last_name:"", username:"", email:"", cell_phone:"", role:"user", password:"" });
  const [profileErr, setProfileErr] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const compStr = localStorage.getItem("rigpro_company");
  const comp = compStr ? JSON.parse(compStr) : { name: "Shoemaker Rigging & Transport LLC", logoSrc: null };

  const TABS = token ? [
    ["dash","Dashboard"], ["customers","Customers"], ["rfqs","Request For Quote"],
    ["jobs","Job List"], ["equipment","Equip Rates"], ["labor","Labor Rates"], ["calendar","Calendar"], ["reports","Reports"]
  ] : [["landing", "Home"]];
  
  if (token && role === "admin") TABS.push(["admin", "Admin Portal"]);

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

  useEffect(() => {
    if (!token) {
      setProfileUser(null);
      return;
    }
    fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setProfileUser(d);
        setProfileForm({
          first_name: d.first_name || "",
          last_name: d.last_name || "",
          username: d.username || "",
          email: d.email || "",
          cell_phone: d.cell_phone || "",
          role: d.role || "user",
          password: ""
        });
      })
      .catch(() => {});
  }, [token]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileErr("");
    setProfileSaving(true);
    try {
      const payload = {
        email: profileForm.email,
        cell_phone: profileForm.cell_phone,
        password: profileForm.password || undefined,
      };
      if (profileUser?.role === "admin") payload.role = profileForm.role;

      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setProfileUser(data);
      setProfileForm({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        username: data.username || "",
        email: data.email || "",
        cell_phone: data.cell_phone || "",
        role: data.role || "user",
        password: ""
      });
      localStorage.setItem("role", data.role || "user");
      if (setRole) setRole(data.role || "user");
      setProfileOpen(false);
    } catch (err) {
      setProfileErr(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch("/api/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (_) {}
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    if (setToken) setToken("");
    if (setRole) setRole("user");
    setView("landing");
  };

  const displayName = profileUser
    ? (`${profileUser.first_name || ""} ${profileUser.last_name || ""}`.trim() || profileUser.username)
    : "";

  return (
    <>
      <style>{`
        .app-header-shell { padding: 6px 14px 10px; }
        .app-header-top-row { min-height: 54px; }
        @media (max-width: 767px) {
          .app-header-shell { padding-top: 2px !important; }
          .app-header-top-row { min-height: 44px !important; }
          .app-brand { margin-right: 8px !important; }
          .app-brand-main { gap: 6px !important; }
          .app-brand-logo { width: 32px !important; height: 32px !important; }
          .app-brand-name { font-size: 13px !important; }
          .app-brand-version { font-size: 8px !important; }
          .app-brand-service,
          .app-brand-address { font-size: 8px !important; line-height: 1.1; letter-spacing: .2px !important; }
          .desktop-nav { display: none !important; }
          .hamburger-btn { display: flex !important; margin-left: auto; }
          .mobile-inline { display: flex !important; max-width: 58vw !important; }
        }
        @media (min-width: 768px) and (max-width: 1024px) {
          .app-header-shell { padding: 5px 12px 8px !important; }
          .app-header-top-row { min-height: 48px !important; }
          .app-brand { margin-right: 12px !important; }
          .app-brand-service,
          .app-brand-address { font-size: 8px !important; }
          .top-tab-btn { font-size: 11px !important; padding: 4px 6px !important; }
          .desktop-actions-row { gap: 8px !important; }
        }
        @media (min-width: 768px) {
          .hamburger-btn { display: none !important; }
          .mobile-inline { display: none !important; }
        }
      `}</style>
      <div
        className="app-header-shell"
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
        {/* Desktop actions row: right-aligned above menu */}
        <div className="desktop-nav desktop-actions-row" style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:4 }}>
          {extra}
          {token && profileUser && (
            <button style={{ ...mkBtn("ghost"), fontSize:11, padding:"4px 10px", display:"inline-flex", alignItems:"center", gap:6 }} onClick={() => setProfileOpen(true)}>
              <span aria-hidden="true">👤</span>
              <span>{displayName} (@{profileUser.username})</span>
            </button>
          )}
          {token ? (
            <button style={{ ...mkBtn("danger"), fontSize:11, padding:"4px 8px" }} onClick={handleLogout}>Logout</button>
          ) : (
            view !== "login" && <button style={{ ...mkBtn("primary"), fontSize:11, padding:"4px 12px" }} onClick={() => setView("login")}>Login</button>
          )}
        </div>

        {/* Top row: logo + nav */}
        <div className="app-header-top-row" style={{ display:"flex", alignItems:"center", minHeight:54 }}>
          <div className="app-brand" style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", marginRight:16 }}>
            <div className="app-brand-main" style={{ display:"flex", alignItems:"center", gap:8 }}>
              {comp.logoSrc ? (
                <img className="app-brand-logo" src={comp.logoSrc} alt="Logo" style={{ width:36, height:36, objectFit:"contain", borderRadius:4, background:"#fff", border:`2px solid ${C.accB}` }}/>
              ) : (
                <div className="app-brand-logo" style={{ width:36, height:36, background:C.accL, border:`2px solid ${C.accB}`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🏗</div>
              )}
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center" }}>
                <div className="app-brand-name" style={{ fontFamily:"Georgia,serif", fontSize:14, color:C.acc, fontWeight:800, lineHeight:1.1 }}>
                  {comp.name.split(" ")[0]}
                </div>
                <div className="app-brand-version" style={{ fontSize:9, color:C.txtS, letterSpacing:.35, textTransform:"uppercase", marginTop:1, fontWeight:700 }}>
                  RigPro v3.1
                </div>
              </div>
            </div>
            <div className="app-brand-service" style={{ fontSize:9, color:C.txtS, letterSpacing:.4, textTransform:"uppercase", marginTop:1 }}>
              Industrial Rigging,
            </div>
            <div className="app-brand-service" style={{ fontSize:9, color:C.txtS, letterSpacing:.4, textTransform:"uppercase", marginTop:1 }}>
              Machinery Moving,
            </div>
            <div className="app-brand-service" style={{ fontSize:9, color:C.txtS, letterSpacing:.4, textTransform:"uppercase", marginTop:1 }}>
              Heavy Haul Transport
            </div>
            <div className="app-brand-address" style={{ fontSize:9, color:C.txtS, letterSpacing:.3, marginTop:1 }}>
              3385 Miller Park Road · Akron, OH 44312
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="desktop-nav" style={{ display:"flex", alignItems:"center", flex:1, gap:4, overflowX:"auto" }}>
            {TABS.map(([v,l]) => (
              <button className="top-tab-btn" key={v} onClick={() => setView(v)} style={{ background:"none", border:"none", color:view===v?C.acc:C.txtM, fontSize:12, cursor:"pointer", padding:"4px 8px", borderBottom:view===v?`2px solid ${C.acc}`:"2px solid transparent", fontFamily:"inherit", fontWeight:view===v?700:400, whiteSpace:"nowrap" }}>{l}</button>
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

      {profileOpen && profileUser && (
        <div className="app-modal-overlay" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:12000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div className="app-modal-panel" style={{ background:C.sur, width:"100%", maxWidth:520, borderRadius:12, padding:24, border:`1px solid ${C.bdr}`, boxShadow:"0 20px 60px rgba(0,0,0,.35)" }}>
            <div className="app-modal-title" style={{ fontSize:18, fontWeight:800, color:C.acc, marginBottom:14 }}>Edit Profile</div>
            <form onSubmit={handleSaveProfile} style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div className="app-two-col" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <Lbl c="FIRST NAME"/>
                  <input id="profile-first-name" name="first_name" autoComplete="given-name" style={{ ...inp, background:C.bg, color:C.txtS }} value={profileForm.first_name} disabled />
                </div>
                <div>
                  <Lbl c="LAST NAME"/>
                  <input id="profile-last-name" name="last_name" autoComplete="family-name" style={{ ...inp, background:C.bg, color:C.txtS }} value={profileForm.last_name} disabled />
                </div>
              </div>
              <div>
                <Lbl c="USERNAME"/>
                <input id="profile-username" name="username" autoComplete="username" style={{ ...inp, background:C.bg, color:C.txtS }} value={profileForm.username} disabled />
              </div>
              <div>
                <Lbl c="EMAIL"/>
                <input id="profile-email" name="email" autoComplete="email" style={inp} type="email" value={profileForm.email} onChange={(e)=>setProfileForm(p=>({ ...p, email:e.target.value }))} />
              </div>
              <div>
                <Lbl c="CELL PHONE"/>
                <input id="profile-cell-phone" name="cell_phone" autoComplete="tel" style={inp} value={profileForm.cell_phone} onChange={(e)=>setProfileForm(p=>({ ...p, cell_phone:e.target.value }))} />
              </div>
              <div>
                <Lbl c="ROLE"/>
                <select style={{ ...sel, width:"100%", ...(profileUser.role !== "admin" ? { background:C.bg, color:C.txtS } : {}) }} value={profileForm.role} disabled={profileUser.role !== "admin"} onChange={(e)=>setProfileForm(p=>({ ...p, role:e.target.value }))}>
                  <option value="estimator">Estimator</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                  <option value="user">User</option>
                </select>
              </div>
              <div>
                <Lbl c="NEW PASSWORD (OPTIONAL)"/>
                <input id="profile-password" name="new_password" autoComplete="new-password" style={inp} type="password" value={profileForm.password} onChange={(e)=>setProfileForm(p=>({ ...p, password:e.target.value }))} />
              </div>
              {profileErr && <div style={{ fontSize:12, color:C.red, fontWeight:700 }}>⚠ {profileErr}</div>}
              <div className="app-modal-actions" style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:4 }}>
                <button type="button" style={{ ...mkBtn("ghost"), padding:"8px 14px" }} onClick={() => setProfileOpen(false)}>Cancel</button>
                <button type="submit" style={{ ...mkBtn("primary"), padding:"8px 16px" }} disabled={profileSaving}>{profileSaving ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Footer() {
  return (
    <div className="global-footer" style={{ padding: "30px 16px", textAlign: "center", fontSize: "12px", color: C.txtS, borderTop: `1px solid ${C.bdr}`, background: C.bg, marginTop: "auto", width: "100%" }}>
      © 2026 Powered by <strong>Surpentor Software</strong>
    </div>
  );
}


// ── REPORTS PAGE ──────────────────────────────────────────────────────────────
const BUILT_IN_REPORTS = [
  { id:"rev-by-customer",  name:"Revenue by Customer",      category:"Sales",      desc:"Total won revenue ranked by customer",              scope:"org" },
  { id:"rev-by-estimator", name:"Revenue by Estimator",     category:"Sales",      desc:"Won revenue and win rate per estimator",            scope:"org" },
  { id:"rev-by-month",     name:"Revenue by Month",         category:"Sales",      desc:"Monthly won revenue trend",                        scope:"org" },
  { id:"pipeline-summary", name:"Pipeline Summary",         category:"Pipeline",   desc:"Open jobs by status with total value",            scope:"org" },
  { id:"win-loss",         name:"Win / Loss Analysis",      category:"Pipeline",   desc:"Win rate by estimator, customer, and quote type",   scope:"org" },
  { id:"quote-aging",      name:"Quote Aging",              category:"Pipeline",   desc:"Open jobs ranked by days since created",          scope:"org" },
  { id:"rfq-response",     name:"RFQ Response Time",        category:"Operations", desc:"Days from RFQ received to estimate submitted",      scope:"org" },
  { id:"job-schedule",     name:"Job Schedule",             category:"Operations", desc:"Upcoming and in-progress jobs with dates",          scope:"org" },
  { id:"cost-margin",      name:"Cost & Margin Analysis",   category:"Finance",    desc:"Revenue, cost, and gross margin per quote",         scope:"org" },
  { id:"estimator-activity",name:"Estimator Activity",      category:"Sales",      desc:"Quotes created, submitted, and won per estimator",  scope:"org" },
];

const REPORT_CATEGORIES = ["All","Sales","Pipeline","Operations","Finance"];

// rowType: "quote" | "req" | "group-customer" | "group-estimator" | "group-month" | "group-status" | "group-type"
function buildReportData(reportId, jobs, reqs) {
  const won = jobs.filter(q=>q.status==="Won");
  const fmt2 = n => "$"+Math.round(n||0).toLocaleString();

  switch(reportId) {
    case "rev-by-customer": {
      const m={};
      won.forEach(q=>{ if(!m[q.client])m[q.client]={customer:q.client,revenue:0,jobs:0,qs:[]}; m[q.client].revenue+=(q.total||0); m[q.client].jobs+=1; m[q.client].qs.push(q); });
      const data=Object.values(m).sort((a,b)=>b.revenue-a.revenue);
      return { cols:["Customer","Revenue","Jobs Won","Avg Deal"], clickHint:"Click a row to see individual jobs",
        rows:data.map(r=>[r.customer,fmt2(r.revenue),r.jobs,fmt2(r.jobs?Math.round(r.revenue/r.jobs):0)]),
        rawRefs:data.map(r=>({type:"group-customer",key:r.customer,jobs:r.qs})),
        summary:`${data.length} customers · Total: ${fmt2(data.reduce((s,r)=>s+r.revenue,0))}` };
    }
    case "rev-by-estimator": {
      const m={};
      jobs.forEach(q=>{ const k=q.salesAssoc||"Unassigned"; if(!m[k])m[k]={estimator:k,revenue:0,won:0,lost:0,total:0,qs:[]}; m[k].total+=1; m[k].qs.push(q); if(q.status==="Won"){m[k].revenue+=(q.total||0);m[k].won+=1;} if(q.status==="Lost")m[k].lost+=1; });
      const data=Object.values(m).sort((a,b)=>b.revenue-a.revenue);
      return { cols:["Estimator","Revenue Won","Quotes Won","Quotes Lost","Win Rate"], clickHint:"Click a row to see that estimator's jobs",
        rows:data.map(r=>[r.estimator,fmt2(r.revenue),r.won,r.lost,r.won+r.lost>0?Math.round(r.won/(r.won+r.lost)*100)+"%":"—"]),
        rawRefs:data.map(r=>({type:"group-estimator",key:r.estimator,jobs:r.qs})),
        summary:`${data.length} estimators tracked` };
    }
    case "rev-by-month": {
      const m={};
      won.forEach(q=>{ const mo=q.start_date?.slice(0,7)||"Unknown"; if(!m[mo])m[mo]={month:mo,revenue:0,jobs:0,qs:[]}; m[mo].revenue+=(q.total||0); m[mo].jobs+=1; m[mo].qs.push(q); });
      const data=Object.keys(m).sort().map(k=>m[k]);
      return { cols:["Month","Revenue","Jobs"], clickHint:"Click a month to see its jobs",
        rows:data.map(r=>[r.month,fmt2(r.revenue),r.jobs]),
        rawRefs:data.map(r=>({type:"group-month",key:r.month,jobs:r.qs})),
        summary:`${data.length} months · Peak: ${fmt2(Math.max(...data.map(r=>r.revenue)))}` };
    }
    case "pipeline-summary": {
      const statuses=["In Progress","In Review","Approved","Adjustments Needed","Submitted","Won","Lost"];
      const data=statuses.map(st=>{ const qs=jobs.filter(q=>q.status===st); return {st,qs,total:qs.reduce((s,q)=>s+(q.total||0),0)}; });
      return { cols:["Status","Count","Total Value","Avg Deal"], clickHint:"Click a status to see its jobs",
        rows:data.map(r=>[r.st,r.qs.length,fmt2(r.total),r.qs.length?fmt2(Math.round(r.total/r.qs.length)):"—"]),
        rawRefs:data.map(r=>({type:"group-status",key:r.st,jobs:r.qs})),
        summary:`${jobs.length} total jobs · ${fmt2(jobs.reduce((s,q)=>s+(q.total||0),0))} total value` };
    }
    case "win-loss": {
      const byType={};
      jobs.filter(q=>["Won","Lost"].includes(q.status)).forEach(q=>{ const k=q.qtype||"Other"; if(!byType[k])byType[k]={type:k,won:0,lost:0,qs:[]}; byType[k][q.status==="Won"?"won":"lost"]+=1; byType[k].qs.push(q); });
      const data=Object.values(byType);
      const totalWon=won.length; const totalLost=jobs.filter(q=>q.status==="Lost").length;
      return { cols:["Quote Type","Won","Lost","Win Rate"], clickHint:"Click a type to see individual jobs",
        rows:data.map(r=>[r.type,r.won,r.lost,r.won+r.lost>0?Math.round(r.won/(r.won+r.lost)*100)+"%":"—"]),
        rawRefs:data.map(r=>({type:"group-type",key:r.type,jobs:r.qs})),
        summary:`Overall win rate: ${totalWon+totalLost>0?Math.round(totalWon/(totalWon+totalLost)*100):0}% (${totalWon}W / ${totalLost}L)` };
    }
    case "quote-aging": {
      const now=new Date();
      const openQ=jobs.filter(q=>!["Won","Lost","Dead"].includes(q.status));
      const data=openQ.map(q=>({ q, days:Math.floor((now-new Date(q.start_date||now))/86400000) })).sort((a,b)=>b.days-a.days);
      return { cols:["Quote #","Customer","Status","Age","Value"], clickHint:"Click a quote to open it",
        rows:data.map(({q,days})=>[q.job_num,q.client,q.status,days+" days",fmt2(q.total||0)]),
        rawRefs:data.map(({q})=>({type:"quote",quote:q})),
        summary:`${openQ.length} open jobs · Oldest: ${data[0]?data[0].days+" days":"—"}` };
    }
    case "rfq-response": {
      const data=reqs.filter(r=>r.date).map(r=>{ const linked=jobs.find(q=>q.fromReqId===r.id); const days=linked?Math.floor((new Date(linked.date)-new Date(r.date))/86400000):null; return {r,linked,days}; }).sort((a,b)=>{ if(a.days===null)return 1; if(b.days===null)return -1; return a.days-b.days; });
      const withResp=data.filter(d=>d.days!==null); const avg=withResp.length?Math.round(withResp.reduce((s,d)=>s+d.days,0)/withResp.length):0;
      return { cols:["RFQ #","Customer","RFQ Date","Est. Date","Response Time"], clickHint:"Click an RFQ to open its Job Folder · Click estimate column to open the quote",
        rows:data.map(({r,linked,days})=>[r.rn,r.company,r.date,linked?linked.date:"No estimate",days!==null?days+" days":"—"]),
        rawRefs:data.map(({r,linked})=>({type:"rfq",req:r,quote:linked||null})),
        summary:`${withResp.length} of ${data.length} RFQs have estimates · Avg response: ${avg} days` };
    }
    case "job-schedule": {
      const jobs=jobs.filter(q=>q.status==="Won"&&q.startDate).sort((a,b)=>a.startDate>b.startDate?1:-1);
      return { cols:["Job #","Customer","Description","Start","End","Value"], clickHint:"Click a job to open its quote",
        rows:jobs.map(q=>[q.jobNum||q.job_num,q.client,q.job_description,q.startDate||"—",q.compDate||"TBD",fmt2(q.total||0)]),
        rawRefs:jobs.map(q=>({type:"quote",quote:q})),
        summary:`${jobs.length} scheduled jobs` };
    }
    case "cost-margin": {
      const data=won.map(q=>{ const rev=q.total||0; const cost=Math.round((q.labor||0)*0.6+(q.equip||0)*0.7+(q.hauling||0)*0.85+(q.mats||0)*0.85+(q.travel||0)); const margin=rev-cost; const pct=rev>0?Math.round(margin/rev*100):0; return {q,rev,cost,margin,pct}; }).sort((a,b)=>b.pct-a.pct);
      const totRev=won.reduce((s,q)=>s+(q.total||0),0); const avgM=data.length?Math.round(data.reduce((s,d)=>s+d.pct,0)/data.length):0;
      return { cols:["Quote #","Customer","Revenue","Est. Cost","Gross Margin","Margin %"], clickHint:"Click a row to see the full cost breakdown",
        rows:data.map(({q,rev,cost,margin,pct})=>[q.job_num,q.client,fmt2(rev),fmt2(cost),fmt2(margin),pct+"%"]),
        rawRefs:data.map(({q,rev,cost,margin,pct})=>({type:"cost-detail",quote:q,rev,cost,margin,pct})),
        summary:`${data.length} won jobs · Avg margin: ${avgM}% · Total revenue: ${fmt2(totRev)}` };
    }
    case "estimator-activity": {
      const m={};
      jobs.forEach(q=>{ const k=q.salesAssoc||"Unassigned"; if(!m[k])m[k]={estimator:k,created:0,submitted:0,won:0,lost:0,revWon:0,qs:[]}; m[k].created+=1; m[k].qs.push(q); if(["In Progress","In Review","Approved","Adjustments Needed","Submitted"].includes(q.status))m[k].submitted+=1; if(q.status==="Won"){m[k].won+=1;m[k].revWon+=(q.total||0);} if(q.status==="Lost")m[k].lost+=1; });
      const data=Object.values(m).sort((a,b)=>b.revWon-a.revWon);
      return { cols:["Estimator","Total Quotes","In Pipeline","Won","Lost","Revenue Won"], clickHint:"Click an estimator to see their jobs",
        rows:data.map(r=>[r.estimator,r.created,r.submitted,r.won,r.lost,fmt2(r.revWon)]),
        rawRefs:data.map(r=>({type:"group-estimator",key:r.estimator,jobs:r.qs})),
        summary:`${data.length} estimators` };
    }
    default: {
      if(!reportId) return { cols:[], rows:[], rawRefs:[], summary:"" };
      return { cols:[], rows:[], rawRefs:[], summary:"" };
    }
  }
}

function runCustomReport(report, jobs) {
  const AVAILABLE_COLS = [
    { key:"qn",label:"Quote #"},{key:"client",label:"Customer"},{key:"status",label:"Status"},
    {key:"total",label:"Total Value"},{key:"date",label:"Date"},{key:"salesAssoc",label:"Estimator"},
    {key:"desc",label:"Description"},{key:"jobSite",label:"Job Site"},{key:"qtype",label:"Quote Type"},
    {key:"labor",label:"Labor"},{key:"equip",label:"Equipment"},{key:"hauling",label:"Hauling"},
    {key:"mats",label:"Materials"},{key:"travel",label:"Travel"},{key:"jobNum",label:"Job #"},
    {key:"markup",label:"Markup %"},
  ];
  const fmt2 = n => typeof n==="number" ? "$"+Math.round(n).toLocaleString() : n;
  const {filters={}, columns=[], sortBy="date", sortDir="desc"} = report;

  let rows = [...jobs];
  if(filters.status)    rows=rows.filter(q=>q.status===filters.status);
  if(filters.qtype)     rows=rows.filter(q=>q.qtype===filters.qtype);
  if(filters.estimator) rows=rows.filter(q=>(q.salesAssoc||"").toLowerCase().includes(filters.estimator.toLowerCase()));
  if(filters.customer)  rows=rows.filter(q=>q.client.toLowerCase().includes(filters.customer.toLowerCase()));
  if(filters.dateFrom)  rows=rows.filter(q=>q.start_date>=filters.dateFrom);
  if(filters.dateTo)    rows=rows.filter(q=>q.start_date<=filters.dateTo);

  rows.sort((a,b)=>{
    const av=a[sortBy]??0, bv=b[sortBy]??0;
    if(typeof av==="number") return sortDir==="desc"?bv-av:av-bv;
    return sortDir==="desc"?String(bv).localeCompare(String(av)):String(av).localeCompare(String(bv));
  });

  const colDefs = columns.map(k=>AVAILABLE_COLS.find(c=>c.key===k)).filter(Boolean);
  const dataRows = rows.map(q=>colDefs.map(c=>{
    const v=q[c.key];
    if(["total","labor","equip","hauling","mats","travel"].includes(c.key)) return fmt2(v||0);
    if(c.key==="markup") return v?Math.round(v*100)+"%":"0%";
    return v||"—";
  }));

  return {
    cols: colDefs.map(c=>c.label),
    rows: dataRows,
    summary: `${dataRows.length} rows · ${filters.status||"All statuses"} · ${filters.estimator||"All estimators"}`,
  };
}


// ── REPORT DRILL-DOWN MODAL ───────────────────────────────────────────────────
function ReportDrillDownModal({ ref: rawRef, jobs, reqs, jobFolders, globalCheck, onOpenQuote, onOpenJobFolder, onClose }) {
  const fmt2 = n => "$"+Math.round(n||0).toLocaleString();

  // Group rows — show a list of jobs with click-through to individual transaction
  if(rawRef.type==="group-customer"||rawRef.type==="group-estimator"||rawRef.type==="group-month"||rawRef.type==="group-status"||rawRef.type==="group-type") {
    const groupQuotes = rawRef.jobs || [];
    const groupLabel  = rawRef.key;
    const total = groupQuotes.reduce((s,q)=>s+(q.total||0),0);
    return (
      <div className="app-modal-overlay" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:600, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 12px", overflowY:"auto" }}>
        <div className="app-modal-panel" style={{ background:C.sur, borderRadius:12, width:"100%", maxWidth:860, boxShadow:"0 16px 48px rgba(0,0,0,.28)" }}>
          <div style={{ padding:"16px 22px", borderBottom:`1px solid ${C.bdr}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:C.accL, borderTopLeftRadius:12, borderTopRightRadius:12 }}>
            <div>
              <div style={{ fontSize:10, color:C.acc, fontWeight:800, textTransform:"uppercase", letterSpacing:1 }}>Drill-Down · {groupQuotes.length} jobs</div>
              <div style={{ fontSize:17, fontWeight:700, marginTop:2 }}>{groupLabel}</div>
              <div style={{ fontSize:12, color:C.acc, fontWeight:600, marginTop:2 }}>Total: {fmt2(total)}</div>
            </div>
            <button className="app-modal-close" onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:C.txtS }}>×</button>
          </div>
          <div style={{ padding:"16px 22px", maxHeight:"65vh", overflowY:"auto" }}>
            <div style={{ fontSize:11, color:C.txtS, marginBottom:10 }}>Click any row to open the quote or job folder.</div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ background:C.bg }}>
                {["Quote #","Customer","Description","Date","Status","Total","Estimator"].map(h=><th key={h} style={{ ...thS, padding:"8px 10px", borderBottom:`1px solid ${C.bdr}` }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {groupQuotes.map(q=>{
                  const adj=(q.salesAdjustments||[]).reduce((s,a)=>s+a.amount,0);
                  return (
                    <tr key={q.id} style={{ borderBottom:`1px solid ${C.bdr}`, cursor:"pointer" }}
                      onClick={()=>{ onOpenQuote(q); onClose(); }}
                      onMouseEnter={e=>e.currentTarget.style.background=C.accL}
                      onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <td style={{ ...tdS, padding:"8px 10px", color:C.acc, fontWeight:700 }}>{q.job_num}</td>
                      <td style={{ ...tdS, padding:"8px 10px", fontWeight:600 }}>{q.client}</td>
                      <td style={{ ...tdS, padding:"8px 10px", color:C.txtM, maxWidth:180 }}>{(q.job_description||"").slice(0,50)}</td>
                      <td style={{ ...tdS, padding:"8px 10px", color:C.txtS, whiteSpace:"nowrap" }}>{q.start_date}</td>
                      <td style={{ ...tdS, padding:"8px 10px" }}><Badge status={q.status}/></td>
                      <td style={{ ...tdS, padding:"8px 10px", fontWeight:700 }}>{fmt2((q.total||0)+adj)}</td>
                      <td style={{ ...tdS, padding:"8px 10px", color:C.txtS }}>{q.salesAssoc||"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="app-modal-actions" style={{ padding:"12px 22px", borderTop:`1px solid ${C.bdr}`, background:C.bg, borderBottomLeftRadius:12, borderBottomRightRadius:12, display:"flex", justifyContent:"flex-end" }}>
            <button style={mkBtn("ghost")} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  // Cost detail row
  if(rawRef.type==="cost-detail") {
    const {quote:q, rev, cost, margin, pct} = rawRef;
    const laborCost  = Math.round((q.labor||0)*0.6);
    const equipCost  = Math.round((q.equip||0)*0.7);
    const haulCost   = Math.round((q.hauling||0)*0.85);
    const matCost    = Math.round((q.mats||0)*0.85);
    const travCost   = q.travel||0;
    return (
      <div className="app-modal-overlay" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:600, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 12px", overflowY:"auto" }}>
        <div className="app-modal-panel" style={{ background:C.sur, borderRadius:12, width:"100%", maxWidth:620, boxShadow:"0 16px 48px rgba(0,0,0,.28)" }}>
          <div style={{ padding:"16px 22px", borderBottom:`1px solid ${C.bdr}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:C.accL, borderTopLeftRadius:12, borderTopRightRadius:12 }}>
            <div>
              <div style={{ fontSize:10, color:C.acc, fontWeight:800, textTransform:"uppercase", letterSpacing:1 }}>Cost Breakdown</div>
              <div style={{ fontSize:17, fontWeight:700, marginTop:2 }}>{q.job_num} · {q.client}</div>
            </div>
            <button className="app-modal-close" onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:C.txtS }}>×</button>
          </div>
          <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:12 }}>
            {/* Revenue */}
            <div style={{ background:C.grnB, border:`1px solid ${C.grnBdr}`, borderRadius:8, padding:"12px 16px", display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontWeight:700, color:C.grn }}>Revenue (Quote Total)</span>
              <span style={{ fontWeight:800, fontSize:18, color:C.grn }}>{fmt2(rev)}</span>
            </div>
            {/* Cost breakdown */}
            <div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"12px 16px" }}>
              <div style={{ fontSize:10, color:C.txtS, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Estimated Cost Breakdown</div>
              {[
                {label:"Labor (60% of billed)",    billed:q.labor||0,  cost:laborCost, color:C.ora  },
                {label:"Equipment (70% of billed)", billed:q.equip||0,  cost:equipCost, color:C.teal },
                {label:"Hauling (85% of billed)",   billed:q.hauling||0,cost:haulCost,  color:C.purp },
                {label:"Materials (85% of billed)", billed:q.mats||0,   cost:matCost,   color:C.lime },
                {label:"Travel (pass-through)",     billed:q.travel||0, cost:travCost,  color:C.blue },
              ].map(row=>(
                <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${C.bdr}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:row.color, flexShrink:0 }}/>
                    <span style={{ fontSize:12, color:C.txtM }}>{row.label}</span>
                  </div>
                  <div style={{ display:"flex", gap:24, fontSize:12 }}>
                    <span style={{ color:C.txtS }}>Billed: {fmt2(row.billed)}</span>
                    <span style={{ fontWeight:600, color:C.txt }}>Cost: {fmt2(row.cost)}</span>
                  </div>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8, fontWeight:700 }}>
                <span>Total Est. Cost</span>
                <span style={{ color:C.red }}>{fmt2(cost)}</span>
              </div>
            </div>
            {/* Margin */}
            <div style={{ background:pct>=20?C.grnB:pct>=10?C.yelB:C.redB, border:`1px solid ${pct>=20?C.grnBdr:pct>=10?C.yelBdr:C.redBdr}`, borderRadius:8, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:10, color:C.txtS, fontWeight:700, textTransform:"uppercase" }}>Gross Margin</div>
                <div style={{ fontSize:22, fontWeight:800, color:pct>=20?C.grn:pct>=10?C.yel:C.red }}>{fmt2(margin)}</div>
              </div>
              <div style={{ fontSize:36, fontWeight:800, color:pct>=20?C.grn:pct>=10?C.yel:C.red }}>{pct}%</div>
            </div>
          </div>
          <div className="app-modal-actions" style={{ padding:"12px 22px", borderTop:`1px solid ${C.bdr}`, background:C.bg, borderBottomLeftRadius:12, borderBottomRightRadius:12, display:"flex", justifyContent:"space-between" }}>
            <button style={{ ...mkBtn("blue"), fontSize:11, padding:"5px 12px" }} onClick={()=>{ onOpenQuote(q); onClose(); }}>Open Quote →</button>
            <button style={mkBtn("ghost")} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  // RFQ row — show RFQ info + option to open Job Folder or linked quote
  if(rawRef.type==="rfq") {
    const {req, quote} = rawRef;
    const rfqDate = new Date(req.start_date||Date.now());
    const daysOld = Math.floor((new Date()-rfqDate)/86400000);
    const days = quote ? Math.floor((new Date(quote.date)-rfqDate)/86400000) : null;
    return (
      <div className="app-modal-overlay" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:600, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 12px", overflowY:"auto" }}>
        <div className="app-modal-panel" style={{ background:C.sur, borderRadius:12, width:"100%", maxWidth:620, boxShadow:"0 16px 48px rgba(0,0,0,.28)" }}>
          <div style={{ padding:"16px 22px", borderBottom:`1px solid ${C.bdr}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:C.accL, borderTopLeftRadius:12, borderTopRightRadius:12 }}>
            <div>
              <div style={{ fontSize:10, color:C.acc, fontWeight:800, textTransform:"uppercase", letterSpacing:1 }}>RFQ Transaction Detail</div>
              <div style={{ fontSize:17, fontWeight:700, marginTop:2 }}>{req.rn} · {req.company}</div>
            </div>
            <button className="app-modal-close" onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:C.txtS }}>×</button>
          </div>
          <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:12 }}>
            {/* RFQ info */}
            <div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"12px 16px" }}>
              <div style={{ fontSize:9, color:C.acc, fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>RFQ Information</div>
              <div className="app-two-col" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {[["RFQ #",req.rn],["Company",req.company],["Requester",req.requester||"—"],["Phone",req.phone||"—"],["Date Received",req.start_date||"—"],["Estimator",req.salesAssoc||"Unassigned"],["Status",req.status],["Job Site",req.jobSite||"—"]].map(([k,v])=>(
                  <div key={k}>
                    <div style={{ fontSize:10, color:C.txtS, fontWeight:700 }}>{k}</div>
                    <div style={{ fontSize:12, fontWeight:600, color:C.txt }}>{v}</div>
                  </div>
                ))}
              </div>
              {req.job_description && <div style={{ marginTop:10, padding:"8px 10px", background:C.sur, borderRadius:6, border:`1px solid ${C.bdr}`, fontSize:12, color:C.txtM }}>{req.job_description}</div>}
            </div>
            {/* Response time */}
            <div style={{ display:"flex", gap:10 }}>
              <div style={{ flex:1, background:daysOld>7?C.redB:C.grnB, border:`1px solid ${daysOld>7?C.redBdr:C.grnBdr}`, borderRadius:8, padding:"10px 14px", textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:800, color:daysOld>7?C.red:C.grn }}>{daysOld}</div>
                <div style={{ fontSize:10, fontWeight:700, color:daysOld>7?C.red:C.grn }}>Days Since RFQ</div>
              </div>
              {days!==null && (
                <div style={{ flex:1, background:days<=3?C.grnB:days<=7?C.yelB:C.redB, border:`1px solid ${days<=3?C.grnBdr:days<=7?C.yelBdr:C.redBdr}`, borderRadius:8, padding:"10px 14px", textAlign:"center" }}>
                  <div style={{ fontSize:22, fontWeight:800, color:days<=3?C.grn:days<=7?C.yel:C.red }}>{days}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:days<=3?C.grn:days<=7?C.yel:C.red }}>Days to Estimate</div>
                </div>
              )}
              {days===null && (
                <div style={{ flex:1, background:C.redB, border:`1px solid ${C.redBdr}`, borderRadius:8, padding:"10px 14px", textAlign:"center" }}>
                  <div style={{ fontSize:16, fontWeight:700, color:C.red }}>No Estimate</div>
                  <div style={{ fontSize:10, color:C.red }}>Not yet quoted</div>
                </div>
              )}
            </div>
            {/* Linked quote summary */}
            {quote && (
              <div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"12px 16px" }}>
                <div style={{ fontSize:9, color:C.txtS, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Linked Estimate</div>
                <div style={{ display:"flex", gap:16, flexWrap:"wrap", alignItems:"center" }}>
                  <div><div style={{ fontSize:10, color:C.txtS }}>Quote #</div><div style={{ fontWeight:700, color:C.acc }}>{quote.qn}</div></div>
                  <div><div style={{ fontSize:10, color:C.txtS }}>Status</div><Badge status={quote.status}/></div>
                  <div><div style={{ fontSize:10, color:C.txtS }}>Total</div><div style={{ fontWeight:700, fontSize:15 }}>{fmt2(quote.total||0)}</div></div>
                  <div><div style={{ fontSize:10, color:C.txtS }}>Date</div><div style={{ fontSize:12 }}>{quote.date}</div></div>
                </div>
              </div>
            )}
          </div>
          <div className="app-modal-actions" style={{ padding:"12px 22px", borderTop:`1px solid ${C.bdr}`, background:C.bg, borderBottomLeftRadius:12, borderBottomRightRadius:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ ...mkBtn("primary"), fontSize:11, padding:"5px 12px" }} onClick={()=>{ onOpenJobFolder(req); onClose(); }}>Open Job Folder</button>
              {quote && <button style={{ ...mkBtn("blue"), fontSize:11, padding:"5px 12px" }} onClick={()=>{ onOpenQuote(quote); onClose(); }}>Open Estimate →</button>}
            </div>
            <button style={mkBtn("ghost")} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  // Direct quote row
  if(rawRef.type==="quote") {
    const q = rawRef.quote;
    const adj=(q.salesAdjustments||[]).reduce((s,a)=>s+a.amount,0);
    return (
      <div className="app-modal-overlay" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:600, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 12px", overflowY:"auto" }}>
        <div className="app-modal-panel" style={{ background:C.sur, borderRadius:12, width:"100%", maxWidth:600, boxShadow:"0 16px 48px rgba(0,0,0,.28)" }}>
          <div style={{ padding:"16px 22px", borderBottom:`1px solid ${C.bdr}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:C.accL, borderTopLeftRadius:12, borderTopRightRadius:12 }}>
            <div>
              <div style={{ fontSize:10, color:C.acc, fontWeight:800, textTransform:"uppercase", letterSpacing:1 }}>Quote Transaction</div>
              <div style={{ fontSize:17, fontWeight:700, marginTop:2 }}>{q.job_num} · {q.client}</div>
            </div>
            <button className="app-modal-close" onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:C.txtS }}>×</button>
          </div>
          <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:12 }}>
            <div className="app-two-col" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[["Quote #",q.job_num],["Customer",q.client],["Status",q.status],["Type",q.qtype],["Date",q.start_date],["Estimator",q.salesAssoc||"—"],["Job Site",q.jobSite||"—"],["Job #",q.jobNum||"—"]].map(([k,v])=>(
                <div key={k}><div style={{ fontSize:10, color:C.txtS, fontWeight:700 }}>{k}</div><div style={{ fontSize:12, fontWeight:600 }}>{k==="Status"?<Badge status={v}/>:v}</div></div>
              ))}
            </div>
            {/* Cost bar */}
            <div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"12px 16px" }}>
              <div style={{ fontSize:9, color:C.txtS, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Cost Components</div>
              {[["Labor",q.labor||0,C.ora],["Equipment",q.equip||0,C.teal],["Hauling",q.hauling||0,C.purp],["Materials",q.mats||0,C.lime],["Travel",q.travel||0,C.blue]].map(([k,v,c])=>(
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:`1px solid ${C.bdr}`, fontSize:12 }}>
                  <span style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:8, height:8, borderRadius:2, background:c }}/>{k}</span>
                  <span style={{ fontWeight:600, color:c }}>{fmt2(v)}</span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8, fontWeight:800, fontSize:14 }}>
                <span>Quote Total</span><span style={{ color:C.acc }}>{fmt2((q.total||0)+adj)}</span>
              </div>
              {adj!==0&&<div style={{ fontSize:11, color:adj>0?C.grn:C.red, textAlign:"right" }}>{adj>0?"+":""}{fmt2(adj)} sales adjustments</div>}
            </div>
            {q.job_description&&<div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:6, padding:"8px 12px", fontSize:12, color:C.txtM }}>{q.job_description}</div>}
          </div>
          <div className="app-modal-actions" style={{ padding:"12px 22px", borderTop:`1px solid ${C.bdr}`, background:C.bg, borderBottomLeftRadius:12, borderBottomRightRadius:12, display:"flex", justifyContent:"space-between" }}>
            <button style={{ ...mkBtn("primary"), fontSize:11, padding:"5px 12px" }} onClick={()=>{ onOpenQuote(q); onClose(); }}>Open Full Quote →</button>
            <button style={mkBtn("ghost")} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ReportsPage({ jobs, reqs, role, username, jobFolders, globalCheck, onOpenQuote, onOpenJobFolder, initialReportId=null, onClearInitialReport, onBack }) {
  const [catFilter,    setCatFilter]    = useState("All");
  const [activeReport, setActiveReport] = useState(() => {
    if(initialReportId) return BUILT_IN_REPORTS.find(r=>r.id===initialReportId) || null;
    return null;
  });

  // Sync if prop changes after mount (clicking a bubble while already on Reports page)
  const prevInitRef = useRef(null);
  useEffect(() => {
    if(initialReportId && initialReportId !== prevInitRef.current) {
      const found = BUILT_IN_REPORTS.find(r=>r.id===initialReportId);
      if(found) { setActiveReport(found); setCatFilter("All"); }
      if(onClearInitialReport) onClearInitialReport();
    }
    prevInitRef.current = initialReportId || prevInitRef.current;
  }, [initialReportId]);
  const [customReports,setCustomReports]= useState(() => { try { return JSON.parse(localStorage.getItem("rigpro_custom_reports")||"[]"); } catch{return [];} });
  const allReports = [
    ...BUILT_IN_REPORTS,
    ...customReports,
  ];

  const [showBuilder,  setShowBuilder]  = useState(false);
  const [drillRef,     setDrillRef]     = useState(null);
  const [editingReport,setEditingReport]= useState(null);

  function saveCustomReports(r) {
    setCustomReports(r);
    localStorage.setItem("rigpro_custom_reports", JSON.stringify(r));
  }

  function setCategory(cat) {
    setCatFilter(cat);
    const filteredReports = cat === "All" ? allReports : allReports.filter(r => r.category === cat);
    if (filteredReports.length > 0) setActiveReport(filteredReports[0]);
    else setActiveReport(null);
  }


  const filtered = catFilter==="All" ? allReports : allReports.filter(r=>r.category===catFilter);
  const reportData = useMemo(() => {
    if(!activeReport) return null;
    const isCustom = !BUILT_IN_REPORTS.find(b=>b.id===activeReport.id);
    if(isCustom) return runCustomReport(activeReport, jobs);
    return buildReportData(activeReport.id, jobs, reqs);
  }, [activeReport, jobs, reqs]);

  function deleteCustom(id) {
    if(!window.confirm("Delete this report?")) return;
    saveCustomReports(customReports.filter(r=>r.id!==id));
    if(activeReport?.id===id) setActiveReport(null);
  }

  function exportCSV() {
    if(!reportData) return;
    const lines=[reportData.cols.join(","), ...reportData.rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,"")}"`).join(","))];
    const blob=new Blob([lines.join("\n")],{type:"text/csv"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`${activeReport.name.replace(/\s+/g,"_")}.csv`; a.click();
  }

  return (
    <div className="app-page-container" style={{ maxWidth:1200 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {onBack && (
            <button style={{ ...mkBtn("outline"), fontSize:12, padding:"6px 10px", borderColor:C.bdr, color:C.txtM, background:"#fff" }} onClick={onBack}>← Back to Home</button>
          )}
          <div>
            <div style={{ fontSize:20, fontWeight:700 }}>Reports</div>
            <div style={{ fontSize:12, color:C.txtS, marginTop:2 }}>{allReports.length} reports · {customReports.length} custom</div>
          </div>
        </div>
        <button style={{ ...mkBtn("primary"), padding:"8px 16px" }} onClick={()=>{ setEditingReport(null); setShowBuilder(true); }}>+ New Custom Report</button>
      </div>

      {/* Category filter */}
      <div style={{ display:"flex", gap:3, background:C.acc, border:`1px solid ${C.acc}`, borderRadius:8, padding:3, marginBottom:16, alignSelf:"flex-start", width:"fit-content" }}>
        {REPORT_CATEGORIES.map(c=>(
          <button key={c} onClick={()=>setCategory(c)} style={{ background:catFilter===c?"#fff":"transparent", color:catFilter===c?C.acc:"#fff", border:"none", borderRadius:6, padding:"5px 14px", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:catFilter===c?700:600 }}>{c}</button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"280px 904px", gap:16, alignItems:"start" }}>
        {/* Report list */}
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {filtered.map(r => {
            const isActive = activeReport?.id===r.id;
            const isCustom = !BUILT_IN_REPORTS.find(b=>b.id===r.id);
            return (
              <div key={r.id} onClick={()=>setActiveReport(r)} style={{ background:isActive?C.accL:C.sur, border:`1px solid ${isActive?C.accB:C.bdr}`, borderRadius:8, padding:"10px 12px", cursor:"pointer", position:"relative" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color:isActive?C.acc:C.txt }}>{r.name}</div>
                    <div style={{ fontSize:11, color:C.txtS, marginTop:2 }}>{r.desc}</div>
                    <div style={{ display:"flex", gap:5, marginTop:5 }}>
                      <span style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:4, padding:"1px 6px", fontSize:10, color:C.txtS }}>{r.category}</span>
                      {isCustom && <span style={{ background:r.scope==="user"?C.bluB:C.grnB, color:r.scope==="user"?C.blue:C.grn, border:`1px solid ${r.scope==="user"?C.bluBdr:C.grnBdr}`, borderRadius:4, padding:"1px 6px", fontSize:10, fontWeight:600 }}>{r.scope==="user"?"My Report":"Org Report"}</span>}
                    </div>
                  </div>
                  {isCustom && (
                    <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                      <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:C.txtS, padding:"0 3px" }} onClick={e=>{e.stopPropagation();setEditingReport(r);setShowBuilder(true);}}>✏</button>
                      <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:C.red, padding:"0 3px" }} onClick={e=>{e.stopPropagation();deleteCustom(r.id);}}>×</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Report output */}
        <div>
          {!activeReport ? (
            <div style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:10, padding:48, textAlign:"center", color:C.txtS }}>
              <div style={{ fontSize:32, marginBottom:10 }}>📊</div>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Select a report to view</div>
              <div style={{ fontSize:13 }}>Choose from the list on the left or create a custom report.</div>
            </div>
          ) : (
            <Card style={{ marginBottom:0 }}>
              {/* Report header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, flexWrap:"wrap", gap:8 }}>
                <div>
                  <div style={{ fontSize:17, fontWeight:700 }}>{activeReport.name}</div>
                  <div style={{ fontSize:12, color:C.txtS, marginTop:2 }}>{activeReport.desc}</div>
                  {reportData?.summary && <div style={{ fontSize:12, color:C.acc, fontWeight:600, marginTop:4 }}>{reportData.summary}</div>}
                </div>
                <button style={{ ...mkBtn("ghost"), fontSize:11, padding:"5px 12px" }} onClick={exportCSV}>↓ Export CSV</button>
              </div>

              {/* Click hint */}
              {reportData?.clickHint && (
                <div style={{ fontSize:11, color:C.txtS, marginBottom:8, display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ fontSize:13 }}>👆</span> {reportData.clickHint}
                </div>
              )}
              {/* Table */}
              {reportData && reportData.rows.length > 0 ? (
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead>
                      <tr style={{ background:C.bg }}>
                        {reportData.cols.map(c=><th key={c} style={{ ...thS, padding:"9px 12px", borderBottom:`1px solid ${C.bdr}`, textAlign:"left" }}>{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.rows.map((row,i)=>{
                        const rawRef = reportData.rawRefs?.[i];
                        return (
                          <tr key={i}
                            style={{ borderBottom:`1px solid ${C.bdr}`, cursor:rawRef?"pointer":"default" }}
                            onClick={()=>rawRef&&setDrillRef(rawRef)}
                            onMouseEnter={e=>{ if(rawRef) e.currentTarget.style.background=C.accL; }}
                            onMouseLeave={e=>{ e.currentTarget.style.background=""; }}>
                            {row.map((cell,j)=>(
                              <td key={j} style={{ ...tdS, padding:"9px 12px", fontWeight:j===0?600:400 }}>{cell}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign:"center", padding:"24px", color:C.txtS, fontSize:13 }}>No data available for this report.</div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Drill-down modal */}
      {drillRef && (
        <ReportDrillDownModal
          ref={drillRef}
          jobs={jobs}
          reqs={reqs}
          jobFolders={jobFolders}
          globalCheck={globalCheck}
          onOpenQuote={onOpenQuote}
          onOpenJobFolder={onOpenJobFolder}
          onClose={()=>setDrillRef(null)}
        />
      )}

      {/* Custom Report Builder Modal */}
      {showBuilder && (
        <ReportBuilderModal
          editing={editingReport}
          role={role}
          username={username}
          onSave={r => {
            const updated = editingReport
              ? customReports.map(x=>x.id===r.id?r:x)
              : [...customReports, r];
            saveCustomReports(updated);
            setActiveReport(r);
            setShowBuilder(false);
          }}
          onClose={()=>setShowBuilder(false)}
        />
      )}
    </div>
  );
}

function ReportBuilderModal({ editing, role, username, onSave, onClose }) {
  const isEdit = !!editing;
  const [name,     setName]     = useState(editing?.name     || "");
  const [category, setCategory] = useState(editing?.category || "Sales");
  const [desc,     setDesc]     = useState(editing?.desc     || "");
  const [scope,    setScope]    = useState(editing?.scope    || "org");
  const [filters,  setFilters]  = useState(editing?.filters  || { status:"", estimator:"", customer:"", dateFrom:"", dateTo:"", qtype:"" });
  const [columns,  setColumns]  = useState(editing?.columns  || ["qn","client","status","total","date","salesAssoc"]);
  const [sortBy,   setSortBy]   = useState(editing?.sortBy   || "date");
  const [sortDir,  setSortDir]  = useState(editing?.sortDir  || "desc");
  const [error,    setError]    = useState("");

  const AVAILABLE_COLS = [
    { key:"qn",         label:"Quote #"     },
    { key:"client",     label:"Customer"    },
    { key:"status",     label:"Status"      },
    { key:"total",      label:"Total Value" },
    { key:"date",       label:"Date"        },
    { key:"salesAssoc", label:"Estimator"   },
    { key:"desc",       label:"Description" },
    { key:"jobSite",    label:"Job Site"    },
    { key:"qtype",      label:"Quote Type"  },
    { key:"labor",      label:"Labor"       },
    { key:"equip",      label:"Equipment"   },
    { key:"hauling",    label:"Hauling"     },
    { key:"mats",       label:"Materials"   },
    { key:"travel",     label:"Travel"      },
    { key:"jobNum",     label:"Job #"       },
    { key:"markup",     label:"Markup %"    },
  ];

  const canSetOrgScope = role==="admin"||role==="manager";

  function toggleCol(key) {
    setColumns(prev => prev.includes(key) ? prev.filter(c=>c!==key) : [...prev,key]);
  }

  function handleSave() {
    if(!name.trim()) { setError("Report name is required."); return; }
    if(columns.length===0) { setError("Select at least one column."); return; }
    const report = {
      id: editing?.id || "custom-"+Date.now(),
      name: name.trim(),
      category,
      desc: desc.trim() || `Custom report: ${name.trim()}`,
      scope: canSetOrgScope ? scope : "user",
      filters,
      columns,
      sortBy,
      sortDir,
      createdBy: username||"user",
      createdAt: editing?.createdAt || new Date().toISOString().slice(0,10),
    };
    onSave(report);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:600, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 12px", overflowY:"auto" }}>
      <div style={{ background:C.sur, borderRadius:12, width:"100%", maxWidth:680, boxShadow:"0 16px 48px rgba(0,0,0,.28)" }}>
        {/* Header */}
        <div style={{ padding:"16px 24px", borderBottom:`1px solid ${C.bdr}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:16, fontWeight:700 }}>{isEdit?"Edit":"New"} Custom Report</div>
          <button className="app-modal-close" onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:C.txtS }}>×</button>
        </div>

        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 }}>
          {/* Name + Category */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <Lbl c="REPORT NAME *"/>
              <input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Q1 Estimator Performance"/>
            </div>
            <div>
              <Lbl c="CATEGORY"/>
              <select style={{ ...sel, width:"100%" }} value={category} onChange={e=>setCategory(e.target.value)}>
                {["Sales","Pipeline","Operations","Finance","Custom"].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Lbl c="DESCRIPTION"/>
            <input style={inp} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Brief description of what this report shows"/>
          </div>

          {/* Scope — only managers/admins can set org-level */}
          <div>
            <Lbl c="SAVE LEVEL"/>
            <div style={{ display:"flex", gap:8 }}>
              <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", padding:"8px 14px", background:scope==="user"?C.bluB:C.sur, border:`1px solid ${scope==="user"?C.bluBdr:C.bdr}`, borderRadius:6 }}>
                <input type="radio" checked={scope==="user"} onChange={()=>setScope("user")} style={{ accentColor:C.blue }}/>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:scope==="user"?C.blue:C.txt }}>My Report</div>
                  <div style={{ fontSize:11, color:C.txtS }}>Visible only to you</div>
                </div>
              </label>
              <label style={{ display:"flex", alignItems:"center", gap:6, cursor: canSetOrgScope?"pointer":"not-allowed", padding:"8px 14px", background:scope==="org"?C.grnB:C.sur, border:`1px solid ${scope==="org"?C.grnBdr:C.bdr}`, borderRadius:6, opacity:canSetOrgScope?1:0.5 }}>
                <input type="radio" checked={scope==="org"} onChange={()=>canSetOrgScope&&setScope("org")} disabled={!canSetOrgScope} style={{ accentColor:C.grn }}/>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:scope==="org"?C.grn:C.txt }}>Organization Report</div>
                  <div style={{ fontSize:11, color:C.txtS }}>{canSetOrgScope?"Visible to all users":"Requires manager role"}</div>
                </div>
              </label>
            </div>
          </div>

          {/* Filters */}
          <div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"12px 14px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.txtS, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Filters <span style={{ fontWeight:400 }}>(leave blank for all)</span></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <div>
                <Lbl c="STATUS"/>
                <select style={{ ...sel, width:"100%" }} value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}>
                  <option value="">All</option>
                  {["In Progress","In Review","Approved","Adjustments Needed","Submitted","Won","Lost"].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Lbl c="QUOTE TYPE"/>
                <select style={{ ...sel, width:"100%" }} value={filters.qtype} onChange={e=>setFilters(p=>({...p,qtype:e.target.value}))}>
                  <option value="">All</option>
                  {["Contract","T&M","Not To Exceed"].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Lbl c="ESTIMATOR"/>
                <input style={inp} value={filters.estimator} onChange={e=>setFilters(p=>({...p,estimator:e.target.value}))} placeholder="All estimators"/>
              </div>
              <div>
                <Lbl c="CUSTOMER"/>
                <input style={inp} value={filters.customer} onChange={e=>setFilters(p=>({...p,customer:e.target.value}))} placeholder="All customers"/>
              </div>
              <div>
                <Lbl c="DATE FROM"/>
                <input type="date" style={inp} value={filters.dateFrom} onChange={e=>setFilters(p=>({...p,dateFrom:e.target.value}))}/>
              </div>
              <div>
                <Lbl c="DATE TO"/>
                <input type="date" style={inp} value={filters.dateTo} onChange={e=>setFilters(p=>({...p,dateTo:e.target.value}))}/>
              </div>
            </div>
          </div>

          {/* Columns */}
          <div>
            <Lbl c="COLUMNS TO DISPLAY"/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:6 }}>
              {AVAILABLE_COLS.map(c=>(
                <label key={c.key} style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer", padding:"6px 10px", background:columns.includes(c.key)?C.accL:C.bg, border:`1px solid ${columns.includes(c.key)?C.accB:C.bdr}`, borderRadius:6 }}>
                  <input type="checkbox" checked={columns.includes(c.key)} onChange={()=>toggleCol(c.key)} style={{ accentColor:C.acc, width:14, height:14 }}/>
                  <span style={{ fontSize:12, fontWeight:600, color:columns.includes(c.key)?C.acc:C.txt }}>{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <Lbl c="SORT BY"/>
              <select style={{ ...sel, width:"100%" }} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                {AVAILABLE_COLS.filter(c=>columns.includes(c.key)).map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <Lbl c="SORT DIRECTION"/>
              <select style={{ ...sel, width:"100%" }} value={sortDir} onChange={e=>setSortDir(e.target.value)}>
                <option value="desc">Descending (Z→A, High→Low)</option>
                <option value="asc">Ascending (A→Z, Low→High)</option>
              </select>
            </div>
          </div>

          {error && <div style={{ fontSize:12, color:C.red, fontWeight:600 }}>⚠ {error}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${C.bdr}`, display:"flex", justifyContent:"flex-end", gap:10, background:C.bg, borderBottomLeftRadius:12, borderBottomRightRadius:12 }}>
          <button style={mkBtn("ghost")} onClick={onClose}>Cancel</button>
          <button style={mkBtn("primary")} onClick={handleSave}>{isEdit?"Save Changes":"Create Report"}</button>
        </div>
      </div>
    </div>
  );
}

// ── DASHBOARD METRICS COMPONENT ──────────────────────────────────────────────
function DashboardMetrics({ jobs, reqs, onOpenReport, rfqStageFilter, setRfqStageFilter }) {
  const now = new Date();
  const thisYear = now.getFullYear();

  const PERIODS = [
    { key:"ytd",    label:"Year to Date" },
    { key:"custom", label:"Custom Range" },
    { key:"30d",    label:"Last 30 Days" },
    { key:"90d",    label:"Last 90 Days" },
    { key:"12m",    label:"Last 12 Months" },
  ];

  const [period,    setPeriod]    = useState("ytd");
  const [showPicker, setShowPicker] = useState(false);
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [showRfqMenu, setShowRfqMenu] = useState(false);

  const STAGES_DASH = ["RFQ Received","Client Contact","Viewed Job / Docs","Priced Materials / Rentals","Final Consult"];
  const [customStart, setCustomStart] = useState(() => `${thisYear}-01-01`);
  const [customEnd,   setCustomEnd]   = useState(() => now.toISOString().slice(0,10));

  function getRange(p) {
    const end = new Date(now); end.setHours(23,59,59,999);
    if (p === "ytd") {
      return { start: new Date(`${thisYear}-01-01`), end };
    } else if (p === "30d") {
      const s = new Date(now); s.setDate(s.getDate()-30); return { start:s, end };
    } else if (p === "90d") {
      const s = new Date(now); s.setDate(s.getDate()-90); return { start:s, end };
    } else if (p === "12m") {
      const s = new Date(now); s.setFullYear(s.getFullYear()-1); return { start:s, end };
    } else {
      return { start: new Date(customStart), end: new Date(customEnd+"T23:59:59") };
    }
  }

  function getPrevRange(p, curRange) {
    const span = curRange.end - curRange.start;
    return { start: new Date(curRange.start - span), end: new Date(curRange.start - 1) };
  }

  function calcStats(qs, rs, start, end) {
    const inRange = q => { const d = new Date(q.start_date||""); return d >= start && d <= end; };
    const inRangeR = r => { const d = new Date(r.date||""); return d >= start && d <= end; };
    // Literal Master jobs are won transactions
    const won    = qs.filter(q=>inRange(q));
    const closed = qs.filter(q=>inRange(q));
    return {
      rev:  won.reduce((s,q)=>s+(parseFloat(q.total)||0),0),
      wonN: won.length,
      pipe: 0,
      subN: 0,
      wr:   100,
      rn:   rs.filter(r=>r.status==="New"&&inRangeR(r)).length,
      draftN: 0,
      draftV: 0,
      lostN:  0,
      lostV:  0,
    };
  }

  function pct(cur, prev) {
    if (!prev || prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / Math.abs(prev)) * 100);
  }

  const curRange  = getRange(period);
  const prevRange = getPrevRange(period, curRange);
  const cur  = calcStats(jobs, reqs, curRange.start, curRange.end);
  const prev = calcStats(jobs, reqs, prevRange.start, prevRange.end);

  const Change = ({ curVal, prevVal }) => {
    const p = pct(curVal, prevVal);
    if (prevVal === 0 && curVal === 0) return null;
    const up = p >= 0;
    return (
      <span style={{ fontSize:10, fontWeight:700, color:up?C.grn:C.red, position:"absolute", top:8, right:10 }}>
        {up?"▲":"▼"}{Math.abs(p)}%
      </span>
    );
  };

  const periodLabel = period==="custom"
    ? `${customStart} → ${customEnd}`
    : PERIODS.find(p=>p.key===period)?.label;

  return (
    <div className="dashboard-metrics-container" style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch", marginBottom: 15 }}>
      <style>{`
        .dash-period { position: relative; width: 100%; margin-bottom: 5px; }
        .dash-grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%,140px), 1fr)); gap: 10px; margin-bottom: 12px; }
        .dash-grid-status { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%,110px), 1fr)); gap: 8px; margin-bottom: 12px; }
        @media (max-width: 950px) {
          .dash-grid-stats, .dash-grid-status { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 420px) {
          .filter-helper-text { display: none !important; }
        }
      `}</style>
      {/* Left Column: Period Selector */ }
      <div className="dash-period">
        <button 
          style={{ ...mkBtn("primary"), background:C.acc, color:"#fff", border:"none", width:"100%", justifyContent:"space-between", padding:"10px 14px", fontSize:14 }}
          onClick={() => { setShowPeriodMenu(!showPeriodMenu); setShowRfqMenu(false); }}
        >
          <span style={{ fontWeight:700, flex:1, minWidth:0, textAlign:"left", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{period==="custom" ? `Filter: ${customStart} → ${customEnd}` : `Filter: ${periodLabel}`}</span>
          <span className="filter-helper-text" style={{ fontSize:11, opacity:0.9, flexShrink:0, marginLeft:8 }}>Click to change Filter ▾</span>
        </button>
        {showPeriodMenu && (
          <div style={{ position:"absolute", top:"100%", left:0, zIndex:100, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:6, padding:8, display:"flex", flexDirection:"column", gap:4, width:"100%", marginTop:4, boxShadow:"0 4px 12px rgba(0,0,0,0.1)" }}>
            {PERIODS.filter(p=>p.key!=="custom").map(p=>(
              <button key={p.key} onClick={()=>{setPeriod(p.key);setShowPeriodMenu(false);setShowPicker(false);}} style={{ background:period===p.key?C.bg:"transparent", color:period===p.key?C.acc:C.txtM, border:"none", borderRadius:5, padding:"8px 11px", fontSize:13, cursor:"pointer", fontFamily:"inherit", fontWeight:period===p.key?700:500, textAlign:"left" }}>{p.label}</button>
            ))}
            <div style={{ borderTop:`1px solid ${C.bdr}`, margin:"4px 0" }}></div>
            <button onClick={()=>{setPeriod("custom");setShowPicker(!showPicker);}} style={{ background:period==="custom"&&!showPicker?C.bg:"transparent", color:period==="custom"?C.acc:C.txtM, border:"none", borderRadius:5, padding:"8px 11px", fontSize:13, cursor:"pointer", fontFamily:"inherit", fontWeight:period==="custom"?700:500, textAlign:"left" }}>Custom Range…</button>
            {period==="custom" && showPicker && (
              <div style={{ display:"flex", flexDirection:"column", gap:6, padding:"6px 0" }}>
                <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} style={{ ...inp2, fontSize:13 }}/>
                <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} style={{ ...inp2, fontSize:13 }}/>
                <button onClick={()=>setShowPeriodMenu(false)} style={{ ...mkBtn("primary"), background:C.acc, color:"#fff", border:"none", padding:"6px", fontSize:13 }}>Apply Filter</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dash Stats */ }
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Top 4 stat bubbles — clickable, responsive */}
      <div className="dash-grid-stats">
        {[
          { l:"Revenue Won",  v:fmt(cur.rev),    s:`${cur.wonN} jobs`,           c:C.grn,  cv:cur.rev,  pv:prev.rev,  report:"rev-by-month"      },
          { l:"Pipeline",     v:fmt(cur.pipe),   s:`${cur.subN} open`,      c:C.blue, cv:cur.pipe, pv:prev.pipe, report:"pipeline-summary"  },
          { l:"Win Rate",     v:cur.wr+"%",      s:"closed jobs",              c:C.acc,  cv:cur.wr,   pv:prev.wr,   report:"win-loss"           },
          { l:"Open RFQs",    v:cur.rn,          s:"need estimates",             c:C.ora,  cv:cur.rn,   pv:prev.rn,   report:"rfq-response"       },
        ].map(x => (
          <Card key={x.l} style={{ marginBottom:0, position:"relative", cursor:"pointer", transition:"box-shadow .15s", display:"flex", flexDirection:"column", height:"100%" }}
            onClick={()=>onOpenReport&&onOpenReport(x.report)}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 0 0 2px ${C.accB}`}
            onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
            <Change curVal={x.cv} prevVal={x.pv}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize:"clamp(10px,1.1vw,11px)", color:C.txtS, fontWeight:600, marginBottom:4 }}>{x.l}</div>
              <div style={{ fontSize:"clamp(18px,2.2vw,24px)", fontWeight:700, color:x.c }}>{x.v}</div>
              <div style={{ fontSize:"clamp(10px,1.1vw,11px)", color:C.txtS, marginTop:2 }}>{x.s}</div>
            </div>
            <div style={{ fontSize:9, color:C.txtS, marginTop:"auto", paddingTop:5, opacity:.6 }}>↗ View Report</div>
          </Card>
        ))}
      </div>

      {/* Status breakdown bubbles — clickable, responsive */}
      <div className="dash-grid-status">
        {[
          { st:"In Progress", n:cur.draftN, v:cur.draftV, pn:prev.draftN, report:"pipeline-summary" },
          { st:"Submitted",   n:cur.subN,   v:cur.pipe,   pn:prev.subN,   report:"pipeline-summary" },
          { st:"Won",         n:cur.wonN,   v:cur.rev,    pn:prev.wonN,   report:"rev-by-customer"  },
          { st:"Lost",        n:cur.lostN,  v:cur.lostV,  pn:prev.lostN,  report:"win-loss"         },
        ].map(x => {
          const s = SS[x.st];
          const p = pct(x.n, x.pn);
          const up = p >= 0;
          return (
            <div key={x.st}
              style={{ background:s.bg, border:`1px solid ${s.bd}`, borderRadius:8, padding:12, position:"relative", cursor:"pointer", transition:"opacity .15s", display:"flex", flexDirection:"column", height:"100%" }}
              onClick={()=>onOpenReport&&onOpenReport(x.report)}
              onMouseEnter={e=>e.currentTarget.style.opacity=".85"}
              onMouseLeave={e=>e.currentTarget.style.opacity=""}>
              {x.pn >= 0 && x.n >= 0 && (x.n!==0||x.pn!==0) && (
                <span style={{ fontSize:10, fontWeight:700, color:up?C.grn:C.red, position:"absolute", top:8, right:10 }}>
                  {up?"▲":"▼"}{Math.abs(p)}%
                </span>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize:"clamp(10px,1.1vw,11px)", fontWeight:600, color:s.cl }}>{x.st}</div>
                <div style={{ fontSize:"clamp(16px,2vw,20px)", fontWeight:700, color:s.cl, margin:"2px 0" }}>{x.n}</div>
                <div style={{ fontSize:"clamp(10px,1.1vw,11px)", color:s.cl, opacity:.8 }}>{fmt(x.v)}</div>
              </div>
              <div style={{ fontSize:9, color:s.cl, opacity:.5, marginTop:"auto", paddingTop:4 }}>↗ Report</div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

const inp2 = { background:C.sur, border:`1px solid ${C.bdrM}`, borderRadius:5, color:C.txt, fontFamily:"inherit", fontSize:13, padding:"6px 9px", width:"100%", boxSizing:"border-box", outline:"none" };

// ── RECENT QUOTES CARD ────────────────────────────────────────────────────────
function RecentQuotesCard({ jobs, openEdit, setView }) {
  const customers = useMemo(() => [...new Set(jobs.map(q=>q.client))].sort(), [jobs]);
  const [custFilter, setCustFilter] = useState("all");
  const [expandedCustFilter, setExpandedCustFilter] = useState(false);

  const filtered = custFilter==="all" ? jobs : jobs.filter(q=>q.client===custFilter);

  return (
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8 }}>
        <Sec c="Recent Quotes"/>
        <button style={{ ...mkBtn("ghost"), fontSize:11, padding:"3px 9px" }} onClick={()=>setView("customers")}>View All</button>
      </div>
      <div style={{ position:"relative", marginBottom:15 }}>
        <button 
          style={{ ...mkBtn("primary"), background:C.acc, color:"#fff", border:"none", width:"100%", justifyContent:"space-between", padding:"10px 14px", fontSize:14 }}
          onClick={() => { setExpandedCustFilter(p => !p); }}
        >
          <span style={{ fontWeight:700, flex:1, minWidth:0, textAlign:"left", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{custFilter==="all" ? "Filter: All Customers" : `Filter: ${custFilter}`}</span>
          <span className="filter-helper-text" style={{ fontSize:11, opacity:0.9, flexShrink:0, marginLeft:8 }}>Click to change Filter ▾</span>
        </button>
        {expandedCustFilter && (
          <div style={{ position:"absolute", top:"100%", left:0, zIndex:100, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:6, padding:8, display:"flex", flexDirection:"column", gap:4, width:"100%", marginTop:4, boxShadow:"0 4px 12px rgba(0,0,0,0.1)", maxHeight:250, overflowY:"auto" }}>
            <button onClick={()=>{setCustFilter("all"); setExpandedCustFilter(false);}} style={{ background:custFilter==="all"?C.bg:"transparent", color:custFilter==="all"?C.acc:C.txtM, border:"none", borderRadius:5, padding:"8px 11px", fontSize:13, cursor:"pointer", fontFamily:"inherit", fontWeight:custFilter==="all"?700:500, textAlign:"left" }}>All Customers</button>
            <div style={{ borderTop:`1px solid ${C.bdr}`, margin:"4px 0" }}></div>
            {customers.map((c) => (
              <button key={c} onClick={()=>{setCustFilter(c); setExpandedCustFilter(false);}} style={{ background:custFilter===c?C.bg:"transparent", color:custFilter===c?C.acc:C.txtM, border:"none", borderRadius:5, padding:"8px 11px", fontSize:13, cursor:"pointer", fontFamily:"inherit", fontWeight:custFilter===c?700:500, textAlign:"left" }}>{c}</button>
            ))}
          </div>
        )}
      </div>
      <div className="app-table-wrap" style={{ overflowX:"auto" }}>
        <style>{`
          @media (max-width: 600px) {
            .rq-hide-mobile { display: none !important; }
            .rq-table { min-width: auto !important; }
          }
        `}</style>
        <table className="rq-table" style={{ width:"100%", borderCollapse:"collapse", minWidth:460 }}>
          <thead>
            <tr>
              <th style={thS}>Job #</th>
              <th style={thS}>Customer</th>
              <th className="rq-hide-mobile" style={thS}>Description</th>
              <th className="rq-hide-mobile" style={thS}>Start Date</th>
              <th style={thS}>Status</th>
              <th className="rq-hide-mobile" style={thS}>Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0,12).map(q=>(
              <tr key={q.id} style={{ cursor:"pointer" }} onClick={()=>openEdit(q)}>
                <td style={{ ...tdS, color:C.acc, fontWeight:600, whiteSpace:"nowrap" }}>{q.job_num}</td>
                <td style={{ ...tdS, fontWeight:600 }}>{q.client}</td>
                <td className="rq-hide-mobile" style={{ ...tdS, color:C.txtM, maxWidth:180 }}>{q.job_description}</td>
                <td className="rq-hide-mobile" style={{ ...tdS, color:C.txtS, whiteSpace:"nowrap" }}>{q.start_date ? new Date(q.start_date).toLocaleDateString() : "Historic"}</td>
                <td style={tdS}><span style={{ borderRadius:6, background:C.accL, color:C.acc, padding:"2px 8px", fontSize:10, fontWeight:800 }}>HISTORICAL</span></td>
                <td className="rq-hide-mobile" style={{ ...tdS, fontWeight:700, whiteSpace:"nowrap" }}>{fmt(parseFloat(q.total)||0)}</td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan={6} style={{ ...tdS, textAlign:"center", color:C.txtS, padding:"16px" }}>No jobs found for this customer.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── RFQ DASHBOARD CARD ────────────────────────────────────────────────────────
function RFQDashCard({ reqs, jobs, jobFolders, setJobFolders, setShowJFM, openNew, openEdit, setView, setDeadModal, rfqStageFilter }) {
  const STAGES_DASH = ["RFQ Received","Client Contact","Viewed Job / Docs","Priced Materials / Rentals","Final Consult"];
  const stageColors = ["#b86b0a","#2563eb","#0d9488","#7c3aed","#16a34a"];
  const [expandedRfq,    setExpandedRfq]    = useState(null);
  const [promptInfo,     setPromptInfo]     = useState(null);

  function applyProgress() {
    if (!promptInfo) return;
    const { rfqId, newStage, note, date } = promptInfo;
    setJobFolders(prev => {
      const f = prev[rfqId] || { stage: 0, lastActivity: "", estimatorNotes: "", customChecks: [], timelines: [], attachments: [] };
      const timelines = note.trim() ? [...(f.timelines||[]), { id: Math.random().toString(36).substring(2,9), date, note }] : (f.timelines||[]);
      return { ...prev, [rfqId]: { ...f, stage: newStage, lastActivity: date, timelines } };
    });
    setPromptInfo(null);
  }

  const pendingReqs = reqs.filter(r=>r.status!=="Quoted"&&r.status!=="Dead");
  if (pendingReqs.length === 0) return null;

  const filteredReqs = pendingReqs.filter(r => {
    const folder  = jobFolders[r.id];
    const stage   = folder ? (folder.stage ?? 0) : 0;
    const stageOk = rfqStageFilter==="all" || String(stage)===rfqStageFilter;
    return stageOk;
  });

  const dayBadge = (label, days, thresh) => {
    const color = days > thresh ? C.red : days > Math.floor(thresh*0.6) ? C.yel : C.grn;
    const bg    = days > thresh ? C.redB : days > Math.floor(thresh*0.6) ? C.yelB : C.grnB;
    const bdr   = days > thresh ? C.redBdr : days > Math.floor(thresh*0.6) ? C.yelBdr : C.grnBdr;
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", background:bg, border:`1px solid ${bdr}`, borderRadius:6, padding:"4px 10px", minWidth:60 }}>
        <div style={{ fontSize:16, fontWeight:800, color, lineHeight:1 }}>{days}</div>
        <div style={{ fontSize:9, color, fontWeight:700, textAlign:"center", lineHeight:1.2, marginTop:2 }}>{label}</div>
      </div>
    );
  };

  return (
    <Card>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8 }}>
        <Sec c="Requests for Quote"/>
        <button style={{ ...mkBtn("ghost"), fontSize:11, padding:"3px 9px" }} onClick={()=>setView("rfqs")}>View All</button>
      </div>

      <div style={{ position:"relative", marginBottom:15 }}>
        <button 
          style={{ ...mkBtn("primary"), background:C.acc, color:"#fff", border:"none", width:"100%", justifyContent:"space-between", padding:"10px 14px", fontSize:14 }}
          onClick={() => { setExpandedRfq(p => p==="filterMenu" ? null : "filterMenu"); }}
        >
          <span style={{ fontWeight:700, flex:1, minWidth:0, textAlign:"left", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{rfqStageFilter==="all" ? "Filter: All Requests" : `Filter: ${STAGES_DASH[Number(rfqStageFilter)]}`}</span>
          <span style={{ fontSize:11, opacity:0.9, flexShrink:0, marginLeft:8 }}>Click to change Filter ▾</span>
        </button>
        {expandedRfq === "filterMenu" && (
          <div style={{ position:"absolute", top:"100%", left:0, zIndex:100, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:6, padding:8, display:"flex", flexDirection:"column", gap:4, width:"100%", marginTop:4, boxShadow:"0 4px 12px rgba(0,0,0,0.1)" }}>
            <button onClick={()=>{setRfqStageFilter("all"); setExpandedRfq(null);}} style={{ background:rfqStageFilter==="all"?C.bg:"transparent", color:rfqStageFilter==="all"?C.acc:C.txtM, border:"none", borderRadius:5, padding:"8px 11px", fontSize:13, cursor:"pointer", fontFamily:"inherit", fontWeight:rfqStageFilter==="all"?700:500, textAlign:"left" }}>All Requests</button>
            {STAGES_DASH.map((s,i) => (
              <button key={i} onClick={()=>{setRfqStageFilter(String(i)); setExpandedRfq(null);}} style={{ background:rfqStageFilter===String(i)?C.bg:"transparent", color:rfqStageFilter===String(i)?C.acc:C.txtM, border:"none", borderRadius:5, padding:"8px 11px", fontSize:13, cursor:"pointer", fontFamily:"inherit", fontWeight:rfqStageFilter===String(i)?700:500, textAlign:"left" }}>{s}</button>
            ))}
          </div>
        )}
      </div>

      {/* RFQ rows */}
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {filteredReqs.length===0 && (
          <div style={{ fontSize:12, color:C.txtS, padding:"10px 0", textAlign:"center" }}>No requests match the selected filters.</div>
        )}
        {filteredReqs.map(r => {
          const folder  = jobFolders[r.id];
          const stage   = folder ? (folder.stage ?? 0) : 0;
          const lastAct = folder?.lastActivity || r.date || "";
          const rfqDate = new Date(r.date || Date.now());
          const actDate = new Date(lastAct || Date.now());
          const todayD  = new Date();
          const daysRfq = Math.floor((todayD - rfqDate) / 86400000);
          const daysAct = Math.floor((todayD - actDate) / 86400000);
          const linkedQ = jobs.find(q=>q.fromReqId===r.id);
          const isExp   = expandedRfq===r.id;

          return (
            <div key={r.id} style={{ background:C.bg, borderRadius:8, border:`1px solid ${isExp?C.accB:C.bdr}`, overflow:"hidden", transition:"border .15s" }}>
              {/* Collapsed row */}
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", cursor:"pointer", flexWrap:"wrap" }} onClick={()=>setExpandedRfq(isExp?null:r.id)}>
                <div style={{ width:22, height:22, borderRadius:"50%", background:isExp?C.acc:C.bdr, color:isExp?"#fff":C.txtM, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0, transition:"all .15s" }}>{isExp?"▾":"▸"}</div>
                <div style={{ flex:1, minWidth:140 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{r.company}</div>
                  <div style={{ fontSize:11, color:C.txtS, marginTop:1 }}>{(r.desc||"").slice(0,70)}</div>
                </div>
                <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:3, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:5, padding:"3px 7px" }}>
                    {STAGES_DASH.map((s,i) => (
                      <div key={i} title={s} style={{ width:8, height:8, borderRadius:"50%", background:i<=stage?stageColors[i]:C.bdr }}/>
                    ))}
                  </div>
                  <button style={{ ...mkBtn("ghost"), padding:"4px 9px", fontSize:11 }} onClick={e=>{e.stopPropagation();setShowJFM(r);}}>Job Folder</button>
                  <button style={{ ...mkBtn("blue"), padding:"4px 9px", fontSize:11 }} onClick={e=>{e.stopPropagation();openNew(r);}}>Estimate →</button>
                </div>
              </div>

              {/* Expanded detail */}
              {isExp && (
                <div style={{ borderTop:`1px solid ${C.bdr}`, padding:"14px 16px", background:C.sur, display:"flex", flexDirection:"column", gap:14 }}>
                  <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
                    {/* Stage progress */}
                    <div style={{ flex:1, minWidth:280 }}>
                      <div style={{ fontSize:9, color:C.txtS, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Quote Progress</div>
                      <div style={{ display:"flex" }}>
                        {STAGES_DASH.map((s,i) => {
                          const done=i<stage; const active=i===stage; const color=stageColors[i];
                          return (
                            <div key={s} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", position:"relative" }}>
                              {i>0 && <div style={{ position:"absolute", top:14, left:"-50%", right:"50%", height:2, background:done||active?stageColors[i-1]:C.bdr, zIndex:0 }}/>}
                              {i<STAGES_DASH.length-1 && <div style={{ position:"absolute", top:14, left:"50%", right:"-50%", height:2, background:done?color:C.bdr, zIndex:0 }}/>}
                              <button 
                                title={s} 
                                onClick={(e) => { e.stopPropagation(); setPromptInfo({ rfqId: r.id, newStage: i, note: `Moved to stage: ${s}`, date: new Date().toISOString().slice(0, 10) }); }}
                                style={{ width:28, height:28, borderRadius:"50%", border:`2px solid ${active||done?color:C.bdr}`, background:active||done?color:C.sur, color:active||done?"#fff":C.txtS, fontSize:11, fontWeight:800, zIndex:1, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:0, fontFamily:"inherit" }}
                              >
                                {done?"✓":i+1}
                              </button>
                              <div style={{ fontSize:8, color:active?color:C.txtS, fontWeight:active?800:500, marginTop:4, textAlign:"center", lineHeight:1.2, maxWidth:60 }}>{s}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Day badges */}
                    <div style={{ display:"flex", gap:8 }}>
                      {dayBadge("Days Since RFQ", daysRfq, 7)}
                      {dayBadge("Days Since Activity", daysAct, 3)}
                    </div>
                  </div>

                  {/* Estimate summary */}
                  {linkedQ ? (
                    <div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:7, padding:"10px 14px" }}>
                      <div style={{ fontSize:9, color:C.txtS, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Estimate Summary</div>
                      <div style={{ display:"flex", gap:16, flexWrap:"wrap", alignItems:"center" }}>
                        <div><div style={{ fontSize:10, color:C.txtS }}>Quote #</div><div style={{ fontWeight:700, fontSize:13, color:C.acc }}>{linkedQ.qn}</div></div>
                        <div><div style={{ fontSize:10, color:C.txtS }}>Status</div><Badge status={linkedQ.status}/></div>
                        <div><div style={{ fontSize:10, color:C.txtS }}>Total</div><div style={{ fontWeight:700, fontSize:15 }}>{fmt(linkedQ.total||0)}</div></div>
                        <div><div style={{ fontSize:10, color:C.txtS }}>Labor</div><div style={{ fontWeight:600, fontSize:13, color:C.ora }}>{fmt(linkedQ.labor||0)}</div></div>
                        <div><div style={{ fontSize:10, color:C.txtS }}>Equipment</div><div style={{ fontWeight:600, fontSize:13, color:C.teal }}>{fmt(linkedQ.equip||0)}</div></div>
                        <div><div style={{ fontSize:10, color:C.txtS }}>Hauling</div><div style={{ fontWeight:600, fontSize:13, color:C.purp }}>{fmt(linkedQ.hauling||0)}</div></div>
                        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                          <button style={{ ...mkBtn("outline"), fontSize:11, padding:"4px 10px" }} onClick={()=>openEdit(linkedQ)}>Open Estimate</button>
                          <button style={{ background:"#1c1f26", color:"#9ca3af", border:"1px solid #374151", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }} onClick={()=>setDeadModal&&setDeadModal({type:"rfq",item:r})}>Mark Dead</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background:C.bg, border:`1px dashed ${C.bdrM}`, borderRadius:7, padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                      <span style={{ fontSize:12, color:C.txtS }}>No estimate yet.</span>
                      <div style={{ display:"flex", gap:8 }}>
                        <button style={{ ...mkBtn("blue"), fontSize:11, padding:"4px 11px" }} onClick={()=>openNew(r)}>Create Estimate →</button>
                        <button style={{ background:"#1c1f26", color:"#9ca3af", border:"1px solid #374151", borderRadius:6, padding:"4px 11px", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }} onClick={()=>setDeadModal&&setDeadModal({type:"rfq",item:r})}>Mark Dead</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {promptInfo && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding: 20 }} onClick={()=>setPromptInfo(null)}>
          <div style={{ background:C.sur, borderRadius:8, padding:20, width:400, maxWidth:"100%", boxShadow:"0 16px 48px rgba(0,0,0,.28)", display:"flex", flexDirection:"column" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:15, fontWeight:700, color:C.txt, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Update Quote Progress</div>
            <div style={{ fontSize:13, color:C.txtM, marginBottom:16 }}>Please enter an activity note for this progress update:</div>
            
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <input type="date" style={{ ...inp, width:132, fontSize:13 }} value={promptInfo.date} onChange={e=>setPromptInfo({...promptInfo, date:e.target.value})} />
              <input style={{ ...inp, flex:1, fontSize:13 }} autoFocus value={promptInfo.note} onChange={e=>setPromptInfo({...promptInfo, note:e.target.value})} onKeyDown={e=>{ if (e.key==="Enter") applyProgress(); }} />
            </div>
            
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:10 }}>
              <button style={{ ...mkBtn("ghost"), padding:"7px 12px" }} onClick={()=>setPromptInfo(null)}>Cancel</button>
              <button style={{ ...mkBtn("primary"), padding:"7px 12px" }} onClick={applyProgress}>Save Progress</button>
            </div>
          </div>
        </div>
      )}

    </Card>
  );
}

// ── RFQ LIST VIEW ─────────────────────────────────────────────────────────────
function RFQListView({ reqs, jobs, setReqs, openNew, setShowJFM, setEditR, setShowRM, setDeadModal }) {
  const [rfqView, setRfqView] = useState("active"); // active | all | dead
  const [layoutMode, setLayoutMode] = useState("list"); // list | card

  const filtered = rfqView==="active"
    ? reqs.filter(r=>r.status!=="Dead"&&r.status!=="Quoted")
    : rfqView==="dead"
    ? reqs.filter(r=>r.status==="Dead"||r.status==="Quoted")
    : reqs;

  const activeCount = reqs.filter(r=>r.status!=="Dead"&&r.status!=="Quoted").length;
  const quotedCount = reqs.filter(r=>r.status==="Quoted").length;
  const deadCount   = reqs.filter(r=>r.status==="Dead").length;

  return (
    <div>
      {/* Header + toggle */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:700 }}>Request For Quote</div>
          <div style={{ fontSize:12, color:C.txtS, marginTop:2 }}>
            {activeCount} active · {quotedCount} quoted · {deadCount} dead
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ display:"flex", gap:3, background:C.acc, border:`1px solid ${C.acc}`, borderRadius:8, padding:3 }}>
            <button onClick={()=>setLayoutMode("list")} style={{ background:layoutMode==="list"?"#fff":"transparent", color:layoutMode==="list"?C.acc:"#fff", border:"none", borderRadius:6, padding:"5px 10px", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700 }}>List</button>
            <button onClick={()=>setLayoutMode("card")} style={{ background:layoutMode==="card"?"#fff":"transparent", color:layoutMode==="card"?C.acc:"#fff", border:"none", borderRadius:6, padding:"5px 10px", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700 }}>Cards</button>
          </div>
          <div style={{ display:"flex", gap:3, background:C.acc, border:`1px solid ${C.acc}`, borderRadius:8, padding:3 }}>
            {[["active","Active"],["all","All"],["dead","Quoted / Dead"]].map(([v,l])=>(
              <button key={v} onClick={()=>setRfqView(v)}
                style={{ background:rfqView===v?"#fff":"transparent", color:rfqView===v?C.acc:"#fff", border:"none", borderRadius:6, padding:"5px 14px", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700, whiteSpace:"nowrap" }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List / Grid */}
      <div style={{ display:layoutMode==="card"?"grid":"flex", gridTemplateColumns:layoutMode==="card"?"repeat(auto-fill, minmax(320px, 1fr))":undefined, flexDirection:layoutMode==="card"?undefined:"column", gap:10, alignItems:"stretch" }}>
        {filtered.length===0 && (
          <Card style={{ textAlign:"center", color:C.txtS, padding:40 }}>
            {rfqView==="active"?"No active RFQs — all requests have been quoted or closed.":"No requests found."}
          </Card>
        )}
        {filtered.map(r => {
          const isDead   = r.status==="Dead";
          const isQuoted = r.status==="Quoted";
          const linkedQ  = jobs.find(q=>q.fromReqId===r.id);
          return (
            <Card key={r.id} style={{ marginBottom:0, opacity:isDead?0.75:1, background:isDead?"#111318":C.sur, border:isDead?`1px solid #374151`:`1px solid ${C.bdr}`, display:"flex", flexDirection:"column", height:"100%" }}>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:layoutMode==="card"?"stretch":"flex-start", flex:1, flexDirection:layoutMode==="card"?"column":"row" }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:3 }}>
                    <span style={{ fontWeight:700, color:isDead?"#9ca3af":C.acc, fontSize:12 }}>{r.rn}</span>
                    <Badge status={r.status}/>
                    <span style={{ fontSize:11, color:C.txtS }}>{r.date}</span>
                  </div>
                  <div style={{ fontWeight:700, fontSize:15, color:isDead?"#6b7280":C.txt }}>{r.company}</div>
                  {r.jobSite   && <div style={{ fontSize:12, color:C.txtM, marginTop:1 }}>{r.jobSite}</div>}
                  {r.requester && <div style={{ fontSize:12, color:C.txtM }}>Contact: {r.requester}{r.phone?" · "+r.phone:""}</div>}
                  <div style={{ fontSize:12, color:C.txtM, marginTop:3 }}>{r.desc}</div>
                  {r.salesAssoc
                    ? <div style={{ fontSize:11, color:C.txtS, marginTop:3 }}>Estimator: <strong>{r.salesAssoc}</strong></div>
                    : <div style={{ fontSize:11, color:C.txtS, marginTop:3, fontStyle:"italic" }}>Unassigned</div>}
                  {isDead && r.deadNote && (
                    <div style={{ marginTop:6, background:"#1f2937", border:"1px solid #374151", borderRadius:5, padding:"4px 9px", fontSize:11, color:"#9ca3af" }}>
                      💀 {r.deadNote}
                    </div>
                  )}
                  {isQuoted && linkedQ && (
                    <div style={{ fontSize:11, color:C.grn, marginTop:4, fontWeight:600 }}>
                      ✓ Estimate: {linkedQ.qn} · ${Math.round(linkedQ.total||0).toLocaleString()} · {linkedQ.status}
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center", marginTop:layoutMode==="card"?"auto":0 }}>
                  <button style={{ ...mkBtn("ghost"), fontSize:11, padding:"4px 9px" }} onClick={()=>setShowJFM(r)}>Job Folder</button>
                  {!isDead && !isQuoted && <>
                    <button style={{ ...mkBtn("ghost"), fontSize:11, padding:"4px 9px" }} onClick={()=>{setEditR(r);setShowRM(true);}}>Edit</button>
                    <button style={{ ...mkBtn("blue"), fontSize:11, padding:"4px 9px" }} onClick={()=>openNew(r)}>Create Estimate →</button>
                    <button style={{ background:"#1c1f26", color:"#9ca3af", border:"1px solid #374151", borderRadius:6, padding:"4px 9px", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }} onClick={()=>setDeadModal({type:"rfq",item:r})}>Mark Dead</button>
                  </>}
                  {isDead && (
                    <button style={{ ...mkBtn("ghost"), fontSize:11, padding:"4px 9px" }} onClick={()=>setReqs(p=>p.map(x=>x.id===r.id?{...x,status:"New",deadNote:""}:x))}>Reopen</button>
                  )}
                  <button style={{ ...mkBtn("danger"), fontSize:11, padding:"4px 9px" }} onClick={()=>setReqs(p=>p.filter(x=>x.id!==r.id))}>Delete</button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── MASTER JOB LIST ───────────────────────────────────────────────────────────
function MasterJobList({ jobs, reqs, jobFolders, openEdit, setShowJFM, onUpdateJobNum, onViewAttachments, jobListFilter, setJobListFilter, setView }) {
  const [search,      setSearch]      = useState("");
  const [sortBy,      setSortBy]      = useState("jobNum");
  const [sortDir,     setSortDir]     = useState("asc");
  const [editingJobId,setEditingJobId]= useState(null);
  const [editJobNum,  setEditJobNum]  = useState("");

  // Only Won jobs appear in the Master Job List
  const allJobs = useMemo(() => {
    return jobs
      .map(q => {
        const rfq    = reqs.find(r => r.id===q.fromReqId);
        const folder = rfq ? jobFolders[rfq.id] : null;
        const STAGES = ["RFQ Received","Client Contact","Viewed Job / Docs","Priced Materials / Rentals","Final Consult"];
        const stage  = folder?.stage ?? null;
        return {
          id:        q.id,
          customer_num: q.customer_num || "—",
          jobNum:    q.job_num || "",
          quoteNum:  q.job_num || "",
          client:    q.client || "",
          desc:      q.job_description || "",
          jobSite:   q.jobSite || rfq?.jobSite || "",
          estimator: q.salesAssoc || "—",
          startDate: q.start_date || "",
          compDate:  q.end_date || "",
          total:     parseFloat(q.total) || 0,
          rfqId:     rfq?.id || null,
          stageName: stage!==null ? STAGES[stage] : "—",
          attachments: q.attachments || [],
          folderAttachments: folder?.attachments || [],
          quote:     q,
          rfq:       rfq || null,
        };
      });
  }, [jobs, reqs, jobFolders]);

  const filtered = useMemo(() => {
    let rows = allJobs;
    if(jobListFilter) {
      rows = rows.filter(j => j.client === jobListFilter);
    }
    if(search) {
      const s = search.toLowerCase();
      rows = rows.filter(j=>[j.jobNum,j.quoteNum,j.client,j.desc,j.jobSite,j.estimator].some(v=>v?.toLowerCase().includes(s)));
    }
    return [...rows].sort((a,b)=>{
      let av=a[sortBy]||"", bv=b[sortBy]||"";
      if(sortBy==="total"){ av=Number(av); bv=Number(bv); }
      const res = av>bv?1:av<bv?-1:0;
      return sortDir==="asc"?res:-res;
    });
  }, [allJobs, search, sortBy, sortDir, jobListFilter]);

  function toggleSort(col) {
    if(sortBy===col) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortBy(col); setSortDir("asc"); }
  }

  function startEditJobNum(j) {
    setEditingJobId(j.id);
    setEditJobNum(j.jobNum);
  }

  function saveJobNum(j) {
    if(onUpdateJobNum) onUpdateJobNum(j.id, editJobNum.trim());
    setEditingJobId(null);
  }

  const SortHdr = ({col, label, width}) => (
    <th onClick={()=>toggleSort(col)}
      style={{ ...thS, cursor:"pointer", userSelect:"none", whiteSpace:"nowrap", width:width||"auto" }}>
      {label}{sortBy===col?<span style={{ marginLeft:3 }}>{sortDir==="asc"?"▲":"▼"}</span>:null}
    </th>
  );

  return (
    <div className="app-page-container app-page-container--wide" style={{ maxWidth:1400 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:15 }}>
          {jobListFilter && (
            <button 
              style={{ ...mkBtn("outline"), padding:"8px 16px", borderRadius:10, fontSize:13, fontWeight:800, border:`2px solid ${C.acc}`, color:C.acc }}
              onClick={() => {
                setJobListFilter(null);
                setView("customers");
              }}
            >← Back to Customer Detail</button>
          )}
          <div>
            <div style={{ fontSize:20, fontWeight:700 }}>{jobListFilter ? `${jobListFilter} · Master Job List` : "Master Job List"}</div>
            <div style={{ fontSize:12, color:C.txtS, marginTop:2 }}>
              {filtered.length} won jobs · {fmt(filtered.reduce((s,j)=>s+j.total,0))} total value
            </div>
          </div>
        </div>
        <input style={{ ...inp, width:280, fontSize:13, border:`2px solid ${C.acc}`, borderRadius:8 }}
          placeholder="Search job #, customer, description, location…"
          value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* Table */}
      <Card style={{ padding:0, overflow:"hidden" }}>
        <div className="app-table-wrap" style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead style={{ background:C.bg }}>
              <tr>
                <SortHdr col="customer_num" label="Cust. #"    width={90}/>
                <SortHdr col="jobNum"       label="Job #"      width={120}/>
                <SortHdr col="client"    label="Customer"    width={160}/>
                <SortHdr col="desc"      label="Description" width={200}/>
                <SortHdr col="jobSite"   label="Location"    width={160}/>
                <SortHdr col="estimator" label="Estimator"   width={110}/>
                <SortHdr col="startDate" label="Start"       width={90}/>
                <SortHdr col="compDate"  label="Completion"  width={100}/>
                <SortHdr col="total"     label="Value"       width={100}/>
                <th style={{ ...thS, whiteSpace:"nowrap" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length===0 && (
                <tr><td colSpan={10} style={{ padding:"32px", textAlign:"center", color:C.txtS, fontSize:13 }}>
                  {allJobs.length===0 ? "No historical jobs found. Jobs appear here from the Master Job Registry." : "No jobs match your search."}
                </td></tr>
              )}
              {filtered.map(j => (
                <tr key={j.id}
                  style={{ borderBottom:`1px solid ${C.bdr}`, background:C.sur }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.grnB}
                  onMouseLeave={e=>e.currentTarget.style.background=C.sur}>

                  <td style={{ ...tdS, padding:"10px 12px", color:C.acc, fontWeight:700 }}>{j.customer_num}</td>

                  {/* Job # — inline editable */}
                  <td style={{ ...tdS, padding:"10px 12px", whiteSpace:"nowrap" }}>
                    {editingJobId===j.id ? (
                      <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                        <input
                          style={{ ...inp, width:90, fontSize:12, padding:"3px 7px" }}
                          value={editJobNum}
                          onChange={e=>setEditJobNum(e.target.value)}
                          onKeyDown={e=>{ if(e.key==="Enter") saveJobNum(j); if(e.key==="Escape") setEditingJobId(null); }}
                          autoFocus
                        />
                        <button style={{ ...mkBtn("primary"), padding:"2px 7px", fontSize:11 }} onClick={()=>saveJobNum(j)}>✓</button>
                        <button style={{ ...mkBtn("ghost"),   padding:"2px 6px", fontSize:11 }} onClick={()=>setEditingJobId(null)}>×</button>
                      </div>
                    ) : (
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontWeight:700, color:j.jobNum?C.grn:C.txtS, minWidth:60 }}>
                          {j.jobNum || <span style={{ fontStyle:"italic", fontWeight:400, fontSize:11 }}>No #</span>}
                        </span>
                        <button
                          title="Edit job number"
                          style={{ background:"none", border:"none", color:C.txtS, cursor:"pointer", fontSize:11, padding:"1px 4px", lineHeight:1 }}
                          onClick={()=>startEditJobNum(j)}>✏</button>
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdS, padding:"10px 12px", fontWeight:600 }}>{j.client}</td>
                  <td style={{ ...tdS, padding:"10px 12px", color:C.txtM, maxWidth:200 }}>
                    <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={j.desc}>{j.desc||"—"}</div>
                  </td>
                  <td style={{ ...tdS, padding:"10px 12px", color:C.txtM, maxWidth:160 }}>
                    <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={j.jobSite}>{j.jobSite||"—"}</div>
                  </td>
                  <td style={{ ...tdS, padding:"10px 12px", color:C.txtM, whiteSpace:"nowrap" }}>{j.estimator}</td>
                  <td style={{ ...tdS, padding:"10px 12px", color:C.txtS, whiteSpace:"nowrap" }}>{j.startDate||"—"}</td>
                  <td style={{ ...tdS, padding:"10px 12px", color:C.txtS, whiteSpace:"nowrap" }}>{j.compDate||"—"}</td>
                  <td style={{ ...tdS, padding:"10px 12px", fontWeight:700, color:C.acc, whiteSpace:"nowrap" }}>{fmt(j.total)}</td>

                  {/* Actions */}
                  <td style={{ ...tdS, padding:"10px 12px" }}>
                    <div style={{ display:"flex", gap:5, flexWrap:"nowrap" }}>
                      <button style={{ ...mkBtn("ghost"), fontSize:10, padding:"3px 8px", whiteSpace:"nowrap" }}
                        onClick={()=>openEdit(j.quote)}>
                        📋 Estimate
                      </button>
                      {j.rfq && (
                        <button style={{ ...mkBtn("outline"), fontSize:10, padding:"3px 8px", whiteSpace:"nowrap" }}
                          onClick={()=>setShowJFM(j.rfq)}>
                          📁 Job Folder
                        </button>
                      )}
                      {(j.attachments.length>0 || j.folderAttachments.length>0) && (
                        <button style={{ ...mkBtn("ghost"), fontSize:10, padding:"3px 8px", whiteSpace:"nowrap", color:C.blue, borderColor:C.blue }}
                          onClick={()=>onViewAttachments&&onViewAttachments(j)}>
                          📎 Attachments ({j.attachments.length + j.folderAttachments.length})
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      {filtered.length > 0 && (
        <div style={{ display:"flex", gap:12, marginTop:10, flexWrap:"wrap" }}>
          {[
            { l:"Jobs Shown",  v:filtered.length,                                       c:C.txt  },
            { l:"Total Value", v:fmt(filtered.reduce((s,j)=>s+j.total,0)),              c:C.acc  },
            { l:"Avg Job",     v:fmt(Math.round(filtered.reduce((s,j)=>s+j.total,0)/filtered.length)), c:C.blue },
          ].map(x=>(
            <div key={x.l} style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:7, padding:"8px 14px", fontSize:12 }}>
              <span style={{ color:C.txtS }}>{x.l}: </span><span style={{ fontWeight:700, color:x.c }}>{x.v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MARK DEAD MODAL ──────────────────────────────────────────────────────────
function MarkDeadModal({ itemType, itemLabel, onConfirm, onClose }) {
  const [note, setNote] = useState("");
  const [err,  setErr]  = useState("");
  function confirm() {
    if(!note.trim()) { setErr("An estimator note is required to mark this item Dead."); return; }
    onConfirm(note.trim());
  }
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.sur, borderRadius:10, padding:24, width:"100%", maxWidth:480, boxShadow:"0 8px 32px rgba(0,0,0,.28)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background:"#1c1f26", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>💀</div>
          <div style={{ fontSize:16, fontWeight:700 }}>Mark {itemType} as Dead</div>
        </div>
        <div style={{ fontSize:13, color:C.txtM, marginBottom:16 }}>
          <strong>{itemLabel}</strong> will be marked Dead and removed from active pipelines.
        </div>
        <div style={{ background:"#1c1f2620", border:"1px solid #374151", borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:12, color:C.txtM }}>
          Dead items are preserved for reporting but hidden from active views. This action can be undone by changing the status.
        </div>
        <Lbl c="ESTIMATOR NOTE * (required)"/>
        <textarea
          style={{ ...inp, height:90, resize:"vertical", fontSize:13, marginBottom:6 }}
          placeholder="Explain why this is being marked dead (e.g. customer cancelled, budget cut, project shelved)..."
          value={note}
          onChange={e=>setNote(e.target.value)}
          autoFocus
        />
        {err && <div style={{ fontSize:12, color:C.red, fontWeight:600, marginBottom:8 }}>⚠ {err}</div>}
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
          <button style={mkBtn("ghost")} onClick={onClose}>Cancel</button>
          <button style={{ ...mkBtn("danger"), background:"#1c1f26", color:"#9ca3af", border:"1px solid #374151" }} onClick={confirm}>Mark Dead</button>
        </div>
      </div>
    </div>
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
      <button style={{ ...mkBtn("blue"), ...s }} onClick={onReq}>Request For Quote</button>
      <button style={{ ...mkBtn("blue"), ...s }} onClick={onFromReq}>Pending Requests</button>
      <button style={{ ...mkBtn("blue"), ...s }} onClick={onNew}>+ New Estimate</button>
    </div>
  );
}

// ── MODALS ────────────────────────────────────────────────────────────────────
function RFQModal({ init, onSave, onClose, appUsers=[], custData={}, setCustData, jobs=[] }) {
  const blank = { id:uid(), rn:nextRN(), company:"", requester:"", email:"", phone:"", jobSite:"", desc:"", notes:"", date:today(), status:"New", salesAssoc:"" };
  const [f, setF] = useState(init || blank);
  const u = (k,v) => setF(x => ({ ...x, [k]:v }));

  // ── Customer / contact matching ──────────────────────────────────────────
  // All known company names: from custData keys + CUSTOMERS list + existing jobs
  const allCompanies = useMemo(() => {
    const fromCust = Object.keys(custData);
    const fromQuotes = [...new Set(jobs.map(q=>q.client).filter(Boolean))];
    return [...new Set([...CUSTOMERS, ...fromCust, ...fromQuotes])].sort();
  }, [custData, jobs]);

  // Contacts for the currently selected company
  const companyContacts = useMemo(() => {
    if(!f.company) return [];
    const data = custData[f.company];
    return data?.contacts || [];
  }, [f.company, custData]);

  // Does the company already exist?
  const companyExists = useMemo(() =>
    allCompanies.some(c=>c.toLowerCase()===f.company.toLowerCase()),
    [f.company, allCompanies]
  );
  const isNewCompany = f.company.trim() && !companyExists;

  // When company changes, clear contact fields (unless editing existing)
  const prevCompany = useRef(f.company);
  useEffect(() => {
    if(f.company !== prevCompany.current && !init) {
      setF(x=>({...x, requester:"", phone:"", email:"", jobSite:""}));
    }
    prevCompany.current = f.company;
  }, [f.company]);

  // Prefill from contact selection
  function applyContact(con) {
    setF(x=>({
      ...x,
      requester: con.name  || x.requester,
      phone:     con.phone || x.phone,
      email:     con.email || x.email,
    }));
  }

  // Save — also add new company to custData if needed
  function handleSave() {
    if(isNewCompany && setCustData) {
      // Add as new prospect
      const newEntry = {
        notes: "",
        contacts: f.requester ? [{ id:Date.now(), name:f.requester, phone:f.phone||"", email:f.email||"", primary:true, locationId:null, title:"" }] : [],
        locations: [],
        billingAddr: "", website: "", industry: "", paymentTerms: "", accountNum: ""
      };
      setCustData(prev=>({ ...prev, [f.company]: newEntry }));
    }
    onSave(f);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.35)", zIndex:300, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"20px 12px", overflowY:"auto" }}>
      <div style={{ background:C.sur, borderRadius:10, padding:20, width:"100%", maxWidth:580, boxShadow:"0 8px 28px rgba(0,0,0,.18)" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div><div style={{ fontSize:11, color:C.txtS, textTransform:"uppercase", letterSpacing:1 }}>Request For Quote</div><div style={{ fontSize:17, fontWeight:700 }}>{f.rn}</div></div>
          <button className="app-modal-close" onClick={onClose} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:C.txtS }}>×</button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>

          {/* Company with autocomplete */}
          <div style={{ gridColumn:"1/-1" }}>
            <Lbl c="COMPANY *"/>
            <AutoInput val={f.company} on={v=>u("company",v)} list={allCompanies} ph="Company name"/>
            {/* New company notice */}
            {isNewCompany && (
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:5, background:C.bluB, border:`1px solid ${C.bluBdr}`, borderRadius:5, padding:"5px 10px", fontSize:11, color:C.blue }}>
                <span style={{ fontSize:14 }}>➕</span>
                <span><strong>{f.company}</strong> is a new customer — will be added as a Prospect on save.</span>
              </div>
            )}
          </div>

          {/* Contact picker — only shown when company has existing contacts */}
          {companyContacts.length > 0 && (
            <div style={{ gridColumn:"1/-1" }}>
              <Lbl c="SELECT CONTACT (optional — prefills fields below)"/>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {companyContacts.map(con => (
                  <button
                    key={con.id}
                    onClick={()=>applyContact(con)}
                    style={{
                      background: f.requester===con.name ? C.accL : C.bg,
                      border: `1px solid ${f.requester===con.name ? C.accB : C.bdr}`,
                      borderRadius:6, padding:"6px 12px", fontSize:12, cursor:"pointer",
                      fontFamily:"inherit", color: f.requester===con.name ? C.acc : C.txt,
                      fontWeight: f.requester===con.name ? 700 : 400,
                      display:"flex", flexDirection:"column", alignItems:"flex-start", gap:1,
                      textAlign:"left",
                    }}>
                    <span style={{ fontWeight:700 }}>{con.name}</span>
                    {con.title && <span style={{ fontSize:10, color:C.txtS }}>{con.title}</span>}
                    {con.phone && <span style={{ fontSize:10, color:C.txtS }}>{con.phone}</span>}
                    {con.primary && <span style={{ fontSize:9, color:C.acc, fontWeight:700 }}>★ Primary</span>}
                  </button>
                ))}
              </div>
              <div style={{ fontSize:10, color:C.txtS, marginTop:4 }}>Click a contact to prefill requester, phone, and email. You can edit below.</div>
            </div>
          )}

          {/* Requester / Phone */}
          <div><Lbl c="REQUESTER *"/><input style={inp} value={f.requester} placeholder="Full name" onChange={e=>u("requester",e.target.value)}/></div>
          <div><Lbl c="PHONE"/><input style={inp} value={f.phone} placeholder="XXX-XXX-XXXX" onChange={e=>u("phone",e.target.value)}/></div>
          <div style={{ gridColumn:"1/-1" }}><Lbl c="EMAIL"/><input style={inp} value={f.email} placeholder="email@company.com" onChange={e=>u("email",e.target.value)}/></div>
          <div style={{ gridColumn:"1/-1" }}>
            <Lbl c="JOB SITE ADDRESS"/>
            {/* Suggest locations from custData */}
            {custData[f.company]?.locations?.length>0 ? (
              <>
                <select style={{ ...sel, width:"100%", marginBottom:4 }}
                  value={f.jobSite}
                  onChange={e=>u("jobSite",e.target.value)}>
                  <option value="">— Select a known location or type below —</option>
                  {custData[f.company].locations.map(l=>(
                    <option key={l.id} value={l.address||l.name}>{l.name}{l.address?" — "+l.address:""}</option>
                  ))}
                  <option value="__custom__">Enter custom address…</option>
                </select>
                {(f.jobSite==="" || f.jobSite==="__custom__") && (
                  <input style={inp} value={f.jobSite==="__custom__"?"":f.jobSite} placeholder="123 Main St, City, State ZIP" onChange={e=>u("jobSite",e.target.value)}/>
                )}
              </>
            ) : (
              <input style={inp} value={f.jobSite} placeholder="123 Main St, City, State ZIP" onChange={e=>u("jobSite",e.target.value)}/>
            )}
          </div>

          <div style={{ gridColumn:"1/-1" }}><Lbl c="JOB DESCRIPTION *"/><textarea style={{ ...inp, height:80, resize:"vertical" }} value={f.desc} onChange={e=>u("desc",e.target.value)}/></div>

          <div><Lbl c="STATUS"/><select style={{ ...sel, width:"100%" }} value={f.status} onChange={e=>u("status",e.target.value)}>{["New","In Progress","Quoted","Dead"].map(x=><option key={x}>{x}</option>)}</select></div>
          <div>
            <Lbl c="ESTIMATOR"/>
            <select style={{ ...sel, width:"100%" }} value={f.salesAssoc||""} onChange={e=>u("salesAssoc",e.target.value)}>
              <option value="">Unassigned</option>
              {appUsers.filter(u=>u.role==="estimator"||u.role==="manager").map(u=>(
                <option key={u.id} value={u.username}>{u.username} ({u.role})</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display:"flex", gap:8, marginTop:18, justifyContent:"flex-end" }}>
          <button style={mkBtn("ghost")} onClick={onClose}>Cancel</button>
          <button style={mkBtn("primary")} onClick={handleSave}>
            {isNewCompany ? "Save RFQ & Add Customer" : "Save RFQ"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClockBadge({ label, days, alertThresh }) {
  const alert = days > alertThresh;
  const color  = alert ? C.red : days > Math.floor(alertThresh * 0.6) ? C.yel : C.grn;
  const pct    = Math.min(days / (alertThresh * 2), 1);
  const r = 26, circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <div style={{ position:"relative", width:72, height:72 }}>
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke={C.bdr} strokeWidth="6"/>
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={circ / 4}
            strokeLinecap="round"
            style={{ transition:"all .4s" }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <div style={{ fontSize:14, fontWeight:800, color, lineHeight:1 }}>{days}</div>
          <div style={{ fontSize:8, color:C.txtS, fontWeight:600 }}>DAYS</div>
        </div>
      </div>
      <div style={{ fontSize:9, color:C.txtS, fontWeight:700, textTransform:"uppercase", textAlign:"center", lineHeight:1.2 }}>{label}</div>
    </div>
  );
}

function JobFolderModal({ rfq, folder, onSave, onClose, onMarkDead, onUpdateRfq, onCreateEstimate, appUsers=[], globalChecklist, onUpdateGlobalChecklist, linkedQuote=null, liftTonThreshold=10 }) {
  const today = new Date();
  const rfqDate = new Date(rfq.start_date || today);
  const daysSinceRfq = Math.floor((today - rfqDate) / 86400000);
  const blank = { estimatorNotes:"", timelines:[], stage:0, customChecks:globalChecklist.map(c=>({...c,checked:false})), lastActivity: rfq.start_date||today.toISOString().slice(0,10), attachments:[] };
  const init = folder || blank;
  const [estimatorNotes, setEstimatorNotes] = useState(init.estimatorNotes||"");
  const [timelines,      setTimelines]      = useState(init.timelines||[]);
  const [stage,          setStage]          = useState(init.stage??0);
  const [customChecks,   setCustomChecks]   = useState(init.customChecks?.length ? init.customChecks : globalChecklist.map(c=>({...c,checked:false})));
  const [attachments,    setAttachments]    = useState(init.attachments||[]);
  const [newTL, setNewTL] = useState({ date: today.toISOString().slice(0,10), note:"" });
  const fileInputRef = useRef();
  const lastActivityDate = new Date(init.lastActivity||rfq.start_date||today);
  const daysSinceActivity = Math.floor((today - lastActivityDate) / 86400000);
  const STAGES = ["RFQ Received","Client Contact","Viewed Job / Docs","Priced Materials / Rentals","Final Consult"];
  const stageColors = ["#b86b0a","#2563eb","#0d9488","#7c3aed","#16a34a"];
  const [editingRfq,  setEditingRfq]  = useState(false);
  const [rfqEdits,    setRfqEdits]    = useState({ requester:rfq.requester||"", phone:rfq.phone||"", email:rfq.email||"", jobSite:rfq.jobSite||"", desc:rfq.job_description||"", salesAssoc:rfq.salesAssoc||"", date:rfq.start_date||"" });
  const [promptInfo,  setPromptInfo]  = useState(null);
  const [mobilePage,  setMobilePage]  = useState(1);

  const applyProgress = () => {
    if (!promptInfo) return;
    setStage(promptInfo.newStage);
    if (promptInfo.note.trim()) {
      setTimelines(prev=>[...prev,{ id: uid(), date: promptInfo.date, note: promptInfo.note }]);
    }
    setPromptInfo(null);
  };
  const ue = (k,v) => setRfqEdits(p=>({...p,[k]:v}));
  const saveRfqEdits = () => { if(onUpdateRfq) onUpdateRfq({...rfq,...rfqEdits}); setEditingRfq(false); };
  const addTimeline = () => { if(!newTL.note.trim()) return; setTimelines(prev=>[...prev,{id:uid(),...newTL}]); setNewTL({date:today.toISOString().slice(0,10),note:""}); };
  const toggleCheck = (id) => setCustomChecks(prev=>prev.map(c=>c.id===id?{...c,checked:!c.checked}:c));
  const handleSave = () => onSave(rfq.id, { estimatorNotes, timelines, stage, customChecks, attachments, lastActivity: today.toISOString().slice(0,10) });

  const addAttachments = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setAttachments(prev=>[...prev,{ id:uid(), name:f.name, size:f.size, type:f.type, data:ev.target.result }]);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };

  const handlePrint = () => {
    const printDiv = document.getElementById("jfm-printable");
    if(!printDiv) return;
    const w = window.open("","_blank","width=900,height=700");
    w.document.write(`
      <html><head><title>Job Folder - ${rfq.company}</title>
      <style>
        @page { size: letter; margin: 0.5in; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1c1f26; margin:0; }
        .header { display:flex; justify-content:space-between; border-bottom:2px solid #b86b0a; padding-bottom:8px; margin-bottom:14px; }
        .h1 { font-size:18px; font-weight:800; } .h2 { font-size:11px; color:#4a5060; margin-top:3px; }
        .lbl { font-size:9px; font-weight:700; text-transform:uppercase; color:#8a93a2; letter-spacing:.8px; margin-bottom:3px; }
        .val { font-size:12px; font-weight:700; }
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
        .box { background:#f5f6f8; border:1px solid #e2e5ea; border-radius:6px; padding:8px 12px; }
        .stages { display:flex; margin:10px 0; }
        .stage-item { flex:1; text-align:center; font-size:9px; font-weight:700; }
        .stage-dot { width:22px; height:22px; border-radius:50%; margin:0 auto 4px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; color:#fff; }
        .checks { display:grid; grid-template-columns:repeat(2,1fr); gap:6px; margin:8px 0; }
        .check { display:flex; align-items:center; gap:6px; padding:6px 10px; border:1px solid #e2e5ea; border-radius:5px; font-size:11px; font-weight:600; }
        .check.done { background:#f0fdf4; border-color:#bbf7d0; color:#16a34a; }
        .timeline { display:flex; flex-direction:column; gap:4px; }
        .tl-row { display:flex; gap:10px; font-size:10px; }
        .tl-date { color:#8a93a2; white-space:nowrap; flex-shrink:0; }
        .section { margin-bottom:14px; }
        .section-title { font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#b86b0a; border-bottom:1px solid #e2e5ea; padding-bottom:4px; margin-bottom:8px; }
        .attach-grid { display:flex; flex-wrap:wrap; gap:8px; }
        .attach-item { font-size:10px; border:1px solid #e2e5ea; border-radius:4px; padding:4px 8px; background:#f9fafb; }
        img.thumb { width:80px; height:60px; object-fit:cover; border-radius:4px; border:1px solid #e2e5ea; }
      </style></head><body>
      ${printDiv.innerHTML}
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(()=>{ w.print(); w.close(); }, 400);
  };

  // Build hidden printable content
  const doneStamp = (i) => i < stage ? "" : (i===stage?"->":"");

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:500, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 12px", overflowY:"auto" }}>
      <div style={{ background:C.sur, borderRadius:12, width:"100%", maxWidth:920, boxShadow:"0 16px 48px rgba(0,0,0,.28)" }}>

        {/* MODAL HEADER */}
        <div style={{ padding:"16px 24px", borderBottom:`1px solid ${C.bdr}`, background:C.accL, borderTopLeftRadius:12, borderTopRightRadius:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:10, color:C.acc, textTransform:"uppercase", fontWeight:800, letterSpacing:1.2 }}>Job Folder — Estimator Prep Form</div>
            <div style={{ fontSize:18, fontWeight:700, marginTop:2 }}>{rfq.company}</div>
          </div>
          <div style={{ display:"flex", gap:16, alignItems:"center" }}>
            {/* Clock badges in top-right */}
            <ClockBadge label="Since RFQ"     days={daysSinceRfq}      alertThresh={7}/>
            <ClockBadge label="Since Activity" days={daysSinceActivity} alertThresh={3}/>
            <div style={{ width:1, height:40, background:C.bdr, margin:"0 4px" }}/>
            <button style={{ ...mkBtn("ghost"), padding:"5px 12px", fontSize:12 }} onClick={handlePrint}>Print</button>
            <button className="app-modal-close" onClick={onClose} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:C.txtS, lineHeight:1 }}>×</button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:20 }}>

          {/* Lift plan alert banner */}
          {linkedQuote && linkedQuote.liftPlanRequired && (
            <div style={{ background:C.yelB, border:`1px solid ${C.yelBdr}`, borderRadius:7, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:18 }}>⚠️</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:C.yel }}>Lift Plan Required</div>
                <div style={{ fontSize:11, color:C.yel }}>This job has a lift plan requirement{linkedQuote.maxLiftTons?" — max "+linkedQuote.maxLiftTons+" tons":""}.  Ensure documentation is in attachments before submission.</div>
              </div>
            </div>
          )}
          {linkedQuote && !linkedQuote.liftPlanRequired && linkedQuote.maxLiftTons && Number(linkedQuote.maxLiftTons)>liftTonThreshold && (
            <div style={{ background:C.redB, border:`1px solid ${C.redBdr}`, borderRadius:7, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:18 }}>🚨</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:C.red }}>Lift Plan Not Marked Required</div>
                <div style={{ fontSize:11, color:C.red }}>Job tonnage ({linkedQuote.maxLiftTons}T) exceeds the {liftTonThreshold}T threshold but Lift Plan Required is not checked on the estimate.</div>
              </div>
            </div>
          )}

          <style>{`
            @media (max-width: 950px) {
              .jfm-grid-responsive { grid-template-columns: 1fr !important; }
              .jfm-page-tabs { display: flex !important; }
              .jfm-hide-mobile { display: none !important; }
            }
          `}</style>

          <div className="jfm-page-tabs" style={{ display:"none", borderBottom:`1px solid ${C.bdr}`, marginBottom:16 }}>
            <button style={{ flex:1, padding:14, border:"none", background:mobilePage===1?C.sur:C.bg, color:mobilePage===1?C.acc:C.txtM, fontWeight:800, borderBottom:mobilePage===1?`3px solid ${C.acc}`:"none", cursor:"pointer", fontSize:12, textTransform:"uppercase" }} onClick={()=>setMobilePage(1)}>1. Details & Progress</button>
            <button style={{ flex:1, padding:14, border:"none", background:mobilePage===2?C.sur:C.bg, color:mobilePage===2?C.acc:C.txtM, fontWeight:800, borderBottom:mobilePage===2?`3px solid ${C.acc}`:"none", cursor:"pointer", fontSize:12, textTransform:"uppercase" }} onClick={()=>setMobilePage(2)}>2. Timeline & Files</button>
          </div>

          <div className={`jfm-page1 ${mobilePage!==1?"jfm-hide-mobile":""}`} style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {/* ROW 1: RFQ Info + Description side by side */}
          <div className="jfm-grid-responsive" style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:18 }}>
            {/* LEFT: RFQ Info — view or edit mode */}
            <div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ fontSize:9, color:C.acc, fontWeight:800, textTransform:"uppercase", letterSpacing:1 }}>RFQ Information</div>
                {!editingRfq
                  ? <button onClick={()=>setEditingRfq(true)} style={{ background:"none", border:`1px solid ${C.bdr}`, borderRadius:4, padding:"2px 8px", fontSize:10, color:C.txtS, cursor:"pointer", fontFamily:"inherit" }}>✏ Edit</button>
                  : <div style={{ display:"flex", gap:5 }}>
                      <button onClick={saveRfqEdits} style={{ ...mkBtn("primary"), padding:"2px 9px", fontSize:10 }}>Save</button>
                      <button onClick={()=>setEditingRfq(false)} style={{ ...mkBtn("ghost"), padding:"2px 8px", fontSize:10 }}>Cancel</button>
                    </div>
                }
              </div>

              {editingRfq ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[
                    { k:"Date",      field:"date",      type:"date"   },
                    { k:"Requester", field:"requester", type:"text"   },
                    { k:"Phone",     field:"phone",     type:"text"   },
                    { k:"Email",     field:"email",     type:"email"  },
                    { k:"Job Site",  field:"jobSite",   type:"text"   },
                  ].map(({k,field,type})=>(
                    <div key={field} style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <div style={{ fontSize:10, color:C.txtS, fontWeight:700, width:72, flexShrink:0 }}>{k}</div>
                      <input type={type} value={rfqEdits[field]||""} onChange={e=>ue(field,e.target.value)}
                        style={{ ...inp, fontSize:11, padding:"4px 7px", flex:1 }}/>
                    </div>
                  ))}
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <div style={{ fontSize:10, color:C.txtS, fontWeight:700, width:72, flexShrink:0 }}>Estimator</div>
                    <select value={rfqEdits.salesAssoc||""} onChange={e=>ue("salesAssoc",e.target.value)}
                      style={{ ...sel, flex:1, fontSize:11, padding:"4px 7px" }}>
                      <option value="">Unassigned</option>
                      {appUsers.filter(u=>u.role==="estimator"||u.role==="manager").map(u=>(
                        <option key={u.id} value={u.username}>{u.username}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display:"flex", gap:6, alignItems:"flex-start" }}>
                    <div style={{ fontSize:10, color:C.txtS, fontWeight:700, width:72, flexShrink:0, marginTop:5 }}>Description</div>
                    <textarea value={rfqEdits.desc||""} onChange={e=>ue("desc",e.target.value)}
                      style={{ ...inp, fontSize:11, padding:"4px 7px", flex:1, height:64, resize:"vertical" }}/>
                  </div>
                </div>
              ) : (
                <div>
                  {[
                    ["RFQ #",     rfq.rn],
                    ["Date",      rfq.start_date||"—"],
                    ["Requester", rfq.requester||"—"],
                    ["Phone",     rfq.phone||"—"],
                    ["Job Site",  rfq.jobSite||"—"],
                    ["Estimator", rfq.salesAssoc||"Unassigned"],
                  ].map(([k,v])=>(
                    <div key={k} style={{ display:"flex", gap:6, marginBottom:5, alignItems:"flex-start" }}>
                      <div style={{ fontSize:10, color:C.txtS, fontWeight:700, width:76, flexShrink:0 }}>{k}</div>
                      <div style={{ fontSize:11, color:C.txt, fontWeight:600, wordBreak:"break-word", flex:1 }}>
                        {k==="Phone" && v!=="—"
                          ? <a href={`tel:${v}`} style={{ color:C.blue, textDecoration:"none" }} onClick={e=>e.stopPropagation()}>{v}</a>
                          : v}
                      </div>
                    </div>
                  ))}
                  {/* Email requester button */}
                  {rfq.email && (
                    <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${C.bdr}` }}>
                      <a href={`mailto:${rfq.email}?subject=Re: ${encodeURIComponent(rfq.rn+" – "+rfq.company)}`}
                        onClick={e=>e.stopPropagation()}
                        style={{ display:"inline-flex", alignItems:"center", gap:6, background:C.blue, color:"#fff", borderRadius:6, padding:"5px 13px", fontSize:11, fontWeight:700, textDecoration:"none" }}>
                        ✉ Email {rfq.requester||"Requester"}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* RIGHT: Description — read-only in view mode, edit handled in left panel */}
            <div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"12px 14px" }}>
              <div style={{ fontSize:9, color:C.txtS, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Description</div>
              <div style={{ fontSize:13, color:C.txtM, lineHeight:1.7 }}>{editingRfq ? rfqEdits.desc||"No description." : rfq.job_description||"No description."}</div>
            </div>
          </div>

          {/* ROW 2: PROGRESS TRACKER */}
          <div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"14px 18px" }}>
            <div style={{ fontSize:9, color:C.txtS, fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:14 }}>Quote Progress — Click a stage to update</div>
            <div style={{ display:"flex" }}>
              {STAGES.map((s,i)=>{
                const done=i<stage; const active=i===stage; const color=stageColors[i];
                return (
                  <div key={s} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", position:"relative" }}>
                    {i>0 && <div style={{ position:"absolute", top:18, left:"-50%", right:"50%", height:3, background:done||active?stageColors[i-1]:C.bdr, zIndex:0 }}/>}
                    {i<STAGES.length-1 && <div style={{ position:"absolute", top:18, left:"50%", right:"-50%", height:3, background:done?color:C.bdr, zIndex:0 }}/>}
                    <button onClick={(e)=>{ e.stopPropagation(); setPromptInfo({ newStage: i, note: `Moved to stage: ${s}`, date: new Date().toISOString().slice(0, 10) }); }} title={s} style={{ width:36, height:36, borderRadius:"50%", border:`3px solid ${active||done?color:C.bdr}`, background:active||done?color:C.sur, color:active||done?"#fff":C.txtS, fontSize:13, fontWeight:800, cursor:"pointer", zIndex:1, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:active?`0 0 0 4px ${color}30`:"none", transition:"all .2s" }}>{done?"":i+1}</button>
                    <div style={{ fontSize:9, color:active?color:C.txtS, fontWeight:active?800:600, marginTop:6, textAlign:"center", lineHeight:1.2, maxWidth:80 }}>{s}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop:12, textAlign:"center", fontSize:12, color:C.txtM }}>
              Current: <strong style={{ color:stageColors[stage] }}>{STAGES[stage]}</strong>
            </div>
          </div>

          {/* ROW 3: CHECKLIST (under progress) */}
          <div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"12px 16px" }}>
            <div style={{ fontSize:9, color:C.txtS, fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>
              Custom Checklist <span style={{ fontWeight:400 }}>(labels editable in Settings)</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:8 }}>
              {customChecks.map(c=>(
                <label key={c.id} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"8px 12px", background:c.checked?C.grnB:C.sur, border:`1px solid ${c.checked?C.grnBdr:C.bdr}`, borderRadius:6, transition:"all .2s" }}>
                  <input type="checkbox" checked={c.checked} onChange={()=>toggleCheck(c.id)} style={{ width:15, height:15 }}/>
                  <span style={{ fontSize:13, fontWeight:600, color:c.checked?C.grn:C.txt, textDecoration:c.checked?"line-through":"none" }}>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
          </div>

          <div className={`jfm-page2 ${mobilePage!==2?"jfm-hide-mobile":""}`} style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {/* ROW 4: ESTIMATOR NOTES + TIMELINE */}
          <div className="jfm-grid-responsive" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
            {/* Notes */}
            <div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"12px 14px" }}>
              <div style={{ fontSize:9, color:C.txtS, fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Estimator Notes</div>
              <textarea style={{ ...inp, height:130, resize:"vertical", fontSize:13 }} placeholder="Job notes, observations, scope concerns, site details..." value={estimatorNotes} onChange={e=>setEstimatorNotes(e.target.value)}/>
            </div>
            {/* Timeline */}
            <div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"12px 14px" }}>
              <div style={{ fontSize:9, color:C.txtS, fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Activity Timeline</div>
              <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                <input type="date" style={{ ...inp, width:132, fontSize:12 }} value={newTL.date} onChange={e=>setNewTL(p=>({...p,date:e.target.value}))}/>
                <input style={{ ...inp, flex:1, fontSize:12 }} placeholder="Activity note..." value={newTL.note} onChange={e=>setNewTL(p=>({...p,note:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addTimeline()}/>
                <button style={{ ...mkBtn("blue"), padding:"0 10px" }} onClick={addTimeline}>+</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5, maxHeight:130, overflowY:"auto" }}>
                {timelines.length===0 && <div style={{ fontSize:12, color:C.txtS }}>No entries yet.</div>}
                {[...timelines].reverse().map(t=>(
                  <div key={t.id} style={{ display:"flex", gap:8, alignItems:"flex-start", fontSize:12, padding:"5px 8px", background:C.sur, borderRadius:5, border:`1px solid ${C.bdr}` }}>
                    <span style={{ color:C.txtS, whiteSpace:"nowrap", flexShrink:0 }}>{t.date}</span>
                    <span style={{ color:C.txt, flex:1 }}>{t.note}</span>
                    <button style={{ background:"none", border:"none", color:C.red, fontSize:13, cursor:"pointer", flexShrink:0 }} onClick={()=>setTimelines(p=>p.filter(x=>x.id!==t.id))}>×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 5: ATTACHMENTS */}
          <div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"12px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:9, color:C.txtS, fontWeight:800, textTransform:"uppercase", letterSpacing:1 }}>Attachments — Photos &amp; Documents</div>
              <button style={{ ...mkBtn("blue"), padding:"4px 10px", fontSize:11 }} onClick={()=>fileInputRef.current.click()}>+ Add Files</button>
              <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" style={{ display:"none" }} onChange={addAttachments}/>
            </div>
            {attachments.length===0 ? (
              <div style={{ textAlign:"center", padding:"18px 0", color:C.txtS, fontSize:12, border:`1px dashed ${C.bdrM}`, borderRadius:6 }}>
                No attachments yet. Click "+ Add Files" to attach photos or documents.
              </div>
            ) : (
              <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                {attachments.map(a=>(
                  <div key={a.id} style={{ position:"relative", border:`1px solid ${C.bdr}`, borderRadius:6, overflow:"hidden", background:C.sur }}>
                    {a.type?.startsWith("image/") ? (
                      <img src={a.data} alt={a.name} style={{ width:90, height:70, objectFit:"cover", display:"block" }}/>
                    ) : (
                      <div style={{ width:90, height:70, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontSize:24 }}>
                        <div style={{ fontSize:9, color:C.txtS, marginTop:2, textAlign:"center", padding:"0 4px", wordBreak:"break-all" }}>{a.name.slice(0,14)}</div>
                      </div>
                    )}
                    <button style={{ position:"absolute", top:2, right:2, background:"rgba(0,0,0,.45)", border:"none", color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }} onClick={()=>setAttachments(p=>p.filter(x=>x.id!==a.id))}>×</button>
                    <div style={{ padding:"3px 6px", fontSize:9, color:C.txtS, background:C.bg, maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          </div>

          {promptInfo && (
            <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding: 20 }} onClick={()=>setPromptInfo(null)}>
              <div style={{ background:C.sur, borderRadius:8, padding:20, width:400, maxWidth:"100%", boxShadow:"0 16px 48px rgba(0,0,0,.28)", display:"flex", flexDirection:"column" }} onClick={e=>e.stopPropagation()}>
                <div style={{ fontSize:15, fontWeight:700, color:C.txt, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Update Quote Progress</div>
                <div style={{ fontSize:13, color:C.txtM, marginBottom:16 }}>Please enter an activity note for this progress update:</div>
                
                <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                  <input type="date" style={{ ...inp, width:132, fontSize:13 }} value={promptInfo.date} onChange={e=>setPromptInfo({...promptInfo, date:e.target.value})} />
                  <input style={{ ...inp, flex:1, fontSize:13 }} autoFocus value={promptInfo.note} onChange={e=>setPromptInfo({...promptInfo, note:e.target.value})} onKeyDown={e=>{ if (e.key==="Enter") applyProgress(); }} />
                </div>
                
                <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:10 }}>
                  <button style={{ ...mkBtn("ghost"), padding:"7px 12px" }} onClick={()=>setPromptInfo(null)}>Cancel</button>
                  <button style={{ ...mkBtn("primary"), padding:"7px 12px" }} onClick={applyProgress}>Save Progress</button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* HIDDEN PRINT AREA */}
        <div id="jfm-printable" style={{ display:"none" }}>
          <div class="header">
            <div><div class="h1">Job Folder — {rfq.company}</div><div class="h2">{rfq.rn} · {rfq.jobSite||"No site"} · {rfq.start_date||""}{rfq.salesAssoc?` · Sales: ${rfq.salesAssoc}`:""}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:"10px",color:"#8a93a2"}}>Printed: {today.toLocaleDateString()}</div><div style={{fontSize:"10px",color:"#8a93a2"}}>Days since RFQ: {daysSinceRfq}</div></div>
          </div>
          <div class="grid2">
            <div>
              <div class="section"><div class="section-title">RFQ Information</div>
                <div class="grid3">
                  {[["Requester",rfq.requester||"—"],["Phone",rfq.phone||"—"],["Job Site",rfq.jobSite||"—"]].map(([k,v])=>(
                    <div class="box" key={k}><div class="lbl">{k}</div><div class="val">{v}</div></div>
                  ))}
                </div>
                <div style={{marginTop:"8px"}} class="box"><div class="lbl">Description</div><div class="val" style={{fontWeight:400,fontSize:"11px",lineHeight:"1.5"}}>{rfq.job_description||"—"}</div></div>
              </div>
              <div class="section"><div class="section-title">Custom Checklist</div>
                <div class="checks">
                  {customChecks.map(c=>(<div key={c.id} class={`check${c.checked?" done":""}`}>{c.checked?"☑":"☐"} {c.label}</div>))}
                </div>
              </div>
            </div>
            <div>
              <div class="section"><div class="section-title">Estimator Notes</div>
                <div class="box" style={{minHeight:"60px",fontSize:"11px",lineHeight:"1.5"}}>{estimatorNotes||"—"}</div>
              </div>
              <div class="section"><div class="section-title">Timeline</div>
                <div class="timeline">
                  {timelines.length===0?<div style={{color:"#8a93a2",fontSize:"10px"}}>No entries</div>:timelines.map(t=>(<div key={t.id} class="tl-row"><span class="tl-date">{t.date}</span><span>{t.note}</span></div>))}
                </div>
              </div>
            </div>
          </div>
          <div class="section"><div class="section-title">Quote Progress</div>
            <div class="stages">
              {STAGES.map((s,i)=>{ const color=stageColors[i]; const done=i<stage; const active=i===stage;
                return (<div key={s} class="stage-item"><div class="stage-dot" style={{background:done||active?color:"#e2e5ea"}}>{done?"":(active?"->":i+1)}</div>{s}</div>);
              })}
            </div>
          </div>
          {attachments.filter(a=>a.type?.startsWith("image/")).length>0&&(
            <div class="section"><div class="section-title">Attachments</div>
              <div class="attach-grid">
                {attachments.filter(a=>a.type?.startsWith("image/")).map(a=>(<img key={a.id} src={a.data} alt={a.name} class="thumb" title={a.name}/>))}
                {attachments.filter(a=>!a.type?.startsWith("image/")).map(a=>(<div key={a.id} class="attach-item">{a.name}</div>))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${C.bdr}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:C.bg, borderBottomLeftRadius:12, borderBottomRightRadius:12, flexWrap:"wrap", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ fontSize:12, color:C.txtS }}>Last saved: {init.lastActivity||"Never"}</div>
            {rfq.status!=="Dead" && onMarkDead && (
              <button
                style={{ background:"#1c1f26", color:"#9ca3af", border:"1px solid #374151", borderRadius:6, padding:"5px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}
                onClick={()=>onMarkDead(rfq)}>
                💀 Mark RFQ Dead
              </button>
            )}
            {rfq.status==="Dead" && (
              <span style={{ fontSize:11, color:"#9ca3af", fontStyle:"italic" }}>💀 This RFQ is Dead</span>
            )}
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {/* Show assigned job number if linked quote is Won */}
            {linkedQuote?.jobNum && (
              <div style={{ display:"flex", alignItems:"center", gap:6, background:C.grnB, border:`1px solid ${C.grnBdr}`, borderRadius:6, padding:"5px 10px", fontSize:12, color:C.grn, fontWeight:700 }}>
                🏗 Job #{linkedQuote.jobNum}
              </div>
            )}
            {/* Create Estimate button — only if no estimate yet */}
            {!linkedQuote && onCreateEstimate && rfq.status!=="Dead" && (
              <button style={{ ...mkBtn("blue"), padding:"5px 14px", fontSize:12 }} onClick={()=>{ handleSave(); onCreateEstimate(rfq); }}>
                Create Estimate →
              </button>
            )}
            {linkedQuote && (
              <div style={{ fontSize:11, color:C.grn, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                ✓ Estimate {linkedQuote.qn}
              </div>
            )}
            <button style={mkBtn("ghost")} onClick={onClose}>Discard</button>
            <button style={mkBtn("primary")} onClick={handleSave}>Save Job Folder</button>
          </div>
        </div>

      </div>
    </div>
  );
}


// ── DISCOUNT MODAL ───────────────────────────────────────────────────────────
function DiscountModal({ quoteTotal, onSave, onClose }) {
  const [type,    setType]    = useState("pct");   // "pct" | "cash"
  const [amount,  setAmount]  = useState("");
  const [reason,  setReason]  = useState("");
  const [err,     setErr]     = useState("");

  const discAmt = type==="pct"
    ? quoteTotal * (Number(amount)||0) / 100
    : Number(amount)||0;
  const finalAmt = quoteTotal - discAmt;

  function confirm() {
    if(!amount || Number(amount)<=0) { setErr("Enter a discount amount."); return; }
    if(type==="pct" && Number(amount)>100) { setErr("Percentage cannot exceed 100%."); return; }
    if(type==="cash" && discAmt>quoteTotal) { setErr("Cash discount cannot exceed the quote total."); return; }
    if(!reason.trim()) { setErr("An estimator explanation is required."); return; }
    onSave({ id:uid(), type, amount:Number(amount), discAmt, reason:reason.trim(), date:new Date().toISOString().slice(0,10) });
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.sur, borderRadius:10, padding:24, width:"100%", maxWidth:480, boxShadow:"0 8px 32px rgba(0,0,0,.28)" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <div style={{ width:38, height:38, borderRadius:"50%", background:"#ecfdf5", border:"2px solid #86efac", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🏷</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>Apply Discount</div>
            <div style={{ fontSize:12, color:C.txtS }}>Current estimate total: {fmt(quoteTotal)}</div>
          </div>
        </div>

        {/* Type toggle */}
        <div style={{ display:"flex", gap:3, background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:7, padding:3, marginBottom:14 }}>
          {[["pct","% Percentage"],["cash","$ Cash Amount"]].map(([v,l])=>(
            <button key={v} onClick={()=>{ setType(v); setAmount(""); setErr(""); }}
              style={{ flex:1, background:type===v?C.grn:"transparent", color:type===v?"#fff":C.txtM, border:"none", borderRadius:5, padding:"6px 0", fontSize:13, fontWeight:type===v?700:400, cursor:"pointer", fontFamily:"inherit" }}>
              {l}
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div style={{ marginBottom:12 }}>
          <Lbl c={type==="pct" ? "DISCOUNT PERCENTAGE" : "DISCOUNT AMOUNT ($)"}/>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ position:"relative", flex:1 }}>
              {type==="cash" && <span style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", fontSize:14, color:C.txtS, fontWeight:600 }}>$</span>}
              <input
                type="number" min={0} max={type==="pct"?100:undefined} step={type==="pct"?0.5:1}
                value={amount} onChange={e=>{ setAmount(e.target.value); setErr(""); }}
                placeholder={type==="pct"?"e.g. 5":"e.g. 500"}
                autoFocus
                style={{ ...inp, paddingLeft:type==="cash"?24:9, fontSize:16, fontWeight:700 }}
              />
            </div>
            {type==="pct" && <span style={{ fontSize:16, fontWeight:700, color:C.txtM }}>%</span>}
          </div>
        </div>

        {/* Live preview */}
        {Number(amount)>0 && (
          <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"10px 14px", marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:10, color:C.grn, fontWeight:700, textTransform:"uppercase", letterSpacing:.5 }}>Discount Amount</div>
              <div style={{ fontSize:22, fontWeight:800, color:C.red }}>− {fmt(discAmt)}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:10, color:C.grn, fontWeight:700, textTransform:"uppercase", letterSpacing:.5 }}>Discounted Total</div>
              <div style={{ fontSize:22, fontWeight:800, color:C.grn }}>{fmt(Math.max(0,finalAmt))}</div>
            </div>
          </div>
        )}

        {/* Estimator explanation */}
        <div style={{ marginBottom:8 }}>
          <Lbl c="ESTIMATOR EXPLANATION * (required)"/>
          <textarea
            style={{ ...inp, height:80, resize:"vertical", fontSize:13 }}
            placeholder="Reason for discount — e.g. repeat customer, competitive bid, early payment, project scope change…"
            value={reason} onChange={e=>{ setReason(e.target.value); setErr(""); }}
          />
        </div>

        {err && <div style={{ fontSize:12, color:C.red, fontWeight:600, marginBottom:8 }}>⚠ {err}</div>}

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
          <button style={mkBtn("ghost")} onClick={onClose}>Cancel</button>
          <button style={{ ...mkBtn("primary"), background:C.grn, borderColor:C.grn }} onClick={confirm}>Apply Discount</button>
        </div>
      </div>
    </div>
  );
}

// ── CUSTOMER DOCUMENT MODAL ──────────────────────────────────────────────────
function CustomerDocModal({ quote, onClose }) {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
  const [workScope,   setWorkScope]   = useState(quote.desc || "");
  const [bullets,     setBullets]     = useState([""]);
  const [generating,  setGenerating]  = useState(false);
  const [genError,    setGenError]    = useState("");

  function addBullet()      { setBullets(b=>[...b,""]); }
  function removeBullet(i)  { setBullets(b=>b.filter((_,j)=>j!==i)); }
  function updateBullet(i,v){ setBullets(b=>b.map((x,j)=>j===i?v:x)); }

  async function generate() {
    const filled = bullets.filter(b=>b.trim());
    if(!workScope.trim())  { setGenError("Work scope is required."); return; }
    if(filled.length===0)  { setGenError("Add at least one bullet point."); return; }
    setGenError("");
    setGenerating(true);

    try {
      // Build document data payload and send to the Anthropic API to generate a Node.js script,
      // then trigger a download
      const docData = {
        date: dateStr,
        customerName: quote.contactName || quote.client,
        customerAddress: "",
        customerEmail: quote.contactEmail || "",
        customerPhone: quote.contactPhone || "",
        jobSite: quote.jobSite || "",
        workScope: workScope.trim(),
        bullets: filled,
        total: quote.total || 0,
        estimatorName: quote.salesAssoc || "Scott DeMuesy",
        quoteNum: quote.qn,
      };

      // Call Local Llama over OpenAI-like API to generate the docx as base64
      const resp = await fetch("http://localhost:8080/v1/chat/completions", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"llama-3.1-8b-instruct",
          max_tokens:4000,
          temperature: 0.1,
          messages:[{
            role:"system",
            content: "You are an expert Node.js developer. You must return ONLY the raw Node.js script. Do not output markdown boundaries, explanations, or any other text."
          }, {
            role:"user",
            content: `Generate a complete self-contained Node.js script using the 'docx' npm package (already installed globally) that creates a professional customer proposal document matching the Shoemaker Rigging style. The script must:

1. Require docx from 'docx' 
2. Create a document with these sections matching the example PDF style:
   - Orange header bar at top with date right-aligned: "${docData.date}"
   - Customer info block (left): "${docData.customerName}", address, email/phone
   - Company logo placeholder text right: "SHOEMAKER RIGGING & TRANSPORT"
   - Body text: "Shoemaker Rigging is pleased to provide pricing for the following work:"
   - Bold work scope line: "Work Scope: ${docData.workScope}"
   - Bullet points (bold): ${JSON.stringify(docData.bullets)}
   - Standard boilerplate paragraph (bold): "This project is based upon the scope of work listed above. Any work beyond this scope must be approved, in writing, and signed by the owner or their designated representative. Clear access for cranes, equipment, and labor to all working areas is required. Removal of any obstruction is the responsibility of the owner. It is assumed that all aprons, driveways, hard-surfaced areas and plant floors are adequate for the necessary loads - static or moving - for all machinery and equipment used on this project. Delays due to non-Shoemaker Rigging arranged transportation could incur additional charges."
   - Total price line centered: "Total Price…………………………………………………………………………. $${Number(docData.total).toLocaleString()}.00"
   - Terms: "Terms: Net 30 days. Proposal good for 60 days."
   - Thank you line
   - Regards, then estimator block: "${docData.estimatorName}", "Shoemaker Rigging & Transport, LLC", "3385 Miller Park Rd", "Akron, Ohio 44312", "330-899-9090 phone", "330-899-1077 fax", "Scott.demuesy@shoemakerrigging.com"
   - Confidentiality Statement section at bottom (small text)
   - Orange footer bar at bottom
3. Use US Letter page (12240x15840 DXA), 1 inch margins
4. Orange color: B86B0A for header/accents
5. Save to /tmp/customer_proposal.docx
6. At the END of the script, read the file and console.log ONLY the base64 encoded content with no other output, no JSON wrapper, just raw base64

Output ONLY the complete Node.js script, no markdown, no explanation, nothing else.`
          }]
        })
      });
      const data = await resp.json();
      const scriptCode = data.choices?.[0]?.message?.content || "";

      if(!scriptCode || scriptCode.length < 100) {
        setGenError("Failed to generate document code. Please try again.");
        setGenerating(false);
        return;
      }

      // Write script to a blob URL and execute via the Anthropic tool infrastructure
      // Since we can't exec Node directly from browser, we'll use a download-trigger approach:
      // Create the docx client-side using the docx library loaded via CDN
      await generateDocxClientSide(docData, filled);

    } catch(e) {
      setGenError("Error: " + e.message);
    }
    setGenerating(false);
  }

  async function generateDocxClientSide(docData, filled) {
    // Load docx from CDN if not already loaded
    if(!window.docx) {
      await new Promise((res,rej)=>{
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/docx/8.2.3/docx.umd.min.js";
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
            WidthType, ShadingType, Table, TableRow, TableCell, LevelFormat,
            Header, Footer, TabStopType, TabStopPosition } = window.docx;

    const ORANGE = "B86B0A";
    const DARK   = "1C1F26";
    const MID    = "4A5060";
    const WHITE  = "FFFFFF";

    const bdr1 = { style: BorderStyle.SINGLE, size: 1, color: "E2E5EA" };
    const noBdr = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const noBorders = { top:noBdr, bottom:noBdr, left:noBdr, right:noBdr };

    const doc = new Document({
      numbering: {
        config: [{
          reference: "bullets",
          levels: [{
            level: 0, format: LevelFormat.BULLET, text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } }, run: { font:"Arial", size:24, bold:true } }
          }]
        }]
      },
      sections: [{
        properties: {
          page: {
            size: { width:12240, height:15840 },
            margin: { top:720, right:1260, bottom:720, left:1260 }
          }
        },
        children: [
          // ── Orange header bar ──
          new Table({
            width:{ size:9720, type:WidthType.DXA },
            columnWidths:[9720],
            rows:[new TableRow({ children:[new TableCell({
              borders:{ top:noBdr, bottom:noBdr, left:noBdr, right:noBdr },
              shading:{ fill:ORANGE, type:ShadingType.CLEAR },
              margins:{ top:160, bottom:160, left:240, right:240 },
              children:[new Paragraph({
                alignment: AlignmentType.RIGHT,
                children:[new TextRun({ text:docData.date, font:"Arial", size:22, bold:true, color:WHITE })]
              })]
            })]})],
          }),

          new Paragraph({ spacing:{ after:200 }, children:[new TextRun({ text:"", size:22 })] }),

          // ── Customer info (left) + Company (right) ──
          new Table({
            width:{ size:9720, type:WidthType.DXA },
            columnWidths:[5400, 4320],
            rows:[new TableRow({ children:[
              new TableCell({
                borders:noBorders,
                width:{ size:5400, type:WidthType.DXA },
                margins:{ top:0, bottom:0, left:0, right:240 },
                children:[
                  new Paragraph({ spacing:{after:40}, children:[new TextRun({ text:docData.customerName, font:"Arial", size:26, bold:true, color:DARK })] }),
                  ...(docData.customerAddress?[new Paragraph({ spacing:{after:40}, children:[new TextRun({ text:docData.customerAddress, font:"Arial", size:24, bold:true, color:DARK })] })]:[]),
                  ...(docData.jobSite?[new Paragraph({ spacing:{after:40}, children:[new TextRun({ text:docData.jobSite, font:"Arial", size:24, bold:true, color:DARK })] })]:[]),
                  new Paragraph({ spacing:{after:40}, children:[new TextRun({ text:(docData.customerEmail||"")+(docData.customerPhone?" / "+docData.customerPhone:""), font:"Arial", size:24, bold:true, color:DARK })] }),
                ]
              }),
              new TableCell({
                borders:noBorders,
                width:{ size:4320, type:WidthType.DXA },
                margins:{ top:0, bottom:0, left:240, right:0 },
                children:[
                  new Paragraph({ alignment:AlignmentType.RIGHT, spacing:{after:40}, children:[new TextRun({ text:"SHOEMAKER", font:"Arial", size:32, bold:true, color:ORANGE })] }),
                  new Paragraph({ alignment:AlignmentType.RIGHT, spacing:{after:40}, children:[new TextRun({ text:"RIGGING & TRANSPORT", font:"Arial", size:20, bold:true, color:DARK })] }),
                  new Paragraph({ alignment:AlignmentType.RIGHT, spacing:{after:40}, children:[new TextRun({ text:"WE RIG IT. MOVE IT. SET IT.", font:"Arial", size:16, italics:true, color:MID })] }),
                ]
              }),
            ]})],
          }),

          new Paragraph({ spacing:{after:240}, children:[new TextRun({ text:"", size:22 })] }),

          // ── Intro ──
          new Paragraph({ spacing:{after:160}, children:[new TextRun({ text:"Shoemaker Rigging is pleased to provide pricing for the following work:", font:"Arial", size:22, color:DARK })] }),

          // ── Work scope ──
          new Paragraph({ spacing:{after:160}, children:[new TextRun({ text:"Work Scope:  "+docData.workScope, font:"Arial", size:24, bold:true, color:DARK })] }),

          // ── Bullets ──
          ...filled.map(b => new Paragraph({
            numbering:{ reference:"bullets", level:0 },
            spacing:{ after:80 },
            children:[new TextRun({ text:b, font:"Arial", size:24, bold:true, color:DARK })]
          })),

          new Paragraph({ spacing:{after:200}, children:[new TextRun({ text:"", size:22 })] }),

          // ── Boilerplate ──
          new Paragraph({
            spacing:{ after:240 },
            children:[new TextRun({
              text:"This project is based upon the scope of work listed above. Any work beyond this scope must be approved, in writing, and signed by the owner or their designated representative. Clear access for cranes, equipment, and labor to all working areas is required. Removal of any obstruction is the responsibility of the owner. It is assumed that all aprons, driveways, hard-surfaced areas and plant floors are adequate for the necessary loads - static or moving - for all machinery and equipment used on this project. Delays due to non-Shoemaker Rigging arranged transportation could incur additional charges.",
              font:"Arial", size:22, bold:true, color:DARK
            })]
          }),

          // ── Total price ──
          new Paragraph({
            alignment:AlignmentType.CENTER,
            spacing:{ after:160 },
            children:[new TextRun({ text:"Total Price…………………………………………………………………………… $"+Number(docData.total).toLocaleString()+".00", font:"Arial", size:26, bold:true, color:DARK })]
          }),

          new Paragraph({ spacing:{after:160}, children:[new TextRun({ text:"", size:22 })] }),

          // ── Terms ──
          new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:80}, children:[new TextRun({ text:"Terms: Net 30 days. Proposal good for 60 days.", font:"Arial", size:20, color:MID, italics:true })] }),

          new Paragraph({ spacing:{after:160}, children:[new TextRun({ text:"", size:22 })] }),

          // ── Thank you ──
          new Paragraph({ spacing:{after:240}, children:[new TextRun({ text:"Thank you for the opportunity to work with your company, we appreciate the opportunity.", font:"Arial", size:22, color:DARK })] }),

          // ── Regards ──
          new Paragraph({ spacing:{after:80}, children:[new TextRun({ text:"Regards,", font:"Arial", size:22, color:DARK })] }),
          new Paragraph({ spacing:{after:40}, children:[new TextRun({ text:"", size:22 })] }),
          ...[
            docData.estimatorName,
            "Shoemaker Rigging & Transport, LLC",
            "3385 Miller Park Rd",
            "Akron, Ohio 44312",
            "330-899-9090 phone",
            "330-899-1077 fax",
            "Scott.demuesy@shoemakerrigging.com"
          ].map(line => new Paragraph({ spacing:{after:40}, children:[new TextRun({ text:line, font:"Arial", size:22, bold:line.includes("Shoemaker")||line===docData.estimatorName, color:DARK })] })),

          new Paragraph({ spacing:{after:160}, children:[new TextRun({ text:"", size:22 })] }),

          // ── Confidentiality ──
          new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:60}, children:[new TextRun({ text:"Confidentiality Statement:", font:"Arial", size:16, bold:true, color:MID })] }),
          new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:240}, children:[new TextRun({ text:"The information embodied in this document provided are intended for the person named on the cover page, and is strictly confidential and shall not be duplicated or used for any purposes other than that for which it is being provided. This documentation is supplied on the understanding that it will be held confidentially and not disclosed to third parties without the prior written consent of S. Gary Shoemaker Rigging & Transport, LLC d.b.a Shoemaker Rigging.", font:"Arial", size:14, color:MID })] }),

          // ── Orange footer bar ──
          new Table({
            width:{ size:9720, type:WidthType.DXA },
            columnWidths:[9720],
            rows:[new TableRow({ children:[new TableCell({
              borders:noBorders,
              shading:{ fill:ORANGE, type:ShadingType.CLEAR },
              margins:{ top:160, bottom:160, left:240, right:240 },
              children:[new Paragraph({ children:[new TextRun({ text:" ", font:"Arial", size:22 })] })]
            })]})],
          }),
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], { type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (quote.client||"Customer").replace(/[^a-zA-Z0-9]/g,"_")+"_Proposal_"+quote.qn+".docx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:600, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 12px", overflowY:"auto" }}>
      <div style={{ background:C.sur, borderRadius:12, width:"100%", maxWidth:680, boxShadow:"0 16px 48px rgba(0,0,0,.28)" }}>

        {/* Header */}
        <div style={{ padding:"16px 24px", borderBottom:`1px solid ${C.bdr}`, background:C.accL, borderTopLeftRadius:12, borderTopRightRadius:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:10, color:C.acc, fontWeight:800, textTransform:"uppercase", letterSpacing:1 }}>Customer Document</div>
            <div style={{ fontSize:17, fontWeight:700, marginTop:2 }}>{quote.client} — {quote.qn}</div>
            <div style={{ fontSize:12, color:C.txtS, marginTop:1 }}>Creates a formatted Word proposal document</div>
          </div>
          <button className="app-modal-close" onClick={onClose} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:C.txtS }}>×</button>
        </div>

        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 }}>

          {/* Preview info block */}
          <div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"10px 14px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:12 }}>
            {[
              ["Date",      today.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})],
              ["Quote #",   quote.qn],
              ["Customer",  quote.client],
              ["Total",     "$"+Math.round(quote.total||0).toLocaleString()],
              ["Contact",   quote.contactName||"—"],
              ["Estimator", quote.salesAssoc||"Scott DeMuesy"],
            ].map(([k,v])=>(
              <div key={k}><span style={{ color:C.txtS, fontWeight:600 }}>{k}: </span><span style={{ color:C.txt }}>{v}</span></div>
            ))}
          </div>

          {/* Work Scope */}
          <div>
            <Lbl c="WORK SCOPE HEADING *"/>
            <input
              style={{ ...inp, fontSize:13 }}
              placeholder='e.g. "Load and transport machine in Akron, Ohio."'
              value={workScope}
              onChange={e=>{ setWorkScope(e.target.value); setGenError(""); }}
            />
            <div style={{ fontSize:11, color:C.txtS, marginTop:3 }}>This appears as the bold "Work Scope:" line in the document.</div>
          </div>

          {/* Bullet Points */}
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <Lbl c="SCOPE BULLET POINTS *"/>
              <button style={{ ...mkBtn("outline"), fontSize:11, padding:"3px 10px" }} onClick={addBullet}>+ Add Point</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {bullets.map((b,i)=>(
                <div key={i} style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <span style={{ fontSize:16, color:C.acc, fontWeight:700, flexShrink:0 }}>•</span>
                  <input
                    style={{ ...inp, flex:1, fontSize:13 }}
                    placeholder={`Bullet point ${i+1}…`}
                    value={b}
                    onChange={e=>{ updateBullet(i,e.target.value); setGenError(""); }}
                    autoFocus={i===bullets.length-1 && i>0}
                  />
                  {bullets.length>1 && (
                    <button onClick={()=>removeBullet(i)} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 3px", flexShrink:0 }}>×</button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ fontSize:11, color:C.txtS, marginTop:4 }}>These are the bold bulleted items that describe the work in detail.</div>
          </div>

          {genError && <div style={{ fontSize:12, color:C.red, fontWeight:600 }}>⚠ {genError}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${C.bdr}`, background:C.bg, borderBottomLeftRadius:12, borderBottomRightRadius:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:11, color:C.txtS }}>Document saves as .docx Word file</div>
          <div style={{ display:"flex", gap:8 }}>
            <button style={mkBtn("ghost")} onClick={onClose}>Cancel</button>
            <button
              style={{ ...mkBtn("primary"), padding:"8px 18px", opacity:generating?0.7:1 }}
              onClick={generate}
              disabled={generating}>
              {generating ? "⏳ Generating…" : "📄 Create Word Document"}
            </button>
          </div>
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
                {sign==="+"?"Increases":"Decreases"} total by ${Math.round(Number(amount)).toLocaleString()} {"→"}{" "}
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

function SearchResultsModal({ search, jobs, reqs, custData, onClose, onOpenQuote, onOpenReq, onOpenCust }) {
  const q = search.toLowerCase().trim();
  
  const results = useMemo(() => {
    if (!q) return [];
    const res = [];
    
    // Quotes
    jobs.forEach(quote => {
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
        req.job_description,                // Description
        req.notes                // Additional Notes
      ].some(s => s?.toLowerCase().includes(q));
      
      if (match) res.push({ type: 'RFQ', data: req, label: req.rn, sub: req.company, desc: `${req.job_description || req.notes} @ ${req.jobSite}` });
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
  }, [q, jobs, reqs, custData]);

  const T_COLORS = { Quote: C.acc, RFQ: C.blue, Customer: C.purp };

  return (
    <div className="app-modal-overlay" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:800, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"40px 16px", overflowY:"auto" }}>
      <div className="app-modal-panel" style={{ background:C.sur, borderRadius:12, width:"100%", maxWidth:640, boxShadow:"0 12px 40px rgba(0,0,0,.25)", display:"flex", flexDirection:"column", maxHeight:"85vh" }}>
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
                    {r.type === 'Quote' ? '📋' : r.type === 'RFQ' ? '📥' : '🏢'}
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
        
        <div className="app-modal-actions" style={{ padding:14, borderTop:`1px solid ${C.bdr}`, background:C.bg, borderBottomLeftRadius:12, borderBottomRightRadius:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
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
  const [editRow, setEditRow] = useState(null); // { code, name, capacity, daily_rate, daily_cost, category } — original
  const [editVal, setEditVal] = useState({});    // live field values while editing

  // ── Add new equipment state ────────────────────────────────────────────────
  const [showAdd,  setShowAdd]  = useState(false);
  const [newEquip, setNewEquip] = useState({ code:"", category:"Forklift", name:"", capacity:"—", daily_rate:0, daily_cost:0 });
  const [addError, setAddError] = useState("");

  const KNOWN_CATS = [...new Set([...eqCats, "Forklift","Aerial Lift","Crane","Misc","Tools","Truck"])];

  // ── Rate override helpers (original behaviour) ────────────────────────────
  const startOv = code => { const o=eqOv[code]; setEc(code); setEv(o?o.daily:(eqMap[code]?.daily_rate||0)); setEn(o?o.note:""); };
  const saveOv  = ()   => { setEqOv(p=>({...p,[ec]:{daily:Number(ev),note:en}})); setEc(null); };
  const clearOv = code => setEqOv(p => { const n={...p}; delete n[code]; return n; });

  // ── Equipment record edit helpers ─────────────────────────────────────────
  function startEdit(e) {
    setEditRow(e.code);
    setEditVal({ code:e.code, category:e.category, name:e.name, capacity:e.capacity, daily_rate:e.daily_rate, daily_cost:e.daily_cost || (e.daily_rate * 0.6) });
    setEc(null); // close any rate override
  }
  function saveEdit() {
    if (!editVal.name || !editVal.code) return;
    setEquipment(prev => prev.map(e =>
      e.code === editRow
        ? { ...e, code:editVal.code, category:editVal.category, name:editVal.name, capacity:editVal.capacity, daily_rate:Number(editVal.daily_rate), daily_cost:Number(editVal.daily_cost) }
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
      category:  newEquip.category,
      name: newEquip.name.trim(),
      capacity:  newEquip.capacity.trim() || "—",
      daily_rate: Number(newEquip.daily_rate) || 0,
      daily_cost: Number(newEquip.daily_cost) || (newEquip.daily_rate * 0.6),
    }]);
    setNewEquip({ code:"", category:"Forklift", name:"", capacity:"—", daily_rate:0, daily_cost:0 });
    setShowAdd(false);
  }

  const fi = { background:C.sur, border:`1px solid ${C.bdrM}`, borderRadius:5, color:C.txt,
               fontFamily:"inherit", fontSize:12, padding:"5px 7px", width:"100%",
               boxSizing:"border-box", outline:"none" };

  return (
    <div className="app-page-container" style={{ maxWidth:1200 }}>
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
            {showAdd ? " Cancel" : "+ Add Equipment"}
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
          <div className="app-table-wrap" style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:640 }}>
              <thead>
                <tr>
                  {["Code","Category","Equipment Name","Capacity","Daily Rate", (role === "admin" ? "Daily Cost" : null), "Override Rate","Override Note",""].filter(Boolean).map(h => (
                    <th key={h} style={thS}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equipment.filter(e => e.category === cat).map(e => {
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
                          <select style={{ ...fi, width:100 }} value={editVal.category}
                            onChange={x => setEditVal(v=>({...v, category:x.target.value}))}>
                            {KNOWN_CATS.map(ct => <option key={ct}>{ct}</option>)}
                          </select>
                        </td>
                        <td style={tdS}>
                          <input style={{ ...fi, width:200 }} value={editVal.name}
                            onChange={x => setEditVal(v=>({...v, name:x.target.value}))}/>
                        </td>
                        <td style={tdS}>
                          <input style={{ ...fi, width:90 }} value={editVal.capacity}
                            onChange={x => setEditVal(v=>({...v, capacity:x.target.value}))}/>
                        </td>
                        <td style={tdS}>
                          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <span style={{ fontSize:13, color:C.txtS }}>$</span>
                            <input style={{ ...fi, width:70 }} type="number" min={0} value={editVal.daily_rate}
                              onChange={x => setEditVal(v=>({...v, daily_rate:x.target.value}))}/>
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
                      <td style={{ ...tdS, fontSize:12, color:C.txtM }}>{e.category}</td>
                      <td style={{ ...tdS, fontWeight:500 }}>{e.name}</td>
                      <td style={{ ...tdS, color:C.txtS, fontSize:12 }}>{e.capacity}</td>
                      <td style={{ ...tdS, color:ov?C.txtS:C.txt, textDecoration:ov?"line-through":"none", fontSize:13 }}>
                        ${Number(e.daily_rate).toLocaleString()}/day
                      </td>
                      {role === "admin" && (
                        <td style={{ ...tdS, color:C.txtS, fontSize:13 }}>
                          ${Number(e.daily_cost || (e.daily_rate * 0.6)).toLocaleString()}
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
         <input 
                  type="text" 
                  placeholder="Filter customers..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  style={{ ...inp, width: 250, border:`2px solid ${C.acc}`, borderRadius:8 }}
               />
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
               <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: C.txtS }}></button>
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
                     {role === "admin" && <button style={{ background: C.redB, border: `1px solid ${C.redBdr}`, color: C.red, borderRadius: 5, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, fontWeight: 700 }} onClick={() => clear(c)}></button>}
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
function CustomerModal({ custName, jobs, reqs=[], jobFolders={}, custData, setCustData, profileTemplate, onOpenQuote, onOpenJobFolder, onClose }) {
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
  const [tab,         setTab]         = useState("overview");
  const [showDeadRfqs, setShowDeadRfqs] = useState(false);
  const [selLoc,      setSelLoc]      = useState("ALL");        // "ALL" or locationId
  const [showAddContact,  setShowAddContact]  = useState(false);
  const [showAddLoc,      setShowAddLoc]      = useState(false);
  const [editLocId,       setEditLocId]       = useState(null);
  const [newContact,  setNewContact]  = useState({ name:"", title:"", email:"", phone:"", primary:false, locationId:null });
  const [newLoc,      setNewLoc]      = useState({ name:"", address:"", notes:"" });
  const [editLoc,     setEditLoc]     = useState({ name:"", address:"", notes:"" });

  const won       = jobs.filter(q => q.status==="Won");
  const revenue   = won.reduce((s,q) => s+(q.total||0), 0);
  const submitted = jobs.filter(q => ["In Progress","In Review","Approved","Adjustments Needed","Submitted"].includes(q.status));

  // Filtered jobs for jobs tab
  const filteredQ = jobs.filter(q => {
    const s = search.toLowerCase();
    const locMatch = selLoc==="ALL" || (() => {
      const loc = locations.find(l=>l.id===selLoc);
      return loc && q.jobSite?.toLowerCase().includes(loc.address.split(",")[0].toLowerCase());
    })();
    const textMatch = !s || [q.jobSite,q.contactName,q.job_description,q.job_num].some(x=>x?.toLowerCase().includes(s));
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
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:2000,
                  display:"flex", alignItems:"flex-start", justifyContent:"center",
                  padding:"16px 12px", overflowY:"auto" }}>
      <div style={{ background:"#fff", borderRadius:10, width:"100%", maxWidth:900,
                    boxShadow:"0 12px 40px rgba(0,0,0,.25)", display:"flex", flexDirection:"column" }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ padding:"18px 22px 0", borderBottom:"1px solid #e2e5ea" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11, color:"#8a93a2", textTransform:"uppercase", letterSpacing:1 }}>
                {jobs.some(q=>q.status==="Won") ? "Customer Profile" : "Prospect Profile"}
              </div>
              <div style={{ fontSize:20, fontWeight:700, marginTop:2 }}>{custName}</div>
              {data.accountNum && <div style={{ fontSize:12, color:"#8a93a2", marginTop:1 }}>Account: {data.accountNum}</div>}
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:"#8a93a2", lineHeight:1 }}>×</button>
          </div>
          {/* Summary pills */}
          {(() => {
            const custReqs = reqs.filter(r=>r.company===custName);
            const openRfqs = custReqs.filter(r=>r.status!=="Dead"&&r.status!=="Quoted").length;
            return (
              <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
                {[
                  { l:"Total Quotes", v:jobs.length,   c:"#4a5060" },
                  { l:"Won",          v:won.length,       c:"#16a34a" },
                  { l:"In Pipeline",  v:submitted.length, c:"#2563eb" },
                  { l:"Revenue",      v:"$"+Math.round(revenue).toLocaleString(), c:"#b86b0a" },
                  { l:"Open RFQs",    v:openRfqs,         c:openRfqs>0?"#2563eb":"#8a93a2" },
                  { l:"Locations",    v:locations.length, c:"#7c3aed" },
                ].map(x => (
                  <div key={x.l} style={{ background:"#f5f6f8", borderRadius:6, padding:"5px 11px", fontSize:12 }}>
                    <span style={{ color:"#8a93a2" }}>{x.l}: </span>
                    <span style={{ fontWeight:700, color:x.c }}>{x.v}</span>
                  </div>
                ))}
              </div>
            );
          })()}
          {/* Tabs */}
          <div style={{ display:"flex", gap:0, overflowX:"auto" }}>
            {tabBtn("overview",  "Overview",  null)}
            {tabBtn("locations", "Locations", locations.length)}
            {tabBtn("rfqs",      "RFQs",      reqs.filter(r=>r.company===custName).length)}
            {tabBtn("jobs",    "Quotes",    jobs.length)}
            {tabBtn("activity",  "Activity",  null)}
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
                            {con.email && <a href={`mailto:${con.email}`} style={{ fontSize:12, color:"#2563eb", marginTop:2, display:"block", textDecoration:"none" }} onClick={e=>e.stopPropagation()}>{con.email}</a>}
                            {con.phone && <div style={{ fontSize:12,color:"#4a5060" }}>{con.phone}</div>}
                            {loc && <div style={{ fontSize:11,color:"#7c3aed",marginTop:2 }}>{loc.name}</div>}
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
                  const locQuotes   = jobs.filter(q=>q.jobSite?.toLowerCase().includes((loc.address||"").split(",")[0].toLowerCase()));
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
                              <div style={{ fontWeight:700,fontSize:15 }}>{loc.name}</div>
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
                              const ss={"In Progress":{bg:C.yelB,cl:C.yel,bd:C.yelBdr},"In Review":{bg:C.bluB,cl:C.blue,bd:C.bluBdr},"Approved":{bg:"#f0fdfa",cl:"#0d9488",bd:"#99f6e4"},"Adjustments Needed":{bg:"#fff1f2",cl:"#e11d48",bd:"#fecdd3"},Submitted:{bg:"#eff6ff",cl:"#2563eb",bd:"#bfdbfe"},Won:{bg:"#f0fdf4",cl:"#16a34a",bd:"#bbf7d0"},Lost:{bg:"#fef2f2",cl:"#dc2626",bd:"#fecaca"},Dead:{bg:"#1c1f26",cl:"#9ca3af",bd:"#374151"},Draft:{bg:"#f1f5f9",cl:"#475569",bd:"#cbd5e1"},"Change Order":{bg:"#f5f3ff",cl:"#6d28d9",bd:"#ddd6fe"}};
                              const st=ss[q.status]||ss.Draft;
                              return(
                                <div key={q.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"#f9fafb",border:"1px solid #e2e5ea",borderRadius:6 }}>
                                  <div>
                                    <span style={{ fontWeight:700,color:"#b86b0a",fontSize:12,marginRight:8 }}>{q.job_num}</span>
                                    <span style={{ background:st.bg,color:st.cl,border:`1px solid ${st.bd}`,borderRadius:3,padding:"1px 6px",fontSize:10,fontWeight:600 }}>{q.status}</span>
                                    <div style={{ fontSize:12,color:"#4a5060",marginTop:2 }}>{q.job_description}</div>
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
          {tab==="jobs" && (
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
              {filteredQ.length===0 && <div style={{ textAlign:"center",color:"#8a93a2",padding:"24px 0",fontSize:13 }}>No jobs match your filter.</div>}
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {filteredQ.map(q=>{
                  const ss={"In Progress":{bg:C.yelB,cl:C.yel,bd:C.yelBdr},"In Review":{bg:C.bluB,cl:C.blue,bd:C.bluBdr},"Approved":{bg:"#f0fdfa",cl:"#0d9488",bd:"#99f6e4"},"Adjustments Needed":{bg:"#fff1f2",cl:"#e11d48",bd:"#fecdd3"},Submitted:{bg:"#eff6ff",cl:"#2563eb",bd:"#bfdbfe"},Won:{bg:"#f0fdf4",cl:"#16a34a",bd:"#bbf7d0"},Lost:{bg:"#fef2f2",cl:"#dc2626",bd:"#fecaca"},Dead:{bg:"#1c1f26",cl:"#9ca3af",bd:"#374151"},Draft:{bg:"#f1f5f9",cl:"#475569",bd:"#cbd5e1"},"Change Order":{bg:"#f5f3ff",cl:"#6d28d9",bd:"#ddd6fe"}};
                  const st=ss[q.status]||ss.Draft;
                  return(
                    <div key={q.id} style={{ background:"#f5f6f8",border:"1px solid #e2e5ea",borderRadius:7,padding:"11px 14px" }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8 }}>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",marginBottom:3 }}>
                            <span style={{ fontWeight:700,color:"#b86b0a",fontSize:12 }}>{q.job_num}</span>
                            <span style={{ background:st.bg,color:st.cl,border:`1px solid ${st.bd}`,borderRadius:4,padding:"1px 7px",fontSize:11,fontWeight:600 }}>{q.status}</span>
                            {q.isChangeOrder&&<span style={{ fontSize:11,color:"#6d28d9",fontWeight:600 }}>Change Order</span>}
                            {q.locked&&<span style={{ fontSize:11,color:"#16a34a" }}>{q.jobNum}</span>}
                          </div>
                          <div style={{ fontWeight:600,fontSize:13 }}>{q.job_description}</div>
                          {q.jobSite&&<div style={{ fontSize:12,color:"#4a5060",marginTop:1 }}>{q.jobSite}</div>}
                          {q.contactName&&<div style={{ fontSize:12,color:"#4a5060" }}>Contact: {q.contactName}</div>}
                          <div style={{ fontSize:11,color:"#8a93a2",marginTop:2 }}>{q.start_date} · {q.qtype}{q.salesAssoc?" · SA: "+q.salesAssoc:""}</div>
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

          {/* ════ RFQS TAB ════ */}
          {tab==="rfqs" && (() => {
            const custReqs = reqs.filter(r=>r.company===custName).sort((a,b)=>b.date>a.date?1:-1);
            const openReqs = custReqs.filter(r=>r.status!=="Dead");
            const deadReqs = custReqs.filter(r=>r.status==="Dead");

            const RFQ_BADGE = {
              "New":         { bg:C.bluB, cl:C.blue, bd:C.bluBdr },
              "In Progress": { bg:C.yelB, cl:C.yel,  bd:C.yelBdr },
              "Quoted":      { bg:C.grnB, cl:C.grn,  bd:C.grnBdr },
              "Dead":        { bg:"#1c1f26", cl:"#9ca3af", bd:"#374151" },
            };

            const RFQCard = ({r}) => {
              const linked = jobs.find(q=>q.fromReqId===r.id);
              const st     = RFQ_BADGE[r.status] || RFQ_BADGE["New"];
              const isDead = r.status==="Dead";
              return (
                <div style={{ background:isDead?"#111318":C.bg, border:`1px solid ${isDead?"#374151":C.bdr}`, borderRadius:8, padding:"12px 14px", opacity:isDead?0.75:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", marginBottom:5 }}>
                        <span style={{ fontWeight:700, color:isDead?"#9ca3af":C.acc, fontSize:12 }}>{r.rn}</span>
                        <span style={{ background:st.bg, color:st.cl, border:`1px solid ${st.bd}`, borderRadius:4, padding:"1px 7px", fontSize:10, fontWeight:700 }}>{r.status}</span>
                        <span style={{ fontSize:11, color:C.txtS }}>{r.date}</span>
                      </div>
                      <div style={{ fontWeight:600, fontSize:13, color:isDead?"#6b7280":C.txt, marginBottom:3 }}>{r.desc}</div>
                      {r.jobSite && <div style={{ fontSize:11, color:C.txtS, marginBottom:2 }}>📍 {r.jobSite}</div>}
                      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:4 }}>
                        {r.requester && <span style={{ fontSize:11, color:C.txtM }}>👤 {r.requester}{r.phone?" · "+r.phone:""}</span>}
                        <span style={{ fontSize:11, color:C.txtM }}>🔧 {r.salesAssoc||"Unassigned"}</span>
                      </div>
                      {r.notes && <div style={{ fontSize:11, color:C.txtS, marginTop:4, fontStyle:"italic" }}>Note: {r.notes}</div>}
                      {isDead && r.deadNote && (
                        <div style={{ marginTop:6, background:"#1f2937", border:"1px solid #374151", borderRadius:5, padding:"5px 9px", fontSize:11, color:"#9ca3af" }}>
                          💀 Dead note: {r.deadNote}
                        </div>
                      )}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:5, alignItems:"flex-end", flexShrink:0 }}>
                      {linked ? (
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:10, color:C.txtS, marginBottom:2 }}>Linked estimate</div>
                          <div style={{ fontSize:12, fontWeight:700, color:C.acc }}>{linked.qn}</div>
                          <div style={{ fontSize:12, fontWeight:600, color:C.grn }}>${Math.round(linked.total||0).toLocaleString()}</div>
                          <Badge status={linked.status}/>
                        </div>
                      ) : (
                        <div style={{ fontSize:10, color:C.txtS, fontStyle:"italic", textAlign:"right" }}>No estimate yet</div>
                      )}
                      <button
                        onClick={()=>onOpenJobFolder&&onOpenJobFolder(r)}
                        style={{ background:isDead?"#1f2937":"#fff", color:isDead?"#9ca3af":C.acc, border:`1px solid ${isDead?"#374151":C.accB}`, borderRadius:5, padding:"4px 10px", fontSize:11, fontWeight:600, cursor:"pointer", marginTop:2 }}>
                        Job Folder
                      </button>
                    </div>
                  </div>
                </div>
              );
            };

            if(custReqs.length===0) return (
              <div style={{ textAlign:"center", color:C.txtS, padding:"36px 0" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>📋</div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>No RFQs on record</div>
                <div style={{ fontSize:12 }}>RFQs submitted by this customer will appear here.</div>
              </div>
            );

            return (
              <div>
                {/* Summary pills */}
                <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
                  {[
                    { l:"Total",       v:custReqs.length,                                                  c:C.txt  },
                    { l:"New",         v:custReqs.filter(r=>r.status==="New").length,                      c:C.blue },
                    { l:"In Progress", v:custReqs.filter(r=>r.status==="In Progress").length,              c:C.yel  },
                    { l:"Quoted",      v:custReqs.filter(r=>r.status==="Quoted").length,                   c:C.grn  },
                    { l:"Dead",        v:deadReqs.length,                                                  c:"#9ca3af" },
                  ].map(x=>(
                    <div key={x.l} style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:6, padding:"5px 12px", fontSize:12 }}>
                      <span style={{ color:C.txtS }}>{x.l}: </span>
                      <span style={{ fontWeight:700, color:x.c }}>{x.v}</span>
                    </div>
                  ))}
                </div>

                {/* ── ACTIVE RFQs section ── */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, paddingBottom:6, borderBottom:`2px solid ${C.bdr}` }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:C.blue, flexShrink:0 }}/>
                    <div style={{ fontWeight:700, fontSize:13, color:C.txt }}>Active RFQs</div>
                    <span style={{ background:C.bluB, color:C.blue, border:`1px solid ${C.bluBdr}`, borderRadius:10, padding:"1px 8px", fontSize:11, fontWeight:700 }}>{openReqs.length}</span>
                  </div>
                  {openReqs.length===0 ? (
                    <div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"16px", fontSize:13, color:C.txtS, textAlign:"center" }}>
                      No active RFQs — all requests have been quoted or closed.
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {openReqs.map(r=><RFQCard key={r.id} r={r}/>)}
                    </div>
                  )}
                </div>

                {/* ── DEAD RFQs section — collapsible ── */}
                <div>
                  <button
                    onClick={()=>setShowDeadRfqs(d=>!d)}
                    style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", padding:"6px 0", fontFamily:"inherit", width:"100%", borderTop:`1px solid #374151`, paddingTop:10 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:"#374151", flexShrink:0 }}/>
                    <div style={{ fontWeight:700, fontSize:13, color:"#6b7280" }}>Dead RFQs</div>
                    <span style={{ background:"#1f2937", color:"#9ca3af", border:"1px solid #374151", borderRadius:10, padding:"1px 8px", fontSize:11, fontWeight:700 }}>{deadReqs.length}</span>
                    <span style={{ fontSize:14, color:"#6b7280", marginLeft:"auto" }}>{showDeadRfqs?"▾":"▸"}</span>
                  </button>
                  {showDeadRfqs && deadReqs.length > 0 && (
                    <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:10 }}>
                      {deadReqs.map(r=><RFQCard key={r.id} r={r}/>)}
                    </div>
                  )}
                  {showDeadRfqs && deadReqs.length===0 && (
                    <div style={{ padding:"12px 0", fontSize:13, color:"#6b7280", textAlign:"center" }}>No dead RFQs.</div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

          {/* ════ ACTIVITY TAB ════ */}
          {tab==="activity" && (() => {
            // Collect all timeline entries across all RFQs for this customer
            const custReqs = reqs.filter(r=>r.company===custName);
            const allEvents = [];

            // From job folder timelines
            custReqs.forEach(r=>{
              const folder = jobFolders[r.id];
              if(folder?.timelines) {
                folder.timelines.forEach(tl=>{
                  allEvents.push({ date:tl.date, note:tl.note, source:"timeline", rfqRn:r.rn, rfqId:r.id, color:C.blue });
                });
              }
              // Stage changes captured as folder.stage
              if(folder?.stage > 0) {
                const STAGES = ["RFQ Received","Client Contact","Viewed Job / Docs","Priced Materials / Rentals","Final Consult"];
                allEvents.push({ date:folder.lastActivity||r.date, note:`Progress: ${STAGES[folder.stage]||"Stage "+folder.stage}`, source:"stage", rfqRn:r.rn, rfqId:r.id, color:C.acc });
              }
              // RFQ created
              allEvents.push({ date:r.date, note:`RFQ received (${r.rn})`, source:"rfq", rfqRn:r.rn, rfqId:r.id, color:C.ora });
            });

            // From jobs
            jobs.forEach(q=>{
              allEvents.push({ date:q.start_date, note:`Estimate ${q.job_num} — ${q.status} — $${Math.round(q.total||0).toLocaleString()}`, source:"quote", rfqRn:null, rfqId:null, color:q.status==="Won"?C.grn:q.status==="Lost"?C.red:C.txtM });
            });

            // Sort newest first
            allEvents.sort((a,b)=>{ if(!a.date) return 1; if(!b.date) return -1; return b.date>a.date?1:b.date<a.date?-1:0; });

            if(allEvents.length===0) return (
              <div style={{ textAlign:"center", color:C.txtS, padding:"36px 0" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>📅</div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>No activity yet</div>
                <div style={{ fontSize:12 }}>Activity from jobs and job folders will appear here.</div>
              </div>
            );

            // Group by month
            const grouped = {};
            allEvents.forEach(e=>{
              const mo = e.date ? e.date.slice(0,7) : "Unknown";
              if(!grouped[mo]) grouped[mo]=[];
              grouped[mo].push(e);
            });

            return (
              <div>
                <div style={{ fontSize:12, color:C.txtS, marginBottom:14 }}>{allEvents.length} events across all jobs and RFQs</div>
                {Object.keys(grouped).sort((a,b)=>b>a?1:-1).map(mo=>(
                  <div key={mo} style={{ marginBottom:20 }}>
                    {/* Month header */}
                    <div style={{ fontSize:10, fontWeight:800, color:C.txtS, textTransform:"uppercase", letterSpacing:1, marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ flex:1, height:1, background:C.bdr }}/>
                      {mo==="Unknown" ? "Unknown Date" : new Date(mo+"-01").toLocaleString("default",{month:"long",year:"numeric"})}
                      <div style={{ flex:1, height:1, background:C.bdr }}/>
                    </div>
                    {/* Events */}
                    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                      {grouped[mo].map((e,i)=>(
                        <div key={i} style={{ display:"flex", gap:12, paddingBottom:10 }}>
                          {/* Timeline spine */}
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0, width:16 }}>
                            <div style={{ width:10, height:10, borderRadius:"50%", background:e.color, flexShrink:0, marginTop:3 }}/>
                            {i<grouped[mo].length-1 && <div style={{ width:2, flex:1, background:C.bdr, marginTop:3 }}/>}
                          </div>
                          {/* Event content */}
                          <div style={{ flex:1, background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:7, padding:"8px 12px", marginBottom:2 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                              <div style={{ fontSize:12, fontWeight:600, color:C.txt, flex:1 }}>{e.note}</div>
                              <div style={{ fontSize:10, color:C.txtS, whiteSpace:"nowrap", flexShrink:0 }}>{e.date}</div>
                            </div>
                            {e.rfqRn && (
                              <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4 }}>
                                <span style={{ fontSize:10, color:C.txtS }}>RFQ:</span>
                                <button onClick={()=>{ const r=custReqs.find(x=>x.id===e.rfqId); if(r&&onOpenJobFolder) onOpenJobFolder(r); }} style={{ background:"none", border:"none", fontSize:10, color:C.acc, cursor:"pointer", padding:0, fontFamily:"inherit", fontWeight:600 }}>{e.rfqRn} ↗</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 950px)");
    const sync = () => setIsCollapsed(!!mq.matches);
    sync();
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", sync);
    else if (typeof mq.addListener === "function") mq.addListener(sync);
    return () => {
      if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", sync);
      else if (typeof mq.removeListener === "function") mq.removeListener(sync);
    };
  }, []);

  return (
    <div style={{ background:"#fff", border:"1px solid #e2e5ea", borderRadius:8, padding:14, flex:1, minWidth:220 }}>
      <div 
        style={{ fontSize:11, lineHeight:1.3, color:"#8a93a2", fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:isCollapsed?0:10, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"flex-start", minHeight:34 }}
        onClick={()=>setIsCollapsed(!isCollapsed)}
      >
        <span style={{ paddingRight: 8 }}>{title}</span>
        <span>{isCollapsed ? "▼" : "▲"}</span>
      </div>
      {!isCollapsed && (
        !hasData ? (
          <div style={{ textAlign:"center", color:"#c8cdd5", fontSize:12, padding:"20px 0" }}>No data yet</div>
        ) : (
          <div style={{ display:"flex", gap:12, alignItems:"center", cursor:"pointer" }} onClick={()=>onClickChart({ title, data, total })} title="Click anywhere to view details">
            <div style={{ flexShrink:0 }}>
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
        )
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

function SalesmanCharts({ jobs, reqs }) {
  const [detail, setDetail] = useState(null);

  const getSA = (item) => item.salesAssoc || item.estimator || "Unassigned";

  // Build salesman sets
  const allSA = [...new Set([
    ...reqs.map(r=>getSA(r)),
    ...jobs.map(q=>q.salesAssoc||"Unassigned"),
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
  const submittedQ   = jobs.filter(q=>q.status==="Submitted");
  const wonQ         = jobs.filter(q=>q.status==="Won");
  const lostQ        = jobs.filter(q=>q.status==="Lost");

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
function CalendarPage({ jobs, setJobs, eqMap, onOpenQuote }) {
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
    jobs
      .filter(q => q.startDate && (q.status === "Won" || q.status === "Submitted"))
      .map(q => ({
        ...q,
        startObj: new Date(q.startDate + "T12:00:00"),
        endObj:   q.compDate ? new Date(q.compDate + "T12:00:00")
                             : new Date(q.startDate + "T12:00:00"),
      })),
    [jobs]
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

  // ── Save edited dates back to jobs array ────────────────────────────────
  function saveDates() {
    if (!detailJob || !editDates) return;
    setJobs(prev => prev.map(q =>
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
                      {job.startDate} {"→"} {job.compDate || "TBD"} · SA: {job.salesAssoc || "—"}
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
                  Job Dates
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
                        {hasConflict ? "⚠ " : ""}{code}{eq ? ` — ${eq.name}` : ""}
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
                <span style={{ color: C.grn, fontWeight: 700 }}> Connected</span>
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
          {[["job", "By Job"], ["equipment", "By Equipment"]].map(([v, l]) => (
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
                          {job.jobNum && <span style={{ fontSize: 11, color: C.grn }}>{job.jobNum}</span>}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{job.client}</div>
                        <div style={{ fontSize: 12, color: C.txtM }}>{job.desc}</div>
                        {job.jobSite && <div style={{ fontSize: 11, color: C.txtS, marginTop: 1 }}>{job.jobSite}</div>}
                        <div style={{ fontSize: 11, color: C.txtS, marginTop: 2 }}>
                          {job.startDate} {"→"} {job.compDate || "TBD"} · SA: {job.salesAssoc || "—"}
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
                                {conflict ? "⚠ " : ""}{code}{eq ? ` — ${eq.name}` : ""}
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
                        {job.startDate} {"→"} {job.compDate || "TBD"} · SA: {job.salesAssoc || "—"}
                      </div>
                      {(job.equipList || []).length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
                          {(job.equipList || []).map(code => (
                            <span key={code} style={{ fontSize: 10, background: C.sur, border: `1px solid ${C.bdr}`,
                                                       borderRadius: 3, padding: "1px 6px", color: C.txtM }}>
                              {code}
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
          <input 
            id="login-username"
            name="username"
            type="text"
            autoComplete="username"
            style={{ ...inp, padding:"10px 12px", fontSize:14 }} 
            value={username} 
            onChange={e=>setUsername(e.target.value)} 
            required 
          />
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:600, color:C.txtM, marginBottom:6 }}>PASSWORD</div>
          <input 
            id="login-password"
            name="password"
            type="password" 
            autoComplete="current-password"
            style={{ ...inp, padding:"10px 12px", fontSize:14 }} 
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            required 
          />
        </div>
        <button type="submit" style={{ ...mkBtn("primary"), width:"100%", justifyContent:"center", padding:"12px", fontSize:14 }}>Login</button>
        <button type="button" onClick={onBack} style={{ ...mkBtn("ghost"), width:"100%", justifyContent:"center", padding:"10px", marginTop:10, fontSize:14 }}>Cancel</button>
      </form>
    </div>
  );
}

// ── VECTOR DATABASE BROWSER ─────────────────────────────────────────────────
function VectorBrowser({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/admin/vector-db", { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setData(d);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const online  = data?.modelLoaded === true;
  const offline = data?.status === "offline" || !data?.modelLoaded;

  const statDot = (ok) => (
    <span style={{
      display: "inline-block", width: 10, height: 10, borderRadius: "50%",
      background: ok ? C.grn : C.red,
      boxShadow: ok ? `0 0 6px ${C.grn}` : `0 0 6px ${C.red}`,
      marginRight: 6, flexShrink: 0,
    }}/>
  );

  const modelName = data?.props?.default_generation_settings?.model ||
                    data?.props?.model_alias ||
                    (data?.props ? Object.values(data.props).find(v => typeof v === "string" && v.includes(".gguf")) : null) ||
                    "llama-3.1-8b-instruct-q4_k_m";

  const ctxSize    = data?.props?.default_generation_settings?.n_ctx || data?.props?.n_ctx || "—";
  const slotCount  = data?.slots?.length ?? 0;
  const busySlots  = (data?.slots || []).filter(s => s.state === 1 || s.is_processing).length;

  const corpus = [
    { label: "Customers",  icon: "🏢", count: data?.indexedCounts?.customers  ?? "—", desc: "Company profiles & contacts" },
    { label: "Quotes",     icon: "📋", count: data?.indexedCounts?.quotes     ?? "—", desc: "Estimates & bid history" },
    { label: "RFQs",       icon: "📩", count: data?.indexedCounts?.rfqs       ?? "—", desc: "Incoming requests for quote" },
    { label: "Equipment",  icon: "🔩", count: data?.indexedCounts?.equipment  ?? "—", desc: "Rigging & equipment catalog" },
  ];

  const totalDocs = Object.values(data?.indexedCounts || {}).reduce((a, b) => a + (Number(b) || 0), 0);

  return (
    <div style={{ marginTop: 40, borderTop: `1px solid ${C.bdr}`, paddingTop: 30 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.acc, marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}>
            🧠 Vector Database
          </div>
          <div style={{ fontSize: 12, color: C.txtS }}>AI model context, slots, and embeddable corpus overview.</div>
        </div>
        <button onClick={load} disabled={loading}
          style={{ ...mkBtn("ghost"), padding: "6px 14px", fontSize: 12, gap: 6 }}>
          {loading ? "⏳ Loading..." : "↻ Refresh"}
        </button>
      </div>

      {err && <div style={{ background: C.redB, color: C.red, border: `1px solid ${C.redBdr}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>⚠ {err}</div>}

      {/* Status bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          {
            label: "AI Engine",
            value: online ? "Online" : "Offline",
            sub: online ? "llama.cpp server" : "Model not loaded",
            ok: online,
            icon: "🤖",
          },
          {
            label: "Context Window",
            value: ctxSize === "—" ? "—" : `${Number(ctxSize).toLocaleString()} tokens`,
            sub: "Max input context",
            ok: online,
            icon: "📏",
          },
          {
            label: "Inference Slots",
            value: slotCount > 0 ? `${busySlots} / ${slotCount} busy` : (online ? "0" : "—"),
            sub: slotCount > 0 ? "Parallel inference capacity" : "No slots active",
            ok: online && slotCount > 0,
            icon: "⚡",
          },
          {
            label: "Corpus Size",
            value: loading ? "…" : `${totalDocs.toLocaleString()} records`,
            sub: "Total embeddable documents",
            ok: totalDocs > 0,
            icon: "📚",
          },
        ].map(stat => (
          <div key={stat.label} style={{
            background: C.sur, border: `1px solid ${stat.ok ? C.bdr : C.bdr}`,
            borderRadius: 10, padding: "14px 16px",
            borderLeft: `3px solid ${stat.ok ? C.grn : (offline ? C.red : C.bdr)}`,
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{stat.icon}</div>
            <div style={{ fontSize: 12, color: C.txtS, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{stat.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {statDot(stat.ok)}
              <span style={{ fontSize: 15, fontWeight: 800, color: C.txt }}>{stat.value}</span>
            </div>
            <div style={{ fontSize: 11, color: C.txtS, marginTop: 3 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Model card */}
      <div style={{ background: online ? C.accL : C.redB, border: `1px solid ${online ? C.accB : C.redBdr}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 32 }}>{online ? "✅" : "❌"}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: online ? C.acc : C.red, marginBottom: 2 }}>
            {online ? "Model Ready" : "No Model Loaded"}
          </div>
          <div style={{ fontSize: 12, color: online ? C.acc : C.red, fontFamily: "monospace", wordBreak: "break-all" }}>
            {modelName}
          </div>
          {data?.aiHost && (
            <div style={{ fontSize: 11, color: C.txtS, marginTop: 4, fontFamily: "monospace" }}>
              Endpoint: {data.aiHost}
            </div>
          )}
        </div>
        {!online && (
          <div style={{ fontSize: 12, color: C.red, maxWidth: 220, lineHeight: 1.5 }}>
            Download the model file and place it at <code style={{ background: "rgba(0,0,0,.06)", borderRadius: 3, padding: "1px 4px" }}>./models/llama-3.1-8b-instruct-q4_k_m.gguf</code> to activate AI features.
          </div>
        )}
      </div>

      {/* Inference Slots */}
      {slotCount > 0 && (
        <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: C.txt }}>Inference Slots</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(data?.slots || []).map((slot, i) => {
              const busy = slot.state === 1 || slot.is_processing;
              return (
                <div key={i} style={{
                  background: busy ? C.accL : C.bg,
                  border: `1px solid ${busy ? C.accB : C.bdr}`,
                  borderRadius: 8, padding: "10px 14px", minWidth: 120, flex: 1,
                }}>
                  <div style={{ fontSize: 11, color: C.txtS, fontWeight: 600 }}>SLOT {slot.id ?? i}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                    {statDot(busy)}
                    <span style={{ fontWeight: 700, fontSize: 13, color: busy ? C.acc : C.txtM }}>
                      {busy ? "Active" : "Idle"}
                    </span>
                  </div>
                  {slot.n_past !== undefined && (
                    <div style={{ fontSize: 10, color: C.txtS, marginTop: 3 }}>{slot.n_past} tokens used</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Corpus table */}
      <div style={{ background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.bdr}`, background: C.bg, fontWeight: 700, fontSize: 13 }}>Embeddable Corpus (MySQL Sources)</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.bg }}>
              {["Source", "Description", "Records", "Status"].map(h => (
                <th key={h} style={{ ...thS, padding: "10px 18px", borderBottom: `1px solid ${C.bdrM}`, textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {corpus.map((row, i) => (
              <tr key={row.label} style={{ borderBottom: `1px solid ${C.bdr}`, background: i % 2 === 0 ? "transparent" : "#fbfbfb" }}>
                <td style={{ ...tdS, padding: "11px 18px", fontWeight: 700 }}>{row.icon} {row.label}</td>
                <td style={{ ...tdS, padding: "11px 18px", color: C.txtM }}>{row.desc}</td>
                <td style={{ ...tdS, padding: "11px 18px", fontWeight: 800, color: C.acc }}>
                  {loading ? <em style={{ color: C.txtS }}>…</em> : row.count.toLocaleString()}
                </td>
                <td style={{ ...tdS, padding: "11px 18px" }}>
                  <span style={{
                    background: row.count > 0 ? C.grnB : C.bg,
                    color: row.count > 0 ? C.grn : C.txtS,
                    border: `1px solid ${row.count > 0 ? C.grnBdr : C.bdr}`,
                    borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600
                  }}>{row.count > 0 ? "Indexed" : "Empty"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "10px 18px", borderTop: `1px solid ${C.bdr}`, fontSize: 11, color: C.txtS }}>
          Last refreshed: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "—"}
        </div>
      </div>
    </div>
  );
}

// ── ADMIN PAGE ───────────────────────────────────────────────────────────────
function DatabaseBrowser({ token }) {
  const [selectedTable, setSelectedTable] = useState("users");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const tables = ['users', 'estimators', 'admin_tasks', 'jobs', 'rfqs', 'customers', 'customer_contacts', 'base_labor', 'equipment'];

  useEffect(() => {
    if (!selectedTable || !token) return;
    setLoading(true);
    fetch(`/api/admin/tables/${selectedTable}`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { console.error("Data load err:", e); setLoading(false); });
  }, [selectedTable, token]);

  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div style={{ marginTop: 40, borderTop: `1px solid ${C.bdr}`, paddingTop: 30 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.acc, marginBottom: 4 }}>Data Browser</div>
      <div style={{ fontSize: 12, color: C.txtS, marginBottom: 16 }}>Live view of MySQL database records (limited to first 100 rows).</div>
      <div style={{ display: "flex", gap: 20, alignItems: "start" }}>
        <div style={{ width: 180, flexShrink: 0 }}>
          <Lbl c="TABLES" />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {tables.map(t => (
              <button key={t}
                style={{ ...mkBtn(selectedTable===t?"primary":"ghost"), justifyContent:"start", fontSize:12, padding:"6px 14px", textTransform:"capitalize" }}
                onClick={()=>setSelectedTable(t)}>
                {t.replace('_',' ')}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          {selectedTable ? (
            <Card style={{ padding:16, margin:0, border:`1.5px solid ${C.accB}`, borderRadius:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ fontWeight:800, fontSize:15, color:C.acc }}>Table: {selectedTable}</div>
                {loading && <div style={{ fontSize:11, color:C.acc, fontWeight:700 }}>⏳ Loading records...</div>}
              </div>
              <div style={{ overflowX:"auto", borderRadius:6, border:`1px solid ${C.bdr}`, background:C.sur }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:10 }}>
                  <thead style={{ position:"sticky", top:0, zIndex:10 }}>
                    <tr style={{ background:C.bg }}>
                      {headers.map(h=><th key={h} style={{ ...thS, padding:"10px 12px", borderBottom:`2px solid ${C.bdrM}` }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.length > 0 ? data.map((row, i) => (
                      <tr key={i} style={{ borderBottom:`1px solid ${C.bdr}`, background:i%2===0?"transparent":"#fbfbfb" }}>
                        {headers.map(h => (
                          <td key={h} style={{ ...tdS, padding:"8px 12px", whiteSpace:"nowrap", maxWidth:250, overflow:"hidden", textOverflow:"ellipsis" }}>
                            {row[h] === null ? <em style={{ color:C.txtS }}>null</em> : String(row[h])}
                          </td>
                        ))}
                      </tr>
                    )) : !loading && (
                      <tr><td colSpan={10} style={{ ...tdS, textAlign:"center", padding:40, color:C.txtS }}>No records found in this table.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div style={{ height:120, display:"flex", alignItems:"center", justifyContent:"center", background:"#fafafa", borderRadius:10, border:`2px dashed ${C.bdr}`, color:C.txtS, fontSize:13 }}>
              Select a table from the sidebar to preview live data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminPage({ token, appUsers=[], setAppUsers, companyInfo, setCompanyInfo }) {
  const users = appUsers;
  const setUsers = setAppUsers;
  const currentUserId = (() => {
    try {
      const payload = JSON.parse(atob((token || "").split(".")[1] || ""));
      return Number(payload.userId);
    } catch {
      return null;
    }
  })();
  const [confirm, setConfirm] = useState(null); // { title, msg, onOk, btn:"Restore"|"Delete" }
  const [showVectorDB, setShowVectorDB] = useState(false);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const rd = new FileReader();
      rd.onload = ev => setCompanyInfo({ ...companyInfo, logoSrc: ev.target.result });
      rd.readAsDataURL(file);
    }
  };
  const [newUser, setNewUser] = useState({ first_name: "", last_name: "", username: "", password: "", role: "estimator", email: "", cell_phone: "" });
  const [editingUser, setEditingUser] = useState(null);
  const [formErr, setFormErr] = useState("");
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  
  // Customer management state
  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState({ name: "", billing_address: "", website: "", industry: "", payment_terms: "", account_num: "", notes: "" });
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [custFormErr, setCustFormErr] = useState("");
  const [selectedCustId, setSelectedCustId] = useState(null);
  const [custSearch, setCustSearch] = useState("");
  const USERNAME_RULE_TEXT = "Username must be lowercase letters only, one word, max 16 characters, and no numbers.";
  const normalizeUsername = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");
  const isValidUsername = (value) => /^[a-z]{1,16}$/.test(normalizeUsername(value));
  const selectedCust = customers.find(c => c.id === selectedCustId);
  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()) || (c.account_num && c.account_num.includes(custSearch)));
  const customerDropdownOptions = selectedCust && !filteredCustomers.some(c => c.id === selectedCust.id)
    ? [selectedCust, ...filteredCustomers]
    : filteredCustomers;

  useEffect(() => {
    if (!token) return;
    // Load Tasks
    fetch("/api/admin/tasks", { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setTasks(Array.isArray(d) ? d : []))
      .catch(e => console.error("Load tasks err:", e));

    // Load Users
    fetch("/api/admin/users", { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUsers(Array.isArray(d) ? d : []))
      .catch(e => console.error("Load users err:", e));
    
    // Load Customers
    fetch("/api/admin/customers", { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setCustomers(Array.isArray(d) ? d : []))
      .catch(e => console.error("Load customers err:", e));

      // Load Company Info
      fetch("/api/admin/company-info", { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => setCompanyInfo({
          name: d?.name || "",
          address: d?.address || "",
          services: d?.services || "",
          logoSrc: d?.logo_src ?? d?.logoSrc ?? null
        }))
        .catch(e => console.error("Load company info err:", e));
  }, [token]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text: newTask, subnotes: [] })
      });
      if (!res.ok) throw new Error("Add task failed");
      const saved = await res.json();
      setTasks([saved, ...tasks]);
      setNewTask("");
    } catch (err) { alert(err.message); }
  };

  const toggleTask = async (id, done) => {
    try {
      await fetch(`/api/admin/tasks/${id}`, {
        method: "PATCH",
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ done: !done })
      });
      setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    } catch (err) { console.error(err); }
  };

  const delTask = async (id) => {
    if (!window.confirm("Delete task?")) return;
    try {
      await fetch(`/api/admin/tasks/${id}`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setTasks(tasks.filter(t => t.id !== id));
    } catch (err) { console.error(err); }
  };

  const addSubnote = async (id, note) => {
    if (!note.trim()) return;
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newSubnotes = [...task.subnotes, note];
    try {
      await fetch(`/api/admin/tasks/${id}`, {
        method: "PATCH",
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subnotes: newSubnotes })
      });
      setTasks(tasks.map(t => t.id === id ? { ...t, subnotes: newSubnotes } : t));
    } catch (err) { console.error(err); }
  };

  const delSubnote = async (taskId, subIdx) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newSubnotes = task.subnotes.filter((_, i) => i !== subIdx);
    try {
      await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subnotes: newSubnotes })
      });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, subnotes: newSubnotes } : t));
    } catch (err) { console.error(err); }
  };




  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormErr("");
    const normalizedUsername = normalizeUsername(newUser.username);
    if (!normalizedUsername || !newUser.password.trim()) { setFormErr("Username and password are required."); return; }
    if (!isValidUsername(normalizedUsername)) { setFormErr(USERNAME_RULE_TEXT); return; }
    
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...newUser, username: normalizedUsername })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create user");
      }
      const created = await res.json();
      setUsers(prev => [...prev, created]);
      setNewUser({ first_name:"", last_name:"", username:"", password:"", role:"estimator", email:"", cell_phone:"" });
    } catch (err) {
      setFormErr(err.message);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setFormErr("");
    const normalizedUsername = normalizeUsername(editingUser.username);
    if (!normalizedUsername) { setFormErr("Username is required."); return; }
    if (!isValidUsername(normalizedUsername)) { setFormErr(USERNAME_RULE_TEXT); return; }
    
    try {
      const updateData = {
        first_name: editingUser.first_name || "",
        last_name: editingUser.last_name || "",
        username: normalizedUsername,
        email: editingUser.email || "",
        cell_phone: editingUser.cell_phone || "",
        role: editingUser.role
      };
      if (editingUser.password) updateData.password = editingUser.password;
      
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updateData)
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update user");
      }
      const updated = await res.json();
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      setEditingUser(null);
    } catch (err) {
      setFormErr(err.message);
    }
  };

  const editUsernameInvalid = editingUser ? !isValidUsername(editingUser.username || "") : false;

  const updateUserRole = async (id, role) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role })
      });
      if (!res.ok) throw new Error("Failed to update user role");
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    } catch (err) {
      alert("Role update failed: " + err.message);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Delete failed");
      }
      setUsers(prev => prev.filter(u=>u.id!==id));
    } catch (err) {
      alert("Failed to delete user: " + err.message);
    }
  };

  const toggleUserDisabled = async (u) => {
    if (Number(u.id) === currentUserId) return;
    const nextDisabled = !u.is_disabled;
    const actionText = nextDisabled ? "disable" : "enable";
    if (!window.confirm(`Are you sure you want to ${actionText} this account?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${u.id}/status`, {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_disabled: nextDisabled ? 1 : 0 })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to update account status");
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_disabled: nextDisabled } : x));
    } catch (err) {
      alert("Failed to update account status: " + err.message);
    }
  };

  // Customer Management Functions
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setCustFormErr("");
    if (!newCustomer.name.trim()) { setCustFormErr("Customer name is required."); return; }
    
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newCustomer)
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create customer");
      }
      const created = await res.json();
      setCustomers(prev => [...prev, created]);
      setNewCustomer({ name: "", billing_address: "", website: "", industry: "", payment_terms: "", account_num: "", notes: "" });
      setSelectedCustId(created.id);
    } catch (err) {
      setCustFormErr(err.message);
    }
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    setCustFormErr("");
    if (!editingCustomer.name.trim()) { setCustFormErr("Customer name is required."); return; }
    
    try {
      const res = await fetch(`/api/admin/customers/${editingCustomer.id}`, {
        method: "PUT",
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editingCustomer)
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update customer");
      }
      const updated = await res.json();
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
      setEditingCustomer(null);
      setSelectedCustId(updated.id);
    } catch (err) {
      setCustFormErr(err.message);
    }
  };

  const handleSaveCompanyInfo = async () => {
    try {
      const res = await fetch("/api/admin/company-info", {
        method: "PUT",
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: companyInfo.name || "",
          address: companyInfo.address || "",
          services: companyInfo.services || "",
          logo_src: companyInfo.logoSrc || null
        })
      });
      if (!res.ok) throw new Error("Failed to save company info");
      const saved = await res.json();
      setCompanyInfo({
        name: saved?.name || "",
        address: saved?.address || "",
        services: saved?.services || "",
        logoSrc: saved?.logo_src ?? saved?.logoSrc ?? null
      });
      alert("Company profile saved successfully!");
    } catch (err) {
      alert("Failed to save company info: " + err.message);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm("Delete this customer? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to delete customer");
      }
      setCustomers(prev => prev.filter(c => c.id !== id));
      if (selectedCustId === id) setSelectedCustId(null);
    } catch (err) {
      alert("Failed to delete customer: " + err.message);
    }
  };

  const handleBackup = async () => {
    try {
      const res = await fetch("/api/admin/backup", {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Backup failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const disposition = res.headers.get('Content-Disposition');
      let filename = `rigpro_backup_${new Date().toISOString().slice(0,10)}.sql`;
      if (disposition && disposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) { 
              filename = matches[1].replace(/['"]/g, '');
          }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to download database backup.");
    }
  };

  const [showBackupList, setShowBackupList] = useState(false);
  const [localBackups, setLocalBackups] = useState([]);
  const [selectedBackups, setSelectedBackups] = useState([]);

  const loadBackups = async () => {
    try {
      const res = await fetch("/api/admin/backups/list", { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setLocalBackups(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Load backups err:", e); }
  };

  const deleteSelectedBackups = async () => {
    if (!selectedBackups.length) return;
    if (!window.confirm(`Delete ${selectedBackups.length} backup(s) permanently?`)) return;
    try {
      await fetch("/api/admin/backups/delete", {
        method: "POST",
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ filenames: selectedBackups })
      });
      setSelectedBackups([]);
      loadBackups();
    } catch (e) { alert("Delete failed"); }
  };

  const restoreLocalBackup = async (filename) => {
    setConfirm({
      title: "Confirm System Restore",
      msg: `DANGER: You are about to restore the system to a snapshot from ${new Date().toLocaleString()}. This will completely overwrite all current database records. This action is irreversible.`,
      btn: "Start Restore",
      onOk: async () => {
        try {
          const res = await fetch("/api/admin/restore-local", {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ filename })
          });
          
          let data;
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            data = await res.json();
          } else {
            const text = await res.text();
            throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}`);
          }

          if (!res.ok) throw new Error(data.error || "Restore failed");
          
          alert("Database restored successfully. The application will now reload.");
          window.location.reload();
        } catch (e) { 
          console.error(e);
          alert("Restore failed: " + e.message); 
        } finally { setConfirm(null); }
      }
    });
  };

  return (
    <div style={{ padding:"24px", maxWidth:1100, margin:"0 auto" }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, color:C.acc, marginBottom:4 }}>Admin Portal</div>
            <div style={{ fontSize:14, color:C.txtM, marginBottom:20 }}>System oversight and user management</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              style={{ ...mkBtn(showVectorDB ? "primary" : "ghost"), padding: "10px 20px", fontWeight: 700,
                background: showVectorDB ? "#7c3aed" : undefined,
                border: showVectorDB ? "none" : `1px solid ${C.bdr}` }}
              onClick={() => setShowVectorDB(v => !v)}
            >
              {showVectorDB ? "🧠 Hide Vector DB" : "🧠 Vector Database"}
            </button>
            <button 
               style={{ ...mkBtn("primary"), padding: "10px 20px", fontWeight: 700, background: "#0d9488" }}
               onClick={() => window.dispatchEvent(new CustomEvent('change-view', { detail: 'investor' }))}
            >
               Open Investor Dashboard
            </button>
          </div>
        </div>


        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:20, marginBottom:30 }}>
          {/* USER LIST */}
          <div style={{ flex:1 }}>
            <Sec c="Accounts"/>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {users.map(u => (
                  <div key={u.id} style={{ display:"flex", flexWrap:"wrap", alignItems:"flex-start", justifyContent:"space-between", gap:10, background:u.is_disabled ? "#fff1f2" : C.sur, border:`1px solid ${u.is_disabled ? C.redBdr : C.bdr}`, padding:"12px 16px", borderRadius:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, flex:"1 1 180px", minWidth:0 }}>
                                      <div style={{ width:28, height:28, background:C.accL, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:C.acc, fontSize:10 }}>{(u.first_name?.[0] || u.username?.[0] || "?").toUpperCase()}</div>
                      <div style={{ minWidth:0 }}>
                                        <div style={{ fontWeight:700, fontSize:13 }}>{`${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username}</div>
                                        <div style={{ fontSize:11, color:C.txtS }}>@{u.username}</div>
                                        {u.email && <a href={`mailto:${u.email}`} style={{ fontSize:11, color:C.blue, textDecoration:"none", display:"block" }} onClick={e=>e.stopPropagation()}>{u.email}</a>}
                                        {u.cell_phone && <div style={{ fontSize:11, color:C.txtM }}>{u.cell_phone}</div>}
                        <div style={{ display:"flex", gap:4, marginTop:2 }}>
                          {u.role==="admin" && <span style={{ background:C.redB, color:C.red, border:`1px solid ${C.redBdr}`, borderRadius:4, padding:"1px 6px", fontSize:9, fontWeight:700 }}>ADMIN</span>}
                          {u.role==="manager" && <span style={{ background:C.bluB, color:C.blue, border:`1px solid ${C.bluBdr}`, borderRadius:4, padding:"1px 6px", fontSize:9, fontWeight:700 }}>MANAGER</span>}
                          {u.role==="estimator" && <span style={{ background:C.grnB, color:C.grn, border:`1px solid ${C.grnBdr}`, borderRadius:4, padding:"1px 6px", fontSize:9, fontWeight:700 }}>ESTIMATOR</span>}
                          {u.role==="user" && <span style={{ background:C.bg, color:C.txtS, border:`1px solid ${C.bdr}`, borderRadius:4, padding:"1px 6px", fontSize:9, fontWeight:700 }}>USER</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"flex-end", gap:6, marginLeft:"auto" }}>
                      <select
                        style={{ ...sel, padding:"2px 4px", fontSize:11, minWidth:108 }}
                        value={u.role}
                        onChange={(e) => updateUserRole(u.id, e.target.value)}
                      >
                        <option value="estimator">Estimator</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button style={{ ...mkBtn("blue"), padding:"4px 8px", fontSize:10 }} onClick={() => setEditingUser({ ...u, password: "" })}>Edit</button>
                      <button
                        style={{ ...mkBtn(u.is_disabled ? "won" : "danger"), padding:"4px 8px", fontSize:10, opacity: Number(u.id) === currentUserId ? 0.4 : 1 }}
                        onClick={() => toggleUserDisabled(u)}
                        disabled={Number(u.id) === currentUserId}
                      >
                        {u.is_disabled ? "Enable" : "Disable"}
                      </button>
                      <button style={{ ...mkBtn("danger"), padding:"4px 8px", fontSize:10, opacity: Number(u.id) === currentUserId ? 0.55 : 1 }} onClick={() => deleteUser(u.id)} disabled={Number(u.id) === currentUserId}>Delete</button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* CUSTOMER LIST & MANAGEMENT */}
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <Sec c="Customer Management"/>
              <div style={{ display:"flex", gap:6 }}>
                <button style={{ ...mkBtn("blue"), padding:"4px 8px", fontSize:10 }} onClick={() => { if (selectedCust) setEditingCustomer(selectedCust); }} disabled={!selectedCust}>Edit</button>
                <button style={{ ...mkBtn("danger"), padding:"4px 8px", fontSize:10 }} onClick={() => { if (selectedCust) handleDeleteCustomer(selectedCust.id); }} disabled={!selectedCust}>Delete</button>
              </div>
            </div>
            <div style={{ position:"relative", marginBottom:8 }}>
              <input
                type="text"
                style={{ ...inp, width:"100%", paddingRight:30 }}
                placeholder="Search by name or account #..."
                value={custSearch}
                onChange={(e) => setCustSearch(e.target.value)}
              />
              {custSearch && (
                <button
                  type="button"
                  onClick={() => setCustSearch("")}
                  aria-label="Clear search"
                  style={{
                    position:"absolute",
                    right:8,
                    top:"50%",
                    transform:"translateY(-50%)",
                    width:18,
                    height:18,
                    border:"none",
                    borderRadius:"50%",
                    cursor:"pointer",
                    background:C.bdr,
                    color:C.txt,
                    fontSize:11,
                    fontWeight:800,
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    lineHeight:1
                  }}
                >
                  x
                </button>
              )}
            </div>
            <select style={{...sel, width:"100%", marginBottom:12}} value={selectedCustId || ""} onChange={(e) => setSelectedCustId(e.target.value ? parseInt(e.target.value) : null)}>
              <option value="">-- Select a customer --</option>
              {customerDropdownOptions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {selectedCust && (
              <div style={{ background:C.surL, border:`1px solid ${C.bdr}`, borderRadius:8, padding:12 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:12, marginBottom:8 }}>
                  {selectedCust.account_num && <div><strong>Account #:</strong> {selectedCust.account_num}</div>}
                  {selectedCust.industry && <div><strong>Industry:</strong> {selectedCust.industry}</div>}
                  {selectedCust.billing_address && <div><strong>Address:</strong> {selectedCust.billing_address}</div>}
                  {selectedCust.website && <div><strong>Website:</strong> {selectedCust.website}</div>}
                  {selectedCust.payment_terms && <div><strong>Terms:</strong> {selectedCust.payment_terms}</div>}
                </div>
                {selectedCust.notes && <div style={{ fontSize:11, color:C.txtM, fontStyle:"italic" }}>Notes: {selectedCust.notes}</div>}
              </div>
            )}
          </div>

          {/* CREATE FORM & SETTINGS */}
          <div style={{ display: "flex", flexDirection:"column", gap:20 }}>
            <div style={{ background:C.sur, border:`1.5px dashed ${C.bdr}`, borderRadius:10, padding:20 }}>
              <Sec c={editingCustomer ? "Edit Customer" : "Add New Customer"}/>
              <form onSubmit={editingCustomer ? handleEditCustomer : handleAddCustomer} style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div>
                  <Lbl c="CUSTOMER NAME"/>
                  <input 
                    id="customer-name"
                    name="name"
                    type="text"
                    style={inp} 
                    value={editingCustomer ? editingCustomer.name : newCustomer.name} 
                    onChange={e => editingCustomer ? setEditingCustomer({...editingCustomer, name: e.target.value}) : setNewCustomer(p=>({...p, name: e.target.value}))} 
                    required 
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <Lbl c="BILLING ADDRESS"/>
                  <input 
                    id="customer-address"
                    name="billing_address"
                    type="text"
                    style={inp} 
                    value={editingCustomer ? editingCustomer.billing_address : newCustomer.billing_address} 
                    onChange={e => editingCustomer ? setEditingCustomer({...editingCustomer, billing_address: e.target.value}) : setNewCustomer(p=>({...p, billing_address: e.target.value}))} 
                    placeholder="Enter billing address"
                  />
                </div>
                <div>
                  <Lbl c="WEBSITE"/>
                  <input 
                    id="customer-website"
                    name="website"
                    type="text"
                    style={inp} 
                    value={editingCustomer ? editingCustomer.website : newCustomer.website} 
                    onChange={e => editingCustomer ? setEditingCustomer({...editingCustomer, website: e.target.value}) : setNewCustomer(p=>({...p, website: e.target.value}))} 
                    placeholder="www.example.com"
                  />
                </div>
                <div>
                  <Lbl c="INDUSTRY"/>
                  <input 
                    id="customer-industry"
                    name="industry"
                    type="text"
                    style={inp} 
                    value={editingCustomer ? editingCustomer.industry : newCustomer.industry} 
                    onChange={e => editingCustomer ? setEditingCustomer({...editingCustomer, industry: e.target.value}) : setNewCustomer(p=>({...p, industry: e.target.value}))} 
                    placeholder="e.g., Manufacturing, Construction"
                  />
                </div>
                <div>
                  <Lbl c="PAYMENT TERMS"/>
                  <input 
                    id="customer-payment-terms"
                    name="payment_terms"
                    type="text"
                    style={inp} 
                    value={editingCustomer ? editingCustomer.payment_terms : newCustomer.payment_terms} 
                    onChange={e => editingCustomer ? setEditingCustomer({...editingCustomer, payment_terms: e.target.value}) : setNewCustomer(p=>({...p, payment_terms: e.target.value}))} 
                    placeholder="e.g., Net 30, Net 45"
                  />
                </div>
                <div>
                  <Lbl c="ACCOUNT NUMBER"/>
                  <input 
                    id="customer-account-num"
                    name="account_num"
                    type="text"
                    style={inp} 
                    value={editingCustomer ? editingCustomer.account_num : newCustomer.account_num} 
                    onChange={e => editingCustomer ? setEditingCustomer({...editingCustomer, account_num: e.target.value}) : setNewCustomer(p=>({...p, account_num: e.target.value}))} 
                    placeholder="Internal account number"
                  />
                </div>
                <div>
                  <Lbl c="NOTES"/>
                  <textarea 
                    id="customer-notes"
                    name="notes"
                    style={{...inp, minHeight: 60, fontFamily: "inherit", resize: "vertical"}} 
                    value={editingCustomer ? editingCustomer.notes : newCustomer.notes} 
                    onChange={e => editingCustomer ? setEditingCustomer({...editingCustomer, notes: e.target.value}) : setNewCustomer(p=>({...p, notes: e.target.value}))} 
                    placeholder="Internal notes about this customer"
                  />
                </div>
                {custFormErr && <div style={{ fontSize:12, color:C.red, fontWeight:600 }}>⚠ {custFormErr}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" style={{ ...mkBtn("primary"), flex:1, justifyContent:"center", padding:"10px", marginTop:6 }}>{editingCustomer ? "Update Customer" : "Add Customer"}</button>
                  {editingCustomer && <button type="button" onClick={() => setEditingCustomer(null)} style={{ ...mkBtn("ghost"), flex:1, justifyContent:"center", padding:"10px", marginTop:6 }}>Cancel</button>}
                </div>
              </form>
            </div>

            <div style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:10, padding:20 }}>
              <Sec c="Company Profile"/>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div>
                  <Lbl c="COMPANY NAME"/>
                  <input id="company-name" name="companyName" type="text" style={inp} value={companyInfo.name} onChange={e=>setCompanyInfo({...companyInfo, name:e.target.value})}/>
                </div>
                <div>
                  <Lbl c="ADDRESS"/>
                  <input id="company-address" name="companyAddress" type="text" style={inp} value={companyInfo.address} onChange={e=>setCompanyInfo({...companyInfo, address:e.target.value})}/>
                </div>
                <div>
                  <Lbl c="SERVICES DESCRIPTION"/>
                  <input id="company-services" name="companyServices" type="text" style={inp} value={companyInfo.services} onChange={e=>setCompanyInfo({...companyInfo, services:e.target.value})}/>
                </div>
                <div>
                  <Lbl c="COMPANY LOGO (OPTIONAL)"/>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:4 }}>
                    {companyInfo.logoSrc ? (
                      <div style={{ position:"relative" }}>
                        <img src={companyInfo.logoSrc} alt="Logo" style={{ height:40, width:"auto", borderRadius:4, border:`1px solid ${C.bdr}` }}/>
                        <button type="button" onClick={()=>setCompanyInfo({...companyInfo, logoSrc:null})} style={{ position:"absolute", top:-6, right:-6, background:C.red, color:"#fff", border:"none", borderRadius:"50%", width:16, height:16, fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", paddingBottom:2 }}>×</button>
                      </div>
                    ) : (
                      <div style={{ width:40, height:40, background:C.bg, border:`1px dashed ${C.bdr}`, display:"flex", alignItems:"center", justifyContent:"center", color:C.txtS, fontSize:10, borderRadius:6 }}>Logo</div>
                    )}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ fontSize:12, maxWidth:180 }}/>
                  </div>
                </div>
              </div>
                <button onClick={handleSaveCompanyInfo} style={{ ...mkBtn("primary"), width:"100%", justifyContent:"center", padding:"10px", marginTop:16 }}>Save Company Profile</button>
            </div>

            <div style={{ background:C.sur, border:`1.5px dashed ${C.bdr}`, borderRadius:10, padding:20 }}>
              <Sec c="Add New Account"/>
              <form onSubmit={handleCreateUser} style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div>
                  <Lbl c="FIRST NAME"/>
                  <input 
                    id="new-account-first-name"
                    name="first_name"
                    type="text"
                    style={inp} 
                    value={newUser.first_name} 
                    onChange={e=>setNewUser(p=>({...p,first_name:e.target.value}))}
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <Lbl c="LAST NAME"/>
                  <input 
                    id="new-account-last-name"
                    name="last_name"
                    type="text"
                    style={inp} 
                    value={newUser.last_name} 
                    onChange={e=>setNewUser(p=>({...p,last_name:e.target.value}))}
                    placeholder="Enter last name"
                  />
                </div>
                <div>
                  <Lbl c="USERNAME"/>
                  <input 
                    id="new-account-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    style={inp} 
                    value={newUser.username} 
                    onChange={e=>setNewUser(p=>({...p,username:normalizeUsername(e.target.value)}))} 
                    maxLength={16}
                    required 
                    placeholder="Enter unique username"
                  />
                </div>
                <div>
                  <Lbl c="EMAIL ADDRESS"/>
                  <input 
                    id="new-account-email"
                    name="email"
                    autoComplete="email"
                    style={inp} 
                    type="email" 
                    value={newUser.email} 
                    onChange={e=>setNewUser(p=>({...p,email:e.target.value}))} 
                    placeholder="user@shoemakerrigging.com"
                  />
                </div>
                <div>
                  <Lbl c="CELL PHONE"/>
                  <input 
                    id="new-account-cell-phone"
                    name="cell_phone"
                    type="text"
                    style={inp} 
                    value={newUser.cell_phone} 
                    onChange={e=>setNewUser(p=>({...p,cell_phone:e.target.value}))}
                    placeholder="e.g., 330-555-0101"
                  />
                </div>
                <div>
                  <Lbl c="PASSWORD"/>
                  <input 
                    id="new-account-password"
                    name="password"
                    autoComplete="new-password"
                    style={inp} 
                    type="password" 
                    value={newUser.password} 
                    onChange={e=>setNewUser(p=>({...p,password:e.target.value}))} 
                    required 
                    placeholder="Enter unique password"
                  />
                </div>
                <div>
                  <Lbl c="ROLE"/>
                  <select style={{ ...sel, width:"100%" }} value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}>
                    <option value="estimator">Estimator</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                {formErr && <div style={{ fontSize:12, color:C.red, fontWeight:600 }}>⚠ {formErr}</div>}
                <button type="submit" style={{ ...mkBtn("primary"), width:"100%", justifyContent:"center", padding:"10px", marginTop:6 }}>Create User</button>
              </form>
            </div>

            <div style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:10, padding:20, marginTop:10 }}>
              <Sec c="Admin Tasks & Todos"/>
              <form onSubmit={addTask} style={{ display:"flex", gap:8, marginBottom:16 }}>
                <input 
                  style={{ ...inp, flex:1 }} 
                  value={newTask} 
                  onChange={e=>setNewTask(e.target.value)} 
                  placeholder="Master task name..."
                />
                <button type="submit" style={{ ...mkBtn("blue"), padding:"0 16px" }}>Add Task</button>
              </form>
              <div style={{ display:"flex", flexDirection:"column", gap:12, maxHeight:400, overflowY:"auto" }}>
                {tasks.length === 0 && <div style={{ textAlign:"center", padding:10, color:C.txtS, fontSize:13 }}>No tasks found.</div>}
                {tasks.map(t => (
                  <div key={t.id} style={{ background:t.done ? C.bg : "transparent", padding:12, borderRadius:8, border:`1px solid ${C.bdr}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: t.subnotes?.length ? 8 : 0 }}>
                      <input 
                        type="checkbox" 
                        checked={t.done} 
                        onChange={() => toggleTask(t.id, t.done)} 
                        style={{ cursor:"pointer", width:16, height:16 }}
                      />
                      <span style={{ flex:1, fontSize:14, fontWeight:600, color: t.done ? C.txtS : C.txt, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                      <button 
                        onClick={() => { const n = prompt("Enter subnote/detail:"); if(n) addSubnote(t.id, n); }}
                        style={{ background:"none", border:"none", color:C.blue, fontSize:11, cursor:"pointer", fontWeight:700 }}
                      >+ Detail</button>
                      <button onClick={() => delTask(t.id)} style={{ padding:0, border:"none", background:"transparent", color:C.red, cursor:"pointer", fontSize:12 }}>✕</button>
                    </div>
                    {t.subnotes && t.subnotes.length > 0 && (
                      <div style={{ paddingLeft:26, display:"flex", flexDirection:"column", gap:4 }}>
                        {t.subnotes.map((sub, idx) => (
                          <div key={idx} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:C.txtM }}>
                            <span style={{ color:C.acc }}>•</span>
                            <span style={{ flex:1 }}>{sub}</span>
                            <button onClick={() => delSubnote(t.id, idx)} style={{ background:"none", border:"none", color:C.txtS, cursor:"pointer", fontSize:10 }}>delete</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:10, padding:20, marginTop:10 }}>
              <Sec c="Database Maintenance"/>
              <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                <div style={{ fontSize:28 }}>📦</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>Full System Backup</div>
                  <div style={{ fontSize:12, color:C.txtM, marginBottom:4, lineHeight:1.4 }}>Generates a complete MySQL dump with a date-time stamp. Recommended before making large configuration changes.</div>
                  <div style={{ fontSize:11, color:C.txtS, marginBottom:12 }}>Includes: Users, Quotes, Customers, and Equipment rates.</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button 
                      style={{ ...mkBtn("won"), padding:"10px 18px", fontSize:13, gap:8 }}
                      onClick={handleBackup}
                    >
                      📥 Create Database Backup
                    </button>
                    <button 
                      style={{ ...mkBtn("ghost"), padding:"10px 18px", fontSize:13, gap:8, border:`1px solid ${C.bdr}` }}
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/admin/export-excel", { headers: { 'Authorization': `Bearer ${token}` } });
                          if (!res.ok) throw new Error("Export failed");
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          let filename = `rigpro_export_${new Date().toISOString().slice(0,10)}.xlsx`;
                          a.download = filename;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (e) {
                          console.error(e);
                          alert("Failed to export Excel file.");
                        }
                      }}
                    >
                      📊 Export to Excel
                    </button>
                    <div style={{ position: "relative" }}>
                      <input 
                         type="file" 
                         accept=".xlsx"
                         title="Import from Excel"
                         style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0, cursor: "pointer" }}
                         onChange={async (e) => {
                           const file = e.target.files[0];
                           if (!file) return;
                           if (!window.confirm("DANGER: You are about to restore the system data directly from this Excel file. This will overwrite existing database records! Proceed?")) {
                             e.target.value = "";
                             return;
                           }
                           const formData = new FormData();
                           formData.append("file", file);
                           try {
                             const res = await fetch("/api/admin/import-excel", {
                               method: "POST",
                               headers: { 'Authorization': `Bearer ${token}` },
                               body: formData
                             });
                             if (!res.ok) {
                               const data = await res.json();
                               throw new Error(data.error || "Import failed");
                             }
                             alert("Excel data successfully imported. The system will now reload to apply changes.");
                             window.location.reload();
                           } catch (err) {
                             console.error("Import error:", err);
                             alert("Failed to import Excel file: " + err.message);
                           } finally {
                             e.target.value = "";
                           }
                         }}
                      />
                      <button 
                        style={{ ...mkBtn("danger"), padding:"10px 18px", fontSize:13, gap:8, border:`1px solid ${C.redBdr}` }}
                      >
                        📤 Import from Excel
                      </button>
                    </div>
                  </div>


                </div>
              </div>
            </div>

            <div style={{ background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:10, padding:20, marginTop:10 }}>
              <Sec c="System Recovery"/>
              <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                <div style={{ fontSize:28 }}>🛠️</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>Restore from Archive</div>
                  <div style={{ fontSize:12, color:C.red, marginBottom:8, lineHeight:1.4, fontWeight:600 }}>CAUTION: Restoration will overwrite ALL live data. Choose a recovery point carefully.</div>
                  <button 
                    style={{ ...mkBtn("danger"), padding:"12px 20px", fontSize:14, gap:8, fontWeight:800 }}
                    onClick={() => { 
                      setShowBackupList(true); 
                      loadBackups(); 
                    }}
                  >
                    🕒 Browse Recovery Points
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* VECTOR DB SECTION */}
        {showVectorDB && <VectorBrowser token={token} />}

        {/* DATA BROWSER SECTION */}
        <DatabaseBrowser token={token} />

        {/* EDIT USER MODAL */}
        {editingUser && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:10001, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
            <div style={{ background:C.sur, width:"100%", maxWidth:520, borderRadius:12, padding:24, boxShadow:"0 20px 60px rgba(0,0,0,0.35)", border:`1.5px solid ${C.bdr}` }}>
              <div className="app-modal-title" style={{ fontSize:18, fontWeight:800, color:C.acc, marginBottom:14 }}>Edit Account</div>
              <form onSubmit={handleEditUser} style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div>
                    <Lbl c="FIRST NAME"/>
                    <input id="edit-account-first-name" name="first_name" type="text" style={inp} value={editingUser.first_name || ""} onChange={e=>setEditingUser({...editingUser, first_name:e.target.value})} />
                  </div>
                  <div>
                    <Lbl c="LAST NAME"/>
                    <input id="edit-account-last-name" name="last_name" type="text" style={inp} value={editingUser.last_name || ""} onChange={e=>setEditingUser({...editingUser, last_name:e.target.value})} />
                  </div>
                </div>
                <div>
                  <Lbl c="USERNAME"/>
                  <input id="edit-account-username" name="username" type="text" style={inp} value={editingUser.username || ""} onChange={e=>setEditingUser({...editingUser, username:normalizeUsername(e.target.value)})} maxLength={16} required />
                  <div style={{ fontSize:11, marginTop:4, color:editUsernameInvalid ? C.red : C.txtS }}>{USERNAME_RULE_TEXT}</div>
                </div>
                <div>
                  <Lbl c="EMAIL"/>
                  <input id="edit-account-email" name="email" autoComplete="email" type="email" style={inp} value={editingUser.email || ""} onChange={e=>setEditingUser({...editingUser, email:e.target.value})} />
                </div>
                <div>
                  <Lbl c="CELL PHONE"/>
                  <input id="edit-account-cell-phone" name="cell_phone" type="text" style={inp} value={editingUser.cell_phone || ""} onChange={e=>setEditingUser({...editingUser, cell_phone:e.target.value})} />
                </div>
                <div>
                  <Lbl c="ROLE"/>
                  <select style={{ ...sel, width:"100%" }} value={editingUser.role} onChange={e=>setEditingUser({...editingUser, role:e.target.value})}>
                    <option value="estimator">Estimator</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <Lbl c="PASSWORD (leave blank to keep current)"/>
                  <input id="edit-account-password" name="password" autoComplete="new-password" type="password" style={inp} value={editingUser.password || ""} onChange={e=>setEditingUser({...editingUser, password:e.target.value})} placeholder="Leave blank to keep current password" />
                </div>
                {formErr && <div style={{ fontSize:12, color:C.red, fontWeight:600 }}>⚠ {formErr}</div>}
                <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:4 }}>
                  <button type="button" style={{ ...mkBtn("ghost"), padding:"8px 14px" }} onClick={() => setEditingUser(null)}>Cancel</button>
                  <button type="submit" style={{ ...mkBtn("primary"), padding:"8px 18px", opacity: editUsernameInvalid ? 0.6 : 1 }} disabled={editUsernameInvalid}>Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* CUSTOM CONFIRM DIALOG */}
        {confirm && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
            <div style={{ background:C.sur, width:"100%", maxWidth:450, borderRadius:12, padding:24, boxShadow:"0 20px 60px rgba(0,0,0,0.4)", border:`1.5px solid ${C.bdr}` }}>
              <div style={{ fontSize:18, fontWeight:800, color:C.red, marginBottom:12 }}>{confirm.title}</div>
              <div style={{ fontSize:14, color:C.txtM, lineHeight:1.5, marginBottom:24 }}>{confirm.msg}</div>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
                <button style={{ ...mkBtn("bg"), padding:"8px 16px" }} onClick={()=>setConfirm(null)}>Cancel</button>
                <button style={{ ...mkBtn("danger"), padding:"8px 20px", fontWeight:800 }} onClick={confirm.onOk}>{confirm.btn || "Confirm"}</button>
              </div>
            </div>
          </div>
        )}

        {/* BACKUP LIST DIALOG */}
        {showBackupList && (
          <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.6)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
            <div style={{ background:C.sur, width:"100%", maxWidth:600, borderRadius:12, overflow:"hidden", border:`1px solid ${C.bdr}`, boxShadow:"0 20px 50px rgba(0,0,0,0.3)" }}>
              <div style={{ padding:"16px 20px", background:C.bg, borderBottom:`1px solid ${C.bdr}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontWeight:800, fontSize:16, color:C.acc }}>System Backup Archive</div>
                <button onClick={() => setShowBackupList(false)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer" }}>✕</button>
              </div>
              <div style={{ padding:20, maxHeight:400, overflowY:"auto" }}>
                <div style={{ fontSize:12, color:C.txtS, marginBottom:16 }}>The system maintains up to 5 automated backups. Older snapshots are rotated out automatically.</div>
                
                {/* Manual Browse Directory Interface */}
                <div style={{ marginBottom: 20, padding: 12, background: C.accL, borderRadius: 8, border: `1px solid ${C.accB}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.acc, marginBottom: 8 }}>Manually Browse for Backup File:</div>
                  <input 
                     type="file" 
                     accept=".sql" 
                     onChange={(e) => {
                       const file = e.target.files[0];
                       if (!file) return;
                       const reader = new FileReader();
                       reader.onload = async (ev) => {
                         const sql = ev.target.result;
                         if (!window.confirm(`DANGER: Restore system using ${file.name}?\n\nThis will completely overwrite all current database records.`)) return;
                         try {
                           const req = await fetch("/api/admin/restore", {
                             method: "POST",
                             headers: { 'Content-Type': 'application/sql', 'Authorization': `Bearer ${token}` },
                             body: sql
                           });
                           if (!req.ok) throw new Error("Restore failed");
                           alert("Database restored successfully. The application will now reload.");
                           window.location.reload();
                         } catch (error) {
                           alert("Failed to restore from file: " + error.message);
                         }
                       };
                       reader.readAsText(file);
                     }}
                     style={{ fontSize: 13 }}
                  />
                  <div style={{ fontSize: 11, color: C.txtM, marginTop: 4 }}>Works natively on Mac and Windows directory browsers. (Max 50MB)</div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: C.txt, marginBottom: 8 }}>Local Server Backups:</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {localBackups.length === 0 && <div style={{ textAlign:"center", padding:40, color:C.txtS }}>No local backups found.</div>}
                  {localBackups.map(b => (
                    <div key={b.filename} style={{ display:"flex", alignItems:"center", gap:12, padding:12, background:C.bg, borderRadius:8, border:`1px solid ${C.bdr}` }}>
                      <input 
                        type="checkbox" 
                        checked={selectedBackups.includes(b.filename)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedBackups([...selectedBackups, b.filename]);
                          else setSelectedBackups(selectedBackups.filter(f => f !== b.filename));
                        }}
                      />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:C.acc }}>{new Date(b.createdAt).toLocaleDateString()} at {new Date(b.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        <div style={{ fontSize:10, color:C.txtS, fontFamily:"monospace" }}>ID: {b.filename} • {(b.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <button 
                        onClick={() => restoreLocalBackup(b.filename)} 
                        style={{ ...mkBtn("danger"), padding:"6px 12px", fontSize:11, borderRadius:6 }}
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding:"16px 20px", borderTop:`1px solid ${C.bdr}`, display:"flex", justifyContent:"space-between" }}>
                <button onClick={() => setShowBackupList(false)} style={{ ...mkBtn("bg"), padding:"8px 16px" }}>Close</button>
                <button 
                  onClick={deleteSelectedBackups} 
                  disabled={selectedBackups.length === 0}
                  style={{ ...mkBtn(selectedBackups.length ? "danger" : "bg"), padding:"8px 16px", opacity: selectedBackups.length ? 1 : 0.5 }}
                >
                  Delete Selected ({selectedBackups.length})
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ borderTop:`1px solid ${C.bdr}`, paddingTop:20, marginTop:10 }}>
          <div style={{ background:C.accL, border:`1px solid ${C.accB}`, padding:16, borderRadius:8 }}>
            <div style={{ fontWeight:700, marginBottom:8, color:C.acc }}> Security Tip</div>
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
  const [view,       setView]       = useState(localStorage.getItem("token") ? "dash" : "landing");
  const [rfqStageFilter, setRfqStageFilter] = useState("all");
  const [appUsers,   setAppUsers]   = useState([]);
  const [jobs,       setJobs]       = useState([]);
  const [reqs,       setReqs]       = useState(SAMPLE_REQS);
  const [dbStatus,   setDbStatus]   = useState("Local Mode");
  const [active,     setActive]     = useState(null);
  const [selC,       setSelC]       = useState(null);
  const [search,     setSearch]     = useState("");
  const [showRM,     setShowRM]     = useState(false);
  const [editR,      setEditR]      = useState(null);
  const [showWM,       setShowWM]       = useState(false);
  const [showDiscModal,setShowDiscModal] = useState(false);
  const [showCustDoc,  setShowCustDoc]  = useState(false);
  const [attachModal,  setAttachModal]  = useState(null); // { job } for viewing all attachments
  const [adjModal,     setAdjModal]     = useState(null);  // quote to adjust
  const [deadModal,    setDeadModal]    = useState(null);  // {type:"rfq"|"quote", item}
  const [dashReportId, setDashReportId] = useState(null); // report to open when navigating from dashboard
  const [wonOnly,      setWonOnly]      = useState(false); // filter customers view
  const [custView,     setCustView]     = useState("list"); // "list" or "card"
  const [jobListFilter, setJobListFilter] = useState(null); // customer name to filter Master Jobs list
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [customerRates, setCustomerRates] = useState(INIT_CUSTOMER_RATES);
  const [baseLabor,     setBaseLabor]     = useState(DEFAULT_LABOR);
  const [equipment,     setEquipment]     = useState(EQUIPMENT);
  const eqMap  = useMemo(() => { const m={}; equipment.forEach(e=>{m[e.code]=e;}); return m; }, [equipment]);
  const eqCats = useMemo(() => [...new Set(equipment.map(e=>e.category))], [equipment]);
  const [eqOv,       setEqOv]       = useState({});
  const [custData,         setCustData]         = useState(INIT_CUST_DATA);
  const [showCustModal,    setShowCustModal]    = useState(false);
  const [profileTemplate,  setProfileTemplate]  = useState(DEFAULT_PROFILE_TEMPLATE);
  const [showProfileTempl, setShowProfileTempl] = useState(false);
  const [custFilter, setCustFilter] = useState("all"); // all | prospects | customers
  const [globalCheck, setGlobalCheck] = useState([
    { id:1, label:"Job Site Walk-through" },
    { id:2, label:"Safety Plan Reviewed" },
    { id:3, label:"Permits Verified" },
    { id:4, label:"Crane Placement Layout" },
    { id:5, label:"COI Required" },
    { id:6, label:"Bid Bond Required" },
    { id:7, label:"Safety Orientation Required" },
  ]);
  const [perDiemRate, setPerDiemRate] = useState(DEFAULT_PER_DIEM);
  const [hotelRate,   setHotelRate]   = useState(DEFAULT_HOTEL);
  const [companyInfo, setCompanyInfo] = useState(() => {
    const s = localStorage.getItem("rigpro_company");
    return s ? JSON.parse(s) : DEFAULT_COMPANY;
  });
  useEffect(() => { localStorage.setItem("rigpro_company", JSON.stringify(companyInfo)); }, [companyInfo]);
  const [liftTonThreshold, setLiftTonThreshold] = useState(10);
  const [jobFolders, setJobFolders] = useState({});
  const [showJFM,    setShowJFM]    = useState(null);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  useEffect(() => {
    if (SHOW_SYSTEM_PROMPT_BANNER && dbStatus === "MySQL Live") {
      setShowSystemPrompt(true);
      const timer = setTimeout(() => setShowSystemPrompt(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [dbStatus]);

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

  // ── DATABASE SYNCHRONIZATION ───────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      try {
        const resp = await fetch("/api/data", { headers: { 'Authorization': `Bearer ${token}` } });
        if (resp.status === 401 || resp.status === 403) {
          setToken("");
          localStorage.removeItem("token");
          setView("login");
          return;
        }
        if (!resp.ok) return;
        const data = await resp.json();

        if (data.users && Array.isArray(data.users)) setAppUsers(data.users);
        if (data.equipment) setEquipment(data.equipment);
        if (data.jobs && data.jobs.length > 0) {
          setJobs(data.jobs);
          if (data.rfqs) setReqs(data.rfqs);
          if (data.customers) setCustData(data.customers);
          setDbStatus("MySQL Live");
        } else if (role === "admin") {
          // Automatic system prompting to migrate data if DB is empty
          console.log("[System Prompt] Migrating local data to MySQL...");
          setDbStatus("Initializing MySQL...");
          const initRes = await fetch("/api/admin/init", {
            method: "POST",
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ 
              jobs: SAMPLE_QUOTES, 
              rfqs: SAMPLE_REQS, 
              customers: INIT_CUST_DATA 
            })
          });
          if (initRes.ok) {
            localStorage.setItem("rigpro_db_seeded", "true");
            const r2 = await fetch("/api/data", { headers: { 'Authorization': `Bearer ${token}` } });
            const d2 = await r2.json();
            setJobs(d2.jobs);
            setReqs(d2.rfqs);
            setCustData(d2.customers);
            if (d2.users) setAppUsers(d2.users);
            setDbStatus("MySQL Live");
          }
        }
      } catch (e) {
        console.error("DB Sync error:", e);
      }
    };
    loadData();
  }, [token, role]);

  const stats = useMemo(() => {
    return {
      rev:  jobs.reduce((s,q)=>s+(parseFloat(q.total_billings)||0),0),
      pipe: 0,
      wr:   100,
      rn:   reqs.filter(r=>r.status==="New").length,
    };
  }, [jobs, reqs]);

  const customers = useMemo(() => {
    const qList = jobs; 
    const m = {};
    // Build from jobs first using 'client' (mismatch with jobs key, aliased in server.js)
    qList.forEach(q => { if(q.client){ if(!m[q.client]) m[q.client]={name:q.client,jobs:[]}; m[q.client].jobs.push(q); } });
    // Also include any custData entries that have no jobs yet (new prospects)
    Object.keys(custData).forEach(name => { if(!m[name]) m[name]={name,jobs:[]}; });
    return Object.values(m)
      .map(c => ({ ...c, isProspect: c.jobs.length === 0 }))
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [jobs, custData]);

  function openNew(req=null, isCO=false, parentQ=null) {
    setActive(blankQuote(req, customerRates, isCO, parentQ));
    setView("editor");
  }

  function openEdit(q) {
    const full = q.laborRows ? { ...q } : {
      ...q, markup:q.markup||0,
      laborRows:    defLaborRows(q.client, customerRates),
      travelRows:   [{ id:uid(), label:"First Mobilization", workers:0, days:0, perDiem:false, hotel:false }],
      travelOther:  0,
      liftPlanRequired: false,
      maxLiftTons: "",
      markupCostOnly: false,
      discounts:  [],
      subRows:    [],
      permitRows: [],
      equipRows:    [],
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
    setJobs(prev => prev.map(q =>
      q.id === quoteId
        ? { ...q, salesAdjustments: [...(q.salesAdjustments||[]), adj] }
        : q
    ));
  }

  function saveQuote(opts={}) {
    const cv  = calcQuote(active, customerRates, eqOv, eqMap, baseLabor, perDiemRate, hotelRate);
    // Save Quote always preserves current status (keeps In Progress if that's where it is)
    // Unless a specific status override is passed
    const newStatus = opts.status || active.status;
    const upd = { ...active, ...cv, status: newStatus };
    if (upd.isHistorical) upd.locked = true;
    if (upd.client) {
      const newRates = {};
      (upd.laborRows||[]).forEach(r => { if(r.special) newRates[r.role]={ reg:Number(r.overReg), ot:Number(r.overOT) }; });
      if (Object.keys(newRates).length > 0) setCustomerRates(prev=>({...prev,[upd.client]:{...(prev[upd.client]||{}),...newRates}}));
    }
    setJobs(prev => { const ix=prev.findIndex(q=>q.id===upd.id); return ix>=0?prev.map((q,i)=>i===ix?upd:q):[upd,...prev]; });
    if (upd.fromReqId) {
      if (upd.status==="Dead") {
        setReqs(prev=>prev.map(r=>r.id===upd.fromReqId?{...r,status:"Dead",deadNote:upd.deadNote||"Estimate marked dead"}:r));
      } else {
        setReqs(prev=>prev.map(r=>r.id===upd.fromReqId?{...r,status:"Quoted"}:r));
      }
    }
    setView("dash");
    return upd;
  }

  function markWon(jn, cd) {
    const upd = { ...active, status:"Won", job_num:jn, compDate:cd, locked:true };
    const cv  = calcQuote(upd, customerRates, eqOv, eqMap, baseLabor, perDiemRate, hotelRate);
    const fin = { ...upd, ...cv };
    setJobs(prev => { const ix=prev.findIndex(q=>q.id===fin.id); return ix>=0?prev.map((q,i)=>i===ix?fin:q):[fin,...prev]; });
    setShowWM(false);
    setView("dash");
  }

  function submitQuote() {
    const cv  = calcQuote(active, customerRates, eqOv, eqMap, baseLabor, perDiemRate, hotelRate);
    const upd = { ...active, ...cv, status:"In Review" };
    setJobs(prev => { const ix=prev.findIndex(q=>q.id===upd.id); return ix>=0?prev.map((q,i)=>i===ix?upd:q):[upd,...prev]; });
    setNotifs(p => [{ id:uid(), qn:upd.qn, client:upd.client, total:upd.total, at:new Date().toLocaleTimeString(), status:"Pending Review" }, ...p]);
    setView("dash");
  }

  function saveReq(req) {
    setReqs(prev => { const ix=prev.findIndex(r=>r.id===req.id); return ix>=0?prev.map((r,i)=>i===ix?req:r):[req,...prev]; });
    setShowRM(false); setEditR(null);
  }

  function saveJobFolder(rfqId, folder) {
    setJobFolders(prev => ({ ...prev, [rfqId]: folder }));
    setShowJFM(null);
  }

  const u    = (f,v)       => setActive(q => ({ ...q, [f]:v }));
  const addR = (sec,def)   => setActive(q => ({ ...q, [sec]:[...(q[sec]||[]),{ id:uid(),...def }] }));
  const updR = (sec,id,f,v)=> setActive(q => ({ ...q, [sec]:q[sec].map(r=>r.id===id?{...r,[f]:v}:r) }));
  const delR = (sec,id)    => setActive(q => ({ ...q, [sec]:q[sec].filter(r=>r.id!==id) }));

  const cv      = active ? calcQuote(active, customerRates, eqOv, eqMap, baseLabor, perDiemRate, hotelRate) : null;
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

  // Force logout quickly if account becomes disabled server-side.
  useEffect(() => {
    if (!token) return;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          setToken("");
          setRole("user");
          setView("login");
        }
      } catch (_) {}
    };

    checkSession();
    const id = setInterval(checkSession, 10000);
    return () => clearInterval(id);
  }, [token]);

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
      <Footer />
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
        <Footer />
      </div>
    );
  }

  // ── ADMIN ──────────────────────────────────────────────────────────────────
  if (view==="admin" && role!=="admin") return <div style={{padding:40, color:C.red, fontWeight:700, fontSize:20}}>403 Unauthorized. Access Restricted to Administrators.</div>;
  if (view==="admin") return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} />
      <AdminPage token={token} appUsers={appUsers} setAppUsers={setAppUsers} companyInfo={companyInfo} setCompanyInfo={setCompanyInfo}/>
      <Footer />
    </div>
  );

  if (view==="investor" && role==="admin") return (
    <div style={{ minHeight: "100vh", background: "#020617" }}>
      <button 
        onClick={() => setView("admin")} 
        style={{ ...mkBtn("ghost"), position: "fixed", top: 12, left: 16, zIndex: 100, color: "#fff", background: "rgba(15, 23, 42, 0.8)", borderColor: "#475569" }}
      >
        ← Back to Admin Portal
      </button>
      <InvestorDashboard />
      <Footer />
    </div>
  );


  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  if (view==="dash") return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:C.bg, color:C.txt, fontFamily:"'Segoe UI', Roboto, Helvetica, Arial, sans-serif", fontSize:14 }}>
      {SHOW_SYSTEM_PROMPT_BANNER && showSystemPrompt && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: C.acc, color: "#fff", padding: "10px 20px", borderRadius: 30, fontWeight: 700, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>💡</span> {SYSTEM_PROMPT}
        </div>
      )}
      {showRM && <RFQModal init={editR} onSave={saveReq} appUsers={appUsers} custData={custData} setCustData={setCustData} jobs={jobs} onClose={()=>{setShowRM(false);setEditR(null);}}/>}
      {showJFM && <JobFolderModal rfq={showJFM} folder={jobFolders[showJFM.id]} globalChecklist={globalCheck} onUpdateGlobalChecklist={setGlobalCheck} onSave={saveJobFolder} onMarkDead={r=>{ setDeadModal({type:"rfq",item:r}); setShowJFM(null); }} onUpdateRfq={r=>setReqs(p=>p.map(x=>x.id===r.id?r:x))} onCreateEstimate={r=>{setShowJFM(null);openNew(r);}} appUsers={appUsers} linkedQuote={jobs.find(q=>q.fromReqId===showJFM?.id)||null} liftTonThreshold={liftTonThreshold} onClose={()=>setShowJFM(null)}/>}
      {deadModal && <MarkDeadModal
        itemType={deadModal.type==="rfq"?"RFQ":"Job"}
        itemLabel={deadModal.type==="rfq"?deadModal.item.rn+" · "+deadModal.item.company:deadModal.item.job_num+" · "+deadModal.item.client}
        onConfirm={note=>{
          if(deadModal.type==="rfq") setReqs(p=>p.map(x=>x.id===deadModal.item.id?{...x,status:"Dead",deadNote:note}:x));
          else setJobs(p=>p.map(x=>x.id===deadModal.item.id?{...x,status:"Dead",deadNote:note}:x));
          setDeadModal(null);
        }}
        onClose={()=>setDeadModal(null)}
      />}
      {showNotifs && <NotifPanel/>}
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <button style={{ ...mkBtn("ghost"), padding:"5px 9px", position:"relative" }} onClick={()=>setShowNotifs(true)}>
            🔔
            {pendN>0&&<span style={{ position:"absolute", top:-3, right:-3, background:C.red, color:"#fff", borderRadius:"50%", width:15, height:15, fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{pendN}</span>}
          </button>
          <div className="desktop-act-btns">{actBtns}</div>
        </div>
      }/>
      <div className="app-page-container" style={{ maxWidth:1160 }}>
        <style>{`
          .desktop-act-btns { display: block; }
          .mobile-act-btns { display: none; }
          @media (max-width: 767px) {
            .desktop-act-btns { display: none !important; }
            .mobile-act-btns { display: flex !important; flex-wrap: wrap; gap: 8px; margin-bottom: 15px; }
            .mobile-act-btns > div { width: 100%; display: flex; flex-direction: column; gap: 8px; }
            .mobile-act-btns button { width: 100%; justify-content: center; padding: 12px 14px !important; font-size: 15px !important; }
          }
          @media (min-width: 768px) and (max-width: 1024px) {
            .desktop-act-btns { display: none !important; }
            .mobile-act-btns { display: flex !important; margin-bottom: 12px; }
            .mobile-act-btns > div { width: 100%; display: flex; flex-wrap: wrap; gap: 8px; }
            .mobile-act-btns button { flex: 1 1 calc(50% - 8px); min-width: 190px; justify-content: center; }
          }
        `}</style>
        <div className="mobile-act-btns">{actBtns}</div>
        {SHOW_SEMANTIC_SEARCH && (
          <VectorSearchPanel
            token={token}
            setView={setView}
            C={C}
            inp={inp}
            sel={sel}
            mkBtn={mkBtn}
            Card={Card}
            Sec={Sec}
          />
        )}
        <DashboardMetrics jobs={jobs} reqs={reqs} rfqStageFilter={rfqStageFilter} setRfqStageFilter={setRfqStageFilter} onOpenReport={id=>{ setDashReportId(id); setView("reports"); }}/>
        {/* ── SALESMAN TRACKING CHARTS ─────────────────────────────────── */}
        <SalesmanCharts jobs={jobs} reqs={reqs}/>

        <RFQDashCard reqs={reqs} jobs={jobs} jobFolders={jobFolders} setJobFolders={setJobFolders} setShowJFM={setShowJFM} openNew={openNew} openEdit={openEdit} setView={setView} setDeadModal={setDeadModal} rfqStageFilter={rfqStageFilter}/>
        <RecentQuotesCard jobs={jobs} openEdit={openEdit} setView={setView}/>
      </div>
      <Footer />
    </div>
  );

  // ── CUSTOMERS ──────────────────────────────────────────────────────────────
  if (view === "customers") return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:C.bg }}>
    <CustomerCRMBoard 
      {...{
        C, fmt, mkBtn, Badge, Sec, Lbl, Card, thS, tdS, inp, sel, actBtns,
        view, setView, token, setToken, role, setRole,
        customers, custData, setCustData, CUSTOMERS,
        selC, setSelC, custView, setCustView, search, setSearch, wonOnly, setWonOnly, custFilter, setCustFilter,
        jobs, reqs, jobFolders, showCustModal, setShowCustModal, adjModal, setAdjModal, showSearchModal, setShowSearchModal,
        showRM, setShowRM, setEditR, editR, saveReq, saveAdjustment, saveJobFolder,
        showJFM, setShowJFM, deadModal, setDeadModal,
        profileTemplate, showProfileTempl, setShowProfileTempl,
        openEdit, openNew, liftTonThreshold, globalCheck, setGlobalCheck, appUsers,
        setReqs, setJobs, jobListFilter, setJobListFilter,
        Header, RFQModal, JobFolderModal, MarkDeadModal, CustomerModal, SearchResultsModal, SalesAdjustmentModal, ProfileTemplateModal
      }}
    />
    <Footer />
    </div>
  );

  // ── RFQs ───────────────────────────────────────────────────────────────
  if (view==="rfqs") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI', Roboto, Helvetica, Arial, sans-serif", fontSize:14 }}>
      {showRM && <RFQModal init={editR} onSave={saveReq} appUsers={appUsers} custData={custData} setCustData={setCustData} jobs={jobs} onClose={()=>{setShowRM(false);setEditR(null);}}/>}
      {showJFM && <JobFolderModal rfq={showJFM} folder={jobFolders[showJFM.id]} globalChecklist={globalCheck} onUpdateGlobalChecklist={setGlobalCheck} onSave={saveJobFolder} onMarkDead={r=>{ setDeadModal({type:"rfq",item:r}); setShowJFM(null); }} onUpdateRfq={r=>setReqs(p=>p.map(x=>x.id===r.id?r:x))} onCreateEstimate={r=>{setShowJFM(null);openNew(r);}} appUsers={appUsers} linkedQuote={jobs.find(q=>q.fromReqId===showJFM?.id)||null} liftTonThreshold={liftTonThreshold} onClose={()=>setShowJFM(null)}/>}
      {deadModal && <MarkDeadModal
        itemType={deadModal.type==="rfq"?"RFQ":"Job"}
        itemLabel={deadModal.type==="rfq"?deadModal.item.rn+" · "+deadModal.item.company:deadModal.item.job_num+" · "+deadModal.item.client}
        onConfirm={note=>{
          if(deadModal.type==="rfq") setReqs(p=>p.map(x=>x.id===deadModal.item.id?{...x,status:"Dead",deadNote:note}:x));
          else setJobs(p=>p.map(x=>x.id===deadModal.item.id?{...x,status:"Dead",deadNote:note}:x));
          setDeadModal(null);
        }}
        onClose={()=>setDeadModal(null)}
      />}
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={actBtns}/>
      <div className="app-page-container" style={{ maxWidth:1160 }}>
        <RFQListView reqs={reqs} jobs={jobs} setReqs={setReqs} openNew={openNew} setShowJFM={setShowJFM} setEditR={setEditR} setShowRM={setShowRM} setDeadModal={setDeadModal}/>
      </div>
      <Footer />
    </div>
  );

  // ── EQUIPMENT RATES ────────────────────────────────────────────────────────
  if (view==="equipment") return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={actBtns}/>
      <EquipmentPage equipment={equipment} setEquipment={setEquipment} eqCats={eqCats} eqMap={eqMap} eqOv={eqOv} setEqOv={setEqOv} role={role}/>
      <Footer />
    </div>
  );

  // ── LABOR RATES ────────────────────────────────────────────────────────────
  if (view==="labor") return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={actBtns}/>
      <LaborRatesPage customerRates={customerRates} setCustomerRates={setCustomerRates} role={role} baseLabor={baseLabor} setBaseLabor={setBaseLabor}/>
      <Footer />
    </div>
  );

  // ── CALENDAR ──────────────────────────────────────────────────────────────
  // ── MASTER JOB LIST ──────────────────────────────────────────────────────────
  if (view==="jobs") return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={actBtns}/>
      {showJFM && <JobFolderModal rfq={showJFM} folder={jobFolders[showJFM.id]} globalChecklist={globalCheck} onUpdateGlobalChecklist={setGlobalCheck} onSave={saveJobFolder} onMarkDead={r=>{ setDeadModal({type:"rfq",item:r}); setShowJFM(null); }} onUpdateRfq={r=>setReqs(p=>p.map(x=>x.id===r.id?r:x))} onCreateEstimate={r=>{setShowJFM(null);openNew(r);}} appUsers={appUsers} linkedQuote={jobs.find(q=>q.fromReqId===showJFM?.id)||null} liftTonThreshold={liftTonThreshold} onClose={()=>setShowJFM(null)}/>}
      {deadModal && <MarkDeadModal itemType={deadModal.type==="rfq"?"RFQ":"Job"} itemLabel={deadModal.type==="rfq"?deadModal.item.rn+" · "+deadModal.item.company:deadModal.item.job_num+" · "+deadModal.item.client} onConfirm={note=>{ if(deadModal.type==="rfq") setReqs(p=>p.map(x=>x.id===deadModal.item.id?{...x,status:"Dead",deadNote:note}:x)); else setJobs(p=>p.map(x=>x.id===deadModal.item.id?{...x,status:"Dead",deadNote:note}:x)); setDeadModal(null); }} onClose={()=>setDeadModal(null)}/>}
      <MasterJobList
        jobs={jobs} reqs={reqs} jobFolders={jobFolders} openEdit={openEdit} setShowJFM={setShowJFM}
        onUpdateJobNum={(id, num) => setJobs(p=>p.map(q=>q.id===id?{...q,job_num:num}:q))}
        onViewAttachments={j=>setAttachModal(j)}
        jobListFilter={jobListFilter} setJobListFilter={setJobListFilter} setView={setView}
      />
      {attachModal && (
        <div className="app-modal-overlay" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:600, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 12px", overflowY:"auto" }}>
          <div className="app-modal-panel" style={{ background:C.sur, borderRadius:12, width:"100%", maxWidth:640, boxShadow:"0 16px 48px rgba(0,0,0,.28)" }}>
            <div style={{ padding:"16px 22px", borderBottom:`1px solid ${C.bdr}`, background:C.accL, borderTopLeftRadius:12, borderTopRightRadius:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:10, color:C.acc, fontWeight:800, textTransform:"uppercase", letterSpacing:1 }}>Attachments</div>
                <div style={{ fontSize:17, fontWeight:700, marginTop:2 }}>{attachModal.jobNum||attachModal.quoteNum} · {attachModal.client}</div>
              </div>
              <button className="app-modal-close" onClick={()=>setAttachModal(null)} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:C.txtS }}>×</button>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:14 }}>
              {attachModal.attachments?.length>0 && (
                <div>
                  <div style={{ fontSize:10, color:C.acc, fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Quote Attachments</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {attachModal.attachments.map((a,i)=>(
                      <div key={i} style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:6, padding:"6px 12px", fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
                        📎 {a.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {attachModal.folderAttachments?.length>0 && (
                <div>
                  <div style={{ fontSize:10, color:C.blue, fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Job Folder Attachments</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {attachModal.folderAttachments.map((a,i)=>(
                      <div key={i} style={{ background:C.bluB, border:`1px solid ${C.bluBdr}`, borderRadius:6, padding:"6px 12px", fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
                        📁 {a.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(!attachModal.attachments?.length && !attachModal.folderAttachments?.length) && (
                <div style={{ textAlign:"center", color:C.txtS, padding:"20px 0" }}>No attachments on record.</div>
              )}
            </div>
            <div className="app-modal-actions" style={{ padding:"12px 22px", borderTop:`1px solid ${C.bdr}`, background:C.bg, borderBottomLeftRadius:12, borderBottomRightRadius:12, display:"flex", gap:8, justifyContent:"space-between" }}>
              <div style={{ display:"flex", gap:8 }}>
                {attachModal.rfq && <button style={{ ...mkBtn("outline"), fontSize:11, padding:"5px 12px" }} onClick={()=>{ setAttachModal(null); setShowJFM(attachModal.rfq); }}>Open Job Folder</button>}
                <button style={{ ...mkBtn("ghost"), fontSize:11, padding:"5px 12px" }} onClick={()=>{ setAttachModal(null); openEdit(attachModal.quote); }}>Open Estimate</button>
              </div>
              <button style={mkBtn("ghost")} onClick={()=>setAttachModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (view==="calendar") return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={actBtns}/>
      <CalendarPage jobs={jobs} setJobs={setJobs} eqMap={eqMap} onOpenQuote={q=>{ openEdit(q); setView("editor"); }}/>
      <Footer />
    </div>
  );

  // ── REPORTS ───────────────────────────────────────────────────────────────
  if (view==="reports") return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14, overflowX:"auto" }}>
      <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} extra={actBtns}/>
      <ReportsPage
        jobs={jobs}
        reqs={reqs}
        role={role}
        username={token}
        jobFolders={jobFolders}
        globalCheck={globalCheck}
        initialReportId={dashReportId}
        onOpenQuote={q=>{ openEdit(q); setView("editor"); }}
        onOpenJobFolder={r=>setShowJFM(r)}
        onClearInitialReport={()=>setTimeout(()=>setDashReportId(null),100)}
        onBack={()=>{ setDashReportId(null); setView("dash"); }}
      />
      {showJFM && <JobFolderModal rfq={showJFM} folder={jobFolders[showJFM.id]} globalChecklist={globalCheck} onUpdateGlobalChecklist={setGlobalCheck} onSave={saveJobFolder} onMarkDead={r=>{ setDeadModal({type:"rfq",item:r}); setShowJFM(null); }} onUpdateRfq={r=>setReqs(p=>p.map(x=>x.id===r.id?r:x))} onCreateEstimate={r=>{setShowJFM(null);openNew(r);}} appUsers={appUsers} linkedQuote={jobs.find(q=>q.fromReqId===showJFM?.id)||null} liftTonThreshold={liftTonThreshold} onClose={()=>setShowJFM(null)}/>}
      {deadModal && <MarkDeadModal
        itemType={deadModal.type==="rfq"?"RFQ":"Job"}
        itemLabel={deadModal.type==="rfq"?deadModal.item.rn+" · "+deadModal.item.company:deadModal.item.job_num+" · "+deadModal.item.client}
        onConfirm={note=>{
          if(deadModal.type==="rfq") setReqs(p=>p.map(x=>x.id===deadModal.item.id?{...x,status:"Dead",deadNote:note}:x));
          else setJobs(p=>p.map(x=>x.id===deadModal.item.id?{...x,status:"Dead",deadNote:note}:x));
          setDeadModal(null);
        }}
        onClose={()=>setDeadModal(null)}
      />}
      <Footer />
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
        {/* Lift plan flag in summary */}
        {active.liftPlanRequired && (
          <div style={{ background:C.yelB, border:`1px solid ${C.yelBdr}`, borderRadius:5, padding:"5px 9px", marginBottom:6, fontSize:11, color:C.yel, fontWeight:600 }}>
            ⚠ Lift Plan Required{active.maxLiftTons?" — "+active.maxLiftTons+"T max":""}
          </div>
        )}
        {!active.liftPlanRequired && active.maxLiftTons && Number(active.maxLiftTons)>liftTonThreshold && (
          <div style={{ background:C.redB, border:`1px solid ${C.redBdr}`, borderRadius:5, padding:"5px 9px", marginBottom:6, fontSize:11, color:C.red, fontWeight:600 }}>
            ⚠ Lift exceeds {liftTonThreshold}T — Lift Plan not marked required
          </div>
        )}
        {[
          { l:"Labor",         v:cv.labor,   c:C.ora  },
          { l:"Travel & Mob.", v:cv.travel,  c:C.blue },
          { l:"Equipment",     v:cv.equip,   c:C.teal },
          { l:"Third Party Hauling", v:cv.hauling, c:C.purp },
          { l:"Subcontractors",v:cv.subs,    c:"#7c3aed" },
          { l:"Materials & Other", v:cv.mats, c:C.lime },
          { l:"Permits",       v:cv.permits, c:C.ora  },
        ].filter(x=>x.v>0).map(x => (
          <div key={x.l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${C.bdr}` }}>
            <span style={{ color:C.txtM, fontSize:13 }}>{x.l}</span>
            <span style={{ color:x.c, fontWeight:700, fontSize:13 }}>{fmt(x.v)}</span>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.bdr}` }}>
          <span style={{ color:C.txtM, fontSize:13 }}>Subtotal</span>
          <span style={{ fontSize:13, fontWeight:600 }}>{fmt(cv.subTotal)}</span>
        </div>
        {/* Markup with cost-only option */}
        <div style={{ padding:"6px 0", borderBottom:`1px solid ${C.bdr}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
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
        {/* Discounts applied */}
        {(active.discounts||[]).length>0 && (
          <div style={{ marginTop:4 }}>
            <div style={{ fontSize:10, color:C.txtS, fontWeight:700, textTransform:"uppercase", letterSpacing:.5, marginBottom:4 }}>Discounts Applied</div>
            {(active.discounts||[]).map((d,i)=>(
              <div key={d.id||i} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"6px 8px", background:C.grnB, border:`1px solid ${C.grnBdr}`, borderRadius:6, marginBottom:4, gap:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.red }}>
                    − {fmt(d.discAmt)}
                    <span style={{ fontSize:10, fontWeight:600, color:C.grn, marginLeft:6 }}>
                      {d.type==="pct"?d.amount+"%":"Cash"} discount
                    </span>
                  </div>
                  <div style={{ fontSize:11, color:C.txtM, marginTop:1, fontStyle:"italic" }}>{d.reason}</div>
                  <div style={{ fontSize:10, color:C.txtS }}>{d.date}</div>
                </div>
                {!active.locked && (
                  <button onClick={()=>u("discounts",(active.discounts||[]).filter((_,j)=>j!==i))}
                    style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:14, lineHeight:1, padding:"0 2px", flexShrink:0 }}>×</button>
                )}
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", fontSize:12, color:C.txtM, borderTop:`1px solid ${C.bdr}`, marginTop:2 }}>
              <span>Total Discounts</span>
              <span style={{ fontWeight:700, color:C.red }}>− {fmt(cv.discAmt)}</span>
            </div>
          </div>
        )}

        {/* Total estimate box */}
        <div style={{ background:C.accL, border:`1.5px solid ${C.accB}`, borderRadius:7, padding:14, marginTop:10 }}>
          {cv.discAmt>0 && (
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:C.txtS, marginBottom:4 }}>
              <span>Before Discounts</span>
              <span style={{ textDecoration:"line-through" }}>{fmt(cv.preDisc)}</span>
            </div>
          )}
          <div style={{ fontSize:10, color:C.acc, letterSpacing:1, fontWeight:700, marginBottom:2 }}>TOTAL ESTIMATE</div>
          <div style={{ fontSize:30, fontWeight:700, color:C.acc }}>{fmt(cv.total)}</div>
          {cv.discAmt>0 && <div style={{ fontSize:11, color:C.grn, marginTop:2, fontWeight:600 }}>Saving {fmt(cv.discAmt)} ({(cv.discAmt/cv.preDisc*100).toFixed(1)}% off)</div>}
        </div>
        <div style={{ background:cv.np>=0?C.grnB:C.redB, border:`1px solid ${cv.np>=0?C.grnBdr:C.redBdr}`, borderRadius:7, padding:12, marginTop:8 }}>
          <div style={{ fontSize:10, color:cv.np>=0?C.grn:C.red, letterSpacing:1, fontWeight:700, marginBottom:2 }}>EST. NET PROFIT</div>
          <div style={{ fontSize:22, fontWeight:700, color:cv.np>=0?C.grn:C.red }}>{fmt(cv.np)}</div>
          <div style={{ fontSize:11, color:cv.np>=0?C.grn:C.red, marginTop:1, opacity:.8 }}>{cv.nm.toFixed(1)}% margin</div>
        </div>
        <CostBar labor={cv.labor} travel={cv.travel} equip={cv.equip} hauling={cv.hauling} mats={cv.mats}/>
        {!active.locked && <>
          {/* Apply Discount button */}
          <button
            style={{ ...mkBtn("ghost"), width:"100%", padding:"7px 0", marginTop:12, fontSize:12, justifyContent:"center", borderStyle:"dashed", color:C.grn, borderColor:C.grn }}
            onClick={()=>setShowDiscModal(true)}>
            🏷 Apply Discount
          </button>
          {/* Save Quote — saves as In Progress, stays on editor */}
          <button style={{ ...mkBtn("primary"), width:"100%", padding:"9px 0", marginTop:5, fontSize:13, justifyContent:"center" }}
            onClick={()=>saveQuote()}>
            💾 Save Quote
          </button>
          {/* Submit for Review — saves as In Review, sends notification */}
          <button style={{ ...mkBtn("blue"), width:"100%", padding:"8px 0", marginTop:5, fontSize:13, justifyContent:"center" }}
            onClick={submitQuote}>
            📋 Submit for Review
          </button>
          {/* Create Customer Document */}
          <button style={{ ...mkBtn("ghost"), width:"100%", padding:"8px 0", marginTop:5, fontSize:13, justifyContent:"center", borderColor:C.acc, color:C.acc }}
            onClick={()=>setShowCustDoc(true)}>
            📄 Create Customer Document
          </button>
          {/* Mark as Won */}
          {!["Won","Dead"].includes(active.status) && (
            <button style={{ ...mkBtn("won"), width:"100%", padding:"8px 0", marginTop:5, fontSize:13, justifyContent:"center" }}
              onClick={()=>setShowWM(true)}>
              ✓ Mark as Won
            </button>
          )}
        </>}
        {active.locked && (
          <div style={{ marginTop:12 }}>
            <div style={{ padding:"8px 10px", background:C.grnB, border:`1px solid ${C.grnBdr}`, borderRadius:6, fontSize:12, color:C.grn, marginBottom:6 }}>
              Locked · Job {active.jobNum} · Complete by {active.compDate||"TBD"}
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
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:C.bg, color:C.txt, fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif", fontSize:14 }}>
        {adjModal&&<SalesAdjustmentModal quote={adjModal} onSave={saveAdjustment} onClose={()=>setAdjModal(null)}/>}
        {showWM && <WonModal quote={active} onSave={markWon} onClose={()=>setShowWM(false)}/>}
        {deadModal && <MarkDeadModal itemType="Quote" itemLabel={deadModal.item.job_num+" · "+deadModal.item.client} onConfirm={note=>{ setActive(q=>({...q,status:"Dead",deadNote:note})); setDeadModal(null); }} onClose={()=>setDeadModal(null)}/>}
        {showDiscModal && <DiscountModal quoteTotal={cv.preDisc} onSave={d=>{ u("discounts",[...(active.discounts||[]),d]); setShowDiscModal(false); }} onClose={()=>setShowDiscModal(false)}/>}
        {showCustDoc && <CustomerDocModal quote={{...active, total:cv.total}} onClose={()=>setShowCustDoc(false)}/>}
        <Header token={token} role={role} view={view} setView={setView} setToken={setToken} setRole={setRole} crumb={active.qn+(active.isChangeOrder?" (CO)":"")} extra={
          <div style={{ display:"flex", gap:5 }}>
            <button style={mkBtn("ghost")} onClick={()=>setView("dash")}>Cancel</button>
            {!active.locked && <button style={mkBtn("primary")} onClick={()=>saveQuote()}>Save Quote</button>}
          </div>
        }/>
        <div className="app-page-container" style={{ maxWidth:1160 }}>
          {active.fromReqId    && <div style={{ background:C.bluB, border:`1px solid ${C.bluBdr}`, borderRadius:6, padding:"8px 12px", marginBottom:10, fontSize:12, color:C.blue }}>Pre-filled from a Quote Request.</div>}
          {active.isChangeOrder && <div style={{ background:"#f5f3ff", border:"1px solid #ddd6fe", borderRadius:6, padding:"8px 12px", marginBottom:10, fontSize:12, color:"#6d28d9" }}>Change Order — linked to original won quote.</div>}
          {active.isHistorical && <div style={{ background:C.accL, border:`1px solid ${C.accB}`, borderRadius:6, padding:"8px 12px", marginBottom:10, fontSize:12, color:C.acc, fontWeight:700 }}>HISTORICAL ESTIMATE — Metrics manually established.</div>}
          {active.locked       && <div style={{ background:C.yelB, border:`1px solid ${C.yelBdr}`, borderRadius:6, padding:"8px 12px", marginBottom:10, fontSize:12, color:C.yel }}>This quote is locked. View only.</div>}

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
              <div><Lbl c="STATUS"/><select style={{ ...sel, width:"100%" }} value={active.status} onChange={e=>u("status",e.target.value)} disabled={active.locked}>{["In Progress","In Review","Approved","Adjustments Needed","Submitted","Won","Lost","Dead"].map(x=><option key={x}>{x}</option>)}</select></div>
            {/* Lift Plan fields */}
            <div style={{ gridColumn:"1/-1", display:"flex", gap:12, alignItems:"center", background:active.liftPlanRequired?C.yelB:C.bg, border:`1px solid ${active.liftPlanRequired?C.yelBdr:C.bdr}`, borderRadius:6, padding:"8px 12px", flexWrap:"wrap" }}>
              <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:600, cursor:"pointer", color:active.liftPlanRequired?C.yel:C.txtM }}>
                <input type="checkbox" checked={!!active.liftPlanRequired} onChange={e=>u("liftPlanRequired",e.target.checked)} disabled={active.locked} style={{ width:15, height:15 }}/>
                Lift Plan Required
              </label>
              {active.liftPlanRequired && (
                <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.txtM }}>
                  Max Lift Tonnage:
                  <input type="number" min={0} step={0.5} value={active.maxLiftTons||""} onChange={e=>u("maxLiftTons",e.target.value)} placeholder="tons" style={{ ...inp, width:70, fontSize:12, padding:"3px 7px" }} disabled={active.locked}/>
                  <span style={{ fontSize:11, color:C.txtS }}>tons</span>
                </label>
              )}
              {!active.liftPlanRequired && active.maxLiftTons && Number(active.maxLiftTons)>liftTonThreshold && (
                <span style={{ fontSize:11, color:C.red, fontWeight:600 }}>⚠ Lift exceeds {liftTonThreshold}T threshold — Lift Plan Recommended</span>
              )}
            </div>
              <div>
                <Lbl c="ESTIMATOR"/>
                <select style={{ ...sel, width:"100%" }} value={active.salesAssoc||""} onChange={e=>u("salesAssoc",e.target.value)} disabled={active.locked}>
                  <option value="">Unassigned</option>
                  {appUsers.filter(usr=>usr.role==="estimator"||usr.role==="manager").map(usr=>(
                    <option key={usr.id} value={usr.username}>{usr.username} ({usr.role})</option>
                  ))}
                </select>
              </div>
              <div><Lbl c="CONTACT NAME"/><input style={inp} value={active.contactName||""} onChange={e=>u("contactName",e.target.value)} disabled={active.locked}/></div>
              <div><Lbl c="CONTACT PHONE"/><input style={inp} value={active.contactPhone||""} onChange={e=>u("contactPhone",e.target.value)} disabled={active.locked}/></div>
              <div><Lbl c="CONTACT EMAIL"/><input style={inp} value={active.contactEmail||""} onChange={e=>u("contactEmail",e.target.value)} disabled={active.locked}/></div>
              <div style={{ gridColumn:"span 2" }}>
                <Lbl c="JOB DESCRIPTION"/>
                <textarea style={{ ...inp, height:56, resize:"vertical", marginBottom:8 }} value={active.desc||""} onChange={e=>u("desc",e.target.value)} disabled={active.locked}/>
                <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:600, color:C.txtM, cursor:active.locked?"not-allowed":"pointer" }}>
                  <input type="checkbox" checked={!!active.isHistorical} onChange={e=>u("isHistorical", e.target.checked)} disabled={active.locked} style={{ width:15, height:15 }}/>
                  <span style={{ color:C.acc }}>Historical Estimate Only</span>
                </label>
                {active.isHistorical && (
                  <div style={{ marginTop:6 }}>
                    <div style={{ fontSize:10, color:C.acc, fontStyle:"italic", marginBottom:8 }}>
                      ⚠️ Quote will be instantly locked upon closing unless historical jobs are being bulk entered.
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, padding:12, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:6, alignItems:"end", marginBottom:10 }}>
                      <div><Lbl c="TOTAL ESTIMATE AMOUNT"/><input type="number" style={{ ...inp, width:"100%", boxSizing:"border-box" }} value={active.histTotal||""} onChange={e=>u("histTotal",e.target.value)} disabled={active.locked}/></div>
                      <div><Lbl c="TOTAL COSTS"/><input type="number" style={{ ...inp, width:"100%", boxSizing:"border-box" }} value={active.histCosts||""} onChange={e=>u("histCosts",e.target.value)} disabled={active.locked}/></div>
                      <div><Lbl c="TOTAL HOURS"/><input type="number" style={{ ...inp, width:"100%", boxSizing:"border-box" }} value={active.histHours||""} onChange={e=>u("histHours",e.target.value)} disabled={active.locked}/></div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:10, padding:12, background:C.sur, border:`1px solid ${C.bdr}`, borderRadius:6, alignItems:"end" }}>
                      <div>
                        <Lbl c="HISTORICAL STATUS"/>
                        <select style={{ ...sel, width:"100%", boxSizing:"border-box" }} value={["Won","Lost"].includes(active.status) ? active.status : ""} onChange={e=>u("status",e.target.value)} disabled={active.locked}>
                          {!["Won","Lost"].includes(active.status) && <option value="" disabled>-- Select Status --</option>}
                          <option value="Won">Won</option>
                          <option value="Lost">Lost</option>
                        </select>
                      </div>
                      {active.status === "Won" && (
                        <>
                          <div><Lbl c="JOB NUMBER"/><input style={{ ...inp, width:"100%", boxSizing:"border-box" }} value={active.jobNum||""} onChange={e=>u("jobNum",e.target.value)} disabled={active.locked}/></div>
                          <div><Lbl c="ACTUAL START DATE"/><input type="date" style={{ ...inp, width:"100%", boxSizing:"border-box" }} value={active.startDate||""} onChange={e=>u("startDate",e.target.value)} disabled={active.locked}/></div>
                          <div><Lbl c="ACTUAL END DATE"/><input type="date" style={{ ...inp, width:"100%", boxSizing:"border-box" }} value={active.compDate||""} onChange={e=>u("compDate",e.target.value)} disabled={active.locked}/></div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <Sec c="Attachments"/>
              {/* Job Folder quick link — shown when this quote came from an RFQ */}
              {active.fromReqId && (() => {
                const linkedRfq = reqs.find(r=>r.id===active.fromReqId);
                return linkedRfq ? (
                  <button
                    style={{ ...mkBtn("outline"), fontSize:11, padding:"4px 11px", display:"flex", alignItems:"center", gap:5 }}
                    onClick={()=>setShowJFM(linkedRfq)}>
                    📁 View Job Folder
                  </button>
                ) : null;
              })()}
            </div>
            <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center", marginBottom:7 }}>
              {(active.attachments||[]).map((a,ix) => (
                <div key={ix} style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:5, padding:"3px 8px", fontSize:12, display:"flex", alignItems:"center", gap:4 }}>
                  {a.name}{(!active.locked || active.isHistorical) && <XBtn on={()=>u("attachments",(active.attachments||[]).filter((_,j)=>j!==ix))}/>}
                </div>
              ))}
              {(active.attachments||[]).length===0 && <span style={{ fontSize:12, color:C.txtS }}>No attachments yet.</span>}
            </div>
            {(!active.locked || active.isHistorical) && <>
              <button style={{ ...mkBtn("ghost"), fontSize:11 }} onClick={()=>fileRef.current?.click()}>+ Attach Document</button>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.png" style={{ display:"none" }} onChange={e=>{ const f=e.target.files[0]; if(f){ u("attachments",[...(active.attachments||[]),{name:f.name}]); e.target.value=""; }}}/>
            </>}
          </Card>

          {!active.isHistorical && (
            <>
              <Card>
                <Sec c="Labor"/>
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
            <Sec c="Travel & Mobilization"/>
            {/* Customizable per diem / hotel rates */}
            <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:10, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, color:C.txtS, fontWeight:600 }}>Rates:</span>
              <label style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:C.txtM }}>
                Per Diem $<input type="number" min={0} value={perDiemRate} onChange={e=>setPerDiemRate(Number(e.target.value))} style={{ ...inp, width:55, fontSize:11, padding:"3px 6px" }}/>/night
              </label>
              <label style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:C.txtM }}>
                Hotel $<input type="number" min={0} value={hotelRate} onChange={e=>setHotelRate(Number(e.target.value))} style={{ ...inp, width:65, fontSize:11, padding:"3px 6px" }}/>/night
              </label>
              <span style={{ fontSize:10, color:C.txtS }}>(defaults: ${DEFAULT_PER_DIEM} / ${DEFAULT_HOTEL})</span>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
                <thead><tr>{["Mobilization","Workers","Days","Per Diem","Hotel","Travel - Other","Subtotal",""].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                <tbody>
                  {(active.travelRows||[]).map(row => {
                    const sub = row.workers*row.days*((row.perDiem?perDiemRate:0)+(row.hotel?hotelRate:0));
                    return (
                      <tr key={row.id}>
                        <td style={tdS}><select style={sel} value={row.label} onChange={e=>updR("travelRows",row.id,"label",e.target.value)} disabled={active.locked}>{["First Mobilization","Second Mobilization","Additional Mobilization"].map(l=><option key={l}>{l}</option>)}</select></td>
                        <td style={tdS}><input style={{ ...inp, width:50 }} type="number" min={0} value={row.workers} onChange={e=>updR("travelRows",row.id,"workers",Number(e.target.value))} disabled={active.locked}/></td>
                        <td style={tdS}><input style={{ ...inp, width:50 }} type="number" min={0} value={row.days}    onChange={e=>updR("travelRows",row.id,"days",Number(e.target.value))}    disabled={active.locked}/></td>
                        <td style={{ ...tdS, textAlign:"center" }}><input type="checkbox" checked={row.perDiem} onChange={e=>updR("travelRows",row.id,"perDiem",e.target.checked)} disabled={active.locked} style={{ width:15, height:15 }}/></td>
                        <td style={{ ...tdS, textAlign:"center" }}><input type="checkbox" checked={row.hotel}   onChange={e=>updR("travelRows",row.id,"hotel",e.target.checked)}   disabled={active.locked} style={{ width:15, height:15 }}/></td>
                        <td style={tdS}><DollarInput val={row.travelOther||0} on={e=>updR("travelRows",row.id,"travelOther",Number(e.target.value))} w={80}/></td>
                        <td style={{ ...tdS, color:C.blue, fontWeight:700, fontSize:13 }}>{fmt(sub+(row.travelOther||0))}</td>
                        <td style={tdS}>{!active.locked && <XBtn on={()=>delR("travelRows",row.id)}/>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!active.locked && <button style={{ ...mkBtn("outline"), marginTop:8, fontSize:11 }} onClick={()=>addR("travelRows",{ label:"Additional Mobilization", workers:0, days:0, perDiem:false, hotel:false, travelOther:0 })}>+ Add Mobilization</button>}
            {/* Markup + total footer */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:10, paddingTop:8, borderTop:`1px solid ${C.bdr}`, flexWrap:"wrap" }}>
              <span style={{ fontSize:12, fontWeight:600, color:C.txtM }}>Travel Markup:</span>
              <select style={{ ...sel, width:90 }} value={active.travelMarkup||0} onChange={e=>u("travelMarkup",Number(e.target.value))} disabled={active.locked}>
                {[0,0.05,0.10,0.15,0.20,0.25,0.30].map(v=><option key={v} value={v}>{v===0?"None":Math.round(v*100)+"%"}</option>)}
              </select>
              <div style={{ marginLeft:"auto", fontSize:13, fontWeight:700, color:C.blue }}>
                Total Travel & Mobilization: {fmt(cv.travel)}
              </div>
            </div>
          </Card>

          <Card>
            <Sec c="Equipment"/>
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
                        <td style={tdS}><select style={{ ...sel, maxWidth:210 }} value={row.code} onChange={e=>{ const ne=eqMap[e.target.value]||EQUIPMENT[0]; const go=eqOv[e.target.value]; updR("equipRows",row.id,"code",e.target.value); updR("equipRows",row.id,"overDaily",go?go.daily:ne.daily_rate); }} disabled={active.locked}>{eqCats.map(cat=><optgroup key={cat} label={cat}>{equipment.filter(e=>e.category===cat).map(e=><option key={e.code} value={e.code}>{e.name}</option>)}</optgroup>)}</select></td>
                        <td style={{ ...tdS, fontSize:11, color:C.txtS }}>{eq.capacity}</td>
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
            <Sec c="Third Party Hauling"/>
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
            <Sec c="Subcontractors"/>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:420 }}>
                <thead><tr>{["Subcontractor","Scope","Cost","Markup %","Bid Amt",""].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                <tbody>
                  {(active.subRows||[]).map(row => {
                    const bid = Number(row.cost)*(1+Number(row.markup||0));
                    return (
                      <tr key={row.id}>
                        <td style={tdS}><input style={inp} value={row.vendor} placeholder="Company" onChange={e=>updR("subRows",row.id,"vendor",e.target.value)} disabled={active.locked}/></td>
                        <td style={tdS}><input style={inp} value={row.desc}   placeholder="Scope of work" onChange={e=>updR("subRows",row.id,"desc",e.target.value)} disabled={active.locked}/></td>
                        <td style={tdS}><DollarInput val={row.cost} on={e=>updR("subRows",row.id,"cost",Number(e.target.value))} w={75}/></td>
                        <td style={tdS}><select style={sel} value={row.markup} onChange={e=>updR("subRows",row.id,"markup",Number(e.target.value))} disabled={active.locked}>{[0,0.05,0.10,0.15,0.20,0.25].map(v=><option key={v} value={v}>{v===0?"None":Math.round(v*100)+"%"}</option>)}</select></td>
                        <td style={{ ...tdS, color:C.purp, fontWeight:700, fontSize:13 }}>{fmt(bid)}</td>
                        <td style={tdS}>{!active.locked && <XBtn on={()=>delR("subRows",row.id)}/>}</td>
                      </tr>
                    );
                  })}
                  {(active.subRows||[]).length===0 && <tr><td colSpan={6} style={{ ...tdS, color:C.txtS, textAlign:"center", padding:10, fontSize:12 }}>No subcontractors added.</td></tr>}
                </tbody>
              </table>
            </div>
            {!active.locked && <button style={{ ...mkBtn("outline"), marginTop:8, fontSize:11 }} onClick={()=>addR("subRows",{ vendor:"", desc:"", cost:0, markup:0 })}>+ Add Subcontractor</button>}
          </Card>

          <Card>
            <Sec c="Materials & Other Job Costs"/>
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

          <Card>
            <Sec c="Permits"/>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
                <thead><tr>{["Agency / Authority","Permit Type","Cost","Markup %","Bid Amt","Notes",""].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                <tbody>
                  {(active.permitRows||[]).map(row => {
                    const bid = Number(row.cost)*(1+Number(row.markup||0));
                    return (
                      <tr key={row.id}>
                        <td style={tdS}><input style={inp} value={row.vendor} placeholder="Issuing agency" onChange={e=>updR("permitRows",row.id,"vendor",e.target.value)} disabled={active.locked}/></td>
                        <td style={tdS}><input style={inp} value={row.desc}   placeholder="Permit description" onChange={e=>updR("permitRows",row.id,"desc",e.target.value)} disabled={active.locked}/></td>
                        <td style={tdS}><DollarInput val={row.cost} on={e=>updR("permitRows",row.id,"cost",Number(e.target.value))} w={75}/></td>
                        <td style={tdS}><select style={sel} value={row.markup||0} onChange={e=>updR("permitRows",row.id,"markup",Number(e.target.value))} disabled={active.locked}>{[0,0.05,0.10,0.15,0.20,0.25].map(v=><option key={v} value={v}>{v===0?"None":Math.round(v*100)+"%"}</option>)}</select></td>
                        <td style={{ ...tdS, color:C.ora, fontWeight:700, fontSize:13 }}>{fmt(bid)}</td>
                        <td style={tdS}><input style={inp} value={row.notes||""} placeholder="Notes" onChange={e=>updR("permitRows",row.id,"notes",e.target.value)} disabled={active.locked}/></td>
                        <td style={tdS}>{!active.locked && <XBtn on={()=>delR("permitRows",row.id)}/>}</td>
                      </tr>
                    );
                  })}
                  {(active.permitRows||[]).length===0 && <tr><td colSpan={7} style={{ ...tdS, color:C.txtS, textAlign:"center", padding:10, fontSize:12 }}>No permits added.</td></tr>}
                </tbody>
              </table>
            </div>
            {!active.locked && <button style={{ ...mkBtn("outline"), marginTop:8, fontSize:11 }} onClick={()=>addR("permitRows",{ vendor:"", desc:"", cost:0, markup:0, notes:"" })}>+ Add Permit</button>}
          </Card>
          <SummaryPanel/>
            </>
          )}
          
          <div className="mobile-only-return-btn" style={{ marginTop: 20, marginBottom: 40, textAlign: "center" }}>
            <button style={{ ...mkBtn("outline"), padding: "12px 24px", fontSize: 16, width: "100%", maxWidth: 350, margin: "0 auto", background: "#fff" }} onClick={() => setView("dash")}>← Return to Home</button>
          </div>
          <style>{`
            @media (min-width: 951px) {
              .mobile-only-return-btn { display: none !important; }
            }
          `}</style>
          <Footer />
        </div>
      </div>
    );
  }

  return null;
}
