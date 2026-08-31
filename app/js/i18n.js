(()=>{
  const supported=["ja","en"];
  const saved=localStorage.getItem("monobase.lang");
  let lang=supported.includes(saved)?saved:"ja";
  const dict=()=>((window.MONOBASE_I18N||{})[lang]||{});
  window.MonoBaseI18n={
    get lang(){return lang},
    t(key,vars={}){
      const ja=(window.MONOBASE_I18N||{}).ja||{};
      let s=(dict()[key] ?? ja[key] ?? key);
      Object.entries(vars).forEach(([k,v])=>{s=String(s).replaceAll("{"+k+"}",v)});
      return s;
    },
    set(next){
      if(!supported.includes(next))return;
      lang=next;localStorage.setItem("monobase.lang",next);
      document.documentElement.lang=next;
      window.dispatchEvent(new CustomEvent("monobase:languagechange",{detail:{lang:next}}));
    },
    materialName(m){
      return lang==="en" ? (m.english||m.name||m.japanese||"") : (m.japanese||m.name||m.english||"");
    },
    secondaryMaterialName(m){
      return lang==="en" ? (m.japanese||m.name||"") : (m.english||m.name||"");
    }
  };
  document.documentElement.lang=lang;
})();