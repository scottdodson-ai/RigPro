import sys

with open('src/App.jsx', 'r') as f:
    text = f.read()

# 1. State and logic injection
dictate_logic = """  const [f, setF] = useState(init || blank);
  const [isListening, setIsListening] = useState(false);

  const toggleDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition isn't supported in this browser. Try Chrome or Safari.");
      return;
    }
    
    if (isListening) return; // Native API automatically stops after transcript

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setF(prev => ({ 
        ...prev, 
        desc: prev.desc ? prev.desc + " " + transcript : transcript 
      }));
    };
    
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };"""

text = text.replace('  const [f, setF] = useState(init || blank);', dictate_logic)

# 2. UI Hook injection
old_ui = '<div style={{ gridColumn:"1/-1" }}><Lbl c="JOB DESCRIPTION *"/><textarea style={{ ...inp, height:80, resize:"vertical" }} spellCheck={true} autoCapitalize="sentences" autoCorrect="on" value={f.desc} onChange={e=>u("desc",e.target.value)} onBlur={handleDescBlur} placeholder="Enter description... (Auto-corrects on blur)"/></div>'

new_ui = """          <div style={{ gridColumn:"1/-1" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
               <Lbl c="JOB DESCRIPTION *" />
               <button 
                 onClick={toggleDictation} 
                 style={{ 
                   background: "transparent", 
                   border: "none", 
                   color: isListening ? "#ef4444" : "#3b82f6", 
                   fontSize: 13, 
                   fontWeight: 700, 
                   cursor: "pointer", 
                   display:"flex", 
                   alignItems:"center", 
                   gap:5,
                   padding: "2px 0 6px 0"
                 }}>
                 <span style={{ fontSize: 16 }}>{isListening ? "🔴" : "🎤"}</span> 
                 {isListening ? "Listening..." : "Dictate"}
               </button>
            </div>
            <textarea style={{ ...inp, height:80, resize:"vertical" }} spellCheck={true} autoCapitalize="sentences" autoCorrect="on" value={f.desc} onChange={e=>u("desc",e.target.value)} onBlur={handleDescBlur} placeholder="Enter description... (Auto-corrects on blur)"/>
          </div>"""

text = text.replace(old_ui, new_ui)

with open('src/App.jsx', 'w') as f:
    f.write(text)

print("Updated dictate script")
