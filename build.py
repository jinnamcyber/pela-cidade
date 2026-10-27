from pathlib import Path
import base64
import json
root=Path(__file__).resolve().parent
def data_image(name):
    return 'data:image/png;base64,'+base64.b64encode((root/'assets'/name).read_bytes()).decode()
template=(root/'src/index.html').read_text()
shared={
 '/*STYLE*/':(root/'src/style.css').read_text(),
 '/*ENGINE*/':(root/'src/engine.js').read_text(),
 '/*INSTRUCTIONS*/':(root/'src/instructions.js').read_text(),
 '/*APP*/':(root/'src/app.js').read_text(),
 '/*LANGUAGE_APP*/':(root/'src/language-app.js').read_text(),
}
for offline in (True,False):
    html=template
    image_uri=data_image if offline else lambda name:'assets/'+name
    replacements={**shared,
        '/*MAP_IMAGES*/':json.dumps({'worksheet':image_uri('mapa-worksheet-3d.png'),'city':image_uri('mapa-city-3d.png')}),
        '/*PAWN_URI*/':image_uri('traveler-3d.png'),
    }
    for token,content in replacements.items():
        html=html.replace(token,content)
    out=root/('指路互動地圖.html' if offline else 'index.html')
    out.write_text(html)
    print(f'Built {out.name} ({out.stat().st_size:,} bytes)')
