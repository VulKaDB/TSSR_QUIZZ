let pool=[],i=0,pick=null,mode='free',timer=null,remaining=0,matchRight=[],orderState=[],chronoSeconds=45;
let progress=JSON.parse(localStorage.getItem('tssr-progress')||'{}');
const app=document.querySelector('#app'),count=document.getElementById('count'),cats=[...new Set(Q.map(x=>x.cat))];
count.textContent=Q.length+' questions de cours';

function shuffle(a){for(let j=a.length-1;j>0;j--){let k=Math.floor(Math.random()*(j+1));[a[j],a[k]]=[a[k],a[j]]}return a}
function norm(s){return String(s).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ')}
function catProgress(c){let total=Q.filter(x=>x.cat===c).length,done=progress[c]?.length||0;return {total,done,pct:Math.min(100,Math.round(done/total*100))}}

function home(){clearInterval(timer);app.innerHTML=`<h1>Révise, comprends, progresse.</h1><div class="grid modes-grid"><button class=tile onclick="setup('free')"><b>Révision libre</b><small>Choisis tes catégories · ordre aléatoire.</small></button><button class=tile onclick="setup('chrono')"><b>Mode chrono</b><small>Temps réglable par question.</small></button><button class=tile onclick="setup('exam')"><b>Examen blanc</b><small>Correction à la fin.</small></button><button class=tile onclick=memo()><b>Mémo / Annexes</b><small>Repères de révision.</small></button></div><div class="section-separator" aria-hidden="true"></div><h2>Réviser par catégorie</h2><div class=grid>${cats.map(c=>{let p=catProgress(c);return `<button class="tile category-tile" onclick="startCat('${c}')"><b>${c}</b><small>${p.done}/${p.total} questions répondues</small><div class="progress"><span style="width:${p.pct}%;--progress:${p.pct}"></span></div></button>`}).join('')}</div>`}

function setup(m){mode=m;let checks=cats.map(c=>`<label><input type=checkbox class=catpick value="${c}" autocomplete="off"> ${c}</label>`).join('<br>');app.innerHTML=`<section class=panel><h2>${m==='chrono'?'Mode chrono':m==='exam'?'Examen blanc':'Sélection des catégories'}</h2>${m==='chrono'?`<label>Secondes par question : <input id=time type=number min=5 value=45></label><hr>`:''}${m==='exam'?`<label>Nombre de questions : <input id=examCount type=number min=1 value=40></label><hr>`:''}<p><label><input id=allcats type=checkbox autocomplete="off" onchange="document.querySelectorAll('.catpick').forEach(x=>x.checked=this.checked)"> Toutes les catégories</label></p><div>${checks}</div><p><button class=primary onclick=startAll()>Commencer</button> <button onclick=home()>Retour</button></p></section>`;document.getElementById('allcats').checked=false;document.querySelectorAll('.catpick').forEach(x=>x.checked=false)}

// Prépare un lot : mélange les choix des QCM/scenario, laisse les autres types intacts
function buildPool(list){return shuffle(list.map(x=>{let t=x.type||'qcm';if(t==='qcm'||t==='scenario'){let o=shuffle(x.c.map((v,n)=>({v,ok:n===x.a})));return {...x,c:o.map(z=>z.v),a:o.findIndex(z=>z.ok)}}return {...x}}))}
function startAll(){let selected=[...document.querySelectorAll('.catpick:checked')].map(x=>x.value);if(!selected.length){alert('Sélectionne au moins une catégorie.');return}if(mode==='chrono'){chronoSeconds=Number(document.getElementById('time')?.value)||45}pool=buildPool(Q.filter(x=>selected.includes(x.cat)));if(mode==='exam'){let n=Number(document.getElementById('examCount')?.value)||40;pool=pool.slice(0,n)}i=0;show()}
function startCat(c){clearInterval(timer);mode='cat';pool=buildPool(Q.filter(x=>x.cat===c));i=0;show()}

function renderOrderItems(x){return orderState.map((idx,pos)=>`<li><span>${x.items[idx]}</span><span class=order-btns><button type=button onclick="orderMove(${pos},-1)" ${pos===0?'disabled':''}>▲</button><button type=button onclick="orderMove(${pos},1)" ${pos===orderState.length-1?'disabled':''}>▼</button></span></li>`).join('')}
function orderMove(pos,dir){let np=pos+dir;if(np<0||np>=orderState.length)return;[orderState[pos],orderState[np]]=[orderState[np],orderState[pos]];document.getElementById('order-list').innerHTML=renderOrderItems(pool[i])}

function show(){
  clearInterval(timer);
  if(i>=pool.length){app.innerHTML='<section class=panel><h2>Fin de cette série</h2><button class=primary onclick=home()>Accueil</button></section>';return}
  pick=null;
  let x=pool[i],type=x.type||'qcm',chrono=mode==='chrono';
  let body='';
  if(type==='qcm'||type==='scenario'){
    body=`<h2>${x.q}</h2><div class=answers>${x.c.map((z,n)=>`<button class=ans onclick="sel(${n},this)">${'ABCD'[n]}. ${z}</button>`).join('')}</div>`;
  } else if(type==='text'){
    body=`<h2>${x.q}</h2><div class=answers><input id=txt type=text autocomplete=off placeholder="Ta réponse"></div>`;
  } else if(type==='match'){
    matchRight=shuffle(x.pairs.map((p,idx)=>({text:p.r,idx})));
    body=`<h2>${x.q}</h2><div class=match-grid>${x.pairs.map((p,li)=>`<div class=match-row><span class=match-left>${p.l}</span><select class=match-sel><option value="">— choisir —</option>${matchRight.map(r=>`<option value=${r.idx}>${r.text}</option>`).join('')}</select></div>`).join('')}</div>`;
  } else if(type==='order'){
    let disp=shuffle(x.items.map((t,idx)=>({t,idx})));
    orderState=disp.map(d=>d.idx);
    body=`<h2>${x.q}</h2><ol id=order-list class=order-list>${renderOrderItems(x)}</ol>`;
  } else if(type==='calculation'){
    body=`<h2>${x.q}</h2><div class=calc-grid>${x.fields.map(f=>`<label>${f.label}<input class=calc-in type=text autocomplete=off></label>`).join('')}</div>`;
  }
  app.innerHTML=`<p>${x.cat} · ${i+1}/${pool.length} ${chrono?'· <strong id=timer>—</strong>':''}</p><section class=panel>${body}<div class=actions><button class=primary id=btn-valider onclick=check()>Valider</button></div><div id=f></div></section>`;
  if(chrono){remaining=chronoSeconds;let el=document.getElementById('timer');el.textContent=remaining+' s';timer=setInterval(()=>{remaining--;el.textContent=remaining+' s';if(remaining<=0){clearInterval(timer);check(true)}},1000)}
}

function sel(n,e){pick=n;document.querySelectorAll('.ans').forEach(x=>x.classList.remove('chosen'));e.classList.add('chosen')}

function check(timeout=false){
  clearInterval(timer);
  let x=pool[i],type=x.type||'qcm',ok=false,attendu='';
  if(type==='qcm'||type==='scenario'){
    if(pick===null&&!timeout)return;
    ok=!timeout&&pick===x.a;
    attendu=x.c[x.a];
    document.querySelectorAll('.ans').forEach(b=>b.disabled=true);
  } else if(type==='text'){
    let el=document.getElementById('txt'),val=el.value;
    if(!val.trim()&&!timeout)return;
    let accepted=[x.reponse,...(x.accept||[])].map(norm);
    ok=!timeout&&accepted.includes(norm(val));
    attendu=x.reponse;
    el.disabled=true;
  } else if(type==='match'){
    let sels=[...document.querySelectorAll('.match-sel')];
    if(sels.some(s=>s.value==='')&&!timeout)return;
    ok=!timeout&&sels.every((s,li)=>Number(s.value)===li);
    attendu=x.pairs.map(p=>`${p.l} → ${p.r}`).join(' · ');
    sels.forEach(s=>s.disabled=true);
  } else if(type==='order'){
    ok=!timeout&&orderState.every((idx,pos)=>idx===pos);
    attendu=x.items.join(' → ');
    document.querySelectorAll('#order-list button').forEach(b=>b.disabled=true);
  } else if(type==='calculation'){
    let ins=[...document.querySelectorAll('.calc-in')];
    if(ins.some(inp=>!inp.value.trim())&&!timeout)return;
    ok=!timeout&&x.fields.every((f,n)=>norm(ins[n].value)===norm(f.answer));
    attendu=x.fields.map(f=>`${f.label} : ${f.answer}`).join(' · ');
    ins.forEach(inp=>inp.disabled=true);
  }
  if(!progress[x.cat])progress[x.cat]=[];
  if(!progress[x.cat].includes(x.q)){progress[x.cat].push(x.q);localStorage.setItem('tssr-progress',JSON.stringify(progress));}
  f.innerHTML=`<div class="feedback ${ok?'good':''}"><b>${ok?'Bonne réponse':timeout?'Temps écoulé':'Réponse incorrecte'}</b><p><strong>Réponse attendue : ${attendu}</strong></p><p>${x.exp}</p></div>`;
  let btnV=document.getElementById('btn-valider');
  btnV.disabled=true;
  btnV.insertAdjacentHTML('afterend','<button class=primary onclick="i++;show()">Suivante</button>');
}

const MEMO=[
{t:"Support & méthodologie",items:[
 "Incident = interruption/dégradation non planifiée · Demande = requête de service planifiée.",
 "Escalade = transfert du ticket vers un niveau plus qualifié ou un service compétent.",
 "SLA = engagement contractuel sur le niveau de service (délais, disponibilité...).",
 "ITSM = logiciel de gestion des services IT (tickets, incidents, parc) — ex : GLPI.",
 "Cycle de vie d'un ticket : Ouverture/qualification → Priorisation → Diagnostic/traitement (escalade possible) → Résolution → Clôture.",
 "Priorisation d'un ticket = Impact (combien sont touchés) × Urgence.",
 "ITIL, 5 phases : Stratégie → Conception → Transition → Exploitation → Amélioration continue des services.",
 "RGPD : protège les données personnelles, impose de limiter l'accès et la conservation.",
 "CNIL : autorité française qui veille au respect du RGPD. ANSSI : autorité française de sécurité des systèmes d'information.",
]},
{t:"Windows Server & AD",items:[
 "AD = service d'annuaire (utilisateurs, ordinateurs, groupes, GPO) d'un domaine Windows.",
 "DC (Contrôleur de Domaine) = héberge l'annuaire AD et authentifie (Kerberos).",
 "Groupe de sécurité = droits + diffusion · Groupe de distribution = diffusion mail seulement.",
 "GPO = règles appliquées aux utilisateurs/ordinateurs. Ordre d'application = LSDOU (Local, Site, Domaine, OU) ; en cas de conflit, le dernier niveau (OU) l'emporte en général.",
 "Hiérarchie AD : Forêt > Arbre > Domaine > Unité d'Organisation (OU).",
 "Catalogue Global : recherche rapide d'objets dans toute la forêt (sous-ensemble d'attributs répliqué).",
 "FSMO : 5 rôles assurés par un seul DC à la fois (évite les conflits de réplication).",
 "NTFS : système de fichiers Windows — permissions fines + chiffrement EFS.",
 "DNS : traduit nom ↔ IP. Zone de recherche inversée : IP → nom (enregistrements PTR).",
 "DHCP — exclusion : plage jamais distribuée · réservation : IP fixe attribuée via l'adresse MAC.",
 "DORA (processus DHCP) : Discover → Offer → Request → Acknowledge.",
 "Observateur d'événements : consulte les journaux Système/Application/Sécurité.",
 "Rôle = fonction principale du serveur (DNS, DHCP, AD DS...) · Fonctionnalité = complément optionnel.",
 "Juste après l'installation : configurer une IP statique + renommer le serveur.",
 "Windows Server Backup (wbadmin) : sauvegarde native, sans outil tiers.",
]},
{t:"Linux",items:[
 "ls -l : affiche les droits. Format : type + rwx propriétaire + rwx groupe + rwx autres (ex : drwxr-xr--).",
 "chmod (octal) : 7=rwx, 6=rw-, 5=r-x, 4=r--, 3=-wx, 2=-w-, 1=--x, 0=--- (3 chiffres = propriétaire/groupe/autres).",
 "chown : change le propriétaire · chgrp : change le groupe · umask : droits par défaut à la création.",
 "sudo : exécute une commande avec des droits élevés, de façon tracée · root : super-utilisateur, tous les droits.",
 "cat (tout afficher) / less (paginé) / head (début) / tail (fin) / tail -f (suivi en temps réel d'un log).",
 "grep : recherche un motif · du : espace utilisé par des fichiers/dossiers · df : espace libre par partition.",
 "ps / top : voir les processus · kill : arrêter un processus · & après une commande : lancement en arrière-plan.",
 "apt update (rafraîchit la liste) / upgrade (met à jour) / install / remove.",
 "/etc/passwd : infos des comptes · /etc/shadow : mots de passe chiffrés · /etc/fstab : montages automatiques au démarrage.",
 "systemctl restart nom_service : redémarre un service (systemd).",
 "ssh (port 22) : session distante chiffrée.",
 "inode : métadonnées d'un fichier (droits, taille, dates, blocs) — pas son nom.",
 "Lien physique (hard link) : même inode que l'original · lien symbolique : raccourci vers un chemin (casse si la cible bouge).",
 "LAMP = Linux + Apache + MySQL/MariaDB + PHP. GLPI = outil ITSM open-source (tickets + parc).",
]},
{t:"Réseaux & IPv4",items:[
 "Modèle OSI (bas → haut) : Physique, Liaison de données, Réseau, Transport, Session, Présentation, Application.",
 "Hub : diffuse tout à tous les ports · Switch : commute via l'adresse MAC (table de commutation/CAM) · Routeur : route via l'adresse IP.",
 "Adresse MAC : identifiant physique de couche 2 · Table ARP : correspondance IP ↔ MAC.",
 "IPv4 = adresses sur 32 bits · IPv6 = adresses sur 128 bits.",
 "Masque de sous-réseau : sépare partie réseau / partie hôte · Passerelle par défaut : sortie vers un autre réseau.",
 "Masques courants : /24=255.255.255.0, /25=.128, /26=.192, /27=.224, /28=.240, /30=.252.",
 "Calcul subnet : taille du bloc = 2^(bits hôtes) ; hôtes utilisables = bloc − 2 ; adresse réseau = 1ère du bloc, broadcast = dernière du bloc.",
 "169.254.x.x (APIPA) : la machine n'a pas reçu de réponse DHCP.",
 "Plages privées (RFC 1918) : 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.",
 "VLAN : segmente un switch en plusieurs domaines de diffusion (niveau 2). Port Access = 1 VLAN · Port Trunk (802.1Q) = plusieurs VLAN tagués.",
 "Routage inter-VLAN : nécessite un équipement de niveau 3 (routeur ou switch L3).",
 "NAT : traduit IP privée ↔ IP publique · NAT statique = 1 pour 1 · PAT = plusieurs machines partagent 1 IP publique via les ports.",
 "Cartes virtuelles : Bridged (sur le réseau physique) / NAT (via l'hôte) / Host-Only (isolée avec l'hôte uniquement).",
 "Routage statique = routes manuelles fixes · Routage dynamique = appris automatiquement (OSPF, RIP, BGP...).",
 "CIDR : notation en /préfixe, sans classes A/B/C. ICMP : protocole utilisé par ping.",
]},
{t:"Ports & protocoles",items:[
 "HTTP 80 · HTTPS 443 · SSH 22 · DNS 53 · DHCP 67(serveur)/68(client) · LDAP 389 · LDAPS 636 · SMB 445 · RDP 3389.",
 "FTP 20(données)/21(commandes) · Telnet 23 · SMTP 25 · POP3 110 · IMAP 143.",
 "TCP : fiable, orienté connexion (accusés de réception) · UDP : rapide, sans garantie de livraison ni connexion.",
]},
{t:"Wi-Fi",items:[
 "WEP : obsolète, cassable rapidement · WPA2 : encore répandu · WPA3 : recommandé aujourd'hui.",
 "SSID : nom du réseau Wi-Fi diffusé.",
 "2,4 GHz : plus de portée mais plus d'interférences (canaux non-recouvrants : 1, 6, 11) · 5 GHz : plus de débit, portée réduite.",
 "Roaming : bascule automatique d'un appareil entre plusieurs bornes du même SSID, sans coupure.",
 "WPA2/3-Enterprise : authentification individuelle via serveur RADIUS (802.1X), au lieu d'une clé partagée unique.",
]},
{t:"Virtualisation & Cloud",items:[
 "Hyperviseur type 1 (bare-metal, sur le matériel) : ESXi, Hyper-V · type 2 (sur un OS existant) : VirtualBox, VMware Workstation.",
 "Snapshot : retour arrière rapide à un instant T — dégrade les perfs si conservé trop longtemps, ne remplace pas une sauvegarde.",
 "Thin provisioning : l'espace disque n'est consommé qu'à l'usage réel.",
 "Haute disponibilité (HA) : redémarre automatiquement les VM sur un autre hôte du cluster en cas de panne.",
 "vMotion / Live Migration : déplace une VM active vers un autre hôte sans coupure de service.",
 "Conteneurs (Docker) : partagent le noyau de l'hôte, plus légers et rapides qu'une VM classique.",
 "IaaS (infrastructure louée) / PaaS (plateforme prête à l'emploi) / SaaS (logiciel utilisé directement).",
 "Cloud privé (dédié à une organisation) / public (mutualisé) / hybride (les deux combinés).",
]},
{t:"Bash & PowerShell",items:[
 "Shebang #!/bin/bash : indique l'interpréteur à utiliser pour exécuter le script.",
 "$? (Bash) : code de retour de la dernière commande — 0 = succès.",
 "IF...THEN...ELSE : exécute un bloc selon une condition · FOR : répète un nombre de fois connu · WHILE : répète tant qu'une condition est vraie.",
 "PowerShell : convention Verbe-Nom (Get-, Set-, Stop-, New-...), manipule des objets (pas seulement du texte comme Bash).",
 "Planification : cron (Linux) / Planificateur de tâches (Windows).",
 "export VAR (Bash) : rend une variable accessible aux sous-processus lancés depuis le script.",
]},
{t:"Firewall, VPN & sécurité",items:[
 "Pare-feu : filtre le trafic (IP/port/protocole). Types : sans état (stateless), à état (stateful), applicatif (proxy/UTM/WAF).",
 "Pare-feu réseau classique = couches 3-4 (IP/port) · Pare-feu applicatif (WAF) = couche 7 (contenu).",
 "Proxy ≠ pare-feu : le proxy relaie les requêtes pour le compte du client (cache, filtrage applicatif).",
 "DMZ : sous-réseau isolé pour les services exposés à Internet, séparé du réseau interne.",
 "VPN Site-to-Site : relie durablement 2 réseaux · VPN Client-to-Site : connexion d'un utilisateur nomade.",
 "Chiffrement symétrique : 1 clé partagée (rapide) · asymétrique : paire clé publique/privée (plus lent, pas de partage préalable).",
 "Certificat SSL/TLS : prouve l'identité du serveur + permet le chiffrement (HTTPS).",
 "MFA : au moins 2 facteurs parmi savoir / possession / caractéristique biométrique.",
 "IDS : détecte et alerte (passif) · IPS : détecte et bloque activement.",
 "Filtrage MAC : facilement contournable (usurpation) · Filtrage URL : bloque des sites/catégories.",
]},
{t:"Sauvegardes & restauration",items:[
 "Complète : tout à chaque fois · Incrémentale : change depuis la dernière sauvegarde (complète ou incrémentale) · Différentielle : change depuis la dernière complète.",
 "RPO : perte de données maximale acceptable (fréquence de sauvegarde) · RTO : délai maximal acceptable de reprise.",
 "Règle 3-2-1 : 3 copies, sur 2 supports différents, dont 1 copie hors site.",
 "PRA (Plan de Reprise d'Activité) : redémarrer après un sinistre · PCA (Plan de Continuité d'Activité) : ne jamais interrompre le service.",
 "Sauvegarde immuable : ni modifiable ni supprimable pendant une durée définie (protection anti-rançongiciel).",
 "NAS : partage de fichiers via le réseau classique · SAN : stockage en mode bloc via un réseau dédié, plus performant.",
 "Toujours tester ses sauvegardes : une sauvegarde non testée n'est pas une garantie de restauration.",
]},
{t:"Déploiement de postes",items:[
 "Mastering : préparer un poste de référence puis capturer une image à dupliquer.",
 "Sysprep : généralise l'image (retire SID/nom uniques) avant capture, pour éviter les conflits en domaine.",
 "PXE : démarrage d'un poste directement depuis le réseau, sans support local.",
 "WDS : distribue les images via le réseau · MDT : automatise davantage (pilotes, applications, séquences de tâches).",
 "Unattend.xml : fichier de réponse qui automatise l'installation de Windows sans intervention.",
 "WSUS : centralise la distribution des mises à jour Windows sur le réseau local.",
 "Clonezilla / FOG Project : solutions open-source de déploiement d'images.",
 "MDM : gestion à distance d'une flotte de terminaux mobiles (config, sécurité, effacement à distance).",
]},
{t:"Binaire & logique",items:[
 "Poids des bits d'un octet (de gauche à droite) : 128, 64, 32, 16, 8, 4, 2, 1.",
 "Valeur max d'un octet non signé : 255 (256 valeurs possibles, de 0 à 255).",
 "Porte AND : résultat 1 seulement si les deux entrées valent 1 · Porte OR : résultat 1 si au moins une entrée vaut 1.",
 "Hexadécimal : chiffres 0-9 puis lettres A(10) à F(15). FF = 255.",
]},
];
function memo(){clearInterval(timer);app.innerHTML=`<section class="panel memo"><h2>Mémo / Annexes</h2><p>Les notions clés pour répondre aux questions de chaque catégorie.</p>${MEMO.map(s=>`<h3>${s.t}</h3><ul>${s.items.map(it=>`<li>${it}</li>`).join('')}</ul>`).join('')}<button class=primary onclick=home()>Accueil</button></section>`}
home();
