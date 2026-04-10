import sys

with open('src/App.jsx', 'r') as f:
    text = f.read()

# 1. Add handleDescBlur
blur_code = """  const u = (k,v) => setF(x => ({ ...x, [k]:v }));

  const handleDescBlur = () => {
    if (!f.desc) return;
    let txt = f.desc;
    // Fix spacing
    txt = txt.replace(/\\s+/g, ' ').trim();
    // Space before punctuation fixes
    txt = txt.replace(/\\s+\\./g, '.');
    txt = txt.replace(/\\s+,/g, ',');
    // Capitalize sentences
    txt = txt.replace(/(^\\s*\\w|[.?!]\\s*\\w)/g, c => c.toUpperCase());
    // Capitalize "I"
    txt = txt.replace(/\\b(i)\\b/g, 'I');
    
    // Spelling fixes
    const typos = { 
      "teh": "the", "grammer": "grammar", "puctuation": "punctuation", 
      "recieve":"receive", "accomodate":"accommodate", "seperate":"separate", 
      "alot":"a lot", "definetly":"definitely", "occured":"occurred",
      "untill":"until"
    };
    Object.keys(typos).forEach(err => {
      const regex = new RegExp(`\\\\b${err}\\\\b`, 'gi');
      txt = txt.replace(regex, match => match.charAt(0) === match.charAt(0).toUpperCase() ? typos[err].charAt(0).toUpperCase() + typos[err].slice(1) : typos[err]);
    });
    
    // Auto terminate with period if missing
    if (!/[.!?]$/.test(txt)) {
      txt += '.';
    }
    
    u("desc", txt);
  };"""

text = text.replace('  const u = (k,v) => setF(x => ({ ...x, [k]:v }));', blur_code)

# 2. Add onBlur to the textarea
old_ta = '<div style={{ gridColumn:"1/-1" }}><Lbl c="JOB DESCRIPTION *"/><textarea style={{ ...inp, height:80, resize:"vertical" }} spellCheck={true} autoCapitalize="sentences" autoCorrect="on" value={f.desc} onChange={e=>u("desc",e.target.value)}/></div>'

new_ta = '<div style={{ gridColumn:"1/-1" }}><Lbl c="JOB DESCRIPTION *"/><textarea style={{ ...inp, height:80, resize:"vertical" }} spellCheck={true} autoCapitalize="sentences" autoCorrect="on" value={f.desc} onChange={e=>u("desc",e.target.value)} onBlur={handleDescBlur} placeholder="Enter description... (Auto-corrects on blur)"/></div>'

text = text.replace(old_ta, new_ta)

with open('src/App.jsx', 'w') as f:
    f.write(text)

print("Updated RFQModal in App.jsx successfully.")
