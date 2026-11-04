import fs from 'node:fs';

const dir = 'D:/ds workpart/稼轩行迹/_build/';
fs.mkdirSync(dir, { recursive: true });

const targets = [
  ['chn.geo.json', 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries/CHN.geo.json'],
  ['twn.geo.json', 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries/TWN.geo.json'],
  ['ne_110m_rivers.geojson', 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_rivers_lake_centerlines.geojson'],
  ['ne_50m_rivers.geojson', 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_rivers_lake_centerlines.geojson'],
  ['ne_50m_lakes.geojson', 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_lakes.geojson'],
];

for (const [name, url] of targets) {
  try {
    const r = await fetch(url);
    const t = await r.text();
    fs.writeFileSync(dir + name, t);
    console.log('OK', name, t.length);
  } catch (e) {
    console.log('FAIL', name, e.message);
  }
}
