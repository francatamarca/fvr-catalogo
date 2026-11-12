// El texto principal se toma de la vista española del proveedor. Estas correcciones
// cubren palabras portuguesas que todavía conserva esa misma vista, sin traducir marcas.
const replacements=[
  [/\bFonte Carregador\b/gi,'Fuente Cargador'],[/\bCarregador\b/gi,'Cargador'],
  [/\bCart[ãa]o de Mem[óo]ria\b/gi,'Tarjeta de Memoria'],[/\bMem[óo]ria\b/gi,'Memoria'],
  [/\bFeminino\b/gi,'Femenino'],[/\bUnissex\b/gi,'Unisex'],[/\bC[âa]mera\b/gi,'Cámara'],
  [/\bPreto\b/gi,'Negro'],[/\bBranco\b/gi,'Blanco'],[/\bCinza\b/gi,'Gris'],[/\bVermelho\b/gi,'Rojo'],
  [/\bAmarelo\b/gi,'Amarillo'],[/\bPrata\b/gi,'Plata'],[/\bDourado\b/gi,'Dorado'],[/\bRoxo\b/gi,'Violeta'],
  [/\bMarrom\b/gi,'Marrón'],[/\bLaranja\b/gi,'Naranja'],[/\bSuporte\b/gi,'Soporte'],[/\bProjetor\b/gi,'Proyector'],[/\bProjector\b/gi,'Proyector'],
  [/\bPel[íi]cula\b/gi,'Película'],[/\bCabelo\b/gi,'Cabello'],[/\bM[ãa]os\b/gi,'Manos'],[/\bLitros?\b/g,'Litros'],
  [/\bEl[ée]trico\b/gi,'Eléctrico'],[/\bEl[ée]trica\b/gi,'Eléctrica'],[/\bRecarg[áa]vel\b/gi,'Recargable'],
  [/\bSem Fio\b/gi,'Inalámbrico'],[/\bCom Fio\b/gi,'Con Cable'],[/\b[ÀA] Prova D'[áa]gua\b/gi,'Resistente al Agua'],
  [/\bAr Condicionado\b/gi,'Aire Acondicionado'],[/\bCondicionado\b/gi,'Acondicionado'],
  [/\bControle Remoto\b/gi,'Control Remoto'],[/\bLonga Dist[âa]ncia\b/gi,'Larga Distancia'],
  [/\bFone de Ouvido\b/gi,'Auricular'],[/\bCaixa de Som\b/gi,'Parlante'],[/\bCart[ãa]o\b/gi,'Tarjeta'],
  [/\bAcess[óo]rios\b/gi,'Accesorios'],[/\bL[íi]tio\b/gi,'Litio'],[/\bBateria\b/gi,'Batería'],
  [/\bBlacno\b/gi,'Blanco'],[/\bEnergia\b/gi,'Energía'],[/\bChaveiro\b/gi,'Llavero'],
];
export function textoEspanol(text){return replacements.reduce((s,[re,value])=>s.replace(re,value),String(text||'')).replace(/\s+/g,' ').trim();}
const icons={'Accesorios y Periféricos':'🔗','Audio':'🎧','Automóvil':'🚗','Belleza y Salud':'💄','Juguetes y Otros':'🧸','Calculadora':'🧮','Cámaras y Drones':'📷','Celulares y SmartPhones':'📱','Electrodomésticos':'🔌','Herramienta':'🛠️','Gamer':'🎮','Termos y Vasos Térmicos':'🥤','Iluminación y LED':'💡','Perfumes':'🌸','Informática':'💻','Receptores y Accesorios':'📡','Reloj':'⌚','Seguridad':'🛡️','TV y Video':'📺','Maletas para Viaje':'🧳','Motociclismo':'🏍️'};
export function departamentoEspanol(nombre){return icons[nombre]?{nombre,emoji:icons[nombre],slug:nombre==='Celulares y SmartPhones'?'celulares':null}:null;}
