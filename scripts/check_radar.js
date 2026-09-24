import https from 'https';
import fs from 'fs';
import path from 'path';

const radarPath = path.resolve(process.cwd(), 'scripts', 'radar_competidores.json');
const radarData = JSON.parse(fs.readFileSync(radarPath, 'utf-8'));

console.log(`=======================================================`);
console.log(`📡 NERDSUB INTELLIGENCE RADAR - NERDEARLA VIBEATHON`);
console.log(`🎯 Monitoreando a los participantes más peligrosos...`);
console.log(`=======================================================\n`);

for (const target of radarData.high_priority_watch) {
  const username = target.devpost.split('/').pop();
  console.log(`🔍 [${target.threat_level}] ${target.name} (@${username})`);
  console.log(`   Flags clave: ${target.flags.join(', ')}`);
  console.log(`   Devpost: ${target.devpost}`);
  console.log(`   GitHub Search: https://github.com/${username}?tab=repositories\n`);
}

console.log(`💡 Estrategia: Mantener la ventaja con la baja latencia de Gemini 2.5 Flash, el NerdGlosario y el OBS Overlay.`);
