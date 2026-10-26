# 第二版美術與提示詞

工具：內置 ImageGen。最終圖均保存於本資料夾；地圖及人物以原尺寸嵌入離線 HTML。圖像本身不以程式修改；地名、街名、旅人位置及足跡由互動介面繪製。

## 最終檔案

- `mapa-worksheet-3d.png`：原三橫三直街道的立體版。
- `mapa-city-3d.png`：十二個內街街區及四條新增支路。
- `traveler-3d.png`：透明背景、由上方觀看的旅人。
- `expanded-layout-blueprint.png`：程式繪製的道路佈局參考圖，作為城市探險生成的第一張輸入。

## 城市探險最終提示詞

Input 1: expanded-layout-blueprint.png, exact geometry blueprint and edit target.
Input 2: a previous 3D city draft, architectural style reference only.

Use case: sketch-to-render. INPUT1 IS THE MANDATORY EXACT ROAD GEOMETRY BLUEPRINT AND EDIT TARGET. INPUT2 IS ONLY THE 3D VISUAL STYLE AND BUILDING APPEARANCE REFERENCE, NEVER its road layout. Turn input1 into a sophisticated, tactile, richly detailed 3D miniature Portuguese town that looks like input2. The gray asphalt road footprint in INPUT1 must stay EXACTLY the same shape and location, including ALL narrow vertical and horizontal secondary streets. DO NOT OMIT ANY STREET IN INPUT1. INPUT1 HAS TWELVE CENTRAL GREEN BLOCKS, not four. There are FIVE north-south streets through the central city: main x350,780,1210 and secondary x565,995. Three continuous east-west main roads at y240,450,660 plus a narrow horizontal connection from x350 to780 at y345 and another from x780 to1210 at y555. Follow the first image's road geometry pixel-for-pixel on a1566x950 normalized canvas; unambiguous continuous asphalt, clear intersections, no architecture or trees overlapping road surfaces. Buildings must fit within the twelve small green blocks or original ten labeled outer landmark footprints. Render detailed but miniature Portuguese row houses with balconies, red tiled roofs, pastel stucco, tiny shops and outdoor seating, flower pots, trees and a few small pocket courtyards. Top-left inner quarter has FOUR very small blocks divided by narrow streets; lower-right inner quarter also FOUR. The other two inner quarters each have TWO taller blocks divided vertically. Keep all these streets fully visible; do not merge the blocks. Outer footprint labels in input1 specify which landmark architecture to place: neoclassical bank top left, art-deco cinema top right, yellow school upper left, market middle left, fountain garden lower left, column museum upper right, book library middle right, teal canopy cafe lower right, hospital blue-white bottom left, green-cross pharmacy bottom right. The ten landmarks are larger and easier to recognize than the infill houses. Same gentle sunny light, realistic toy-model materials and dimensional soft shadows as input2. Near overhead orthographic camera, exact top-down road plane, subtle visible facades. NO labels, NO text at all, NO words on buildings, NO arrows, NO characters, NO UI, NO cards, NO black outlines. Preserve first image proportions, road placement and topology strictly. The road layout and twelve block subdivisions are the single most important requirement.

## 旅人提示詞

Use case: stylized-concept. Asset: single transparent PNG game pawn for an illustrated 3D city map. Create ONE adorable but age-neutral miniature traveler walking NORTH toward the TOP edge of the canvas, seen from a truly directly overhead orthographic camera, showing top of curly dark hair, shoulders and a beautiful small mustard-yellow backpack. Teal jacket, navy trousers, clean white sneakers. Premium tactile 3D clay/painted miniature render with nuanced material shading and soft self-shadow, finely crafted, no outlines. Character lean teenager proportions, not a baby, compact and easy to read at 60 pixels. Centered full character entirely inside frame, large enough to fill about seventy percent of canvas height, ample transparent margin, exactly symmetrical north-facing composition; pose mid-step, arms visible at sides and separated feet. NO ground, NO disc or pedestal, NO background, NO cast shadow outside the character, NO words, NO extra objects, NO arrow. Genuinely transparent background. This is a top-down game sprite that must rotate to all four compass headings without looking like an upright sideways portrait. Only one character, not a sprite sheet.

## 練習地圖方向

以第一版地圖為版面輸入，改成立體微縮葡式城市；十個地標位置及三橫三直街道不變。另一次局部編輯把頂部兩條誤生成的灰色空條改回草地。最終檔為 mapa-worksheet-3d.png。初版黑白來源及原提示見 imagegen-prompt.md。

## 對位

生成圖有少量幾何偏移，介面使用分段座標校準，使人物與足跡落在實際道路上；道路連接與路口先由 engine.js 的圖模型決定。校準不改變路線判斷。
