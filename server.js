const express=require("express");
const Parser=require("rss-parser");
const crypto=require("crypto");
const path=require("path");
const app=express(); const parser=new Parser({timeout:15000});
app.use(express.json({limit:"1mb"}));
app.use(express.static(__dirname));
const PORT=process.env.PORT||3000;
const FEEDS=[
["Fútbol","https://news.google.com/rss/search?q=f%C3%BAtbol&hl=es-419&gl=PE&ceid=PE:es-419"],
["Real Madrid","https://news.google.com/rss/search?q=Real+Madrid&hl=es-419&gl=PE&ceid=PE:es-419"],
["Barcelona","https://news.google.com/rss/search?q=FC+Barcelona&hl=es-419&gl=PE&ceid=PE:es-419"],
["Premier League","https://news.google.com/rss/search?q=Premier+League+f%C3%BAtbol&hl=es-419&gl=PE&ceid=PE:es-419"],
["Champions","https://news.google.com/rss/search?q=Champions+League+f%C3%BAtbol&hl=es-419&gl=PE&ceid=PE:es-419"],
["Lesiones","https://news.google.com/rss/search?q=f%C3%BAtbol+lesi%C3%B3n+jugador&hl=es-419&gl=PE&ceid=PE:es-419"],
["Fichajes","https://news.google.com/rss/search?q=f%C3%BAtbol+fichaje+traspaso&hl=es-419&gl=PE&ceid=PE:es-419"],
["Sanciones","https://news.google.com/rss/search?q=f%C3%BAtbol+sanci%C3%B3n&hl=es-419&gl=PE&ceid=PE:es-419"]];
function cat(s){s=s.toLowerCase();if(/lesi[oó]n|lesionado|baja m[eé]dica/.test(s))return"injury";if(/fichaje|traspaso|refuerzo|mercado/.test(s))return"transfer";if(/sanci[oó]n|suspendido|investigaci[oó]n|pol[eé]mica/.test(s))return"controversy";if(/urgente|oficial|confirmado/.test(s))return"urgent";return"all"}
app.get("/api/health",(_,r)=>r.json({ok:true,feeds:FEEDS.length}));
app.get("/api/news",async(_,res)=>{const results=await Promise.allSettled(FEEDS.map(async([topic,url])=>{const f=await parser.parseURL(url);return(f.items||[]).slice(0,12).map(i=>{const h=(i.title||"Noticia de fútbol").replace(/\\s+-\\s+[^-]+$/,"").trim(),u=i.link||url;return{id:crypto.createHash("sha1").update(h+u).digest("hex").slice(0,16),headline:h,summary:(i.contentSnippet||"Consulta la fuente original para verificar detalles.").slice(0,350),sourceUrl:u,sourceName:topic,category:cat(h+" "+(i.contentSnippet||"")),status:/oficial|confirmado/i.test(h)?"EN DESARROLLO":/rumor|podría|según/i.test(h)?"RUMOR":"EN DESARROLLO",timeAgo:i.pubDate||""}})}));const items=results.flatMap(x=>x.status==="fulfilled"?x.value:[]);const unique=[...new Map(items.map(x=>[x.id,x])).values()].slice(0,60);if(!unique.length)return res.status(502).json({error:"No se pudieron consultar las fuentes RSS. Intenta de nuevo."});res.json({items:unique,updatedAt:new Date().toISOString()})});
app.post("/api/generate",async(req,res)=>{const n=req.body||{},h=String(n.headline||"Noticia de fútbol"),s=String(n.summary||"Consulta la fuente original."),u=String(n.sourceUrl||"");let photo=null;try{const q=encodeURIComponent(h.split(" ").slice(0,7).join(" "));const r=await fetch("https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch="+q+"&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1000&format=json",{headers:{"User-Agent":"TiempoExtraRadar/1.0"}});const d=await r.json(),p=Object.values(d.query?.pages||{}).find(x=>x.imageinfo?.[0]?.thumburl);if(p)photo={url:p.imageinfo[0].thumburl,credit:p.imageinfo[0].extmetadata?.Artist?.value?.replace(/<[^>]*>/g,"")||"Wikimedia Commons; revisa la licencia"}}catch{}res.json({photo,content:{title:h,narration:"Atención, aficionados. "+h+". Esto es lo que se conoce hasta ahora: "+s+" Verifica la fuente original y cualquier comunicado oficial antes de publicarlo.",imagePrompt:"Prepara esta fotografía para un Reel deportivo vertical 9:16, con nitidez e iluminación profesional. Conserva intactos rostros, uniformes, escudos y acción original; no inventes elementos ni añadas texto. Tema: "+h,imagePrompt2:"",description:h+"\\n\\nTe contamos lo que se sabe y qué falta por confirmar. Fuente: "+u,hashtags:"#TiempoExtra #Fútbol #NoticiasDeFútbol #ActualidadFutbolística #ReelsFútbol"},note:"Borrador automático: verifica la noticia y la licencia de la imagen antes de publicar."})});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log("Tiempo Extra Radar activo en puerto "+PORT));
