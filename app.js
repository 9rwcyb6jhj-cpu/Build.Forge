console.log("app.js loaded ✅");

// ===== Database (expand anytime) =====
const DB = {
  chassis: {
    "2003–2009 4Runner (N210)": {
      defaults: {
        mounts: "N210 swap motor mounts + clamshells (match chassis)",
        oilPan: "Low-profile/rear-sump pan; verify rack + crossmember clearance",
        wiring: "Standalone/modified GM harness + flashed ECU (VATS removed)",
        cooling: "Aluminum radiator + dual fans; confirm hose routing",
        fuel: "58 psi LS fuel system (return or regulated-returnless)",
        exhaust: "Tight-fit swap headers/manifolds + custom Y-pipe",
        driveline: "Driveshaft length changes likely; watch front shaft on 4WD"
      },
      notes: [
        "Steering rack + crossmember clearance is the #1 limiter.",
        "Plan exhaust around frame rails + front driveshaft (4WD)."
      ]
    },

    "2000–2006 Tahoe/Silverado (GMT800)": {
      defaults: {
        mounts: "OEM-style mounts (stock replacement)",
        oilPan: "Stock truck pan typically works",
        wiring: "Factory harness/ECU easiest; tune for mods",
        cooling: "Stock cooling OK; upgrade radiator/fans for power/towing",
        fuel: "Stock fuel system; confirm pump health",
        exhaust: "Long tubes/manifolds depending on setup + cats",
        driveline: "Usually no driveshaft change if staying in platform"
      },
      notes: [
        "LS platform: focus is upgrades, not fitment.",
        "Heat + trans tuning matter more as power goes up."
      ]
    }
  },

  engines: {
    "5.3 LS": {
      ecu: "P01/P59 (cable) or E38 era depending on year",
      accessories: "Truck accessories wider; car accessories can help packaging",
      notes: ["Best value. Easy packaging compared to larger combos."]
    },
    "6.0 LS": {
      ecu: "Verify ECU pairing + reluctor; tune matters",
      accessories: "Heat management matters; consider coating/wrap",
      notes: ["Great torque. Prioritize cooling + trans cooler."]
    },
    "6.2 LS": {
      ecu: "Often DBW / E38-E67 era; tune is important",
      accessories: "Fuel quality matters; plan octane",
      notes: ["Best power potential; watch knock on low octane."]
    }
  },

  transmissions: {
    "Keep Current": { notes: ["Confirm compatibility/adapters based on chassis."] },
    "4L60E": { notes: ["Budget-friendly; add cooler + tune; build if power is high."] },
    "4L80E": { notes: ["Stronger; larger; may need crossmember + driveshaft changes."] },
    "T56 Manual": { notes: ["Pedals/hydraulics + tunnel clearance may be required."] }
  }
};

// Presets for the library (click to auto-fill)
const PRESETS = [
  { title: "4Runner N210 • 5.3 • 4L60E", car:"2003–2009 4Runner (N210)", engine:"5.3 LS", trans:"4L60E", use:"street" },
  { title: "4Runner N210 • 6.0 • 4L80E", car:"2003–2009 4Runner (N210)", engine:"6.0 LS", trans:"4L80E", use:"offroad" },
  { title: "GMT800 • 6.0 • Keep Current", car:"2000–2006 Tahoe/Silverado (GMT800)", engine:"6.0 LS", trans:"Keep Current", use:"street" },
  { title: "GMT800 • 6.2 • 4L80E", car:"2000–2006 Tahoe/Silverado (GMT800)", engine:"6.2 LS", trans:"4L80E", use:"track" },
];

// ===== Helpers =====
function fillSelect(select, items, placeholder) {
  select.innerHTML = "";
  const p = document.createElement("option");
  p.value = "";
  p.textContent = placeholder;
  select.appendChild(p);

  items.forEach((item) => {
    const o = document.createElement("option");
    o.value = item;
    o.textContent = item;
    select.appendChild(o);
  });
}

function setStatus(text){
  const el = document.getElementById("statusText");
  if (el) el.textContent = text;
}

function section(tagClass, title, lines){
  const lis = lines.map(x => `<li>${x}</li>`).join("");
  return `
    <div class="section">
      <div class="sectionHead">
        <div>${title}</div>
        <span class="tag ${tagClass}">${title}</span>
      </div>
      <div class="sectionBody">
        <ul>${lis}</ul>
      </div>
    </div>
  `;
}

function escapeText(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

// ===== Library =====
function renderPresets(filter=""){
  const list = document.getElementById("presetList");
  if (!list) return;

  const q = filter.trim().toLowerCase();
  const items = PRESETS.filter(p => {
    if (!q) return true;
    const blob = `${p.title} ${p.car} ${p.engine} ${p.trans} ${p.use}`.toLowerCase();
    return blob.includes(q);
  });

  list.innerHTML = items.map((p, idx) => `
    <div class="preset" data-idx="${idx}">
      <div class="presetTop">
        <div class="presetTitle">${escapeText(p.title)}</div>
        <div class="pill"><span class="k">Use</span> ${escapeText(p.use)}</div>
      </div>
      <div class="presetMeta">
        <div>Chassis: <b>${escapeText(p.car)}</b></div>
        <div>Engine: <b>${escapeText(p.engine)}</b> • Trans: <b>${escapeText(p.trans)}</b></div>
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".preset").forEach(el => {
    el.addEventListener("click", () => {
      const p = items[Number(el.dataset.idx)];
      applyPreset(p);
    });
  });
}

function applyPreset(p){
  document.getElementById("car").value = p.car;
  document.getElementById("engine").value = p.engine;
  document.getElementById("trans").value = p.trans;
  document.getElementById("use").value = p.use;
  setStatus("Preset loaded");
  generate();
}

// ===== Generator =====
function generate() {
  const car = document.getElementById("car").value;
  const engine = document.getElementById("engine").value;
  const trans = document.getElementById("trans").value;
  const use = document.getElementById("use").value;
  const out = document.getElementById("output");

  if (!car || !engine || !trans) {
    out.style.display = "block";
    out.innerHTML = `<b>Pick chassis, engine, and transmission.</b>`;
    return;
  }

  const base = TEMPLATES.general;
  const ch = DB.chassis[car];
  const en = DB.engines[engine];
  const tr = DB.transmissions[trans];

  const detail = ch.detail || {};
  const mergedChecks = mergeDeep(base.subsystemChecks, detail.subsystemChecks);
  const decisions = [...base.decisions, ...(detail.decisions || [])];
  const warnings = detail.warnings || [];

  const hours = { ...base.hours, ...(detail.hours || {}) };
  const hoursTotal = Object.values(hours).reduce((a,b)=>a+b,0);

  const renderChecklist = (title, items, tag) => `
    <div class="section">
      <div class="sectionHead">
        <div>${title}</div>
        <span class="tag ${tag}">${title}</span>
      </div>
      <div class="sectionBody">
        <ul>${(items||[]).map(x=>`<li>☐ ${x}</li>`).join("")}</ul>
      </div>
    </div>
  `;

  const renderPhase = (p) => `
    <div class="section">
      <div class="sectionHead">
        <div>${p.name}</div>
        <span class="tag blue">PHASE</span>
      </div>
      <div class="sectionBody">
        <ul>${p.bullets.map(x=>`<li>${x}</li>`).join("")}</ul>
      </div>
    </div>
  `;

  out.style.display = "block";
  out.innerHTML = `
    <h3>Swap Plan</h3>

    <div class="pillRow">
      <span class="pill"><span class="k">Chassis</span> ${car}</span>
      <span class="pill"><span class="k">Engine</span> ${engine}</span>
      <span class="pill"><span class="k">Trans</span> ${trans}</span>
      <span class="pill"><span class="k">Use</span> ${use}</span>
      <span class="pill"><span class="k">Est. Hours</span> ${hoursTotal}</span>
    </div>

    ${warnings.length ? section("pink","Warnings / Hotspots", warnings) : ""}
    ${section("purple","Required Decisions", decisions)}
    ${section("amber","Time Estimate", [
      `Planning: ${hours.planning} hrs`,
      `Fitment: ${hours.fitment} hrs`,
      `Plumbing: ${hours.plumbing} hrs`,
      `Wiring: ${hours.wiring} hrs`,
      `First Start: ${hours.firstStart} hrs`,
      `Shakedown: ${hours.shakedown} hrs`,
      `TOTAL: ${hoursTotal} hrs`
    ])}

    ${section("green","Core Systems", [
      `Motor mounts: ${ch.defaults.mounts}`,
      `Oil pan: ${ch.defaults.oilPan}`,
      `Wiring/ECU: ${ch.defaults.wiring}`,
      `Cooling: ${ch.defaults.cooling}`,
      `Fuel: ${ch.defaults.fuel}`,
      `Exhaust: ${ch.defaults.exhaust}`,
      `Driveline: ${ch.defaults.driveline}`
    ])}

    ${base.phases.map(renderPhase).join("")}

    ${renderChecklist("Mounts & Fitment Checklist", mergedChecks["Mounts & Fitment"], "blue")}
    ${renderChecklist("Cooling Checklist", mergedChecks["Cooling"], "green")}
    ${renderChecklist("Fuel Checklist", mergedChecks["Fuel"], "amber")}
    ${renderChecklist("Wiring/ECU Checklist", mergedChecks["Wiring/ECU"], "purple")}
    ${renderChecklist("Transmission Checklist", mergedChecks["Transmission/Driveline"], "pink")}
    ${renderChecklist("Exhaust Checklist", mergedChecks["Exhaust"], "amber")}
  `;
}

// ===== Copy & Export =====
async function copyBuildSheet(){
  const out = document.getElementById("output");
  if (!out || out.style.display === "none") return;

  // Copy text version
  const text = out.innerText.replace(/\n{3,}/g, "\n\n").trim();
  try{
    await navigator.clipboard.writeText(text);
    setStatus("Copied to clipboard");
  }catch(e){
    // Fallback: select text
    const range = document.createRange();
    range.selectNodeContents(out);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    setStatus("Select + Cmd+C to copy");
  }
}

function exportPDF(){
  // Browser print dialog -> Save as PDF
  setStatus("Exporting...");
  window.print();
  setStatus("Ready");
}

// ===== Init =====
window.addEventListener("DOMContentLoaded", () => {
  const carSel = document.getElementById("car");
  const engSel = document.getElementById("engine");
  const trSel = document.getElementById("trans");

  fillSelect(carSel, Object.keys(DB.chassis), "Choose chassis");
  fillSelect(engSel, Object.keys(DB.engines), "Choose engine");
  fillSelect(trSel, Object.keys(DB.transmissions), "Choose transmission");

  trSel.value = "Keep Current";

  document.getElementById("genBtn").addEventListener("click", generate);
  document.getElementById("copyBtn").addEventListener("click", copyBuildSheet);
  document.getElementById("printBtn").addEventListener("click", exportPDF);

  document.getElementById("resetBtn").addEventListener("click", (e) => {
    e.preventDefault();
    carSel.value = "";
    engSel.value = "";
    trSel.value = "Keep Current";
    document.getElementById("use").value = "street";
    document.getElementById("output").style.display = "none";
    setStatus("Reset");
  });

  const search = document.getElementById("search");
  renderPresets("");
  search.addEventListener("input", () => renderPresets(search.value));

  setStatus("Ready");
});
DB.chassis = {
  ...DB.chassis,

  "1990–1997 Mazda Miata (NA/NB)": {
    defaults: {
      mounts: "Swap mounts for NA/NB + subframe clearance plan",
      oilPan: "Low profile pan; watch steering + crossmember",
      wiring: "Standalone/modified harness + flashed ECU",
      cooling: "Aluminum radiator + dual fans",
      fuel: "58 psi for LS; ensure pump + regulator",
      exhaust: "Tight header/manifold; custom downpipe",
      driveline: "Custom driveshaft; diff/axles become limiters"
    },
    notes: ["Tunnel clearance + drivetrain angle are big deals.", "Diff/axles may need upgrade with power."]
  },

  "1992–1999 BMW 3-Series (E36)": {
    defaults: {
      mounts: "E36 LS swap mounts + headers matched to rack",
      oilPan: "Front sump solutions vary; rack clearance is key",
      wiring: "Standalone harness + flashed ECU; integrate BMW ignition/start",
      cooling: "High-cap radiator + fans; bleed system correctly",
      fuel: "Return-style fuel system typical; regulator setup",
      exhaust: "Swap headers + custom mid-pipe",
      driveline: "Custom driveshaft; consider diff ratio + strength"
    },
    notes: ["Steering shaft/header clearance is common pain point.", "Cooling/bleeding can be finicky."]
  },

  "1999–2006 Chevy/GMC Truck (GMT800)": DB.chassis["2000–2006 Tahoe/Silverado (GMT800)"],

  "2013–2020 Subaru BRZ / Scion FR-S / Toyota 86 (ZN6/ZC6)": {
    defaults: {
      mounts: "Swap subframe/mount kit matched to chassis",
      oilPan: "Low profile pan required; steering clearance check",
      wiring: "Standalone harness + ECU flash; CAN integration for cluster may be needed",
      cooling: "Upgraded radiator + fans",
      fuel: "Fuel system upgrade likely depending on engine",
      exhaust: "Custom headers + routing around subframe",
      driveline: "Custom driveshaft; diff/axle strength check"
    },
    notes: ["Electronics/CAN integration can be the time sink.", "Oil pan + header clearance are critical."]
  },

  "2004–2009 Toyota 4Runner (N210)": DB.chassis["2003–2009 4Runner (N210)"]
};
DB.engines = {
  // LS / Gen III-IV
  "4.8 LS (LR4)": { ecu: "P01/P59 common", accessories: "Truck accessories; car drive can help", notes:["Cheap + revs; good budget."] },
  "5.3 LS (LM7/LM4/L59)": { ecu: "P01/P59 or E38 depending on year", accessories: "Truck wide; car can help", notes:["Best value."] },
  "6.0 LS (LQ4/LQ9)": { ecu: "Verify ECU + reluctor match", accessories: "Heat mgmt important", notes:["Torque monster."] },
  "6.2 LS (LS3/L92/L94)": { ecu: "Often E38/E67 era", accessories: "Fuel quality matters", notes:["Great power; tune is key."] },

  // LSX / Performance variants
  "LS1 5.7": { ecu: "P01 era common", accessories: "F-body/Corvette drives differ", notes:["Classic swap choice."] },
  "LS2 6.0": { ecu: "E40/E38 depending", accessories: "Car accessories", notes:["Strong NA platform."] },
  "LS3 6.2": { ecu: "E38 common", accessories: "Car accessories", notes:["Huge aftermarket support."] },
  "LSA 6.2 Supercharged": { ecu: "E38/E67", accessories: "Charge cooling setup", notes:["Heat + belt routing matters."] },

  // Truck Gen V (LT)
  "LT1 6.2 (Gen V)": { ecu: "Direct injection; needs Gen V ECU setup", accessories: "Accessory drive varies", notes:["DI adds complexity."] },
  "L83 5.3 (Gen V)": { ecu: "DI; Gen V control", accessories: "Truck drive", notes:["Modern 5.3; more wiring complexity."] },
  "L86/L87 6.2 (Gen V)": { ecu: "DI; Gen V", accessories: "Truck drive", notes:["Modern 6.2; fuel system matters."] },

  // Other popular swaps (if you want non-GM)
  "Honda K24": { ecu: "K-series ECU/standalone", accessories: "FWD packaging considerations", notes:["Light + revvy; great for small chassis."] },
  "Toyota 2JZ-GTE": { ecu: "Standalone common", accessories: "Turbo packaging", notes:["Big power potential; costs add up."] },
  "Ford Coyote 5.0": { ecu: "Control pack/standalone", accessories: "Wide engine", notes:["Packaging can be tight."] }
};
DB.chassis = {
  // Toyota
  "2003–2009 4Runner (N210)": DB.chassis["2003–2009 4Runner (N210)"] || {
    defaults: {
      mounts: "N210 swap motor mounts + clamshells",
      oilPan: "Low-profile/rear-sump pan; verify rack + crossmember clearance",
      wiring: "Standalone/modified GM harness + flashed ECU (VATS off)",
      cooling: "Aluminum radiator + dual fans",
      fuel: "58 psi LS fuel system setup",
      exhaust: "Tight-fit swap headers/manifolds + custom Y-pipe",
      driveline: "Custom driveshaft lengths likely; verify front shaft clearance if 4WD."
    },
    notes: ["Rack/crossmember clearance is the big limiter.", "Exhaust routing tight on 4WD."]
  },

  "1996–2002 Toyota 4Runner (N180)": {
    defaults: {
      mounts: "Swap mounts for N180",
      oilPan: "Pan/rack clearance check",
      wiring: "Standalone harness + VATS delete",
      cooling: "Upgraded radiator + fans",
      fuel: "58 psi fuel setup",
      exhaust: "Custom headers/manifolds + Y-pipe",
      driveline: "Driveshaft lengths likely change; 4WD clearance check"
    },
    notes: ["Rack clearance + exhaust routing are common challenges."]
  },

  "1995–2004 Toyota Tacoma (1st gen)": {
    defaults: {
      mounts: "Swap mounts for 1st gen Tacoma",
      oilPan: "Crossmember clearance planning",
      wiring: "Standalone harness + ECU flash",
      cooling: "Radiator + fan upgrade recommended",
      fuel: "58 psi fuel setup",
      exhaust: "Custom exhaust routing",
      driveline: "Driveshaft changes likely; consider diff gearing"
    },
    notes: ["Packaging depends heavily on accessory drive + pan choice."]
  },

  "2005–2015 Toyota Tacoma (2nd gen)": {
    defaults: {
      mounts: "Swap mounts for 2nd gen Tacoma",
      oilPan: "Crossmember + steering clearance check",
      wiring: "Standalone harness + ECU flash; cluster integration may be needed",
      cooling: "Upgraded radiator + fans",
      fuel: "58 psi fuel setup",
      exhaust: "Custom headers/manifolds + routing",
      driveline: "Driveshaft changes likely"
    },
    notes: ["Electronics integration can take time (gauges/immobilizer)."]
  },

  "1998–2007 Toyota Land Cruiser (100 Series)": {
    defaults: {
      mounts: "Swap mounts for 100 series",
      oilPan: "Front diff/steering clearance planning",
      wiring: "Standalone harness + ECU flash",
      cooling: "Big radiator + fans",
      fuel: "Fuel system setup for engine",
      exhaust: "Custom routing; clearance around frame",
      driveline: "Driveshaft changes possible; 4WD packaging"
    },
    notes: ["Heavy truck: cooling + trans cooler become important fast."]
  },

  // GM
  "2000–2006 Tahoe/Silverado (GMT800)": DB.chassis["2000–2006 Tahoe/Silverado (GMT800)"] || {
    defaults: {
      mounts: "OEM-style mounts (stock replacement)",
      oilPan: "Stock truck pan typically works",
      wiring: "Factory harness/ECU is easiest; tune for mods",
      cooling: "Stock cooling usually fine; upgrade radiator/fans for towing/power",
      fuel: "Stock fuel system; confirm pump health",
      exhaust: "Long tubes or manifolds; cats/clearance depends on config",
      driveline: "Usually no driveshaft changes if staying in-platform"
    },
    notes: ["LS platform: focus is upgrades, not fitment."]
  },

  "2007–2013 Silverado/Sierra (GMT900)": {
    defaults: {
      mounts: "OEM-style mounts (platform dependent)",
      oilPan: "Truck pan usually works",
      wiring: "Factory harness/ECU; tune for mods",
      cooling: "Upgrade if power/towing heavy",
      fuel: "Stock system; verify pump/filter",
      exhaust: "Headers + Y-pipe options plentiful",
      driveline: "Usually straightforward"
    },
    notes: ["Great platform for power; trans tune/cooler matters."]
  },

  // Nissan
  "2003–2008 Nissan 350Z (Z33)": {
    defaults: {
      mounts: "Swap mounts for Z33 + header solution",
      oilPan: "Crossmember clearance planning",
      wiring: "Standalone harness + ECU flash; CAN integration may be needed",
      cooling: "Upgraded radiator + fans",
      fuel: "Fuel system sized for power",
      exhaust: "Swap headers + custom mid-pipe",
      driveline: "Custom driveshaft likely"
    },
    notes: ["Steering shaft/header clearance is a common pain point."]
  },

  "2009–2020 Nissan 370Z (Z34)": {
    defaults: {
      mounts: "Swap mounts for Z34",
      oilPan: "Crossmember clearance planning",
      wiring: "Electronics/CAN integration likely",
      cooling: "Upgraded radiator + fans",
      fuel: "Fuel system sized for power",
      exhaust: "Custom headers + routing",
      driveline: "Custom driveshaft likely"
    },
    notes: ["More electronics than Z33 — plan time for integration."]
  },

  "1989–1994 Nissan 240SX (S13)": {
    defaults: {
      mounts: "Swap mounts for S13 + header solution",
      oilPan: "Crossmember/steering clearance check",
      wiring: "Standalone harness + ECU flash",
      cooling: "Radiator + fans upgrade",
      fuel: "Fuel system upgrade likely",
      exhaust: "Custom routing",
      driveline: "Custom driveshaft; diff upgrade may be needed"
    },
    notes: ["Light chassis: traction + diff become limiting factors fast."]
  },

  "1995–1998 Nissan 240SX (S14)": {
    defaults: {
      mounts: "Swap mounts for S14 + header solution",
      oilPan: "Crossmember clearance check",
      wiring: "Standalone harness + ECU flash",
      cooling: "Radiator + fans upgrade",
      fuel: "Fuel system upgrade likely",
      exhaust: "Custom routing",
      driveline: "Custom driveshaft; diff upgrade may be needed"
    },
    notes: ["Similar to S13 but packaging differs slightly."]
  },

  // BMW
  "1992–1999 BMW 3-Series (E36)": {
    defaults: {
      mounts: "E36 swap mounts + rack-clearance headers",
      oilPan: "Rack clearance is key; pan choice matters",
      wiring: "Standalone harness + ECU flash; integrate BMW ignition/start",
      cooling: "Upgraded radiator + fans; bleed properly",
      fuel: "Return-style fuel system typical",
      exhaust: "Swap headers + custom mid-pipe",
      driveline: "Custom driveshaft; consider diff ratio/strength"
    },
    notes: ["Steering shaft/header clearance is common.", "Cooling/bleeding can be finicky."]
  },

  "1999–2006 BMW 3-Series (E46)": {
    defaults: {
      mounts: "E46 swap mounts + header solution",
      oilPan: "Rack clearance planning",
      wiring: "Standalone harness + ECU flash; CAN integration likely",
      cooling: "Upgraded radiator + fans",
      fuel: "Return/returnless conversion as needed",
      exhaust: "Custom routing",
      driveline: "Custom driveshaft"
    },
    notes: ["More electronics than E36; plan integration time."]
  },

  // Mazda
  "1990–2005 Mazda Miata (NA/NB)": {
    defaults: {
      mounts: "Swap mounts for NA/NB",
      oilPan: "Crossmember/steering clearance check",
      wiring: "Standalone harness + ECU flash",
      cooling: "Radiator + fans upgrade",
      fuel: "Fuel system sized for power",
      exhaust: "Tight headers + routing",
      driveline: "Custom driveshaft; diff/axles may need upgrade"
    },
    notes: ["Diff/axles become the limiter with power.", "Tunnel clearance may be required."]
  },

  "2006–2015 Mazda Miata (NC)": {
    defaults: {
      mounts: "Swap mounts for NC",
      oilPan: "Crossmember clearance planning",
      wiring: "Standalone harness + ECU flash",
      cooling: "Radiator + fans upgrade",
      fuel: "Fuel system upgrade likely",
      exhaust: "Custom routing",
      driveline: "Custom driveshaft"
    },
    notes: ["Packaging is tighter than it looks; plan headers/pan early."]
  },

  // Subaru/Toyota
  "2013–2020 BRZ/FR-S/86 (ZN6/ZC6)": {
    defaults: {
      mounts: "Swap subframe/mount kit for ZN6/ZC6",
      oilPan: "Low-profile pan required; steering clearance check",
      wiring: "CAN integration likely (cluster/ABS)",
      cooling: "Upgraded radiator + fans",
      fuel: "Fuel system upgrade likely",
      exhaust: "Custom headers + routing around subframe",
      driveline: "Custom driveshaft; diff/axles strength check"
    },
    notes: ["Electronics/CAN integration is usually the time sink."]
  },

  // Honda (chassis examples even if engine varies)
  "1992–2000 Honda Civic (EG/EK)": {
    defaults: {
      mounts: "Engine mount kit matched to swap choice",
      oilPan: "Clearance depends on engine; plan early",
      wiring: "Harness conversion/standalone",
      cooling: "Radiator + fans upgrade",
      fuel: "Fuel system matched to engine",
      exhaust: "Custom routing",
      driveline: "Axles/trans matched to engine choice"
    },
    notes: ["FWD swaps need axle/trans planning (not just engine)."]
  },

  // Ford
  "1979–1993 Ford Mustang (Foxbody)": {
    defaults: {
      mounts: "Swap mounts + K-member solution (if needed)",
      oilPan: "Crossmember clearance planning",
      wiring: "Standalone/control pack depending on engine",
      cooling: "Radiator + fans upgrade",
      fuel: "Fuel system upgrade likely",
      exhaust: "Headers + routing",
      driveline: "Driveshaft length changes possible"
    },
    notes: ["Great platform; chassis can handle power with supporting mods."]
  },

  // Jeep/Truck
  "1997–2006 Jeep Wrangler (TJ)": {
    defaults: {
      mounts: "Swap mounts for TJ",
      oilPan: "Front axle/diff clearance planning",
      wiring: "Standalone harness + ECU flash",
      cooling: "Radiator + fans upgrade",
      fuel: "Fuel system conversion likely",
      exhaust: "Custom routing",
      driveline: "Driveshaft changes likely; consider gearing"
    },
    notes: ["Cooling + driveline angles are common issues."]
  },

  "1984–2001 Jeep Cherokee (XJ)": {
    defaults: {
      mounts: "Swap mounts for XJ",
      oilPan: "Front axle clearance planning",
      wiring: "Standalone harness + ECU flash",
      cooling: "Radiator + fans upgrade",
      fuel: "Fuel system conversion",
      exhaust: "Custom routing",
      driveline: "Driveshaft changes likely"
    },
    notes: ["Tight bay; plan headers/pan/steering clearance early."]
  },
};
const TEMPLATES = {
  general: {
    decisions: [
      "Throttle: Drive-by-wire (DBW) or cable?",
      "Accessories: keep PS/AC or delete?",
      "Fuel system: return, returnless, or regulated returnless?",
      "Cooling: mechanical fan vs dual electric fans?",
      "Emissions: keep cats/O2s/EVAP or off-road only?",
      "Tuning: stock-ish NA, cam, boost?"
    ],
    phases: [
      { name: "Phase 1 — Planning", bullets: [
        "Confirm engine generation (LS vs LT) and ECU type.",
        "Choose oil pan + mounts BEFORE ordering headers.",
        "Measure driveline angles and plan driveshaft changes.",
        "Plan fuel pressure/regulator strategy and pump capacity."
      ]},
      { name: "Phase 2 — Fitment", bullets: [
        "Test-fit engine with mounts and pan installed.",
        "Check steering rack/crossmember clearance at full lock.",
        "Confirm hood clearance with intake + accessories.",
        "Mock headers/manifolds and mark interference points."
      ]},
      { name: "Phase 3 — Plumbing", bullets: [
        "Cooling: radiator, fans, steam port routing, overflow.",
        "Fuel: supply/return lines, regulator, filter, venting.",
        "Power steering: rack lines + pump fittings; check leaks."
      ]},
      { name: "Phase 4 — Wiring/ECU", bullets: [
        "Mount ECU + fuse/relay block, route harness safely.",
        "Confirm grounds, ignition power, crank signal, DBW pedal (if used).",
        "VATS delete / immobilizer, base tune loaded."
      ]},
      { name: "Phase 5 — First Start", bullets: [
        "Prime oil system, verify fuel pressure, check for leaks.",
        "Verify sensors, fan control, throttle response.",
        "Heat cycle, re-torque mounts, inspect exhaust clearance."
      ]},
      { name: "Phase 6 — Shakedown", bullets: [
        "Short drives: watch temps, trims, trans behavior.",
        "Fix driveline vibration (angles, balance).",
        "Final tune + alignments; re-check fasteners after 200 miles."
      ]}
    ],
    subsystemChecks: {
      "Mounts & Fitment": [
        "Mounts installed, hardware torqued, engine centered",
        "Oil pan clears rack/crossmember under load",
        "Header/manifold clears steering shaft and frame",
        "Hood closes with intake/accessories"
      ],
      "Cooling": [
        "Radiator mounted solid, fans pull correctly",
        "Steam port routed, no air pockets",
        "Upper/lower hoses routed without kinks",
        "Fan triggers verified (ECU or thermostat)"
      ],
      "Fuel": [
        "Correct fuel pressure for setup (LS ~58psi common)",
        "Regulator mounted, return line routed (if used)",
        "No leaks; venting/EVAP plan confirmed"
      ],
      "Wiring/ECU": [
        "Battery, grounds, and main power distribution set",
        "ECU mounted, VATS/immobilizer handled",
        "OBD2 port accessible; scan tool reads sensors",
        "DBW pedal mounted (if DBW)"
      ],
      "Transmission/Driveline": [
        "Crossmember fitment, trans mount installed",
        "Driveshaft length measured/ordered",
        "U-joint angles checked to prevent vibration",
        "Trans cooler installed (recommended)"
      ],
      "Exhaust": [
        "O2 sensor bungs placed correctly",
        "Clearance from body/frame/heat-sensitive parts",
        "Hangers/supports added to avoid cracking"
      ]
    },
    hours: { // baseline hours (you can tune per chassis)
      planning: 6,
      fitment: 14,
      plumbing: 10,
      wiring: 16,
      firstStart: 4,
      shakedown: 6
    }
  }
};

// Small helper to merge arrays/objects safely
function mergeDeep(base, add){
  const out = JSON.parse(JSON.stringify(base));
  for (const [k,v] of Object.entries(add || {})){
    if (Array.isArray(v)) out[k] = [...(out[k] || []), ...v];
    else if (v && typeof v === "object") out[k] = { ...(out[k] || {}), ...v };
    else out[k] = v;
  }
  return out;
}
DB.chassis["2003–2009 4Runner (N210)"].detail = {
  warnings: [
    "Rack/crossmember clearance: plan pan + headers together.",
    "4WD front driveshaft clearance affects exhaust routing."
  ],
  hours: { fitment: 18, plumbing: 12 }, // overrides baseline
  subsystemChecks: {
    "Mounts & Fitment": ["Verify front driveshaft clearance at full droop (4WD)."]
  }
};
