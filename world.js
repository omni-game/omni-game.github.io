'use strict';
// Bounds are foot-space colliders aligned with visible artwork (1600 × 900).
window.OMNI_REGIONS = [
 {id:'ruins',name:'Ruinas del pinar',subtitle:'Piedras antiguas · secretos del bosque',minX:30,maxX:1570,top:565,bottom:812,exitY:700,
  colliders:[{x:125,y:552,w:275,h:78},{x:1270,y:552,w:245,h:75}],
  chest:{x:805,y:605},spawns:[[520,685],[950,735],[1150,660]],color:'#b3a6ee'},
 {id:'camp',name:'Refugio de Max',subtitle:'Sombras entre los pinos · misión principal',minX:190,maxX:1430,top:510,bottom:770,exitY:690,
  colliders:[{x:583,y:653,w:125,h:38},{x:1040,y:735,w:150,h:36},{x:1320,y:525,w:260,h:55}],
  spawns:[[990,548],[1120,602],[1235,673],[1010,710],[1280,615],[1350,700]],color:'#b9e593'},
 {id:'river',name:'Ribera de luciérnagas',subtitle:'Sendero del río · camino a la ciudad',minX:30,maxX:1570,top:574,bottom:810,exitY:700,
  colliders:[{x:20,y:563,w:290,h:48},{x:1330,y:554,w:200,h:67}],
  chest:{x:650,y:625},spawns:[[500,680],[910,635],[1220,740],[1380,680]],color:'#8cddd7'},
 {id:'city',name:'Ciudad Bahía',subtitle:'Paseo del puente rojo · distrito costero',minX:35,maxX:1565,top:550,bottom:835,exitY:670,
  colliders:[{x:235,y:370,w:288,h:257},{x:690,y:365,w:325,h:265},{x:1205,y:395,w:225,h:235},{x:129,y:725,w:229,h:84},{x:1240,y:700,w:276,h:78},{x:123,y:560,w:24,h:90},{x:1444,y:561,w:24,h:87}],
  chest:{x:1065,y:668},spawns:[[620,690],[1100,690],[970,780],[1490,685]],color:'#f3ce96'},
 {id:'market',name:'Mercado de Bahía',subtitle:'Puestos y comercios · distrito del centro',minX:30,maxX:1570,top:605,bottom:830,exitY:700,
 colliders:[{x:0,y:250,w:865,h:355},{x:1030,y:330,w:500,h:280},{x:1450,y:785,w:150,h:85},{x:0,y:757,w:175,h:92}],
 chest:{x:925,y:630},spawns:[[570,740],[1150,700],[1370,755]],color:'#f2ba87'},
 {id:'docks',name:'Muelles del faro',subtitle:'Puerto y almacenes · costa de Bahía',minX:30,maxX:1570,top:619,bottom:808,exitY:705,
 colliders:[{x:20,y:400,w:420,h:218},{x:1340,y:320,w:210,h:300},{x:0,y:793,w:210,h:75},{x:1340,y:800,w:260,h:80}],
 chest:{x:1170,y:650},spawns:[[700,745],[1090,735],[1430,725]],color:'#a7d9ed'}
];

// Explicit connections preserve all old region IDs and saved progress.
OMNI_REGIONS.push(
 {id:'fortress',name:'Fortaleza de los Caballeros',subtitle:'Patio de la orden · nivel recomendado 15',minX:35,maxX:1565,top:705,bottom:870,exitY:800,color:'#a1a4ee',colliders:[{x:50,y:250,w:1500,h:435}],chest:{x:1390,y:737},spawns:[[470,745],[680,800],[980,750],[1200,807]]},
 {id:'suburb',name:'Barrio residencial',subtitle:'Casas de Bahía · calle del roble',minX:30,maxX:1570,top:620,bottom:860,exitY:775,color:'#aadbb0',colliders:[{x:40,y:260,w:1460,h:347}],chest:{x:1060,y:644},spawns:[[970,785],[1400,735]]}
);
OMNI_REGIONS.forEach((r,i)=>{r.city=[3,4,5,7].includes(i);r.links={};if(i<6){if(i>0)r.links.left=i-1;if(i<5)r.links.right=i+1;}});
OMNI_REGIONS[1].links.up=6;OMNI_REGIONS[1].portalX=540;
OMNI_REGIONS[6].links.down=1;OMNI_REGIONS[6].portalX=800;
OMNI_REGIONS[3].links.down=7;OMNI_REGIONS[3].portalX=600;
OMNI_REGIONS[7].links.up=3;OMNI_REGIONS[7].portalX=660;

OMNI_REGIONS.push(
{id:'hall',name:'Salón de la Orden',subtitle:'Interior de la fortaleza · caballeros',minX:50,maxX:1550,top:570,bottom:865,exitY:735,color:'#bdc8ee',city:false,portalX:800,links:{down:6},colliders:[{x:0,y:0,w:1600,h:505},{x:1030,y:400,w:115,h:132}],spawns:[[650,700],[1160,760]]},
{id:'room',name:'Habitación de Ten',subtitle:'Ten · Capítulo 1: amenaza de Vilgax',minX:40,maxX:1560,top:575,bottom:865,exitY:735,color:'#b7d7ed',city:false,portalX:800,links:{down:7},colliders:[{x:0,y:0,w:1600,h:520},{x:25,y:430,w:720,h:103},{x:805,y:410,w:510,h:136},{x:1340,y:350,w:235,h:185}],spawns:[]}
);OMNI_REGIONS[6].links.up=8;OMNI_REGIONS[7].links.up=9;OMNI_REGIONS[7].links.down=3;

OMNI_REGIONS.push(
{id:'concert',name:'Concierto de Bahía',subtitle:'Kim Taehyung · batalla de baile',minX:40,maxX:1560,top:600,bottom:860,exitY:745,color:'#e9b5ff',city:false,portalX:800,links:{down:3},colliders:[{x:0,y:0,w:1600,h:548}],spawns:[]},
{id:'devastation',name:'Zona devastada',subtitle:'Robot de Vilgax · Historia 01 · nivel recomendado 12',minX:40,maxX:1560,top:560,bottom:865,exitY:730,color:'#f3b887',city:false,portalX:800,links:{up:7},colliders:[{x:0,y:0,w:1600,h:485},{x:0,y:485,w:170,h:140},{x:1430,y:485,w:170,h:140}],spawns:[]}
);OMNI_REGIONS[3].links.up=10;OMNI_REGIONS[7].links.down=11;OMNI_REGIONS[7].links.left=3;

OMNI_REGIONS.push({id:'bellwood',name:'Restaurante Bellwood',subtitle:'Maid Neko · cocina y trabajo',minX:180,maxX:1410,top:490,bottom:865,exitY:735,color:'#cfdfa7',city:false,portalX:800,links:{down:3},colliders:[{x:0,y:0,w:1600,h:460},{x:0,y:420,w:177,h:240},{x:1425,y:425,w:175,h:265}],spawns:[]});
